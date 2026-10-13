BEGIN;
-- Clean installations must declare backend privileges rather than depending on
-- dashboard default grants. This role is exclusively a trusted server actor;
-- human admins still require their authenticated AAL2 identity and RLS.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
 public.registration_requests,public.restaurants,public.menu_categories,public.menu_items,
 public.orders,public.notifications,public.profiles,public.invitations,public.consents,
 public.data_subject_requests,public.breach_register,public.profile_restaurants,
 public.restaurant_customers,public.feature_flags,public.payment_intents,public.rate_limits,
 public.flow_plans,public.flow_customers,public.flow_subscriptions,public.flow_payments,
 public.flow_invoices,public.flow_coupons,public.flow_webhook_events,public.orders_events,
 public.inventory_items,public.recipes,public.recipe_ingredients,public.inventory_movements,
 public.waiters,public.waiter_sessions,public.tips,public.order_payments,public.cash_shifts,
 public.restaurant_tables,public.table_sessions,public.ai_usage_log,
 public.accounting_config,public.accounting_documents,public.inventory_deduction_claims,
 public.order_operations,public.checkout_attempts,public.dsar_downloads,public.dsar_export_rows,
 public.provider_operations,public.browser_signals TO service_role;
GRANT SELECT,UPDATE ON public.accounting_cron_secret TO service_role;
GRANT SELECT,INSERT ON public.audit_log TO service_role;
REVOKE UPDATE,DELETE,TRUNCATE ON public.audit_log FROM service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
