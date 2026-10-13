import {it,expect} from 'vitest';
import {actor,fixture,service} from './fixtures';
import {localSql} from '../../../scripts/local-postgres.mjs';

it('uses real leases and reconciles simulated DTE emissions without repeating uncertain effects',async()=>{
 const owner=await actor('ownerA'),other=await actor('ownerB'),db=service(),restaurant=crypto.randomUUID(),menu=crypto.randomUUID();
 expect((await db.from('restaurants').insert({id:restaurant,name:'Synthetic accounting',slug:restaurant,email:`tax-${restaurant}@fixture.example.test`,phone:'+56900000000',subscription_plan:'pro',status:'active',country:'CL',currency:'CLP'})).error).toBeNull();
 expect((await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:restaurant,is_primary:false})).error).toBeNull();
 const token=(await owner.auth.getSession()).data.session!.access_token;
 async function call(path:string,body:unknown,authorization=token){return fetch(`${fixture.url}/functions/v1/accounting/${path}`,{method:'POST',headers:{apikey:fixture.anon,authorization:`Bearer ${authorization}`,origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify(body)});}
 try{
  expect((await owner.rpc('accounting_lease',{p_restaurant:restaurant})).error).not.toBeNull();
  const config=await call('config',{restaurant_id:restaurant,auto_emit:false,credential:{key_id:'cmor_live_synthetic_local',secret:'synthetic-local-tax-secret'}});expect(config.status).toBe(200);
  expect((await call('config',{restaurant_id:restaurant,auto_emit:true},(await other.auth.getSession()).data.session!.access_token)).status).toBe(403);
  expect((await owner.from('accounting_config').select('tax_secret_encrypted').eq('restaurant_id',restaurant)).error).not.toBeNull();
  const attempts=await Promise.all([1,2].map(()=>db.rpc('accounting_lease',{p_restaurant:restaurant})));
  expect(attempts.every(r=>!r.error)).toBe(true);expect(attempts.filter(r=>r.data)).toHaveLength(1);
  const lease=attempts.find(r=>r.data)!.data as string;
  expect((await db.rpc('accounting_lease',{p_restaurant:restaurant,p_token:crypto.randomUUID(),p_release:true})).error?.message).toBe('lease_lost');
  expect((await db.rpc('accounting_lease',{p_restaurant:restaurant,p_token:lease})).data).toBe(lease);
  expect((await call('sync',{restaurant_id:restaurant})).status).toBe(200);
  expect((await db.from('accounting_config').update({lease_expires_at:new Date(Date.now()-1000).toISOString()}).eq('restaurant_id',restaurant)).error).toBeNull();
  const replacement=await db.rpc('accounting_lease',{p_restaurant:restaurant});expect(replacement.error).toBeNull();expect(replacement.data).toBeTruthy();expect(replacement.data).not.toBe(lease);
  expect((await db.rpc('accounting_lease',{p_restaurant:restaurant,p_token:lease})).error?.message).toBe('lease_lost');
  expect((await db.rpc('accounting_lease',{p_restaurant:restaurant,p_token:replacement.data,p_release:true})).error).toBeNull();
  expect(localSql('SELECT public.accounting_dispatch_cron() IS NULL;')).toBe('t');
  expect((await owner.rpc('accounting_dispatch_cron')).error).not.toBeNull();
  expect((await db.from('menu_items').insert({id:menu,restaurant_id:restaurant,name:'Synthetic tax dish',base_price:1000,is_available:true})).error).toBeNull();
  async function paidOrder(){const result=await owner.rpc('write_pos_order',{p_restaurant_id:restaurant,p_key:crypto.randomUUID(),p_order:{items:[{menu_item_id:menu,quantity:1}],order_type:'counter',payment_status:'paid',payment_method:'cash',tip_amount:0}});expect(result.error).toBeNull();return result.data;}
  const order=await paidOrder(),emitted=await call('emit',{restaurant_id:restaurant,order_id:order.id,dte_type:39});expect(emitted.status).toBe(200);
  const created=await emitted.json();expect(created.success).toBe(true);
  const doc=await db.from('accounting_documents').select('id,request_id,payload').eq('order_id',order.id).single();expect(doc.error).toBeNull();expect(doc.data?.request_id).toBeTruthy();
  // Simulate a response persisted remotely but lost before the local write.
  expect((await db.from('accounting_documents').update({request_id:null}).eq('id',doc.data!.id)).error).toBeNull();
  const recovered=await call('sync',{restaurant_id:restaurant});expect(recovered.status).toBe(200);expect((await recovered.json()).summary.reconciled_adopted).toBe(1);
  expect((await call('emit',{restaurant_id:restaurant,order_id:order.id,dte_type:39})).status).toBe(409);
  const missing=await paidOrder(),id=crypto.randomUUID();
  expect((await db.from('accounting_documents').insert({id,restaurant_id:restaurant,order_id:missing.id,dte_type:39,status:'queued',attempt:1,external_reference:`fixture-missing-${id}`,amount:1000,payload:doc.data!.payload})).error).toBeNull();
  const retried=await call('sync',{restaurant_id:restaurant});expect(retried.status).toBe(200);expect((await retried.json()).summary.reconcile_reemitted).toBe(1);
  const rows=await db.from('accounting_documents').select('id,status,attempt,request_id,amount').eq('restaurant_id',restaurant);expect(rows.error).toBeNull();expect(rows.data).toHaveLength(2);
  expect(rows.data!.every(row=>row.status==='accepted'&&row.attempt===1&&row.request_id&&row.amount===1000)).toBe(true);
  const replay=await call('sync',{restaurant_id:restaurant});expect(replay.status).toBe(200);expect((await replay.json()).summary).toMatchObject({reconciled_adopted:0,reconcile_reemitted:0});
 }finally{
  expect((await db.from('accounting_documents').delete().eq('restaurant_id',restaurant)).error).toBeNull();
  expect((await db.from('order_operations').delete().eq('restaurant_id',restaurant)).error).toBeNull();
  expect((await db.from('orders').delete().eq('restaurant_id',restaurant)).error).toBeNull();
  expect((await db.from('restaurants').delete().eq('id',restaurant)).error).toBeNull();
 }
},30000);
