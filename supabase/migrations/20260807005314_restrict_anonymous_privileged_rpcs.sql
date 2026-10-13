-- Las RPCs del panel no deben heredar EXECUTE de PUBLIC. Sólo se mantienen
-- públicas las operaciones de pedido QR, KDS y consultas que dependen de un
-- token opaco. Esta migración conserva los flujos de propietarios/staff con
-- un grant explícito a authenticated.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_create_restaurant_v2(uuid,text,text,text,text,text,text,text,text,text)',
    'public.admin_delete_restaurant(uuid)',
    'public.admin_invite_owner(uuid,text)',
    'public.admin_reject_request(uuid,text)',
    'public.admin_toggle_restaurant_status(uuid,boolean,text)',
    'public.can_close_split_order(uuid)',
    'public.close_cash_shift(uuid,numeric,text)',
    'public.create_restaurant_branch(text,text,text,text,text,text,text,text,boolean)',
    'public.create_waiter(uuid,text,text,text)',
    'public.deduct_inventory_for_order(uuid)',
    'public.end_waiter_session(uuid)',
    'public.get_avg_ticket(uuid,date,date)',
    'public.get_daily_sales(uuid,date,date)',
    'public.get_my_restaurant()',
    'public.get_reports_summary(uuid,date,date)',
    'public.get_sales_by_hour(uuid,date,date)',
    'public.get_sales_by_order_type(uuid,date,date)',
    'public.get_top_items(uuid,date,date,integer)',
    'public.is_flag_enabled(text,uuid)',
    'public.mark_notifications_read(uuid)',
    'public.open_cash_shift(uuid,numeric,text,uuid)',
    'public.set_kitchen_pin(uuid,text)',
    'public.update_waiter(uuid,text,text,text,boolean)',
    'public.validate_waiter_pin(uuid,text)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;
END;
$$;

-- RPCs internas/legacy: no son un contrato de API para el navegador.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_create_restaurant(uuid,text,text,text,text,text,text,text,text,text,text)',
    'public._deduct_inventory_for_order_internal(uuid)',
    'public._session_total_internal(uuid)',
    'public.generate_order_number_atomic()',
    'public.get_orders_policies()',
    'public.log_admin_action(text,text,uuid,jsonb,jsonb)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
