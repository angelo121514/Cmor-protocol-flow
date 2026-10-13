import '../_shared/local-network.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {handleOptions,jsonResponse} from '../_shared/cors.ts';
import {getAuthenticatedUser,requireRestaurantOwner} from '../_shared/authorization.ts';
import {ensureFlowCustomer,providerOperation} from '../_shared/provider-operations.ts';
import {FlowApiClient} from '../_shared/flow-client.ts';
import type {FlowCustomerRegisterResponse,FlowCustomerRegisterStatusResponse} from '../_shared/flow-types.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE')!,{auth:{persistSession:false}});
const flow=new FlowApiClient();
Deno.serve(async req=>{
 const options=handleOptions(req);if(options)return options;
 const url=new URL(req.url),route=url.pathname.split('/').at(-1);
 try{
  if(route==='register-status'&&req.method==='GET'){
   const token=url.searchParams.get('token');if(!token)return jsonResponse(req,{success:false,error:'token_required'},400);
   if(!(await getAuthenticatedUser(db,req)).authorized)return jsonResponse(req,{success:false,error:'unauthorized'},401);
   const remote=await flow.send<FlowCustomerRegisterStatusResponse>('customer/getRegisterStatus',{token},'GET');
   const customer=await db.from('flow_customers').select('restaurant_id').eq('id',remote.customerId).single();
   if(customer.error||!(await requireRestaurantOwner(db,req,customer.data.restaurant_id)).authorized)return jsonResponse(req,{success:false,error:'unauthorized'},403);
   if(remote.status==='active'||remote.creditCardType){
    const saved=await db.from('flow_customers').update({credit_card_type:remote.creditCardType||'Tarjeta',last4_card_digits:remote.last4CardDigits||null,updated_at:new Date().toISOString()}).eq('id',remote.customerId).select('id').single();
    if(saved.error)throw new Error('card_persistence_failed');
   }
   return jsonResponse(req,{success:true,status:remote.status,creditCardType:remote.creditCardType,last4CardDigits:remote.last4CardDigits,customerId:remote.customerId});
  }
  if(req.method!=='POST'||!['create','register','unregister'].includes(route??''))return jsonResponse(req,{error:'route_not_found'},404);
  const body=await req.json(),restaurant=body.restaurant_id;
  if(typeof restaurant!=='string'||!(await requireRestaurantOwner(db,req,restaurant)).authorized)return jsonResponse(req,{success:false,error:'unauthorized'},403);
  const customer=await ensureFlowCustomer(db,flow,restaurant);
  if(route==='create')return jsonResponse(req,{success:true,customerId:customer});
  if(route==='register'){
   const app=Deno.env.get('PUBLIC_APP_URL');if(!app)throw new Error('app_url_missing');
   const response=await providerOperation(db,restaurant,'card_register',{customer_id:customer},()=>flow.send<FlowCustomerRegisterResponse>('customer/register',{customerId:customer,url_return:`${app}/restaurant/subscription?register=card`},'POST'));
   return jsonResponse(req,{success:true,url:response.url,token:response.token});
  }
  await providerOperation(db,restaurant,'card_unregister',{customer_id:customer},async()=>{await flow.send('customer/unRegister',{customerId:customer},'POST');return {customerId:customer};});
  return jsonResponse(req,{success:true,message:'Tarjeta desvinculada exitosamente'});
 }catch{return jsonResponse(req,{success:false,error:'provider_reconciliation_required'},503);}
});
