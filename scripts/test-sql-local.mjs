import {readdir,readFile} from 'node:fs/promises';
import {localSql} from './local-postgres.mjs';

// Execute actual pgTAP in the already running project database. No pg_prove
// helper image is pulled; incomplete TAP output is a failure, never a skip.
const directory='supabase/tests/database';
let assertions=0;
for(const file of (await readdir(directory)).filter(f=>f.endsWith('.test.sql')).sort()){
 const output=localSql(await readFile(`${directory}/${file}`,'utf8'));
 const lines=output.split(/\r?\n/).map(l=>l.trim());
 const plans=lines.filter(l=>/^1\.\.\d+$/.test(l));
 const results=lines.filter(l=>/^(?:not )?ok \d+\b/.test(l));
 const failed=results.filter(l=>l.startsWith('not ok'));
 if(plans.length!==1||results.length!==Number(plans[0].slice(3))||results.some((l,i)=>Number(l.match(/^(?:not )?ok (\d+)/)[1])!==i+1)||failed.length||lines.some(l=>/^Bail out!|^# Looks like/.test(l))){
  throw new Error(`pgTAP ${file}: incomplete or failed assertions. ${failed.join('; ')}`);
 }
 assertions+=results.length;
 console.log(`pgTAP ${file}: ${results.length} assertions passed.`);
}
if(assertions===0)throw new Error('SQL fixtures/tests missing.');
console.log(`Trusted PostgreSQL: ${assertions} assertions passed.`);
