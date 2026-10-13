BEGIN;
-- Contracts verified against a clean installation, including partitioned orders.
-- Historical rows stay NULL: no unverifiable customer identity is invented.
ALTER TABLE public.orders ADD COLUMN customer_email text;
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
  IF v_parent.subscription_plan NOT IN ('pro','enterprise') THEN RAISE EXCEPTION 'branch_plan_required' USING ERRCODE='42501'; END IF;
  IF NULLIF(trim(p_name),'') IS NULL OR NULLIF(trim(p_email),'') IS NULL OR NULLIF(trim(p_phone),'') IS NULL THEN RAISE EXCEPTION 'invalid_branch_input' USING ERRCODE='22023'; END IF;
  -- 3. Insertar el nuevo restaurante (config regional + suscripción heredadas)
  INSERT INTO public.restaurants (
    slug, name, email, phone, city, address, restaurant_type,
    subscription_plan, status, is_active, trial_ends_at,
    country, currency, default_language, tax_rate
  ) VALUES (
    'branch-'||extensions.gen_random_uuid()::text, p_name, p_email, p_phone, p_city, p_address, p_restaurant_type,
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
CREATE OR REPLACE FUNCTION public.validate_public_order_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_quantity_text text;
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

  -- Anonymous resource budgets are enforced by public_order_budget.
  -- Proxy headers never throttle trusted owners/automations or identify callers.
  RETURN NEW;
END;
$$;
NOTIFY pgrst,'reload schema';
COMMIT;
