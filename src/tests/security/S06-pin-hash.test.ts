import {describe,it,expect} from 'vitest';
import {actor,fixture,anonymous,service} from '../integration/fixtures';
describe('Actual PIN storage and response',()=>{
 it('stores hashes, rejects cross-tenant access, serializes duplicates and refuses ambiguous legacy PINs',async()=>{
  const owner=await actor('ownerA'),db=service(),restaurant=crypto.randomUUID();
  expect((await db.from('restaurants').insert({id:restaurant,name:'Synthetic PIN scope',slug:restaurant,email:`pin-${restaurant}@fixture.example.test`,phone:'+56900000000',subscription_plan:'pro',status:'active',country:'CL',currency:'CLP'})).error).toBeNull();
  expect((await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:restaurant,is_primary:false})).error).toBeNull();
  try{
   const id=await owner.rpc('create_waiter',{p_restaurant_id:restaurant,p_name:'Synthetic PIN actor',p_pin:'4931',p_role:'waiter'});expect(id.error).toBeNull();
   const stored=await db.from('waiters').select('pin_hash').eq('id',id.data).single();expect(stored.error).toBeNull();expect(stored.data?.pin_hash).not.toBe('4931');expect(stored.data?.pin_hash).toMatch(/^\$2/);
   expect((await owner.from('waiters').select('pin_hash').eq('id',id.data)).error).not.toBeNull();
   expect((await anonymous().rpc('validate_waiter_pin',{p_restaurant_id:restaurant,p_pin:'4931'})).error).not.toBeNull();
   expect((await (await actor('ownerB')).rpc('validate_waiter_pin',{p_restaurant_id:restaurant,p_pin:'4931'})).error).not.toBeNull();
   const validated=await owner.rpc('validate_waiter_pin',{p_restaurant_id:restaurant,p_pin:'4931'});expect(validated.error).toBeNull();expect(validated.data?.[0]?.waiter_id).toBe(id.data);expect(JSON.stringify(validated.data)).not.toContain('pin');
   const creates=await Promise.all([1,2].map(()=>owner.rpc('create_waiter',{p_restaurant_id:restaurant,p_name:'Concurrent PIN actor',p_pin:'4932'})));
   expect(creates.filter(r=>!r.error)).toHaveLength(1);expect(creates.filter(r=>r.error?.code==='23505')).toHaveLength(1);
   expect((await owner.rpc('update_waiter',{p_waiter_id:creates.find(r=>!r.error)!.data,p_pin:'4931'})).error?.message).toBe('waiter_pin_in_use');
   expect((await db.from('waiters').insert({restaurant_id:restaurant,name:'Synthetic legacy duplicate',pin_hash:stored.data!.pin_hash})).error).toBeNull();
   expect((await owner.rpc('validate_waiter_pin',{p_restaurant_id:restaurant,p_pin:'4931'})).error?.message).toBe('ambiguous_waiter_pin');
   const sessions=await db.from('waiter_sessions').select('id').eq('restaurant_id',restaurant);expect(sessions.error).toBeNull();expect(sessions.data).toHaveLength(1);
  }finally{expect((await db.from('restaurants').delete().eq('id',restaurant)).error).toBeNull();}
 },30000);
});
