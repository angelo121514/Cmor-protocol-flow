import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
export const fixture=JSON.parse(readFileSync('.local-test/fixtures.json','utf8'));
export const anonymous=()=>createClient(fixture.url,fixture.anon,{auth:{persistSession:false}});
export async function actor(name:string){
 const client=anonymous(),credentials=fixture.actors[name];
 if(!credentials)throw new Error('Actor fixture missing');
 const {data,error}=await client.auth.signInWithPassword({email:credentials.email,password:credentials.password});
 if(error || !data.session)throw new Error('Local actor authentication failed');
 return client;
}

export const service=()=>{if(!process.env.LOCAL_SERVICE_ROLE_KEY)throw new Error('Local service fixture missing');return createClient(fixture.url,process.env.LOCAL_SERVICE_ROLE_KEY,{auth:{persistSession:false}});};
export async function adminAal2(){const client=anonymous();const r=await client.auth.setSession(fixture.actors.admin.mfa.session);if(r.error||!r.data.session)throw new Error('Verified MFA fixture missing');return client;}
