import {readFileSync} from 'node:fs';
import {fixtureTotp} from './fixture-totp.mjs';
import {requireLocalUrl} from './local-only.mjs';
const fixture=JSON.parse(readFileSync('.local-test/fixtures.json','utf8'));
requireLocalUrl(fixture.url);
if(fixture.actors.admin.email!=='admin@fixture.example.test')throw new Error('Synthetic admin required.');
console.log('Synthetic local admin TOTP:',fixtureTotp(fixture.actors.admin.mfa.secret));
