export function takeVerificationToken(location: Pick<Location, 'hash' | 'search' | 'pathname'>): string {
 return new URLSearchParams(location.hash.slice(1)).get('token') || new URLSearchParams(location.search).get('token') ||
  (location.pathname.startsWith('/verify-dsar/') ? location.pathname.split('/')[2] : '');
}
export interface DownloadRecovery {requestId:string;download_token:string;createdAt:number;}
const key='cmor:dsar:download-recovery';
export function readDownloadRecovery():DownloadRecovery|null {
 try {const value=JSON.parse(sessionStorage.getItem(key)??'null');return value&&typeof value.requestId==='string'&&/^[a-f0-9]{64}$/.test(value.download_token)&&Date.now()-value.createdAt<86400000?value:null;}
 catch{return null;}
}
export function saveDownloadRecovery(value:DownloadRecovery|null):void {
 try {if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}
 catch{/* SQL recovery remains available in memory if browser storage is unavailable. */}
}
