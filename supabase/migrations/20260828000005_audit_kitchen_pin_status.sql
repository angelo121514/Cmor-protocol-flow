-- =====================================================================
-- Migración 20260828000005_audit_kitchen_pin_status.sql
-- Auditoría 2026-08-28 — complemento del cierre de S-3.
--
-- `kitchen_pin_hash` ya no es legible por el cliente, pero la página de
-- Configuración lo usaba sólo para mostrar si el PIN estaba configurado.
-- Esta RPC expone ese booleano sin revelar el hash.
-- =====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.kitchen_pin_is_set(
  p_restaurant_id uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_my_restaurant(p_restaurant_id)
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = p_restaurant_id AND r.kitchen_pin_hash IS NOT NULL
    );
$$;

REVOKE ALL ON FUNCTION public.kitchen_pin_is_set(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kitchen_pin_is_set(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;