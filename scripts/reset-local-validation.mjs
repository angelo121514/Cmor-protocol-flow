import {execFileSync,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {localSql} from './local-postgres.mjs';
import {requireLocalUrl} from './local-only.mjs';

const config=readFileSync('supabase/config.toml','utf8');
if(!/^project_id\s*=\s*"cmor-flow-open-source-validation"/m.test(config))throw new Error('Reset restricted to the disposable CMOR validation project.');
if(existsSync('.local-test/validation.lock')){
 const pid=Number(readFileSync('.local-test/validation.lock','utf8'));
 if(!Number.isSafeInteger(pid)||pid<=0)throw new Error('Invalid validation lock.');
 try{process.kill(pid,0);throw new Error('Cannot reset while local validation is running.');}catch(error){if(error.code!=='ESRCH')throw error;}
}
const baseline=process.argv.slice(2);
if(baseline.some(a=>a!=='--baseline'))throw new Error('Only --baseline is supported.');
await mkdir('.local-test',{recursive:true});
const label=baseline.length?'baseline':'clean';
const cli=['node_modules/supabase/dist/supabase.js'];
const env={...process.env,SUPABASE_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1'};
// Disable the scheduler before recreating baseline cron rows. Disabling jobs
// only after reset would leave an interval where historical jobs could run.
localSql('ALTER SYSTEM SET cron.launch_active_jobs = off;',{role:'supabase_admin'});
localSql('SELECT pg_reload_conf();',{role:'supabase_admin'});
if(localSql("SELECT setting FROM pg_settings WHERE name='cron.launch_active_jobs';",{role:'supabase_admin'})!=='off')throw new Error('Local cron scheduler must be disabled before reset.');
// Prevent the running Realtime seed from racing the CLI schema initializer.
const realtime='supabase_realtime_cmor-flow-open-source-validation';
const running=execFileSync('docker',['ps','--filter',`name=^/${realtime}$`,'--format','{{.Names}}'],{encoding:'utf8'}).trim();
if(running===realtime)execFileSync('docker',['stop',realtime],{stdio:'pipe'});
let healthRecovery=false;
const reset=spawnSync(process.execPath,[...cli,'db','reset','--local',...(baseline.length?['--version','20260906000001']:[])],{env,encoding:'utf8',stdio:'pipe'});
const output=String(reset.stdout||'')+String(reset.stderr||'');
if(reset.status!==0){
 await writeFile(`.local-test/${label}-install.log`,output);
 // Cold Storage startup can outlast the CLI's first health check. A normal
 // subsequent start must pass; no ignore-health-check or skipped service.
 if(!output.includes('container is not ready: unhealthy')||output.includes('ERROR:'))throw new Error(`${label} migration failed; inspect the ignored local installation log.`);
 execFileSync(process.execPath,[...cli,'start','--exclude','logflare,vector,studio,postgres-meta,imgproxy,supavisor'],{env,stdio:'pipe'});
 healthRecovery=true;
}
await writeFile(`.local-test/${label}-install.log`,output);
const count=Number(localSql('SELECT count(*) FROM supabase_migrations.schema_migrations;'));
const required=baseline.length?89:(await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).length;
if(count!==required)throw new Error(`Migration count mismatch: expected ${required}, found ${count}.`);
// Every reset starts with external cron disabled, including the old baseline.
localSql('UPDATE cron.job SET active=false;',{role:'supabase_admin'});
// Reset recreates Auth/Storage containers. Kong may retain their old upstream
// addresses; restart only this disposable project's gateway before probing.
const gateway='supabase_kong_cmor-flow-open-source-validation';
const gatewayRunning=execFileSync('docker',['ps','--filter',`name=^/${gateway}$`,'--format','{{.Names}}'],{encoding:'utf8'}).trim();
if(gatewayRunning!==gateway)throw new Error('Owned local gateway unavailable after reset.');
execFileSync('docker',['restart',gateway],{stdio:'pipe'});
// A healthy container can still be replacing its database pool after reset.
// Require the actual read-only Auth admin operation used by fixture setup.
const statusRaw=execFileSync(process.execPath,[...cli,'status','--output','json'],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const status=JSON.parse(statusRaw.slice(statusRaw.indexOf('{')));
const authOrigin=requireLocalUrl(status.API_URL).origin;
const authDeadline=Date.now()+30000;
while(true){
 let ready=false;
 try{
  const response=await fetch(`${authOrigin}/auth/v1/admin/users?page=1&per_page=1`,{headers:{apikey:status.SERVICE_ROLE_KEY,authorization:`Bearer ${status.SERVICE_ROLE_KEY}`},signal:AbortSignal.timeout(3000)});
  const body=await response.json();ready=response.ok&&Array.isArray(body.users);
 }catch{ /* Only a successful real read establishes readiness. */ }
 if(ready)break;
 if(Date.now()>=authDeadline)throw new Error('Local Auth admin read unavailable after reset; fixtures must not run.');
 await new Promise(resolve=>setTimeout(resolve,500));
}
await writeFile(`.local-test/${label}-installation.json`,JSON.stringify({kind:label,migrations:count,healthRecovery,validatedAt:new Date().toISOString()},null,2));
console.log(`${label} installation passed: ${count} migrations, required runtime healthy${healthRecovery?' after a normal startup retry':''}.`);
