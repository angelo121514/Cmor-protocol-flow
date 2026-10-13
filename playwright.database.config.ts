import {defineConfig, devices} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {requireLocalUrl} from './scripts/local-only.mjs';

const fixture=JSON.parse(readFileSync('.local-test/fixtures.json','utf8'));
const api=requireLocalUrl(fixture.url,'Supabase fixture');
const base=requireLocalUrl(process.env.E2E_BASE_URL||'http://127.0.0.1:5173','Browser');
if(base.hostname!=='127.0.0.1'||base.port!=='5173')throw new Error('Trusted browser server requires 127.0.0.1:5173.');
if(!fixture.anon||!fixture.actors?.ownerA||!fixture.actors?.admin?.mfa?.secret)throw new Error('Authenticated browser fixtures are mandatory.');
export default defineConfig({
  testDir:'./src/tests/e2e',testMatch:'trusted-*.spec.ts',fullyParallel:false,
  workers:1,forbidOnly:!!process.env.CI,retries:0,timeout:90_000,
  reporter:[['list'],['html',{outputFolder:'playwright-database-report'}],['json',{outputFile:'.local-test/browser-database-results.json'}]],
  use:{baseURL:base.origin,trace:'off',video:'off',screenshot:'off'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],channel:process.env.LOCAL_BROWSER_CHANNEL}}],
  webServer:{
    command:'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    env:{VITE_SUPABASE_URL:api.origin,VITE_SUPABASE_ANON_KEY:fixture.anon,VITE_SENTRY_DSN:''},
    url:base.origin,reuseExistingServer:false,timeout:60_000,
  },
});
