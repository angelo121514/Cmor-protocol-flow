import {describe,expect,it} from 'vitest';
import {actor,anonymous,fixture,service} from './fixtures';
const check=<T,>(r:{error:unknown;data:T})=>{expect(r.error).toBeNull();return r.data;};
describe('Trusted sales report SQL and PostgREST',()=>{
 it('aggregates 1251 paid preparation orders, excludes unpaid and another tenant, and enforces grants',async()=>{
  const db=service(),owner=await actor('ownerA'),other=await actor('ownerB'),id=crypto.randomUUID();
  check(await db.from('restaurants').insert({id,name:'Synthetic report',slug:id,email:'report@fixture.example.test',phone:'+56900000000',
   status:'active',subscription_plan:'pro',is_active:true,country:'CL',currency:'CLP',tax_rate:0.19}).select('id'));
  check(await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:id,is_primary:false}).select('id'));
  try {
   const rows=Array.from({length:1252},(_,i)=>({id:crypto.randomUUID(),restaurant_id:id,order_number:`REPORT-${i}`,order_type:'counter',
    items:[{name:'Synthetic',quantity:1,item_total:1000}],total:1000,subtotal:840,tax:160,status:'accepted',payment_status:i===1251?'pending':'paid'}));
   for(let i=0;i<rows.length;i+=400)check(await db.from('orders').insert(rows.slice(i,i+400)).select('id'));
   const result=check(await owner.rpc('restaurant_sales_report',{p_restaurant_id:id,p_days:30}));
   expect(result).toMatchObject({totalOrders:1251,totalRevenue:1251000,totalSubtotal:1050840,totalTax:200160,avgOrderValue:1000,currency:'CLP',historicalCurrencyCount:0,timezone:'America/Santiago'});
   expect(result.topItems).toEqual([{name:'Synthetic',count:1251,revenue:1251000}]);
   expect(result.dailyRevenue.reduce((n:number,d:{orders:number})=>n+d.orders,0)).toBe(1251);
   for(const caller of [anonymous(),other,db])expect((await caller.rpc('restaurant_sales_report',{p_restaurant_id:id,p_days:30})).error).not.toBeNull();
   expect((await owner.rpc('restaurant_sales_report',{p_restaurant_id:id,p_days:365})).error).not.toBeNull();
  } finally {
   check(await db.from('orders').delete().eq('restaurant_id',id).select('id'));
   check(await db.from('profile_restaurants').delete().eq('restaurant_id',id).select('id'));
   check(await db.from('restaurants').delete().eq('id',id).select('id'));
  }
 });
});
