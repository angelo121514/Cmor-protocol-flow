BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path=public,extensions;
SELECT plan(7);
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
INSERT INTO public.inventory_items(id,restaurant_id,name,unit,current_stock)
 VALUES('aaaaaaaa-0000-4000-8000-000000000010','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Synthetic SQL stock','unidad',2);
INSERT INTO public.recipes(id,menu_item_id,restaurant_id)
 VALUES('aaaaaaaa-0000-4000-8000-000000000020','aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.recipe_ingredients(recipe_id,inventory_item_id,quantity_needed,unit)
 VALUES('aaaaaaaa-0000-4000-8000-000000000020','aaaaaaaa-0000-4000-8000-000000000010',5,'unidad');
INSERT INTO public.orders(id,restaurant_id,order_number,order_type,items,subtotal,tax,total,status,payment_status)
 VALUES('aaaaaaaa-0000-4000-8000-000000000030','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SQL-STOCK','counter',
 '[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":1}]',840,160,1000,'accepted','pending');
SELECT * FROM public._deduct_inventory_for_order_internal('aaaaaaaa-0000-4000-8000-000000000030');
SELECT is((SELECT current_stock::numeric FROM public.inventory_items WHERE id='aaaaaaaa-0000-4000-8000-000000000010'),0::numeric,'stock 2 consumption 5 clamps to 0');
SELECT is((SELECT quantity::numeric FROM public.inventory_movements WHERE reference_id='aaaaaaaa-0000-4000-8000-000000000030'),-2::numeric,'actual ledger deduction is -2');
SELECT is((SELECT shortage::numeric FROM public.inventory_movements WHERE reference_id='aaaaaaaa-0000-4000-8000-000000000030'),3::numeric,'shortage is 3');
SELECT * FROM public._deduct_inventory_for_order_internal('aaaaaaaa-0000-4000-8000-000000000030');
SELECT is((SELECT count(*) FROM public.inventory_movements WHERE reference_id='aaaaaaaa-0000-4000-8000-000000000030'),1::bigint,'replay adds no movement');
UPDATE public.inventory_items SET current_stock=0 WHERE id='aaaaaaaa-0000-4000-8000-000000000010';
INSERT INTO public.orders(id,restaurant_id,order_number,order_type,items,subtotal,tax,total,status,payment_status)
 VALUES('aaaaaaaa-0000-4000-8000-000000000031','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','SQL-STOCK-ZERO','counter',
 '[{"menu_item_id":"aaaaaaaa-0000-4000-8000-000000000001","quantity":1}]',840,160,1000,'accepted','pending');
SELECT * FROM public._deduct_inventory_for_order_internal('aaaaaaaa-0000-4000-8000-000000000031');
SELECT is((SELECT shortage::numeric FROM public.inventory_movements WHERE reference_id='aaaaaaaa-0000-4000-8000-000000000031'),5::numeric,'zero stock shortage retained');
SELECT * FROM public._deduct_inventory_for_order_internal('aaaaaaaa-0000-4000-8000-000000000031');
SELECT is((SELECT count(*) FROM public.inventory_deduction_claims WHERE order_id='aaaaaaaa-0000-4000-8000-000000000031'),1::bigint,'zero deduction still gets a unique claim');
SELECT throws_ok($$INSERT INTO public.recipes(menu_item_id,restaurant_id) VALUES('bbbbbbbb-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,'P0001','cross_restaurant_recipe','cross tenant recipe parent denied');
SELECT * FROM finish();
ROLLBACK;
