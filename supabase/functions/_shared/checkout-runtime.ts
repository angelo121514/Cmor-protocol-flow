import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {checkoutHandler} from './checkout.ts';
import {FlowApiClient} from './flow-client.ts';
import {MercadoPagoApiClient} from './mp-client.ts';
import {ALLOWED_ORIGINS,handleOptions,jsonResponse} from './cors.ts';
import type {FlowPaymentResponse} from './flow-types.ts';

export function checkoutRuntime(kind: 'table'|'registration',provider?: string) {
 const base=Deno.env.get('SUPABASE_URL')!;
 const db=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE')!,{auth:{persistSession:false}});
 const flow=new FlowApiClient(),mp=new MercadoPagoApiClient();
 const handler=checkoutHandler(db,{
  webpay:{configured:!!Deno.env.get('WEBPAY_COMMERCE_CODE')&&!!Deno.env.get('WEBPAY_API_KEY'),create:async(a)=>{
   const endpoint=Deno.env.get('WEBPAY_API_URL')||(Deno.env.get('WEBPAY_ENVIRONMENT')==='production'?'https://webpay3g.transbank.cl':'https://webpay3gint.transbank.cl');
   const response=await fetch(`${endpoint}/rswebpaytransaction/api/webpay/v1.2/transactions`,{method:'POST',signal:AbortSignal.timeout(15000),
    headers:{'Content-Type':'application/json','Tbk-Api-Key-Id':Deno.env.get('WEBPAY_COMMERCE_CODE')!,'Tbk-Api-Key-Secret':Deno.env.get('WEBPAY_API_KEY')!},
    body:JSON.stringify({buy_order:a.reference,session_id:a.id,amount:a.amount,return_url:`${base}/functions/v1/webhooks/webpay`})});
   if(!response.ok)throw new Error('provider_failed');
   const payment=await response.json();if(!payment.token||!payment.url)throw new Error('invalid_provider_response');
   return {remoteId:a.reference,token:payment.token,response:{url:payment.url,token:payment.token,buy_order:a.reference,amount:a.amount,plan:a.plan}};
  }},
  flow:{configured:flow.isConfigured,create:async(a,origin)=>{
   const trusted=ALLOWED_ORIGINS.includes(origin)?origin:Deno.env.get('PUBLIC_APP_URL');
   if(!trusted) throw new Error('app_url_missing');
   const p=await flow.send<FlowPaymentResponse>('payment/create',{commerceOrder:a.reference,
    subject:kind==='table'?'Cuenta de mesa':`CMOR FLOW ${a.plan}`,amount:a.amount,currency:a.currency,email:a.email,
    urlConfirmation:`${base}/functions/v1/webhooks/flow`,
    urlReturn:`${base}/functions/v1/webhooks/flow?action=return&request_id=${a.id}&origin=${encodeURIComponent(trusted)}`});
   if(!p.url || !p.token || !p.flowOrder) throw new Error('invalid_provider_response');
   return {remoteId:String(p.flowOrder),token:p.token,response:{url:kind==='table'?`${p.url}?token=${encodeURIComponent(p.token)}`:p.url,token:p.token,flowOrder:p.flowOrder}};
  }},
  mp:{configured:mp.isConfigured&&!!Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET'),create:async(a)=>{
   if(a.currency!=='BRL'&&a.currency!=='PEN')throw new Error('unsupported_provider_currency');
   const p=await mp.createPayment({amount:a.amount,currency:a.currency,description:'CMOR FLOW',payerEmail:a.email,
    externalReference:a.reference,notificationUrl:`${base}/functions/v1/mp-webhook`,paymentMethodId:a.currency==='BRL'?'pix':'master'});
   if(!p?.id) throw new Error('invalid_provider_response');
   const t=p.point_of_interaction?.transaction_data;
   return {remoteId:String(p.id),response:{payment_id:String(p.id),status:p.status,url:t?.ticket_url??null,pix_qr_code:t?.qr_code??null,pix_qr_base64:t?.qr_code_base64??null}};
  }}
 },kind,provider);
 return async(req: Request)=>{
  const options=handleOptions(req);if(options)return options;
  const res=await handler(req);
  return jsonResponse(req,await res.json(),res.status);
 };
}
