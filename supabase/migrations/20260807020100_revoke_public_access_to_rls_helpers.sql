-- PostgreSQL concede EXECUTE a PUBLIC por defecto. Estos helpers se usan en
-- políticas RLS y sólo los usuarios autenticados necesitan invocarlos.
BEGIN;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_my_restaurant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_restaurant(uuid) TO authenticated;
COMMIT;
