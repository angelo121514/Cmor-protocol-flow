BEGIN;
CREATE OR REPLACE FUNCTION public.price_order_items(p_restaurant_id uuid,p_items jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
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
  v_tax_rate numeric;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'too_many_items' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_restaurant FROM public.restaurants
  WHERE id = p_restaurant_id AND is_active = true AND status IN ('active', 'trial');
  IF NOT FOUND OR (v_restaurant.status = 'trial' AND (v_restaurant.trial_ends_at IS NULL OR v_restaurant.trial_ends_at <= v_now)) THEN
    RAISE EXCEPTION 'restaurant_not_active' USING ERRCODE='22023';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    IF v_item->>'quantity' IS NULL OR v_item->>'quantity' !~ '^[1-9][0-9]{0,2}$' OR (v_item->>'quantity')::int>100 THEN
      RAISE EXCEPTION 'invalid_quantity' USING ERRCODE='22023'; END IF;
  END LOOP;
  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    IF NULLIF(v_item->>'menu_item_id', '') IS NULL
       OR COALESCE(NULLIF(v_item->>'quantity', '')::integer, 0) < 1 THEN
      RAISE EXCEPTION '%', 'invalid_item' USING ERRCODE='22023';
    END IF;

    SELECT * INTO v_menu_item FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
      AND restaurant_id = p_restaurant_id AND is_available = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_not_available' USING ERRCODE='22023';
    END IF;

    v_unit_price := v_menu_item.base_price;
    v_size := NULL;
    IF v_item ? 'selected_size' AND NULLIF(v_item->'selected_size'->>'name', '') IS NOT NULL THEN
      SELECT size_option.value INTO v_size
      FROM jsonb_array_elements(COALESCE(v_menu_item.sizes, '[]'::jsonb)) AS size_option(value)
      WHERE size_option.value->>'name' = v_item->'selected_size'->>'name'
      LIMIT 1;
      IF v_size IS NULL OR NULLIF(v_size->>'price', '') IS NULL THEN
        RAISE EXCEPTION '%', 'invalid_size' USING ERRCODE='22023';
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
          RAISE EXCEPTION '%', 'invalid_addon' USING ERRCODE='22023';
        END IF;
        v_unit_price := v_unit_price + (v_addon->>'price')::numeric;
        v_saved_addons := v_saved_addons || jsonb_build_array(v_addon);
      END LOOP;
    END IF;

    IF v_unit_price IS NULL OR v_unit_price<0 OR v_unit_price IN ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) THEN
      RAISE EXCEPTION 'invalid_catalog_price' USING ERRCODE='22023'; END IF;
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

  -- Impuesto configurable por restaurante (antes: literal 1.19). Para
  -- restaurantes chilenos (tax_rate=0.19) el resultado es idéntico.
  v_tax_rate := COALESCE(v_restaurant.tax_rate, 0.19);
  v_total := round(v_items_sum, CASE WHEN v_restaurant.currency='CLP' THEN 0 ELSE 2 END);
  v_subtotal := round(v_total / (1 + v_tax_rate), CASE WHEN v_restaurant.currency='CLP' THEN 0 ELSE 2 END);
  v_tax := v_total - v_subtotal;
  RETURN jsonb_build_object('items',v_items_to_insert,'total',v_total,'subtotal',v_subtotal,'tax',v_tax);
END;
$function$;
REVOKE ALL ON FUNCTION public.price_order_items(uuid,jsonb) FROM PUBLIC,anon,authenticated;
COMMIT;
