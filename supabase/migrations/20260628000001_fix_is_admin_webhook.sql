-- =====================================================================
-- Migración 20260628000001_fix_is_admin_webhook.sql
-- Corrige la función is_admin() para permitir que el rol 'service_role'
-- (utilizado por las Edge Functions de Webhooks) sea reconocido como admin.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT current_user IN ('service_role', 'postgres', 'supabase_admin')
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMIT;
