import {it,expect} from 'vitest';
import {actor,adminAal2,anonymous,service} from './fixtures';
import {localSql} from '../../../scripts/local-postgres.mjs';

it('requires real admin MFA, rejects revision races, validates timezone and purges only eligible DSAR artifacts',async()=>{
 const admin=await adminAal2(),owner=await actor('ownerA'),aal1=await actor('admin'),db=service();
 for(const caller of [anonymous(),owner,aal1,db])expect((await caller.rpc('get_operational_settings')).error).not.toBeNull();
 console.info("I19 authorization checked");
 const original=await admin.rpc('get_operational_settings');expect(original.error).toBeNull();const initial=original.data;
 const restaurant=crypto.randomUUID(),ids=Array.from({length:6},()=>crypto.randomUUID());
 try{
  const draft={...initial.config,privacy_owner:'Synthetic privacy operator',request_retention_days:1,request_purge_enabled:false,retention_policy_reference:'Synthetic policy',printer_test_confirmed:false};
  const edits=await Promise.all([1,2].map(()=>admin.rpc('save_operational_settings',{p_settings:draft,p_revision:initial.revision})));
  console.info("I19 concurrent revisions returned");
  expect(edits.filter(r=>!r.error)).toHaveLength(1);expect(edits.filter(r=>r.error?.code==='PT409')).toHaveLength(1);
  let current=(await admin.rpc('get_operational_settings')).data;
  expect((await admin.rpc('save_operational_settings',{p_settings:{...draft,unknown:true},p_revision:current.revision})).error).not.toBeNull();
  expect((await admin.rpc('save_operational_settings',{p_settings:{...draft,privacy_owner:'',request_purge_enabled:true},p_revision:current.revision})).error).not.toBeNull();
  expect((await admin.rpc('save_operational_settings',{p_settings:{...draft,printer_test_confirmed:true,printer_label:''},p_revision:current.revision})).error).not.toBeNull();
  console.info('I19 invalid settings checked');
  expect((await db.from('restaurants').insert({id:restaurant,name:'Timezone fixture',slug:restaurant,email:'timezone@fixture.example.test',phone:'+56900000000',subscription_plan:'pro',status:'active',country:'CL',currency:'CLP'})).error).toBeNull();
  expect((await owner.rpc('set_restaurant_report_timezone',{p_restaurant_id:restaurant,p_timezone:'America/Punta_Arenas'})).error).not.toBeNull();
  expect((await admin.rpc('set_restaurant_report_timezone',{p_restaurant_id:restaurant,p_timezone:'Invalid/Timezone'})).error).not.toBeNull();
  expect((await admin.rpc('set_restaurant_report_timezone',{p_restaurant_id:restaurant,p_timezone:'America/Punta_Arenas'})).error).toBeNull();
  expect((await admin.rpc('restaurant_sales_report',{p_restaurant_id:restaurant,p_days:1})).data?.timezone).toBe('America/Punta_Arenas');
  console.info('I19 timezone checked');
  const old=new Date(Date.now()-86400000*10).toISOString();
  expect((await db.from('data_subject_requests').insert(ids.map((id,i)=>({id,subject_email:`purge-${id}@fixture.example.test`,request_type:'access',status:i===4?'verified':'fulfilled',sla_due_at:new Date(Date.now()+86400000).toISOString(),created_at:old,updated_at:old,fulfilled_at:i===4?null:old,retention_hold:i===3})))).error).toBeNull();
  expect((await db.from('dsar_downloads').insert(ids.slice(0,3).map((id,i)=>({request_id:id,token_hash:crypto.randomUUID(),expires_at:new Date(Date.now()+(i===2?86400000:-86400000)).toISOString()})))).error).toBeNull();
  expect((await db.from('dsar_export_rows').insert(ids.slice(0,3).map(id=>({request_id:id,dataset:'fixture',record:{synthetic:true}})))).error).toBeNull();
  for(const caller of [anonymous(),owner,aal1,admin])expect((await caller.rpc('purge_dsar_artifacts',{p_limit:500})).error).not.toBeNull();
  console.info('I19 fixture and permissions checked');
  const first=await db.rpc('purge_dsar_artifacts',{p_limit:500});expect(first.error).toBeNull();expect(first.data).toMatchObject({snapshots:2,snapshot_rows:2,requests:0});
  expect((await db.from('dsar_export_rows').select('request_id').in('request_id',ids)).data).toEqual([{request_id:ids[2]}]);
  expect((await owner.rpc('set_dsar_retention_hold',{p_id:ids[5],p_hold:true})).error).not.toBeNull();
  expect((await admin.rpc('set_dsar_retention_hold',{p_id:ids[5],p_hold:true})).error).toBeNull();
  expect((await admin.rpc('save_operational_settings',{p_settings:{...draft,request_purge_enabled:true},p_revision:current.revision})).error).toBeNull();
  console.info('I19 purge enabled');
  const purged=await db.rpc('purge_dsar_artifacts',{p_limit:500});expect(purged.error).toBeNull();expect(purged.data.requests).toBe(2);
  const kept=await db.from('data_subject_requests').select('id').in('id',ids).order('id');expect(kept.error).toBeNull();expect(kept.data?.map(r=>r.id).sort()).toEqual(ids.slice(2).sort());
  expect(localSql("SELECT has_function_privilege('authenticated','cmor_internal.purge_dsar_artifacts(integer)','EXECUTE')")).toBe('f');
  expect(localSql("SELECT count(*) FROM cron.job WHERE jobname='dsar-artifact-purge' AND command='SELECT cmor_internal.purge_dsar_artifacts(500);'")).toBe('1');
  current=(await admin.rpc('get_operational_settings')).data;
 }finally{
  const latest=await admin.rpc('get_operational_settings');expect(latest.error).toBeNull();
  expect((await admin.rpc('save_operational_settings',{p_settings:{...initial.config,printer_test_confirmed:false},p_revision:latest.data.revision})).error).toBeNull();
  expect((await db.from('dsar_downloads').delete().in('request_id',ids)).error).toBeNull();
  expect((await db.from('data_subject_requests').delete().in('id',ids)).error).toBeNull();
  expect((await db.from('restaurants').delete().eq('id',restaurant)).error).toBeNull();
 }
},30000);
