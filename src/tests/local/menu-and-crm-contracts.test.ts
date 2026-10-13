import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({from:vi.fn()}));
vi.mock('../../config/supabase',()=>({supabase:mocks}));
import {createMenuItem,getCustomers} from '../../services/restaurantService';

beforeEach(()=>vi.clearAllMocks());
describe('Menu persistence contract',()=>{
 it('returns the persisted menu id needed to create its recipe',async()=>{
  const single=vi.fn(async()=>({data:{id:'saved-menu'},error:null}));
  const select=vi.fn(()=>({single})),insert=vi.fn(()=>({select}));mocks.from.mockReturnValue({insert});
  expect(await createMenuItem({restaurant_id:'A',name:'Synthetic',base_price:1000})).toEqual({success:true,id:'saved-menu'});
  expect(select).toHaveBeenCalledWith('id');expect(single).toHaveBeenCalledOnce();
 });
 it('does not report creation success when the returned persisted id is missing',async()=>{
  mocks.from.mockReturnValue({insert:()=>({select:()=>({single:async()=>({data:null,error:null})})})});
  expect((await createMenuItem({name:'Synthetic'})).success).toBe(false);
 });
});
describe('CRM actual service pagination and projections',()=>{
 it('preserves paid preparation status and items across more than 1000 customer rows',async()=>{
  const rows=Array.from({length:1251},(_,i)=>({id:`customer-${i}`,restaurant_id:'A',name:`Synthetic ${i}`,phone:String(i),created_at:'2026-10-06',updated_at:'2026-10-06'}));
  const order={id:'order',restaurant_id:'A',customer_phone:'1250',customer_name:'Synthetic 1250',total:1000,status:'accepted',payment_status:'paid',order_number:'1',payment_method:'cash',items:[{name:'Fixture dish A',quantity:1,item_total:1000}],created_at:'2026-10-06'};
  const projections:string[]=[];
  mocks.from.mockImplementation((table:string)=>{
   const data=table==='restaurant_customers'?rows:[order];
   const query={select:(projection:string)=>{projections.push(projection);return query;},eq:()=>query,not:()=>query,gte:()=>query,order:()=>query,range:async(from:number,to:number)=>({data:data.slice(from,to+1),error:null})};
   return query;
  });
  const customers=await getCustomers('A');expect(customers).toHaveLength(1251);
  expect(customers.find(c=>c.phone==='1250')?.orders).toEqual([order]);
  expect(projections.some(p=>p.includes('payment_status')&&p.includes('items')&&p.includes('order_number')&&p.includes('payment_method'))).toBe(true);
 });
});
