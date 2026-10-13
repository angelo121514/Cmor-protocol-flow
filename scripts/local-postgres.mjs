import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {requireLocalUrl} from './local-only.mjs';
export function localSql(sql,{role='postgres'}={}){
 requireLocalUrl(process.env.VITE_TEST_SUPABASE_URL||'http://127.0.0.1:55421');
 const project=readFileSync('supabase/config.toml','utf8').match(/^project_id\s*=\s*"([a-zA-Z0-9_-]+)"/m)?.[1];
 if(!project)throw new Error('Local project identifier missing.');
 if(project!=='cmor-flow-open-source-validation')throw new Error('Synthetic SQL is restricted to the disposable validation project.');
 if(!['postgres','supabase_admin'].includes(role))throw new Error('Unsupported local PostgreSQL role.');
 const containers=execFileSync('docker',['ps','--filter',`name=supabase_db_${project}`,'--format','{{.ID}}'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 if(containers.length!==1)throw new Error('Exactly one matching local database container is required.');
 return execFileSync('docker',['exec','-i',containers[0],'psql','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1','-X','-A','-t'],{input:sql,encoding:'utf8'}).trim();
}
