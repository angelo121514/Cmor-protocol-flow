-- Fase 2: Gestión de Meseros y PIN (hasheado, opcional)
-- Crea waiters (con PIN hasheado bcrypt vía pgcrypto), waiter_sessions,
-- RPCs validate_waiter_pin y create_waiter (validan ownership), columnas
-- waiter_id/waiter_name en orders, y toggle pin_required en restaurants.
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. waiters (PIN HASHEADO con bcrypt; sin texto plano)
CREATE TABLE IF NOT EXISTS public.waiters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  pin_hash      text NOT NULL,            -- crypt(pin, gen_salt('bf'))
  is_active     boolean NOT NULL DEFAULT true,
  photo_url     text,
  phone         text,
  email         text,
  role          text NOT NULL DEFAULT 'waiter' CHECK (role IN ('waiter','bartender','host','cashier')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. waiter_sessions (turnos)
CREATE TABLE IF NOT EXISTS public.waiter_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id     uuid NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  tables_served integer DEFAULT 0,
  orders_count  integer DEFAULT 0,
  total_sales   decimal(10,2) DEFAULT 0,
  total_tips    decimal(10,2) DEFAULT 0
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_waiters_restaurant ON public.waiters(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_waiter_sessions_active ON public.waiter_sessions(restaurant_id) WHERE ended_at IS NULL;

-- Triggers updated_at (reusan update_updated_at_column() existente)
DROP TRIGGER IF EXISTS trg_waiters_updated_at ON public.waiters;
CREATE TRIGGER trg_waiters_updated_at BEFORE UPDATE ON public.waiters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages waiters" ON public.waiters;
CREATE POLICY "Owner manages waiters" ON public.waiters
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

ALTER TABLE public.waiter_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages waiter_sessions" ON public.waiter_sessions;
CREATE POLICY "Owner manages waiter_sessions" ON public.waiter_sessions
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

-- RPC: validar PIN (valida ownership; compara hash con crypt(); abre sesión)
-- Retorna datos del mesero + session_id. Si el PIN es incorrecto, retorna 0 filas
-- (sin revelar si fue el restaurante o el pin).
-- DROP previo: CREATE OR REPLACE no permite cambiar OUT parameters de una función existente.
DROP FUNCTION IF EXISTS public.validate_waiter_pin(uuid, text);
CREATE OR REPLACE FUNCTION public.validate_waiter_pin(
  p_restaurant_id uuid,
  p_pin text
) RETURNS TABLE(waiter_id uuid, waiter_name text, waiter_role text, session_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_row record;
  v_session uuid;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT w.id, w.name, w.role
    INTO v_row
    FROM public.waiters w
    WHERE w.restaurant_id = p_restaurant_id AND w.is_active = true
      AND crypt(p_pin, w.pin_hash) = w.pin_hash
    LIMIT 1;
  IF v_row IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.waiter_sessions(waiter_id, restaurant_id) VALUES (v_row.id, p_restaurant_id)
    RETURNING id INTO v_session;
  RETURN QUERY SELECT v_row.id, v_row.name, v_row.role, v_session;
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_waiter_pin(uuid,text) TO authenticated;

-- RPC: hashear y crear mesero (el frontend nunca manda pin_hash)
CREATE OR REPLACE FUNCTION public.create_waiter(
  p_restaurant_id uuid, p_name text, p_pin text, p_role text DEFAULT 'waiter'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.waiters(restaurant_id, name, pin_hash, role)
  VALUES (p_restaurant_id, p_name, crypt(p_pin, gen_salt('bf')), p_role)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_waiter(uuid,text,text,text) TO authenticated;

-- RPC: actualizar mesero (incluye re-hashear PIN si se provee)
-- search_path incluye extensions para poder usar crypt/gen_salt de pgcrypto.
CREATE OR REPLACE FUNCTION public.update_waiter(
  p_waiter_id uuid,
  p_name text DEFAULT NULL,
  p_pin text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_restaurant uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant FROM public.waiters WHERE id = p_waiter_id;
  IF v_restaurant IS NULL THEN
    RAISE EXCEPTION 'waiter not found' USING ERRCODE = '404';
  END IF;
  IF NOT public.is_my_restaurant(v_restaurant) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.waiters SET
    name      = COALESCE(p_name, name),
    pin_hash  = CASE WHEN p_pin IS NOT NULL THEN crypt(p_pin, gen_salt('bf')) ELSE pin_hash END,
    role      = COALESCE(p_role, role),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_waiter_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_waiter(uuid,text,text,text,boolean) TO authenticated;

-- RPC: cerrar sesión de mesero (fin de turno)
CREATE OR REPLACE FUNCTION public.end_waiter_session(p_session_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restaurant uuid;
BEGIN
  SELECT restaurant_id INTO v_restaurant FROM public.waiter_sessions WHERE id = p_session_id;
  IF v_restaurant IS NULL THEN
    RAISE EXCEPTION 'session not found' USING ERRCODE = '404';
  END IF;
  IF NOT public.is_my_restaurant(v_restaurant) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.waiter_sessions SET ended_at = now() WHERE id = p_session_id AND ended_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.end_waiter_session(uuid) TO authenticated;

-- Columnas en orders (idempotentes)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waiter_name text;

-- Toggle de PIN obligatorio en restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS pin_required boolean NOT NULL DEFAULT false;

COMMIT;

-- Rollback:
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS waiter_id, DROP COLUMN IF EXISTS waiter_name;
-- ALTER TABLE public.restaurants DROP COLUMN IF EXISTS pin_required;
-- DROP FUNCTION IF EXISTS public.end_waiter_session(uuid);
-- DROP FUNCTION IF EXISTS public.update_waiter(uuid,text,text,text,boolean);
-- DROP FUNCTION IF EXISTS public.create_waiter(uuid,text,text,text);
-- DROP FUNCTION IF EXISTS public.validate_waiter_pin(uuid,text);
-- DROP TABLE IF EXISTS public.waiter_sessions;
-- DROP TABLE IF EXISTS public.waiters;
