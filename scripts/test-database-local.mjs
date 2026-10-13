import {execFileSync,spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {openSync,readFileSync,unlinkSync,writeFileSync,closeSync} from 'node:fs';
import {mockProviders} from './mock-providers.mjs';
import {requireLocalUrl} from './local-only.mjs';
import {build} from 'rolldown';
import {randomBytes} from 'node:crypto';
const configuredUrl=process.env.VITE_TEST_SUPABASE_URL?requireLocalUrl(process.env.VITE_TEST_SUPABASE_URL):null;
await mkdir('.local-test',{recursive:true});
const lock='.local-test/validation.lock',children=new Set(),ownedGroups=new WeakSet();
try{
 const previous=Number(readFileSync(lock,'utf8'));
 if(!Number.isSafeInteger(previous)||previous<=0)throw new Error('Invalid validation lock; inspect it locally.');
 let alive=true;try{process.kill(previous,0);}catch(error){if(error.code==='ESRCH')alive=false;else throw error;}
 if(alive)throw new Error('Another local validation is running; concurrent fixtures are forbidden.');
 unlinkSync(lock);
}catch(error){if(error.code!=='ENOENT')throw error;}
const descriptor=openSync(lock,'wx');writeFileSync(descriptor,String(process.pid));closeSync(descriptor);
function terminate(child){
 // On POSIX the npm CLI wrapper has its own compiled child. Killing only the
 // wrapper leaves its stdout pipes alive and prevents successful runs exiting.
 // Only helpers spawned below with their own process group enter this set.
 if(ownedGroups.has(child)){
  ownedGroups.delete(child);
  try{process.kill(-child.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw new Error('Owned validation helper group could not be terminated.');}
  return;
 }
 if(child.exitCode!==null)return;
 if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'pipe'});}catch{}}
 else child.kill('SIGTERM');
}
process.on('exit',()=>{for(const child of children)terminate(child);try{unlinkSync(lock);}catch{}});
process.on('SIGINT',()=>process.exit(130));process.on('SIGTERM',()=>process.exit(143));
// No remote fallback and no implicit reset of a database.
try{execFileSync('docker',['version','--format','{{.Server.Version}}'],{stdio:'pipe',timeout:30000});}catch{throw new Error('Docker engine unavailable or unresponsive for 30 seconds. SQL/Edge/PostgREST certification is BLOCKED.');}
const cli=['node_modules/supabase/dist/supabase.js'];
const raw=execFileSync(process.execPath,[...cli,'status','--output','json'],{encoding:'utf8'});
const status=JSON.parse(raw.slice(raw.indexOf('{')));
requireLocalUrl(status.API_URL);
if(new URL(status.API_URL).origin!==new URL(configuredUrl||status.API_URL).origin)throw new Error('Configured local URL does not match running Supabase.');
const env={...process.env,VITE_TEST_SUPABASE_URL:status.API_URL,VITE_TEST_SUPABASE_ANON_KEY:status.ANON_KEY,LOCAL_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY};
execFileSync(process.execPath,['scripts/local-fixtures.mjs'],{env,stdio:'inherit'});
execFileSync(process.execPath,['scripts/test-sql-local.mjs'],{env,stdio:'inherit'});
let mockHost='host.docker.internal';
if(process.platform!=='win32'&&process.platform!=='darwin'){
 const networks=execFileSync('docker',['network','ls','--format','{{.Name}}'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(n=>n.startsWith('supabase_network_'));
 if(networks.length!==1)throw new Error('Exactly one local Supabase network is required.');
 const network=JSON.parse(execFileSync('docker',['network','inspect',networks[0]],{encoding:'utf8'}))[0];mockHost=network.IPAM.Config[0].Gateway;
 if(!/^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/.test(mockHost))throw new Error('Local Docker gateway is not supported.');
}
const origin=`http://${mockHost}:58080`;
const inspectorSecret=randomBytes(32).toString('hex');
const python=process.env.PYTHON||'python';
// Fail closed: actual antivirus signatures and its EICAR verdict are prerequisites.
execFileSync(python,['-m','unittest','discover','-s','services/image-inspector','-p','test_*.py'],{stdio:'inherit',timeout:120000});
const inspector=spawn(python,['services/image-inspector/inspector.py'],{env:{...process.env,IMAGE_INSPECTION_SECRET:inspectorSecret,IMAGE_INSPECTION_BIND:'0.0.0.0'},stdio:'ignore',detached:process.platform!=='win32'});
children.add(inspector);if(process.platform!=='win32')ownedGroups.add(inspector);
let inspectionReady=false;
for(let attempt=0;attempt<30;attempt++){
 if(inspector.exitCode!==null)throw new Error('Private image inspector failed to start.');
 try{const response=await fetch('http://127.0.0.1:58081/health',{signal:AbortSignal.timeout(2000)});if(response.ok){inspectionReady=true;break;}}catch{}
 await new Promise(resolve=>setTimeout(resolve,500));
}
if(!inspectionReady)throw new Error('Private image inspector unavailable; no bypass is allowed.');
await mkdir('.local-test',{recursive:true});
await writeFile('.local-test/edge.env',[
 'LOCAL_TEST_ONLY=true',`LOCAL_MOCK_PROVIDER_ORIGIN=${origin}`,`PUBLIC_SUPABASE_URL=${status.API_URL}`,'APP_URL=http://localhost:5173','PUBLIC_APP_URL=http://localhost:5173',
 `IMAGE_INSPECTION_URL=http://${mockHost}:58081`,`IMAGE_INSPECTION_SECRET=${inspectorSecret}`,
 'FLOW_API_KEY=synthetic','FLOW_SECRET_KEY=synthetic',`FLOW_API_URL=${origin}/flow`,
 'MERCADO_PAGO_ACCESS_TOKEN=synthetic','MERCADO_PAGO_WEBHOOK_SECRET=synthetic',`MERCADO_PAGO_API_URL=${origin}/mp`,
 'WEBPAY_COMMERCE_CODE=synthetic','WEBPAY_API_KEY=synthetic',`WEBPAY_API_URL=${origin}/webpay`,
 'RESEND_API_KEY=synthetic','DSAR_FROM_EMAIL=fixtures@fixture.example.test',`RESEND_API_URL=${origin}/mail/emails`,
 'INTERNAL_FUNCTION_SECRET=synthetic-internal','ACCOUNTING_MASTER_KEY=synthetic-local-accounting-only',`TAX_API_BASE_URL=${origin}/tax`,
 ].join('\n')+'\n');
// Bundle the already installed SDK: Edge tests never fetch esm.sh dependencies.
await mkdir('supabase/functions/.local-test',{recursive:true});
await build({input:'node_modules/@supabase/supabase-js/dist/module/index.js',platform:'browser',output:{file:'supabase/functions/.local-test/supabase.mjs',format:'esm'}});
await writeFile('supabase/functions/.local-test/import-map.json',JSON.stringify({imports:{'https://esm.sh/@supabase/supabase-js@2.86.0':'./supabase.mjs'}}));
const server=await mockProviders();
const edge=spawn(process.execPath,[...cli,'functions','serve','--env-file','.local-test/edge.env','--import-map','supabase/functions/.local-test/import-map.json'],{env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
children.add(edge);if(process.platform!=='win32')ownedGroups.add(edge);
// Wait for this CLI invocation, not the still responding previous runtime.
// Never echo diagnostics: Auth output can contain capabilities.
let serving=false,runtimeTail='';
const observe=chunk=>{runtimeTail=(runtimeTail+chunk.toString()).slice(-4096);if(/Serving functions on/i.test(runtimeTail))serving=true;};
edge.stdout.on('data',observe);edge.stderr.on('data',observe);
try{
 let ready=false;
 const deadline=Date.now()+120000;
 while(Date.now()<deadline){
  if(edge.exitCode!==null)throw new Error('Local Edge runtime unavailable; inspect local runtime manually.');
  if(!serving){await new Promise(resolve=>setTimeout(resolve,250));continue;}
  try{const response=await fetch(`${status.API_URL}/functions/v1/ai-recommendations`,{method:'POST',headers:{apikey:status.ANON_KEY},signal:AbortSignal.timeout(10000)});if((await response.text()).includes('ai_disabled')){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(!ready)throw new Error('Local Edge runtime did not become ready; no external fallback is allowed.');
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run','--config','vitest.database.config.ts','--reporter=default','--reporter=json','--outputFile=.local-test/database-results.json'],{env,stdio:'inherit'});
  children.add(child);
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Trusted database/Edge tests failed.')));
 });
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.database.config.ts'],{env,stdio:'inherit'});
  children.add(child);
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Authenticated local browser tests failed.')));
 });
}finally{terminate(edge);terminate(inspector);await new Promise(resolve=>server.close(resolve));}
