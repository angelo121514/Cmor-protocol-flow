import {readFileSync} from 'node:fs';
const url=new URL(process.env.VITE_TEST_SUPABASE_URL||'http://127.0.0.1:54321');
if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('External Supabase test URL rejected.');
if(!process.env.VITE_TEST_SUPABASE_ANON_KEY)throw new Error('Local credentials missing; critical tests must fail, not skip.');
const fixtures=JSON.parse(readFileSync('.local-test/fixtures.json','utf8'));
if(!fixtures.actors.ownerA || !fixtures.actors.ownerB || !fixtures.actors.admin)throw new Error('Synthetic actors missing.');
const original=globalThis.fetch;
globalThis.fetch=(input,init)=>{
 const target=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))return Promise.reject(new Error('External network rejected.'));
 return original(input,init);
};
