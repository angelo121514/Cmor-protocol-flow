-- Ajustes finales detectados por db lint después de aplicar la reparación P0.
BEGIN;

-- Evita colisión entre la columna de retorno restaurant_id y la clave del
-- índice único durante ON CONFLICT.
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
  ON CONFLICT ON CONSTRAINT profile_restaurants_profile_id_restaurant_id_key
  DO UPDATE SET is_primary = true;
  UPDATE public.invitations SET status = 'consumed', consumed_at = now() WHERE id = v_inv.id;
  RETURN QUERY SELECT v_inv.restaurant_id, v_inv.email, TRUE;
END;
$$;

-- La carta y el POS manejan precios con IVA de 19% incluido. restaurants no
-- tiene tax_rate; la antigua referencia rompía los pedidos de mesa QR.
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

  v_total := v_subtotal;
  v_subtotal := v_total / 1.19;
  v_tax := v_total - v_subtotal;
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

-- Elimina la única advertencia de compilación sin cambiar el flujo de pago.
CREATE OR REPLACE FUNCTION public.complete_session_payment(
  p_session_id uuid,
  p_tip_amount numeric DEFAULT 0,
  p_transaction_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session record;
  v_waiter_id uuid;
  v_processed_count int := 0;
BEGIN
  SELECT s.id, s.restaurant_id, s.table_id, s.status, s.tip_amount
    INTO v_session FROM public.table_sessions s WHERE s.id = p_session_id LIMIT 1;
  IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'session_not_found'); END IF;
  IF v_session.status = 'closed' THEN RETURN jsonb_build_object('success', true, 'already_closed', true); END IF;

  WITH updated AS (
    UPDATE public.orders SET status = 'completed', payment_status = 'paid', payment_method = 'qr',
      payment_transaction_id = COALESCE(p_transaction_id, payment_transaction_id),
      completed_at = now(), updated_at = now()
    WHERE table_session_id = v_session.id AND status NOT IN ('completed','cancelled','rejected')
    RETURNING id
  ) SELECT count(*) INTO v_processed_count FROM updated;

  IF p_tip_amount > 0 THEN
    SELECT o.waiter_id INTO v_waiter_id FROM public.orders o
    WHERE o.table_session_id = v_session.id AND o.waiter_id IS NOT NULL
    ORDER BY o.created_at DESC LIMIT 1;
    INSERT INTO public.tips(restaurant_id, order_id, waiter_id, amount, percentage, payment_method, status)
    VALUES (v_session.restaurant_id, NULL, v_waiter_id, p_tip_amount, NULL, 'qr', 'collected');
  END IF;

  UPDATE public.table_sessions SET status = 'closed', closed_at = now(), tip_amount = p_tip_amount WHERE id = v_session.id;
  UPDATE public.restaurant_tables SET status = 'available' WHERE id = v_session.table_id;
  RETURN jsonb_build_object('success', true, 'orders_completed', v_processed_count, 'tip_amount', p_tip_amount);
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
