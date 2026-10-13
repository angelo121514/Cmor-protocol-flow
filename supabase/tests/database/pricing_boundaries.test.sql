BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT plan(6);
-- Fail before planning a success if required synthetic fixtures are absent.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.menu_items WHERE id='aaaaaaaa-0000-4000-8000-000000000001') THEN
  RAISE EXCEPTION 'required_pricing_fixture_missing'; END IF;
END $$;
SELECT lives_ok($$SELECT public.price_order_items('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":100}]')$$,'quantity100 accepted');
SELECT throws_ok($$SELECT public.price_order_items('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":101}]')$$,'22023','invalid_quantity','quantity101 denied');
SELECT lives_ok($$SELECT public.price_order_items('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 (SELECT jsonb_agg(jsonb_build_object('menu_item_id','aaaaaaaa-0000-4000-8000-000000000001','quantity',1)) FROM generate_series(1,50)))$$,'lines50 accepted');
SELECT throws_ok($$SELECT public.price_order_items('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 (SELECT jsonb_agg(jsonb_build_object('menu_item_id','aaaaaaaa-0000-4000-8000-000000000001','quantity',1)) FROM generate_series(1,51)))$$,'22023','too_many_items','lines51 denied');
-- now() is stable within the transaction, so this checks equality rather than wall-clock timing.
UPDATE public.restaurants SET status='trial',subscription_plan='free_trial',trial_ends_at=now()
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT throws_ok($$SELECT public.price_order_items('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":1}]')$$,'22023','restaurant_not_active','trial denied at exact expiration');
UPDATE public.restaurants SET trial_ends_at=now()+interval '1 microsecond'
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT lives_ok($$SELECT public.price_order_items('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":1}]')$$,'trial accepted immediately before expiration');
SELECT * FROM finish();
ROLLBACK;
