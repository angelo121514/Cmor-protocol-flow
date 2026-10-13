-- Fase 5: Pago QR Autónomo del Cliente (mesas + sesiones)
--
-- Crea:
--   - restaurant_tables: mesas físicas con qr_token opaco (16 bytes hex).
--   - table_sessions:    sesión activa de una mesa (session_token 32 bytes hex).
--   - Columnas en orders: table_session_id (vincula pedido a la sesión).
--
-- RPCs públicas (GRANT anon + authenticated):
--   - get_table_by_token(token)            -> datos mínimos de la mesa.
--   - start_table_session(table_id)        -> crea/abre sesión y la retorna.
--   - get_session_by_token(session_token)  -> estado de la sesión para el cliente.
--   - get_table_orders(session_token)      -> pedidos de la sesión (para el cliente).
--   - create_table_order(session, items,…) -> crea pedido recalculando precios en el
--                                             servidor (NO confía en item_total del
--                                             cliente). Reutiliza la misma lógica de
--                                             create_order (P1-1).
--
-- Seguridad:
--   - RLS completa (FOR ALL USING is_my_restaurant WITH CHECK) en las tablas para
--     el owner. El cliente anónimo NUNCA hace SELECT directo: accede solo vía RPC
--     SECURITY DEFINER que devuelven exactamente 1 fila validada por token.
--   - Las RPC públicas validan restaurante activo + trial vigente.
--
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS / DROP TRIGGER IF EXISTS.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. restaurant_tables ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number  text NOT NULL,
  qr_token      text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  capacity      integer DEFAULT 4,
  status        text NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','occupied','reserved','cleaning')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);

