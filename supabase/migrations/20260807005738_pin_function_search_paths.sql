-- Evita que funciones dependan del search_path que aporta el invocador.
-- Algunas funciones son legacy y no existen en instalaciones limpias; las
-- presentes se endurecen sin convertir esa ausencia en un fallo de migración.
DO $$
DECLARE
  signature text;
  target regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.admin_create_restaurant(uuid,text,text,text,text,text,text,text,text,text,text)',
    'public.admin_login(text,text)',
    'public.check_max_restaurants()',
    'public.generate_order_number()',
    'public.get_orders_policies()',
    'public.normalize_paid_subscription_status()',
    'public.restaurant_login(text,text)',
    'public.set_breach_updated_at()',
    'public.set_dsr_updated_at()',
    'public.set_order_number()',
    'public.update_updated_at_column()',
    'public.validate_image_urls()'
  ]
  LOOP
    target := to_regprocedure(signature);
    IF target IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', target);
    END IF;
  END LOOP;
END $$;
