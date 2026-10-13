import {executorDatabase} from './executor-database';
import { describe, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { privacyHandler, verificationHandler, hashToken, exportCsv } from '../../../supabase/functions/_shared/dsar';
import { checkoutHandler } from '../../../supabase/functions/_shared/checkout';
import { validateMpSignature, applyRemotePayment } from '../../../supabase/functions/_shared/payment-webhook';
import { requireAdmin, requireRestaurantOwner } from '../../../supabase/functions/_shared/authorization';
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
const request=(body:unknown,bearer?:string)=>new Request('http://localhost/test',{method:'POST',headers:{'Content-Type':'application/json',...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:JSON.stringify(body)});
const identity=(email='subject@example.test',confirmed=true)=>({auth:{getUser:vi.fn(async()=>({data:{user:{id:'subject',email,factors:[{status:'verified'}],email_confirmed_at:confirmed?'now':null}},error:null}))}});
function privacyDb(){
 const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>Boolean(args)&&name==='submit_dsar'?{data:{success:true,requestId:'request'},error:null}:{data:{success:true,request_type:'access',data:{orders:[]}},error:null});
 const eq=vi.fn(async()=>({error:null}));return executorDatabase({rpc,from:vi.fn(()=>({update:vi.fn(()=>({eq}))})),eq});
}
describe('DSAR trusted handler boundary',()=>{
 it.each([null,[],42,{email:'subject@example.test',payload:{fields:[null]}},{email:'subject@example.test',payload:{fields:[{field:'role',correct:'admin'}]}}])('rejects malformed rectification input before any database operation: %j',async input=>{
  const db=privacyDb();expect((await privacyHandler({db,auth:identity()},'rectify',vi.fn(),'http://localhost')(request(input))).status).toBe(400);expect(db.rpc).not.toHaveBeenCalled();
 });
 it.each(['access','export','erase','object','revoke-consent','rectify'])('anonymous %s only sends verification; no execution',async type=>{
  const db=privacyDb(),mail=vi.fn<(email:string,url:string)=>Promise<void>>(async()=>{}),payload=type==='rectify'?{fields:[{field:'name',correct:'Nombre'}]}:{scope:'marketing'};
  const result=await privacyHandler({db,auth:identity(),anonKey:'anon'},type,mail,'http://localhost')(request({email:'subject@example.test',payload},'anon'));
  expect(result.status).toBe(200);expect(db.rpc).toHaveBeenCalledTimes(1);expect(mail).toHaveBeenCalledOnce();
  const token=mail.mock.calls[0][1].split('#token=')[1];expect(await hashToken(token)).toBe(db.rpc.mock.calls[0][1].p_hash);
  expect(await result.text()).not.toContain(token);
 });
 it('foreign verified email cannot submit or execute',async()=>{
  const db=privacyDb();const result=await privacyHandler({db,auth:identity('other@example.test')},'erase',vi.fn(),'http://localhost')(request({email:'subject@example.test'},'jwt'));
  expect(result.status).toBe(403);expect(db.rpc).not.toHaveBeenCalled();
 });
 it('invalid JWT is denied before persistence',async()=>{
  const db=privacyDb(),auth={auth:{getUser:vi.fn(async()=>({data:{user:null},error:new Error('invalid')}))}};
  expect((await privacyHandler({db,auth},'export',vi.fn(),'http://localhost')(request({email:'subject@example.test'},'invalid'))).status).toBe(401);
  expect(db.rpc).not.toHaveBeenCalled();
 });
 it('mail failure persists failed delivery and returns a recoverable error',async()=>{
  const db=privacyDb(),handler=privacyHandler({db,auth:identity()},'erase',async()=>{throw new Error('smtp');},'http://localhost');
  const r=await handler(request({email:'subject@example.test'}));expect(r.status).toBe(503);expect(db.eq).toHaveBeenCalledWith('id','request');expect(db.rpc).toHaveBeenCalledTimes(1);
 });
 it('confirmed own identity executes the shared executor',async()=>{
  const db=privacyDb(),r=await privacyHandler({db,auth:identity()},'access',vi.fn(),'http://localhost')(request({email:'subject@example.test'},'jwt'));
  expect(r.status).toBe(200);expect(db.rpc).toHaveBeenLastCalledWith('execute_dsar',{p_id:'request',p_hash:null});
 });
 it('verification needs explicit confirmation and hashes its token',async()=>{
  const db=privacyDb(),handler=verificationHandler(db),token='a'.repeat(64);
  expect((await handler(request({token}))).status).toBe(400);expect(db.rpc).not.toHaveBeenCalled();
  await handler(request({token,confirm:true}));expect(db.rpc).toHaveBeenCalledWith('execute_dsar',{p_id:null,p_hash:await hashToken(token)});
 });
 it('expiry and replay failures never become success',async()=>{
  for(const error of ['expired','invalid_token']){
   const db=executorDatabase({rpc:vi.fn(async()=>({data:{success:false,error},error:null}))});
   expect((await verificationHandler(db)(request({token:'a'.repeat(64),confirm:true}))).status).toBe(error==='expired'?410:404);
  }
 });
 it('export protects CSV cells and quotes',()=>expect(exportCsv({'=HYPERLINK': ['+evil','a"b']})).toContain('"\'=HYPERLINK","\'+evil"'));
});
describe('Payment reservation before external effects',()=>{
 const provider=()=>({configured:true,create:vi.fn(async()=>({remoteId:'100',response:{url:'http://localhost/pay'}}))});
 const dbFor=(attempt:Record<string,unknown>,writeFails=false)=>executorDatabase({
  from:vi.fn(()=>({select:()=>({eq:()=>({eq:()=>({single:async()=>({data:{country:'CL'},error:null})})})})})),
  rpc:vi.fn(async(name:string,args:Record<string,unknown>)=>Boolean(args)&&name==='reserve_checkout'?{data:{id:'attempt',state:'creating',amount:28000,currency:'CLP',tip_amount:0,reference:'R-attempt',email:'fixture@example.test',...attempt},error:null}:{data:null,error:writeFails?new Error('db'):null})
 });
 const body={registration_request_id:'id',plan:'starter',origin:'http://localhost'};
 it('reserves with the regional catalog before invoking a provider',async()=>{
  const db=dbFor({new:true,id:'attempt',amount:28000,currency:'CLP',reference:'R-attempt'}),p=provider();
  const r=await checkoutHandler(db,{flow:p},'registration','flow')(request(body));expect(r.status).toBe(200);
  expect(db.rpc.mock.invocationCallOrder[0]).toBeLessThan(p.create.mock.invocationCallOrder[0]);
  expect(db.rpc.mock.calls[0][1].p_amount).toBe(28000);expect(db.rpc.mock.calls[1][0]).toBe('record_checkout_result');
 });
 it.each(['creating','reconcile'])('duplicate %s attempt does not create another payment',async state=>{
  const db=dbFor({new:false,id:'attempt',state}),p=provider();
  expect((await checkoutHandler(db,{flow:p},'registration','flow')(request(body))).status).toBe(409);expect(p.create).not.toHaveBeenCalled();
 });
 it('reuses the persisted pending response',async()=>{
  const db=dbFor({new:false,state:'pending',response:{url:'saved'}}),p=provider();
  expect(await (await checkoutHandler(db,{flow:p},'registration','flow')(request(body))).json()).toMatchObject({url:'saved',success:true});expect(p.create).not.toHaveBeenCalled();
 });
 it('write failure after creation requests reconciliation without claiming success',async()=>{
  const db=dbFor({new:true,id:'attempt'},true),p=provider();
  const r=await checkoutHandler(db,{flow:p},'registration','flow')(request(body));expect(r.status).toBe(503);expect(await r.json()).toEqual({success:false,error:'payment_reconciliation_required'});
  expect(db.rpc).toHaveBeenLastCalledWith('record_checkout_result',expect.objectContaining({p_uncertain:true}));
 });
 it('missing provider configuration has no reservation or external effects',async()=>{
  const db=dbFor({}),p={...provider(),configured:false};expect((await checkoutHandler(db,{flow:p},'registration','flow')(request(body))).status).toBe(503);expect(db.rpc).not.toHaveBeenCalled();
 });
 it('webhook local failure propagates so the provider can retry',async()=>{
  await expect(applyRemotePayment(executorDatabase({rpc:async()=>({data:null,error:'failure'})}),'flow',{id:'100',reference:'R-1',amount:1,currency:'CLP',status:'approved'})).rejects.toThrow('payment_confirmation_failed');
 });
});
describe('MFA and signature boundaries',()=>{
 const jwt=(aal:string)=>`header.${Buffer.from(JSON.stringify({aal,iat:1800000000})).toString('base64url')}.signature`;
 const adminDb=executorDatabase({...identity(),from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin',restaurant_id:'A'}})})})})});
 it('admin AAL1 cannot use owner routes, admin AAL2 can',async()=>{
  expect((await requireRestaurantOwner(adminDb,request({},jwt('aal1')),'A')).authorized).toBe(false);
  expect((await requireRestaurantOwner(adminDb,request({},jwt('aal2')),'A')).authorized).toBe(true);
  expect((await requireAdmin(adminDb,request({},jwt('aal1')))).authorized).toBe(false);
 });
 it('unsigned/missing secret signatures fail closed',async()=>{
  expect(await validateMpSignature(request({}),'1',undefined)).toBe(false);expect(await validateMpSignature(request({}),'1','secret')).toBe(false);
 });
 it('valid signed webhook accepted, changed ID/time/signature denied',async()=>{
  const now=1800000000000,ts=String(now),secret='fixture-only';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`id:1;request-id:test;ts:${ts};`));
  const v1=Buffer.from(digest).toString('hex');const req=new Request('http://localhost?data.id=1',{headers:{'x-request-id':'test','x-signature':`ts=${ts},v1=${v1}`}});
  expect(await validateMpSignature(req,'1',secret,now)).toBe(true);expect(await validateMpSignature(req,'2',secret,now)).toBe(false);expect(await validateMpSignature(req,'1',secret,now+300001)).toBe(false);
 });
});
