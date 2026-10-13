import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {actor,service} from '../integration/fixtures';
const fixture=JSON.parse(readFileSync('.local-test/upgrade.json','utf8'));
describe('Required upgrade backfills',()=>{
 it('hashes the historical token, clears plaintext and retains verification pending',async()=>{
  const result=await service().from('data_subject_requests').select('token_hash,verification_token,status').eq('id',fixture.request).single();expect(result.error).toBeNull();expect(result.data).toMatchObject({token_hash:fixture.hash,verification_token:null,status:'pending_verification'});
 });
 it('preserves the historical movement and adds the deduction claim without rewriting stock',async()=>{
  const db=service(),claim=await db.from('inventory_deduction_claims').select('order_id').eq('order_id',fixture.order).single();expect(claim.error).toBeNull();
  // The public deduction RPC remains a human tenant operation; automation
  // reaches the private executor through trusted payment/transition paths.
  const deducted=await (await actor('ownerA')).rpc('deduct_inventory_for_order',{p_order_id:fixture.order});expect(deducted.error).toBeNull();
  const stock=await db.from('inventory_items').select('current_stock').eq('id',fixture.stock).single();expect(stock.error).toBeNull();expect(stock.data?.current_stock).toBe(2);
  const movement=await db.from('inventory_movements').select('quantity').eq('reference_id',fixture.order);expect(movement.error).toBeNull();expect(movement.data).toHaveLength(1);expect(movement.data?.[0].quantity).toBe(-2);
 });
});
