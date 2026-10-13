import type {EdgeDatabase, RpcDatabase} from './ports.ts';
import type {FlowApiClient} from './flow-client.ts';
import type {FlowCustomerResponse} from './flow-types.ts';
export async function providerOperation<T>(db: RpcDatabase,restaurant: string,kind: string,payload: Record<string,unknown>,call: ()=>Promise<T>): Promise<T>{
 const reserved=await db.rpc('reserve_provider_operation',{p_restaurant:restaurant,p_kind:kind,p_payload:payload});
 if(reserved.error||!reserved.data)throw new Error('provider_reconciliation_required');
 if(!reserved.data.new){
  if(reserved.data.state==='confirmed'&&reserved.data.response)return reserved.data.response as T;
  throw new Error('provider_reconciliation_required');
 }
 const id=reserved.data.id;
 try{
  const response=await call();
  const persisted=await db.rpc('record_provider_operation',{p_id:id,p_data:response});
  if(persisted.error)throw new Error('provider_persistence_failed');
  return persisted.data as T;
 }catch{
  await db.rpc('record_provider_operation',{p_id:id,p_data:null});
  throw new Error('provider_reconciliation_required');
 }
}
export async function ensureFlowCustomer(db: EdgeDatabase,flow: Pick<FlowApiClient,'send'>,restaurant: string): Promise<string>{
 const existing=await db.from('flow_customers').select('id').eq('restaurant_id',restaurant).maybeSingle();
 if(existing.error)throw new Error('customer_lookup_failed');
 if(existing.data)return existing.data.id;
 const r=await db.from('restaurants').select('name,email,country').eq('id',restaurant).single();
 if(r.error||r.data?.country!=='CL')throw new Error('unsupported_restaurant');
 const response=await providerOperation(db,restaurant,'customer',{},()=>flow.send<FlowCustomerResponse>('customer/create',{name:r.data.name,email:r.data.email,externalId:restaurant},'POST'));
 if(typeof response?.customerId!=='string'||!response.customerId)throw new Error('customer_reconciliation_required');
 return response.customerId;
}
