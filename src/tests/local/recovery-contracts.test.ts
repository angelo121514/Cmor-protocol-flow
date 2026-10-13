import {executorDatabase} from './executor-database';
import { describe, it, expect, vi } from 'vitest';
import { collectDsarDownload, verificationHandler } from '../../../supabase/functions/_shared/dsar';
import { providerOperation } from '../../../supabase/functions/_shared/provider-operations';
import { applyAccountingState, reconcileAccountingDocument } from '../../../supabase/functions/_shared/accounting-recovery';
import { TaxApiError } from '../../../supabase/functions/_shared/tax-client';
import { deliverInvitations } from '../../../supabase/functions/_shared/invitation-delivery';
const store=(fail=false)=>{const single=vi.fn(async()=>({data:fail?null:{id:'doc'},error:fail?'failure':null}));const update=vi.fn(()=>({eq:()=>({select:()=>({single})})}));return executorDatabase({from:()=>({update}),update});};
describe('Recoverable DSAR downloads',()=>{
 it('reads 1251 records through the actual executor adapter before completing',async()=>{
  let reads=0;const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
   if(name==='finish_dsar_download')return {data:{success:true,status:'fulfilled',request_type:'export'},error:null};
   reads++;const start=Number(args.p_after),end=Math.min(start+500,1251);return {data:{rows:Array.from({length:end-start},(_,i)=>({dataset:'orders',record:{id:start+i}})),cursor:end,more:end<1251},error:null};
  });const result=await collectDsarDownload(executorDatabase({rpc}),{requestId:'request',download_token:'a'.repeat(64)});
  expect(reads).toBe(3);expect(result.data.orders).toHaveLength(1251);expect(rpc).toHaveBeenLastCalledWith('finish_dsar_download',expect.anything());
 });
 it('page failure never calls completion, returns a recovery capability and never executes the verification token again',async()=>{
  const rpc=vi.fn<(name:string,args:Record<string,unknown>)=>Promise<{data:null;error:string}>>(async()=>({data:null,error:'db'}));const handler=verificationHandler(executorDatabase({rpc}));
  const response=await handler(new Request('http://localhost/verify',{method:'POST',body:JSON.stringify({requestId:'request',download_token:'a'.repeat(64),confirm:true})}));
  expect(response.status).toBe(503);expect((await response.json()).error).toBe('download_incomplete');expect(rpc).toHaveBeenCalledOnce();expect(rpc.mock.calls[0][0]).toBe('read_dsar_download');
 });
});
describe('Provider reservation and recovery',()=>{
 it('returns a confirmed cancellation without another external call or write',async()=>{
  const response={subscriptionId:'subscription',status:4},call=vi.fn();
  const db={rpc:vi.fn(async()=>({data:{new:false,state:'confirmed',response},error:null}))};
  expect(await providerOperation(executorDatabase(db),'restaurant','cancel',{subscription_id:'subscription',at_period_end:0},call)).toEqual(response);
  expect(call).not.toHaveBeenCalled();expect(db.rpc).toHaveBeenCalledOnce();
 });
 it('does not invoke a provider while a previous result is uncertain',async()=>{
  const call=vi.fn(),db={rpc:vi.fn(async()=>({data:{new:false,state:'reconcile'},error:null}))};
  await expect(providerOperation(executorDatabase(db),'restaurant','subscription',{},call)).rejects.toThrow('reconciliation');expect(call).not.toHaveBeenCalled();
 });
 it('reserves, calls and persists in order; a write failure remains recoverable',async()=>{
  const events:string[]=[],db={rpc:vi.fn(async(name:string,args:Record<string,unknown>)=>{events.push(name);return name==='reserve_provider_operation'?{data:{new:true,id:'op'},error:null}:{data:null,error:args.p_data?'db':null};})};
  await expect(providerOperation(executorDatabase(db),'restaurant','customer',{},async()=>{events.push('provider');return {customerId:'remote'};})).rejects.toThrow('reconciliation');
  expect(events).toEqual(['reserve_provider_operation','provider','record_provider_operation','record_provider_operation']);
 });
});
describe('Accounting recovery uses checked writes',()=>{
 it('adopts the remote request id so subsequent polling can resume',async()=>{
  const db=store(),emit=vi.fn();expect(await reconcileAccountingDocument(db,{findByExternalReference:async()=>({requestId:'remote',status:'accepted',dte:null,error:null})},{id:'doc',external_reference:'order'},emit)).toBe('adopted');
  expect(db.update).toHaveBeenCalledWith(expect.objectContaining({request_id:'remote',status:'accepted'}));expect(emit).not.toHaveBeenCalled();
 });
 it('re-emits only a confirmed NOT_FOUND and preserves the existing document operation',async()=>{
  const emit=vi.fn(async()=>{});expect(await reconcileAccountingDocument(store(),{findByExternalReference:async()=>{throw new TaxApiError('NOT_FOUND','fixture',404);}},{id:'existing',external_reference:'order'},emit)).toBe('emitted');expect(emit).toHaveBeenCalledOnce();
 });
 it('a local write failure cannot become a successful accounting state update',async()=>{
  await expect(applyAccountingState(store(true),'doc',{requestId:'remote',status:'accepted'} as never)).rejects.toThrow('accounting_persistence_failed');
 });
 it('mail failure records reconciliation and never claims it was sent',async()=>{
  const rpc=vi.fn(async(name:string)=>({data:name==='claim_invitations'?[{id:'inv',email:'synthetic@fixture.example.test',token:'fixture',delivery_claim:'claim'}]:true,error:null}));
  const result=await deliverInvitations(executorDatabase({rpc,auth:{admin:{inviteUserByEmail:async()=>({error:'mail'})}}}),'http://localhost');
  expect(result).toEqual({processed:0,failed:1});expect(rpc).toHaveBeenLastCalledWith('finish_invitation_delivery',{p_id:'inv',p_claim:'claim',p_sent:false});
 });
});
