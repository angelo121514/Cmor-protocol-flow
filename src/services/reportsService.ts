import {supabase} from '../config/supabase';

export interface SalesReport {
 totalRevenue:number; totalOrders:number; avgOrderValue:number; totalSubtotal:number; totalTax:number; totalDiscount:number;
 currency:string; historicalCurrencyCount:number; windowStart:string; windowEnd:string; timezone:string;
 topItems:{name:string;count:number;revenue:number}[];
 dailyRevenue:{date:string;revenue:number;orders:number}[];
 orderTypeDistribution:{type:string;count:number}[];
}
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const metric=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER;
const count=(v:unknown)=>metric(v)&&Number.isSafeInteger(v);
function validReport(v:unknown):v is SalesReport {
 if(!record(v))return false;
 return ['totalRevenue','avgOrderValue','totalSubtotal','totalTax','totalDiscount'].every(k=>metric(v[k]))&&
  count(v.totalOrders)&&count(v.historicalCurrencyCount)&&typeof v.currency==='string'&&['CLP','USD','BRL','BOB','PEN'].includes(v.currency)&&
  typeof v.timezone==='string'&&typeof v.windowStart==='string'&&Number.isFinite(Date.parse(v.windowStart))&&
  typeof v.windowEnd==='string'&&Number.isFinite(Date.parse(v.windowEnd))&&
  Array.isArray(v.topItems)&&v.topItems.length<=5&&v.topItems.every(i=>record(i)&&typeof i.name==='string'&&count(i.count)&&metric(i.revenue))&&
  Array.isArray(v.dailyRevenue)&&v.dailyRevenue.length<=14&&v.dailyRevenue.every(d=>record(d)&&typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&metric(d.revenue)&&count(d.orders))&&
  Array.isArray(v.orderTypeDistribution)&&v.orderTypeDistribution.every(t=>record(t)&&typeof t.type==='string'&&count(t.count));
}
/** One trusted aggregate; query/RLS/contract failures never become zero sales. */
export async function getSalesReport(restaurantId:string,days:number):Promise<SalesReport> {
 if(!restaurantId||![1,7,30,90].includes(days))throw new Error('invalid_report_window');
 const {data,error}=await supabase.rpc('restaurant_sales_report',{p_restaurant_id:restaurantId,p_days:days});
 if(error)throw error;
 if(!validReport(data))throw new Error('invalid_sales_report_response');
 return data;
}
