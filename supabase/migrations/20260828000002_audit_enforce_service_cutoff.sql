-- =====================================================================
-- Migración 20260828000002_audit_enforce_service_cutoff.sql
-- Auditoría 2026-08-28 (Hallazgo B-5: el corte de trial sólo existía
-- en el frontend y en la RPC create_order; el INSERT directo legacy
-- y el flujo de pedidos de mesa quedaban fuera del corte).
--
-- 1) Extiende validate_public_order_write para rechazar pedidos de
--    restaurantes bloqueados o con trial expirado, sin importar si
--    llegan por RPC, INSERT legacy o mesa QR.
-- 2) Programa el corte automático diario (pg_cron): los free_trial
--    vencidos pasan a status='blocked'. Los owners pueden reactivar
--    pagando (el webhook de Flow re-activa con service_role).
-- =====================================================================
BEGIN;

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
  IF current_user <> 'service_role' THEN
    SELECT r.status, r.trial_ends_at, r.subscription_plan
      INTO v_rest_status, v_trial_ends, v_plan
      FROM public.restaurants r
      WHERE r.id = NEW.restaurant_id;

    IF v_rest_status IS NULL
       OR v_rest_status = 'blocked'
       OR v_rest_status NOT IN ('active', 'trial')
       OR (v_plan = 'free_trial' AND v_trial_ends IS NOT NULL AND v_trial_ends < now())
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

REVOKE ALL ON FUNCTION public.validate_public_order_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_public_order_write() TO service_role;

-- ---------------------------------------------------------------------
-- Corte automático diario de trials vencidos (pg_cron ya está instalado).
-- El sweep es idempotente y sólo toca free_trial, dejando rastro en
-- block_reason para que el owner entienda por qué quedó cortado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sweep_expired_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocked integer;
BEGIN
  UPDATE public.restaurants
  SET status = 'blocked',
      block_reason = COALESCE(block_reason, 'Trial de 14 días vencido'),
      updated_at = now()
  WHERE subscription_plan = 'free_trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < now()
    AND status <> 'blocked';

  GET DIAGNOSTICS v_blocked = ROW_COUNT;
  RETURN v_blocked;
END;
$$;

REVOKE ALL ON FUNCTION public.sweep_expired_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_expired_trials() TO service_role;

-- Ejecución diaria a las 04:00 UTC (madrugada de Chile continental).
SELECT cron.schedule(
  'sweep-expired-trials',
  '0 4 * * *',
  $cron$ SELECT public.sweep_expired_trials(); $cron$
)
WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');

NOTIFY pgrst, 'reload schema';
COMMIT;