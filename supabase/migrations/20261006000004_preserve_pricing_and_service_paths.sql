BEGIN;
CREATE OR REPLACE FUNCTION public.auto_approve_registration_v2(
  p_request_id uuid,
  p_plan text DEFAULT 'free_trial'::text,
  p_payment_provider text DEFAULT 'trial'::text,
  p_transaction_id text DEFAULT NULL::text,
  p_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request registration_requests;
  v_restaurant_id uuid;
  v_trial_ends timestamptz;
  v_slug text;
  v_country text;
  v_currency text;
  v_language text;
  v_tax_rate numeric;
BEGIN
  IF p_plan NOT IN ('free_trial', 'starter', 'pro', 'lifetime', 'test_plan') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_plan');
  END IF;

  IF p_plan IN ('starter', 'pro', 'lifetime', 'test_plan')
     AND (NOT public.is_admin() AND NOT public.is_service_actor()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized_paid_plan',
      'message', 'Para activar un plan pago, el pago debe confirmarse vía webhook'
    );
  END IF;

  SELECT * INTO v_request
  FROM public.registration_requests
  WHERE id = p_request_id AND status = 'pending' FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'request_not_found_or_processed');
  END IF;

  IF v_request.email IS NULL OR btrim(v_request.email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'owner_email_required');
  END IF;

  -- Configuración regional efectiva de la solicitud (defaults legacy si vacío)
  v_country := COALESCE(NULLIF(btrim(COALESCE(v_request.country, '')), ''), 'CL');
  v_currency := CASE v_country
    WHEN 'BR' THEN 'BRL'
    WHEN 'BO' THEN 'BOB'
    WHEN 'PE' THEN 'PEN'
    ELSE 'CLP'
  END;
  v_language := CASE v_country WHEN 'BR' THEN 'pt' ELSE 'es' END;
  v_tax_rate := CASE v_country
    WHEN 'BR' THEN 0      -- sin desglose por defecto; el dueño configura su régimen
    WHEN 'BO' THEN 0.13
    WHEN 'PE' THEN 0.18
    ELSE 0.19
  END;

  v_trial_ends := CASE WHEN p_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END;

  v_slug := lower(regexp_replace(v_request.restaurant_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN
    v_slug := 'restaurante';
  END IF;
  v_slug := v_slug || '-' || substring(p_request_id::text, 1, 4);

  INSERT INTO public.restaurants (
    name, slug, email, owner_name, phone,
    subscription_plan, status, trial_ends_at, is_active,
    registration_request_id, country, currency, default_language, tax_rate
  ) VALUES (
    v_request.restaurant_name,
    v_slug,
    v_request.email,
    v_request.owner_name,
    v_request.phone,
    p_plan,
    CASE WHEN p_plan = 'free_trial' THEN 'trial' ELSE 'active' END,
    v_trial_ends,
    true,
    p_request_id,
    v_country, v_currency, v_language, v_tax_rate
  )
  RETURNING id INTO v_restaurant_id;

  UPDATE public.invitations
  SET status = 'cancelled'
  WHERE restaurant_id = v_restaurant_id
    AND status IN ('pending', 'sent');

  INSERT INTO public.invitations (restaurant_id, email, role, expires_at)
  VALUES (v_restaurant_id, v_request.email, 'owner', now() + interval '7 days');

  UPDATE public.registration_requests
  SET status = 'verified',
      updated_at = now(),
      internal_notes = jsonb_build_object(
        'plan', p_plan,
        'payment_provider', p_payment_provider,
        'transaction_id', p_transaction_id,
        'amount', p_amount,
        'billing_type', CASE WHEN p_plan = 'lifetime' THEN 'one_time' ELSE 'recurring' END,
        'auto_approved', true,
        'approved_at', now()
      )
  WHERE id = p_request_id;

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'trial_ends_at', v_trial_ends,
    'is_lifetime', p_plan = 'lifetime'
  );
END;
$function$;
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
  IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  SELECT s.id, s.restaurant_id, s.table_id, s.status, s.tip_amount
    INTO v_session FROM public.table_sessions s WHERE s.id = p_session_id FOR UPDATE;
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
CREATE OR REPLACE FUNCTION public.create_restaurant_branch(
  p_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_address text,
  p_restaurant_type text,
  p_subscription_plan text,
  p_status text,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_new_restaurant_id uuid;
  v_parent record;
BEGIN
  -- 1. Obtener el ID del usuario autenticado
  v_user_id := auth.uid();
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user_id AND (role='owner' OR (role='admin' AND public.is_admin()))) THEN
    RAISE EXCEPTION 'owner_role_required' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_user_id FOR UPDATE;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Restaurante padre: el primario del usuario. La sucursal HEREDA
  --    su suscripción (plan/estado/trial) — el cliente no puede elegir
  --    plan ni estado (bypass de pago cerrado).
  SELECT r.country, r.currency, r.default_language, r.tax_rate,
         r.subscription_plan, r.status, r.trial_ends_at
    INTO v_parent
    FROM public.restaurants r
    JOIN public.profile_restaurants pr ON pr.restaurant_id = r.id
    WHERE pr.profile_id = v_user_id AND pr.is_primary = true
    LIMIT 1;

  IF v_parent IS NULL THEN RAISE EXCEPTION 'primary_restaurant_required' USING ERRCODE='22023'; END IF;
  -- 3. Insertar el nuevo restaurante (config regional + suscripción heredadas)
  INSERT INTO public.restaurants (
    name, email, phone, city, address, restaurant_type,
    subscription_plan, status, is_active, trial_ends_at,
    country, currency, default_language, tax_rate
  ) VALUES (
    p_name, p_email, p_phone, p_city, p_address, p_restaurant_type,
    COALESCE(v_parent.subscription_plan, 'free_trial'),
    COALESCE(v_parent.status, 'trial'),
    true,
    v_parent.trial_ends_at,
    COALESCE(v_parent.country, 'CL'),
    COALESCE(v_parent.currency, 'CLP'),
    COALESCE(v_parent.default_language, 'es'),
    COALESCE(v_parent.tax_rate, 0.19)
  ) RETURNING id INTO v_new_restaurant_id;

  -- 4. Crear la asociación en la tabla puente
  INSERT INTO public.profile_restaurants (
    profile_id, restaurant_id, is_primary
  ) VALUES (
    v_user_id, v_new_restaurant_id, false
  );

  RETURN v_new_restaurant_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public._create_order_priced_internal(
  p_restaurant_id uuid,
  p_items jsonb,
  p_customer_name text DEFAULT NULL::text,
  p_customer_phone text DEFAULT NULL::text,
  p_customer_email text DEFAULT NULL::text,
  p_order_type text DEFAULT 'qr'::text,
  p_table_number text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_payment_method text DEFAULT 'qr'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
  END IF;

  SELECT * INTO v_restaurant FROM public.restaurants
  WHERE id = p_restaurant_id AND is_active = true AND status IN ('active', 'trial');
  IF NOT FOUND OR (v_restaurant.status = 'trial' AND (v_restaurant.trial_ends_at IS NULL OR v_restaurant.trial_ends_at <= v_now)) THEN
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

  -- Impuesto configurable por restaurante (antes: literal 1.19). Para
  -- restaurantes chilenos (tax_rate=0.19) el resultado es idéntico.
  v_tax_rate := COALESCE(v_restaurant.tax_rate, 0.19);
  v_total := round(v_items_sum, CASE WHEN v_restaurant.currency='CLP' THEN 0 ELSE 2 END);
  v_subtotal := round(v_total / (1 + v_tax_rate), CASE WHEN v_restaurant.currency='CLP' THEN 0 ELSE 2 END);
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
$function$;
CREATE OR REPLACE FUNCTION public.validate_public_order_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_quantity_text text;
  v_headers jsonb;
  v_client_ip text;
  v_allowed boolean;
  v_rest_status text;
  v_trial_ends timestamptz;
  v_plan text;
BEGIN
  -- Corte de servicio: bloqueados y trials vencidos no aceptan pedidos.
  -- service_role (webhooks internos) mantiene acceso total.
  IF NOT public.is_service_actor() THEN
    SELECT r.status, r.trial_ends_at, r.subscription_plan
      INTO v_rest_status, v_trial_ends, v_plan
      FROM public.restaurants r
      WHERE r.id = NEW.restaurant_id;

    IF v_rest_status IS NULL
       OR v_rest_status = 'blocked'
       OR v_rest_status NOT IN ('active', 'trial')
       OR (v_plan = 'free_trial' AND v_trial_ends IS NOT NULL AND v_trial_ends <= now())
    THEN
      RAISE EXCEPTION 'service_unavailable' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.total IS NULL OR NEW.total <= 0
     OR NEW.subtotal IS NULL OR NEW.subtotal < 0
     OR NEW.tax IS NULL OR NEW.tax < 0 THEN
    RAISE EXCEPTION 'invalid_order_amount' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(NEW.items) <> 'array'
     OR jsonb_array_length(NEW.items) = 0
     OR jsonb_array_length(NEW.items) > 50 THEN
    RAISE EXCEPTION 'invalid_order_items' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(NEW.items) LOOP
    v_quantity_text := v_item ->> 'quantity';
    IF jsonb_typeof(v_item) <> 'object'
       OR v_quantity_text IS NULL
       OR v_quantity_text !~ '^[1-9][0-9]*$'
       OR v_quantity_text::integer > 100 THEN
      RAISE EXCEPTION 'invalid_item_quantity' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- PostgREST entrega estos headers sólo en peticiones HTTP. Procesos internos
  -- (webhooks/service_role) siguen funcionando sin depender de una IP.
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  v_client_ip := COALESCE(
    NULLIF(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''),
    NULLIF(v_headers ->> 'x-real-ip', '')
  );

  IF v_client_ip IS NOT NULL THEN
    v_allowed := public.check_rate_limit(
      'order:' || NEW.restaurant_id::text || ':' || v_client_ip,
      'ip',
      'public_create_order',
      20,
      5
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'order_rate_limit_exceeded' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._create_order_priced_internal(uuid,jsonb,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
COMMIT;
