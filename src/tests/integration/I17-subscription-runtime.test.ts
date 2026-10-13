import {it,expect} from 'vitest';
import {actor,adminAal2,fixture,service} from './fixtures';
import {PLAN_PRICES} from '../../../shared/plan-prices';

it('persists versioned subscription operations and reuses confirmed customer, subscription and cancellation',async()=>{
 const owner=await actor('ownerA'),admin=await adminAal2(),db=service(),restaurant=crypto.randomUUID();
 expect((await db.from('restaurants').insert({id:restaurant,name:'Synthetic subscription',slug:restaurant,email:`sub-${restaurant}@fixture.example.test`,phone:'+56900000000',subscription_plan:'starter',status:'active',country:'CL',currency:'CLP'})).error).toBeNull();
 expect((await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:restaurant,is_primary:false})).error).toBeNull();
 async function call(path:string,body:unknown,caller=owner){return fetch(`${fixture.url}/functions/v1/${path}`,{method:'POST',headers:{apikey:fixture.anon,authorization:`Bearer ${(await caller.auth.getSession()).data.session!.access_token}`,origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify(body)});}
 try{
  expect((await call('flow-subscription/sync-plans',{})).status).toBe(403);
  const synced=await call('flow-subscription/sync-plans',{},admin);expect(synced.status).toBe(200);
  const plan=await db.from('flow_plans').select('id,amount,currency,business_plan').eq('id','pro-cl-20261006').single();expect(plan.error).toBeNull();expect(plan.data).toMatchObject({amount:PLAN_PRICES.pro.CL.price,currency:'CLP',business_plan:'pro'});
  const counts=async()=>await (await fetch('http://127.0.0.1:58080/__counts')).json() as Record<string,number>;
  const before=await counts();
  const customers=await Promise.all([1,2].map(()=>call('flow-customer/create',{restaurant_id:restaurant})));
  // Concurrent reservations may report reconcile while the first is creating;
  // retry after completion must reuse the persisted customer.
  expect(customers.some(r=>r.status===200)).toBe(true);
  const customer=await call('flow-customer/create',{restaurant_id:restaurant});expect(customer.status).toBe(200);
  const customerRows=await db.from('flow_customers').select('id').eq('restaurant_id',restaurant);expect(customerRows.error).toBeNull();expect(customerRows.data).toHaveLength(1);
  const lateCustomer=await db.rpc('reserve_provider_operation',{p_restaurant:restaurant,p_kind:'customer',p_payload:{}});expect(lateCustomer.error).toBeNull();expect(lateCustomer.data).toMatchObject({new:false,state:'confirmed'});
  expect((await counts())['/flow/customer/create']-(before['/flow/customer/create']||0)).toBe(1);
  const duplicate=await db.from('flow_customers').insert({id:crypto.randomUUID(),restaurant_id:restaurant,email:'duplicate@fixture.example.test',name:'Duplicate'});expect(duplicate.error?.code).toBe('23505');
  const created=await call('flow-subscription/create',{restaurant_id:restaurant,plan_id:'pro'});expect(created.status).toBe(200);const subscription=await created.json();expect(subscription.subscriptionId).toBeTruthy();
  const replay=await call('flow-subscription/create',{restaurant_id:restaurant,plan_id:'pro'});expect(replay.status).toBe(200);expect((await replay.json()).subscriptionId).toBe(subscription.subscriptionId);
  const lateSubscription=await db.rpc('reserve_provider_operation',{p_restaurant:restaurant,p_kind:'subscription',p_payload:{plan_id:'pro-cl-20261006'}});expect(lateSubscription.error).toBeNull();expect(lateSubscription.data).toMatchObject({new:false,state:'confirmed'});
  expect((await counts())['/flow/subscription/create']-(before['/flow/subscription/create']||0)).toBe(1);
  const stored=await db.from('restaurants').select('subscription_plan,flow_subscription_id,is_active').eq('id',restaurant).single();expect(stored.error).toBeNull();expect(stored.data).toMatchObject({subscription_plan:'pro',flow_subscription_id:subscription.subscriptionId,is_active:true});
  for(let n=0;n<2;n++)expect((await call('flow-subscription/cancel',{restaurant_id:restaurant,at_period_end:0})).status).toBe(200);
  const cancelled=await db.from('restaurants').select('status,is_active').eq('id',restaurant).single();expect(cancelled.error).toBeNull();expect(cancelled.data).toMatchObject({status:'blocked',is_active:false});
  const operations=await db.from('provider_operations').select('kind,state').eq('restaurant_id',restaurant);expect(operations.error).toBeNull();expect(operations.data).toHaveLength(3);expect(operations.data!.every(op=>op.state==='confirmed')).toBe(true);
 }finally{
  expect((await db.from('provider_operations').delete().eq('restaurant_id',restaurant)).error).toBeNull();
  expect((await db.from('flow_subscriptions').delete().eq('customer_id',(await db.from('restaurants').select('flow_customer_id').eq('id',restaurant).single()).data?.flow_customer_id||'missing')).error).toBeNull();
  expect((await db.from('restaurants').delete().eq('id',restaurant)).error).toBeNull();
 }
},30000);
