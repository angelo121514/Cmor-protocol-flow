import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {requireLocalUrl} from './local-only.mjs';

export function localStatus() {
  const config=readFileSync('supabase/config.toml','utf8');
  if(!/^project_id\s*=\s*"cmor-flow-open-source-validation"/m.test(config))throw new Error('Disposable local project required.');
  let raw;
  try {
    raw=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
  } catch {throw new Error('Local Supabase unavailable. Start Docker and run npx supabase start.');}
  const status=JSON.parse(raw.slice(raw.indexOf('{')));
  const url=requireLocalUrl(status.API_URL);
  if(url.origin!=='http://127.0.0.1:55421')throw new Error('Unexpected local project port.');
  if(!status.ANON_KEY||!status.SERVICE_ROLE_KEY)throw new Error('Local legacy anon/service_role keys required.');
  return status;
}
