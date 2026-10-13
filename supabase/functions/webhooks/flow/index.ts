import "../../_shared/local-network.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.86.0";
import {FlowApiClient} from "../../_shared/flow-client.ts";
import {ALLOWED_ORIGINS} from "../../_shared/cors.ts";
import {applyRemotePayment} from "../../_shared/payment-webhook.ts";
import type {FlowPaymentStatusResponse} from "../../_shared/flow-types.ts";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SERVICE_ROLE")!,{auth:{persistSession:false}});
const api=new FlowApiClient();
export async function handler(req: Request): Promise<Response> {
 const url=new URL(req.url);const origin=url.searchParams.get("origin");
 const app=origin&&ALLOWED_ORIGINS.includes(origin)?origin:Deno.env.get("PUBLIC_APP_URL");
 try {
  let token=url.searchParams.get("token");
  if(req.method==="POST")token=String((await req.formData()).get("token")??token??"");
  if(!token)return new Response(JSON.stringify({error:"missing_token"}),{status:400});
  const p=await api.send<FlowPaymentStatusResponse>("payment/getStatus",{token},"GET");
  if(url.searchParams.get("action")==="return") {
   // Browser return only retrieves a capability; receipt queries report the local webhook result.
   if(!app)throw new Error("app_url_missing");
   const {data:a,error}=await db.from("checkout_attempts").select("kind,target_id,receipt_token").eq("reference",p.commerceOrder).eq("provider","flow").eq("provider_token",token).maybeSingle();
   if(error)throw error;
   if(a?.kind==="table") {
    const {data:s,error:sErr}=await db.from("table_sessions").select("restaurant_tables(qr_token)").eq("id",a.target_id).single();
    if(sErr || !s?.restaurant_tables)throw new Error("session_missing");
    const table=Array.isArray(s.restaurant_tables)?s.restaurant_tables[0]:s.restaurant_tables;
    return Response.redirect(`${app}/mesa/${table.qr_token}/pagar#receipt=${encodeURIComponent(a.receipt_token)}`,302);
   }
   return Response.redirect(`${app}/setup-password?pending=1`,302);
  }
  const status=p.status===2?"approved":p.status===3?"rejected":p.status===4?"cancelled":"pending";
  await applyRemotePayment(db,"flow",{id:String(p.flowOrder),reference:p.commerceOrder,amount:Number(p.amount),currency:p.currency,status},app??undefined);
  return new Response(JSON.stringify({success:true}),{headers:{"Content-Type":"application/json"}});
 } catch {return new Response(JSON.stringify({error:"confirmation_failed"}),{status:503,headers:{"Content-Type":"application/json"}});}
}
