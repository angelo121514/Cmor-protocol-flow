-- Public menu reads must not execute owner-only RLS helpers as `anon`.
-- PostgreSQL checks function EXECUTE privileges while evaluating the policy
-- expression, even when the public branch of an OR condition would allow the
-- row. Keep the helper private to authenticated users and scope owner policies
-- accordingly.

ALTER POLICY restaurants_owner_select ON public.restaurants TO authenticated;

DROP POLICY IF EXISTS restaurants_public_menu_select ON public.restaurants;
CREATE POLICY restaurants_public_menu_select
  ON public.restaurants
  FOR SELECT
  TO anon
  USING (is_active = true AND status IN ('active', 'trial'));

ALTER POLICY "Restaurant owners and admins can manage menu categories"
  ON public.menu_categories TO authenticated;

ALTER POLICY "Restaurant owners and admins can manage menu items"
  ON public.menu_items TO authenticated;
