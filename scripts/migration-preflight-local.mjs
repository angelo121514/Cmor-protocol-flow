import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {localSql} from './local-postgres.mjs';
export async function preflight(){
 const migration=readFileSync('supabase/migrations/20261006000024_canonical_money.sql','utf8');
 const validator=migration.slice(migration.indexOf('CREATE FUNCTION public.catalog_prices_valid'),migration.indexOf('REVOKE ALL ON FUNCTION public.catalog_prices_valid')).replace('public.catalog_prices_valid','pg_temp.catalog_prices_valid');
 const raw=localSql(`${validator}
SELECT jsonb_build_object(
 'duplicate_sessions',COALESCE((SELECT jsonb_agg(x) FROM (SELECT table_id,array_agg(id ORDER BY id) AS ids FROM public.table_sessions WHERE status IN ('active','payment_pending') GROUP BY table_id HAVING count(*)>1)x),'[]'),
 'duplicate_open_cash_shifts',COALESCE((SELECT jsonb_agg(x) FROM (SELECT restaurant_id,array_agg(id ORDER BY id) AS ids FROM public.cash_shifts WHERE status='open' GROUP BY restaurant_id HAVING count(*)>1)x),'[]'),
 'legacy_split_reconciliation',COALESCE((SELECT jsonb_agg(o.id) FROM public.orders o WHERE o.is_split AND o.payment_status='paid' AND o.status NOT IN ('cancelled','rejected') AND o.total IS DISTINCT FROM (SELECT sum(p.amount) FROM public.order_payments p WHERE p.order_id=o.id AND p.restaurant_id=o.restaurant_id AND p.payment_status='paid')),'[]'),
 'ambiguous_memberships',COALESCE((SELECT jsonb_agg(x) FROM (SELECT profile_id,count(*) AS memberships,count(*) FILTER(WHERE is_primary) AS primaries FROM public.profile_restaurants GROUP BY profile_id HAVING count(*)>5 OR count(*) FILTER(WHERE is_primary)>1)x),'[]'),
 'invalid_stock',COALESCE((SELECT jsonb_agg(id) FROM public.inventory_items WHERE current_stock<0 OR current_stock IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)),'[]'),
 'invalid_prices',COALESCE((SELECT jsonb_agg(id) FROM public.menu_items WHERE base_price<0 OR base_price IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)),'[]'),
 'invalid_catalog_precision_or_options',COALESCE((SELECT jsonb_agg(m.id ORDER BY m.id) FROM public.menu_items m JOIN public.restaurants r ON r.id=m.restaurant_id WHERE NOT pg_temp.catalog_prices_valid(m.base_price,m.sizes,m.addons,r.currency)),'[]'),
 'invalid_tax',COALESCE((SELECT jsonb_agg(id) FROM public.restaurants WHERE tax_rate<0 OR tax_rate>1),'[]'),
 'ambiguous_inventory_references',COALESCE((SELECT jsonb_agg(id) FROM public.inventory_movements WHERE movement_type='sale_deduction' AND (reference_id IS NULL OR reference_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')),'[]')
 );`);
 const report=JSON.parse(raw.slice(raw.indexOf('{')));await mkdir('.local-test',{recursive:true});await writeFile('.local-test/preflight.json',JSON.stringify(report,null,2));
 if(Object.values(report).some(rows=>rows.length))throw new Error('Ambiguous legacy data blocks migration. Review IDs in ignored .local-test/preflight.json; no rows were deleted.');
 return report;
}
if(process.argv[1]?.endsWith('migration-preflight-local.mjs')){await preflight();console.log('Local migration preflight passed; identifiers-only report written.');}
