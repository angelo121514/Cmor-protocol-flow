-- CMOR FLOW - create_order: CRM link + item descriptions
-- Ensures QR orders create/update restaurant_customers and stores each menu
-- item description in orders.items for kitchen and CRM views.

BEGIN;

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
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant public.restaurants;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_size record;
  v_addon record;
  v_unit_price numeric;
  v_item_total numeric;
  v_items_sum numeric := 0;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_access_token uuid := gen_random_uuid();
  v_order_number text;
  v_items_to_insert jsonb := jsonb_build_array();
  v_now timestamptz := now();
  v_customer_id uuid := NULL;
BEGIN
  SELECT * INTO v_restaurant
  FROM public.restaurants
  WHERE id = p_restaurant_id
    AND is_active = true
    AND status IN ('active', 'trial');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
  END IF;

  IF v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now THEN
    RETURN jsonb_build_object('success', false, 'error', 'trial_expired');
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
  END IF;

  IF NULLIF(trim(COALESCE(p_customer_phone, '')), '') IS NOT NULL
     AND NULLIF(trim(COALESCE(p_customer_name, '')), '') IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.restaurant_customers
    WHERE restaurant_id = p_restaurant_id
      AND phone = trim(p_customer_phone)
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1;

    IF v_customer_id IS NULL THEN
      INSERT INTO public.restaurant_customers (
        restaurant_id,
        name,
        phone,
        email,
        created_at,
        updated_at
      ) VALUES (
        p_restaurant_id,
        trim(p_customer_name),
        trim(p_customer_phone),
        NULLIF(trim(COALESCE(p_customer_email, '')), ''),
        v_now,
        v_now
      )
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
    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = p_restaurant_id
      AND is_available = true;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'item_not_available',
        'menu_item_id', v_item->>'menu_item_id'
      );
    END IF;

    v_unit_price := v_menu_item.base_price;

    IF v_item ? 'selected_size' AND (v_item->'selected_size'->>'id') IS NOT NULL THEN
      SELECT * INTO v_size
      FROM public.menu_item_sizes
      WHERE id = (v_item->'selected_size'->>'id')::uuid
        AND menu_item_id = v_menu_item.id;

      IF FOUND THEN
        v_unit_price := v_size.price;
      END IF;
    END IF;

    IF v_item ? 'selected_addons' AND jsonb_array_length(v_item->'selected_addons') > 0 THEN
      FOR v_addon IN
        SELECT * FROM public.menu_item_addons
        WHERE id = ANY (
          SELECT (addon->>'id')::uuid FROM jsonb_array_elements(v_item->'selected_addons') AS addon
        )
        AND menu_item_id = v_menu_item.id
      LOOP
        v_unit_price := v_unit_price + v_addon.price;
      END LOOP;
    END IF;

    v_item_total := v_unit_price * (v_item->>'quantity')::int;
    v_items_sum := v_items_sum + v_item_total;

    v_items_to_insert := v_items_to_insert || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_menu_item.id,
      'name', v_menu_item.name,
      'description', v_menu_item.description,
      'quantity', (v_item->>'quantity')::int,
      'base_price', v_menu_item.base_price,
      'unit_price', v_unit_price,
      'item_total', v_item_total,
      'selected_size', v_item->'selected_size',
      'selected_addons', v_item->'selected_addons'
    ));
  END LOOP;

  v_total := v_items_sum;
  v_subtotal := v_total / 1.19;
  v_tax := v_total - v_subtotal;
  v_order_number := public.generate_order_number_atomic();

  INSERT INTO public.orders (
    restaurant_id,
    order_number,
    customer_name,
    customer_phone,
    customer_id,
    order_type,
    table_number,
    customer_notes,
    subtotal,
    tax,
    total,
    payment_method,
    payment_status,
    status,
    items,
    access_token,
    created_at
  ) VALUES (
    p_restaurant_id,
    v_order_number,
    p_customer_name,
    p_customer_phone,
    v_customer_id,
    p_order_type,
    p_table_number,
    p_notes,
    v_subtotal,
    v_tax,
    v_total,
    p_payment_method,
    'pending',
    'pending',
    v_items_to_insert,
    v_access_token,
    v_now
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total,
    'item_count', jsonb_array_length(p_items),
    'customer_id', v_customer_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;

COMMIT;
