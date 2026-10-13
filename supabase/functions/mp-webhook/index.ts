import "../_shared/local-network.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.86.0";
import {handleOptions,jsonResponse} from "../_shared/cors.ts";
import {MercadoPagoApiClient} from "../_shared/mp-client.ts";
import {validateMpSignature,applyRemotePayment} from "../_shared/payment-webhook.ts";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE")!,{auth:{persistSession:false}});
const api=new MercadoPagoApiClient();
Deno.serve(async req=>{
 const options=handleOptions(req,false);if(options)return options;
 if(req.method!=="POST")return jsonResponse(req,{error:"method_not_allowed"},405);
 try {
  const body=await req.json();const id=String(body?.data?.id??new URL(req.url).searchParams.get("data.id")??"");
  if(!id || !(await validateMpSignature(req,id,Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET"))))return jsonResponse(req,{error:"invalid_signature"},401);
  if(body.type!=="payment")return jsonResponse(req,{received:true});
  const p=await api.getPayment(id);if(!p || String(p.id)!==id)throw new Error("lookup_failed");
  await applyRemotePayment(db,"mp",{id,reference:p.external_reference??"",amount:Number(p.transaction_amount),currency:p.currency_id??"",status:p.status},Deno.env.get('PUBLIC_APP_URL'));
  return jsonResponse(req,{received:true});
 } catch {return jsonResponse(req,{error:"confirmation_failed"},503);}
});
