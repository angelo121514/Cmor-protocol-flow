-- Phase 5: make a fresh Supabase project usable through PostgREST.
--
-- RLS policies define *which rows* a role may access, but PostgreSQL table
-- privileges are evaluated first. Historical environments had these grants
-- configured outside the migration history, so a clean `db reset` could log
-- in but could not read `profiles` or any of the restaurant workspace data.
-- Keep the grants limited to tables already protected by RLS; the policies
-- remain the authorization boundary.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.cash_shifts,
  public.flow_customers,
  public.flow_invoices,
  public.flow_payments,
  public.inventory_items,
  public.inventory_movements,
  public.menu_categories,
  public.menu_items,
  public.notifications,
  public.order_payments,
  public.orders,
  public.profile_restaurants,
  public.profiles,
  public.recipe_ingredients,
  public.recipes,
  public.restaurant_customers,
  public.restaurant_tables,
  public.restaurants,
  public.table_sessions,
  public.tips,
  public.waiter_sessions,
  public.waiters
TO authenticated;

-- Public customer flows. RLS policies constrain these operations to available
-- menu data and valid public order writes; this grant does not bypass RLS.
GRANT SELECT ON TABLE public.restaurants, public.menu_categories, public.menu_items TO anon;
GRANT INSERT ON TABLE public.orders, public.payment_intents, public.rate_limits,
  public.registration_requests TO anon;
