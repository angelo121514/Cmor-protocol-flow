import {createClient} from '@supabase/supabase-js';
import {writeFile,mkdir} from 'node:fs/promises';
import {requireLocalUrl} from './local-only.mjs';
import {localSql} from './local-postgres.mjs';
const url=requireLocalUrl(process.env.VITE_TEST_SUPABASE_URL||'http://127.0.0.1:55421').href;
const key=process.env.LOCAL_SERVICE_ROLE_KEY,anon=process.env.VITE_TEST_SUPABASE_ANON_KEY;
if(!key||!anon)throw new Error('Local service/anon credentials are required. Fixtures cannot be skipped.');
const db=createClient(url,key,{auth:{persistSession:false}});
const check=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
// Seed through the isolated local PostgreSQL owner. The historical baseline
// does not declare backend table grants; the upgrade must fix those itself.
const literal=value=>value===null?'NULL':typeof value==='boolean'?String(value):typeof value==='number'?String(value):`'${(typeof value==='object'?JSON.stringify(value):String(value)).replaceAll("'","''")}'`;
function seed(table,row,conflict=['id']){
 const columns=Object.keys(row);
 if(![table,...columns,...conflict].every(name=>/^[a-z_]+$/.test(name)))throw new Error('Invalid synthetic fixture identifier.');
 const updates=columns.filter(c=>!conflict.includes(c)).map(c=>`"${c}"=EXCLUDED."${c}"`).join(',');
 localSql(`INSERT INTO public."${table}" (${columns.map(c=>`"${c}"`).join(',')}) VALUES (${columns.map(c=>literal(row[c])).join(',')}) ON CONFLICT (${conflict.map(c=>`"${c}"`).join(',')}) DO UPDATE SET ${updates};`);
}
const ids={A:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
const password='LocalFixture-Only-2026!';
const actors={};
for(const [name,role] of [['ownerA','owner'],['ownerB','owner'],['staff','staff'],['admin','admin']]){
 const email=`${name.toLowerCase()}@fixture.example.test`;
 const users=check(await db.auth.admin.listUsers({page:1,perPage:1000}));
 let user=users.users.find(u=>u.email===email);
 if(name==='admin'&&user){
  // Preserve audit/DSAR references when repeating a synthetic validation.
  // Replace only this fixture's factors rather than deleting its identity.
  const factors=check(await db.auth.admin.mfa.listFactors({userId:user.id}));
  for(const factor of factors.factors)check(await db.auth.admin.mfa.deleteFactor({userId:user.id,id:factor.id}));
 }
 if(!user)user=check(await db.auth.admin.createUser({email,password,email_confirm:true})).user;
 const profile={id:user.id,role,display_name:name,restaurant_id:role==='admin'?null:ids[name==='ownerB'?'B':'A']};
 actors[name]={id:user.id,email,password,profile};
}
for(const [label,id] of Object.entries(ids))seed('restaurants',{id,name:`Fixture ${label}`,slug:`fixture-${label.toLowerCase()}`,email:`owner${label.toLowerCase()}@fixture.example.test`,phone:"+56900000000",subscription_plan:'pro',status:'active',is_active:true,country:'CL',currency:'CLP',tax_rate:0.19});
for(const actor of Object.values(actors)){
 seed('profiles',actor.profile);
 if(actor.profile.restaurant_id)seed('profile_restaurants',{profile_id:actor.id,restaurant_id:actor.profile.restaurant_id,is_primary:true},['profile_id','restaurant_id']);
 delete actor.profile;
}
const menu={A:'aaaaaaaa-0000-4000-8000-000000000001',B:'bbbbbbbb-0000-4000-8000-000000000001'};
for(const label of ['A','B'])seed('menu_items',{id:menu[label],restaurant_id:ids[label],name:`Fixture dish ${label}`,base_price:1000,is_available:true,sizes:[],addons:[]});
const mfaClient=createClient(url,anon,{auth:{persistSession:false}});
check(await mfaClient.auth.signInWithPassword(actors.admin));
const enrollment=check(await mfaClient.auth.mfa.enroll({factorType:'totp',friendlyName:'Synthetic local admin'}));
actors.admin.mfa={id:enrollment.id,secret:enrollment.totp.secret};
const {fixtureTotp}=await import('./fixture-totp.mjs');
const verified=check(await mfaClient.auth.mfa.challengeAndVerify({factorId:enrollment.id,code:fixtureTotp(enrollment.totp.secret)}));
actors.admin.mfa.session={access_token:verified.access_token,refresh_token:verified.refresh_token};
await mkdir('.local-test',{recursive:true});
await writeFile('.local-test/fixtures.json',JSON.stringify({url,anon,actors,restaurants:ids,menu},null,2));
console.log('Synthetic local actors and restaurants prepared. Credentials remain in ignored .local-test/.');
