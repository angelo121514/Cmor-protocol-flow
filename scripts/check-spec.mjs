import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=resolve('.'),errors=[];
const required=['README.md','LICENSE','CONTRIBUTING.md','SECURITY.md','docs/INSTALLATION.md','docs/DEPLOYMENT.md','docs/CONFIGURATION.md','docs/OPEN_SOURCE_AUDIT.md','docs/spec/SPEC_INDEX.md'];
for(const file of required)if(!existsSync(file))errors.push(`Missing public document: ${file}`);
let count=0;
function visit(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','dist','coverage','playwright-report','playwright-database-report','test-results','.local-test'].includes(entry.name))continue;
  const file=resolve(dir,entry.name);
  if(entry.isDirectory()){visit(file);continue;}
  if(!entry.name.endsWith('.md'))continue;
  count++;
  const text=readFileSync(file,'utf8').replace(/```[\s\S]*?```/g,'');
  for(const match of text.matchAll(/\[[^\]\n]*\]\((<[^>]+>|[^)\n]+)\)/g)){
   let target=match[1].replace(/^<|>$/g,'');
   if(/^(https?:|app:|plugin:|mailto:|#)/.test(target))continue;
   target=decodeURIComponent(target.split('#')[0]).replace(/:\d+$/,'');
   if(target&&!existsSync(resolve(dirname(file),target)))errors.push(`Broken link: ${relative(root,file)} -> ${target}`);
  }
 }
}
visit(root);
const migrations=readdirSync('supabase/migrations').filter(file=>file.endsWith('.sql'));
if(new Set(migrations.map(file=>file.split('_')[0])).size!==migrations.length)errors.push('Duplicate migration version.');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Public documentation PASS: ${count} Markdown files, ${migrations.length} unique migration versions. No previous Git history is required.`);
