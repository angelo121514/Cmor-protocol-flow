import {describe,it,expect} from 'vitest';
import {createHmac,createHash} from 'node:crypto';
import {actor,adminAal2,anonymous,fixture,service} from './fixtures';
const edge=async(name:string,body:unknown,authorization?:string)=>fetch(`${fixture.url}/functions/v1/${name}`,{method:'POST',headers:{apikey:fixture.anon,'Content-Type':'application/json',origin:'http://localhost:5173',...(authorization?{authorization:`Bearer ${authorization}`}:{})},body:JSON.stringify(body)});
describe('Actual local Edge HTTP contracts and deterministic providers',()=>{
 it('keeps external AI disabled',async()=>{const response=await edge('ai-recommendations',{});expect(response.status).toBe(503);expect((await response.json()).error).toBe('ai_disabled');});
 it('exposes provider configuration presence only to a real MFA admin',async()=>{
  const request=async(jwt?:string)=>fetch(`${fixture.url}/functions/v1/operations-readiness`,{headers:{apikey:fixture.anon,...(jwt?{authorization:`Bearer ${jwt}`}:{})}});
  for(const role of ['ownerA','admin'] as const){const client=await actor(role);expect((await request((await client.auth.getSession()).data.session!.access_token)).status).toBe(403);}
  expect((await request()).status).toBe(403);
  const admin=await adminAal2(),response=await request((await admin.auth.getSession()).data.session!.access_token);expect(response.status).toBe(200);
  const body=await response.text();expect(body).not.toContain('synthetic');expect(body).not.toContain('API_KEY');expect(body).toContain('false');
 });
 it('all six privacy routes request verification without revealing personal data',async()=>{
  for(const right of ['access','export','erase','rectify','object','revoke-consent']){
   const response=await edge(`privacy-${right}`,{email:`edge-${crypto.randomUUID()}@fixture.example.test`,payload:right==='rectify'?{fields:[{field:'name',correct:'Synthetic correction'}]}:['object','revoke-consent'].includes(right)?{scope:'marketing'}:{}});
   expect(response.status).toBe(200);const result=await response.json();expect(result.status).toBe('pending_verification');expect(result.data).toBeUndefined();expect(result.token).toBeUndefined();
  }
 });
 it('rejects a forged JWT',async()=>{const response=await edge('privacy-export',{email:'forged@fixture.example.test'},'invalid');expect(response.status).toBe(401);});
 it('validates real image uploads and denies another tenant access to an existing private object',async()=>{
  const owner=await actor('ownerA'),other=await actor('ownerB'),db=service();
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC','base64');
  async function upload(caller:typeof owner,content=bytes){
   const body=new FormData();body.set('restaurant_id',fixture.restaurants.A);body.set('file',new File([content],'fixture.png',{type:'image/png'}));
   return fetch(`${fixture.url}/functions/v1/menu-image`,{method:'POST',headers:{apikey:fixture.anon,authorization:`Bearer ${(await caller.auth.getSession()).data.session!.access_token}`,origin:'http://localhost:5173'},body});
  }
  expect((await upload(other)).status).toBe(403);expect((await upload(owner,Buffer.from('not an image'))).status).toBe(400);
  const bypassPath=`${fixture.restaurants.A}/${crypto.randomUUID()}.png`,bypass=await owner.storage.from('menu-images').upload(bypassPath,bytes,{contentType:'image/png'});
  if(!bypass.error)await db.storage.from('menu-images').remove([bypassPath]);expect(bypass.error).not.toBeNull();
  expect((await upload(owner,Buffer.alloc(2200001))).status).toBe(413);
  const corrupt=Buffer.from(bytes);corrupt[45]^=1;expect((await upload(owner,corrupt)).status).toBe(400);
    const response=await upload(owner,Buffer.concat([bytes,Buffer.from('Synthetic trailing metadata')]));expect(response.status).toBe(200);const result=await response.json(),url=new URL(result.url);expect(url.origin).toBe(new URL(fixture.url).origin);
  const path=url.searchParams.get('path')!;
  try{
   expect((await owner.storage.from('menu-images').update(path,bytes,{contentType:'image/png'})).error).not.toBeNull();
   expect((await other.storage.from('menu-images').createSignedUrl(path,60)).error).not.toBeNull();
   expect((await owner.storage.from('menu-images').createSignedUrl(path,60)).error).toBeNull();
   expect((await fetch(url,{headers:{apikey:fixture.anon},redirect:'manual'})).status).toBe(404);
   expect((await other.from('menu_items').update({image_url:result.url}).eq('id',fixture.menu.B)).error).toBeNull();
   expect((await fetch(url,{headers:{apikey:fixture.anon},redirect:'manual'})).status).toBe(404);
   expect((await owner.from('menu_items').update({image_url:result.url}).eq('id',fixture.menu.A)).error).toBeNull();
   const published=await fetch(url,{headers:{apikey:fixture.anon},redirect:'manual'});expect(published.status).toBe(302);
   const image=new URL(published.headers.get('location')!);expect(image.origin).toBe(url.origin);
   const stored=await fetch(image);expect(stored.status).toBe(200);expect(Buffer.from(await stored.arrayBuffer()).includes(Buffer.from('Synthetic trailing metadata'))).toBe(false);
  }finally{
   expect((await other.from('menu_items').update({image_url:null}).eq('id',fixture.menu.B)).error).toBeNull();
   expect((await owner.from('menu_items').update({image_url:null}).eq('id',fixture.menu.A)).error).toBeNull();
   expect((await db.storage.from('menu-images').remove([path])).error).toBeNull();
  }
 });
 it('downloads verified exports over HTTP, requires confirmation and rejects expired/replayed tokens',async()=>{
  const db=service(),email=`download-${crypto.randomUUID()}@fixture.example.test`,token=crypto.randomUUID().replaceAll('-','')+'a'.repeat(32);
  const submitted=await db.rpc('submit_dsar',{p_email:email,p_type:'export',p_payload:{},p_subject_id:null,p_hash:createHash('sha256').update(token).digest('hex'),p_ip:null});expect(submitted.error).toBeNull();
  expect((await edge('verify-dsar',{token,confirm:false})).status).toBe(400);
  const response=await edge('verify-dsar',{token,confirm:true});expect(response.status).toBe(200);const exported=await response.json();
  expect(exported).toMatchObject({success:true,status:'fulfilled',request_type:'export'});expect(exported.data.json).toMatchObject({authUsers:[],customers:[],orders:[],consents:[]});expect(exported.data.csv).toContain('dataset,record');
  expect((await edge('verify-dsar',{token,confirm:true})).status).toBe(404);
  const expired=crypto.randomUUID().replaceAll('-','')+'b'.repeat(32),created=await db.rpc('submit_dsar',{p_email:`expired-${email}`,p_type:'erase',p_payload:{},p_subject_id:null,p_hash:createHash('sha256').update(expired).digest('hex'),p_ip:null});expect(created.error).toBeNull();
  expect((await db.from('data_subject_requests').update({token_expires_at:new Date(0).toISOString()}).eq('id',created.data.requestId)).error).toBeNull();
  expect((await edge('verify-dsar',{token:expired,confirm:true})).status).toBe(410);
 });
 it('rejects a foreign verified email and keeps rectification pending until an AAL2 admin reviews it',async()=>{
  const db=service(),owner=await actor('ownerA'),email=`rectify-${crypto.randomUUID()}@fixture.example.test`,customer=crypto.randomUUID(),token=crypto.randomUUID().replaceAll('-','')+'c'.repeat(32);
  expect((await db.from('restaurant_customers').insert({id:customer,restaurant_id:fixture.restaurants.A,name:'Before review',phone:customer,email})).error).toBeNull();
  const jwt=(await owner.auth.getSession()).data.session!.access_token;
  expect((await edge('privacy-access',{email},jwt)).status).toBe(403);
  const created=await db.rpc('submit_dsar',{p_email:email,p_type:'rectify',p_payload:{fields:[{field:'name',correct:'After review'}]},p_subject_id:null,p_hash:createHash('sha256').update(token).digest('hex'),p_ip:null});expect(created.error).toBeNull();
  const response=await edge('verify-dsar',{token,confirm:true});expect(response.status).toBe(200);expect(await response.json()).toMatchObject({status:'pending',data:{review_required:true}});
  expect((await db.from('restaurant_customers').select('name').eq('id',customer).single()).data?.name).toBe('Before review');
  expect((await (await actor('admin')).rpc('review_dsar_rectification',{p_id:created.data.requestId,p_approve:true})).error).not.toBeNull();
  expect((await (await adminAal2()).rpc('review_dsar_rectification',{p_id:created.data.requestId,p_approve:true})).error).toBeNull();
  expect((await db.from('restaurant_customers').select('name').eq('id',customer).single()).data?.name).toBe('After review');
 });
 it('rejects an unsigned MP webhook and confirms BRL only after signed remote lookup',async()=>{
  const db=service(),restaurant=crypto.randomUUID(),menu=crypto.randomUUID(),table=crypto.randomUUID(),qr=crypto.randomUUID();
  expect((await db.from('restaurants').insert({id:restaurant,name:'Synthetic MP',slug:restaurant,email:`${restaurant}@fixture.example.test`,phone:'+55000000000',subscription_plan:'pro',status:'active',is_active:true,country:'BR',currency:'BRL',tax_rate:0})).error).toBeNull();
  expect((await db.from('menu_items').insert({id:menu,restaurant_id:restaurant,name:'Synthetic BRL dish',base_price:10.01,is_available:true})).error).toBeNull();
  expect((await db.from('restaurant_tables').insert({id:table,restaurant_id:restaurant,table_number:table,qr_token:qr,is_active:true})).error).toBeNull();
  const scan=await anonymous().rpc('start_table_session_by_qr',{p_qr_token:qr});expect(scan.error).toBeNull();const session=scan.data[0];
  expect((await anonymous().rpc('create_table_order',{p_session_token:session.session_token,p_order_data:{operation_key:crypto.randomUUID(),items:[{menu_item_id:menu,quantity:1}]}})).error).toBeNull();
  const response=await edge('order-pay',{session_token:session.session_token,tip_amount:0.5,origin:'http://localhost:5173'});expect(response.status).toBe(200);const payment=await response.json();
  const requestId=crypto.randomUUID(),ts=String(Math.floor(Date.now()/1000)),id=payment.payment_id;
  const webhook=`${fixture.url}/functions/v1/mp-webhook?data.id=${id}`,body=JSON.stringify({type:'payment',data:{id}});
  expect((await fetch(webhook,{method:'POST',headers:{'content-type':'application/json'},body})).status).toBe(401);
  expect((await db.from('table_sessions').select('status').eq('id',session.session_id).single()).data?.status).toBe('payment_pending');
  const signature=createHmac('sha256','synthetic').update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');
  for(let n=0;n<2;n++)expect((await fetch(webhook,{method:'POST',headers:{'content-type':'application/json','x-request-id':requestId,'x-signature':`ts=${ts},v1=${signature}`},body})).status).toBe(200);
  const receipt=await anonymous().rpc('checkout_receipt',{p_token:payment.receipt_token});expect(receipt.error).toBeNull();expect(receipt.data).toMatchObject({state:'confirmed',currency:'BRL',amount:10.51});
 });
 it('repeats a Webpay return through remote lookup without duplicating registration activation',async()=>{
  const db=service(),request=crypto.randomUUID();
  expect((await db.from('registration_requests').insert({id:request,restaurant_name:`Synthetic Webpay ${request}`,owner_name:'Synthetic owner',phone:'+56900000000',email:`webpay-${request}@fixture.example.test`,city:'Synthetic',restaurant_type:'other',status:'pending',country:'CL'})).error).toBeNull();
  const response=await edge('create-payment-intent',{registration_request_id:request,plan:'pro'});expect(response.status).toBe(200);const payment=await response.json();
  expect((await db.from('restaurants').select('id').eq('registration_request_id',request)).data).toEqual([]);
  for(let n=0;n<2;n++){
   const callback=await fetch(`${fixture.url}/functions/v1/webhooks/webpay`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',origin:'https://webpay3gint.transbank.cl'},body:new URLSearchParams({token_ws:payment.token}),redirect:'manual'});
   expect(callback.status).toBe(303);expect(callback.headers.get('location')).toContain('/setup-password?request_id=');
  }
  const restaurants=await db.from('restaurants').select('id,subscription_plan').eq('registration_request_id',request);expect(restaurants.error).toBeNull();expect(restaurants.data).toHaveLength(1);expect(restaurants.data?.[0]?.subscription_plan).toBe('pro');
 });
 it('creates Flow payment once, confirms through remote lookup and closes the session',async()=>{
  const db=service(),qr=crypto.randomUUID(),table=crypto.randomUUID();
  const inserted=await db.from('restaurant_tables').insert({id:table,restaurant_id:fixture.restaurants.A,table_number:table,qr_token:qr,is_active:true});expect(inserted.error).toBeNull();
  const scan=await anonymous().rpc('start_table_session_by_qr',{p_qr_token:qr});expect(scan.error).toBeNull();const session=scan.data[0];
  const order=await anonymous().rpc('create_table_order',{p_session_token:session.session_token,p_order_data:{operation_key:crypto.randomUUID(),items:[{menu_item_id:fixture.menu.A,quantity:1}]}});expect(order.error).toBeNull();
  const input={session_token:session.session_token,tip_amount:100,origin:'http://localhost:5173'};
  const first=await edge('order-pay',input);expect(first.status).toBe(200);const payment=await first.json();
  const repeated=await edge('order-pay',input);expect(repeated.status).toBe(200);expect((await repeated.json()).token).toBe(payment.token);
  for(let i=0;i<2;i++){
   const response=await fetch(`${fixture.url}/functions/v1/webhooks/flow`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:payment.token})});expect(response.status).toBe(200);
  }
  const receipt=await anonymous().rpc('checkout_receipt',{p_token:payment.receipt_token});expect(receipt.error).toBeNull();expect(receipt.data.state).toBe('confirmed');
  const state=await db.from('table_sessions').select('status').eq('id',session.session_id).single();expect(state.error).toBeNull();expect(state.data?.status).toBe('closed');
 });
});
