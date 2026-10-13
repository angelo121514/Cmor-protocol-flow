import {detectImage} from '../../../shared/image-validation.ts';

export class ImageInspectionError extends Error {
 readonly status:number;
 constructor(status:number,code:string){super(code);this.status=status;}
}
type InspectionOptions={url:string;secret:string;local?:boolean;fetch?:typeof fetch};
const maximum=2097152;
export async function readImageUpload(req:Request):Promise<Uint8Array<ArrayBuffer>>{
 const length=req.headers.get('content-length');
 let rejection=!length||!/^\d+$/.test(length)?new ImageInspectionError(411,'content_length_required'):
  Number(length)>2200000?new ImageInspectionError(413,'file_too_large'):null;
 const reader=req.body?.getReader();if(!reader)throw new ImageInspectionError(400,'invalid_file');
 const chunks:Uint8Array[]=[];let size=0;
 const deadline=Date.now()+10000;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new ImageInspectionError(408,'upload_timeout')),10000);});
 try{
  // Drain rejected content without retaining it. Returning before consumption
  // deadlocks the local Edge runtime's request-body forwarding under backpressure.
  while(true){
   if(Date.now()>deadline)throw new ImageInspectionError(408,'upload_timeout');
   const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.length;
   if(size>2200000){rejection=new ImageInspectionError(413,'file_too_large');chunks.length=0;}
   if(!rejection)chunks.push(value);
  }
  if(rejection)throw rejection;
  const input=new Uint8Array(size);let offset=0;for(const chunk of chunks){input.set(chunk,offset);offset+=chunk.length;}return input;
 }finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
}
export async function inspectImage(bytes:Uint8Array,type:string,options:InspectionOptions):Promise<Uint8Array>{
 let endpoint:URL;
 try{endpoint=new URL(options.url);}catch{throw new ImageInspectionError(503,'image_inspection_unavailable');}
 const privateLocal=/^(localhost|127\.0\.0\.1|host\.docker\.internal|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)$/.test(endpoint.hostname);
 if(endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/'||options.secret.length<32||
  (endpoint.protocol!=='https:'&&!(options.local&&privateLocal&&endpoint.protocol==='http:')))
  throw new ImageInspectionError(503,'image_inspection_unavailable');
 try{
  const response=await (options.fetch??fetch)(new URL('/inspect',endpoint),{
   method:'POST',redirect:'error',headers:{authorization:`Bearer ${options.secret}`,'content-type':'application/octet-stream','x-image-type':type},
   body:bytes as BodyInit,signal:AbortSignal.timeout(30000),
  });
  if(response.status===400)throw new ImageInspectionError(400,'invalid_or_unsafe_image_content');
  if(!response.ok||response.headers.get('content-type')!=='image/png'||!response.body)throw new Error('inspection_failed');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const width=Number(response.headers.get('x-image-width')),height=Number(response.headers.get('x-image-height'));
  if(response.headers.get('x-input-sha256')!==hash||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096||width*height>16000000)throw new Error('invalid_inspection_result');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maximum)throw new Error('oversized_result');chunks.push(value);}}
  finally{await reader.cancel();}
  const canonical=new Uint8Array(total);let position=0;for(const chunk of chunks){canonical.set(chunk,position);position+=chunk.length;}
  if(detectImage(canonical)!=='image/png')throw new Error('invalid_canonical_image');
  return canonical;
 }catch(error){if(error instanceof ImageInspectionError)throw error;throw new ImageInspectionError(503,'image_inspection_unavailable');}
}