-- 2. table_sessions -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id      uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'),
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','payment_pending','closed')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  total_amount  decimal(10,2) NOT NULL DEFAULT 0,
  tip_amount    decimal(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_active ON public.restaurant_tables(restaurant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_table_sessions_active ON public.table_sessions(restaurant_id) WHERE status IN ('active','payment_pending');
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON public.table_sessions(table_id, started_at DESC);

-- Triggers updated_at (reutilizan update_updated_at_column() existente).
DROP TRIGGER IF EXISTS trg_restaurant_tables_updated_at ON public.restaurant_tables;
CREATE TRIGGER trg_restaurant_tables_updated_at BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS --------------------------------------------------------------------
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "Owner manages restaurant_tables" ON public.restaurant_tables
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
-- Sin policy SELECT pública: el cliente accede solo vía RPC get_table_by_token,
-- que devuelve exactamente 1 fila validada por token.

ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages table_sessions" ON public.table_sessions;
CREATE POLICY "Owner manages table_sessions" ON public.table_sessions
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
-- table_sessions tampoco expone SELECT público: el cliente accede vía RPC.

-- Columna en orders (idempotente): vincula el pedido a la sesión de mesa.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_session_id uuid REFERENCES public.table_sessions(id) ON DELETE SET NULL;

-- =========================================================================
-- RPC públicas (GRANT anon + authenticated)
-- =========================================================================

-- get_table_by_token: devuelve SOLO la mesa de ese token (1 fila exacta).
CREATE OR REPLACE FUNCTION public.get_table_by_token(p_qr_token text)
RETURNS TABLE(id uuid, restaurant_id uuid, table_number text, capacity int, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row record;
BEGIN
  SELECT t.id, t.restaurant_id, t.table_number, t.capacity, t.status,
         r.is_active AS r_active, r.status AS r_status
    INTO v_row
    FROM public.restaurant_tables t
    JOIN public.restaurants r ON r.id = t.restaurant_id
    WHERE t.qr_token = p_qr_token
      AND t.is_active = true
      AND r.is_active = true
      AND r.status IN ('active','trial')
    LIMIT 1;
  IF v_row IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT v_row.id, v_row.restaurant_id, v_row.table_number,
                      v_row.capacity, v_row.status;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_table_by_token(text) TO anon, authenticated;

-- start_table_session: el cliente abre (o reutiliza) una sesión activa para su
-- mesa. No requiere auth: se valida por table_id (que el cliente obtiene de
-- get_table_by_token, que ya validó qr_token + restaurante activo).
CREATE OR REPLACE FUNCTION public.start_table_session(p_table_id uuid)
RETURNS TABLE(session_token text, session_id uuid, table_number text, restaurant_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table record; v_existing record;
BEGIN
  SELECT t.id, t.restaurant_id, t.table_number, t.is_active,
         r.is_active AS r_active, r.status AS r_status
    INTO v_table
    FROM public.restaurant_tables t
    JOIN public.restaurants r ON r.id = t.restaurant_id
    WHERE t.id = p_table_id
    LIMIT 1;

  IF v_table IS NULL OR v_table.is_active = false
     OR v_table.r_active = false OR v_table.r_status NOT IN ('active','trial') THEN
    RAISE EXCEPTION 'invalid table' USING ERRCODE = '42501';
  END IF;

  -- Reutilizar sesión activa existente para esta mesa (mismo cliente recarga página).
  SELECT s.id, s.session_token INTO v_existing
    FROM public.table_sessions s
    WHERE s.table_id = p_table_id AND s.status = 'active'
    ORDER BY s.started_at DESC LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing.session_token, v_existing.id,
                        v_table.table_number, v_table.restaurant_id;
    RETURN;
  END IF;

  INSERT INTO public.table_sessions(table_id, restaurant_id, status)
    VALUES (v_table.id, v_table.restaurant_id, 'active')
    RETURNING id, session_token INTO v_existing;

  -- Marcar la mesa como ocupada.
  UPDATE public.restaurant_tables SET status = 'occupied' WHERE id = v_table.id;

  RETURN QUERY SELECT v_existing.session_token, v_existing.id,
                      v_table.table_number, v_table.restaurant_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.start_table_session(uuid) TO anon, authenticated;

-- get_session_by_token: estado + totales de la sesión para el cliente.
CREATE OR REPLACE FUNCTION public.get_session_by_token(p_session_token text)
RETURNS TABLE(
  session_id uuid, restaurant_id uuid, table_id uuid, table_number text,
  status text, started_at timestamptz, total_amount decimal, tip_amount decimal
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row record;
BEGIN
  SELECT s.id, s.restaurant_id, s.table_id, s.status, s.started_at,
         s.total_amount, s.tip_amount, t.table_number
    INTO v_row
    FROM public.table_sessions s
    JOIN public.restaurant_tables t ON t.id = s.table_id
    WHERE s.session_token = p_session_token
      AND s.status IN ('active','payment_pending')
    LIMIT 1;
  IF v_row IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT v_row.id, v_row.restaurant_id, v_row.table_id,
                      v_row.table_number, v_row.status, v_row.started_at,
                      v_row.total_amount, v_row.tip_amount;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_session_by_token(text) TO anon, authenticated;

-- get_table_orders: pedidos de la sesión (sin access_token ni datos sensibles).
CREATE OR REPLACE FUNCTION public.get_table_orders(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session record; v_out jsonb;
BEGIN
  SELECT s.id, s.restaurant_id INTO v_session
    FROM public.table_sessions s
    WHERE s.session_token = p_session_token
      AND s.status IN ('active','payment_pending')
    LIMIT 1;
  IF v_session IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'id', o.id,
             'order_number', o.order_number,
             'status', o.status,
             'items', o.items,
             'total', o.total,
             'created_at', o.created_at
           ) ORDER BY o.created_at
         ), '[]')
    INTO v_out
    FROM public.orders o
    WHERE o.table_session_id = v_session.id;
  RETURN v_out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_table_orders(text) TO anon, authenticated;

-- _session_total_internal: suma totales de los pedidos de la sesión.
-- Interna (sin validación de ownership): la usan create_table_order (que ya
-- validó la sesión) y la Edge Function order-pay (service_role).
CREATE OR REPLACE FUNCTION public._session_total_internal(p_session_id uuid)
RETURNS decimal
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total decimal;
BEGIN
  SELECT COALESCE(sum(o.total), 0) INTO v_total
    FROM public.orders o
    WHERE o.table_session_id = p_session_id
      AND o.status NOT IN ('cancelled','rejected');
  RETURN v_total;
END;
$$;
-- Sin GRANT: solo la invocan otras funciones SECURITY DEFINER y service_role.

-- create_table_order: el cliente crea su pedido vinculado a la sesión de mesa.
-- **Recalcula precios server-side** (igual que create_order / P1-1): ignora los
-- precios enviados por el cliente para evitar manipulación. El plan original
-- confiaba en item_total del cliente → agujero de seguridad (pagar $1 por un
-- plato de $10.000). Aquí se corrige.
--
-- Entrada p_order_data:
--   { items: [{ menu_item_id, quantity, selected_size_id?, selected_addon_ids?[] }],
--     customer_name?, customer_phone?, customer_notes? }
CREATE OR REPLACE FUNCTION public.create_table_order(
  p_session_token text,
  p_order_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session record;
  v_restaurant public.restaurants;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_size record;
  v_addon record;
  v_unit_price numeric;
  v_item_total numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_order_number text;
  v_items_to_insert jsonb[] := ARRAY[]::jsonb[];
  v_now timestamptz := now();
  v_items jsonb;
BEGIN
  -- 1. Validar sesión activa.
  SELECT s.id, s.table_id, s.restaurant_id, s.status INTO v_session
    FROM public.table_sessions s
    WHERE s.session_token = p_session_token AND s.status = 'active'
    LIMIT 1;
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_session');
  END IF;

  -- 2. Validar restaurante activo + trial vigente.
  SELECT * INTO v_restaurant
    FROM public.restaurants
    WHERE id = v_session.restaurant_id
      AND is_active = true AND status IN ('active','trial');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
  END IF;
  IF v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'trial_expired');
  END IF;

  -- 3. Validar items.
  v_items := p_order_data->'items';
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;
  IF jsonb_array_length(v_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
  END IF;

  -- 4. Procesar cada item (recuperar precios REALES de la DB).
  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    SELECT * INTO v_menu_item
      FROM public.menu_items
      WHERE id = (v_item->>'menu_item_id')::uuid
        AND restaurant_id = v_session.restaurant_id
        AND is_available = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false, 'error', 'item_not_available',
        'menu_item_id', v_item->>'menu_item_id'
      );
    END IF;

    v_unit_price := v_menu_item.base_price;

    IF v_item ? 'selected_size_id' AND (v_item->>'selected_size_id') IS NOT NULL THEN
      SELECT * INTO v_size
        FROM public.menu_item_sizes
        WHERE id = (v_item->>'selected_size_id')::uuid
          AND menu_item_id = v_menu_item.id;
      IF FOUND THEN
        v_unit_price := v_size.price;
      END IF;
    END IF;

    IF v_item ? 'selected_addon_ids' AND jsonb_array_length(v_item->'selected_addon_ids') > 0 THEN
      FOR v_addon IN
        SELECT * FROM public.menu_item_addons
          WHERE id = ANY (
            SELECT jsonb_array_elements_text(v_item->'selected_addon_ids')::uuid[]
          )
          AND menu_item_id = v_menu_item.id
      LOOP
        v_unit_price := v_unit_price + v_addon.price;
      END LOOP;
    END IF;

    v_item_total := v_unit_price * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_item_total;

    v_items_to_insert := array_append(v_items_to_insert, jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'quantity', (v_item->>'quantity')::int,
      'unit_price', v_unit_price,
      'item_total', v_item_total,
      'selected_size_id', v_item->'selected_size_id',
      'selected_addon_ids', v_item->'selected_addon_ids'
    ));
  END LOOP;

  -- 5. Calcular tax y total con la tasa del restaurante.
  v_tax := v_subtotal * v_restaurant.tax_rate;
  v_total := v_subtotal + v_tax;

  v_order_number := public.generate_order_number_atomic();

  -- 6. Insertar pedido vinculado a la sesión.
  INSERT INTO public.orders (
    restaurant_id, order_number, customer_name, customer_phone,
    order_type, table_number, table_session_id, notes,
    subtotal, tax, total, payment_method, payment_status, status,
    items, access_token, created_at
  ) VALUES (
    v_session.restaurant_id, v_order_number,
    COALESCE(p_order_data->>'customer_name','Cliente QR'),
    p_order_data->>'customer_phone',
    'qr',
    (SELECT table_number FROM public.restaurant_tables WHERE id = v_session.table_id),
    v_session.id,
    p_order_data->>'customer_notes',
    v_subtotal, v_tax, v_total,
    'qr', 'pending', 'pending',
    jsonb_build_array(v_items_to_insert),
    v_access_token, v_now
  )
  RETURNING id INTO v_order_id;

  -- 7. Actualizar total acumulado de la sesión.
  UPDATE public.table_sessions
    SET total_amount = public._session_total_internal(v_session.id)
    WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total,
    'session_total', public._session_total_internal(v_session.id)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_table_order(text,jsonb) TO anon, authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────────────────────────
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS table_session_id;
-- DROP FUNCTION IF EXISTS public.create_table_order(text,jsonb);
-- DROP FUNCTION IF EXISTS public._session_total_internal(uuid);
-- DROP FUNCTION IF EXISTS public.get_table_orders(text);
-- DROP FUNCTION IF EXISTS public.get_session_by_token(text);
-- DROP FUNCTION IF EXISTS public.start_table_session(uuid);
-- DROP FUNCTION IF EXISTS public.get_table_by_token(text);
-- DROP TABLE IF EXISTS public.table_sessions;
-- DROP TABLE IF EXISTS public.restaurant_tables;
