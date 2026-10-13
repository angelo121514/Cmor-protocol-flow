-- Reparación P0/P1 posterior a auditoría: separa pago de entrega y corrige
-- funciones que no compilaban contra el esquema real de producción.

BEGIN;

-- El instante de pago es distinto del instante de entrega. Antes se usaba
-- completed_at para ambos y un pedido pendiente podía entrar en caja.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.orders
SET paid_at = COALESCE(paid_at, completed_at, updated_at, created_at)
WHERE payment_status = 'paid' AND paid_at IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_order_payment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  IF NEW.status = 'completed' AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Un pedido no puede completarse sin pago confirmado'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_payment_integrity ON public.orders;
CREATE TRIGGER orders_payment_integrity
  BEFORE INSERT OR UPDATE OF status, payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_payment_integrity();

-- Los componentes del menú se guardan como JSONB en menu_items (no existen
-- tablas menu_item_sizes/menu_item_addons). El servidor recalcula cada precio
-- desde ese catálogo y jamás confía en el valor recibido del navegador.
CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_order_type text DEFAULT 'qr',
  p_table_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT 'qr'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant public.restaurants;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_size jsonb;
  v_addon jsonb;
  v_requested_addon jsonb;
  v_unit_price numeric;
  v_item_total numeric;
  v_items_sum numeric := 0;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_order_number text;
  v_items_to_insert jsonb := '[]'::jsonb;
  v_now timestamptz := now();
  v_customer_id uuid := NULL;
  v_requested_addons integer;
  v_saved_addons jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
  END IF;

  SELECT * INTO v_restaurant FROM public.restaurants
  WHERE id = p_restaurant_id AND is_active = true AND status IN ('active', 'trial');
  IF NOT FOUND OR (v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now) THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
  END IF;

  IF NULLIF(trim(COALESCE(p_customer_phone, '')), '') IS NOT NULL
     AND NULLIF(trim(COALESCE(p_customer_name, '')), '') IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.restaurant_customers
    WHERE restaurant_id = p_restaurant_id AND phone = trim(p_customer_phone)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1;
    IF v_customer_id IS NULL THEN
      INSERT INTO public.restaurant_customers(restaurant_id, name, phone, email)
      VALUES (p_restaurant_id, trim(p_customer_name), trim(p_customer_phone), NULLIF(trim(COALESCE(p_customer_email, '')), ''))
      RETURNING id INTO v_customer_id;
    ELSE
      UPDATE public.restaurant_customers
      SET name = trim(p_customer_name),
          email = COALESCE(NULLIF(trim(COALESCE(p_customer_email, '')), ''), email),
          updated_at = v_now
      WHERE id = v_customer_id;
    END IF;
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL
       OR COALESCE(NULLIF(v_item->>'quantity', '')::integer, 0) < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_item');
    END IF;

    SELECT * INTO v_menu_item FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = p_restaurant_id AND is_available = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'item_not_available', 'menu_item_id', v_item->>'menu_item_id');
    END IF;

    v_unit_price := v_menu_item.base_price;
    v_size := NULL;
    IF v_item ? 'selected_size' AND NULLIF(v_item->'selected_size'->>'name', '') IS NOT NULL THEN
      SELECT size_option.value INTO v_size
      FROM jsonb_array_elements(COALESCE(v_menu_item.sizes, '[]'::jsonb)) AS size_option(value)
      WHERE size_option.value->>'name' = v_item->'selected_size'->>'name'
      LIMIT 1;
      IF v_size IS NULL OR NULLIF(v_size->>'price', '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_size');
      END IF;
      v_unit_price := (v_size->>'price')::numeric;
    END IF;

    v_requested_addons := CASE WHEN jsonb_typeof(v_item->'selected_addons') = 'array'
      THEN jsonb_array_length(v_item->'selected_addons') ELSE 0 END;
    v_saved_addons := '[]'::jsonb;
    IF v_requested_addons > 0 THEN
      FOR v_requested_addon IN SELECT jsonb_array_elements(v_item->'selected_addons') LOOP
        SELECT addon_option.value INTO v_addon
        FROM jsonb_array_elements(COALESCE(v_menu_item.addons, '[]'::jsonb)) AS addon_option(value)
        WHERE addon_option.value->>'name' = v_requested_addon->>'name'
        LIMIT 1;
        IF v_addon IS NULL OR NULLIF(v_addon->>'price', '') IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'invalid_addon');
        END IF;
        v_unit_price := v_unit_price + (v_addon->>'price')::numeric;
        v_saved_addons := v_saved_addons || jsonb_build_array(v_addon);
      END LOOP;
    END IF;

    v_item_total := v_unit_price * (v_item->>'quantity')::integer;
    v_items_sum := v_items_sum + v_item_total;
    v_items_to_insert := v_items_to_insert || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'description', v_menu_item.description,
      'quantity', (v_item->>'quantity')::integer,
      'base_price', v_menu_item.base_price,
      'unit_price', v_unit_price,
      'item_total', v_item_total,
      'selected_size', v_size,
      'selected_addons', v_saved_addons
    ));
  END LOOP;

  v_total := v_items_sum;
  v_subtotal := v_total / 1.19;
  v_tax := v_total - v_subtotal;
  v_order_number := public.generate_order_number_atomic();
  INSERT INTO public.orders(
    restaurant_id, order_number, customer_name, customer_phone, customer_id,
    order_type, table_number, customer_notes, subtotal, tax, total,
    payment_method, payment_status, status, items, access_token, created_at
  ) VALUES (
    p_restaurant_id, v_order_number, p_customer_name, p_customer_phone, v_customer_id,
    p_order_type, p_table_number, p_notes, v_subtotal, v_tax, v_total,
    p_payment_method, 'pending', 'pending', v_items_to_insert, v_access_token, v_now
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id,
    'order_number', v_order_number, 'access_token', v_access_token,
    'subtotal', v_subtotal, 'tax', v_tax, 'total', v_total,
    'item_count', jsonb_array_length(p_items), 'customer_id', v_customer_id);
