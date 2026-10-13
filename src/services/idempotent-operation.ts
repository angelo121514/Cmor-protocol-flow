// Keep the operation key across uncertain retries; clear only after persistence.
export async function operationKey(scope:string,body:unknown):Promise<string>{
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
 const fingerprint=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
 const slot=`operation:${scope}`;
 try{const prior=JSON.parse(sessionStorage.getItem(slot)||'null');if(prior?.fingerprint===fingerprint)return prior.key;}catch{ /* invalid previous draft */ }
 const key=crypto.randomUUID();sessionStorage.setItem(slot,JSON.stringify({key,fingerprint}));return key;
}
export function completeOperation(scope:string){sessionStorage.removeItem(`operation:${scope}`);}
