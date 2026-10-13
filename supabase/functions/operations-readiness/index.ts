import "../_shared/local-network.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {requireAdmin} from '../_shared/authorization.ts';
import {handleOptions,jsonResponse} from '../_shared/cors.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async req=>{
 const options=handleOptions(req);if(options)return options;
 if(req.method!=='GET')return jsonResponse(req,{error:'method_not_allowed'},405);
 try{
  const caller=await requireAdmin(db,req);if(!caller.authorized)return jsonResponse(req,{error:'admin_mfa_required'},403);
  const present=(...names:string[])=>names.every(name=>Boolean(Deno.env.get(name)?.trim()));
  return jsonResponse(req,{configured:{Flow:present('FLOW_API_KEY','FLOW_SECRET_KEY'),MercadoPago:present('MERCADO_PAGO_ACCESS_TOKEN','MERCADO_PAGO_WEBHOOK_SECRET'),Webpay:present('WEBPAY_COMMERCE_CODE','WEBPAY_API_KEY'),Correo:present('RESEND_API_KEY','DSAR_FROM_EMAIL'),DTE:present('TAX_API_BASE_URL','ACCOUNTING_MASTER_KEY'),InspeccionArchivos:present('IMAGE_INSPECTION_URL','IMAGE_INSPECTION_SECRET')},verified:false});
 }catch{return jsonResponse(req,{error:'readiness_unavailable'},503);}
});
