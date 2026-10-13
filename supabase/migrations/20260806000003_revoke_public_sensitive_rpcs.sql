-- Fase 3: las acciones financieras y destructivas no son RPC públicas.

REVOKE ALL ON FUNCTION public.complete_session_payment(uuid, numeric, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session_payment(uuid, numeric, text)
TO service_role;

REVOKE ALL ON FUNCTION public.run_retention_sweep()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_retention_sweep()
TO service_role;
