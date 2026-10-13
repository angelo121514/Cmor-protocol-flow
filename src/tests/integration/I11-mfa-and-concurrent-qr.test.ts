import {describe,it,expect} from 'vitest';
import {actor,adminAal2,anonymous,fixture,service} from './fixtures';
describe('Real Auth AAL and PostgreSQL capabilities',()=>{
 it('admin password session remains AAL1 and only a real TOTP challenge unlocks admin SQL',async()=>{
  const low=await actor('admin');expect((await low.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel).toBe('aal1');expect((await low.rpc('is_admin')).data).toBe(false);
  expect((await low.rpc('restaurant_dashboard',{p_restaurant_id:fixture.restaurants.A,p_start:new Date(0).toISOString()})).error).not.toBeNull();
  const high=await adminAal2();expect((await high.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel).toBe('aal2');expect((await high.rpc('is_admin')).data).toBe(true);
 });
 it('simultaneous scans reuse the same session and payment_pending never opens a second session',async()=>{
  const db=service(),table=crypto.randomUUID(),qr=crypto.randomUUID();const inserted=await db.from('restaurant_tables').insert({id:table,restaurant_id:fixture.restaurants.A,table_number:`Concurrent ${table}`,qr_token:qr,is_active:true});expect(inserted.error).toBeNull();
  const scans=await Promise.all(Array.from({length:8},()=>anonymous().rpc('start_table_session_by_qr',{p_qr_token:qr})));
  scans.forEach(result=>expect(result.error).toBeNull());const ids=scans.map(result=>result.data?.[0]?.session_id);expect(new Set(ids).size).toBe(1);
  expect((await db.from('table_sessions').update({status:'payment_pending'}).eq('id',ids[0])).error).toBeNull();
  const pending=await anonymous().rpc('start_table_session_by_qr',{p_qr_token:qr});expect(pending.error).toBeNull();expect(pending.data?.[0]?.session_id).toBe(ids[0]);
  const token=pending.data?.[0]?.session_token;
  expect((await anonymous().rpc('create_table_order',{p_session_token:token,p_order_data:{items:[{menu_item_id:fixture.menu.A,quantity:1}]}})).error).not.toBeNull();
  expect((await db.from('restaurant_tables').update({qr_token:crypto.randomUUID()}).eq('id',table)).error).toBeNull();
  expect((await anonymous().rpc('start_table_session_by_qr',{p_qr_token:qr})).error).not.toBeNull();expect((await anonymous().rpc('get_table_orders',{p_session_token:token})).error).not.toBeNull();
 });
});
