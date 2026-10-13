-- =====================================================================
-- Migración 20260828000004_audit_scope_restaurant_visibility.sql
-- Auditoría 2026-08-28 — completa el cierre de S-3 para usuarios
-- autenticados.
--
-- `restaurants_owner_select` tenía una rama pública (is_active AND
-- status IN ('active','trial')) que permitía a CUALQUIER usuario
-- autenticado leer restaurantes ajenos. Con los grants de columna la
-- fuga directa ya está cerrada, pero Realtime entrega el payload
-- completo de la fila (los grants de columna no aplican a WAL), así
-- que la rama pública se elimina y la visibilidad queda:
--   - owner: sólo sus restaurantes (is_my_restaurant)
--   - admin: todas las filas vía policy is_admin()
--   - anon:  sólo menú público (restaurants_public_menu_select)
-- El panel admin obtiene los datos completos (internal_notes,
-- block_reason) mediante la RPC admin_list_restaurants().
-- =====================================================================
BEGIN;

DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;
CREATE POLICY restaurants_owner_select ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (public.is_my_restaurant(id));

CREATE POLICY restaurants_admin_select ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Lista completa para el panel admin (SECURITY DEFINER evita depender
-- de grants de columna). Excluye material de cocina por higiene.
CREATE OR REPLACE FUNCTION public.admin_list_restaurants()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      (to_jsonb(r) - 'kitchen_pin_hash' - 'kitchen_token' - 'kitchen_token_expires_at')
      ORDER BY r.created_at DESC
    ),
    '[]'::jsonb
  )
  FROM public.restaurants r
  WHERE public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.admin_list_restaurants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_restaurants() TO authenticated;

-- La policy legacy (tabla users) duplica permisos y depende de una tabla
-- muerta; restaurants_owner_update ya cubre el caso real.
DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON public.restaurants;

NOTIFY pgrst, 'reload schema';
COMMIT;