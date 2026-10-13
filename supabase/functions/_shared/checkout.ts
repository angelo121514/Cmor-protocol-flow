import { PLAN_PRICES, type PlanId, type CountryCode } from '../../../shared/plan-prices.ts';
import {isRecord, type EdgeDatabase} from './ports.ts';

export interface CheckoutAttempt {
  id: string; new: boolean; state: string; reference: string; amount: number;
  currency: 'CLP'|'BRL'|'PEN'; tip_amount: number; email: string;
  plan?: string; receipt_token?: string; response?: Record<string, unknown> | null;
}
function validAttempt(value: unknown): value is CheckoutAttempt {
  return isRecord(value) && typeof value.id==='string' && typeof value.new==='boolean' &&
    typeof value.state==='string' && typeof value.reference==='string' && typeof value.email==='string' &&
    typeof value.amount==='number' && Number.isFinite(value.amount) && value.amount>0 &&
    typeof value.tip_amount==='number' && Number.isFinite(value.tip_amount) && value.tip_amount>=0 &&
    ['CLP','BRL','PEN'].includes(String(value.currency)) &&
    (value.response==null || isRecord(value.response));
}

export interface CheckoutProvider {
  configured: boolean;
  create(attempt: CheckoutAttempt, origin: string): Promise<{ remoteId: string; token?: string; response: Record<string, unknown> }>;
}
// SDK boundary: clients/providers are injected so tests never contact a provider.
export function checkoutHandler(db: EdgeDatabase, providers: Record<string, CheckoutProvider>, kind: 'table'|'registration', fixedProvider?: string) {
 return async (req: Request): Promise<Response> => {
  const reply=(data: unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  if(req.method!=='POST') return reply({error:'method_not_allowed'},405);
  let reserved: string|undefined, receipt: string|undefined;
  try {
   const body: unknown=await req.json();
   if(!isRecord(body))return reply({success:false,error:'invalid_input'},400);
   let target=body.registration_request_id, provider=fixedProvider, amount: number|undefined, currency: string|undefined;
   if(kind==='table') {
    const tip=body.tip_amount??0;
    if(typeof body.session_token!=='string' || typeof tip!=='number' || !Number.isFinite(tip) || tip<0) return reply({success:false,error:'invalid_input'},400);
    const session=await db.from('table_sessions').select('id,restaurant_id').eq('session_token',body.session_token).in('status',['active','payment_pending']).maybeSingle();
    if(session.error) throw new Error('db');
    if(!session.data) return reply({success:false,error:'invalid_session'},404);
    target=session.data.id;
    const rest=await db.from('restaurants').select('currency').eq('id',session.data.restaurant_id).single();
    if(rest.error) throw new Error('db');
    provider=rest.data.currency==='CLP'?'flow':'mp';
   } else {
    if(typeof target!=='string' || typeof body.plan!=='string' || !['starter','pro','lifetime','test_plan'].includes(body.plan)) return reply({success:false,error:'invalid_input'},400);
    const registration=await db.from('registration_requests').select('country').eq('id',target).eq('status','pending').single();
    if(registration.error || !registration.data) return reply({success:false,error:'invalid_registration'},404);
    const country=registration.data.country as CountryCode;
    if(!['CL','BR','PE'].includes(country)) return reply({success:false,error:'online_payment_unavailable'},400);
    currency=country==='CL'?'CLP':country==='BR'?'BRL':'PEN';
    amount=body.plan==='test_plan'?(country==='CL'?350:5):PLAN_PRICES[body.plan as PlanId][country].price;
   }
   if(!provider || !providers[provider]?.configured) return reply({success:false,error:'online_payment_unavailable'},503);
   const {data:a,error}=await db.rpc('reserve_checkout',{p_kind:kind,p_target:target,p_provider:provider,
    p_tip:kind==='table'?(body.tip_amount??0):0,p_amount:amount??null,p_currency:currency??null,p_plan:kind==='registration'?body.plan:null});
   if(error || !a) return reply({success:false,error:'checkout_unavailable'},409);
   if(!validAttempt(a))throw new Error('invalid_checkout_reservation');
   if(!a.new) {
    if(a.state==='pending' && a.response) return reply({...a.response,success:true,provider,receipt_token:kind==='table'?a.receipt_token:undefined});
    return reply({success:false,error:'payment_reconciliation_required',receipt_token:kind==='table'?a.receipt_token:undefined},409);
   }
   reserved=a.id; receipt=kind==='table'?a.receipt_token:undefined;
   const result=await providers[provider].create(a,typeof body.origin==='string'?body.origin:'');
   if(!result.remoteId || !isRecord(result.response)) throw new Error('invalid_provider_response');
   const saved=await db.rpc('record_checkout_result',{p_id:a.id,p_remote_id:result.remoteId,p_token:result.token??null,
    p_response:result.response,p_uncertain:false});
   if(saved.error) throw new Error('persistence_failed');
   return reply({...result.response,success:true,provider,amount:a.amount,tip_amount:a.tip_amount,receipt_token:kind==='table'?a.receipt_token:undefined});
  } catch {
   if(reserved) {
    // A failure here is also recoverable by the durable 'creating' reservation.
    await db.rpc('record_checkout_result',{p_id:reserved,p_remote_id:null,p_token:null,p_response:null,p_uncertain:true});
   }
   return reply({success:false,error:reserved?'payment_reconciliation_required':'checkout_failed',receipt_token:receipt},503);
  }
 };
}
