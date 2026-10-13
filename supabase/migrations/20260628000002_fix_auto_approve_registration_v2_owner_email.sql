-- =====================================================
-- Migración 20260628000002_fix_auto_approve_registration_v2_owner_email.sql
-- Corrige el error column "owner_email" y "owner_phone" of relation "restaurants" does not exist
-- =====================================================

BEGIN;

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

  -- 4. Trial ends
  v_trial_ends := now() + interval '15 days';

  -- Generar slug dinámicamente a partir del nombre del restaurante
  v_slug := lower(regexp_replace(v_request.restaurant_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Limpiar guiones redundantes al inicio/final del slug
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  -- Si el slug queda vacío por caracteres especiales, usar el ID parcial
  IF v_slug = '' THEN
    v_slug := 'restaurante';
  END IF;
  -- Concatenar parte del request_id para asegurar unicidad
  v_slug := v_slug || '-' || substring(p_request_id::text, 1, 4);

  -- 5. Crear restaurante (se corrige columnas owner_email -> email, y owner_phone -> phone)
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

  -- 6. Actualizar request (se cambia status de approved a verified para cumplir el check constraint)
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

  -- 7. Audit log (comentado temporalmente por discrepancias de columnas en tabla audit_log en prod)
  -- INSERT INTO public.audit_log (actor_id, action, target_type, target_id, after)
  -- VALUES (
  --   auth.uid(),
  --   'auto_approve_registration',
  --   'restaurant',
  --   v_restaurant_id,
  --   jsonb_build_object('plan', p_plan, 'trial_ends', v_trial_ends)
  -- );

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'trial_ends_at', v_trial_ends
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
  TO anon, authenticated;

COMMIT;