END;
$$;

-- La versión de tabla QR no tenía opciones implementadas en su UI; se bloquea
-- explícitamente un identificador de opción en vez de consultarlo en tablas
-- inexistentes. También corrige customer_notes y el array JSON de items.
CREATE OR REPLACE FUNCTION public.create_table_order(p_session_token text, p_order_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_restaurant public.restaurants;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_unit_price numeric;
  v_item_total numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_order_number text;
  v_items_to_insert jsonb := '[]'::jsonb;
  v_now timestamptz := now();
  v_items jsonb;
BEGIN
  SELECT s.id, s.table_id, s.restaurant_id, s.status INTO v_session
  FROM public.table_sessions s WHERE s.session_token = p_session_token AND s.status = 'active' LIMIT 1;
  IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_session'); END IF;

  SELECT * INTO v_restaurant FROM public.restaurants
  WHERE id = v_session.restaurant_id AND is_active = true AND status IN ('active','trial');
  IF NOT FOUND OR (v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now) THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
  END IF;

  v_items := p_order_data->'items';
  IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;
  IF jsonb_array_length(v_items) > 50 THEN RETURN jsonb_build_object('success', false, 'error', 'too_many_items'); END IF;

  FOR v_item IN SELECT jsonb_array_elements(v_items) LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL
       OR COALESCE(NULLIF(v_item->>'quantity', '')::integer, 0) < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_item');
    END IF;
    IF NULLIF(v_item->>'selected_size_id', '') IS NOT NULL
       OR (jsonb_typeof(v_item->'selected_addon_ids') = 'array' AND jsonb_array_length(v_item->'selected_addon_ids') > 0) THEN
      RETURN jsonb_build_object('success', false, 'error', 'menu_options_not_supported_for_table_qr');
    END IF;
    SELECT * INTO v_menu_item FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = v_session.restaurant_id AND is_available = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'item_not_available'); END IF;
    v_unit_price := v_menu_item.base_price;
    v_item_total := v_unit_price * (v_item->>'quantity')::integer;
    v_subtotal := v_subtotal + v_item_total;
    v_items_to_insert := v_items_to_insert || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_menu_item.id, 'name', v_menu_item.name,
      'quantity', (v_item->>'quantity')::integer, 'unit_price', v_unit_price,
      'item_total', v_item_total, 'selected_size', NULL, 'selected_addons', '[]'::jsonb
    ));
  END LOOP;

  v_tax := v_subtotal * v_restaurant.tax_rate;
  v_total := v_subtotal + v_tax;
  v_order_number := public.generate_order_number_atomic();
  INSERT INTO public.orders(
    restaurant_id, order_number, customer_name, customer_phone, order_type,
    table_number, table_session_id, customer_notes, subtotal, tax, total,
    payment_method, payment_status, status, items, access_token, created_at
  ) VALUES (
    v_session.restaurant_id, v_order_number,
    COALESCE(p_order_data->>'customer_name','Cliente QR'), p_order_data->>'customer_phone', 'qr',
    (SELECT table_number FROM public.restaurant_tables WHERE id = v_session.table_id),
    v_session.id, p_order_data->>'customer_notes', v_subtotal, v_tax, v_total,
    'qr', 'pending', 'pending', v_items_to_insert, v_access_token, v_now
  ) RETURNING id INTO v_order_id;
  UPDATE public.table_sessions SET total_amount = public._session_total_internal(v_session.id) WHERE id = v_session.id;
  RETURN jsonb_build_object('success', true, 'order_id', v_order_id,
    'order_number', v_order_number, 'access_token', v_access_token,
    'subtotal', v_subtotal, 'tax', v_tax, 'total', v_total,
    'session_total', public._session_total_internal(v_session.id));
