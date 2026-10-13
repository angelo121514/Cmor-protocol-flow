-- Cierra funciones SECURITY DEFINER heredadas que seguían accesibles a través
-- de PUBLIC (y por herencia a anon/authenticated). Se mantienen ejecutables
-- sólo por roles internos cuando éstos ya tienen el grant explícito.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_login(text,text)',
    'public.restaurant_login(text,text)',
    'public.rls_auto_enable()',
    'public.test_create_user(uuid,text,text)',
    'public.security_check_rls_status()',
    'public.security_check_security_definer()',
    'public.security_check_admin_users_grants()'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END;
$$;

-- Los chequeos operacionales se ejecutan exclusivamente con service_role.
GRANT EXECUTE ON FUNCTION public.security_check_rls_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.security_check_security_definer() TO service_role;
GRANT EXECUTE ON FUNCTION public.security_check_admin_users_grants() TO service_role;
