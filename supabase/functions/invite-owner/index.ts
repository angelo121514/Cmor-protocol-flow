import "../_shared/local-network.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {handleOptions,jsonResponse} from '../_shared/cors.ts';
import {deliverInvitations} from '../_shared/invitation-delivery.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE')!,{auth:{persistSession:false}});
Deno.serve(async(req)=>{
 const options=handleOptions(req);if(options)return options;
 const secret=Deno.env.get('INTERNAL_FUNCTION_SECRET');
 if(!secret||req.headers.get('x-internal-function-secret')!==secret)return jsonResponse(req,{error:'unauthorized'},403);
 if(req.method!=='POST')return jsonResponse(req,{error:'method_not_allowed'},405);
 try{return jsonResponse(req,await deliverInvitations(db,Deno.env.get('PUBLIC_APP_URL')||Deno.env.get('APP_URL')||'http://localhost:5173'));}
 catch{return jsonResponse(req,{error:'invitation_delivery_unavailable'},503);}
});
