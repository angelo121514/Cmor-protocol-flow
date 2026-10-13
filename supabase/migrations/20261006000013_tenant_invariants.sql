BEGIN;
-- Existing ambiguous/nonfinite data must be reconciled rather than silently replaced.
ALTER TABLE public.menu_items ADD CONSTRAINT menu_price_finite CHECK(base_price<>'NaN'::numeric);
ALTER TABLE public.orders ADD CONSTRAINT order_money_finite CHECK(total<>'NaN'::numeric AND subtotal<>'NaN'::numeric AND tax<>'NaN'::numeric);
ALTER TABLE public.restaurants ADD CONSTRAINT effective_tax_rate CHECK(tax_rate BETWEEN 0 AND 1);
CREATE FUNCTION public.validate_tenant_relations() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='menu_items' THEN
  IF NEW.category_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.menu_categories WHERE id=NEW.category_id AND restaurant_id=NEW.restaurant_id) THEN RAISE EXCEPTION 'cross_restaurant_category'; END IF;
 ELSIF TG_TABLE_NAME='tips' THEN
  IF NEW.order_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.orders WHERE id=NEW.order_id AND restaurant_id=NEW.restaurant_id)
   OR NEW.waiter_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.waiters WHERE id=NEW.waiter_id AND restaurant_id=NEW.restaurant_id) THEN RAISE EXCEPTION 'cross_restaurant_tip'; END IF;
 ELSIF TG_TABLE_NAME='table_sessions' THEN
  IF NOT EXISTS(SELECT 1 FROM public.restaurant_tables WHERE id=NEW.table_id AND restaurant_id=NEW.restaurant_id) THEN RAISE EXCEPTION 'cross_restaurant_session'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER menu_tenant_relation BEFORE INSERT OR UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_relations();
CREATE TRIGGER tip_tenant_relation BEFORE INSERT OR UPDATE ON public.tips FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_relations();
CREATE TRIGGER session_tenant_relation BEFORE INSERT OR UPDATE ON public.table_sessions FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_relations();
REVOKE ALL ON FUNCTION public.validate_tenant_relations() FROM PUBLIC,anon,authenticated;
-- Mutating a trial dish into a different tenant is forbidden, preserving quota accounting.
CREATE FUNCTION public.fixed_menu_tenant() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.restaurant_id<>OLD.restaurant_id THEN RAISE EXCEPTION 'menu_tenant_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fixed_menu_tenant BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.fixed_menu_tenant();
REVOKE ALL ON FUNCTION public.fixed_menu_tenant() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
