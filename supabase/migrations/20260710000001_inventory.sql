-- Fase 1: Control de Inventario y Recetas (trigger-driven)
-- Crea tablas de inventario, recetas e ingredientes, con RLS, índices,
-- triggers updated_at, y un trigger AFTER UPDATE en orders (particionada)
-- que descuenta inventario al completar un pedido desde cualquier vía.
-- Idempotente: todas las sentencias usan IF NOT EXISTS / CREATE OR REPLACE.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. inventory_items (Insumos/Ingredientes)
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  unit          text NOT NULL CHECK (unit IN ('kg','g','l','ml','unidad','porcion')),
  current_stock decimal(12,3) NOT NULL DEFAULT 0,
  min_stock     decimal(12,3) NOT NULL DEFAULT 0,
  cost_per_unit decimal(10,2) NOT NULL DEFAULT 0,
  category      text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

-- 2. recipes (Recetas por producto del menú)
CREATE TABLE IF NOT EXISTS public.recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id)
);

-- 3. recipe_ingredients (Ingredientes de cada receta)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id         uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_needed   decimal(10,3) NOT NULL CHECK (quantity_needed > 0),
  unit              text NOT NULL,
  UNIQUE(recipe_id, inventory_item_id)
);

-- 4. inventory_movements (Log de movimientos de stock)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type     text NOT NULL CHECK (movement_type IN
                      ('purchase','sale_deduction','manual_adjustment','waste','return')),
  quantity          decimal(12,3) NOT NULL,
  reference_id      text,
  notes             text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON public.inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory_items(restaurant_id)
  WHERE current_stock <= min_stock;
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON public.recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_movements_restaurant ON public.inventory_movements(restaurant_id, created_at DESC);

-- Triggers updated_at (reusan update_updated_at_column() existente)
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_recipes_updated_at ON public.recipes;
CREATE TRIGGER trg_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (DROP IF EXISTS + CREATE, con USING + WITH CHECK)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages inventory_items" ON public.inventory_items;
CREATE POLICY "Owner manages inventory_items" ON public.inventory_items
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages recipes" ON public.recipes;
CREATE POLICY "Owner manages recipes" ON public.recipes
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages recipe_ingredients" ON public.recipe_ingredients;
CREATE POLICY "Owner manages recipe_ingredients" ON public.recipe_ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND public.is_my_restaurant(r.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND public.is_my_restaurant(r.restaurant_id)
    )
  );

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages inventory_movements" ON public.inventory_movements;
CREATE POLICY "Owner manages inventory_movements" ON public.inventory_movements
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

-- Función INTERNA sin validación de ownership (la usa el trigger, que ya se
-- ejecuta en contexto elevado tras pasar RLS / service_role). auth.uid() puede
-- ser NULL cuando el completado viene de un Edge Function (pago QR).
CREATE OR REPLACE FUNCTION public._deduct_inventory_for_order_internal(
  p_order_id uuid
) RETURNS TABLE(item_processed int, items_without_recipe int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_restaurant_id uuid;
  v_already_deducted boolean;
  v_item record;
  v_recipe_id uuid;
  v_ingredient record;
  v_processed int := 0;
  v_no_recipe int := 0;
  v_actor uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = p_order_id;
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = '404';
  END IF;

  -- Idempotencia: ¿ya se descontó por este pedido?
  SELECT EXISTS(
    SELECT 1 FROM public.inventory_movements
    WHERE reference_id = p_order_id::text AND movement_type = 'sale_deduction'
  ) INTO v_already_deducted;
  IF v_already_deducted THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  -- Actor para auditoría: auth.uid() si hay sesión (POS/Orders), NULL si viene
  -- de service_role (pago QR). created_by acepta NULL.
  v_actor := auth.uid();

  FOR v_item IN
    SELECT (elem->>'menu_item_id')::uuid AS menu_item_id,
           COALESCE((elem->>'quantity')::int, 1) AS qty
    FROM public.orders o,
         jsonb_array_elements(o.items) AS elem
    WHERE o.id = p_order_id
      AND elem->>'menu_item_id' IS NOT NULL
  LOOP
    SELECT id INTO v_recipe_id FROM public.recipes
    WHERE menu_item_id = v_item.menu_item_id AND restaurant_id = v_restaurant_id;

    IF v_recipe_id IS NULL THEN
      v_no_recipe := v_no_recipe + 1;
      CONTINUE;
    END IF;

    FOR v_ingredient IN
      SELECT ri.inventory_item_id, ri.quantity_needed
      FROM public.recipe_ingredients ri WHERE ri.recipe_id = v_recipe_id
    LOOP
      UPDATE public.inventory_items
      SET current_stock = current_stock - (v_ingredient.quantity_needed * v_item.qty)
      WHERE id = v_ingredient.inventory_item_id;

      INSERT INTO public.inventory_movements
        (restaurant_id, inventory_item_id, movement_type, quantity, reference_id, notes, created_by)
      VALUES
        (v_restaurant_id, v_ingredient.inventory_item_id, 'sale_deduction',
         -(v_ingredient.quantity_needed * v_item.qty), p_order_id::text,
         'Deduccion automatica', v_actor);
    END LOOP;
    v_processed := v_processed + 1;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_no_recipe;
END;
$$;
-- No se hace GRANT público de la interna: solo el trigger y la RPC validada la usan.

-- RPC pública (para uso manual/diagnóstico): valida ownership antes de delegar.
CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order(
  p_order_id uuid
) RETURNS TABLE(item_processed int, items_without_recipe int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restaurant_id uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = p_order_id;
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = '404';
  END IF;
  IF NOT public.is_my_restaurant(v_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public._deduct_inventory_for_order_internal(p_order_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_order(uuid) TO authenticated;

-- TRIGGER sobre orders (tabla madre particionada): dispara al completar.
-- Llama a la INTERNA (sin validación de ownership) porque el UPDATE ya pasó RLS
-- o vino de service_role (que bypasea RLS). Así funciona desde POS, Orders Y
-- pago QR (Edge Function sin JWT de usuario).
CREATE OR REPLACE FUNCTION public.on_order_completed_deduct_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status = 'completed') AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public._deduct_inventory_for_order_internal(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_completed_inventory ON public.orders;
CREATE TRIGGER orders_completed_inventory
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_completed_deduct_inventory();

COMMIT;

-- Rollback:
-- DROP TRIGGER IF EXISTS orders_completed_inventory ON public.orders;
-- DROP FUNCTION IF EXISTS public.on_order_completed_deduct_inventory();
-- DROP FUNCTION IF EXISTS public.deduct_inventory_for_order(uuid);
-- DROP FUNCTION IF EXISTS public._deduct_inventory_for_order_internal(uuid);
-- DROP TABLE IF EXISTS public.inventory_movements;
-- DROP TABLE IF EXISTS public.recipe_ingredients;
-- DROP TABLE IF EXISTS public.recipes;
-- DROP TABLE IF EXISTS public.inventory_items;
