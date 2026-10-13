-- Fase 6: RPC set_kitchen_pin para que el dueño setee/regenere el PIN de cocina.
-- El frontend envía el PIN en claro; la RPC lo hashea con pgcrypto (igual que
-- create_waiter en Fase 2). Así el PIN en claro nunca se persiste y el hasheado
-- se hace server-side.
-- Validación de ownership con is_my_restaurant (RAISE 42501 si no es el dueño).

BEGIN;

CREATE OR REPLACE FUNCTION public.set_kitchen_pin(
  p_restaurant_id uuid,
  p_pin text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 32 THEN
    RAISE EXCEPTION 'PIN debe tener entre 4 y 32 caracteres' USING ERRCODE = '23514';
  END IF;
  UPDATE public.restaurants
    SET kitchen_pin_hash = crypt(p_pin, gen_salt('bf'))
    WHERE id = p_restaurant_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_kitchen_pin(uuid, text) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.set_kitchen_pin(uuid, text);
