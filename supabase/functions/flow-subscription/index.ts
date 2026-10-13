import type {FlowPlanResponse, FlowSubscriptionResponse} from '../_shared/flow-types.ts';
import "../_shared/local-network.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {PLAN_PRICES} from '../../../shared/plan-prices.ts';
import {FlowApiClient,FlowApiError} from '../_shared/flow-client.ts';
import {handleOptions,jsonResponse} from '../_shared/cors.ts';
import {requireAdmin,requireRestaurantOwner} from '../_shared/authorization.ts';
import {ensureFlowCustomer,providerOperation} from '../_shared/provider-operations.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE')!,{auth:{persistSession:false}});
const flow=new FlowApiClient();
const versions={starter:'starter-cl-20261006',pro:'pro-cl-20261006',test_plan:'test-cl-20261006'};
Deno.serve(async(req)=>{
 const options=handleOptions(req);if(options)return options;
 const path=new URL(req.url).pathname;
 try{
  if(path.endsWith('/sync-plans')&&req.method==='POST'){
   if(!(await requireAdmin(db,req)).authorized)return jsonResponse(req,{error:'unauthorized'},403);
   const synced=[];
   for(const business of ['starter','pro','test_plan'] as const){
    const id=versions[business],amount=business==='test_plan'?350:PLAN_PRICES[business].CL.price;
    let plan;
    try{plan=await flow.send<FlowPlanResponse>('plans/get',{planId:id},'GET');}
    catch(e){if(!(e instanceof FlowApiError)||e.status!==404)throw e;plan=await flow.send<FlowPlanResponse>('plans/create',{planId:id,name:`CMOR FLOW ${business}`,amount,currency:'CLP',interval:3,trial_period_days:0});}
    if(plan.amount!==amount||plan.currency!=='CLP'||plan.planId!==id)throw new Error('provider_catalog_mismatch');
    const saved=await db.from('flow_plans').upsert({id,name:plan.name,amount,currency:'CLP',interval:3,business_plan:business});
    if(saved.error)throw new Error('plan_persistence_failed');synced.push(plan);
   }
   return jsonResponse(req,{success:true,plans:synced});
  }
  const body=req.method==='POST'?await req.json():Object.fromEntries(new URL(req.url).searchParams),restaurant=body.restaurant_id;
  if(typeof restaurant!=='string'||!(await requireRestaurantOwner(db,req,restaurant)).authorized)return jsonResponse(req,{error:'unauthorized'},403);
  if(path.endsWith('/create')&&req.method==='POST'){
   if(!Object.hasOwn(versions,body.plan_id))return jsonResponse(req,{error:'invalid_plan'},400);
   const customer=await ensureFlowCustomer(db,flow,restaurant),plan=versions[body.plan_id as keyof typeof versions];
   const current=await db.from('flow_subscriptions').select('id,status').eq('customer_id',customer).eq('plan_id',plan).in('status',[1,5]).maybeSingle();
   if(current.error)throw new Error('subscription_lookup_failed');
   if(current.data)return jsonResponse(req,{success:true,subscriptionId:current.data.id,status:current.data.status});
   const response=await providerOperation(db,restaurant,'subscription',{plan_id:plan},()=>flow.send<FlowSubscriptionResponse>('subscription/create',{planId:plan,customerId:customer,subscription_start:new Date().toISOString().slice(0,10)}));
   return jsonResponse(req,{success:true,subscriptionId:response.subscriptionId,status:response.status,moleskinData:response.moleskinData});
  }
  if(path.endsWith('/cancel')&&req.method==='POST'){
   const current=await db.from('restaurants').select('flow_subscription_id').eq('id',restaurant).single();
   if(current.error||!current.data.flow_subscription_id)throw new Error('subscription_not_found');
   const end=body.at_period_end===0?0:1,subscription=current.data.flow_subscription_id;
   const response=await providerOperation(db,restaurant,'cancel',{subscription_id:subscription,at_period_end:end},()=>flow.send<FlowSubscriptionResponse>('subscription/cancel',{subscriptionId:subscription,at_period_end:end}));
   return jsonResponse(req,{success:true,status:response.status});
  }
  if(path.endsWith('/status')&&req.method==='GET'){
   const customer=await db.from('flow_customers').select('id').eq('restaurant_id',restaurant).maybeSingle();if(customer.error)throw new Error('lookup_failed');
   if(!customer.data)return jsonResponse(req,{success:true,subscription:null});
   const subscription=await db.from('flow_subscriptions').select('id,status,subscription_start,trial_ends_at,current_period_start,current_period_end,flow_plans(id,name,amount,currency)').eq('customer_id',customer.data.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(subscription.error)throw new Error('lookup_failed');return jsonResponse(req,{success:true,subscription:subscription.data});
  }
  return jsonResponse(req,{error:'route_not_found'},404);
 }catch{return jsonResponse(req,{success:false,error:'provider_reconciliation_required'},503);}
});
