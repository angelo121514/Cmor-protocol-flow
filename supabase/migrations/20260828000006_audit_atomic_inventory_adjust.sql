-- =====================================================================
-- Migración 20260828000006_audit_atomic_inventory_adjust.sql
-- Auditoría 2026-08-28 — ajuste de inventario atómico y stock >= 0.
--
-- 1) RPC adjust_inventory_stock: UPDATE atómico + INSERT del movimiento
--    en la misma transacción (antes: read-then-write del cliente con
--    pérdida de escrituras ante concurrencia).
-- 2) El trigger de deducción por venta se clampa a 0 (GREATEST) y su
--    movimiento refleja lo realmente descontado — si fuera a negativo
--    violaría el CHECK nuevo y rompería el cierre de pedidos.
-- 3) CHECK current_stock >= 0 tras sanear negativos históricos.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
  p_item_id uuid,
  p_delta numeric,
  p_movement_type text,
  p_notes text DEFAULT NULL
) RETURNS public.inventory_movements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock numeric;
  v_movement public.inventory_movements;
  v_actor uuid;
BEGIN
  IF NOT public.is_my_restaurant(
    (SELECT restaurant_id FROM public.inventory_items WHERE id = p_item_id)
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Mismo dominio que el CHECK de inventory_movements.
  IF p_movement_type NOT IN ('purchase', 'sale_deduction', 'manual_adjustment', 'waste', 'return') THEN
    RAISE EXCEPTION 'invalid_movement_type' USING ERRCODE = '22023';
  END IF;

  -- Atómico: el UPDATE calcula sobre el valor actual de la fila, sin
  -- snapshot del cliente.
  UPDATE public.inventory_items
  SET current_stock = current_stock + p_delta
  WHERE id = p_item_id
  RETURNING current_stock INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '22023';
  END IF;

  SELECT auth.uid() INTO v_actor;

  INSERT INTO public.inventory_movements (
    restaurant_id,
    inventory_item_id,
    movement_type,
    quantity,
    notes,
    created_by
  ) VALUES (
    (SELECT restaurant_id FROM public.inventory_items WHERE id = p_item_id),
    p_item_id,
    p_movement_type,
    p_delta,
    p_notes,
    v_actor
  ) RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_inventory_stock(uuid, numeric, text, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_stock(uuid, numeric, text, text)
TO authenticated;

-- ---------------------------------------------------------------------
-- Deducción por venta con clamp a 0 (misma firma y semántica que la
-- versión de 20260807013000; sin el clamp, un pedido con receta cuyo
-- consumo supere el stock haría fallar el CHECK nuevo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._deduct_inventory_for_order_internal(p_order_id uuid)
RETURNS TABLE(item_processed integer, items_without_recipe integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_restaurant_id uuid; v_already_deducted boolean; v_item record; v_recipe_id uuid;
  v_ingredient record; v_processed int := 0; v_no_recipe int := 0; v_actor uuid;
  v_needed numeric; v_before numeric; v_after numeric;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = p_order_id;
  IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.inventory_movements
    WHERE reference_id = p_order_id::text AND movement_type = 'sale_deduction') INTO v_already_deducted;
  IF v_already_deducted THEN RETURN QUERY SELECT 0, 0; RETURN; END IF;
  v_actor := auth.uid();
  FOR v_item IN SELECT (elem->>'menu_item_id')::uuid AS menu_item_id,
      COALESCE((elem->>'quantity')::int, 1) AS qty FROM public.orders o,
      jsonb_array_elements(o.items) AS elem WHERE o.id = p_order_id AND elem->>'menu_item_id' IS NOT NULL LOOP
    SELECT id INTO v_recipe_id FROM public.recipes
      WHERE menu_item_id = v_item.menu_item_id AND restaurant_id = v_restaurant_id;
    IF v_recipe_id IS NULL THEN v_no_recipe := v_no_recipe + 1; CONTINUE; END IF;
    FOR v_ingredient IN SELECT ri.inventory_item_id, ri.quantity_needed
      FROM public.recipe_ingredients ri WHERE ri.recipe_id = v_recipe_id LOOP
      v_needed := v_ingredient.quantity_needed * v_item.qty;
      -- Clamp a 0: el movimiento registra la cantidad realmente descontada.
      UPDATE public.inventory_items
      SET current_stock = GREATEST(0, current_stock - v_needed)
      WHERE id = v_ingredient.inventory_item_id
      RETURNING current_stock + v_needed, current_stock
      INTO v_before, v_after;
      INSERT INTO public.inventory_movements(restaurant_id, inventory_item_id, movement_type, quantity, reference_id, notes, created_by)
      VALUES (v_restaurant_id, v_ingredient.inventory_item_id, 'sale_deduction',
        -(v_before - v_after), p_order_id::text,
        CASE WHEN v_before < v_needed
          THEN 'Deduccion automatica (stock insuficiente, ajustado a 0)'
          ELSE 'Deduccion automatica' END,
        v_actor);
    END LOOP;
    v_processed := v_processed + 1;
  END LOOP;
  RETURN QUERY SELECT v_processed, v_no_recipe;
END;
$$;

-- ---------------------------------------------------------------------
-- Stock no negativo: saneo de negativos históricos + CHECK.
-- ---------------------------------------------------------------------
WITH negatives AS (
  SELECT id, restaurant_id, current_stock
  FROM public.inventory_items
  WHERE current_stock < 0
  FOR UPDATE
), fixed AS (
  UPDATE public.inventory_items i
  SET current_stock = 0
  FROM negatives n
  WHERE i.id = n.id
  RETURNING n.id AS item_id, n.restaurant_id, n.current_stock AS old_stock
)
INSERT INTO public.inventory_movements (
  restaurant_id, inventory_item_id, movement_type, quantity, notes, created_by
)
SELECT f.restaurant_id, f.item_id, 'manual_adjustment', -(f.old_stock),
  'Ajuste automatico: stock negativo saneado a 0 (auditoria 2026-08-28)', NULL
FROM fixed f;

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_current_stock_nonnegative;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_current_stock_nonnegative CHECK (current_stock >= 0);

NOTIFY pgrst, 'reload schema';
COMMIT;