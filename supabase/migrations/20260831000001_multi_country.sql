-- =====================================================================
-- Migración 20260831000001_multi_country.sql
-- Soporte multi-país (Chile, Brasil, Bolivia, Perú) — Fase 1
--
-- ADITIVA POR DISEÑO: no elimina columnas ni constraints vigentes, no
-- toca RLS de filas. Los restaurantes existentes (todos chilenos)
-- quedan exactamente igual: country='CL' por DEFAULT, tax_rate=0.19.
--
-- Cambios:
--   1. restaurants: columnas country + tax_rate (CHECK + DEFAULT CL/0.19)
--   2. CHECKs ampliados: currency (CLP,USD,BRL,BOB,PEN) y
--      default_language (es,en,pt). Nombres verificados en producción
--      (restaurants_currency_check / restaurants_default_language_check).
--   3. registration_requests: columna country (grants a nivel de tabla,
--      no requieren cambios).
--   4. Grants por columna en restaurants: country y tax_rate se añaden a
--      SELECT (anon + authenticated) y UPDATE/INSERT (authenticated).
--      Sin esto PostgREST devuelve 42501 al seleccionar las columnas.
--   5. RPCs: impuesto por restaurante en create_order / create_table_order
--      (COALESCE(r.tax_rate, 0.19) en vez del literal 1.19);
--      auto_approve_registration_v2 y admin_create_restaurant_v2
--      propagan country/currency/tax_rate de la solicitud;
--      get_table_by_token devuelve la moneda del restaurante.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) restaurants: columnas country + tax_rate
-- ---------------------------------------------------------------------
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CL';

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.19;

-- CHECK del país (aditivo; el constraint es nuevo, no reemplaza nada)
-- Los DO blocks se evitan deliberadamente: nombres deterministas verificados.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.restaurants'::regclass
      AND conname = 'restaurants_country_check'
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_country_check
      CHECK (country IN ('CL', 'BR', 'BO', 'PE'));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) CHECKs ampliados (nombres verificados en prod 2026-08-31)
-- ---------------------------------------------------------------------
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_currency_check;

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_currency_check
  CHECK (currency IN ('CLP', 'USD', 'BRL', 'BOB', 'PEN'));

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_default_language_check;

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_default_language_check
  CHECK (default_language IN ('es', 'en', 'pt'));

-- ---------------------------------------------------------------------
-- 3) registration_requests: columna country (para el flujo de registro)
--    Grants a nivel de tabla → sin cambios de grants necesarios.
-- ---------------------------------------------------------------------
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CL';

-- ---------------------------------------------------------------------
-- 4) Grants por columna: country y tax_rate
--    (regla crítica PostgREST: sin SELECT en la columna, select= falla)
-- ---------------------------------------------------------------------
GRANT SELECT (country, tax_rate) ON TABLE public.restaurants TO anon;
GRANT SELECT (country, tax_rate) ON TABLE public.restaurants TO authenticated;
GRANT UPDATE (country, tax_rate) ON TABLE public.restaurants TO authenticated;
GRANT INSERT (country, tax_rate) ON TABLE public.restaurants TO authenticated;

ANALYZE public.restaurants;
ANALYZE public.registration_requests;

-- ---------------------------------------------------------------------
-- 5) RPC create_order: impuesto por restaurante en lugar del literal 1.19
--    Parche mínimo sobre la definición viva en prod (leída 2026-08-31):
--    solo cambia el cálculo subtotal/tax.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(
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

  -- Impuesto configurable por restaurante (antes: literal 1.19). Para
  -- restaurantes chilenos (tax_rate=0.19) el resultado es idéntico.
  v_tax_rate := COALESCE(v_restaurant.tax_rate, 0.19);
  v_total := v_items_sum;
  v_subtotal := v_total / (1 + v_tax_rate);
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

-- ---------------------------------------------------------------------
-- 6) RPC create_table_order: mismo parche de impuesto
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_table_order(p_session_token text, p_order_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_tax_rate numeric;
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

  -- Impuesto configurable por restaurante (antes: literal 1.19)
  v_tax_rate := COALESCE(v_restaurant.tax_rate, 0.19);
  v_total := v_subtotal;
  v_subtotal := v_total / (1 + v_tax_rate);
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
$function$;

-- ---------------------------------------------------------------------
-- 7) RPC get_table_by_token: devuelve moneda/idioma/país del restaurante
--    (TableQR necesita la moneda sin un fetch adicional). DROP+CREATE
--    obligatorio: cambia la firma del retorno.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_table_by_token(text);
CREATE OR REPLACE FUNCTION public.get_table_by_token(p_qr_token text)
RETURNS TABLE(
  id uuid,
  restaurant_id uuid,
  table_number text,
  capacity integer,
  status text,
  restaurant_currency text,
  restaurant_country text,
  restaurant_language text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_row record;
BEGIN
  SELECT t.id, t.restaurant_id, t.table_number, t.capacity, t.status,
         r.is_active AS r_active, r.status AS r_status,
         r.currency AS r_currency, r.country AS r_country,
         r.default_language AS r_language
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
                      v_row.capacity, v_row.status,
                      v_row.r_currency, v_row.r_country, v_row.r_language;
END;
$function$;

-- ---------------------------------------------------------------------
-- 8) RPC auto_approve_registration_v2 (webhook Flow): params opcionales
--    de país con defaults actuales — Flow la sigue llamando igual.
--    Los valores efectivos se leen de registration_requests.country.
-- ---------------------------------------------------------------------
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
     AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized_paid_plan',
      'message', 'Para activar un plan pago, el pago debe confirmarse vía webhook'
    );
  END IF;

  SELECT * INTO v_request
  FROM public.registration_requests
  WHERE id = p_request_id AND status = 'pending';

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