END;
$$;

-- Funciones de consulta/seguridad rotas por migraciones antiguas.
DROP FUNCTION IF EXISTS public.get_my_order(uuid);
CREATE FUNCTION public.get_my_order(p_token uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_order public.orders;
BEGIN
  SELECT o.* INTO v_order FROM public.orders o
  WHERE o.access_token = p_token AND o.created_at > now() - interval '24 hours';
  IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido o expirado' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.orders SET access_token = NULL WHERE id = v_order.id;
  RETURN v_order;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_order(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_reports_summary(p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(total), 0),
    'total_orders', COUNT(*),
    'avg_ticket', COALESCE(AVG(total), 0),
    'unique_customers', COUNT(DISTINCT COALESCE(customer_id::text, NULLIF(customer_phone, ''))),
    'cancelled_orders', 0,
    'completion_rate', 100
  ) INTO v_result
  FROM public.orders
  WHERE restaurant_id = p_restaurant_id
    AND payment_status = 'paid'
    AND status NOT IN ('cancelled', 'rejected')
    AND DATE(created_at) BETWEEN p_from AND p_to;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_invitation(p_token text)
RETURNS TABLE(restaurant_id uuid, email text, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_inv public.invitations%ROWTYPE; v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE; RETURN; END IF;
  SELECT * INTO v_inv FROM public.invitations i
  WHERE i.token = p_token AND i.status IN ('pending', 'sent')
    AND (i.expires_at IS NULL OR i.expires_at > now()) FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE; RETURN; END IF;
  SELECT lower(u.email) INTO v_user_email FROM auth.users u WHERE u.id = auth.uid();
  IF v_user_email IS NULL OR v_user_email <> lower(v_inv.email) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE; RETURN;
  END IF;
  UPDATE public.profiles SET restaurant_id = v_inv.restaurant_id,
    role = CASE WHEN v_inv.role = 'staff' THEN 'staff' ELSE 'owner' END WHERE id = auth.uid();
  INSERT INTO public.profile_restaurants(profile_id, restaurant_id, is_primary)
  VALUES (auth.uid(), v_inv.restaurant_id, true)
  ON CONFLICT (profile_id, restaurant_id) DO UPDATE SET is_primary = true;
  UPDATE public.invitations SET status = 'consumed', consumed_at = now() WHERE id = v_inv.id;
  RETURN QUERY SELECT v_inv.restaurant_id, v_inv.email, TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_table_session(p_table_id uuid)
RETURNS TABLE(session_token text, session_id uuid, table_number text, restaurant_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_table record; v_existing record; v_new_session_id uuid; v_new_session_token text;
BEGIN
  SELECT t.id, t.restaurant_id, t.table_number, t.is_active, r.is_active AS r_active, r.status AS r_status
  INTO v_table FROM public.restaurant_tables t JOIN public.restaurants r ON r.id = t.restaurant_id
  WHERE t.id = p_table_id LIMIT 1;
  IF v_table IS NULL OR v_table.is_active = false OR v_table.r_active = false OR v_table.r_status NOT IN ('active','trial') THEN
    RAISE EXCEPTION 'invalid table' USING ERRCODE = '42501';
  END IF;
  SELECT s.id, s.session_token INTO v_existing FROM public.table_sessions s
  WHERE s.table_id = p_table_id AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing.session_token, v_existing.id, v_table.table_number, v_table.restaurant_id; RETURN;
  END IF;
  INSERT INTO public.table_sessions AS ts(table_id, restaurant_id, status)
  VALUES (v_table.id, v_table.restaurant_id, 'active')
  RETURNING ts.id, ts.session_token INTO v_new_session_id, v_new_session_token;
  UPDATE public.restaurant_tables SET status = 'occupied' WHERE id = v_table.id;
  RETURN QUERY SELECT v_new_session_token, v_new_session_id, v_table.table_number, v_table.restaurant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.kds_get_restaurant(p_kitchen_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row record;
BEGIN
  SELECT r.id, r.name INTO v_row FROM public.restaurants r
  WHERE r.kitchen_token = p_kitchen_token AND r.is_active = true;
  IF v_row IS NULL THEN RAISE EXCEPTION 'invalid' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('id', v_row.id, 'name', v_row.name, 'default_prep_time', 15);
END;
$$;

ALTER FUNCTION public.admin_create_restaurant_v2(uuid,text,text,text,text,text,text,text,text,text)
  SET search_path TO public, extensions;
ALTER FUNCTION public.kitchen_login(uuid,text) SET search_path TO public, extensions;

CREATE OR REPLACE FUNCTION public._deduct_inventory_for_order_internal(p_order_id uuid)
RETURNS TABLE(item_processed integer, items_without_recipe integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_restaurant_id uuid; v_already_deducted boolean; v_item record; v_recipe_id uuid;
  v_ingredient record; v_processed int := 0; v_no_recipe int := 0; v_actor uuid;
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
      UPDATE public.inventory_items SET current_stock = current_stock - (v_ingredient.quantity_needed * v_item.qty)
      WHERE id = v_ingredient.inventory_item_id;
      INSERT INTO public.inventory_movements(restaurant_id, inventory_item_id, movement_type, quantity, reference_id, notes, created_by)
      VALUES (v_restaurant_id, v_ingredient.inventory_item_id, 'sale_deduction',
        -(v_ingredient.quantity_needed * v_item.qty), p_order_id::text, 'Deduccion automatica', v_actor);
    END LOOP;
    v_processed := v_processed + 1;
  END LOOP;
  RETURN QUERY SELECT v_processed, v_no_recipe;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_inventory_for_order(p_order_id uuid)
RETURNS TABLE(item_processed integer, items_without_recipe integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restaurant_id uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = p_order_id;
  IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.is_my_restaurant(v_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM public._deduct_inventory_for_order_internal(p_order_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.end_waiter_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restaurant uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant FROM public.waiter_sessions WHERE id = p_session_id;
  IF v_restaurant IS NULL THEN RAISE EXCEPTION 'session not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.is_my_restaurant(v_restaurant) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  UPDATE public.waiter_sessions SET ended_at = now() WHERE id = p_session_id AND ended_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_waiter(p_waiter_id uuid, p_name text DEFAULT NULL, p_pin text DEFAULT NULL, p_role text DEFAULT NULL, p_is_active boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_restaurant uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant FROM public.waiters WHERE id = p_waiter_id;
  IF v_restaurant IS NULL THEN RAISE EXCEPTION 'waiter not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.is_my_restaurant(v_restaurant) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  UPDATE public.waiters SET name = COALESCE(p_name, name),
    pin_hash = CASE WHEN p_pin IS NOT NULL THEN crypt(p_pin, gen_salt('bf')) ELSE pin_hash END,
    role = COALESCE(p_role, role), is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_waiter_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_cash_shift(p_shift_id uuid, p_actual_cash numeric, p_notes text DEFAULT NULL)
RETURNS public.cash_shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shift public.cash_shifts; v_rest uuid; v_cash numeric := 0; v_card numeric := 0;
  v_trans numeric := 0; v_qr numeric := 0; v_total numeric := 0; v_count integer := 0;
  v_ttips numeric := 0; v_ctips numeric := 0; v_dtips numeric := 0; v_exp numeric; v_diff numeric;
  v_wsum jsonb := '[]'::jsonb; v_row record;
BEGIN
  SELECT * INTO v_shift FROM public.cash_shifts WHERE id = p_shift_id;
  IF v_shift IS NULL THEN RAISE EXCEPTION 'shift not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.is_my_restaurant(v_shift.restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF v_shift.status = 'closed' THEN RETURN v_shift; END IF;
  v_rest := v_shift.restaurant_id;
  FOR v_row IN SELECT total, COALESCE(NULLIF(payment_method, ''), 'cash') AS method
    FROM public.orders WHERE restaurant_id = v_rest AND payment_status = 'paid'
      AND status NOT IN ('cancelled','rejected') AND paid_at >= v_shift.opened_at AND paid_at <= now() LOOP
    v_count := v_count + 1; v_total := v_total + v_row.total;
    CASE v_row.method
      WHEN 'cash' THEN v_cash := v_cash + v_row.total;
      WHEN 'card' THEN v_card := v_card + v_row.total;
      WHEN 'transfer' THEN v_trans := v_trans + v_row.total;
      WHEN 'qr' THEN v_qr := v_qr + v_row.total;
      ELSE v_cash := v_cash + v_row.total;
    END CASE;
  END LOOP;
  SELECT COALESCE(sum(amount),0), COALESCE(sum(amount) FILTER (WHERE payment_method = 'cash'),0),
    COALESCE(sum(amount) FILTER (WHERE payment_method IN ('card','qr')),0)
  INTO v_ttips, v_ctips, v_dtips FROM public.tips
  WHERE restaurant_id = v_rest AND created_at >= v_shift.opened_at AND created_at <= now();
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.sales DESC NULLS LAST), '[]'::jsonb) INTO v_wsum FROM (
    SELECT w.id AS waiter_id, w.name, COUNT(DISTINCT o.table_number) AS tables,
      COALESCE(sum(o.total),0) AS sales, COALESCE(sum(t.amount),0) AS tips
    FROM public.waiters w LEFT JOIN public.orders o ON o.waiter_id = w.id AND o.restaurant_id = v_rest
      AND o.payment_status = 'paid' AND o.status NOT IN ('cancelled','rejected') AND o.paid_at >= v_shift.opened_at AND o.paid_at <= now()
    LEFT JOIN public.tips t ON t.waiter_id = w.id AND t.restaurant_id = v_rest AND t.created_at >= v_shift.opened_at AND t.created_at <= now()
    WHERE w.restaurant_id = v_rest AND w.is_active = true GROUP BY w.id, w.name
  ) x;
  v_exp := v_shift.opening_cash + v_cash + v_ctips; v_diff := p_actual_cash - v_exp;
  UPDATE public.cash_shifts SET closed_by = auth.uid(), closed_at = now(), total_sales = v_total,
    cash_sales = v_cash, card_sales = v_card, transfer_sales = v_trans, qr_sales = v_qr,
    total_tips = v_ttips, cash_tips = v_ctips, card_tips = v_dtips, expected_cash = v_exp,
    actual_cash = p_actual_cash, cash_difference = v_diff, waiter_summary = v_wsum,
    orders_count = v_count, status = 'closed', notes = COALESCE(p_notes, notes)
  WHERE id = p_shift_id RETURNING * INTO v_shift;
  RETURN v_shift;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
