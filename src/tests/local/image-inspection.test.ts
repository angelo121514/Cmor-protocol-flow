import {describe,it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {inspectImage,readImageUpload} from '../../../supabase/functions/_shared/image-inspection';
const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC','base64'));
const config={url:'http://127.0.0.1:58081',secret:'s'.repeat(64),local:true};
const response=(hash=createHash('sha256').update(png).digest('hex'),data=png)=>new Response(data,{headers:{'content-type':'image/png','x-input-sha256':hash,'x-image-width':'1','x-image-height':'1'}});
describe('Private decoded image and antivirus boundary',()=>{
 it('requires configured secure transport and never invokes an unconfigured inspector',async()=>{
  const send=vi.fn();
  await expect(inspectImage(png,'image/png',{...config,url:'',fetch:send})).rejects.toMatchObject({status:503});
  await expect(inspectImage(png,'image/png',{...config,url:'http://external.example.test',fetch:send})).rejects.toMatchObject({status:503});
  expect(send).not.toHaveBeenCalled();
 });
 it('accepts only a bounded canonical PNG bound to the original hash',async()=>{
  const send=vi.fn(async()=>response());
  expect(await inspectImage(png,'image/png',{...config,fetch:send})).toEqual(png);
  expect(send).toHaveBeenCalledOnce();
  await expect(inspectImage(png,'image/png',{...config,fetch:vi.fn(async()=>response('0'.repeat(64)))})).rejects.toMatchObject({status:503});
  await expect(inspectImage(png,'image/png',{...config,fetch:vi.fn(async()=>response(undefined,new Uint8Array(2097153)))})).rejects.toMatchObject({status:503});
 });
 it('fails closed for unavailable, rejected and timed out scanners',async()=>{
  for(const status of [400,403,503])await expect(inspectImage(png,'image/png',{...config,fetch:vi.fn(async()=>new Response('{}',{status}))})).rejects.toMatchObject({status:status===400?400:503});
  await expect(inspectImage(png,'image/png',{...config,fetch:vi.fn(async()=>{throw new Error('private diagnostic');})})).rejects.toMatchObject({message:'image_inspection_unavailable',status:503});
 });
});
describe('Actual bounded upload reader',()=>{
 it('requires a known length and drains an oversized declared request without accepting it',async()=>{
  await expect(readImageUpload(new Request('http://localhost',{method:'POST',body:png}))).rejects.toMatchObject({status:411});
  await expect(readImageUpload(new Request('http://localhost',{method:'POST',headers:{'content-length':'2200001'},body:png}))).rejects.toMatchObject({status:413});
 });
 it('reads the actual stream and enforces the byte limit even if the header understates it',async()=>{
  expect(await readImageUpload(new Request('http://localhost',{method:'POST',headers:{'content-length':String(png.length)},body:png}))).toEqual(png);
  await expect(readImageUpload(new Request('http://localhost',{method:'POST',headers:{'content-length':'1'},body:new Uint8Array(2200001)}))).rejects.toMatchObject({status:413});
 });
 it('times out a stalled stream without waiting for cancellation acknowledgement',async()=>{
  vi.useFakeTimers();
  try{
   const request=new Request('http://localhost',{method:'POST',headers:{'content-length':'1'},body:new ReadableStream({cancel:()=>new Promise(()=>{})}),duplex:'half'} as RequestInit);
   const result=expect(readImageUpload(request)).rejects.toMatchObject({status:408});await vi.advanceTimersByTimeAsync(10001);await result;
  }finally{vi.useRealTimers();}
 });
});
