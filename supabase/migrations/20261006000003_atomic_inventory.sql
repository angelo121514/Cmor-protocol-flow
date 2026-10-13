BEGIN;
ALTER TABLE public.inventory_movements ADD COLUMN requested_quantity numeric(12,3);
ALTER TABLE public.inventory_movements ADD COLUMN shortage numeric(12,3) NOT NULL DEFAULT 0 CHECK(shortage>=0);
ALTER TABLE public.inventory_movements ADD COLUMN stock_before numeric(12,3);
ALTER TABLE public.inventory_movements ADD COLUMN stock_after numeric(12,3);
CREATE TABLE public.inventory_deduction_claims(order_id uuid PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.inventory_deduction_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_deduction_claims FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.inventory_movements WHERE movement_type='sale_deduction' AND
  (reference_id IS NULL OR reference_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')) THEN
  RAISE EXCEPTION 'ambiguous_inventory_references_require_reconciliation'; END IF;
END $$;
-- Preserve historical deductions; do not recalculate historical movements.
INSERT INTO public.inventory_deduction_claims(order_id)
SELECT DISTINCT reference_id::uuid FROM public.inventory_movements
WHERE movement_type='sale_deduction' AND reference_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_deduction_claims(order_id) SELECT id FROM public.orders WHERE status='completed' ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.save_recipe(p_menu_item_id uuid,p_restaurant_id uuid,p_ingredients jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; i jsonb;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.menu_items WHERE id=p_menu_item_id AND restaurant_id=p_restaurant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_menu_item' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_ingredients)<>'array' OR jsonb_array_length(p_ingredients)>100 THEN
    RAISE EXCEPTION 'invalid_ingredients' USING ERRCODE='22023'; END IF;
  FOR i IN SELECT jsonb_array_elements(p_ingredients) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.inventory_items WHERE id=(i->>'inventory_item_id')::uuid
      AND restaurant_id=p_restaurant_id AND unit=i->>'unit') OR (i->>'quantity_needed')::numeric<=0
      OR i->>'quantity_needed' IS NULL THEN RAISE EXCEPTION 'invalid_ingredient' USING ERRCODE='22023'; END IF;
  END LOOP;
  INSERT INTO public.recipes(menu_item_id,restaurant_id) VALUES(p_menu_item_id,p_restaurant_id)
    ON CONFLICT(menu_item_id) DO UPDATE SET updated_at=now() RETURNING id INTO v_id;
  DELETE FROM public.recipe_ingredients WHERE recipe_id=v_id;
  INSERT INTO public.recipe_ingredients(recipe_id,inventory_item_id,quantity_needed,unit)
    SELECT v_id,(x->>'inventory_item_id')::uuid,(x->>'quantity_needed')::numeric,x->>'unit'
    FROM jsonb_array_elements(p_ingredients) x;
  RETURN jsonb_build_object('id',v_id,'menu_item_id',p_menu_item_id,'restaurant_id',p_restaurant_id,'ingredients',p_ingredients);
END;
$$;
REVOKE ALL ON FUNCTION public.save_recipe(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_recipe(uuid,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_recipe_tenant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recipes r JOIN public.inventory_items i ON i.restaurant_id=r.restaurant_id
    WHERE r.id=NEW.recipe_id AND i.id=NEW.inventory_item_id AND i.unit=NEW.unit) THEN
    RAISE EXCEPTION 'cross_restaurant_ingredient' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER recipe_tenant BEFORE INSERT OR UPDATE ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.validate_recipe_tenant();

CREATE OR REPLACE FUNCTION public._deduct_inventory_for_order_internal(p_order_id uuid)
RETURNS TABLE(item_processed integer,items_without_recipe integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_rest uuid; v_items jsonb; i record; v_before numeric; v_after numeric; v_processed int:=0; v_missing int;
BEGIN
  SELECT restaurant_id,items INTO v_rest,v_items FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF v_rest IS NULL THEN RAISE EXCEPTION 'order_not_found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.inventory_deduction_claims(order_id) VALUES(p_order_id) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT 0,0; RETURN; END IF;
  SELECT count(*) INTO v_missing FROM jsonb_array_elements(v_items) x WHERE NOT EXISTS
    (SELECT 1 FROM public.recipes WHERE menu_item_id=(x->>'menu_item_id')::uuid AND restaurant_id=v_rest);
  FOR i IN SELECT ri.inventory_item_id, sum(ri.quantity_needed*(x->>'quantity')::numeric) AS needed
    FROM jsonb_array_elements(v_items) x
    JOIN public.recipes r ON r.menu_item_id=(x->>'menu_item_id')::uuid AND r.restaurant_id=v_rest
    JOIN public.recipe_ingredients ri ON ri.recipe_id=r.id
    GROUP BY ri.inventory_item_id ORDER BY ri.inventory_item_id LOOP
    SELECT current_stock INTO v_before FROM public.inventory_items
      WHERE id=i.inventory_item_id AND restaurant_id=v_rest FOR UPDATE;
    IF v_before IS NULL THEN RAISE EXCEPTION 'invalid_inventory_relation' USING ERRCODE='23514'; END IF;
    v_after:=GREATEST(0,v_before-i.needed);
    UPDATE public.inventory_items SET current_stock=v_after WHERE id=i.inventory_item_id;
    INSERT INTO public.inventory_movements(restaurant_id,inventory_item_id,movement_type,quantity,
      requested_quantity,shortage,stock_before,stock_after,reference_id,notes,created_by)
    VALUES(v_rest,i.inventory_item_id,'sale_deduction',v_after-v_before,i.needed,
      GREATEST(0,i.needed-v_before),v_before,v_after,p_order_id::text,CASE WHEN i.needed>v_before THEN format('Faltante: %s; solicitado: %s',i.needed-v_before,i.needed) ELSE 'Deducción por venta' END,auth.uid());
    v_processed:=v_processed+1;
  END LOOP;
  RETURN QUERY SELECT v_processed,COALESCE(v_missing,0);
END;
$$;
REVOKE ALL ON FUNCTION public._deduct_inventory_for_order_internal(uuid),public.validate_recipe_tenant()
FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.inventory_movements FROM anon,authenticated;
REVOKE UPDATE ON public.inventory_items FROM authenticated;
GRANT UPDATE(name,unit,min_stock,cost_per_unit,category,is_active) ON public.inventory_items TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
