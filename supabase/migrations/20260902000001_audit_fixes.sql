-- =====================================================================
-- Migración 20260902000001_audit_fixes.sql
-- Correcciones de la auditoría post-implementación (3 revisores).
--
--   1. registration_requests.country: CHECK de país (defensa en
--      profundidad; la RPC ya normaliza valores inesperados a CL).
--   2. create_restaurant_branch: la sucursal HEREDA subscription_plan,
--      status y trial_ends_at del restaurante padre — cierra el bypass
--      por el que un owner podía auto-asignarse 'pro'/'active' vía los
--      parámetros p_subscription_plan/p_status (los params se mantienen
--      en la firma por compatibilidad pero se ignoran).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) registration_requests.country: CHECK
--    (filas existentes: todas 'CL' por DEFAULT — compatibles)
-- ---------------------------------------------------------------------
ALTER TABLE public.registration_requests
  DROP CONSTRAINT IF EXISTS registration_requests_country_check;

ALTER TABLE public.registration_requests
  ADD CONSTRAINT registration_requests_country_check
  CHECK (country IN ('CL', 'BR', 'BO', 'PE'));

-- ---------------------------------------------------------------------
-- 2) create_restaurant_branch: heredar plan/estado del padre
--    (cierra bypass de auto-asignación de plan pago; parámetros
--    p_subscription_plan/p_status quedan en la firma pero ignorados)
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

NOTIFY pgrst, 'reload schema';

COMMIT;