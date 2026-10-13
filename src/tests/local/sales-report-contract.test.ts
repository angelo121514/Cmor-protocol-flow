import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../../config/supabase',()=>({supabase:mocks}));
import {getSalesReport} from '../../services/reportsService';
const report=()=>({totalRevenue:1251000,totalOrders:1251,avgOrderValue:1000,totalSubtotal:1050840,totalTax:200160,totalDiscount:0,
 currency:'CLP',historicalCurrencyCount:0,windowStart:'2026-10-01T03:00:00Z',windowEnd:'2026-10-06T21:00:00Z',timezone:'America/Santiago',
 topItems:[{name:'Synthetic',count:1251,revenue:1251000}],dailyRevenue:[{date:'2026-10-06',revenue:1251000,orders:1251}],orderTypeDistribution:[{type:'Mostrador',count:1251}]});
beforeEach(()=>vi.clearAllMocks());
describe('Sales report service consumes the trusted aggregate',()=>{
 it('uses a single tenant-scoped RPC with the bounded window',async()=>{
  mocks.rpc.mockResolvedValue({data:report(),error:null});expect(await getSalesReport('A',30)).toEqual(report());
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('restaurant_sales_report',{p_restaurant_id:'A',p_days:30});
 });
 it('propagates authorization or database failure instead of reporting zero sales',async()=>{
  const error={code:'42501',message:'unauthorized'};mocks.rpc.mockResolvedValue({data:null,error});
  await expect(getSalesReport('B',7)).rejects.toBe(error);
 });
 it('rejects incomplete, non-finite and malformed aggregate responses',async()=>{
  for(const data of [null,{}, {...report(),totalRevenue:Infinity},{...report(),dailyRevenue:[{date:'broken',revenue:0,orders:0}]}]){
   mocks.rpc.mockResolvedValue({data,error:null});await expect(getSalesReport('A',30)).rejects.toThrow('invalid_sales_report_response');
  }
 });
 it('rejects unsupported windows before making a request',async()=>{
  await expect(getSalesReport('A',365)).rejects.toThrow('invalid_report_window');expect(mocks.rpc).not.toHaveBeenCalled();
 });
});
