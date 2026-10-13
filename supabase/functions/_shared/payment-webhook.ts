export async function validateMpSignature(req: Request,id: string,secret: string|undefined,now=Date.now()): Promise<boolean> {
 if(!secret) return false;
 const queryId=new URL(req.url).searchParams.get('data.id');
 if(queryId && queryId!==id) return false;
 const pieces=Object.fromEntries((req.headers.get('x-signature')??'').split(',').map(s=>s.trim().split('=')));
 if(!/^\d+$/.test(pieces.ts??'') || !/^[a-fA-F0-9]{64}$/.test(pieces.v1??'')) return false;
 const timestamp=Number(pieces.ts)*(pieces.ts.length<=10?1000:1);
 if(!Number.isSafeInteger(timestamp) || Math.abs(now-timestamp)>300000) return false;
 const requestId=req.headers.get('x-request-id');
 if(!requestId) return false;
 const manifest=`id:${(queryId??id).toLowerCase()};request-id:${requestId};ts:${pieces.ts};`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(manifest)));
 const expected=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 let difference=0;for(let i=0;i<64;i++)difference|=expected.charCodeAt(i)^pieces.v1.toLowerCase().charCodeAt(i);
 return difference===0;
}
export interface RemotePayment {id: string;reference: string;amount: number;currency: string;status: string;}
import {deliverInvitations} from './invitation-delivery.ts';
import type {RpcDatabase, InvitationAuthPort} from './ports.ts';
export async function applyRemotePayment(db: RpcDatabase & Partial<InvitationAuthPort>,provider: string,p: RemotePayment,appUrl?:string) {
 if(!p.id || !p.reference || !Number.isFinite(p.amount) || p.amount<=0 || !p.currency) throw new Error('invalid_remote_payment');
 const {data,error}=await db.rpc('settle_verified_payment',{p_reference:p.reference,p_provider:provider,
  p_remote_id:p.id,p_amount:p.amount,p_currency:p.currency,p_status:p.status});
 if(error || !data?.success) throw new Error('payment_confirmation_failed');
 // Payment remains committed if mail is uncertain. The outbox is recoverable.
 if(appUrl && data.registration?.restaurant_id){
  try { if(!db.auth)throw new Error('invitation_auth_unavailable'); await deliverInvitations({rpc:db.rpc.bind(db),auth:db.auth},appUrl,data.registration.restaurant_id); }
  catch { console.error('invitation_reconciliation_required'); }
 }
 return data;
}