-- ---------------------------------------------------------------------
-- 9) RPC admin_create_restaurant_v2 (aprobación manual admin): hereda
--    país/config regional de la solicitud
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_restaurant_v2(
  p_request_id uuid,
  p_restaurant_name text,
  p_slug text,
  p_owner_name text,
  p_phone text,
  p_email text,
  p_city text,
  p_address text,
  p_subscription_plan text,
  p_internal_notes text
)
RETURNS TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_restaurant_id uuid;
  v_invitation_id uuid;
  v_country text;
  v_currency text;
  v_language text;
  v_tax_rate numeric;
BEGIN
  -- Solo admins pueden ejecutar
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, FALSE, 'Permiso denegado: se requiere rol admin';
    RETURN;
  END IF;

  -- Config regional leída de la solicitud (defaults legacy si vacía)
  SELECT COALESCE(NULLIF(btrim(COALESCE(rr.country, '')), ''), 'CL')
    INTO v_country
    FROM public.registration_requests rr
    WHERE rr.id = p_request_id;
  IF v_country IS NULL THEN
    v_country := 'CL';
  END IF;
  v_currency := CASE v_country
    WHEN 'BR' THEN 'BRL'
    WHEN 'BO' THEN 'BOB'
    WHEN 'PE' THEN 'PEN'
    ELSE 'CLP'
  END;
  v_language := CASE v_country WHEN 'BR' THEN 'pt' ELSE 'es' END;
  v_tax_rate := CASE v_country
    WHEN 'BR' THEN 0
    WHEN 'BO' THEN 0.13
    WHEN 'PE' THEN 0.18
    ELSE 0.19
  END;

  -- Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at,
    country, currency, default_language, tax_rate
  )
  VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan,
    CASE WHEN p_subscription_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END,
    true,
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END,
    v_country, v_currency, v_language, v_tax_rate
  )
  RETURNING id INTO v_restaurant_id;

  -- Crear invitación
  INSERT INTO public.invitations (restaurant_id, email, token, expires_at)
  VALUES (
    v_restaurant_id,
    p_email,
    encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
    now() + interval '7 days'
  )
  RETURNING id INTO v_invitation_id;

  -- Marcar solicitud como verificada
  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_restaurant_id, v_invitation_id, true, 'Restaurante e invitación creados con éxito';
END;
$function$;

-- ---------------------------------------------------------------------
-- 10) RPC create_restaurant_branch: la sucursal hereda país/moneda/tasa
--     del restaurante padre (el restaurante activo del usuario).
-- ---------------------------------------------------------------------
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Restaurante padre: el activo del usuario (hereda config regional)
  SELECT r.country, r.currency, r.default_language, r.tax_rate
    INTO v_parent
    FROM public.restaurants r
    JOIN public.profile_restaurants pr ON pr.restaurant_id = r.id
    WHERE pr.profile_id = v_user_id AND pr.is_primary = true
    LIMIT 1;

  -- 3. Insertar el nuevo restaurante
  INSERT INTO public.restaurants (
    name, email, phone, city, address, restaurant_type,
    subscription_plan, status, is_active,
    country, currency, default_language, tax_rate
  ) VALUES (
    p_name, p_email, p_phone, p_city, p_address, p_restaurant_type,
    p_subscription_plan, p_status, p_is_active,
    COALESCE(v_parent.country, 'CL'),
    COALESCE(v_parent.currency, 'CLP'),
    COALESCE(v_parent.default_language, 'es'),
    COALESCE(v_parent.tax_rate, 0.19)
  ) RETURNING id INTO v_new_restaurant_id;

  -- 4. Crear la asociación en la tabla puente
  -- El trigger 'enforce_max_restaurants' verificará automáticamente que no se excedan los 5 restaurantes
  INSERT INTO public.profile_restaurants (
    profile_id, restaurant_id, is_primary
  ) VALUES (
    v_user_id, v_new_restaurant_id, false
  );

  RETURN v_new_restaurant_id;
END;
$function$;

-- ---------------------------------------------------------------------
-- 11) RPC kds_get_restaurant: expone config regional (aditivo: jsonb con
--     claves nuevas; además devuelve el prep time real en vez de 15 fijo).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kds_get_restaurant(p_kitchen_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_row record;
BEGIN
  SELECT r.id, r.name, r.default_prep_time, r.country, r.currency,
         r.default_language
    INTO v_row
    FROM public.restaurants r
    WHERE r.kitchen_token = p_kitchen_token
      AND r.kitchen_token_expires_at > now()
      AND r.is_active = true;
  IF v_row IS NULL THEN RAISE EXCEPTION 'invalid' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'default_prep_time', COALESCE(v_row.default_prep_time, 15),
    'country', v_row.country,
    'currency', v_row.currency,
    'default_language', v_row.default_language
  );
END;
$function$;

NOTIFY pgrst, 'reload schema';

COMMIT;