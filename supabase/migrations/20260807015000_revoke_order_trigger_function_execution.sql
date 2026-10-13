-- Es una función interna invocada exclusivamente por el trigger de orders;
-- no debe quedar invocable mediante la API PostgREST.
BEGIN;
REVOKE ALL ON FUNCTION public.enforce_order_payment_integrity() FROM PUBLIC, anon, authenticated;
COMMIT;
