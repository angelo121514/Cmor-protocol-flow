import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
const payments=new Map(),docs=new Map(),requests=new Map(),plans=new Map(),counts=new Map();let next=1000;
export function mockProviders(port=58080){
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),parts=[];for await(const part of req)parts.push(part);
  const reply=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  let body;
  try {const raw=Buffer.concat(parts).toString();body=raw?(req.headers['content-type']?.includes('json')?JSON.parse(raw):Object.fromEntries(new URLSearchParams(raw))):{};}
  catch {return reply({error:'invalid_fixture_input'},400);}
  if(url.pathname==='/__counts'&&req.method==='GET')return reply(Object.fromEntries(counts));
  counts.set(url.pathname,(counts.get(url.pathname)||0)+1);
  if(url.pathname==='/mail/emails')return reply({id:randomUUID()});
  if(url.pathname==='/flow/plans/get'){const p=plans.get(url.searchParams.get('planId'));return reply(p??{error:'NOT_FOUND'},p?200:404);}
  if(url.pathname==='/flow/plans/create'){const p={...body,amount:Number(body.amount)};plans.set(p.planId,p);return reply(p);}
  if(url.pathname==='/flow/customer/create')return reply({...body,customerId:randomUUID()});
  if(url.pathname==='/flow/subscription/create')return reply({...body,subscriptionId:randomUUID(),status:1,current_period_start:new Date().toISOString(),current_period_end:new Date(Date.now()+2592000000).toISOString()});
  if(url.pathname==='/flow/subscription/cancel')return reply({...body,status:4});
  if(url.pathname==='/flow/payment/create'){
   const id=String(next++),token=randomUUID();payments.set(token,{flowOrder:Number(id),commerceOrder:body.commerceOrder,amount:Number(body.amount),currency:body.currency,status:2});
   return reply({flowOrder:Number(id),token,url:'http://localhost:58080/checkout'});
  }
  if(url.pathname==='/flow/payment/getStatus'){const p=payments.get(url.searchParams.get('token'));return reply(p??{error:'NOT_FOUND'},p?200:404);}
  if(url.pathname==='/mp/v1/payments'&&req.method==='POST'){
   const key=req.headers['x-idempotency-key'];if(key&&requests.has(key))return reply(requests.get(key));
   const id=next++,p={...body,id,currency_id:body.payment_method_id==='pix'?'BRL':'PEN',status:'approved',point_of_interaction:{transaction_data:{ticket_url:'http://localhost:58080/checkout'}}};payments.set(String(id),p);if(key)requests.set(key,p);return reply(p);
  }
  if(url.pathname.startsWith('/mp/v1/payments/')){const p=payments.get(url.pathname.split('/').at(-1));return reply(p??{error:'NOT_FOUND'},p?200:404);}
  if(url.pathname.startsWith('/webpay/')){
   if(req.method==='POST'){const token=randomUUID();payments.set(token,{...body,status:'INITIALIZED',response_code:0});return reply({token,url:'http://localhost:58080/checkout'});}
   const p=payments.get(url.pathname.split('/').at(-1));if(!p)return reply({error:'NOT_FOUND'},404);if(req.method==='PUT')p.status='AUTHORIZED';return reply(p);
  }
  if(url.pathname==='/tax/dtes'&&req.method==='POST'){
   const key=req.headers['idempotency-key'];if(requests.has(key))return reply(requests.get(key));
   const id=randomUUID(),p={requestId:id,status:'accepted',externalReference:body.externalReference,dte:{dteId:id,folio:next++,siiStatus:'accepted',amount:body.totals?.total??1000}};
   docs.set(body.externalReference,p);docs.set(id,p);requests.set(key,p);return reply(p);
  }
  if(url.pathname==='/tax/dtes'||url.pathname.startsWith('/tax/dtes/')){const p=docs.get(url.searchParams.get('externalReference')??url.pathname.split('/').at(-1));return reply(p??{error:{code:'NOT_FOUND',message:'Synthetic request not found'}},p?200:404);}
  return reply({error:'unsupported_mock_route'},404);
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',()=>resolve(server));});
}
if(process.argv[1]?.endsWith('mock-providers.mjs')){await mockProviders();console.log('Local deterministic provider simulators ready on port 58080.');}
