BEGIN;
-- Triggers/cron keep executing as their internal roles. Browser grants are explicit.
DO $$ DECLARE f record;
 public_names text[]:=ARRAY['is_admin','is_my_restaurant','create_order','get_my_order','get_table_by_token',
 'start_table_session_by_qr','get_session_by_token','get_table_orders','create_table_order','checkout_receipt',
 'kitchen_login','kds_get_orders','kds_get_restaurant','kds_update_order_status','validate_waiter_pin','end_waiter_session'];
 authenticated_names text[]:=ARRAY['switch_restaurant','consume_invitation','create_restaurant_branch','write_pos_order',
 'admin_create_restaurant_v2','admin_invite_owner','admin_list_restaurants','admin_reject_request','admin_toggle_restaurant_status','admin_delete_restaurant',
 'record_my_consent','review_dsar_rectification','admin_transition_dsar','restaurant_dashboard','mark_notifications_read',
 'open_cash_shift','close_cash_shift','save_recipe','adjust_inventory_stock','deduct_inventory_for_order',
 'can_close_split_order','create_waiter','update_waiter','set_kitchen_pin','kitchen_pin_is_set','get_avg_ticket',
 'get_daily_sales','get_reports_summary','get_sales_by_hour','get_sales_by_order_type','get_top_items'];
BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  IF f.proname=ANY(public_names) THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon,authenticated',f.signature);
  ELSIF f.proname=ANY(authenticated_names) THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
 END LOOP;
END $$;
ALTER TABLE public.rate_limits DROP CONSTRAINT rate_limits_identifier_type_check;
ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_identifier_type_check CHECK(identifier_type IN ('ip','email','resource'));
-- No caller-supplied proxy header is treated as an identity. Capabilities/resources bound the public paths.
CREATE FUNCTION public.public_order_budget() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE resource text; allowance int;
BEGIN
 IF public.is_service_actor() OR public.is_my_restaurant(NEW.restaurant_id) THEN RETURN NEW; END IF;
 resource:=COALESCE(NEW.table_session_id::text,NEW.restaurant_id::text); allowance:=CASE WHEN NEW.table_session_id IS NULL THEN 100 ELSE 20 END;
 IF NOT public.check_rate_limit(resource,'resource','create_order',allowance,5) THEN RAISE EXCEPTION 'order_rate_limit_exceeded'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER public_order_budget BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.public_order_budget();
REVOKE ALL ON FUNCTION public.public_order_budget() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.validate_recipe_parent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.menu_items WHERE id=NEW.menu_item_id AND restaurant_id=NEW.restaurant_id) THEN
  RAISE EXCEPTION 'cross_restaurant_recipe'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER recipe_parent BEFORE INSERT OR UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.validate_recipe_parent();
REVOKE ALL ON FUNCTION public.validate_recipe_parent() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
