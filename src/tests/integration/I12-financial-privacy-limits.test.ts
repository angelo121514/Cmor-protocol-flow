import { describe, it, expect } from 'vitest';
import { actor, anonymous, fixture, service } from './fixtures';
import { hashToken, collectDsarDownload } from '../../../supabase/functions/_shared/dsar';
const check=<T,>(r:{error:unknown;data:T})=>{expect(r.error).toBeNull();return r.data;};
describe('Trusted PostgreSQL transactions',()=>{
 it('claims a verification token once under concurrent requests and rejects exact expiration',async()=>{
  const db=service(),token=crypto.randomUUID().replaceAll('-','')+'a'.repeat(32),hash=await hashToken(token),email=`claim-${crypto.randomUUID()}@fixture.example.test`;
  const created=check(await db.rpc('submit_dsar',{p_email:email,p_type:'revoke-consent',p_payload:{scope:'marketing'},p_subject_id:null,p_hash:hash,p_ip:null}));
  const calls=await Promise.all([1,2].map(()=>db.rpc('execute_dsar',{p_id:null,p_hash:hash})));calls.forEach(check);expect(calls.filter(r=>r.data.success)).toHaveLength(1);
  const expiredHash=await hashToken(crypto.randomUUID()),expired=check(await db.rpc('submit_dsar',{p_email:`expired-${crypto.randomUUID()}@fixture.example.test`,p_type:'erase',p_payload:{},p_subject_id:null,p_hash:expiredHash,p_ip:null}));
  check(await db.from('data_subject_requests').update({token_expires_at:new Date(0).toISOString()}).eq('id',expired.requestId).select('id').single());
  expect(check(await db.rpc('execute_dsar',{p_id:null,p_hash:expiredHash}))).toMatchObject({success:false,error:'expired'});expect(created.requestId).toBeTruthy();
 });
 it('exports a persistent 1251-row snapshot without credentials or third-party fields',async()=>{
  const db=service(),email=`export-${crypto.randomUUID()}@fixture.example.test`,customer=crypto.randomUUID();
  check(await db.from('restaurant_customers').insert({id:customer,restaurant_id:fixture.restaurants.A,name:'Synthetic DSAR subject',email,phone:customer}).select('id').single());
  const rows=Array.from({length:1251},(_,i)=>({id:crypto.randomUUID(),restaurant_id:fixture.restaurants.A,customer_id:customer,order_number:`DSAR-${customer}-${i}`,order_type:'counter',items:[{menu_item_id:fixture.menu.A,quantity:1}],total:1000,subtotal:840,tax:160,status:'accepted',payment_status:'paid'}));
  for(let i=0;i<rows.length;i+=400)check(await db.from('orders').insert(rows.slice(i,i+400)).select('id'));
  const hash=await hashToken(crypto.randomUUID()),request=check(await db.rpc('submit_dsar',{p_email:email,p_type:'export',p_payload:{},p_subject_id:null,p_hash:hash,p_ip:null}));
  expect(request.requestId).toBeTruthy();
  const initial=check(await db.rpc('execute_dsar',{p_id:null,p_hash:hash}));expect(initial.status).toBe('in_progress');
  const exported=await collectDsarDownload(db,initial);expect(exported.data.orders).toHaveLength(1251);expect(exported.status).toBe('fulfilled');
  for(const key of ['access_token','session_token','pin_hash','verification_token','encrypted_password'])expect(JSON.stringify(exported.data)).not.toContain(key);
  check(await db.from('orders').delete().eq('customer_id',customer).select('id'));check(await db.from('restaurant_customers').delete().eq('id',customer).select('id'));
 });
 it('payment mismatch has no effects; concurrent confirmation and replay deduct/tip/close once',async()=>{
  const db=service(),table=crypto.randomUUID(),qr=crypto.randomUUID();check(await db.from('restaurant_tables').insert({id:table,restaurant_id:fixture.restaurants.A,table_number:table,qr_token:qr,is_active:true}).select('id'));
  const session=check(await anonymous().rpc('start_table_session_by_qr',{p_qr_token:qr}))[0];
  check(await anonymous().rpc('create_table_order',{p_session_token:session.session_token,p_order_data:{operation_key:crypto.randomUUID(),items:[{menu_item_id:fixture.menu.A,quantity:1}]}}));
  const attempt=check(await db.rpc('reserve_checkout',{p_kind:'table',p_target:session.session_id,p_provider:'flow',p_tip:100}));
  const input={p_reference:attempt.reference,p_provider:'flow',p_remote_id:'synthetic-remote',p_amount:1100,p_currency:'CLP',p_status:'approved'};
  for(const change of [{p_amount:1099},{p_currency:'USD'},{p_provider:'mp'}])expect((await db.rpc('confirm_checkout',{...input,...change})).error).not.toBeNull();
  expect(check(await db.from('table_sessions').select('status').eq('id',session.session_id).single()).status).toBe('payment_pending');
  const before=await db.from('tips').select('id',{count:'exact',head:true}).eq('restaurant_id',fixture.restaurants.A);expect(before.error).toBeNull();
  const results=await Promise.all([1,2,3].map(()=>db.rpc('confirm_checkout',input)));results.forEach(check);
  const after=await db.from('tips').select('id',{count:'exact',head:true}).eq('restaurant_id',fixture.restaurants.A);expect(after.error).toBeNull();expect(after.count!-before.count!).toBe(1);
  expect(check(await db.from('table_sessions').select('status').eq('id',session.session_id).single()).status).toBe('closed');
  expect(check(await anonymous().rpc('checkout_receipt',{p_token:attempt.receipt_token})).state).toBe('confirmed');
  expect((await anonymous().rpc('get_table_orders',{p_session_token:session.session_token})).error).not.toBeNull();
  check(await db.rpc('record_checkout_result',{p_id:attempt.id,p_remote_id:'synthetic-remote',p_token:'fixture',p_response:{},p_uncertain:false}));
 });
 it('trial menu boundaries 29/30/31 and expiration are enforced in SQL',async()=>{
  const db=service(),owner=await actor('ownerA'),id=crypto.randomUUID();check(await db.from('restaurants').insert({id,name:'Synthetic trial',slug:id,email:'trial@fixture.example.test',phone:'+56900000000',status:'trial',subscription_plan:'free_trial',trial_ends_at:new Date(Date.now()+86400000).toISOString(),is_active:true,country:'CL',currency:'CLP'}).select('id'));
  check(await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:id,is_primary:false}).select('id'));
  const menu=Array.from({length:29},(_,i)=>({id:crypto.randomUUID(),restaurant_id:id,name:`Trial ${i}`,base_price:1000,is_available:true}));check(await owner.from('menu_items').insert(menu).select('id'));
  check(await owner.from('menu_items').insert({restaurant_id:id,name:'30',base_price:1000}).select('id'));expect((await owner.from('menu_items').insert({restaurant_id:id,name:'31',base_price:1000})).error).not.toBeNull();
  check(await db.from('restaurants').update({trial_ends_at:new Date(0).toISOString()}).eq('id',id).select('id'));
  expect((await anonymous().rpc('create_order',{p_restaurant_id:id,p_items:[{menu_item_id:menu[0].id,quantity:1}]})).error).not.toBeNull();
  check(await db.from('restaurants').delete().eq('id',id).select('id'));
 });
 it('fifth membership succeeds and sixth branch rolls back without an orphan restaurant',async()=>{
  const db=service(),owner=await actor('ownerA'),created:string[]=[];
  const initial=check(await db.from('profile_restaurants').select('restaurant_id').eq('profile_id',fixture.actors.ownerA.id));
  for(let n=initial.length;n<5;n++)created.push(check(await owner.rpc('create_restaurant_branch',{p_name:`Synthetic branch ${crypto.randomUUID()}`,p_email:`branch-${crypto.randomUUID()}@fixture.example.test`,p_phone:'+56900000000',p_city:null,p_address:null,p_restaurant_type:'other',p_subscription_plan:'pro',p_status:'active',p_is_active:true})));
  const before=await db.from('restaurants').select('id',{head:true,count:'exact'});expect(before.error).toBeNull();
  expect((await owner.rpc('create_restaurant_branch',{p_name:'Sixth rejected',p_email:'sixth@fixture.example.test',p_phone:'+56900000000',p_city:null,p_address:null,p_restaurant_type:'other',p_subscription_plan:'pro',p_status:'active',p_is_active:true})).error).not.toBeNull();
  const after=await db.from('restaurants').select('id',{head:true,count:'exact'});expect(after.error).toBeNull();expect(after.count).toBe(before.count);
  if(created.length)check(await db.from('restaurants').delete().in('id',created).select('id'));
 });
 it('recipe replacement is atomic and concurrent completed orders consume the available 7 units only',async()=>{
  const db=service(),owner=await actor('ownerA'),stock=crypto.randomUUID(),menu=crypto.randomUUID();
  check(await db.from('inventory_items').insert({id:stock,restaurant_id:fixture.restaurants.A,name:`Concurrency stock ${stock}`,unit:'unidad',current_stock:7}).select('id'));
  check(await owner.from('menu_items').insert({id:menu,restaurant_id:fixture.restaurants.A,name:'Concurrency dish',base_price:1000,is_available:true}).select('id'));
  const input={p_restaurant_id:fixture.restaurants.A,p_menu_item_id:menu,p_ingredients:[{inventory_item_id:stock,quantity_needed:5,unit:'unidad'}]};const recipe=check(await owner.rpc('save_recipe',input));
  expect((await owner.rpc('save_recipe',{...input,p_ingredients:[{inventory_item_id:crypto.randomUUID(),quantity_needed:1,unit:'unidad'}]})).error).not.toBeNull();
  expect(check(await db.from('recipe_ingredients').select('quantity_needed').eq('recipe_id',recipe.id).single()).quantity_needed).toBe(5);
  const orders=await Promise.all([1,2].map(()=>owner.rpc('write_pos_order',{p_restaurant_id:fixture.restaurants.A,p_key:crypto.randomUUID(),p_order:{items:[{menu_item_id:menu,quantity:1}],payment_status:'paid',payment_method:'cash'}})));orders.forEach(check);
  const completed=await Promise.all(orders.map(o=>owner.from('orders').update({status:'completed'}).eq('id',o.data.id).select('id')));completed.forEach(check);
  const movements=check(await db.from('inventory_movements').select('quantity,shortage').eq('inventory_item_id',stock));expect(movements.reduce((n:number,m)=>n+Number(m.quantity),0)).toBe(-7);expect(movements.reduce((n:number,m)=>n+Number(m.shortage),0)).toBe(3);
  expect(check(await db.from('inventory_items').select('current_stock').eq('id',stock).single()).current_stock).toBe(0);
 });
});
