-- Index foreign keys in active tables.  The two indexes on the partitioned
-- orders parent are propagated to its monthly partitions by PostgreSQL.
CREATE INDEX IF NOT EXISTS idx_breach_register_created_by ON public.breach_register (created_by);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_closed_by ON public.cash_shifts (closed_by);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_opened_by ON public.cash_shifts (opened_by);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_responsible_waiter ON public.cash_shifts (responsible_waiter_id);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_restaurant ON public.cash_shifts (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_dsr_fulfilled_by ON public.data_subject_requests (fulfilled_by);
CREATE INDEX IF NOT EXISTS idx_dsr_subject ON public.data_subject_requests (subject_id);

CREATE INDEX IF NOT EXISTS idx_flow_payments_restaurant ON public.flow_payments (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_flow_payments_subscription ON public.flow_payments (subscription_id);
CREATE INDEX IF NOT EXISTS idx_flow_subscriptions_customer ON public.flow_subscriptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_flow_subscriptions_plan ON public.flow_subscriptions (plan_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON public.inventory_movements (created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_restaurant ON public.inventory_movements (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_invitations_restaurant ON public.invitations (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items (category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON public.notifications (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_orders_table_session ON public.orders (table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON public.orders (waiter_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON public.recipes (menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON public.recipes (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurants_flow_customer ON public.restaurants (flow_customer_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_flow_subscription ON public.restaurants (flow_subscription_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_registration_request ON public.restaurants (registration_request_id);

-- subscriptions_payments pertenece a una integración legacy y no forma parte
-- del esquema base actual. Mantener sus índices donde la tabla aún exista,
-- sin bloquear una instalación limpia.
DO $$
BEGIN
  IF to_regclass('public.subscriptions_payments') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_payments_registration ON public.subscriptions_payments (registration_request_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_payments_restaurant ON public.subscriptions_payments (restaurant_id)';
  END IF;
END $$;
