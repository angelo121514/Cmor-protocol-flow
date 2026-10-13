import {it,expect,vi} from 'vitest';
import {spawn,execFileSync} from 'node:child_process';
import {localSql} from '../../../scripts/local-postgres.mjs';
import {fixture,service} from './fixtures';

function session(){
 localSql('SELECT 1'); // Verifies the exclusive disposable project before opening a connection.
 const name=execFileSync('docker',['ps','--filter','name=^/supabase_db_cmor-flow-open-source-validation$','--format','{{.Names}}'],{encoding:'utf8'}).trim();
 if(name!=='supabase_db_cmor-flow-open-source-validation')throw new Error('Exclusive local database required.');
 const child=spawn('docker',['exec','-i',name,'psql','-U','postgres','-d','postgres','-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],{stdio:['pipe','pipe','pipe']});
 let output='',errors='',pending:{marker:string;resolve:(value:string)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}|undefined;
 child.stdout.on('data',chunk=>{output+=String(chunk);if(pending&&output.includes(pending.marker)){const p=pending;pending=undefined;clearTimeout(p.timer);const value=output.slice(0,output.indexOf(p.marker));output='';p.resolve(value.trim());}});
 child.stderr.on('data',chunk=>{errors+=String(chunk);});
 child.on('exit',()=>{if(pending){clearTimeout(pending.timer);pending.reject(new Error(errors||'SQL session exited'));pending=undefined;}});
 return {run(sql:string){if(pending)throw new Error('Concurrent commands on one connection are forbidden.');return new Promise<string>((resolve,reject)=>{const marker='MARK_'+crypto.randomUUID().replaceAll('-','');const timer=setTimeout(()=>{child.kill();reject(new Error('SQL session deadline exceeded'));},20000);pending={marker,resolve,reject,timer};child.stdin.write(sql+';\n\\echo '+marker+'\n');});},close(){child.stdin.end('ROLLBACK;\n');child.kill();}};
}

for(const first of ['order','currency'] as const)it(`serializes ${first} first against concurrent currency/order capture`,async()=>{
 const db=service(),id=crypto.randomUUID(),menu=crypto.randomUUID(),tag='currency_'+crypto.randomUUID().replaceAll('-','');
 expect((await db.from('restaurants').insert({id,name:'Currency lock fixture',slug:id,email:'currency@fixture.example.test',phone:'+56900000000',status:'active',subscription_plan:'pro',country:'CL',currency:'CLP',is_active:true})).error).toBeNull();
 expect((await db.from('profile_restaurants').insert({profile_id:fixture.actors.ownerA.id,restaurant_id:id,is_primary:false})).error).toBeNull();
 expect((await db.from('menu_items').insert({id:menu,restaurant_id:id,name:'Currency fixture',base_price:1000,is_available:true})).error).toBeNull();
 const a=session(),b=session(),items=JSON.stringify([{menu_item_id:menu,quantity:1}]);
 const claims=JSON.stringify({sub:fixture.actors.ownerA.id,role:'authenticated',aal:'aal1'});
 const order=`SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims','${claims}',true); SELECT public.write_pos_order('${id}','{"items":${items},"payment_status":"pending","order_type":"counter"}'::jsonb,'${crypto.randomUUID()}',NULL)`;
 try{
  await a.run('BEGIN');await b.run(`BEGIN; SET LOCAL application_name='${tag}'`);
  if(first==='order'){
   await a.run(`SELECT public.price_order_items('${id}','${items}'::jsonb)`);
   const changing=b.run(`UPDATE public.restaurants SET currency='USD' WHERE id='${id}'; COMMIT`).then(data=>({data,error:null}),error=>({data:null,error}));
   await vi.waitFor(()=>expect(localSql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${tag}' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0)`)).toBe('t'),{timeout:15000,interval:100});
   await a.run(order+'; COMMIT');
   const changed=await changing;expect(String(changed.error)).toContain('currency_change_requires_reconciliation');
  }else{
   await a.run(`UPDATE public.restaurants SET currency='USD' WHERE id='${id}'`);
   const creating=b.run(order+'; COMMIT');
   await vi.waitFor(()=>expect(localSql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${tag}' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0)`)).toBe('t'),{timeout:15000,interval:100});
   await a.run('COMMIT');await creating;
  }
  const orders=await db.from('orders').select('currency,total').eq('restaurant_id',id);expect(orders.error).toBeNull();expect(orders.data).toEqual([{currency:first==='order'?'CLP':'USD',total:1000}]);
  expect((await db.from('restaurants').select('currency').eq('id',id).single()).data?.currency).toBe(first==='order'?'CLP':'USD');
 }finally{
  a.close();b.close();
  expect((await db.from('order_operations').delete().eq('restaurant_id',id)).error).toBeNull();
  expect((await db.from('orders').delete().eq('restaurant_id',id)).error).toBeNull();
  expect((await db.from('restaurants').delete().eq('id',id)).error).toBeNull();
 }
},45000);
