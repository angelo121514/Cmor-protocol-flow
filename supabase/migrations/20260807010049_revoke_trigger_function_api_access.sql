-- Trigger functions are invoked by PostgreSQL, not by PostgREST callers.
-- Do not expose them as RPC endpoints to browser roles.
DO $$
DECLARE
  function_name text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'public.handle_new_user()',
    'public.notify_order_event()',
    'public.on_order_completed_deduct_inventory()'
  ]
  LOOP
    IF to_regprocedure(function_name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', function_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_name);
    END IF;
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';
