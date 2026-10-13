-- Fase 6: KDS (Kitchen Display System) con token de cocina
--
-- El KDS público (pantalla de cocina) NO tiene sesión de Supabase, así que no
-- puede escuchar orders_events por Realtime (RLS exige authenticated).
-- Solución: PIN de cocina dedicado (hasheado con pgcrypto) → RPC kitchen_login
-- emite un token opaco (32 bytes hex) → el KDS hace polling cada 5s sobre
-- kds_get_orders(token).
--
-- El KDS interno (/restaurant/kds, con login del dueño) SÍ usa subscribeToOrders
-- sobre orders_events y no necesita este token.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Columnas en restaurants: PIN de cocina hasheado + token de sesión opaco.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS kitchen_pin_hash text,
  ADD COLUMN IF NOT EXISTS kitchen_token text;

-- =========================================================================
-- kitchen_login: valida el PIN de cocina y emite un token de sesión.
-- Acceso PÚBLICO (anon): la pantalla de cocina no tiene sesión de Supabase.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.kitchen_login(
  p_restaurant_id uuid, p_pin text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text;
  v_token text;
BEGIN
  SELECT r.kitchen_pin_hash INTO v_hash
    FROM public.restaurants r
    WHERE r.id = p_restaurant_id
      AND r.is_active = true
      AND r.status IN ('active','trial');
  -- Mismo mensaje tanto si no existe el restaurante como si el PIN es erróneo
  -- (no filtrar por existencia).
  IF v_hash IS NULL OR p_pin IS NULL OR crypt(p_pin, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
  END IF;
  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.restaurants SET kitchen_token = v_token WHERE id = p_restaurant_id;
  RETURN v_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.kitchen_login(uuid, text) TO anon, authenticated;

-- =========================================================================
-- kds_get_orders: el KDS público obtiene los pedidos activos con su token.
-- Polling cada 5s (NO Realtime). Devuelve solo los campos que la cocina necesita,
-- sin access_token ni payment_transaction_id.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.kds_get_orders(p_kitchen_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_restaurant uuid;
  v_out jsonb;
BEGIN
  SELECT r.id INTO v_restaurant
    FROM public.restaurants r
    WHERE r.kitchen_token = p_kitchen_token
      AND r.is_active = true;
  IF v_restaurant IS NULL THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(
           to_jsonb(o)
             - 'access_token'
             - 'payment_transaction_id'
             ORDER BY o.created_at
         ), '[]'::jsonb)
    INTO v_out
    FROM public.orders o
    WHERE o.restaurant_id = v_restaurant
      AND o.status IN ('pending','accepted','preparing','ready');
  RETURN v_out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.kds_get_orders(text) TO anon, authenticated;

-- =========================================================================
-- kds_get_restaurant: datos mínimos del restaurante para el KDS público
-- (nombre para la cabecera). Valida con el mismo token.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.kds_get_restaurant(p_kitchen_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row record;
BEGIN
  SELECT r.id, r.name, r.default_prep_time
    INTO v_row
    FROM public.restaurants r
    WHERE r.kitchen_token = p_kitchen_token
      AND r.is_active = true;
  IF v_row IS NULL THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'default_prep_time', v_row.default_prep_time
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.kds_get_restaurant(text) TO anon, authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.kds_get_restaurant(text);
-- DROP FUNCTION IF EXISTS public.kds_get_orders(text);
-- DROP FUNCTION IF EXISTS public.kitchen_login(uuid, text);
-- ALTER TABLE public.restaurants
--   DROP COLUMN IF EXISTS kitchen_token,
--   DROP COLUMN IF EXISTS kitchen_pin_hash;
