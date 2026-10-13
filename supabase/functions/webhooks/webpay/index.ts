import "../../_shared/local-network.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {handleOptions,jsonResponse} from '../../_shared/cors.ts';
import {applyRemotePayment} from '../../_shared/payment-webhook.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE')!,{auth:{persistSession:false}});
const app=Deno.env.get('PUBLIC_APP_URL')||'http://localhost:5173';
export async function handler(req: Request): Promise<Response>{
 const options=handleOptions(req,false);if(options)return options;
 if(!['GET','POST'].includes(req.method))return jsonResponse(req,{error:'method_not_allowed'},405);
 try{
  const url=new URL(req.url),form=req.method==='POST'?await req.formData():null;
  const token=String(form?.get('token_ws')||url.searchParams.get('token_ws')||'');
  // A browser cancellation is only a signal. It cannot alter persisted payment state.
  if(!token)return Response.redirect(`${app}/payment/error?reason=payment_not_confirmed`,303);
  const headers={'Tbk-Api-Key-Id':Deno.env.get('WEBPAY_COMMERCE_CODE')||'','Tbk-Api-Key-Secret':Deno.env.get('WEBPAY_API_KEY')||''};
  if(!headers['Tbk-Api-Key-Id']||!headers['Tbk-Api-Key-Secret'])throw new Error('provider_unconfigured');
  const endpoint=Deno.env.get('WEBPAY_API_URL')||(Deno.env.get('WEBPAY_ENVIRONMENT')==='production'?'https://webpay3g.transbank.cl':'https://webpay3gint.transbank.cl');
  const resource=`${endpoint}/rswebpaytransaction/api/webpay/v1.2/transactions/${encodeURIComponent(token)}`;
  // Status lookup first makes repeated callbacks safe even if commit was already performed.
  let response=await fetch(resource,{headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('provider_unavailable');
  let payment=await response.json();
  if(payment.status==='INITIALIZED'){
   response=await fetch(resource,{method:'PUT',headers,signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('provider_commit_uncertain');payment=await response.json();
  }
  const lookup=await db.from('checkout_attempts').select('id,reference,provider_token,target_id,amount').eq('provider','webpay').eq('reference',payment.buy_order).maybeSingle();
  if(lookup.error)throw new Error('db');
  let target=lookup.data?.target_id;
  if(lookup.data){if(lookup.data.provider_token!==token||payment.session_id!==lookup.data.id)throw new Error('payment_mismatch');}
  else{
   const legacy=await db.from('payment_intents').select('registration_request_id,webpay_token,session_id').eq('provider','webpay').eq('buy_order',payment.buy_order).single();
   if(legacy.error||legacy.data.webpay_token!==token||legacy.data.session_id!==payment.session_id)throw new Error('payment_mismatch');target=legacy.data.registration_request_id;
  }
  const approved=payment.status==='AUTHORIZED'&&payment.response_code===0;
  const status=approved?'approved':['FAILED','REVERSED','NULLIFIED'].includes(payment.status)?'rejected':'pending';
  await applyRemotePayment(db,'webpay',{id:payment.buy_order,reference:payment.buy_order,amount:Number(payment.amount),currency:'CLP',status},app);
  return Response.redirect(approved?`${app}/setup-password?request_id=${encodeURIComponent(target)}`:`${app}/payment/error?reason=payment_not_confirmed`,303);
 }catch{return jsonResponse(req,{success:false,error:'payment_reconciliation_required'},503);}
}
