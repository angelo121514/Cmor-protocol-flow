BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT plan(10);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.menu_items WHERE id='aaaaaaaa-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'required_money_fixture_missing'; END IF;
END $$;
SELECT ok(NOT public.catalog_prices_valid(10.5,'[]','[]','CLP'),'CLP rejects fractional catalog values');
SELECT ok(public.catalog_prices_valid(10.01,'[]','[]','BRL'),'BRL preserves canonical gross cents');
SELECT ok(NOT public.catalog_prices_valid(10.001,'[]','[]','BRL'),'BRL rejects excess precision');
SELECT ok(NOT public.catalog_prices_valid(10,'[{"name":"same","price":1},{"name":"same","price":2}]','[]','CLP'),'ambiguous sizes rejected');
SELECT ok(NOT public.catalog_prices_valid(10,'[]','[{"name":"extra","price":"1"}]','CLP'),'malformed price type rejected');
SELECT ok(NOT public.catalog_prices_valid('NaN','[]','[]','CLP'),'nonfinite catalog rejected');
SELECT throws_ok($$UPDATE public.menu_items SET sizes='[{"name":"extra","price":0.5}]' WHERE id='aaaaaaaa-0000-4000-8000-000000000001'$$,'22023','invalid_catalog_price_or_precision','trusted write guard rejects fractional CLP options');
-- A separate synthetic restaurant avoids changing the currency of existing transactions.
INSERT INTO public.restaurants(id,name,slug,email,phone,subscription_plan,status,is_active,country,currency,tax_rate)
VALUES('cccccccc-1111-4111-8111-111111111111','Synthetic money','synthetic-money-boundary','money@fixture.example.test','+56900000000','pro','active',true,'BR','BRL',0);
INSERT INTO public.menu_items(id,restaurant_id,name,base_price,is_available,sizes,addons)
VALUES('cccccccc-2222-4222-8222-222222222222','cccccccc-1111-4111-8111-111111111111','Synthetic cents',0.1,true,'[]','[{"name":"extra","price":0.2}]');
SELECT is((public.price_order_items('cccccccc-1111-4111-8111-111111111111','[{"menu_item_id":"cccccccc-2222-4222-8222-222222222222","quantity":3,"selected_addons":[{"name":"extra"}]}]')->>'total')::numeric,0.90::numeric,'SQL prices three canonical cent lines exactly');
INSERT INTO public.orders(order_number,order_type,restaurant_id,items,subtotal,tax,total,status,payment_status)
VALUES('synthetic-money-order','counter','cccccccc-1111-4111-8111-111111111111','[{"menu_item_id":"cccccccc-2222-4222-8222-222222222222","quantity":3}]',0.90,0,0.90,'accepted','pending');
SELECT is((SELECT currency FROM public.orders WHERE restaurant_id='cccccccc-1111-4111-8111-111111111111'),'BRL','new order captures its actual catalog currency');
SELECT throws_ok($$UPDATE public.restaurants SET currency='USD' WHERE id='cccccccc-1111-4111-8111-111111111111'$$,'22023','currency_change_requires_reconciliation','existing amounts cannot be implicitly reinterpreted in a new currency');
SELECT * FROM finish();
ROLLBACK;
