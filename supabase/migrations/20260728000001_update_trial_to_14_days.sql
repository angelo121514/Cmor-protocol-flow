-- =====================================================================
-- Migración 20260728000001_update_trial_to_14_days.sql
-- ---------------------------------------------------------------------
-- Actualiza los RPCs para otorgar 14 días de prueba gratuita en lugar de 30.
-- =====================================================================

BEGIN;

-- 1. Actualizar función RPC admin_create_restaurant para soportar 14 días de prueba
CREATE OR REPLACE FUNCTION public.admin_create_restaurant(
  p_request_id UUID,
  p_restaurant_name TEXT,
  p_slug TEXT,
  p_owner_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_city TEXT,
  p_address TEXT,
  p_subscription_plan TEXT,
  p_password_hash TEXT,
  p_internal_notes TEXT
)
RETURNS TABLE (
  restaurant_id UUID,
  user_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_id UUID;
BEGIN
  -- Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at
  ) VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan, 
    CASE WHEN p_subscription_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END, 
    TRUE,
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END
  )
  RETURNING id INTO v_restaurant_id;

  -- Crear usuario owner
  INSERT INTO public.users (restaurant_id, email, password_hash, temp_password, role)
  VALUES (v_restaurant_id, p_email, p_password_hash, TRUE, 'owner')
  RETURNING id INTO v_user_id;

  -- Marcar solicitud como verificada
  UPDATE public.registration_requests
  SET status = 'verified', contacted_at = now(), internal_notes = p_internal_notes
  WHERE id = p_request_id;

  RETURN QUERY SELECT v_restaurant_id, v_user_id, TRUE, 'Restaurante creado exitosamente';
END;
$$;


-- 2. Actualizar función RPC admin_create_restaurant_v2 para soportar 14 días de prueba
CREATE OR REPLACE FUNCTION public.admin_create_restaurant_v2(
  p_request_id        uuid,
  p_restaurant_name   text,
  p_slug              text,
  p_owner_name        text,
  p_phone             text,
  p_email             text,
  p_city              text,
  p_address           text,
  p_subscription_plan text,
  p_internal_notes    text
)
RETURNS TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_invitation_id uuid;
BEGIN
  -- Solo admins pueden ejecutar
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, FALSE, 'Permiso denegado: se requiere rol admin';
    RETURN;
  END IF;

  -- Crear restaurante
  INSERT INTO public.restaurants (
    registration_request_id, name, slug, owner_name, phone, email,
    city, address, subscription_plan, status, is_active, trial_ends_at
  )
  VALUES (
    p_request_id, p_restaurant_name, p_slug, p_owner_name, p_phone, p_email,
    p_city, p_address, p_subscription_plan, 
    CASE WHEN p_subscription_plan = 'free_trial' THEN 'trial'::text ELSE 'active'::text END, 
    true,
    CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END
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
$$;


-- 3. Actualizar función RPC auto_approve_registration_v2 para soportar 14 días de prueba
CREATE OR REPLACE FUNCTION public.auto_approve_registration_v2(
  p_request_id uuid,
  p_plan text DEFAULT 'free_trial',
  p_payment_provider text DEFAULT 'trial',
  p_transaction_id text DEFAULT NULL,
  p_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request registration_requests;
  v_restaurant_id uuid;
  v_owner_id uuid;
  v_trial_ends timestamptz;
  v_slug text;
BEGIN
  -- 1. Validar plan
  IF p_plan NOT IN ('free_trial', 'starter', 'pro', 'test_plan') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_plan');
  END IF;

  -- 2. Para planes pagos, requerir verificación de transacción
  IF p_plan IN ('starter', 'pro', 'test_plan') AND p_payment_provider != 'trial' THEN
    IF NOT public.is_admin() THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'unauthorized_paid_plan',
        'message', 'Para activar un plan pago, el pago debe confirmarse vía webhook'
      );
    END IF;
  END IF;

  -- 3. Buscar la solicitud pendiente
  SELECT * INTO v_request
  FROM public.registration_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'request_not_found_or_processed');
  END IF;

  -- 4. Trial ends: 14 días
  v_trial_ends := now() + interval '14 days';

  -- Generar slug dinámicamente a partir del nombre del restaurante
  v_slug := lower(regexp_replace(v_request.restaurant_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN
    v_slug := 'restaurante';
  END IF;
  v_slug := v_slug || '-' || substring(p_request_id::text, 1, 4);

  -- 5. Crear restaurante
  INSERT INTO public.restaurants (
    name, slug, email, owner_name, phone,
    subscription_plan, status, trial_ends_at, is_active,
    registration_request_id
  ) VALUES (
    v_request.restaurant_name,
    v_slug,
    v_request.email,
    v_request.owner_name,
    v_request.phone,
    p_plan,
    'trial',
    v_trial_ends,
    true,
    p_request_id
  )
  RETURNING id INTO v_restaurant_id;

  -- 6. Actualizar request
  UPDATE public.registration_requests
  SET status = 'verified',
      updated_at = now(),
      internal_notes = jsonb_build_object(
        'plan', p_plan,
        'payment_provider', p_payment_provider,
        'transaction_id', p_transaction_id,
        'amount', p_amount,
        'auto_approved', true,
        'approved_at', now()
      )
  WHERE id = p_request_id;

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'trial_ends_at', v_trial_ends
  );
END;
$$;

-- Ajustar el trial de restaurantes en "free_trial" a 14 días a partir de su creación
UPDATE public.restaurants
SET trial_ends_at = created_at + interval '14 days'
WHERE subscription_plan = 'free_trial' 
  AND trial_ends_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
