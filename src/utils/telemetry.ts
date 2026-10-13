const sensitiveKey = /password|secret|token|pin|authorization|cookie|email|phone|customer.?name|receipt|totp|payload|download/i;
export const sensitiveRoute = (path:string) => /\/(verify-dsar|mesa|setup-password|login)(\/|$)|\/security\/mfa/.test(path);
export function redactText(text:string):string {
 return text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'[email redacted]')
  .replace(/((?:access_token|refresh_token|token|receipt|download_token|password|secret)=)[^&#\s]*/gi,'$1[REDACTED]')
  .replace(/Bearer\s+[^\s]+/gi,'Bearer [REDACTED]')
  .replace(/(\/(?:mesa|verify-dsar)\/)[^\s?#/]+/gi,'$1[REDACTED]');
}
export function redactTelemetry<T>(value:T):T {
 const walk=(item:unknown,depth:number):unknown=>{
  if(depth>10)return '[depth redacted]';
  if(typeof item==='string')return redactText(item);
  if(Array.isArray(item))return item.map(entry=>walk(entry,depth+1));
  if(item instanceof Error)return {name:item.name,message:redactText(item.message)};
  if(item&&typeof item==='object')return Object.fromEntries(Object.entries(item).map(([key,entry])=>[key,sensitiveKey.test(key)?'[REDACTED]':walk(entry,depth+1)]));
  return item;
 };
 return walk(value,0) as T;
}
