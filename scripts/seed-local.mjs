import {spawnSync} from 'node:child_process';
import {localStatus} from './local-status.mjs';
const status=localStatus();
const result=spawnSync(process.execPath,['scripts/local-fixtures.mjs'],{
  env:{...process.env,VITE_TEST_SUPABASE_URL:status.API_URL,VITE_TEST_SUPABASE_ANON_KEY:status.ANON_KEY,LOCAL_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY},stdio:'inherit',
});
if(result.error)throw result.error;
process.exitCode=result.status??1;
