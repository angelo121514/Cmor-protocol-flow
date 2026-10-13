import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {requireLocalUrl} from './local-only.mjs';
import {localSql} from './local-postgres.mjs';
import {preflight} from './migration-preflight-local.mjs';
const raw=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','status','--output','json'],{encoding:'utf8'});
const status=JSON.parse(raw.slice(raw.indexOf('{')));requireLocalUrl(status.API_URL);
const env={...process.env,VITE_TEST_SUPABASE_URL:status.API_URL,VITE_TEST_SUPABASE_ANON_KEY:status.ANON_KEY,LOCAL_SERVICE_ROLE_KEY:status.SERVICE_ROLE_KEY};
execFileSync(process.execPath,['scripts/local-fixtures.mjs'],{env,stdio:'inherit'});
// Disable local cron jobs before inserting any provider/accounting fixtures.
// The baseline cron dispatch has no effect without accounting credentials.
localSql('UPDATE cron.job SET active=false;',{role:'supabase_admin'});
const restaurant='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',order=randomUUID(),stock=randomUUID(),request=randomUUID();
const token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
// Baseline table ACLs are deliberately left untouched. Only generated UUIDs
// and hexadecimal capabilities are interpolated into this local owner seed.
localSql(`BEGIN;
INSERT INTO public.data_subject_requests(id,request_type,subject_email,verification_token,status,token_expires_at,sla_due_at)
 VALUES('${request}','access','legacy@fixture.example.test','${token}','pending',now()+interval '24 hours',now()+interval '30 days');
INSERT INTO public.inventory_items(id,restaurant_id,name,unit,current_stock)
 VALUES('${stock}','${restaurant}','Synthetic historical stock','unidad',2);
INSERT INTO public.orders(id,restaurant_id,order_number,order_type,items,total,subtotal,tax,status,payment_status)
 VALUES('${order}','${restaurant}','LEGACY-${order}','counter','[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":1}]',1000,840,160,'completed','paid');
INSERT INTO public.inventory_movements(inventory_item_id,restaurant_id,movement_type,quantity,reference_id,notes)
 VALUES('${stock}','${restaurant}','sale_deduction',-2,'${order}','Synthetic historical deduction');
COMMIT;`);
await mkdir('.local-test',{recursive:true});
await writeFile('.local-test/upgrade.json',JSON.stringify({request,hash:createHash('sha256').update(token).digest('hex'),order,stock}));
// IDs only: no subject identifiers or plaintext capabilities in the report.
await preflight();
console.log('Historical synthetic DSAR token and stock deduction fixtures prepared. Capabilities are not printed.');
