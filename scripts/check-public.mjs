import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const violations=[];
const forbidden=/(^|\/)(node_modules|\.agents|\.zcode|\.codex|\.vercel|\.vercel|\.local-test|backups|coverage|dist|test-results|playwright-report)(\/|$)|(^|\/)\.mcp\.json$|(^|\/)\.env(?:\.|$)(?!example$)|\.(pem|key|p12|pfx|dump)$/;
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
 ['provider-token',/\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{25,}|sb_secret_[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16})\b/g],
 ['complete-jwt',/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g],
 ['personal-home-path',/(?:[A-Z]:[\\/]Users[\\/][^\s/\\<>]+|\/home\/[^\s/<>]+|\/Users\/[^\s/<>]+)/g],
];
for(const file of files){
 if(forbidden.test(file))violations.push(`${file}: forbidden public input`);
 const bytes=readFileSync(file);if(bytes.includes(0))continue;
 const body=bytes.toString('utf8');
 for(const [name,pattern] of rules)for(const match of body.matchAll(pattern))violations.push(`${file}:${body.slice(0,match.index).split('\n').length}: ${name}`);
}
if(violations.length){console.error(violations.join('\n'));process.exitCode=1;}
else console.log(`Public input guard PASS: ${files.length} tracked files. Complement this check with Gitleaks and contextual review.`);
