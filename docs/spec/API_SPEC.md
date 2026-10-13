> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Especificación de APIs

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

Fecha de análisis: 2026-10-05 (America/Santiago). Commit base: `319a4d2a9bd88d2b1b16b3d61ef8ae7094a8948d`. Evidencia local; despliegue real DESCONOCIDO.

AS-IS. Tres superficies: `/functions/v1/*` (Edge), `/rest/v1/rpc/*` (PostgREST RPC) y `/rest/v1/<tabla>` (PostgREST). No se encontró OpenAPI/Swagger versionado: comparación formal N/A; comparar documentación previa en AUDIT_REPORT. Los tipos TS describen el cliente, no validan por sí mismos respuestas externas.

## Índice de contratos

| ID | Método | Ruta | Feature | Fuente |
| --- | --- | --- | --- | --- |
| API-001 | POST | /functions/v1/activate-trial-registration | FEAT-002 | [supabase/functions/activate-trial-registration/index.ts](<../../supabase/functions/activate-trial-registration/index.ts>) |
| API-002 | POST | /functions/v1/ai-recommendations | FEAT-020 | [supabase/functions/ai-recommendations/index.ts](<../../supabase/functions/ai-recommendations/index.ts>) |
| API-003 | GET | /functions/v1/accounting/config | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-004 | POST | /functions/v1/accounting/config | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-005 | POST | /functions/v1/accounting/emit | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-006 | POST | /functions/v1/accounting/sync | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-007 | GET | /functions/v1/accounting/documents | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-008 | POST | /functions/v1/accounting/credit-note | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-009 | POST | /functions/v1/accounting/documents/:id/artifact | FEAT-022 | [supabase/functions/accounting/index.ts](<../../supabase/functions/accounting/index.ts>) |
| API-010 | BODY JSON, sin restricción explícita de método | /functions/v1/create-payment-intent | FEAT-015 | [supabase/functions/create-payment-intent/index.ts](<../../supabase/functions/create-payment-intent/index.ts>) |
| API-011 | POST | /functions/v1/flow-checkout | FEAT-015 | [supabase/functions/flow-checkout/index.ts](<../../supabase/functions/flow-checkout/index.ts>) |
| API-012 | POST | /functions/v1/mp-checkout | FEAT-015 | [supabase/functions/mp-checkout/index.ts](<../../supabase/functions/mp-checkout/index.ts>) |
| API-013 | POST | /functions/v1/flow-customer/create | FEAT-018 | [supabase/functions/flow-customer/index.ts](<../../supabase/functions/flow-customer/index.ts>) |
| API-014 | POST | /functions/v1/flow-customer/register | FEAT-018 | [supabase/functions/flow-customer/index.ts](<../../supabase/functions/flow-customer/index.ts>) |
| API-015 | GET | /functions/v1/flow-customer/register-status | FEAT-018 | [supabase/functions/flow-customer/index.ts](<../../supabase/functions/flow-customer/index.ts>) |
| API-016 | POST | /functions/v1/flow-customer/unregister | FEAT-018 | [supabase/functions/flow-customer/index.ts](<../../supabase/functions/flow-customer/index.ts>) |
| API-017 | POST | /functions/v1/flow-subscription/sync-plans | FEAT-018 | [supabase/functions/flow-subscription/index.ts](<../../supabase/functions/flow-subscription/index.ts>) |
| API-018 | POST | /functions/v1/flow-subscription/create | FEAT-018 | [supabase/functions/flow-subscription/index.ts](<../../supabase/functions/flow-subscription/index.ts>) |
| API-019 | POST | /functions/v1/flow-subscription/cancel | FEAT-018 | [supabase/functions/flow-subscription/index.ts](<../../supabase/functions/flow-subscription/index.ts>) |
| API-020 | GET | /functions/v1/flow-subscription/status | FEAT-018 | [supabase/functions/flow-subscription/index.ts](<../../supabase/functions/flow-subscription/index.ts>) |
| API-021 | sin restricción explícita de método | /functions/v1/healthcheck | FEAT-024 | [supabase/functions/healthcheck/index.ts](<../../supabase/functions/healthcheck/index.ts>) |
| API-022 | sin restricción explícita de método | /functions/v1/invite-owner | FEAT-002 | [supabase/functions/invite-owner/index.ts](<../../supabase/functions/invite-owner/index.ts>) |
| API-023 | POST | /functions/v1/order-pay | FEAT-015 | [supabase/functions/order-pay/index.ts](<../../supabase/functions/order-pay/index.ts>) |
| API-024 | POST | /functions/v1/mp-webhook | FEAT-015 | [supabase/functions/mp-webhook/index.ts](<../../supabase/functions/mp-webhook/index.ts>) |
| API-025 | BODY JSON, sin restricción explícita de método | /functions/v1/privacy-access | FEAT-019 | [supabase/functions/privacy-access/index.ts](<../../supabase/functions/privacy-access/index.ts>) |
| API-026 | BODY JSON, sin restricción explícita de método | /functions/v1/privacy-erase | FEAT-019 | [supabase/functions/privacy-erase/index.ts](<../../supabase/functions/privacy-erase/index.ts>) |
| API-027 | BODY JSON, sin restricción explícita de método | /functions/v1/privacy-export | FEAT-019 | [supabase/functions/privacy-export/index.ts](<../../supabase/functions/privacy-export/index.ts>) |
| API-028 | BODY JSON, sin restricción explícita de método | /functions/v1/privacy-object | FEAT-019 | [supabase/functions/privacy-object/index.ts](<../../supabase/functions/privacy-object/index.ts>) |
| API-029 | BODY JSON, sin restricción explícita de método | /functions/v1/privacy-rectify | FEAT-019 | [supabase/functions/privacy-rectify/index.ts](<../../supabase/functions/privacy-rectify/index.ts>) |
| API-030 | BODY JSON, sin restricción explícita de método | /functions/v1/privacy-revoke-consent | FEAT-019 | [supabase/functions/privacy-revoke-consent/index.ts](<../../supabase/functions/privacy-revoke-consent/index.ts>) |
| API-031 | BODY JSON, sin restricción explícita de método | /functions/v1/verify-dsar | FEAT-019 | [supabase/functions/verify-dsar/index.ts](<../../supabase/functions/verify-dsar/index.ts>) |
| API-032 | GET/POST | /functions/v1/webhooks/flow | FEAT-015 | [supabase/functions/webhooks/flow/index.ts](<../../supabase/functions/webhooks/flow/index.ts>) |
| API-033 | GET/POST | /functions/v1/webhooks/webpay | FEAT-015 | [supabase/functions/webhooks/webpay/index.ts](<../../supabase/functions/webhooks/webpay/index.ts>) |
| API-034 | RPC candidato POST | /rest/v1/rpc/_deduct_inventory_for_order_internal | FEAT-010 | [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql:88](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql#L88>) |
| API-035 | RPC candidato POST | /rest/v1/rpc/_session_total_internal | FEAT-014 | [supabase/migrations/20260713000001_qr_tables.sql:225](<../../supabase/migrations/20260713000001_qr_tables.sql#L225>) |
| API-036 | RPC candidato POST | /rest/v1/rpc/accounting_dispatch_cron | FEAT-022 | [supabase/migrations/20260905000001_accounting_module.sql:134](<../../supabase/migrations/20260905000001_accounting_module.sql#L134>) |
| API-037 | RPC candidato POST | /rest/v1/rpc/adjust_inventory_stock | FEAT-010 | [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql:15](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql#L15>) |
| API-038 | RPC candidato POST | /rest/v1/rpc/admin_create_restaurant | FEAT-003 | [supabase/migrations/20260728000001_update_trial_to_14_days.sql:10](<../../supabase/migrations/20260728000001_update_trial_to_14_days.sql#L10>) |
| API-039 | RPC candidato POST | /rest/v1/rpc/admin_create_restaurant_v2 | FEAT-003 | [supabase/migrations/20260831000001_multi_country.sql:513](<../../supabase/migrations/20260831000001_multi_country.sql#L513>) |
| API-040 | RPC candidato POST | /rest/v1/rpc/admin_delete_restaurant | FEAT-003 | [supabase/migrations/20260624000000_admin_delete_restaurant.sql:70](<../../supabase/migrations/20260624000000_admin_delete_restaurant.sql#L70>) |
| API-041 | RPC candidato POST | /rest/v1/rpc/admin_invite_owner | FEAT-003 | [supabase/migrations/20260101000001_auth_profiles.sql:207](<../../supabase/migrations/20260101000001_auth_profiles.sql#L207>) |
| API-042 | RPC candidato POST | /rest/v1/rpc/admin_list_restaurants | FEAT-003 | [supabase/migrations/20260828000004_audit_scope_restaurant_visibility.sql:33](<../../supabase/migrations/20260828000004_audit_scope_restaurant_visibility.sql#L33>) |
| API-043 | RPC candidato POST | /rest/v1/rpc/admin_login | FEAT-003 | [supabase/migrations/20260101000000_initial_schema.sql:249](<../../supabase/migrations/20260101000000_initial_schema.sql#L249>) |
| API-044 | RPC candidato POST | /rest/v1/rpc/admin_reject_request | FEAT-003 | [supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql:97](<../../supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql#L97>) |
| API-045 | RPC candidato POST | /rest/v1/rpc/admin_toggle_restaurant_status | FEAT-003 | [supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql:58](<../../supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql#L58>) |
| API-046 | RPC candidato POST | /rest/v1/rpc/auto_approve_registration_v2 | FEAT-002 | [supabase/migrations/20260831000001_multi_country.sql:385](<../../supabase/migrations/20260831000001_multi_country.sql#L385>) |
| API-047 | RPC candidato POST | /rest/v1/rpc/can_close_split_order | FEAT-013 | [supabase/migrations/20260710000004_split_bills.sql:37](<../../supabase/migrations/20260710000004_split_bills.sql#L37>) |
| API-048 | RPC candidato POST | /rest/v1/rpc/check_max_restaurants | FEAT-004 | [supabase/migrations/20260101000007_multi_restaurant.sql:17](<../../supabase/migrations/20260101000007_multi_restaurant.sql#L17>) |
| API-049 | RPC candidato POST | /rest/v1/rpc/check_rate_limit | FEAT-006 | [supabase/migrations/20260622000013_p1_2_rate_limits.sql:28](<../../supabase/migrations/20260622000013_p1_2_rate_limits.sql#L28>) |
| API-050 | RPC candidato POST | /rest/v1/rpc/claim_flow_webhook_event | FEAT-006 | [supabase/migrations/20260806000004_harden_flow_webhook_idempotency.sql:6](<../../supabase/migrations/20260806000004_harden_flow_webhook_idempotency.sql#L6>) |
| API-051 | RPC candidato POST | /rest/v1/rpc/close_cash_shift | FEAT-017 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:467](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L467>) |
| API-052 | RPC candidato POST | /rest/v1/rpc/complete_session_payment | FEAT-014 | [supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql:122](<../../supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql#L122>) |
| API-053 | RPC candidato POST | /rest/v1/rpc/consume_invitation | FEAT-002 | [supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql:6](<../../supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql#L6>) |
| API-054 | RPC candidato POST | /rest/v1/rpc/create_order | FEAT-006 | [supabase/migrations/20260831000001_multi_country.sql:93](<../../supabase/migrations/20260831000001_multi_country.sql#L93>) |
| API-055 | RPC candidato POST | /rest/v1/rpc/create_restaurant_branch | FEAT-004 | [supabase/migrations/20260902000001_audit_fixes.sql:32](<../../supabase/migrations/20260902000001_audit_fixes.sql#L32>) |
| API-056 | RPC candidato POST | /rest/v1/rpc/create_table_order | FEAT-014 | [supabase/migrations/20260831000001_multi_country.sql:248](<../../supabase/migrations/20260831000001_multi_country.sql#L248>) |
| API-057 | RPC candidato POST | /rest/v1/rpc/create_waiter | FEAT-011 | [supabase/migrations/20260710000002_waiters.sql:95](<../../supabase/migrations/20260710000002_waiters.sql#L95>) |
| API-058 | RPC candidato POST | /rest/v1/rpc/deduct_inventory_for_order | FEAT-010 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:428](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L428>) |
| API-059 | RPC candidato POST | /rest/v1/rpc/end_waiter_session | FEAT-011 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:440](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L440>) |
| API-060 | RPC candidato POST | /rest/v1/rpc/enforce_order_payment_integrity | FEAT-006 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:15](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L15>) |
| API-061 | RPC candidato POST | /rest/v1/rpc/generate_order_number_atomic | FEAT-006 | [supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql:28](<../../supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql#L28>) |
| API-062 | RPC candidato POST | /rest/v1/rpc/get_avg_ticket | FEAT-009 | [supabase/migrations/20260710000008_notifications_usage.sql:142](<../../supabase/migrations/20260710000008_notifications_usage.sql#L142>) |
| API-063 | RPC candidato POST | /rest/v1/rpc/get_daily_sales | FEAT-009 | [supabase/migrations/20260710000008_notifications_usage.sql:73](<../../supabase/migrations/20260710000008_notifications_usage.sql#L73>) |
| API-064 | RPC candidato POST | /rest/v1/rpc/get_my_order | FEAT-006 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:284](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L284>) |
| API-065 | RPC candidato POST | /rest/v1/rpc/get_my_restaurant | FEAT-004 | [supabase/migrations/20260101000001_auth_profiles.sql:112](<../../supabase/migrations/20260101000001_auth_profiles.sql#L112>) |
| API-066 | RPC candidato POST | /rest/v1/rpc/get_reports_summary | FEAT-009 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:302](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L302>) |
| API-067 | RPC candidato POST | /rest/v1/rpc/get_sales_by_hour | FEAT-009 | [supabase/migrations/20260710000008_notifications_usage.sql:173](<../../supabase/migrations/20260710000008_notifications_usage.sql#L173>) |
| API-068 | RPC candidato POST | /rest/v1/rpc/get_sales_by_order_type | FEAT-009 | [supabase/migrations/20260710000008_notifications_usage.sql:204](<../../supabase/migrations/20260710000008_notifications_usage.sql#L204>) |
| API-069 | RPC candidato POST | /rest/v1/rpc/get_session_by_token | FEAT-014 | [supabase/migrations/20260713000001_qr_tables.sql:166](<../../supabase/migrations/20260713000001_qr_tables.sql#L166>) |
| API-070 | RPC candidato POST | /rest/v1/rpc/get_table_by_token | FEAT-014 | [supabase/migrations/20260831000001_multi_country.sql:342](<../../supabase/migrations/20260831000001_multi_country.sql#L342>) |
| API-071 | RPC candidato POST | /rest/v1/rpc/get_table_orders | FEAT-014 | [supabase/migrations/20260713000001_qr_tables.sql:191](<../../supabase/migrations/20260713000001_qr_tables.sql#L191>) |
| API-072 | RPC candidato POST | /rest/v1/rpc/get_top_items | FEAT-009 | [supabase/migrations/20260710000008_notifications_usage.sql:106](<../../supabase/migrations/20260710000008_notifications_usage.sql#L106>) |
| API-073 | RPC candidato POST | /rest/v1/rpc/handle_new_user | FEAT-002 | [supabase/migrations/20260806000002_secure_owner_activation.sql:3](<../../supabase/migrations/20260806000002_secure_owner_activation.sql#L3>) |
| API-074 | RPC candidato POST | /rest/v1/rpc/is_admin | FEAT-006 | [supabase/migrations/20260628000001_fix_is_admin_webhook.sql:9](<../../supabase/migrations/20260628000001_fix_is_admin_webhook.sql#L9>) |
| API-075 | RPC candidato POST | /rest/v1/rpc/is_flag_enabled | FEAT-006 | [supabase/migrations/20260622000003_p0_3_feature_flags.sql:33](<../../supabase/migrations/20260622000003_p0_3_feature_flags.sql#L33>) |
| API-076 | RPC candidato POST | /rest/v1/rpc/is_my_restaurant | FEAT-004 | [supabase/migrations/20260101000007_multi_restaurant.sql:57](<../../supabase/migrations/20260101000007_multi_restaurant.sql#L57>) |
| API-077 | RPC candidato POST | /rest/v1/rpc/kds_get_orders | FEAT-016 | [supabase/migrations/20260807020000_harden_public_kds_access.sql:67](<../../supabase/migrations/20260807020000_harden_public_kds_access.sql#L67>) |
| API-078 | RPC candidato POST | /rest/v1/rpc/kds_get_restaurant | FEAT-016 | [supabase/migrations/20260831000001_multi_country.sql:670](<../../supabase/migrations/20260831000001_multi_country.sql#L670>) |
| API-079 | RPC candidato POST | /rest/v1/rpc/kitchen_login | FEAT-016 | [supabase/migrations/20260807020000_harden_public_kds_access.sql:14](<../../supabase/migrations/20260807020000_harden_public_kds_access.sql#L14>) |
| API-080 | RPC candidato POST | /rest/v1/rpc/kitchen_pin_is_set | FEAT-016 | [supabase/migrations/20260828000005_audit_kitchen_pin_status.sql:11](<../../supabase/migrations/20260828000005_audit_kitchen_pin_status.sql#L11>) |
| API-081 | RPC candidato POST | /rest/v1/rpc/log_admin_action | FEAT-003 | [supabase/migrations/20260624000000_admin_delete_restaurant.sql:13](<../../supabase/migrations/20260624000000_admin_delete_restaurant.sql#L13>) |
| API-082 | RPC candidato POST | /rest/v1/rpc/mark_notifications_read | FEAT-023 | [supabase/migrations/20260710000008_notifications_usage.sql:50](<../../supabase/migrations/20260710000008_notifications_usage.sql#L50>) |
| API-083 | RPC candidato POST | /rest/v1/rpc/normalize_paid_subscription_status | FEAT-006 | [supabase/migrations/20260806000001_lifetime_plan.sql:150](<../../supabase/migrations/20260806000001_lifetime_plan.sql#L150>) |
| API-084 | RPC candidato POST | /rest/v1/rpc/notify_order_event | FEAT-006 | [supabase/migrations/20260629000003_realtime_orders_events_workaround.sql:47](<../../supabase/migrations/20260629000003_realtime_orders_events_workaround.sql#L47>) |
| API-085 | RPC candidato POST | /rest/v1/rpc/on_order_completed_deduct_inventory | FEAT-010 | [supabase/migrations/20260710000001_inventory.sql:213](<../../supabase/migrations/20260710000001_inventory.sql#L213>) |
| API-086 | RPC candidato POST | /rest/v1/rpc/open_cash_shift | FEAT-017 | [supabase/migrations/20260714000002_cash_shift_responsible.sql:26](<../../supabase/migrations/20260714000002_cash_shift_responsible.sql#L26>) |
| API-087 | RPC candidato POST | /rest/v1/rpc/restaurant_login | FEAT-006 | [supabase/migrations/20260101000000_initial_schema.sql:271](<../../supabase/migrations/20260101000000_initial_schema.sql#L271>) |
| API-088 | RPC candidato POST | /rest/v1/rpc/run_retention_sweep | FEAT-019 | [supabase/migrations/20260101000002_privacy_foundation.sql:307](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L307>) |
| API-089 | RPC candidato POST | /rest/v1/rpc/security_check_admin_users_grants | FEAT-003 | [supabase/migrations/20260101000002_privacy_foundation.sql:507](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L507>) |
| API-090 | RPC candidato POST | /rest/v1/rpc/security_check_rls_status | FEAT-003 | [supabase/migrations/20260101000002_privacy_foundation.sql:478](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L478>) |
| API-091 | RPC candidato POST | /rest/v1/rpc/security_check_security_definer | FEAT-003 | [supabase/migrations/20260101000002_privacy_foundation.sql:494](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L494>) |
| API-092 | RPC candidato POST | /rest/v1/rpc/set_breach_updated_at | FEAT-006 | [supabase/migrations/20260101000002_privacy_foundation.sql:429](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L429>) |
| API-093 | RPC candidato POST | /rest/v1/rpc/set_dsr_updated_at | FEAT-019 | [supabase/migrations/20260101000002_privacy_foundation.sql:271](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L271>) |
| API-094 | RPC candidato POST | /rest/v1/rpc/set_kitchen_pin | FEAT-016 | [supabase/migrations/20260713000004_kds_set_pin.sql:9](<../../supabase/migrations/20260713000004_kds_set_pin.sql#L9>) |
| API-095 | RPC candidato POST | /rest/v1/rpc/set_order_number | FEAT-006 | [supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql:45](<../../supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql#L45>) |
| API-096 | RPC candidato POST | /rest/v1/rpc/start_table_session | FEAT-014 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:355](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L355>) |
| API-097 | RPC candidato POST | /rest/v1/rpc/sweep_expired_trials | FEAT-006 | [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql:109](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql#L109>) |
| API-098 | RPC candidato POST | /rest/v1/rpc/update_waiter | FEAT-011 | [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:452](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L452>) |
| API-099 | RPC candidato POST | /rest/v1/rpc/validate_image_urls | FEAT-006 | [supabase/migrations/20260622000004_p0_8_validate_image_urls.sql:17](<../../supabase/migrations/20260622000004_p0_8_validate_image_urls.sql#L17>) |
| API-100 | RPC candidato POST | /rest/v1/rpc/validate_public_order_write | FEAT-006 | [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql:16](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql#L16>) |
| API-101 | RPC candidato POST | /rest/v1/rpc/validate_waiter_pin | FEAT-011 | [supabase/migrations/20260710000002_waiters.sql:66](<../../supabase/migrations/20260710000002_waiters.sql#L66>) |
| API-102 | GET | /rest/v1/profiles | FEAT-001 | [src/hooks/useAuth.ts:57](<../../src/hooks/useAuth.ts#L57>) |
| API-103 | GET | /rest/v1/profile_restaurants | FEAT-004 | [src/hooks/useAuth.ts:67](<../../src/hooks/useAuth.ts#L67>) |
| API-104 | GET | /rest/v1/restaurants | FEAT-004 | [src/hooks/useAuth.ts:74](<../../src/hooks/useAuth.ts#L74>) |
| API-105 | GET | /rest/v1/restaurants | FEAT-004 | [src/hooks/useAuth.ts:89](<../../src/hooks/useAuth.ts#L89>) |
| API-106 | PATCH | /rest/v1/profiles | FEAT-001 | [src/hooks/useAuth.ts:187](<../../src/hooks/useAuth.ts#L187>) |
| API-107 | GET | /rest/v1/flow_customers | FEAT-018 | [src/hooks/useFlowSubscription.ts:39](<../../src/hooks/useFlowSubscription.ts#L39>) |
| API-108 | GET | /rest/v1/profiles | FEAT-001 | [src/pages/admin/LoginPage.tsx:49](<../../src/pages/admin/LoginPage.tsx#L49>) |
| API-109 | GET | /rest/v1/restaurants | FEAT-004 | [src/pages/customer/CustomerMenu.tsx:507](<../../src/pages/customer/CustomerMenu.tsx#L507>) |
| API-110 | GET | /rest/v1/profiles | FEAT-001 | [src/pages/public/LoginPage.tsx:92](<../../src/pages/public/LoginPage.tsx#L92>) |
| API-111 | GET | /rest/v1/restaurants | FEAT-004 | [src/pages/public/LoginPage.tsx:113](<../../src/pages/public/LoginPage.tsx#L113>) |
| API-112 | GET | /rest/v1/registration_requests | FEAT-002 | [src/pages/public/LoginPage.tsx:196](<../../src/pages/public/LoginPage.tsx#L196>) |
| API-113 | GET | /rest/v1/profiles | FEAT-001 | [src/pages/public/LoginPage.tsx:215](<../../src/pages/public/LoginPage.tsx#L215>) |
| API-114 | GET | /rest/v1/restaurants | FEAT-004 | [src/pages/public/LoginPage.tsx:236](<../../src/pages/public/LoginPage.tsx#L236>) |
| API-115 | GET | /rest/v1/profiles | FEAT-001 | [src/pages/public/RegisterPage.tsx:115](<../../src/pages/public/RegisterPage.tsx#L115>) |
| API-116 | POST | /rest/v1/registration_requests | FEAT-002 | [src/pages/public/RegisterPage.tsx:212](<../../src/pages/public/RegisterPage.tsx#L212>) |
| API-117 | GET | /rest/v1/orders | FEAT-006 | [src/pages/restaurant/CashShift.tsx:100](<../../src/pages/restaurant/CashShift.tsx#L100>) |
| API-118 | GET | /rest/v1/waiters | FEAT-011 | [src/pages/restaurant/CashShift.tsx:204](<../../src/pages/restaurant/CashShift.tsx#L204>) |
| API-119 | GET | /rest/v1/orders | FEAT-006 | [src/pages/restaurant/Dashboard.tsx:77](<../../src/pages/restaurant/Dashboard.tsx#L77>) |
| API-120 | GET | /rest/v1/recipes | FEAT-010 | [src/pages/restaurant/Inventory.tsx:683](<../../src/pages/restaurant/Inventory.tsx#L683>) |
| API-121 | GET | /rest/v1/orders | FEAT-006 | [src/pages/restaurant/Pos.tsx:222](<../../src/pages/restaurant/Pos.tsx#L222>) |
| API-122 | GET | /rest/v1/orders | FEAT-006 | [src/pages/restaurant/Pos.tsx:1763](<../../src/pages/restaurant/Pos.tsx#L1763>) |
| API-123 | GET | /rest/v1/waiters | FEAT-011 | [src/pages/restaurant/Pos.tsx:1774](<../../src/pages/restaurant/Pos.tsx#L1774>) |
| API-124 | GET | /rest/v1/orders | FEAT-006 | [src/pages/restaurant/Pos.tsx:1804](<../../src/pages/restaurant/Pos.tsx#L1804>) |
| API-125 | GET | /rest/v1/orders | FEAT-006 | [src/pages/restaurant/Reports.tsx:76](<../../src/pages/restaurant/Reports.tsx#L76>) |
| API-126 | GET | /rest/v1/tips | FEAT-012 | [src/pages/restaurant/Reports.tsx:548](<../../src/pages/restaurant/Reports.tsx#L548>) |
| API-127 | GET | /rest/v1/inventory_items | FEAT-010 | [src/pages/restaurant/Reports.tsx:633](<../../src/pages/restaurant/Reports.tsx#L633>) |
| API-128 | GET | /rest/v1/waiters | FEAT-011 | [src/pages/restaurant/Reports.tsx:716](<../../src/pages/restaurant/Reports.tsx#L716>) |
| API-129 | GET | /rest/v1/cash_shifts | FEAT-017 | [src/pages/restaurant/Reports.tsx:811](<../../src/pages/restaurant/Reports.tsx#L811>) |
| API-130 | GET | /rest/v1/waiters | FEAT-011 | [src/pages/restaurant/Reports.tsx:817](<../../src/pages/restaurant/Reports.tsx#L817>) |
| API-131 | GET | /rest/v1/restaurants | FEAT-004 | [src/pages/restaurant/RestaurantSettings.tsx:157](<../../src/pages/restaurant/RestaurantSettings.tsx#L157>) |
| API-132 | PATCH | /rest/v1/restaurants | FEAT-004 | [src/pages/restaurant/RestaurantSettings.tsx:212](<../../src/pages/restaurant/RestaurantSettings.tsx#L212>) |
| API-133 | GET | /rest/v1/flow_payments | FEAT-018 | [src/pages/restaurant/Subscription.tsx:56](<../../src/pages/restaurant/Subscription.tsx#L56>) |
| API-134 | GET | /rest/v1/flow_invoices | FEAT-018 | [src/pages/restaurant/Subscription.tsx:66](<../../src/pages/restaurant/Subscription.tsx#L66>) |
| API-135 | GET | /rest/v1/orders | FEAT-006 | [src/services/accountingService.ts:205](<../../src/services/accountingService.ts#L205>) |
| API-136 | GET | /rest/v1/registration_requests | FEAT-002 | [src/services/adminService.ts:25](<../../src/services/adminService.ts#L25>) |
| API-137 | GET | /rest/v1/registration_requests | FEAT-002 | [src/services/adminService.ts:69](<../../src/services/adminService.ts#L69>) |
| API-138 | GET | /rest/v1/restaurants | FEAT-004 | [src/services/adminService.ts:300](<../../src/services/adminService.ts#L300>) |
| API-139 | GET | /rest/v1/registration_requests | FEAT-002 | [src/services/adminService.ts:304](<../../src/services/adminService.ts#L304>) |
| API-140 | GET | /rest/v1/orders | FEAT-006 | [src/services/adminService.ts:307](<../../src/services/adminService.ts#L307>) |
| API-141 | GET | /rest/v1/orders | FEAT-006 | [src/services/adminService.ts:309](<../../src/services/adminService.ts#L309>) |
| API-142 | GET | /rest/v1/cash_shifts | FEAT-017 | [src/services/cashShiftService.ts:56](<../../src/services/cashShiftService.ts#L56>) |
| API-143 | GET | /rest/v1/cash_shifts | FEAT-017 | [src/services/cashShiftService.ts:74](<../../src/services/cashShiftService.ts#L74>) |
| API-144 | GET | /rest/v1/notifications | FEAT-023 | [src/services/dashboardService.ts:35](<../../src/services/dashboardService.ts#L35>) |
| API-145 | GET | /rest/v1/orders | FEAT-006 | [src/services/dashboardService.ts:76](<../../src/services/dashboardService.ts#L76>) |
| API-146 | GET | /rest/v1/waiters | FEAT-011 | [src/services/dashboardService.ts:81](<../../src/services/dashboardService.ts#L81>) |
| API-147 | GET | /rest/v1/restaurant_tables | FEAT-014 | [src/services/dashboardService.ts:87](<../../src/services/dashboardService.ts#L87>) |
| API-148 | GET | /rest/v1/inventory_items | FEAT-010 | [src/services/dashboardService.ts:92](<../../src/services/dashboardService.ts#L92>) |
| API-149 | GET | /rest/v1/cash_shifts | FEAT-017 | [src/services/dashboardService.ts:97](<../../src/services/dashboardService.ts#L97>) |
| API-150 | GET | /rest/v1/tips | FEAT-012 | [src/services/dashboardService.ts:104](<../../src/services/dashboardService.ts#L104>) |
| API-151 | GET | /rest/v1/inventory_items | FEAT-010 | [src/services/inventoryService.ts:38](<../../src/services/inventoryService.ts#L38>) |
| API-152 | POST/GET | /rest/v1/inventory_items | FEAT-010 | [src/services/inventoryService.ts:47](<../../src/services/inventoryService.ts#L47>) |
| API-153 | PATCH/GET | /rest/v1/inventory_items | FEAT-010 | [src/services/inventoryService.ts:59](<../../src/services/inventoryService.ts#L59>) |
| API-154 | DELETE | /rest/v1/inventory_items | FEAT-010 | [src/services/inventoryService.ts:70](<../../src/services/inventoryService.ts#L70>) |
| API-155 | GET | /rest/v1/inventory_items | FEAT-010 | [src/services/inventoryService.ts:76](<../../src/services/inventoryService.ts#L76>) |
| API-156 | GET | /rest/v1/recipes | FEAT-010 | [src/services/inventoryService.ts:91](<../../src/services/inventoryService.ts#L91>) |
| API-157 | GET | /rest/v1/recipe_ingredients | FEAT-010 | [src/services/inventoryService.ts:100](<../../src/services/inventoryService.ts#L100>) |
| API-158 | POST upsert/GET | /rest/v1/recipes | FEAT-010 | [src/services/inventoryService.ts:119](<../../src/services/inventoryService.ts#L119>) |
| API-159 | DELETE | /rest/v1/recipe_ingredients | FEAT-010 | [src/services/inventoryService.ts:131](<../../src/services/inventoryService.ts#L131>) |
| API-160 | POST | /rest/v1/recipe_ingredients | FEAT-010 | [src/services/inventoryService.ts:145](<../../src/services/inventoryService.ts#L145>) |
| API-161 | GET | /rest/v1/inventory_movements | FEAT-010 | [src/services/inventoryService.ts:186](<../../src/services/inventoryService.ts#L186>) |
| API-162 | GET | /rest/v1/restaurants | FEAT-004 | [src/services/kdsService.ts:38](<../../src/services/kdsService.ts#L38>) |
| API-163 | POST/GET | /rest/v1/data_subject_requests | FEAT-019 | [src/services/privacyService.ts:98](<../../src/services/privacyService.ts#L98>) |
| API-164 | GET | /rest/v1/data_subject_requests | FEAT-019 | [src/services/privacyService.ts:128](<../../src/services/privacyService.ts#L128>) |
| API-165 | GET | /rest/v1/data_subject_requests | FEAT-019 | [src/services/privacyService.ts:141](<../../src/services/privacyService.ts#L141>) |
| API-166 | PATCH | /rest/v1/data_subject_requests | FEAT-019 | [src/services/privacyService.ts:166](<../../src/services/privacyService.ts#L166>) |
| API-167 | GET | /rest/v1/consents | FEAT-019 | [src/services/privacyService.ts:178](<../../src/services/privacyService.ts#L178>) |
| API-168 | POST | /rest/v1/consents | FEAT-019 | [src/services/privacyService.ts:198](<../../src/services/privacyService.ts#L198>) |
| API-169 | PATCH | /rest/v1/consents | FEAT-019 | [src/services/privacyService.ts:223](<../../src/services/privacyService.ts#L223>) |
| API-170 | GET | /rest/v1/consents | FEAT-019 | [src/services/privacyService.ts:233](<../../src/services/privacyService.ts#L233>) |
| API-171 | GET | /rest/v1/consents | FEAT-019 | [src/services/privacyService.ts:251](<../../src/services/privacyService.ts#L251>) |
| API-172 | GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:44](<../../src/services/restaurantService.ts#L44>) |
| API-173 | PATCH | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:149](<../../src/services/restaurantService.ts#L149>) |
| API-174 | GET | /rest/v1/menu_items | FEAT-005 | [src/services/restaurantService.ts:166](<../../src/services/restaurantService.ts#L166>) |
| API-175 | POST/GET | /rest/v1/menu_items | FEAT-005 | [src/services/restaurantService.ts:219](<../../src/services/restaurantService.ts#L219>) |
| API-176 | PATCH | /rest/v1/menu_items | FEAT-005 | [src/services/restaurantService.ts:237](<../../src/services/restaurantService.ts#L237>) |
| API-177 | PATCH | /rest/v1/menu_items | FEAT-005 | [src/services/restaurantService.ts:254](<../../src/services/restaurantService.ts#L254>) |
| API-178 | DELETE | /rest/v1/menu_items | FEAT-005 | [src/services/restaurantService.ts:263](<../../src/services/restaurantService.ts#L263>) |
| API-179 | POST/GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:289](<../../src/services/restaurantService.ts#L289>) |
| API-180 | GET | /rest/v1/restaurant_customers | FEAT-008 | [src/services/restaurantService.ts:306](<../../src/services/restaurantService.ts#L306>) |
| API-181 | PATCH | /rest/v1/restaurant_customers | FEAT-008 | [src/services/restaurantService.ts:322](<../../src/services/restaurantService.ts#L322>) |
| API-182 | POST | /rest/v1/restaurant_customers | FEAT-008 | [src/services/restaurantService.ts:326](<../../src/services/restaurantService.ts#L326>) |
| API-183 | PATCH/GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:391](<../../src/services/restaurantService.ts#L391>) |
| API-184 | GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:412](<../../src/services/restaurantService.ts#L412>) |
| API-185 | GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:417](<../../src/services/restaurantService.ts#L417>) |
| API-186 | GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:422](<../../src/services/restaurantService.ts#L422>) |
| API-187 | GET | /rest/v1/restaurant_customers | FEAT-008 | [src/services/restaurantService.ts:466](<../../src/services/restaurantService.ts#L466>) |
| API-188 | GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:471](<../../src/services/restaurantService.ts#L471>) |
| API-189 | POST/GET | /rest/v1/restaurant_customers | FEAT-008 | [src/services/restaurantService.ts:531](<../../src/services/restaurantService.ts#L531>) |
| API-190 | PATCH/GET | /rest/v1/restaurant_customers | FEAT-008 | [src/services/restaurantService.ts:542](<../../src/services/restaurantService.ts#L542>) |
| API-191 | GET | /rest/v1/orders | FEAT-006 | [src/services/restaurantService.ts:554](<../../src/services/restaurantService.ts#L554>) |
| API-192 | GET | /rest/v1/breach_register | FEAT-024 | [src/services/securityService.ts:49](<../../src/services/securityService.ts#L49>) |
| API-193 | POST/GET | /rest/v1/breach_register | FEAT-024 | [src/services/securityService.ts:73](<../../src/services/securityService.ts#L73>) |
| API-194 | PATCH/GET | /rest/v1/breach_register | FEAT-024 | [src/services/securityService.ts:103](<../../src/services/securityService.ts#L103>) |
| API-195 | GET | /rest/v1/audit_log | FEAT-024 | [src/services/securityService.ts:134](<../../src/services/securityService.ts#L134>) |
| API-196 | GET | /rest/v1/audit_log | FEAT-024 | [src/services/securityService.ts:161](<../../src/services/securityService.ts#L161>) |
| API-197 | GET | /rest/v1/order_payments | FEAT-013 | [src/services/splitBillService.ts:26](<../../src/services/splitBillService.ts#L26>) |
| API-198 | POST/GET | /rest/v1/order_payments | FEAT-013 | [src/services/splitBillService.ts:37](<../../src/services/splitBillService.ts#L37>) |
| API-199 | PATCH | /rest/v1/order_payments | FEAT-013 | [src/services/splitBillService.ts:50](<../../src/services/splitBillService.ts#L50>) |
| API-200 | DELETE | /rest/v1/order_payments | FEAT-013 | [src/services/splitBillService.ts:59](<../../src/services/splitBillService.ts#L59>) |
| API-201 | PATCH | /rest/v1/orders | FEAT-006 | [src/services/splitBillService.ts:74](<../../src/services/splitBillService.ts#L74>) |
| API-202 | GET | /rest/v1/restaurant_tables | FEAT-014 | [src/services/tableService.ts:105](<../../src/services/tableService.ts#L105>) |
| API-203 | POST/GET | /rest/v1/restaurant_tables | FEAT-014 | [src/services/tableService.ts:125](<../../src/services/tableService.ts#L125>) |
| API-204 | PATCH | /rest/v1/restaurant_tables | FEAT-014 | [src/services/tableService.ts:138](<../../src/services/tableService.ts#L138>) |
| API-205 | DELETE | /rest/v1/restaurant_tables | FEAT-014 | [src/services/tableService.ts:149](<../../src/services/tableService.ts#L149>) |
| API-206 | PATCH/GET | /rest/v1/restaurant_tables | FEAT-014 | [src/services/tableService.ts:164](<../../src/services/tableService.ts#L164>) |
| API-207 | GET | /rest/v1/table_sessions | FEAT-014 | [src/services/tableService.ts:178](<../../src/services/tableService.ts#L178>) |
| API-208 | POST/GET | /rest/v1/tips | FEAT-012 | [src/services/tipsService.ts:28](<../../src/services/tipsService.ts#L28>) |
| API-209 | GET | /rest/v1/tips | FEAT-012 | [src/services/tipsService.ts:41](<../../src/services/tipsService.ts#L41>) |
| API-210 | GET | /rest/v1/tips | FEAT-012 | [src/services/tipsService.ts:56](<../../src/services/tipsService.ts#L56>) |
| API-211 | PATCH | /rest/v1/tips | FEAT-012 | [src/services/tipsService.ts:73](<../../src/services/tipsService.ts#L73>) |
| API-212 | GET | /rest/v1/tips | FEAT-012 | [src/services/tipsService.ts:92](<../../src/services/tipsService.ts#L92>) |
| API-213 | GET | /rest/v1/waiters | FEAT-011 | [src/services/waiterService.ts:30](<../../src/services/waiterService.ts#L30>) |
| API-214 | GET | /rest/v1/waiter_sessions | FEAT-011 | [src/services/waiterService.ts:39](<../../src/services/waiterService.ts#L39>) |
| API-215 | GET | /rest/v1/waiter_sessions | FEAT-011 | [src/services/waiterService.ts:51](<../../src/services/waiterService.ts#L51>) |

## Convenciones de contrato

- JSON en cliente; `Authorization: Bearer <JWT>` y `apikey` según SDK. No se reproducen valores. CORS acepta GET/POST/OPTIONS y orígenes enumerados en `_shared/cors.ts`. OPTIONS no autoriza la operación posterior.
- Edge: status y shape por rama. No convertir automáticamente `{success:false}` en HTTP 4xx: hay errores de Webpay con HTTP 200.
- RPC: POST con objeto de parámetros; el retorno SQL define shape. RAISE se traduce por PostgREST según SQLSTATE; el status efectivo de plataforma no se verificó. Un JSON de error retornado por SQL puede viajar con HTTP 200.
- PostgREST: SELECT/INSERT/UPDATE/DELETE equivalen a GET/POST/PATCH/DELETE; upsert usa POST y Prefer según SDK. Query, proyección, filtros y single/maybeSingle se enumeran por operación. RLS + grants determinan acceso, no el filtro del navegador.
- Supabase Auth: `signInWithPassword`, `signInWithOAuth`, `getSession`, `getUser`, `updateUser`, `signOut` y sus eventos se documentan en FEAT-001; contratos del proveedor no se inventan.

<a id="api-001"></a>

## API-001 — POST /functions/v1/activate-trial-registration

Feature: FEAT-002. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública; Origin permitido, UUID y solicitud pendiente; activación limita plan a free_trial.

Tablas del handler (incluye ramas hermanas): `invitations`, `registration_requests`. RPC: `auto_approve_registration_v2`.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/activate-trial-registration/index.ts:59](<../../supabase/functions/activate-trial-registration/index.ts#L59>)

```ts

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "Method not allowed" }, 405);
  }

  if (!ALLOWED_ORIGINS.includes(req.headers.get("origin") || "")) {
    return jsonResponse(req, { success: false, error: "Origen no permitido" }, 403);
  }

  try {
    const { registration_request_id } = await req.json().catch(() => ({}));
    if (!isUuid(registration_request_id)) {
      return jsonResponse(req, { success: false, error: "Solicitud de registro inválida" }, 400);
    }

    const { data: request, error: requestError } = await supabase
      .from("registration_requests")
      .select("owner_name")
      .eq("id", registration_request_id)
      .eq("status", "pending")
      .maybeSingle();
```

[supabase/functions/activate-trial-registration/index.ts:81](<../../supabase/functions/activate-trial-registration/index.ts#L81>)

```ts
    if (requestError || !request) {
      return jsonResponse(req, { success: false, error: "Solicitud no disponible" }, 409);
    }

    const { data, error: activationError } = await supabase.rpc("auto_approve_registration_v2", {
      p_request_id: registration_request_id,
      p_plan: "free_trial",
      p_payment_provider: "trial",
      p_transaction_id: null,
      p_amount: 0,
```

[supabase/functions/activate-trial-registration/index.ts:95](<../../supabase/functions/activate-trial-registration/index.ts#L95>)

```ts
      console.error("[activate-trial-registration] No se pudo activar la prueba:", activationError);
      return jsonResponse(req, { success: false, error: "No se pudo activar la prueba" }, 409);
    }

    const invitationSent = await sendInvitation(activation.restaurant_id, request.owner_name || "");
    return jsonResponse(req, { success: true, invitation_sent: invitationSent }, 200);
  } catch (error) {
    console.error("[activate-trial-registration] Error interno:", error);
    return jsonResponse(req, { success: false, error: "No se pudo completar el registro" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-002. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-002"></a>

## API-002 — POST /functions/v1/ai-recommendations

Feature: FEAT-020. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT validado con getUser y membresía profile_restaurants; contador 10/24h (fail-open si falla consulta).

Tablas del handler (incluye ramas hermanas): `ai_usage_log`, `inventory_items`, `menu_items`, `orders`, `profile_restaurants`, `tips`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/ai-recommendations/index.ts:57](<../../supabase/functions/ai-recommendations/index.ts#L57>)

```ts
async function authenticate(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function ownsRestaurant(userId: string, restaurantId: string): Promise<boolean> {
```

[supabase/functions/ai-recommendations/index.ts:299](<../../supabase/functions/ai-recommendations/index.ts#L299>)

```ts
async function callOpenRouter(prompt: string): Promise<Recommendation[]> {
  const body = {
    model: OPENROUTER_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    response_format: { type: "json_object" },
  };

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
```

[supabase/functions/ai-recommendations/index.ts:314](<../../supabase/functions/ai-recommendations/index.ts#L314>)

```ts
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
```

[supabase/functions/ai-recommendations/index.ts:350](<../../supabase/functions/ai-recommendations/index.ts#L350>)

```ts

  if (req.method !== "POST") {
    return jsonResponse(req, { success: false, error: "method_not_allowed" }, 405);
  }

  try {
    // Auth
    const userId = await authenticate(req);
    if (!userId) {
      return jsonResponse(req, { success: false, error: "unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { restaurantId } = body;
    if (!restaurantId) {
      return jsonResponse(req, { success: false, error: "missing_restaurant_id" }, 400);
    }

    // Ownership
    const isOwner = await ownsRestaurant(userId, restaurantId);
    if (!isOwner) {
      return jsonResponse(req, { success: false, error: "forbidden" }, 403);
    }

    // Rate limit por usuario antes de gastar créditos de OpenRouter.
    const withinLimit = await isWithinAiRateLimit(userId);
    if (!withinLimit) {
      return jsonResponse(req, {
        success: false,
        error: "rate_limit_exceeded",
        message: `Has alcanzado el límite de ${AI_RATE_LIMIT_MAX} análisis de IA en ${AI_RATE_LIMIT_WINDOW_HOURS} horas.`,
      }, 429);
    }

    // Verificar que OpenRouter tenga API key.
    if (!OPENROUTER_API_KEY) {
      return jsonResponse(req, { success: false, error: "openrouter_key_not_configured" }, 500);
    }

    // Recolectar datos
    const data = await gatherData(restaurantId);

    // Si no hay ventas ni menú, no hay mucho que analizar
    if (data.metrics.numPedidos === 0 && data.menuItems.length === 0) {
      return jsonResponse(req, {
        success: true,
        recommendations: [],
        metrics: data.metrics,
        message: "Aún no hay suficientes datos (ventas o menú) para generar recomendaciones.",
      });
    }

    // Llamar a la IA mediante OpenRouter.
```

[supabase/functions/ai-recommendations/index.ts:408](<../../supabase/functions/ai-recommendations/index.ts#L408>)

```ts

    return jsonResponse(req, {
      success: true,
      recommendations,
      metrics: data.metrics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("ai-recommendations error:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-020. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-003"></a>

## API-003 — GET /functions/v1/accounting/config

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/accounting/index.ts:7](<../../supabase/functions/accounting/index.ts#L7>)

```ts
// en order-pay: las rutas del dueño validan el Bearer JWT con
// requireRestaurantOwner; el cron se autentica con X-Cron-Secret contra
// la tabla accounting_cron_secret (RLS sin políticas, solo service role).
//
// Rutas (pathname routing, patrón flow-customer):
//   GET  /config                  → { auto_emit, configured, key_id_masked }
//   POST /config                  → toggle auto_emit y/o alta de credencial
//                                    (se cifra AES-256-GCM con ACCOUNTING_MASTER_KEY)
//   POST /emit                    → boleta 39 / factura 33 desde una orden pagada
//   POST /sync                    → dueño: 1 restaurante · cron: todos los CL
```

[supabase/functions/accounting/index.ts:33](<../../supabase/functions/accounting/index.ts#L33>)

```ts
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireRestaurantOwner } from "../_shared/authorization.ts";
import { TaxApiClient, TaxApiError } from "../_shared/tax-client.ts";
import {
  buildCreditNotePayload,
  buildCreditNoteReference,
  buildDtePayloadFromOrder,
  buildOrderExternalReference,
  isValidRutChile,
} from "../_shared/accounting-payload.ts";
import type {
  TaxApiReceiver,
  TaxApiRequestState,
} from "../_shared/tax-types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
```

[supabase/functions/accounting/index.ts:180](<../../supabase/functions/accounting/index.ts#L180>)

```ts
async function verifyCronSecret(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-cron-secret") || "";
  if (!provided) return false;
  const { data, error } = await supabase
    .from("accounting_cron_secret")
    .select("secret")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data?.secret) return false;
  return timingSafeEqual(provided, data.secret);
```

[supabase/functions/accounting/index.ts:531](<../../supabase/functions/accounting/index.ts#L531>)

```ts
  const url = new URL(req.url);
  const method = req.method;

  try {
    // ── POST /sync — dueño (1 restaurante) o cron (todos los CL) ──
    if (url.pathname.endsWith("/sync") && method === "POST") {
      const cron = await verifyCronSecret(req);
      if (cron) {
        const { data: targets, error } = await supabase
          .from("accounting_config")
          .select("restaurant_id, last_sync_at, restaurants!inner(country)")
          .eq("restaurants.country", "CL")
          .not("tax_key_id", "is", null)
          .not("tax_secret_encrypted", "is", null)
```

[supabase/functions/accounting/index.ts:558](<../../supabase/functions/accounting/index.ts#L558>)

```ts
        }
        return jsonResponse(req, { success: true, mode: "cron", results });
      }

      const body = await req.json().catch(() => ({}));
      const restaurantId = (body as { restaurant_id?: string }).restaurant_id;
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const summary = await syncRestaurant(restaurantId);
      return jsonResponse(req, { success: true, mode: "owner", summary });
    }

    // ── GET /config — estado de conexión (sin secretos) ──
    if (url.pathname.endsWith("/config") && method === "GET") {
      const restaurantId = url.searchParams.get("restaurant_id");
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const restaurant = await assertChile(restaurantId);
      if (!restaurant) return jsonResponse(req, { success: false, error: "restaurant_not_found" }, 404);
      const config = await loadTaxConfig(restaurantId);
      return jsonResponse(req, {
        success: true,
        country: restaurant.country,
        auto_emit: config?.auto_emit ?? false,
        configured: Boolean(config?.tax_key_id && config?.tax_secret_encrypted),
        key_id_masked: maskKeyId(config?.tax_key_id ?? null),
        tax_key_version: config?.tax_key_version ?? null,
        last_sync_at: config?.last_sync_at ?? null,
      });
```

[supabase/functions/accounting/index.ts:591](<../../supabase/functions/accounting/index.ts#L591>)

```ts
    // ── POST /config — toggle auto_emit y/o alta/rotación de credencial ──
    if (url.pathname.endsWith("/config") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id: restaurantId, auto_emit: autoEmit, credential } = body as {
        restaurant_id?: string;
        auto_emit?: boolean;
        credential?: { key_id?: string; secret?: string };
      };
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof autoEmit === "boolean") updates.auto_emit = autoEmit;

      if (credential?.key_id && credential?.secret) {
        if (!ACCOUNTING_MASTER_KEY) {
          return jsonResponse(req, { success: false, error: "master_key_not_configured" }, 500);
        }
        if (!credential.key_id.startsWith("cmor_live_")) {
          return jsonResponse(req, { success: false, error: "credencial debe ser cmor_live_* (API)" }, 400);
        }
        // Validación activa: la firma HMAC debe funcionar ANTES de guardar.
        const probe = new TaxApiClient({
          baseUrl: TAX_API_BASE_URL,
          apiKey: credential.key_id,
          secret: credential.secret,
        });
        try {
          await probe.findByExternalReference(`cmorflow-validation-${crypto.randomUUID()}`);
          return jsonResponse(req, { success: false, error: "credencial con permisos inesperados" }, 400);
        } catch (e) {
          if (!(e instanceof TaxApiError) || e.code !== "NOT_FOUND") {
            return jsonResponse(req, {
              success: false,
              error: "credencial_invalida",
              detail: e instanceof TaxApiError ? `${e.code}: ${e.message}` : String(e),
            }, 400);
          }
        }
        updates.tax_key_id = credential.key_id;
        updates.tax_secret_encrypted = await encryptTaxSecret(credential.secret, restaurantId);
```

[supabase/functions/accounting/index.ts:635](<../../supabase/functions/accounting/index.ts#L635>)

```ts
      if (Object.keys(updates).length <= 1) {
        return jsonResponse(req, { success: false, error: "nada_que_actualizar" }, 400);
      }

      const { error } = await supabase
        .from("accounting_config")
        .upsert({ restaurant_id: restaurantId, ...updates }, { onConflict: "restaurant_id" });
      if (error) throw error;
      return jsonResponse(req, { success: true });
    }

    // ── POST /documents/:id/artifact — URLs firmadas XML/PDF ──
    const artifactMatch = url.pathname.match(/\/documents\/([\w-]+)\/artifact$/);
    if (artifactMatch && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const restaurantId = (body as { restaurant_id?: string }).restaurant_id;
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const { data: doc, error } = await supabase
        .from("accounting_documents")
        .select(DOC_LIST_COLUMNS)
        .eq("id", artifactMatch[1])
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (error || !doc) return jsonResponse(req, { success: false, error: "document_not_found" }, 404);
      if (!(doc as DocRow).dte_id) {
        return jsonResponse(req, { success: false, error: "document_not_finalized" }, 409);
      }

      const config = await loadTaxConfig(restaurantId);
      if (!config) return jsonResponse(req, { success: false, error: "not_configured" }, 503);
      const client = await buildClient(config);
      const links = await client.getArtifactLinks((doc as DocRow).dte_id!);
      return jsonResponse(req, { success: true, ...links });
    }

    // ── POST /emit — boleta 39 o factura 33 desde una orden pagada ──
    if (url.pathname.endsWith("/emit") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id: restaurantId, order_id: orderId, dte_type: dteType, receiver } = body as {
        restaurant_id?: string;
        order_id?: string;
        dte_type?: number;
        receiver?: TaxApiReceiver;
      };
      if (!restaurantId || !orderId) {
        return jsonResponse(req, { success: false, error: "restaurant_id y order_id son requeridos" }, 400);
      }
      if (dteType !== 39 && dteType !== 33) {
        return jsonResponse(req, { success: false, error: "dte_type debe ser 39 (boleta) o 33 (factura)" }, 400);
      }
      if (dteType === 33) {
        if (!receiver?.rut || !receiver?.name) {
          return jsonResponse(req, { success: false, error: "factura requiere receiver.rut y receiver.name" }, 400);
        }
        if (!isValidRutChile(receiver.rut)) {
          return jsonResponse(req, { success: false, error: "receiver.rut inválido (dígito verificador)" }, 400);
        }
      }
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const restaurant = await assertChile(restaurantId);
      if (!restaurant || restaurant.country !== "CL") {
        return jsonResponse(req, { success: false, error: "country_not_supported" }, 403);
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id,restaurant_id,total,items,order_number,payment_status")
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (orderErr || !order) return jsonResponse(req, { success: false, error: "order_not_found" }, 404);
      if (order.payment_status !== "paid") {
        return jsonResponse(req, { success: false, error: "order_not_paid" }, 409);
      }

      const config = await loadTaxConfig(restaurantId);
      if (!config) return jsonResponse(req, { success: false, error: "not_configured" }, 503);
      const client = await buildClient(config);
      const result = await emitForOrder(restaurantId, order, dteType, receiver, { manual: true, client });

      if (!result.ok) {
        const statusMap: Record<string, number> = {
          already_issued: 409,
          already_pending: 409,
          attempts_exhausted: 409,
```

[supabase/functions/accounting/index.ts:726](<../../supabase/functions/accounting/index.ts#L726>)

```ts
        };
        return jsonResponse(req, {
          success: false,
          error: result.error,
          doc: result.doc ? docPublic(result.doc) : undefined,
        }, statusMap[result.error ?? ""] ?? 500);
      }
      return jsonResponse(req, { success: true, doc: result.doc ? docPublic(result.doc) : undefined });
    }

    // ── POST /credit-note — NC 61 sobre un documento aceptado ──
    if (url.pathname.endsWith("/credit-note") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id: restaurantId, document_id: documentId, reason } = body as {
        restaurant_id?: string;
        document_id?: string;
        reason?: string;
      };
      if (!restaurantId || !documentId) {
        return jsonResponse(req, { success: false, error: "restaurant_id y document_id son requeridos" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const { data: original, error: origErr } = await supabase
        .from("accounting_documents")
        .select(DOC_LIST_COLUMNS)
        .eq("id", documentId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (origErr || !original) return jsonResponse(req, { success: false, error: "document_not_found" }, 404);
      const origDoc = original as DocRow;
      if (origDoc.status !== "accepted" || !origDoc.dte_id) {
        return jsonResponse(req, { success: false, error: "solo se anula un documento accepted" }, 409);
      }

      // Attempt de NC = máximo entre las NC previas de este original + 1.
      const { data: prevNotes } = await supabase
        .from("accounting_documents")
        .select("attempt")
        .eq("restaurant_id", restaurantId)
        .eq("dte_type", 61)
```

[supabase/functions/accounting/index.ts:773](<../../supabase/functions/accounting/index.ts#L773>)

```ts
      const config = await loadTaxConfig(restaurantId);
      if (!config) return jsonResponse(req, { success: false, error: "not_configured" }, 503);
      const client = await buildClient(config);

      const externalReference = buildCreditNoteReference(documentId, nextAttempt);
      const { data: ncDoc, error: ncErr } = await supabase
        .from("accounting_documents")
        .insert({
          restaurant_id: restaurantId,
          order_id: origDoc.order_id,
```

[supabase/functions/accounting/index.ts:801](<../../supabase/functions/accounting/index.ts#L801>)

```ts
          .maybeSingle();
        if (existing) return jsonResponse(req, { success: true, doc: existing });
        throw ncErr ?? new Error("insert_failed");
      }

      try {
        const doc = await emitDoc(client, ncDoc as DocRow);
        return jsonResponse(req, { success: true, doc: docPublic(doc) });
      } catch (e) {
        const code = e instanceof TaxApiError ? e.code : "unknown_error";
        return jsonResponse(req, { success: false, error: code, doc: docPublic(ncDoc as DocRow) }, 502);
      }
    }

    // ── GET /documents — listado para la página Contabilidad ──
    if (url.pathname.endsWith("/documents") && method === "GET") {
      const restaurantId = url.searchParams.get("restaurant_id");
      if (!restaurantId) return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      const access = await requireRestaurantOwner(supabase, req, restaurantId);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 300);
      const status = url.searchParams.get("status");
      let query = supabase
        .from("accounting_documents")
        .select(DOC_LIST_COLUMNS)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(req, { success: true, documents: data ?? [] });
    }

    return jsonResponse(req, { success: false, error: "ruta no encontrada" }, 404);
  } catch (e) {
    if (e instanceof TaxApiError) {
      const status = e.statusCode === 503 && e.code === "not_configured" ? 503 : 502;
      return jsonResponse(req, { success: false, error: e.code, message: e.message }, status);
    }
    console.error("[accounting] Error no manejado:", e);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-004"></a>

## API-004 — POST /functions/v1/accounting/config

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-003](#api-003). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-005"></a>

## API-005 — POST /functions/v1/accounting/emit

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-003](#api-003). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-006"></a>

## API-006 — POST /functions/v1/accounting/sync

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-003](#api-003). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-007"></a>

## API-007 — GET /functions/v1/accounting/documents

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-003](#api-003). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-008"></a>

## API-008 — POST /functions/v1/accounting/credit-note

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-003](#api-003). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-009"></a>

## API-009 — POST /functions/v1/accounting/documents/:id/artifact

Feature: FEAT-022. Estado: CONFIRMADO (handler local). Autenticación/autorización: requireRestaurantOwner; admin o owner con restaurante primario/membresía; /sync admite además X-Cron-Secret.

Tablas del handler (incluye ramas hermanas): `accounting_config`, `accounting_cron_secret`, `accounting_documents`, `orders`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-003](#api-003). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-022. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-010"></a>

## API-010 — BODY JSON, sin restricción explícita de método /functions/v1/create-payment-intent

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública; solicitud pending y plan del catálogo local.

Tablas del handler (incluye ramas hermanas): `payment_intents`, `registration_requests`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/create-payment-intent/index.ts:53](<../../supabase/functions/create-payment-intent/index.ts#L53>)

```ts
    if (!WEBPAY_COMMERCE_CODE || !WEBPAY_API_KEY) {
      return jsonResponse(req, {
        success: false,
        error: "webpay_credentials_not_configured",
      }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const registrationRequestId = body.registration_request_id;
    const plan = body.plan;

    if (!registrationRequestId || !plan) {
      return jsonResponse(req, {
        success: false,
        error: "registration_request_id y plan son requeridos",
      }, 200);
    }

    if (!PLANS[plan]) {
      return jsonResponse(req, {
        success: false,
        error: "plan inválido. Valores: starter, pro",
      }, 200);
    }

    // Para free_trial, no se requiere pago
    if (plan === "free_trial") {
      return jsonResponse(req, {
        success: false,
        error: "free_trial no requiere pago. Usa auto_approve_registration_v2 directamente.",
      }, 200);
    }

    // 1. Verificar que el registration_request existe y está pendiente
    const { data: request, error: reqError } = await supabase
      .from("registration_requests")
```

[supabase/functions/create-payment-intent/index.ts:94](<../../supabase/functions/create-payment-intent/index.ts#L94>)

```ts
    if (reqError || !request) {
      return jsonResponse(req, {
        success: false,
        error: "registration_request no encontrada o ya procesada",
      }, 200);
    }

    // 2. Generar buy_order único (máximo 26 caracteres para Transbank)
    const buyOrder = `C-${registrationRequestId.slice(0, 6)}-${Date.now().toString().slice(-10)}`;
    const sessionId = `session-${registrationRequestId}`;
```

[supabase/functions/create-payment-intent/index.ts:119](<../../supabase/functions/create-payment-intent/index.ts#L119>)

```ts
        },
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: sessionId,
          amount: amount,
          return_url: returnUrl,
        }),
      }
    );

```

[supabase/functions/create-payment-intent/index.ts:131](<../../supabase/functions/create-payment-intent/index.ts#L131>)

```ts
      console.error("Webpay API error:", webpayResponse.status, errText);
      return jsonResponse(req, {
        success: false,
        error: "webpay_api_error",
        details: errText,
      }, 200);
    }

    const webpayData = await webpayResponse.json();

```

[supabase/functions/create-payment-intent/index.ts:154](<../../supabase/functions/create-payment-intent/index.ts#L154>)

```ts
    // 5. Retornar URL + token para redirigir
    return jsonResponse(req, {
      success: true,
      url: webpayData.url,
      token: webpayData.token,
      buy_order: buyOrder,
      amount: amount,
      plan: plan,
    }, 200);
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-011"></a>

## API-011 — POST /functions/v1/flow-checkout

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública; plan permitido, solicitud pending, origen permitido y verificación de intención previa.

Tablas del handler (incluye ramas hermanas): `payment_intents`, `registration_requests`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/flow-checkout/index.ts:40](<../../supabase/functions/flow-checkout/index.ts#L40>)

```ts

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { registration_request_id, plan, origin } = body;

    if (!registration_request_id || !plan) {
      return jsonResponse(req, { success: false, error: "registration_request_id y plan son requeridos" }, 400);
    }

    if (plan !== "starter" && plan !== "pro" && plan !== "lifetime" && plan !== "test_plan") {
      return jsonResponse(req, { success: false, error: "Plan inválido para checkout inicial" }, 400);
    }

    const originUrl = getTrustedAppUrl(origin);
    if (!originUrl) {
      return jsonResponse(req, { success: false, error: "Origen de retorno no permitido" }, 400);
    }

    // 1. Obtener la solicitud de registro para verificar su validez
    const { data: request, error: reqErr } = await supabase
      .from("registration_requests")
      .select("restaurant_name, owner_name, email, country")
      .eq("id", registration_request_id)
      .eq("status", "pending")
```

[supabase/functions/flow-checkout/index.ts:73](<../../supabase/functions/flow-checkout/index.ts#L73>)

```ts
    if (request?.country && request.country !== "CL") {
      return jsonResponse(req, {
        success: false,
        error:
          "El pago en línea no está disponible en este país. Coordinaremos la activación contigo.",
      }, 400);
    }

    if (reqErr || !request) {
      console.error("[flow-checkout] Error buscando registro pendiente:", reqErr);
      return jsonResponse(req, { success: false, error: "Solicitud de registro no encontrada o ya procesada" }, 404);
    }

    // El registro es público y por tanto este endpoint no exige JWT. Evitar
    // que reintentos rápidos (o llamadas repetidas) creen varias órdenes de
    // cobro activas para la misma solicitud antes de que Flow responda.
    const retryAfter = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: pendingIntent, error: pendingIntentErr } = await supabase
      .from("payment_intents")
```

[supabase/functions/flow-checkout/index.ts:100](<../../supabase/functions/flow-checkout/index.ts#L100>)

```ts
      console.error("[flow-checkout] Error comprobando intentos recientes:", pendingIntentErr);
      return jsonResponse(req, { success: false, error: "No se pudo validar el estado del pago" }, 500);
    }
    if (pendingIntent) {
      return jsonResponse(req, {
        success: false,
        error: "Ya existe una transacción de pago en curso. Espera unos minutos antes de reintentar.",
      }, 409);
    }

    // 2. Determinar precio del plan
    const amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];

```

[supabase/functions/flow-checkout/index.ts:155](<../../supabase/functions/flow-checkout/index.ts#L155>)

```ts
      console.error("[flow-checkout] Error al guardar intención de pago:", insertErr);
      return jsonResponse(req, { success: false, error: "Error al registrar intención de pago" }, 500);
    }

    return jsonResponse(req, {
      success: true,
      url: flowResponse.url,
      token: flowResponse.token,
      flowOrder: flowResponse.flowOrder,
    }, 200);

  } catch (err: any) {
    console.error("[flow-checkout] Error interno:", err.message);
    return jsonResponse(req, { success: false, error: "No se pudo crear la transacción de pago" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-012"></a>

## API-012 — POST /functions/v1/mp-checkout

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública; país BR/PE, solicitud pending y catálogo regional.

Tablas del handler (incluye ramas hermanas): `payment_intents`, `registration_requests`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/mp-checkout/index.ts:58](<../../supabase/functions/mp-checkout/index.ts#L58>)

```ts

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    if (!mpApi.isConfigured) {
      return jsonResponse(req, {
        success: false,
        error: "Mercado Pago no está configurado todavía. Contáctanos para activar tu plan.",
      }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const { registration_request_id, plan, origin } = body;

    if (!registration_request_id || !plan) {
      return jsonResponse(req, { success: false, error: "registration_request_id y plan son requeridos" }, 400);
    }

    if (plan !== "starter" && plan !== "pro" && plan !== "lifetime" && plan !== "test_plan") {
      return jsonResponse(req, { success: false, error: "Plan inválido para checkout inicial" }, 400);
    }

    const originUrl = getTrustedAppUrl(origin);
    if (!originUrl) {
      return jsonResponse(req, { success: false, error: "Origen de retorno no permitido" }, 400);
    }

    // 1. Solicitud pendiente + país con gateway mp
    const { data: request, error: reqErr } = await supabase
      .from("registration_requests")
      .select("restaurant_name, owner_name, email, country")
      .eq("id", registration_request_id)
      .eq("status", "pending")
```

[supabase/functions/mp-checkout/index.ts:96](<../../supabase/functions/mp-checkout/index.ts#L96>)

```ts
      console.error("[mp-checkout] Solicitud no encontrada:", reqErr);
      return jsonResponse(req, { success: false, error: "Solicitud de registro no encontrada o ya procesada" }, 404);
    }

    const country = request.country || "CL";
    const priceEntry = PLAN_PRICES_MP[country]?.[plan];
    if (!priceEntry) {
      return jsonResponse(req, {
        success: false,
        error: "El pago en línea no está disponible en este país. Coordinaremos la activación contigo.",
      }, 400);
    }

    // Evitar intents duplicados (mismo patrón que flow-checkout)
    const retryAfter = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: pendingIntent } = await supabase
```

[supabase/functions/mp-checkout/index.ts:120](<../../supabase/functions/mp-checkout/index.ts#L120>)

```ts
    if (pendingIntent) {
      return jsonResponse(req, {
        success: false,
        error: "Ya existe una transacción de pago en curso. Espera unos minutos antes de reintentar.",
      }, 409);
    }

    const externalReference = `R-${registration_request_id}`;
    const notificationUrl = `${SUPABASE_URL}/functions/v1/mp-webhook`;

```

[supabase/functions/mp-checkout/index.ts:144](<../../supabase/functions/mp-checkout/index.ts#L144>)

```ts
    if (!payment) {
      return jsonResponse(req, { success: false, error: "Mercado Pago no configurado" }, 503);
    }

    // 2. Registrar la intención de pago. buy_order único por intento
    // (UNIQUE en BD): timestamp como flow-checkout, el webhook concilia
    // por flow_token (id de pago MP), no por buy_order.
    const buyOrder = `R-${registration_request_id.substring(0, 8)}-${Date.now()}`;
    const { error: insertErr } = await supabase
      .from("payment_intents")
```

[supabase/functions/mp-checkout/index.ts:167](<../../supabase/functions/mp-checkout/index.ts#L167>)

```ts
      console.error("[mp-checkout] Error guardando payment_intent:", insertErr);
      return jsonResponse(req, { success: false, error: "Error al registrar intención de pago" }, 500);
    }

    // 3. URL de retorno al frontend (la pasarela es server-side; para PIX
    //    el cliente muestra el QR, para tarjeta/redirigimos al ticket).
    const ticketUrl = payment.point_of_interaction?.transaction_data?.ticket_url
      || `https://www.mercadopago.com.br/payments/${payment.id}`;

    return jsonResponse(req, {
      success: true,
      payment_id: String(payment.id),
      status: payment.status,
      // Datos PIX para render copia-y-paga (Brasil)
      pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code || null,
      pix_qr_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      url: ticketUrl,
    }, 200);
```

[supabase/functions/mp-checkout/index.ts:186](<../../supabase/functions/mp-checkout/index.ts#L186>)

```ts
    console.error("[mp-checkout] Error interno:", err.message);
    return jsonResponse(req, { success: false, error: "No se pudo crear la transacción de pago" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-013"></a>

## API-013 — POST /functions/v1/flow-customer/create

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; status resuelve primero cliente por token y luego ownership.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `restaurants`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/flow-customer/index.ts:7](<../../supabase/functions/flow-customer/index.ts#L7>)

```ts
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getAuthenticatedUser, requireRestaurantOwner } from "../_shared/authorization.ts";
import { FlowApiClient } from "../_shared/flow-client.ts";
import type { 
  FlowCustomerResponse, 
  FlowCustomerRegisterResponse, 
  FlowCustomerRegisterStatusResponse 
} from "../_shared/flow-types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
```

[supabase/functions/flow-customer/index.ts:34](<../../supabase/functions/flow-customer/index.ts#L34>)

```ts
  const path = url.pathname;
  const method = req.method;

  try {
    // ─────────────────────────────────────────────────────────────────
    // POST /create — Registrar un cliente en Flow
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/create") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id } = body;

      if (!restaurant_id) {
        return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      // Obtener datos del restaurante
      const { data: restaurant, error: restErr } = await supabase
        .from("restaurants")
        .select("name, email")
        .eq("id", restaurant_id)
        .single();

```

[supabase/functions/flow-customer/index.ts:59](<../../supabase/functions/flow-customer/index.ts#L59>)

```ts
        console.error("[flow-customer] Error obteniendo restaurante:", restErr);
        return jsonResponse(req, { success: false, error: "Restaurante no encontrado" }, 404);
      }

      console.log(`[flow-customer] Creando cliente en Flow para el restaurante: ${restaurant.name} (${restaurant_id})`);

      // Crear cliente en la API de Flow
      const flowResponse = await flowApi.send<FlowCustomerResponse>("customer/create", {
        name: restaurant.name,
        email: restaurant.email,
```

[supabase/functions/flow-customer/index.ts:83](<../../supabase/functions/flow-customer/index.ts#L83>)

```ts
        console.error("[flow-customer] Error al guardar cliente en flow_customers:", insertErr);
        return jsonResponse(req, { success: false, error: "Error al registrar cliente localmente" }, 500);
      }

      // Actualizar restaurants con el id de cliente de Flow
      const { error: updateErr } = await supabase
        .from("restaurants")
        .update({ flow_customer_id: flowResponse.customerId })
        .eq("id", restaurant_id);

```

[supabase/functions/flow-customer/index.ts:96](<../../supabase/functions/flow-customer/index.ts#L96>)

```ts

      return jsonResponse(req, { 
        success: true, 
        customerId: flowResponse.customerId,
        email: flowResponse.email,
        name: flowResponse.name
      }, 200);
    }

    // ─────────────────────────────────────────────────────────────────
```

[supabase/functions/flow-customer/index.ts:107](<../../supabase/functions/flow-customer/index.ts#L107>)

```ts
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/register") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id } = body;

      if (!restaurant_id) {
        return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      // Buscar si el cliente ya existe en flow_customers
      let { data: customer } = await supabase
        .from("flow_customers")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .single();

```

[supabase/functions/flow-customer/index.ts:137](<../../supabase/functions/flow-customer/index.ts#L137>)

```ts
        if (restErr || !restaurant) {
          return jsonResponse(req, { success: false, error: "Restaurante no encontrado" }, 404);
        }

        const flowResponse = await flowApi.send<FlowCustomerResponse>("customer/create", {
          name: restaurant.name,
          email: restaurant.email,
          externalId: restaurant_id,
        }, "POST");

```

[supabase/functions/flow-customer/index.ts:173](<../../supabase/functions/flow-customer/index.ts#L173>)

```ts

      return jsonResponse(req, {
        success: true,
        url: flowResponse.url,
        token: flowResponse.token,
      }, 200);
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /register-status — Verificar estado del registro de tarjeta
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/register-status") && method === "GET") {
      const token = url.searchParams.get("token");

      if (!token) {
        return jsonResponse(req, { success: false, error: "token es requerido" }, 400);
      }
      const identity = await getAuthenticatedUser(supabase, req);
      if (!identity.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 401);

      console.log(`[flow-customer] Consultando estado de registro de tarjeta para token: ${token}`);

      // Obtener el estado del registro de tarjeta
      const flowResponse = await flowApi.send<FlowCustomerRegisterStatusResponse>("customer/getRegisterStatus", {
        token: token,
      }, "GET");

```

[supabase/functions/flow-customer/index.ts:205](<../../supabase/functions/flow-customer/index.ts#L205>)

```ts
      if (!customer?.restaurant_id) {
        return jsonResponse(req, { success: false, error: "Cliente Flow no encontrado" }, 404);
      }
      const access = await requireRestaurantOwner(supabase, req, customer.restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      console.log(`[flow-customer] Respuesta Flow getRegisterStatus:`, flowResponse);

      // Si el registro de tarjeta fue exitoso
      if (flowResponse.status === "active" || (flowResponse as any).creditCardType) {
        // Actualizar la tabla local flow_customers con los datos de la tarjeta
        const { error: updateErr } = await supabase
          .from("flow_customers")
```

[supabase/functions/flow-customer/index.ts:229](<../../supabase/functions/flow-customer/index.ts#L229>)

```ts

      return jsonResponse(req, {
        success: true,
        status: flowResponse.status,
        creditCardType: flowResponse.creditCardType,
        last4CardDigits: flowResponse.last4CardDigits,
        customerId: flowResponse.customerId,
      }, 200);
    }

```

[supabase/functions/flow-customer/index.ts:241](<../../supabase/functions/flow-customer/index.ts#L241>)

```ts
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/unregister") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id } = body;

      if (!restaurant_id) {
        return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      // Obtener customerId de Flow
      const { data: customer } = await supabase
        .from("flow_customers")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .single();

      if (!customer?.id) {
        return jsonResponse(req, { success: false, error: "Cliente Flow no registrado para este restaurante" }, 404);
      }

      console.log(`[flow-customer] Desregistrando tarjeta para customerId: ${customer.id}`);

      // Desvincular tarjeta en Flow
      await flowApi.send("customer/unRegister", {
        customerId: customer.id,
      }, "POST");
```

[supabase/functions/flow-customer/index.ts:281](<../../supabase/functions/flow-customer/index.ts#L281>)

```ts
        console.error("[flow-customer] Error al vaciar tarjeta localmente:", updateErr);
        return jsonResponse(req, { success: false, error: "Error al actualizar base de datos local" }, 500);
      }

      return jsonResponse(req, { success: true, message: "Tarjeta desvinculada exitosamente" }, 200);
    }

    // Ruta no encontrada
    return jsonResponse(req, { error: "Route not found" }, 404);

  } catch (err: any) {
    console.error("[flow-customer] Error interno:", err.message);
    return jsonResponse(req, { success: false, error: err.message || "Internal server error" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-014"></a>

## API-014 — POST /functions/v1/flow-customer/register

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; status resuelve primero cliente por token y luego ownership.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-013](#api-013). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-015"></a>

## API-015 — GET /functions/v1/flow-customer/register-status

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; status resuelve primero cliente por token y luego ownership.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-013](#api-013). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-016"></a>

## API-016 — POST /functions/v1/flow-customer/unregister

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; status resuelve primero cliente por token y luego ownership.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-013](#api-013). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-017"></a>

## API-017 — POST /functions/v1/flow-subscription/sync-plans

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; sync-plans requiere admin.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `flow_plans`, `flow_subscriptions`, `restaurants`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/flow-subscription/index.ts:7](<../../supabase/functions/flow-subscription/index.ts#L7>)

```ts
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { requireAdmin, requireRestaurantOwner } from "../_shared/authorization.ts";
import { FlowApiClient } from "../_shared/flow-client.ts";
import type { 
  FlowPlanResponse, 
  FlowSubscriptionResponse 
} from "../_shared/flow-types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
```

[supabase/functions/flow-subscription/index.ts:38](<../../supabase/functions/flow-subscription/index.ts#L38>)

```ts
  const path = url.pathname;
  const method = req.method;

  try {
    // ─────────────────────────────────────────────────────────────────
    // POST /sync-plans — Sincronizar planes con Flow.cl y guardar local
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/sync-plans") && method === "POST") {
      const admin = await requireAdmin(supabase, req);
      if (!admin.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);
      console.log("[flow-subscription] Iniciando sincronización de planes...");
      
      const syncedPlans = [];

      for (const p of LOCAL_PLANS) {
        let flowPlan: FlowPlanResponse;

        try {
```

[supabase/functions/flow-subscription/index.ts:93](<../../supabase/functions/flow-subscription/index.ts#L93>)

```ts

      return jsonResponse(req, { success: true, message: "Planes sincronizados exitosamente", plans: syncedPlans }, 200);
    }

    // ─────────────────────────────────────────────────────────────────
    // POST /create — Vincular cliente a plan y crear suscripción
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/create") && method === "POST") {
      let body: any = {};
      try {
        body = await req.json();
      } catch (e) {
        console.error("Error parsing JSON:", e);
      }
      const { restaurant_id, plan_id } = body;

      if (!restaurant_id || !plan_id) {
        console.error(`Faltan datos. body:`, body);
        return jsonResponse(req, { success: false, error: `restaurant_id y plan_id son requeridos. body: ${JSON.stringify(body)}` }, 400);
      }
      if (plan_id !== "starter" && plan_id !== "pro") {
        return jsonResponse(req, { success: false, error: "Plan recurrente inválido" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      // Obtener customerId de Flow para este restaurante
      let { data: customer } = await supabase
        .from("flow_customers")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .single();

```

[supabase/functions/flow-subscription/index.ts:137](<../../supabase/functions/flow-subscription/index.ts#L137>)

```ts
        if (restErr || !restaurant) {
          return jsonResponse(req, { success: false, error: "Restaurante no encontrado" }, 404);
        }

        const newCustomerFlow = await flowApi.send<any>("customer/create", {
          name: restaurant.name,
          email: restaurant.email,
          externalId: restaurant_id,
        }, "POST");

```

[supabase/functions/flow-subscription/index.ts:190](<../../supabase/functions/flow-subscription/index.ts#L190>)

```ts
        console.error("[flow-subscription] Error al guardar suscripción localmente:", insertErr);
        return jsonResponse(req, { success: false, error: "Error al registrar la suscripción localmente" }, 500);
      }

      const isActive = flowResponse.status === 1 || flowResponse.status === 5;

      const updateData: any = {
        flow_subscription_id: flowResponse.subscriptionId,
        trial_ends_at: flowResponse.trial_end || null,
      };
```

[supabase/functions/flow-subscription/index.ts:215](<../../supabase/functions/flow-subscription/index.ts#L215>)

```ts

      return jsonResponse(req, {
        success: true,
        subscriptionId: flowResponse.subscriptionId,
        status: flowResponse.status,
        moleskinData: flowResponse.moleskinData, // Contiene url/token si requiere registro de tarjeta inicial
      }, 200);
    }

    // ─────────────────────────────────────────────────────────────────
```

[supabase/functions/flow-subscription/index.ts:226](<../../supabase/functions/flow-subscription/index.ts#L226>)

```ts
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/cancel") && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { restaurant_id, at_period_end } = body; // at_period_end: 0=inmediato, 1=fin del periodo

      if (!restaurant_id) {
        return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      const cancelAtPeriodEnd = at_period_end === undefined ? 1 : Number(at_period_end);

      // Obtener el flow_subscription_id del restaurante
      const { data: restaurant, error: restErr } = await supabase
        .from("restaurants")
        .select("flow_subscription_id")
        .eq("id", restaurant_id)
```

[supabase/functions/flow-subscription/index.ts:246](<../../supabase/functions/flow-subscription/index.ts#L246>)

```ts
      if (restErr || !restaurant?.flow_subscription_id) {
        return jsonResponse(req, { success: false, error: "Suscripción activa no encontrada para este restaurante" }, 404);
      }

      console.log(`[flow-subscription] Cancelando suscripción ${restaurant.flow_subscription_id} (at_period_end: ${cancelAtPeriodEnd})`);

      // Cancelar suscripción en Flow
      const flowResponse = await flowApi.send<FlowSubscriptionResponse>("subscription/cancel", {
        subscriptionId: restaurant.flow_subscription_id,
        at_period_end: cancelAtPeriodEnd,
```

[supabase/functions/flow-subscription/index.ts:285](<../../supabase/functions/flow-subscription/index.ts#L285>)

```ts

      return jsonResponse(req, {
        success: true,
        status: flowResponse.status,
        message: cancelAtPeriodEnd === 1 
          ? "La suscripción será cancelada al término del período de facturación actual" 
          : "Suscripción cancelada inmediatamente",
      }, 200);
    }

```

[supabase/functions/flow-subscription/index.ts:297](<../../supabase/functions/flow-subscription/index.ts#L297>)

```ts
    // ─────────────────────────────────────────────────────────────────
    if (path.endsWith("/status") && method === "GET") {
      const restaurant_id = url.searchParams.get("restaurant_id");

      if (!restaurant_id) {
        return jsonResponse(req, { success: false, error: "restaurant_id es requerido" }, 400);
      }
      const access = await requireRestaurantOwner(supabase, req, restaurant_id);
      if (!access.authorized) return jsonResponse(req, { success: false, error: "No autorizado" }, 403);

      // Obtener customerId local primero
      const { data: customerData } = await supabase
        .from("flow_customers")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .maybeSingle();
      
```

[supabase/functions/flow-subscription/index.ts:316](<../../supabase/functions/flow-subscription/index.ts#L316>)

```ts
      if (!customerId) {
        return jsonResponse(req, { success: true, subscription: null }, 200);
      }

      // Consulta de base de datos local uniendo flow_subscriptions con flow_plans
      const { data: subscription, error: subErr } = await supabase
        .from("flow_subscriptions")
        .select(`
          id,
          status,
```

[supabase/functions/flow-subscription/index.ts:343](<../../supabase/functions/flow-subscription/index.ts#L343>)

```ts
        console.error("[flow-subscription] Error al obtener suscripción:", subErr);
        return jsonResponse(req, { success: false, error: "Error de consulta en base de datos" }, 500);
      }

      return jsonResponse(req, {
        success: true,
        subscription: subscription || null,
      }, 200);
    }

    return jsonResponse(req, { error: "Route not found" }, 404);

  } catch (err: any) {
    console.error("[flow-subscription] Error interno:", err.message);
    return jsonResponse(req, { success: false, error: err.message || "Internal server error" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-018"></a>

## API-018 — POST /functions/v1/flow-subscription/create

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; sync-plans requiere admin.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `flow_plans`, `flow_subscriptions`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-017](#api-017). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-019"></a>

## API-019 — POST /functions/v1/flow-subscription/cancel

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; sync-plans requiere admin.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `flow_plans`, `flow_subscriptions`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-017](#api-017). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-020"></a>

## API-020 — GET /functions/v1/flow-subscription/status

Feature: FEAT-018. Estado: CONFIRMADO (handler local). Autenticación/autorización: JWT + requireRestaurantOwner; sync-plans requiere admin.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `flow_plans`, `flow_subscriptions`, `restaurants`. RPC: N/A.

### Contrato del handler compartido

Entradas, respuestas, validaciones y errores de esta subruta: [API-017](#api-017). Leer la condición de path/método para seleccionar la rama; las otras ramas no aplican a esta operación.

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-018. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-021"></a>

## API-021 — sin restricción explícita de método /functions/v1/healthcheck

Feature: FEAT-024. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública; consulta interna service role; no demuestra autorización de datos de negocio.

Tablas del handler (incluye ramas hermanas): `restaurants`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/healthcheck/index.ts:122](<../../supabase/functions/healthcheck/index.ts#L122>)

```ts

  return jsonResponse(req, response, status);
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-024. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-022"></a>

## API-022 — sin restricción explícita de método /functions/v1/invite-owner

Feature: FEAT-002. Estado: CONFIRMADO (handler local). Autenticación/autorización: X-Internal-Secret debe coincidir con INTERNAL_FUNCTION_SECRET; falta de configuración rechaza.

Tablas del handler (incluye ramas hermanas): `invitations`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/invite-owner/index.ts:45](<../../supabase/functions/invite-owner/index.ts#L45>)

```ts

  if (!INTERNAL_FUNCTION_SECRET || req.headers.get("x-internal-function-secret") !== INTERNAL_FUNCTION_SECRET) {
    return jsonResponse(req, { error: "No autorizado" }, 403);
  }

  try {
    // 1. Traer invitaciones pendientes
    const { data: pending, error: qErr } = await supabase
      .from("invitations")
      .select("id, restaurant_id, email, token, expires_at")
      .eq("status", "pending")
```

[supabase/functions/invite-owner/index.ts:60](<../../supabase/functions/invite-owner/index.ts#L60>)

```ts
    if (!pending || pending.length === 0) {
      return jsonResponse(req, { processed: 0 }, 200);
    }

    let processed = 0;
    let failed = 0;

    for (const inv of pending) {
      if (inv.expires_at && new Date(inv.expires_at) <= new Date()) {
        await supabase.from("invitations").update({ status: "cancelled" }).eq("id", inv.id);
```

[supabase/functions/invite-owner/index.ts:97](<../../supabase/functions/invite-owner/index.ts#L97>)

```ts

    return jsonResponse(req, { processed, failed }, 200);
  } catch (err) {
    console.error("invite-owner error:", err);
    return jsonResponse(req, { error: String(err) }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-002. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-023"></a>

## API-023 — POST /functions/v1/order-pay

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública por capability session_token; sesión active/payment_pending, restaurante activo/trial vigente y cálculo server-side.

Tablas del handler (incluye ramas hermanas): `orders`, `payment_intents`, `restaurants`, `table_sessions`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/order-pay/index.ts:45](<../../supabase/functions/order-pay/index.ts#L45>)

```ts

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { session_token, tip_amount, origin } = body as {
      session_token?: string;
      tip_amount?: number;
      origin?: string;
    };

    if (!session_token || typeof session_token !== "string") {
      return jsonResponse(req, { success: false, error: "session_token es requerido" }, 400);
    }

    const tipAmount = Math.max(0, Number(tip_amount) || 0);

    // 1. Resolver la sesión (service_role bypasea RLS).
    const { data: session, error: sessErr } = await supabase
      .from("table_sessions")
      .select("id, restaurant_id, table_id, status, session_token")
```

[supabase/functions/order-pay/index.ts:73](<../../supabase/functions/order-pay/index.ts#L73>)

```ts
      console.error("[order-pay] Sesión inválida o inactiva:", sessErr?.message);
      return jsonResponse(req, { success: false, error: "invalid_session" }, 404);
    }

    // 2. Validar restaurante activo + trial vigente.
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name, status, is_active, trial_ends_at, country")
      .eq("id", session.restaurant_id)
      .maybeSingle();
```

[supabase/functions/order-pay/index.ts:84](<../../supabase/functions/order-pay/index.ts#L84>)

```ts
    if (!restaurant || !restaurant.is_active || !["active", "trial"].includes(restaurant.status)) {
      return jsonResponse(req, { success: false, error: "restaurant_not_active" }, 400);
    }
    if (
      restaurant.status === "trial" &&
      restaurant.trial_ends_at &&
      new Date(restaurant.trial_ends_at) < new Date()
    ) {
      return jsonResponse(req, { success: false, error: "trial_expired" }, 400);
    }
    // Guardrail multi-país: Flow.cl (Chile) o Mercado Pago (BR/PE, Fase 2).
    // BO sin pasarela online → pago coordinado en el local.
    const restaurantCountry = (restaurant as { country?: string }).country || "CL";
    const useMercadoPago = restaurantCountry === "BR" || restaurantCountry === "PE";
    if (!useMercadoPago && restaurantCountry !== "CL") {
      return jsonResponse(req, { success: false, error: "online_payment_unavailable" }, 400);
    }

    // 3. Calcular total server-side: Σ orders.total no cancelados.
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total, status")
      .eq("table_session_id", session.id);

```

[supabase/functions/order-pay/index.ts:112](<../../supabase/functions/order-pay/index.ts#L112>)

```ts
    if (ordersTotal <= 0) {
      return jsonResponse(req, { success: false, error: "empty_bill" }, 400);
    }
    // Cota de propina (endpoint público): máx 100% de la cuenta
    const tipCapped = Math.min(tipAmount, ordersTotal);

    const amount = Math.round(ordersTotal + tipCapped); // CLP entero
    // En monedas con centavos (BRL/PEN) el monto se cobra con decimales.
    const amountLocal = restaurantCountry === "CL"
      ? Math.round(ordersTotal + tipCapped)
```

[supabase/functions/order-pay/index.ts:139](<../../supabase/functions/order-pay/index.ts#L139>)

```ts
      if (!mpApi.isConfigured) {
        return jsonResponse(req, {
          success: false,
          error: "online_payment_unavailable",
          message: "El pago con tarjeta en línea no está disponible aún en este país.",
        }, 503);
      }
      const mpCurrency = restaurantCountry === "BR" ? "BRL" : "PEN";
      try {
        const payment = await mpApi.createPayment({
```

[supabase/functions/order-pay/index.ts:179](<../../supabase/functions/order-pay/index.ts#L179>)

```ts
        // La confirmación REAL llega por mp-webhook → ?paid=ok tras polling.
        return jsonResponse(req, {
          success: true,
          provider: "mp",
          payment_id: String(payment.id),
          status: payment.status,
          pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code || null,
          pix_qr_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
          url: payment.point_of_interaction?.transaction_data?.ticket_url || null,
          amount: amountLocal,
```

[supabase/functions/order-pay/index.ts:193](<../../supabase/functions/order-pay/index.ts#L193>)

```ts
        console.error("[order-pay] Error creando pago MP:", mpErr.message);
        return jsonResponse(req, { success: false, error: "payment_creation_failed" }, 500);
      }
    }

    // --- Rama Flow (Chile, comportamiento legacy intacto) ----------------
    const urlConfirmation = `${SUPABASE_URL}/functions/v1/webhooks/flow`;
    // El retorno del navegador vuelve al frontend del cliente con ?paid=ok.
    // Incluimos el qr_token de la mesa para que QRPayment muestre el comprobante.
    const urlReturn = `${SUPABASE_URL}/functions/v1/webhooks/flow?action=return&request_id=${encodeURIComponent(
```

[supabase/functions/order-pay/index.ts:228](<../../supabase/functions/order-pay/index.ts#L228>)

```ts

    return jsonResponse(req, {
      success: true,
      provider: "flow",
      url: flowResponse.url,
      token: flowResponse.token,
      flowOrder: flowResponse.flowOrder,
      amount,
      orders_total: ordersTotal,
      tip_amount: tipCapped,
```

[supabase/functions/order-pay/index.ts:241](<../../supabase/functions/order-pay/index.ts#L241>)

```ts
    console.error("[order-pay] Error interno:", message);
    return jsonResponse(req, { success: false, error: message }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-024"></a>

## API-024 — POST /functions/v1/mp-webhook

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: firma x-signature si secreto configurado; consulta server-side y conciliación con intención.

Tablas del handler (incluye ramas hermanas): `payment_intents`. RPC: `auto_approve_registration_v2`, `complete_session_payment`.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/mp-webhook/index.ts:76](<../../supabase/functions/mp-webhook/index.ts#L76>)

```ts

  // El id del manifest es el data.id del QUERY PARAM (protocolo MP), no el body.
  const manifestId = url.searchParams.get("data.id") || paymentId;
  const signature = req.headers.get("x-signature") || "";
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=") as [string, string])
  );
  if (!parts.ts || !parts.v1) return false;

  // Anti-replay: ts fuera de ventana → rechazar
  const ts = Number(parts.ts);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIGNATURE_TS_TOLERANCE_MS) {
```

[supabase/functions/mp-webhook/index.ts:90](<../../supabase/functions/mp-webhook/index.ts#L90>)

```ts

  const requestId = req.headers.get("x-request-id");
  // Pares con valor ausente se omiten del manifest (comportamiento del SDK)
  let manifest = `id:${manifestId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${parts.ts};`;

  const computed = await hmacHex(secret, manifest);
  return timingSafeEqual(computed, parts.v1);
}
```

[supabase/functions/mp-webhook/index.ts:104](<../../supabase/functions/mp-webhook/index.ts#L104>)

```ts

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const paymentId = body?.data?.id
      ? String(body.data.id)
      : url.searchParams.get("data.id");

    if (body?.type !== "payment" || !paymentId) {
      // MP también notifica otros tipos (merchant orders, ipn...).
      // 200 para que deje de reintentar.
      return jsonResponse(req, { received: true }, 200);
    }

    if (!(await signatureValid(req, paymentId, url))) {
      console.error("[mp-webhook] Firma inválida para pago", paymentId);
      return jsonResponse(req, { error: "invalid_signature" }, 401);
    }

    // 1. Estado REAL del pago (no confiamos en el body de la notificación)
    const payment = await mpApi.getPayment(paymentId);
    if (!payment) {
      console.error("[mp-webhook] No se pudo consultar el pago", paymentId);
      return jsonResponse(req, { error: "payment_lookup_failed" }, 500);
    }

    if (payment.status !== "approved") {
      console.log(`[mp-webhook] Pago ${paymentId} estado ${payment.status} — sin acción`);
      return jsonResponse(req, { received: true }, 200);
    }

    const externalRef = payment.external_reference || "";
    console.log(`[mp-webhook] Pago aprobado ${paymentId} ref=${externalRef} monto=${payment.transaction_amount}`);

    // 2. Conciliar con payment_intents (por id de pago MP)
    const { data: intent, error: intentErr } = await supabase
      .from("payment_intents")
```

[supabase/functions/mp-webhook/index.ts:151](<../../supabase/functions/mp-webhook/index.ts#L151>)

```ts
      console.error("[mp-webhook] Sin payment_intent para pago MP", paymentId, intentErr);
      return jsonResponse(req, { received: true }, 200);
    }

    // Validación de monto (tolerancia por redondeo de moneda local)
    const expectedAmount = Number(intent.amount);
    const paidAmount = Number(payment.transaction_amount ?? 0);
    if (Math.abs(expectedAmount - paidAmount) > 0.01) {
      console.error(
        `[mp-webhook] Monto discordante: esperado ${expectedAmount}, pagado ${paidAmount}`
```

[supabase/functions/mp-webhook/index.ts:167](<../../supabase/functions/mp-webhook/index.ts#L167>)

```ts
      if (markErr) console.error("[mp-webhook] Error marcando intent rechazado:", markErr);
      return jsonResponse(req, { received: true }, 200);
    }

    if (intent.status !== "pending") {
      console.log(`[mp-webhook] Intent ${intent.id} ya procesado (${intent.status})`);
      return jsonResponse(req, { received: true }, 200);
    }

    /** Marca el intent como confirmado ('authorized' — valor del CHECK). */
    const markAuthorized = async (): Promise<boolean> => {
      const { error: markErr } = await supabase
        .from("payment_intents")
        .update({ status: "authorized" })
        .eq("id", intent.id)
```

[supabase/functions/mp-webhook/index.ts:206](<../../supabase/functions/mp-webhook/index.ts#L206>)

```ts
        console.error("[mp-webhook] Error en auto_approve_registration_v2:", rpcErr);
        return jsonResponse(req, { error: "approval_failed" }, 500);
      }
      if (!result?.success) {
        // La RPC es idempotente (exige solicitud pending): si ya fue
        // procesada, la respuesta no-success es un replay benigno.
        console.log("[mp-webhook] auto_approve sin efecto:", result?.error);
        return jsonResponse(req, { received: true }, 200);
      }

      if (!(await markAuthorized())) {
        return jsonResponse(req, { error: "intent_update_failed" }, 500);
      }
      console.log(`[mp-webhook] Registro ${requestId} aprobado vía MP`);
      return jsonResponse(req, { received: true }, 200);
    }

    // 4. CASO B: pago de cuenta de mesa (ORDP-<session_id>)
    if (externalRef.startsWith("ORDP-")) {
      // Sesión desde el INTENT (fuente interna), no del external_reference
      const sessionId = intent.session_id || externalRef.slice("ORDP-".length);
      const { error: completeErr } = await supabase.rpc("complete_session_payment", {
        p_session_id: sessionId,
```

[supabase/functions/mp-webhook/index.ts:233](<../../supabase/functions/mp-webhook/index.ts#L233>)

```ts
        console.error("[mp-webhook] Error en complete_session_payment:", completeErr);
        return jsonResponse(req, { error: "session_completion_failed" }, 500);
      }

      if (!(await markAuthorized())) {
        return jsonResponse(req, { error: "intent_update_failed" }, 500);
      }
      console.log(`[mp-webhook] Sesión de mesa ${sessionId} pagada vía MP`);
      return jsonResponse(req, { received: true }, 200);
    }

    console.warn("[mp-webhook] Referencia desconocida:", externalRef);
    return jsonResponse(req, { received: true }, 200);
  } catch (err: any) {
    console.error("[mp-webhook] Error interno:", err.message);
    return jsonResponse(req, { error: "internal" }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-025"></a>

## API-025 — BODY JSON, sin restricción explícita de método /functions/v1/privacy-access

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: verifyRequesterIdentity: JWT del mismo email o pending_verification + correo.

Tablas del handler (incluye ramas hermanas): `audit_log`, `auth.users`, `consents`, `data_subject_requests`, `invitations`, `orders`, `registration_requests`, `restaurant_customers`, `restaurants`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/privacy-access/index.ts:18](<../../supabase/functions/privacy-access/index.ts#L18>)

```ts
  getClientIp,
  verifyRequesterIdentity,
  checkRateLimit,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
```

[supabase/functions/privacy-access/index.ts:91](<../../supabase/functions/privacy-access/index.ts#L91>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "access");

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "access") {
      return jsonResponse(req, { success: false, error: "type debe ser 'access'" }, 400);
    }

    // Rate-limit por IP + email
    const ip = getClientIp(req);
    const rl = await checkRateLimit(supabase, ip, email);
    if (!rl.allowed) {
      return jsonResponse(req, { success: false, error: "Límite de solicitudes alcanzado", reason: rl.reason }, 429);
    }

    // Verificar identidad del solicitante
    const identity = await verifyRequesterIdentity(supabaseAuth, req, email);

    const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();

    if (!identity.authorized) {
      // Crear DSAR pendiente de verificación
      const verificationToken = crypto.randomUUID();
      const { data: inserted, error: insErr } = await supabase
        .from("data_subject_requests")
```

[supabase/functions/privacy-access/index.ts:139](<../../supabase/functions/privacy-access/index.ts#L139>)

```ts
      // NO retornar verification_token
      return jsonResponse(req, {
        success: true,
        requestId: inserted.id,
        status: "pending_verification",
        message: "Hemos enviado un correo de verificación a " + email + ".",
      }, 200);
    }

    // Identidad verificada: ejecutar directamente
```

[supabase/functions/privacy-access/index.ts:190](<../../supabase/functions/privacy-access/index.ts#L190>)

```ts

    return jsonResponse(req, {
      success: true,
      requestId: inserted.id,
      status: "fulfilled",
      message: "Reporte de acceso generado.",
      data: report,
    }, 200);
  } catch (err) {
    console.error("privacy-access error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});

async function sendVerificationEmail(email: string, type: string, verificationUrl: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set. URL:", verificationUrl);
    return;
```

[supabase/functions/privacy-access/index.ts:217](<../../supabase/functions/privacy-access/index.ts#L217>)

```ts
    headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "CMOR FLOW <privacy@example.test>", to: email, subject, html }),
  });
}
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-026"></a>

## API-026 — BODY JSON, sin restricción explícita de método /functions/v1/privacy-erase

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: verifyRequesterIdentity: JWT del mismo email o pending_verification + correo.

Tablas del handler (incluye ramas hermanas): `audit_log`, `consents`, `data_subject_requests`, `invitations`, `orders`, `registration_requests`, `restaurant_customers`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/privacy-erase/index.ts:7](<../../supabase/functions/privacy-erase/index.ts#L7>)

```ts
//   2. Verificación de identidad requerida:
//      - Si hay JWT válido Y session.user.email === body.email → directo.
//      - Si no → se crea DSAR en status 'pending', se envía email con
//        verification_token, NO se ejecuta la acción destructiva hasta
//        que el titular haga click en el link (Edge Function verify-dsar).
//   3. NO se retorna verification_token en la respuesta HTTP.
//   4. Rate-limit por IP (10/día) + por email (3/30d).
// =====================================================================
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

[supabase/functions/privacy-erase/index.ts:21](<../../supabase/functions/privacy-erase/index.ts#L21>)

```ts
  getClientIp,
  verifyRequesterIdentity,
  checkRateLimit,
} from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE =
  Deno.env.get("SUPABASE_SERVICE_ROLE") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
```

[supabase/functions/privacy-erase/index.ts:48](<../../supabase/functions/privacy-erase/index.ts#L48>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "erase");
    const skipVerification = body.skip_verification === true; // solo para usuarios autenticados

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "erase") {
      return jsonResponse(req, { success: false, error: "type debe ser 'erase'" }, 400);
    }

    // Rate-limit por IP + email
    const ip = getClientIp(req);
    const rl = await checkRateLimit(supabase, ip, email);
    if (!rl.allowed) {
      return jsonResponse(
        req,
        { success: false, error: "Límite de solicitudes alcanzado", reason: rl.reason },
        429
      );
    }

    // Verificar identidad del solicitante
    const identity = await verifyRequesterIdentity(supabaseAuth, req, email);
    const isVerified = identity.authorized;

    // Si no está verificado Y no pidió skip, crear DSAR pending y enviar email
    if (!isVerified) {
      const slaDueAt = new Date(Date.now() + SLA_DAYS * 86400000).toISOString();
      const verificationToken = crypto.randomUUID();

      const { data: inserted, error: insErr } = await supabase
```

[supabase/functions/privacy-erase/index.ts:104](<../../supabase/functions/privacy-erase/index.ts#L104>)

```ts
      // NO retornar verification_token en la respuesta
      return jsonResponse(
        req,
        {
          success: true,
          requestId: inserted.id,
          status: "pending_verification",
          message: "Hemos enviado un correo de verificación a " + email + ". Haz click en el enlace para confirmar tu solicitud.",
        },
        200
```

[supabase/functions/privacy-erase/index.ts:157](<../../supabase/functions/privacy-erase/index.ts#L157>)

```ts

    return jsonResponse(
      req,
      {
        success: true,
        requestId: inserted.id,
        status: "fulfilled",
        message: "Supresión ejecutada. Tus datos personales fueron anonimizados o eliminados según obligación legal.",
        data: result,
      },
```

[supabase/functions/privacy-erase/index.ts:170](<../../supabase/functions/privacy-erase/index.ts#L170>)

```ts
    console.error("privacy-erase error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});

// =====================================================================
// Ejecuta la supresión/anonimización. Extraída para reuso desde verify-dsar.
// =====================================================================
export async function executeErase(supabase: any, email: string) {
  const nowIso = new Date().toISOString();
```

[supabase/functions/privacy-erase/index.ts:266](<../../supabase/functions/privacy-erase/index.ts#L266>)

```ts
    },
    body: JSON.stringify({
      from: "CMOR FLOW <privacy@example.test>",
      to: email,
      subject,
      html,
    }),
  });
}
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-027"></a>

## API-027 — BODY JSON, sin restricción explícita de método /functions/v1/privacy-export

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: CONTROL AUSENTE: no hay validación observable de identidad antes de exportar por email.

Tablas del handler (incluye ramas hermanas): `audit_log`, `auth.users`, `consents`, `data_subject_requests`, `invitations`, `orders`, `registration_requests`, `restaurant_customers`, `restaurants`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/privacy-export/index.ts:35](<../../supabase/functions/privacy-export/index.ts#L35>)

```ts
  const header = columns.join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCsv(r[c])).join(","))
    .join("\n");
  return header + "\n" + body;
}

async function collectSubjectData(email: string) {
  const lower = email.toLowerCase();

  const [authUser, restaurants, customers, prospects, invitations, consents] =
    await Promise.all([
      supabase
```

[supabase/functions/privacy-export/index.ts:92](<../../supabase/functions/privacy-export/index.ts#L92>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "export");

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "export") {
      return jsonResponse(req, { success: false, error: "type debe ser 'export'" }, 400);
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
      .select("*", { count: "exact", head: true })
      .eq("subject_email", email)
```

[supabase/functions/privacy-export/index.ts:111](<../../supabase/functions/privacy-export/index.ts#L111>)

```ts
    if ((count ?? 0) >= 3) {
      return jsonResponse(req, 
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
```

[supabase/functions/privacy-export/index.ts:181](<../../supabase/functions/privacy-export/index.ts#L181>)

```ts

    return jsonResponse(req, 
      {
        success: true,
        requestId: inserted.id,
        message: "Portabilidad de datos generada en formato JSON + CSV.",
        data: { json: collected, csv },
      },
      200
    );
```

[supabase/functions/privacy-export/index.ts:192](<../../supabase/functions/privacy-export/index.ts#L192>)

```ts
    console.error("privacy-export error:", err);
    return jsonResponse(req, { success: false, error: String(err) }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-028"></a>

## API-028 — BODY JSON, sin restricción explícita de método /functions/v1/privacy-object

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: CONTROL AUSENTE: revoca por email sin validación observable de identidad.

Tablas del handler (incluye ramas hermanas): `audit_log`, `auth.users`, `consents`, `data_subject_requests`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/privacy-object/index.ts:38](<../../supabase/functions/privacy-object/index.ts#L38>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "object");
    const payload = body.payload || {};
    const scope = String(payload.scope || "");

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "object") {
      return jsonResponse(req, { success: false, error: "type debe ser 'object'" }, 400);
    }
    if (!VALID_SCOPES.has(scope)) {
      return jsonResponse(req, 
        { success: false, error: "payload.scope inválido" },
        400
      );
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
```

[supabase/functions/privacy-object/index.ts:65](<../../supabase/functions/privacy-object/index.ts#L65>)

```ts
    if ((count ?? 0) >= 3) {
      return jsonResponse(req, 
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
```

[supabase/functions/privacy-object/index.ts:127](<../../supabase/functions/privacy-object/index.ts#L127>)

```ts

    return jsonResponse(req, 
      {
        success: true,
        requestId: inserted.id,
        message: `Te has opuesto al tratamiento '${scope}'. Se detuvo inmediatamente.`,
        data: result,
      },
      200
    );
```

[supabase/functions/privacy-object/index.ts:138](<../../supabase/functions/privacy-object/index.ts#L138>)

```ts
    console.error("privacy-object error:", err);
    return jsonResponse(req, { success: false, error: String(err) }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-029"></a>

## API-029 — BODY JSON, sin restricción explícita de método /functions/v1/privacy-rectify

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: pública: registra solicitud pending, no aplica corrección directamente.

Tablas del handler (incluye ramas hermanas): `audit_log`, `auth.users`, `data_subject_requests`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/privacy-rectify/index.ts:30](<../../supabase/functions/privacy-rectify/index.ts#L30>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "rectify");
    const payload = body.payload || {};

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "rectify") {
      return jsonResponse(req, { success: false, error: "type debe ser 'rectify'" }, 400);
    }
    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    if (fields.length === 0) {
      return jsonResponse(req, 
        { success: false, error: "payload.fields es obligatorio" },
        400
      );
    }

    // Rate-limit 3/mes.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
```

[supabase/functions/privacy-rectify/index.ts:57](<../../supabase/functions/privacy-rectify/index.ts#L57>)

```ts
    if ((count ?? 0) >= 3) {
      return jsonResponse(req, 
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    // Resolver subject_id.
    const { data: authRow } = await supabase
      .from("auth.users")
```

[supabase/functions/privacy-rectify/index.ts:99](<../../supabase/functions/privacy-rectify/index.ts#L99>)

```ts

    return jsonResponse(req, 
      {
        success: true,
        requestId: inserted.id,
        message:
          "Solicitud de rectificación recibida. El DPO la aplicará dentro de 15 días.",
      },
      200
    );
```

[supabase/functions/privacy-rectify/index.ts:110](<../../supabase/functions/privacy-rectify/index.ts#L110>)

```ts
    console.error("privacy-rectify error:", err);
    return jsonResponse(req, { success: false, error: String(err) }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-030"></a>

## API-030 — BODY JSON, sin restricción explícita de método /functions/v1/privacy-revoke-consent

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: CONTROL AUSENTE: revoca por email sin validación observable de identidad.

Tablas del handler (incluye ramas hermanas): `audit_log`, `auth.users`, `consents`, `data_subject_requests`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/privacy-revoke-consent/index.ts:38](<../../supabase/functions/privacy-revoke-consent/index.ts#L38>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const type = String(body.type || "revoke-consent");
    const payload = body.payload || {};
    const scope = String(payload.scope || "");

    if (!email || !email.includes("@")) {
      return jsonResponse(req, { success: false, error: "email inválido" }, 400);
    }
    if (type !== "revoke-consent") {
      return jsonResponse(req, 
        { success: false, error: "type debe ser 'revoke-consent'" },
        400
      );
    }
    if (!VALID_SCOPES.has(scope)) {
      return jsonResponse(req, 
        { success: false, error: "payload.scope inválido" },
        400
      );
    }

    // Rate-limit.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { count } = await supabase
      .from("data_subject_requests")
```

[supabase/functions/privacy-revoke-consent/index.ts:68](<../../supabase/functions/privacy-revoke-consent/index.ts#L68>)

```ts
    if ((count ?? 0) >= 3) {
      return jsonResponse(req, 
        { success: false, error: "Límite de 3 solicitudes por mes alcanzado." },
        429
      );
    }

    const { data: authRow } = await supabase
      .from("auth.users")
      .select("id")
```

[supabase/functions/privacy-revoke-consent/index.ts:129](<../../supabase/functions/privacy-revoke-consent/index.ts#L129>)

```ts

    return jsonResponse(req, 
      {
        success: true,
        requestId: inserted.id,
        message: `Consentimiento '${scope}' revocado inmediatamente.`,
        data: result,
      },
      200
    );
```

[supabase/functions/privacy-revoke-consent/index.ts:140](<../../supabase/functions/privacy-revoke-consent/index.ts#L140>)

```ts
    console.error("privacy-revoke-consent error:", err);
    return jsonResponse(req, { success: false, error: String(err) }, 500);
  }
});
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-031"></a>

## API-031 — BODY JSON, sin restricción explícita de método /functions/v1/verify-dsar

Feature: FEAT-019. Estado: CONFIRMADO (handler local). Autenticación/autorización: capability verification_token, pending_verification y TTL 24h; invalidación posterior a ejecución.

Tablas del handler (incluye ramas hermanas): `audit_log`, `consents`, `data_subject_requests`, `orders`, `restaurant_customers`. RPC: N/A.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/verify-dsar/index.ts:31](<../../supabase/functions/verify-dsar/index.ts#L31>)

```ts
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();

    if (!token || token.length < 32) {
      return jsonResponse(req, { success: false, error: "token inválido" }, 400);
    }

    // Buscar DSAR por verification_token
    const { data: dsar, error } = await supabase
      .from("data_subject_requests")
      .select("*")
      .eq("verification_token", token)
      .eq("status", "pending_verification")
```

[supabase/functions/verify-dsar/index.ts:47](<../../supabase/functions/verify-dsar/index.ts#L47>)

```ts
    if (error || !dsar) {
      return jsonResponse(
        req,
        { success: false, error: "token inválido, ya usado o solicitud no encontrada" },
        404
      );
    }

    // Validar expiración
    const createdAt = new Date(dsar.created_at).getTime();
```

[supabase/functions/verify-dsar/index.ts:62](<../../supabase/functions/verify-dsar/index.ts#L62>)

```ts
        .eq("id", dsar.id);
      return jsonResponse(
        req,
        { success: false, error: "token expirado", requestId: dsar.id },
        410
      );
    }

    // Marcar in_progress
    await supabase
```

[supabase/functions/verify-dsar/index.ts:97](<../../supabase/functions/verify-dsar/index.ts#L97>)

```ts
      default:
        return jsonResponse(
          req,
          { success: false, error: "request_type no soportado: " + dsar.request_type },
          400
        );
    }

    // Marcar fulfilled
    await supabase
```

[supabase/functions/verify-dsar/index.ts:131](<../../supabase/functions/verify-dsar/index.ts#L131>)

```ts

    return jsonResponse(
      req,
      {
        success: true,
        requestId: dsar.id,
        status: "fulfilled",
        request_type: dsar.request_type,
        message: "Tu solicitud fue verificada y ejecutada.",
        data: result,
```

[supabase/functions/verify-dsar/index.ts:145](<../../supabase/functions/verify-dsar/index.ts#L145>)

```ts
    console.error("verify-dsar error:", err);
    return jsonResponse(req, { success: false, error: "internal_error" }, 500);
  }
});

// =====================================================================
// Stubs para los demás request_types — implementar similar a executeErase.
// Por ahora retornan info de qué ejecutarían.
// =====================================================================
async function executeAccess(supabase: any, email: string) {
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-019. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-032"></a>

## API-032 — GET/POST /functions/v1/webhooks/flow

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: consulta proveedor y conciliación; Flow claim_flow_webhook_event; retorno del navegador no demuestra pago.

Tablas del handler (incluye ramas hermanas): `flow_customers`, `flow_payments`, `flow_subscriptions`, `flow_webhook_events`, `invitations`, `payment_intents`, `restaurant_tables`, `restaurants`, `table_sessions`. RPC: `auto_approve_registration_v2`, `claim_flow_webhook_event`, `complete_session_payment`.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/webhooks/flow/index.ts:65](<../../supabase/functions/webhooks/flow/index.ts#L65>)

```ts
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const requestId = url.searchParams.get("request_id");
  const origin = getTrustedReturnOrigin(url.searchParams.get("origin"));

  try {
    let token = "";

    // 1. Obtener token del body (form-urlencoded) o query params
    if (req.method === "POST") {
      try {
        const formData = await req.formData();
        token = formData.get("token") as string;
      } catch (err) {
        console.error("[webhooks/flow] Error parseando formData:", err);
      }
    }

    if (!token) {
      token = url.searchParams.get("token") || "";
    }

    if (!token) {
      console.error("[webhooks/flow] Error: token de Flow no encontrado en la petición");
      if (action === "return") {
        return Response.redirect(`${origin}/payment/error?reason=missing_token`, 302);
      }
      return new Response(JSON.stringify({ error: "token_not_found" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    console.log(`[webhooks/flow] Procesando notificación para token: ${token} (action: ${action})`);

    // 2. Obtener estado del pago en Flow
    let paymentStatus: FlowPaymentStatusResponse;
```

[supabase/functions/webhooks/flow/index.ts:110](<../../supabase/functions/webhooks/flow/index.ts#L110>)

```ts
      }
      return new Response(JSON.stringify({ error: "flow_api_error", details: err.message }), { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // SI ES RETORNO DEL NAVEGADOR DEL USUARIO (action = return)
    if (action === "return" && requestId) {
      console.log(`[webhooks/flow] Procesando retorno del navegador. Status del pago: ${paymentStatus.status}`);

```

[supabase/functions/webhooks/flow/index.ts:194](<../../supabase/functions/webhooks/flow/index.ts#L194>)

```ts
      console.error("[webhooks/flow] No se pudo reclamar el evento:", claimError);
      return new Response(JSON.stringify({ error: "webhook_claim_failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (claimStatus === "processed") {
      return new Response(JSON.stringify({ success: true, message: "already_processed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (claimStatus === "busy") {
      return new Response(JSON.stringify({ error: "webhook_in_progress" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { commerceOrder, status, amount } = paymentStatus;

    // 3. Procesar según tipo de orden (Registro Inicial vs Cobro Recurrente)
    
```

[supabase/functions/webhooks/flow/index.ts:238](<../../supabase/functions/webhooks/flow/index.ts#L238>)

```ts
        console.error(`[webhooks/flow] Intención ausente o inconsistente para el request: ${requestId}`);
        return new Response(JSON.stringify({ error: "invalid_payment_intent" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Si el pago está aprobado (status = 2)
      if (status === 2) {
        // Actualizar payment_intent local
        await supabase
```

[supabase/functions/webhooks/flow/index.ts:297](<../../supabase/functions/webhooks/flow/index.ts#L297>)

```ts
      if (!subscriptionId) {
        return new Response(JSON.stringify({ error: "invalid_subscription_order" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log(`[webhooks/flow] Detectado cobro de suscripción recurrente para subscriptionId: ${subscriptionId}`);

      // Buscar suscripción activa
      const { data: subscription } = await supabase
        .from("flow_subscriptions")
```

[supabase/functions/webhooks/flow/index.ts:412](<../../supabase/functions/webhooks/flow/index.ts#L412>)

```ts

    return new Response(JSON.stringify({ success: true, message: "webhook_processed_successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[webhooks/flow] Error procesando webhook:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-033"></a>

## API-033 — GET/POST /functions/v1/webhooks/webpay

Feature: FEAT-015. Estado: CONFIRMADO (handler local). Autenticación/autorización: consulta proveedor y conciliación; Flow claim_flow_webhook_event; retorno del navegador no demuestra pago.

Tablas del handler (incluye ramas hermanas): `payment_intents`, `registration_requests`. RPC: `auto_approve_registration_v2`.

### Entradas, respuestas, validaciones y errores observables

Los siguientes extractos conservan condiciones y JSON del handler completo; si aparecen otras subrutas, la condición delimita su aplicabilidad. Los bloques cortados son extractos, no schemas ejecutables.

[supabase/functions/webhooks/webpay/index.ts:36](<../../supabase/functions/webhooks/webpay/index.ts#L36>)

```ts
    const url = new URL(req.url);
    let tokenWs = url.searchParams.get("token_ws");
    let tbkToken = url.searchParams.get("tbk_token");

    // Transbank redirige mediante POST con Content-Type: application/x-www-form-urlencoded
    if (req.method === "POST") {
      try {
        const formData = await req.formData();
        if (formData.has("token_ws")) {
          tokenWs = formData.get("token_ws") as string;
        }
        if (formData.has("tbk_token")) {
          tbkToken = formData.get("tbk_token") as string;
        }
```

Side effects: escrituras y llamadas externas señaladas en los extractos; contexto de negocio en FEAT-015. Tests: consultar TESTING y TRACEABILITY; la existencia de un test no demuestra ejercicio del handler. Configuración JWT: [config local](../../supabase/config.toml); para funciones no declaradas allí, el despliegue efectivo REQUIERE VALIDACIÓN.

<a id="api-034"></a>

## API-034 — RPC /rest/v1/rpc/_deduct_inventory_for_order_internal

Feature: FEAT-010. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_order_id uuid`.
- Retorno y ejecución: `TABLE(item_processed integer, items_without_recipe integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql:88](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql#L88>).

### Semántica observable

```sql
SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = p_order_id;
IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002'; END IF;
WHERE reference_id = p_order_id::text AND movement_type = 'sale_deduction') INTO v_already_deducted;
IF v_already_deducted THEN RETURN QUERY SELECT 0, 0; RETURN; END IF;
v_actor := auth.uid();
jsonb_array_elements(o.items) AS elem WHERE o.id = p_order_id AND elem->>'menu_item_id' IS NOT NULL LOOP
WHERE menu_item_id = v_item.menu_item_id AND restaurant_id = v_restaurant_id;
IF v_recipe_id IS NULL THEN v_no_recipe := v_no_recipe + 1; CONTINUE; END IF;
FROM public.recipe_ingredients ri WHERE ri.recipe_id = v_recipe_id LOOP
UPDATE public.inventory_items
WHERE id = v_ingredient.inventory_item_id
RETURNING current_stock + v_needed, current_stock
INSERT INTO public.inventory_movements(restaurant_id, inventory_item_id, movement_type, quantity, reference_id, notes, created_by)
RETURN QUERY SELECT v_processed, v_no_recipe;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-035"></a>

## API-035 — RPC /rest/v1/rpc/_session_total_internal

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_session_id uuid`.
- Retorno y ejecución: `decimal LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260713000001_qr_tables.sql:225](<../../supabase/migrations/20260713000001_qr_tables.sql#L225>).

### Semántica observable

```sql
WHERE o.table_session_id = p_session_id
RETURN v_total;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-036"></a>

## API-036 — RPC /rest/v1/rpc/accounting_dispatch_cron

Feature: FEAT-022. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260905000001_accounting_module.sql:134](<../../supabase/migrations/20260905000001_accounting_module.sql#L134>).

### Semántica observable

```sql
SELECT secret INTO v_secret FROM public.accounting_cron_secret WHERE id = 1;
IF v_secret IS NULL THEN
RETURN NULL;
END IF;
WHERE tax_key_id IS NOT NULL AND tax_secret_encrypted IS NOT NULL;
IF v_pending = 0 THEN
RETURN NULL;
END IF;
RETURN net.http_post(
headers => jsonb_build_object(
body => jsonb_build_object('source', 'cron'),
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-037"></a>

## API-037 — RPC /rest/v1/rpc/adjust_inventory_stock

Feature: FEAT-010. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_item_id uuid, p_delta numeric, p_movement_type text, p_notes text DEFAULT NULL`.
- Retorno y ejecución: `public.inventory_movements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/inventoryService.ts](<../../src/services/inventoryService.ts>).
- Fuente: [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql:15](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql#L15>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(
(SELECT restaurant_id FROM public.inventory_items WHERE id = p_item_id)
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
-- Mismo dominio que el CHECK de inventory_movements.
IF p_movement_type NOT IN ('purchase', 'sale_deduction', 'manual_adjustment', 'waste', 'return') THEN
RAISE EXCEPTION 'invalid_movement_type' USING ERRCODE = '22023';
END IF;
UPDATE public.inventory_items
WHERE id = p_item_id
RETURNING current_stock INTO v_new_stock;
IF v_new_stock IS NULL THEN
RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'P0002';
END IF;
IF v_new_stock < 0 THEN
RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = '22023';
END IF;
SELECT auth.uid() INTO v_actor;
INSERT INTO public.inventory_movements (
(SELECT restaurant_id FROM public.inventory_items WHERE id = p_item_id),
) RETURNING * INTO v_movement;
RETURN v_movement;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-038"></a>

## API-038 — RPC /rest/v1/rpc/admin_create_restaurant

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_request_id UUID, p_restaurant_name TEXT, p_slug TEXT, p_owner_name TEXT, p_phone TEXT, p_email TEXT, p_city TEXT, p_address TEXT, p_subscription_plan TEXT, p_password_hash TEXT, p_internal_notes TEXT`.
- Retorno y ejecución: `TABLE ( restaurant_id UUID, user_id UUID, success BOOLEAN, message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260728000001_update_trial_to_14_days.sql:10](<../../supabase/migrations/20260728000001_update_trial_to_14_days.sql#L10>).

### Semántica observable

```sql
INSERT INTO public.restaurants (
CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END
RETURNING id INTO v_restaurant_id;
INSERT INTO public.users (restaurant_id, email, password_hash, temp_password, role)
RETURNING id INTO v_user_id;
UPDATE public.registration_requests
WHERE id = p_request_id;
RETURN QUERY SELECT v_restaurant_id, v_user_id, TRUE, 'Restaurante creado exitosamente';
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-039"></a>

## API-039 — RPC /rest/v1/rpc/admin_create_restaurant_v2

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_request_id uuid, p_restaurant_name text, p_slug text, p_owner_name text, p_phone text, p_email text, p_city text, p_address text, p_subscription_plan text, p_internal_notes text`.
- Retorno y ejecución: `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260831000001_multi_country.sql:513](<../../supabase/migrations/20260831000001_multi_country.sql#L513>).

### Semántica observable

```sql
IF NOT public.is_admin() THEN
RETURN QUERY SELECT NULL::uuid, NULL::uuid, FALSE, 'Permiso denegado: se requiere rol admin';
RETURN;
END IF;
WHERE rr.id = p_request_id;
IF v_country IS NULL THEN
END IF;
INSERT INTO public.restaurants (
CASE WHEN p_subscription_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END,
RETURNING id INTO v_restaurant_id;
INSERT INTO public.invitations (restaurant_id, email, token, expires_at)
now() + interval '7 days'
RETURNING id INTO v_invitation_id;
UPDATE public.registration_requests
WHERE id = p_request_id;
RETURN QUERY SELECT v_restaurant_id, v_invitation_id, true, 'Restaurante e invitación creados con éxito';
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-040"></a>

## API-040 — RPC /rest/v1/rpc/admin_delete_restaurant

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid`.
- Retorno y ejecución: `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260624000000_admin_delete_restaurant.sql:70](<../../supabase/migrations/20260624000000_admin_delete_restaurant.sql#L70>).

### Semántica observable

```sql
IF NOT public.is_admin() THEN
RAISE EXCEPTION 'Solo los administradores de la plataforma pueden eliminar un restaurante.';
END IF;
SELECT name INTO v_restaurant_name FROM public.restaurants WHERE id = p_restaurant_id;
IF NOT FOUND THEN
RAISE EXCEPTION 'El restaurante no existe.';
END IF;
DELETE FROM auth.users
WHERE id IN (
SELECT id FROM public.profiles WHERE restaurant_id = p_restaurant_id
DELETE FROM public.restaurants WHERE id = p_restaurant_id;
jsonb_build_object('name', v_restaurant_name),
RETURN true;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-041"></a>

## API-041 — RPC /rest/v1/rpc/admin_invite_owner

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_email text`.
- Retorno y ejecución: `TABLE(invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260101000001_auth_profiles.sql:207](<../../supabase/migrations/20260101000001_auth_profiles.sql#L207>).

### Semántica observable

```sql
IF NOT public.is_admin() THEN
RETURN QUERY SELECT NULL::uuid, FALSE, 'Permiso denegado: se requiere rol admin';
RETURN;
END IF;
UPDATE public.invitations
WHERE restaurant_id = p_restaurant_id AND status = 'pending';
INSERT INTO public.invitations (restaurant_id, email, role, created_by)
VALUES (p_restaurant_id, p_email, 'owner', auth.uid())
RETURNING id INTO v_invitation_id;
RETURN QUERY SELECT v_invitation_id, TRUE, 'Invitación en cola para envío';
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-042"></a>

## API-042 — RPC /rest/v1/rpc/admin_list_restaurants

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260828000004_audit_scope_restaurant_visibility.sql:33](<../../supabase/migrations/20260828000004_audit_scope_restaurant_visibility.sql#L33>).

### Semántica observable

```sql
WHERE public.is_admin();
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-043"></a>

## API-043 — RPC /rest/v1/rpc/admin_login

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_email TEXT, p_password_hash TEXT`.
- Retorno y ejecución: `TABLE ( id UUID, email TEXT, name TEXT ) LANGUAGE plpgsql SECURITY DEFINER`.
- Consumidores HTTP: [src/tests/security/S04-admin-login-revoked.test.ts](<../../src/tests/security/S04-admin-login-revoked.test.ts>).
- Fuente: [supabase/migrations/20260101000000_initial_schema.sql:249](<../../supabase/migrations/20260101000000_initial_schema.sql#L249>).

### Semántica observable

```sql
RETURN QUERY
WHERE au.email = LOWER(p_email)
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-044"></a>

## API-044 — RPC /rest/v1/rpc/admin_reject_request

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_request_id uuid, p_rejection_reason text`.
- Retorno y ejecución: `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql:97](<../../supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql#L97>).

### Semántica observable

```sql
IF NOT public.is_admin() THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
FROM public.registration_requests r WHERE r.id = p_request_id;
UPDATE public.registration_requests
WHERE id = p_request_id;
jsonb_build_object('status', 'rejected', 'rejection_reason', p_rejection_reason)
RETURN TRUE;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-045"></a>

## API-045 — RPC /rest/v1/rpc/admin_toggle_restaurant_status

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_is_active boolean, p_block_reason text DEFAULT NULL`.
- Retorno y ejecución: `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/adminService.ts](<../../src/services/adminService.ts>).
- Fuente: [supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql:58](<../../supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql#L58>).

### Semántica observable

```sql
IF NOT public.is_admin() THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
FROM public.restaurants r WHERE r.id = p_restaurant_id;
UPDATE public.restaurants
WHERE id = p_restaurant_id;
jsonb_build_object('is_active', p_is_active, 'block_reason', p_block_reason)
RETURN TRUE;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-046"></a>

## API-046 — RPC /rest/v1/rpc/auto_approve_registration_v2

Feature: FEAT-002. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_request_id uuid, p_plan text DEFAULT 'free_trial'::text, p_payment_provider text DEFAULT 'trial'::text, p_transaction_id text DEFAULT NULL::text, p_amount numeric DEFAULT 0`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- Consumidores HTTP: [src/tests/security/S02-auto-approve.test.ts](<../../src/tests/security/S02-auto-approve.test.ts>); [supabase/functions/activate-trial-registration/index.ts](<../../supabase/functions/activate-trial-registration/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../supabase/functions/webhooks/webpay/index.ts>).
- Fuente: [supabase/migrations/20260831000001_multi_country.sql:385](<../../supabase/migrations/20260831000001_multi_country.sql#L385>).

### Semántica observable

```sql
IF p_plan NOT IN ('free_trial', 'starter', 'pro', 'lifetime', 'test_plan') THEN
RETURN jsonb_build_object('success', false, 'error', 'invalid_plan');
END IF;
IF p_plan IN ('starter', 'pro', 'lifetime', 'test_plan')
AND NOT public.is_admin() THEN
RETURN jsonb_build_object(
END IF;
WHERE id = p_request_id AND status = 'pending';
IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'request_not_found_or_processed');
END IF;
IF v_request.email IS NULL OR btrim(v_request.email) = '' THEN
RETURN jsonb_build_object('success', false, 'error', 'owner_email_required');
END IF;
v_trial_ends := CASE WHEN p_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END;
IF v_slug = '' THEN
END IF;
INSERT INTO public.restaurants (
RETURNING id INTO v_restaurant_id;
UPDATE public.invitations
WHERE restaurant_id = v_restaurant_id
INSERT INTO public.invitations (restaurant_id, email, role, expires_at)
VALUES (v_restaurant_id, v_request.email, 'owner', now() + interval '7 days');
UPDATE public.registration_requests
internal_notes = jsonb_build_object(
WHERE id = p_request_id;
RETURN jsonb_build_object(
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-047"></a>

## API-047 — RPC /rest/v1/rpc/can_close_split_order

Feature: FEAT-013. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_order_id uuid`.
- Retorno y ejecución: `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/splitBillService.ts](<../../src/services/splitBillService.ts>).
- Fuente: [supabase/migrations/20260710000004_split_bills.sql:37](<../../supabase/migrations/20260710000004_split_bills.sql#L37>).

### Semántica observable

```sql
SELECT total, restaurant_id INTO v_total, v_restaurant FROM public.orders WHERE id = p_order_id;
IF v_restaurant IS NULL THEN
RETURN false;
END IF;
IF NOT public.is_my_restaurant(v_restaurant) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
FROM public.order_payments WHERE order_id = p_order_id AND payment_status = 'paid';
RETURN v_paid >= v_total;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-048"></a>

## API-048 — RPC /rest/v1/rpc/check_max_restaurants

Feature: FEAT-004. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000007_multi_restaurant.sql:17](<../../supabase/migrations/20260101000007_multi_restaurant.sql#L17>).

### Semántica observable

```sql
WHERE profile_id = NEW.profile_id;
IF current_count >= 5 THEN
RAISE EXCEPTION 'Límite alcanzado: máximo 5 restaurantes por usuario'
USING ERRCODE = 'check_violation';
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-049"></a>

## API-049 — RPC /rest/v1/rpc/check_rate_limit

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_identifier text, p_identifier_type text, p_endpoint text, p_max_attempts int DEFAULT 5, p_window_minutes int DEFAULT 60`.
- Retorno y ejecución: `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260622000013_p1_2_rate_limits.sql:28](<../../supabase/migrations/20260622000013_p1_2_rate_limits.sql#L28>).

### Semántica observable

```sql
v_window_start timestamptz := now() - (p_window_minutes || ' minutes')::interval;
DELETE FROM public.rate_limits
WHERE window_start < v_window_start
WHERE identifier = p_identifier
IF v_count >= p_max_attempts THEN
RETURN false;
END IF;
INSERT INTO public.rate_limits (identifier, identifier_type, endpoint, window_start)
RETURN true;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-050"></a>

## API-050 — RPC /rest/v1/rpc/claim_flow_webhook_event

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_flow_token text, p_payload jsonb`.
- Retorno y ejecución: `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [supabase/functions/webhooks/flow/index.ts](<../../supabase/functions/webhooks/flow/index.ts>).
- Fuente: [supabase/migrations/20260806000004_harden_flow_webhook_idempotency.sql:6](<../../supabase/migrations/20260806000004_harden_flow_webhook_idempotency.sql#L6>).

### Semántica observable

```sql
INSERT INTO public.flow_webhook_events (
WHERE public.flow_webhook_events.processed_at IS NULL
OR public.flow_webhook_events.processing_started_at < now() - interval '5 minutes'
RETURNING id INTO v_claimed_id;
IF v_claimed_id IS NOT NULL THEN
RETURN 'claimed';
END IF;
WHERE flow_token = p_flow_token;
RETURN CASE WHEN v_processed_at IS NOT NULL THEN 'processed' ELSE 'busy' END;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-051"></a>

## API-051 — RPC /rest/v1/rpc/close_cash_shift

Feature: FEAT-017. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_shift_id uuid, p_actual_cash numeric, p_notes text DEFAULT NULL`.
- Retorno y ejecución: `public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/cashShiftService.ts](<../../src/services/cashShiftService.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:467](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L467>).

### Semántica observable

```sql
SELECT * INTO v_shift FROM public.cash_shifts WHERE id = p_shift_id;
IF v_shift IS NULL THEN RAISE EXCEPTION 'shift not found' USING ERRCODE = 'P0002'; END IF;
IF NOT public.is_my_restaurant(v_shift.restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
IF v_shift.status = 'closed' THEN RETURN v_shift; END IF;
FROM public.orders WHERE restaurant_id = v_rest AND payment_status = 'paid'
SELECT COALESCE(sum(amount),0), COALESCE(sum(amount) FILTER (WHERE payment_method = 'cash'),0),
COALESCE(sum(amount) FILTER (WHERE payment_method IN ('card','qr')),0)
WHERE restaurant_id = v_rest AND created_at >= v_shift.opened_at AND created_at <= now();
WHERE w.restaurant_id = v_rest AND w.is_active = true GROUP BY w.id, w.name
UPDATE public.cash_shifts SET closed_by = auth.uid(), closed_at = now(), total_sales = v_total,
WHERE id = p_shift_id RETURNING * INTO v_shift;
RETURN v_shift;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-052"></a>

## API-052 — RPC /rest/v1/rpc/complete_session_payment

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_session_id uuid, p_tip_amount numeric DEFAULT 0, p_transaction_id text DEFAULT NULL`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [supabase/functions/mp-webhook/index.ts](<../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../supabase/functions/webhooks/flow/index.ts>).
- Fuente: [supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql:122](<../../supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql#L122>).

### Semántica observable

```sql
INTO v_session FROM public.table_sessions s WHERE s.id = p_session_id LIMIT 1;
IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'session_not_found'); END IF;
IF v_session.status = 'closed' THEN RETURN jsonb_build_object('success', true, 'already_closed', true); END IF;
UPDATE public.orders SET status = 'completed', payment_status = 'paid', payment_method = 'qr',
WHERE table_session_id = v_session.id AND status NOT IN ('completed','cancelled','rejected')
RETURNING id
IF p_tip_amount > 0 THEN
WHERE o.table_session_id = v_session.id AND o.waiter_id IS NOT NULL
INSERT INTO public.tips(restaurant_id, order_id, waiter_id, amount, percentage, payment_method, status)
END IF;
UPDATE public.table_sessions SET status = 'closed', closed_at = now(), tip_amount = p_tip_amount WHERE id = v_session.id;
UPDATE public.restaurant_tables SET status = 'available' WHERE id = v_session.table_id;
RETURN jsonb_build_object('success', true, 'orders_completed', v_processed_count, 'tip_amount', p_tip_amount);
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-053"></a>

## API-053 — RPC /rest/v1/rpc/consume_invitation

Feature: FEAT-002. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_token text`.
- Retorno y ejecución: `TABLE(restaurant_id uuid, email text, success boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth`.
- Consumidores HTTP: [src/pages/public/SetupPassword.tsx](<../../src/pages/public/SetupPassword.tsx>).
- Fuente: [supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql:6](<../../supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql#L6>).

### Semántica observable

```sql
IF auth.uid() IS NULL THEN RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE; RETURN; END IF;
WHERE i.token = p_token AND i.status IN ('pending', 'sent')
AND (i.expires_at IS NULL OR i.expires_at > now()) FOR UPDATE;
IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE; RETURN; END IF;
SELECT lower(u.email) INTO v_user_email FROM auth.users u WHERE u.id = auth.uid();
IF v_user_email IS NULL OR v_user_email <> lower(v_inv.email) THEN
RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE; RETURN;
END IF;
UPDATE public.profiles SET restaurant_id = v_inv.restaurant_id,
role = CASE WHEN v_inv.role = 'staff' THEN 'staff' ELSE 'owner' END WHERE id = auth.uid();
INSERT INTO public.profile_restaurants(profile_id, restaurant_id, is_primary)
VALUES (auth.uid(), v_inv.restaurant_id, true)
UPDATE public.invitations SET status = 'consumed', consumed_at = now() WHERE id = v_inv.id;
RETURN QUERY SELECT v_inv.restaurant_id, v_inv.email, TRUE;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-054"></a>

## API-054 — RPC /rest/v1/rpc/create_order

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_items jsonb, p_customer_name text DEFAULT NULL::text, p_customer_phone text DEFAULT NULL::text, p_customer_email text DEFAULT NULL::text, p_order_type text DEFAULT 'qr'::text, p_table_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_payment_method text DEFAULT 'qr'::text`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260831000001_multi_country.sql:93](<../../supabase/migrations/20260831000001_multi_country.sql#L93>).

### Semántica observable

```sql
IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
END IF;
IF jsonb_array_length(p_items) > 50 THEN
RETURN jsonb_build_object('success', false, 'error', 'too_many_items');
END IF;
WHERE id = p_restaurant_id AND is_active = true AND status IN ('active', 'trial');
IF NOT FOUND OR (v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now) THEN
RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
END IF;
IF NULLIF(trim(COALESCE(p_customer_phone, '')), '') IS NOT NULL
WHERE restaurant_id = p_restaurant_id AND phone = trim(p_customer_phone)
IF v_customer_id IS NULL THEN
INSERT INTO public.restaurant_customers(restaurant_id, name, phone, email)
RETURNING id INTO v_customer_id;
UPDATE public.restaurant_customers
WHERE id = v_customer_id;
END IF;
END IF;
IF NULLIF(v_item->>'menu_item_id', '') IS NULL
RETURN jsonb_build_object('success', false, 'error', 'invalid_item');
END IF;
WHERE id = (v_item->>'menu_item_id')::uuid
IF NOT FOUND THEN
RETURN jsonb_build_object('success', false, 'error', 'item_not_available', 'menu_item_id', v_item->>'menu_item_id');
END IF;
IF v_item ? 'selected_size' AND NULLIF(v_item->'selected_size'->>'name', '') IS NOT NULL THEN
WHERE size_option.value->>'name' = v_item->'selected_size'->>'name'
IF v_size IS NULL OR NULLIF(v_size->>'price', '') IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'invalid_size');
END IF;
END IF;
IF v_requested_addons > 0 THEN
WHERE addon_option.value->>'name' = v_requested_addon->>'name'
IF v_addon IS NULL OR NULLIF(v_addon->>'price', '') IS NULL THEN
RETURN jsonb_build_object('success', false, 'error', 'invalid_addon');
END IF;
END IF;
v_items_to_insert := v_items_to_insert || jsonb_build_array(jsonb_build_object(
INSERT INTO public.orders(
) RETURNING id INTO v_order_id;
RETURN jsonb_build_object('success', true, 'order_id', v_order_id,
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-055"></a>

## API-055 — RPC /rest/v1/rpc/create_restaurant_branch

Feature: FEAT-004. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_name text, p_email text, p_phone text, p_city text, p_address text, p_restaurant_type text, p_subscription_plan text, p_status text, p_is_active boolean`.
- Retorno y ejecución: `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260902000001_audit_fixes.sql:32](<../../supabase/migrations/20260902000001_audit_fixes.sql#L32>).

### Semántica observable

```sql
v_user_id := auth.uid();
IF v_user_id IS NULL THEN
RAISE EXCEPTION 'Not authenticated';
END IF;
WHERE pr.profile_id = v_user_id AND pr.is_primary = true
INSERT INTO public.restaurants (
) RETURNING id INTO v_new_restaurant_id;
INSERT INTO public.profile_restaurants (
RETURN v_new_restaurant_id;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-056"></a>

## API-056 — RPC /rest/v1/rpc/create_table_order

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_session_token text, p_order_data jsonb`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- Consumidores HTTP: [src/services/tableService.ts](<../../src/services/tableService.ts>).
- Fuente: [supabase/migrations/20260831000001_multi_country.sql:248](<../../supabase/migrations/20260831000001_multi_country.sql#L248>).

### Semántica observable

```sql
FROM public.table_sessions s WHERE s.session_token = p_session_token AND s.status = 'active' LIMIT 1;
IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_session'); END IF;
WHERE id = v_session.restaurant_id AND is_active = true AND status IN ('active','trial');
IF NOT FOUND OR (v_restaurant.status = 'trial' AND v_restaurant.trial_ends_at < v_now) THEN
RETURN jsonb_build_object('success', false, 'error', 'restaurant_not_active');
END IF;
IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
RETURN jsonb_build_object('success', false, 'error', 'empty_cart');
END IF;
IF jsonb_array_length(v_items) > 50 THEN RETURN jsonb_build_object('success', false, 'error', 'too_many_items'); END IF;
IF NULLIF(v_item->>'menu_item_id', '') IS NULL
RETURN jsonb_build_object('success', false, 'error', 'invalid_item');
END IF;
IF NULLIF(v_item->>'selected_size_id', '') IS NOT NULL
RETURN jsonb_build_object('success', false, 'error', 'menu_options_not_supported_for_table_qr');
END IF;
WHERE id = (v_item->>'menu_item_id')::uuid
IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'item_not_available'); END IF;
v_items_to_insert := v_items_to_insert || jsonb_build_array(jsonb_build_object(
INSERT INTO public.orders(
(SELECT table_number FROM public.restaurant_tables WHERE id = v_session.table_id),
) RETURNING id INTO v_order_id;
UPDATE public.table_sessions SET total_amount = public._session_total_internal(v_session.id) WHERE id = v_session.id;
RETURN jsonb_build_object('success', true, 'order_id', v_order_id,
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-057"></a>

## API-057 — RPC /rest/v1/rpc/create_waiter

Feature: FEAT-011. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_name text, p_pin text, p_role text DEFAULT 'waiter'`.
- Retorno y ejecución: `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`.
- Consumidores HTTP: [src/services/waiterService.ts](<../../src/services/waiterService.ts>).
- Fuente: [supabase/migrations/20260710000002_waiters.sql:95](<../../supabase/migrations/20260710000002_waiters.sql#L95>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
INSERT INTO public.waiters(restaurant_id, name, pin_hash, role)
RETURNING id INTO v_id;
RETURN v_id;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-058"></a>

## API-058 — RPC /rest/v1/rpc/deduct_inventory_for_order

Feature: FEAT-010. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_order_id uuid`.
- Retorno y ejecución: `TABLE(item_processed integer, items_without_recipe integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/inventoryService.ts](<../../src/services/inventoryService.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:428](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L428>).

### Semántica observable

```sql
SELECT restaurant_id INTO v_restaurant_id FROM public.orders WHERE id = p_order_id;
IF v_restaurant_id IS NULL THEN RAISE EXCEPTION 'order not found' USING ERRCODE = 'P0002'; END IF;
IF NOT public.is_my_restaurant(v_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
RETURN QUERY SELECT * FROM public._deduct_inventory_for_order_internal(p_order_id);
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-059"></a>

## API-059 — RPC /rest/v1/rpc/end_waiter_session

Feature: FEAT-011. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_session_id uuid`.
- Retorno y ejecución: `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/waiterService.ts](<../../src/services/waiterService.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:440](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L440>).

### Semántica observable

```sql
SELECT restaurant_id INTO v_restaurant FROM public.waiter_sessions WHERE id = p_session_id;
IF v_restaurant IS NULL THEN RAISE EXCEPTION 'session not found' USING ERRCODE = 'P0002'; END IF;
IF NOT public.is_my_restaurant(v_restaurant) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
UPDATE public.waiter_sessions SET ended_at = now() WHERE id = p_session_id AND ended_at IS NULL;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-060"></a>

## API-060 — RPC /rest/v1/rpc/enforce_order_payment_integrity

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:15](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L15>).

### Semántica observable

```sql
IF NEW.payment_status = 'paid'
END IF;
IF NEW.status = 'completed' AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
RAISE EXCEPTION 'Un pedido no puede completarse sin pago confirmado'
END IF;
IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-061"></a>

## API-061 — RPC /rest/v1/rpc/generate_order_number_atomic

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql:28](<../../supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql#L28>).

### Semántica observable

```sql
RETURN 'ORD-' || LPAD(v_next::text, 8, '0');
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-062"></a>

## API-062 — RPC /rest/v1/rpc/get_avg_ticket

Feature: FEAT-009. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE`.
- Retorno y ejecución: `TABLE ( avg_ticket numeric, min_ticket numeric, max_ticket numeric, total_orders int ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260710000008_notifications_usage.sql:142](<../../supabase/migrations/20260710000008_notifications_usage.sql#L142>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
RETURN QUERY
WHERE o.restaurant_id = p_restaurant_id
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-063"></a>

## API-063 — RPC /rest/v1/rpc/get_daily_sales

Feature: FEAT-009. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE`.
- Retorno y ejecución: `TABLE ( day date, total numeric, order_count int, avg_ticket numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260710000008_notifications_usage.sql:73](<../../supabase/migrations/20260710000008_notifications_usage.sql#L73>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
RETURN QUERY
WHERE o.restaurant_id = p_restaurant_id
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-064"></a>

## API-064 — RPC /rest/v1/rpc/get_my_order

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_token uuid`.
- Retorno y ejecución: `public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>); [src/tests/security/S01-rls-orders.test.ts](<../../src/tests/security/S01-rls-orders.test.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:284](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L284>).

### Semántica observable

```sql
WHERE o.access_token = p_token AND o.created_at > now() - interval '24 hours';
IF NOT FOUND THEN RAISE EXCEPTION 'Token inválido o expirado' USING ERRCODE = 'P0002'; END IF;
UPDATE public.orders SET access_token = NULL WHERE id = v_order.id;
RETURN v_order;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-065"></a>

## API-065 — RPC /rest/v1/rpc/get_my_restaurant

Feature: FEAT-004. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `SETOF public.restaurants LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000001_auth_profiles.sql:112](<../../supabase/migrations/20260101000001_auth_profiles.sql#L112>).

### Semántica observable

```sql
WHERE p.id = auth.uid()
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-066"></a>

## API-066 — RPC /rest/v1/rpc/get_reports_summary

Feature: FEAT-009. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:302](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L302>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
SELECT jsonb_build_object(
WHERE restaurant_id = p_restaurant_id
RETURN v_result;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-067"></a>

## API-067 — RPC /rest/v1/rpc/get_sales_by_hour

Feature: FEAT-009. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE`.
- Retorno y ejecución: `TABLE ( hour_of_day int, total numeric, order_count int ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260710000008_notifications_usage.sql:173](<../../supabase/migrations/20260710000008_notifications_usage.sql#L173>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
RETURN QUERY
WHERE o.restaurant_id = p_restaurant_id
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-068"></a>

## API-068 — RPC /rest/v1/rpc/get_sales_by_order_type

Feature: FEAT-009. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE`.
- Retorno y ejecución: `TABLE ( order_type text, total numeric, order_count int, percentage numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260710000008_notifications_usage.sql:204](<../../supabase/migrations/20260710000008_notifications_usage.sql#L204>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
WHERE restaurant_id = p_restaurant_id
RETURN QUERY
WHERE o.restaurant_id = p_restaurant_id
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-069"></a>

## API-069 — RPC /rest/v1/rpc/get_session_by_token

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_session_token text`.
- Retorno y ejecución: `TABLE( session_id uuid, restaurant_id uuid, table_id uuid, table_number text, status text, started_at timestamptz, total_amount decimal, tip_amount decimal ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/tableService.ts](<../../src/services/tableService.ts>).
- Fuente: [supabase/migrations/20260713000001_qr_tables.sql:166](<../../supabase/migrations/20260713000001_qr_tables.sql#L166>).

### Semántica observable

```sql
WHERE s.session_token = p_session_token
IF v_row IS NULL THEN RETURN; END IF;
RETURN QUERY SELECT v_row.id, v_row.restaurant_id, v_row.table_id,
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-070"></a>

## API-070 — RPC /rest/v1/rpc/get_table_by_token

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_qr_token text`.
- Retorno y ejecución: `TABLE( id uuid, restaurant_id uuid, table_number text, capacity integer, status text, restaurant_currency text, restaurant_country text, restaurant_language text ) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- Consumidores HTTP: [src/services/tableService.ts](<../../src/services/tableService.ts>).
- Fuente: [supabase/migrations/20260831000001_multi_country.sql:342](<../../supabase/migrations/20260831000001_multi_country.sql#L342>).

### Semántica observable

```sql
WHERE t.qr_token = p_qr_token
IF v_row IS NULL THEN
RETURN;
END IF;
RETURN QUERY SELECT v_row.id, v_row.restaurant_id, v_row.table_number,
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-071"></a>

## API-071 — RPC /rest/v1/rpc/get_table_orders

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_session_token text`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/tableService.ts](<../../src/services/tableService.ts>).
- Fuente: [supabase/migrations/20260713000001_qr_tables.sql:191](<../../supabase/migrations/20260713000001_qr_tables.sql#L191>).

### Semántica observable

```sql
WHERE s.session_token = p_session_token
IF v_session IS NULL THEN
RETURN '[]'::jsonb;
END IF;
jsonb_build_object(
WHERE o.table_session_id = v_session.id;
RETURN v_out;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-072"></a>

## API-072 — RPC /rest/v1/rpc/get_top_items

Feature: FEAT-009. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE, p_limit int DEFAULT 20`.
- Retorno y ejecución: `TABLE ( menu_item_id uuid, name text, total_sold int, revenue numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260710000008_notifications_usage.sql:106](<../../supabase/migrations/20260710000008_notifications_usage.sql#L106>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
RETURN QUERY
WHERE o.restaurant_id = p_restaurant_id
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-073"></a>

## API-073 — RPC /rest/v1/rpc/handle_new_user

Feature: FEAT-002. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260806000002_secure_owner_activation.sql:3](<../../supabase/migrations/20260806000002_secure_owner_activation.sql#L3>).

### Semántica observable

```sql
INSERT INTO public.profiles (id, role, restaurant_id, display_name)
RETURN NEW;
RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-074"></a>

## API-074 — RPC /rest/v1/rpc/is_admin

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/tests/integration/I03-I10-rpcs-auth-storage.test.ts](<../../src/tests/integration/I03-I10-rpcs-auth-storage.test.ts>).
- Fuente: [supabase/migrations/20260628000001_fix_is_admin_webhook.sql:9](<../../supabase/migrations/20260628000001_fix_is_admin_webhook.sql#L9>).

### Semántica observable

```sql
WHERE id = auth.uid() AND role = 'admin'
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-075"></a>

## API-075 — RPC /rest/v1/rpc/is_flag_enabled

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_key text, p_restaurant_id uuid DEFAULT NULL`.
- Retorno y ejecución: `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/restaurantService.ts](<../../src/services/restaurantService.ts>).
- Fuente: [supabase/migrations/20260622000003_p0_3_feature_flags.sql:33](<../../supabase/migrations/20260622000003_p0_3_feature_flags.sql#L33>).

### Semántica observable

```sql
SELECT * INTO v_flag FROM public.feature_flags WHERE key = p_key;
IF NOT FOUND THEN
RETURN false;
END IF;
IF NOT v_flag.enabled_globally THEN
IF p_restaurant_id IS NULL THEN
RETURN false;
END IF;
RETURN p_restaurant_id = ANY(v_flag.enabled_for_restaurants);
END IF;
IF p_restaurant_id IS NOT NULL AND p_restaurant_id = ANY(v_flag.disabled_for_restaurants) THEN
RETURN false;
END IF;
IF v_flag.rollout_percentage >= 100 THEN
RETURN true;
END IF;
IF v_flag.rollout_percentage = 0 THEN
RETURN true;
END IF;
IF p_restaurant_id IS NULL THEN
RETURN true;
END IF;
RETURN (v_hash % 100) < v_flag.rollout_percentage;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-076"></a>

## API-076 — RPC /rest/v1/rpc/is_my_restaurant

Feature: FEAT-004. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid`.
- Retorno y ejecución: `boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000007_multi_restaurant.sql:57](<../../supabase/migrations/20260101000007_multi_restaurant.sql#L57>).

### Semántica observable

```sql
WHERE profile_id = auth.uid()
) OR public.is_admin();
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-077"></a>

## API-077 — RPC /rest/v1/rpc/kds_get_orders

Feature: FEAT-016. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_kitchen_token text`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/kdsService.ts](<../../src/services/kdsService.ts>).
- Fuente: [supabase/migrations/20260807020000_harden_public_kds_access.sql:67](<../../supabase/migrations/20260807020000_harden_public_kds_access.sql#L67>).

### Semántica observable

```sql
WHERE r.kitchen_token = p_kitchen_token
IF v_restaurant IS NULL THEN RAISE EXCEPTION 'invalid' USING ERRCODE = '42501'; END IF;
SELECT COALESCE(jsonb_agg(jsonb_build_object(
SELECT jsonb_agg(jsonb_build_object(
WHERE o.restaurant_id = v_restaurant
RETURN v_out;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-078"></a>

## API-078 — RPC /rest/v1/rpc/kds_get_restaurant

Feature: FEAT-016. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_kitchen_token text`.
- Retorno y ejecución: `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`.
- Consumidores HTTP: [src/services/kdsService.ts](<../../src/services/kdsService.ts>).
- Fuente: [supabase/migrations/20260831000001_multi_country.sql:670](<../../supabase/migrations/20260831000001_multi_country.sql#L670>).

### Semántica observable

```sql
WHERE r.kitchen_token = p_kitchen_token
IF v_row IS NULL THEN RAISE EXCEPTION 'invalid' USING ERRCODE = '42501'; END IF;
RETURN jsonb_build_object(
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-079"></a>

## API-079 — RPC /rest/v1/rpc/kitchen_login

Feature: FEAT-016. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_pin text`.
- Retorno y ejecución: `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`.
- Consumidores HTTP: [src/services/kdsService.ts](<../../src/services/kdsService.ts>).
- Fuente: [supabase/migrations/20260807020000_harden_public_kds_access.sql:14](<../../supabase/migrations/20260807020000_harden_public_kds_access.sql#L14>).

### Semántica observable

```sql
IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 32 THEN
RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
END IF;
IF v_client_ip IS NOT NULL
AND NOT public.check_rate_limit(
RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
END IF;
WHERE r.id = p_restaurant_id AND r.is_active = true AND r.status IN ('active','trial');
IF v_hash IS NULL OR crypt(p_pin, v_hash) <> v_hash THEN
RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
END IF;
UPDATE public.restaurants
kitchen_token_expires_at = now() + interval '12 hours'
WHERE id = p_restaurant_id;
RETURN v_token;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-080"></a>

## API-080 — RPC /rest/v1/rpc/kitchen_pin_is_set

Feature: FEAT-016. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid`.
- Retorno y ejecución: `boolean LANGUAGE sql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/pages/restaurant/RestaurantSettings.tsx](<../../src/pages/restaurant/RestaurantSettings.tsx>).
- Fuente: [supabase/migrations/20260828000005_audit_kitchen_pin_status.sql:11](<../../supabase/migrations/20260828000005_audit_kitchen_pin_status.sql#L11>).

### Semántica observable

```sql
SELECT public.is_my_restaurant(p_restaurant_id)
WHERE r.id = p_restaurant_id AND r.kitchen_pin_hash IS NOT NULL
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-081"></a>

## API-081 — RPC /rest/v1/rpc/log_admin_action

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_action text, p_target_type text DEFAULT NULL, p_target_id uuid DEFAULT NULL, p_before jsonb DEFAULT NULL, p_after jsonb DEFAULT NULL`.
- Retorno y ejecución: `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260624000000_admin_delete_restaurant.sql:13](<../../supabase/migrations/20260624000000_admin_delete_restaurant.sql#L13>).

### Semántica observable

```sql
INSERT INTO public.audit_log (
auth.uid(),
(SELECT email FROM auth.users WHERE id = auth.uid()) AS email
WHERE auth.uid() IS NOT NULL;
IF NOT FOUND THEN
INSERT INTO public.audit_log (
END IF;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-082"></a>

## API-082 — RPC /rest/v1/rpc/mark_notifications_read

Feature: FEAT-023. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid`.
- Retorno y ejecución: `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/dashboardService.ts](<../../src/services/dashboardService.ts>).
- Fuente: [supabase/migrations/20260710000008_notifications_usage.sql:50](<../../supabase/migrations/20260710000008_notifications_usage.sql#L50>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
UPDATE public.notifications
WHERE restaurant_id = p_restaurant_id AND is_read = false;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-083"></a>

## API-083 — RPC /rest/v1/rpc/normalize_paid_subscription_status

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260806000001_lifetime_plan.sql:150](<../../supabase/migrations/20260806000001_lifetime_plan.sql#L150>).

### Semántica observable

```sql
IF NEW.subscription_plan IN ('starter', 'pro', 'enterprise', 'lifetime')
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-084"></a>

## API-084 — RPC /rest/v1/rpc/notify_order_event

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260629000003_realtime_orders_events_workaround.sql:47](<../../supabase/migrations/20260629000003_realtime_orders_events_workaround.sql#L47>).

### Semántica observable

```sql
IF TG_OP = 'DELETE' THEN
INSERT INTO public.orders_events (order_id, restaurant_id, event_type, order_data)
RETURN OLD;
INSERT INTO public.orders_events (order_id, restaurant_id, event_type, order_data)
RETURN NEW;
INSERT INTO public.orders_events (order_id, restaurant_id, event_type, order_data)
RETURN NEW;
END IF;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-085"></a>

## API-085 — RPC /rest/v1/rpc/on_order_completed_deduct_inventory

Feature: FEAT-010. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260710000001_inventory.sql:213](<../../supabase/migrations/20260710000001_inventory.sql#L213>).

### Semántica observable

```sql
IF (NEW.status = 'completed') AND (OLD.status IS DISTINCT FROM 'completed') THEN
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-086"></a>

## API-086 — RPC /rest/v1/rpc/open_cash_shift

Feature: FEAT-017. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_opening_cash decimal DEFAULT 0, p_notes text DEFAULT NULL, p_responsible_waiter_id uuid DEFAULT NULL`.
- Retorno y ejecución: `public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/cashShiftService.ts](<../../src/services/cashShiftService.ts>).
- Fuente: [supabase/migrations/20260714000002_cash_shift_responsible.sql:26](<../../supabase/migrations/20260714000002_cash_shift_responsible.sql#L26>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
RAISE EXCEPTION 'El fondo inicial no puede ser negativo' USING ERRCODE = '23514';
END IF;
WHERE restaurant_id = p_restaurant_id AND status = 'open'
IF v_existing IS NOT NULL THEN
RETURN v_existing;
END IF;
INSERT INTO public.cash_shifts(
VALUES (p_restaurant_id, auth.uid(), p_opening_cash, p_notes, p_responsible_waiter_id)
RETURNING * INTO v_existing;
RETURN v_existing;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-087"></a>

## API-087 — RPC /rest/v1/rpc/restaurant_login

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_email TEXT, p_password_hash TEXT`.
- Retorno y ejecución: `TABLE ( id UUID, email TEXT, role TEXT, restaurant_id UUID, temp_password BOOLEAN, restaurant_name TEXT, restaurant_slug TEXT, restaurant_is_active BOOLEAN ) LANGUAGE plpgsql SECURITY DEFINER`.
- Consumidores HTTP: [src/tests/security/S04-admin-login-revoked.test.ts](<../../src/tests/security/S04-admin-login-revoked.test.ts>).
- Fuente: [supabase/migrations/20260101000000_initial_schema.sql:271](<../../supabase/migrations/20260101000000_initial_schema.sql#L271>).

### Semántica observable

```sql
RETURN QUERY
WHERE u.email = LOWER(p_email)
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-088"></a>

## API-088 — RPC /rest/v1/rpc/run_retention_sweep

Feature: FEAT-019. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `TABLE(table_name text, rows_affected bigint, action text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000002_privacy_foundation.sql:307](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L307>).

### Semántica observable

```sql
DELETE FROM public.registration_requests
WHERE status = 'rejected'
AND created_at < now() - interval '12 months'
RETURNING 1
RETURN QUERY SELECT 'registration_requests'::text, v_deleted, 'delete'::text;
DELETE FROM public.invitations
WHERE status IN ('pending','sent')
AND created_at < now() - interval '7 days'
RETURNING 1
RETURN QUERY SELECT 'invitations'::text, v_deleted, 'delete'::text;
UPDATE public.restaurant_customers c SET
WHERE c.updated_at < now() - interval '24 months'
WHERE o.customer_id = c.id
AND o.created_at > now() - interval '24 months'
RETURNING 1
RETURN QUERY SELECT 'restaurant_customers'::text, v_updated, 'anonymize'::text;
UPDATE public.orders SET
WHERE completed_at < now() - interval '6 years'
RETURNING 1
RETURN QUERY SELECT 'orders'::text, v_updated, 'anonymize_personal'::text;
DELETE FROM public.audit_log
WHERE created_at < now() - interval '24 months'
RETURNING 1
RETURN QUERY SELECT 'audit_log'::text, v_deleted, 'delete'::text;
DELETE FROM public.audit_log
WHERE created_at < now() - interval '36 months'
RETURNING 1
RETURN QUERY SELECT 'audit_log'::text, v_deleted, 'delete_security'::text;
RETURN;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-089"></a>

## API-089 — RPC /rest/v1/rpc/security_check_admin_users_grants

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `TABLE(anon_select boolean, auth_select boolean) LANGUAGE sql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000002_privacy_foundation.sql:507](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L507>).

### Semántica observable

```sql

```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-090"></a>

## API-090 — RPC /rest/v1/rpc/security_check_rls_status

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `TABLE(table_name text, rls_enabled boolean) LANGUAGE sql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000002_privacy_foundation.sql:478](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L478>).

### Semántica observable

```sql
WHERE n.nspname = 'public'
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-091"></a>

## API-091 — RPC /rest/v1/rpc/security_check_security_definer

Feature: FEAT-003. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `TABLE(proname text) LANGUAGE sql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000002_privacy_foundation.sql:494](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L494>).

### Semántica observable

```sql
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'security_check_%'
AND p.proname NOT IN ('run_retention_sweep', 'is_admin', 'is_my_restaurant')
AND position('is_admin' in pg_get_functiondef(p.oid)) = 0;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-092"></a>

## API-092 — RPC /rest/v1/rpc/set_breach_updated_at

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000002_privacy_foundation.sql:429](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L429>).

### Semántica observable

```sql
BEGIN NEW.updated_at = now(); RETURN NEW; END;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-093"></a>

## API-093 — RPC /rest/v1/rpc/set_dsr_updated_at

Feature: FEAT-019. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260101000002_privacy_foundation.sql:271](<../../supabase/migrations/20260101000002_privacy_foundation.sql#L271>).

### Semántica observable

```sql
BEGIN NEW.updated_at = now(); RETURN NEW; END;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-094"></a>

## API-094 — RPC /rest/v1/rpc/set_kitchen_pin

Feature: FEAT-016. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_pin text`.
- Retorno y ejecución: `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`.
- Consumidores HTTP: [src/services/kdsService.ts](<../../src/services/kdsService.ts>).
- Fuente: [supabase/migrations/20260713000004_kds_set_pin.sql:9](<../../supabase/migrations/20260713000004_kds_set_pin.sql#L9>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 32 THEN
RAISE EXCEPTION 'PIN debe tener entre 4 y 32 caracteres' USING ERRCODE = '23514';
END IF;
UPDATE public.restaurants
WHERE id = p_restaurant_id;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-095"></a>

## API-095 — RPC /rest/v1/rpc/set_order_number

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql:45](<../../supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql#L45>).

### Semántica observable

```sql
IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-096"></a>

## API-096 — RPC /rest/v1/rpc/start_table_session

Feature: FEAT-014. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_table_id uuid`.
- Retorno y ejecución: `TABLE(session_token text, session_id uuid, table_number text, restaurant_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: [src/services/tableService.ts](<../../src/services/tableService.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:355](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L355>).

### Semántica observable

```sql
WHERE t.id = p_table_id LIMIT 1;
IF v_table IS NULL OR v_table.is_active = false OR v_table.r_active = false OR v_table.r_status NOT IN ('active','trial') THEN
RAISE EXCEPTION 'invalid table' USING ERRCODE = '42501';
END IF;
WHERE s.table_id = p_table_id AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1;
IF v_existing IS NOT NULL THEN
RETURN QUERY SELECT v_existing.session_token, v_existing.id, v_table.table_number, v_table.restaurant_id; RETURN;
END IF;
INSERT INTO public.table_sessions AS ts(table_id, restaurant_id, status)
RETURNING ts.id, ts.session_token INTO v_new_session_id, v_new_session_token;
UPDATE public.restaurant_tables SET status = 'occupied' WHERE id = v_table.id;
RETURN QUERY SELECT v_new_session_token, v_new_session_id, v_table.table_number, v_table.restaurant_id;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-097"></a>

## API-097 — RPC /rest/v1/rpc/sweep_expired_trials

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql:109](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql#L109>).

### Semántica observable

```sql
UPDATE public.restaurants
WHERE subscription_plan = 'free_trial'
RETURN v_blocked;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-098"></a>

## API-098 — RPC /rest/v1/rpc/update_waiter

Feature: FEAT-011. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_waiter_id uuid, p_name text DEFAULT NULL, p_pin text DEFAULT NULL, p_role text DEFAULT NULL, p_is_active boolean DEFAULT NULL`.
- Retorno y ejecución: `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`.
- Consumidores HTTP: [src/services/waiterService.ts](<../../src/services/waiterService.ts>).
- Fuente: [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql:452](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql#L452>).

### Semántica observable

```sql
SELECT restaurant_id INTO v_restaurant FROM public.waiters WHERE id = p_waiter_id;
IF v_restaurant IS NULL THEN RAISE EXCEPTION 'waiter not found' USING ERRCODE = 'P0002'; END IF;
IF NOT public.is_my_restaurant(v_restaurant) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
UPDATE public.waiters SET name = COALESCE(p_name, name),
WHERE id = p_waiter_id;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-099"></a>

## API-099 — RPC /rest/v1/rpc/validate_image_urls

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260622000004_p0_8_validate_image_urls.sql:17](<../../supabase/migrations/20260622000004_p0_8_validate_image_urls.sql#L17>).

### Semántica observable

```sql
IF NEW.image_urls IS NULL THEN
RETURN NEW;
END IF;
IF v_count > 3 THEN
RAISE EXCEPTION 'Max 3 images per menu item, got %', v_count
END IF;
IF v_url !~ '^https?://[a-zA-Z0-9]' THEN
RAISE EXCEPTION 'Invalid image URL (must start with http:// or https://): %', v_url
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-100"></a>

## API-100 — RPC /rest/v1/rpc/validate_public_order_write

Feature: FEAT-006. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `{}`.
- Retorno y ejecución: `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`.
- Consumidores HTTP: MISSING; revisar llamadas SQL y grants antes de declarar huérfana.
- Fuente: [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql:16](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql#L16>).

### Semántica observable

```sql
IF current_user <> 'service_role' THEN
WHERE r.id = NEW.restaurant_id;
IF v_rest_status IS NULL
RAISE EXCEPTION 'service_unavailable' USING ERRCODE = '22023';
END IF;
END IF;
IF NEW.total IS NULL OR NEW.total <= 0
RAISE EXCEPTION 'invalid_order_amount' USING ERRCODE = '22023';
END IF;
IF jsonb_typeof(NEW.items) <> 'array'
RAISE EXCEPTION 'invalid_order_items' USING ERRCODE = '22023';
END IF;
IF jsonb_typeof(v_item) <> 'object'
RAISE EXCEPTION 'invalid_item_quantity' USING ERRCODE = '22023';
END IF;
IF v_client_ip IS NOT NULL THEN
v_allowed := public.check_rate_limit(
IF NOT v_allowed THEN
RAISE EXCEPTION 'order_rate_limit_exceeded' USING ERRCODE = 'P0001';
END IF;
END IF;
RETURN NEW;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-101"></a>

## API-101 — RPC /rest/v1/rpc/validate_waiter_pin

Feature: FEAT-011. Estado: CONFIRMADO (última definición textual con ese nombre); exposición HTTP efectiva REQUIERE VALIDACIÓN. Funciones trigger/internas no son endpoints utilizables sólo por existir.

- Parámetros/body: `p_restaurant_id uuid, p_pin text`.
- Retorno y ejecución: `TABLE(waiter_id uuid, waiter_name text, waiter_role text, session_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`.
- Consumidores HTTP: [src/services/waiterService.ts](<../../src/services/waiterService.ts>).
- Fuente: [supabase/migrations/20260710000002_waiters.sql:66](<../../supabase/migrations/20260710000002_waiters.sql#L66>).

### Semántica observable

```sql
IF NOT public.is_my_restaurant(p_restaurant_id) THEN
RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END IF;
WHERE w.restaurant_id = p_restaurant_id AND w.is_active = true
IF v_row IS NULL THEN
RETURN;
END IF;
INSERT INTO public.waiter_sessions(waiter_id, restaurant_id) VALUES (v_row.id, p_restaurant_id)
RETURNING id INTO v_session;
RETURN QUERY SELECT v_row.id, v_row.name, v_row.role, v_session;
```

Autorización y grants: [cronología SQL](SQL_CATALOG.md); considerar ALTER FUNCTION y REVOKE posteriores a la definición. Códigos HTTP exactos del gateway: DESCONOCIDO; SQLSTATE y errores de negocio figuran arriba. Tests y controles relacionados: [matriz](TRACEABILITY.md).

<a id="api-102"></a>

## API-102 — GET /rest/v1/profiles

Feature principal: FEAT-001; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/hooks/useAuth.ts:57](<../../src/hooks/useAuth.ts#L57>).

```ts
.from("profiles")
        .select("*")
        .eq("id", userId)
        .single()) as { data: Profile | null };
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-103"></a>

## API-103 — GET /rest/v1/profile_restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/hooks/useAuth.ts:67](<../../src/hooks/useAuth.ts#L67>).

```ts
.from("profile_restaurants")
        .select("restaurant_id, is_primary")
        .eq("profile_id", userId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-104"></a>

## API-104 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/hooks/useAuth.ts:74](<../../src/hooks/useAuth.ts#L74>).

```ts
.from("restaurants")
          .select(RESTAURANT_COLUMNS)
          .in("id", restaurantIds)) as { data: Restaurant[] | null };
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-105"></a>

## API-105 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/hooks/useAuth.ts:89](<../../src/hooks/useAuth.ts#L89>).

```ts
.from("restaurants")
            .select(RESTAURANT_COLUMNS)
            .eq("id", profile.restaurant_id)
            .single()) as { data: Restaurant | null };
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-106"></a>

## API-106 — PATCH /rest/v1/profiles

Feature principal: FEAT-001; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/hooks/useAuth.ts:187](<../../src/hooks/useAuth.ts#L187>).

```ts
.from("profiles")
      .update({ restaurant_id: restaurantId })
      .eq("id", state.profile.id);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-107"></a>

## API-107 — GET /rest/v1/flow_customers

Feature principal: FEAT-018; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/hooks/useFlowSubscription.ts:39](<../../src/hooks/useFlowSubscription.ts#L39>).

```ts
.from("flow_customers")
        .select("credit_card_type, last4_card_digits")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-108"></a>

## API-108 — GET /rest/v1/profiles

Feature principal: FEAT-001; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/admin/LoginPage.tsx:49](<../../src/pages/admin/LoginPage.tsx#L49>).

```ts
.from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-109"></a>

## API-109 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/customer/CustomerMenu.tsx:507](<../../src/pages/customer/CustomerMenu.tsx#L507>).

```ts
.from("restaurants")
      .select(RESTAURANT_COLUMNS)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-110"></a>

## API-110 — GET /rest/v1/profiles

Feature principal: FEAT-001; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/LoginPage.tsx:92](<../../src/pages/public/LoginPage.tsx#L92>).

```ts
.from("profiles")
          .select("restaurant_id, role")
          .eq("id", session.user.id)
          .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-111"></a>

## API-111 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/LoginPage.tsx:113](<../../src/pages/public/LoginPage.tsx#L113>).

```ts
.from("restaurants")
            .select("is_active")
            .eq("id", profile.restaurant_id)
            .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-112"></a>

## API-112 — GET /rest/v1/registration_requests

Feature principal: FEAT-002; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/LoginPage.tsx:196](<../../src/pages/public/LoginPage.tsx#L196>).

```ts
.from("registration_requests")
            .select("status")
            .eq("email", formData.email.toLowerCase())
            .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-113"></a>

## API-113 — GET /rest/v1/profiles

Feature principal: FEAT-001; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/LoginPage.tsx:215](<../../src/pages/public/LoginPage.tsx#L215>).

```ts
.from("profiles")
          .select("restaurant_id, role")
          .eq("id", data.user.id)
          .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-114"></a>

## API-114 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/LoginPage.tsx:236](<../../src/pages/public/LoginPage.tsx#L236>).

```ts
.from("restaurants")
            .select("is_active, block_reason")
            .eq("id", profile.restaurant_id)
            .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-115"></a>

## API-115 — GET /rest/v1/profiles

Feature principal: FEAT-001; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/RegisterPage.tsx:115](<../../src/pages/public/RegisterPage.tsx#L115>).

```ts
.from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-116"></a>

## API-116 — POST /rest/v1/registration_requests

Feature principal: FEAT-002; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/public/RegisterPage.tsx:212](<../../src/pages/public/RegisterPage.tsx#L212>).

```ts
.from("registration_requests")
        .insert([
          {
            id: requestId,
            restaurant_name: formData.restaurant_name.trim(),
            owner_name: formData.owner_name.trim(),
            phone: formData.phone.replace(/[\s\-()]/g, ""),
            email: formData.email.trim() || null,
            city: formData.city.trim(),
            address: formData.address.trim() || null,
            restaurant_type: formData.restaurant_type,
            heard_from: formData.heard_from || null,
            notes: formData.notes?.trim() || null,
            status: "pending",
            country,
          },
        ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-117"></a>

## API-117 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/CashShift.tsx:100](<../../src/pages/restaurant/CashShift.tsx#L100>).

```ts
.from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("payment_status", "paid")
        .gte("paid_at", active.opened_at)
        .order("paid_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-118"></a>

## API-118 — GET /rest/v1/waiters

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/CashShift.tsx:204](<../../src/pages/restaurant/CashShift.tsx#L204>).

```ts
.from("waiters")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => setWaiters(data ?? []));
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-119"></a>

## API-119 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Dashboard.tsx:77](<../../src/pages/restaurant/Dashboard.tsx#L77>).

```ts
.from("orders")
        .select("status, order_type, payment_status")
        .eq("restaurant_id", restaurantId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-120"></a>

## API-120 — GET /rest/v1/recipes

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Inventory.tsx:683](<../../src/pages/restaurant/Inventory.tsx#L683>).

```ts
.from("recipes")
        .select(
          "id, menu_item_id, restaurant_id, created_at, updated_at, menu_items(name, id), recipe_ingredients(*)"
        )
        .eq("restaurant_id", restaurantId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-121"></a>

## API-121 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Pos.tsx:222](<../../src/pages/restaurant/Pos.tsx#L222>).

```ts
.from("orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("order_type", "qr")
          .eq("payment_status", "pending")
          .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-122"></a>

## API-122 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Pos.tsx:1763](<../../src/pages/restaurant/Pos.tsx#L1763>).

```ts
.from("orders")
            .select("total, status, payment_status, payment_method")
            .eq("restaurant_id", restaurantId)
            .eq("payment_status", "paid")
            .gte("paid_at", data.opened_at);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-123"></a>

## API-123 — GET /rest/v1/waiters

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Pos.tsx:1774](<../../src/pages/restaurant/Pos.tsx#L1774>).

```ts
.from("waiters")
              .select("name")
              .eq("id", data.responsible_waiter_id)
              .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-124"></a>

## API-124 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Pos.tsx:1804](<../../src/pages/restaurant/Pos.tsx#L1804>).

```ts
.from("orders")
            .select("total, status, payment_status, payment_method")
            .eq("restaurant_id", restaurantId)
            .eq("payment_status", "paid")
            .gte("paid_at", data.opened_at)
            .then(({ data: orders }) => {
              const sales = sumSalesByMethod((orders as any[]) ?? []);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-125"></a>

## API-125 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Reports.tsx:76](<../../src/pages/restaurant/Reports.tsx#L76>).

```ts
.from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("payment_status", "paid")
        .gte("created_at", startDate.toISOString())
        .in("status", ["completed", "ready", "preparing", "accepted"]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-126"></a>

## API-126 — GET /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Reports.tsx:548](<../../src/pages/restaurant/Reports.tsx#L548>).

```ts
.from("tips")
        .select("amount, created_at, waiter_id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-127"></a>

## API-127 — GET /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Reports.tsx:633](<../../src/pages/restaurant/Reports.tsx#L633>).

```ts
.from("inventory_items")
        .select("name, current_stock, min_stock, unit")
        .eq("restaurant_id", restaurantId)
        .order("current_stock", { ascending: true })
        .limit(100);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-128"></a>

## API-128 — GET /rest/v1/waiters

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Reports.tsx:716](<../../src/pages/restaurant/Reports.tsx#L716>).

```ts
.from("waiters")
        .select("name, is_active")
        .eq("restaurant_id", restaurantId)
        .order("name");
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-129"></a>

## API-129 — GET /rest/v1/cash_shifts

Feature principal: FEAT-017; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Reports.tsx:811](<../../src/pages/restaurant/Reports.tsx#L811>).

```ts
.from("cash_shifts")
          .select("opened_at, closed_at, total_sales, cash_difference, status, opening_cash, expected_cash, actual_cash, cash_sales, card_sales, transfer_sales, qr_sales, total_tips, orders_count, responsible_waiter_id")
          .eq("restaurant_id", restaurantId)
          .order("opened_at", { ascending: false })
          .limit(20),
        supabase
          
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-130"></a>

## API-130 — GET /rest/v1/waiters

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Reports.tsx:817](<../../src/pages/restaurant/Reports.tsx#L817>).

```ts
.from("waiters")
          .select("id, name")
          .eq("restaurant_id", restaurantId),
      ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-131"></a>

## API-131 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/RestaurantSettings.tsx:157](<../../src/pages/restaurant/RestaurantSettings.tsx#L157>).

```ts
.from("restaurants")
          .select(RESTAURANT_COLUMNS)
          .eq("id", restaurantId)
          .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-132"></a>

## API-132 — PATCH /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/RestaurantSettings.tsx:212](<../../src/pages/restaurant/RestaurantSettings.tsx#L212>).

```ts
.from("restaurants")
        .update({
          country: configData.country,
          currency: configData.currency,
          usd_exchange_rate: Number(configData.usdExchangeRate),
          default_language: configData.defaultLanguage,
          default_prep_time: Number(configData.defaultPrepTime),
          tax_rate: Number(configData.taxRate) / 100,
          tips_enabled: tipsEnabled,
          tips_default_pct: Number(tipsDefaultPct),
          tips_suggested_pcts: tipsSuggestedPcts,
        })
        .eq("id", restaurantId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-133"></a>

## API-133 — GET /rest/v1/flow_payments

Feature principal: FEAT-018; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Subscription.tsx:56](<../../src/pages/restaurant/Subscription.tsx#L56>).

```ts
.from("flow_payments")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-134"></a>

## API-134 — GET /rest/v1/flow_invoices

Feature principal: FEAT-018; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/pages/restaurant/Subscription.tsx:66](<../../src/pages/restaurant/Subscription.tsx#L66>).

```ts
.from("flow_invoices")
          .select("*")
          .eq("subscription_id", subscription.id)
          .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-135"></a>

## API-135 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/accountingService.ts:205](<../../src/services/accountingService.ts#L205>).

```ts
.from("orders")
      .select("id,order_number,total,created_at,order_type")
      .eq("restaurant_id", restaurantId)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(100);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-136"></a>

## API-136 — GET /rest/v1/registration_requests

Feature principal: FEAT-002; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/adminService.ts:25](<../../src/services/adminService.ts#L25>).

```ts
.from("registration_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-137"></a>

## API-137 — GET /rest/v1/registration_requests

Feature principal: FEAT-002; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/adminService.ts:69](<../../src/services/adminService.ts#L69>).

```ts
.from("registration_requests")
      .select("*")
      .eq("id", requestId)
      .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-138"></a>

## API-138 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/adminService.ts:300](<../../src/services/adminService.ts#L300>).

```ts
.from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-139"></a>

## API-139 — GET /rest/v1/registration_requests

Feature principal: FEAT-002; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/adminService.ts:304](<../../src/services/adminService.ts#L304>).

```ts
.from("registration_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-140"></a>

## API-140 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/adminService.ts:307](<../../src/services/adminService.ts#L307>).

```ts
.from("orders").select("*", { count: "exact", head: true }),
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-141"></a>

## API-141 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/adminService.ts:309](<../../src/services/adminService.ts#L309>).

```ts
.from("orders")
        .select("total")
        .gte(
          "created_at",
          new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        ),
    ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-142"></a>

## API-142 — GET /rest/v1/cash_shifts

Feature principal: FEAT-017; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/cashShiftService.ts:56](<../../src/services/cashShiftService.ts#L56>).

```ts
.from("cash_shifts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-143"></a>

## API-143 — GET /rest/v1/cash_shifts

Feature principal: FEAT-017; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/cashShiftService.ts:74](<../../src/services/cashShiftService.ts#L74>).

```ts
.from("cash_shifts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("opened_at", { ascending: false })
    .limit(50);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-144"></a>

## API-144 — GET /rest/v1/notifications

Feature principal: FEAT-023; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:35](<../../src/services/dashboardService.ts#L35>).

```ts
.from("notifications")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(20);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-145"></a>

## API-145 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:76](<../../src/services/dashboardService.ts#L76>).

```ts
.from("orders")
        .select("status, payment_status, total, created_at, tips")
        .eq("restaurant_id", restaurantId),
      // Meseros activos
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-146"></a>

## API-146 — GET /rest/v1/waiters

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:81](<../../src/services/dashboardService.ts#L81>).

```ts
.from("waiters")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true),
      // Mesas
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-147"></a>

## API-147 — GET /rest/v1/restaurant_tables

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:87](<../../src/services/dashboardService.ts#L87>).

```ts
.from("restaurant_tables")
        .select("id, status")
        .eq("restaurant_id", restaurantId),
      // Items bajo stock
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-148"></a>

## API-148 — GET /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:92](<../../src/services/dashboardService.ts#L92>).

```ts
.from("inventory_items")
        .select("id, current_stock, min_stock")
        .eq("restaurant_id", restaurantId),
      // Turno de caja abierto
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-149"></a>

## API-149 — GET /rest/v1/cash_shifts

Feature principal: FEAT-017; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:97](<../../src/services/dashboardService.ts#L97>).

```ts
.from("cash_shifts")
        .select("id, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open")
        .limit(1),
      // Propinas del día (tabla tips, no orders)
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-150"></a>

## API-150 — GET /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/dashboardService.ts:104](<../../src/services/dashboardService.ts#L104>).

```ts
.from("tips")
        .select("amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-151"></a>

## API-151 — GET /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:38](<../../src/services/inventoryService.ts#L38>).

```ts
.from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-152"></a>

## API-152 — POST/GET /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:47](<../../src/services/inventoryService.ts#L47>).

```ts
.from("inventory_items")
    .insert([item])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-153"></a>

## API-153 — PATCH/GET /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:59](<../../src/services/inventoryService.ts#L59>).

```ts
.from("inventory_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-154"></a>

## API-154 — DELETE /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:70](<../../src/services/inventoryService.ts#L70>).

```ts
.from("inventory_items").delete().eq("id", id);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-155"></a>

## API-155 — GET /rest/v1/inventory_items

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:76](<../../src/services/inventoryService.ts#L76>).

```ts
.from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .filter("current_stock", "lte", "min_stock")
    .order("name", { ascending: true });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-156"></a>

## API-156 — GET /rest/v1/recipes

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:91](<../../src/services/inventoryService.ts#L91>).

```ts
.from("recipes")
    .select("id, menu_item_id, restaurant_id, created_at, updated_at")
    .eq("menu_item_id", menuItemId)
    .maybeSingle();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-157"></a>

## API-157 — GET /rest/v1/recipe_ingredients

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:100](<../../src/services/inventoryService.ts#L100>).

```ts
.from("recipe_ingredients")
    .select("*")
    .eq("recipe_id", recipe.id);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-158"></a>

## API-158 — POST upsert/GET /rest/v1/recipes

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:119](<../../src/services/inventoryService.ts#L119>).

```ts
.from("recipes")
    .upsert(
      { menu_item_id: menuItemId, restaurant_id: restaurantId },
      { onConflict: "menu_item_id" }
    )
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-159"></a>

## API-159 — DELETE /rest/v1/recipe_ingredients

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:131](<../../src/services/inventoryService.ts#L131>).

```ts
.from("recipe_ingredients")
    .delete()
    .eq("recipe_id", recipe.id);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-160"></a>

## API-160 — POST /rest/v1/recipe_ingredients

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:145](<../../src/services/inventoryService.ts#L145>).

```ts
.from("recipe_ingredients")
      .insert(rows);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-161"></a>

## API-161 — GET /rest/v1/inventory_movements

Feature principal: FEAT-010; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/inventoryService.ts:186](<../../src/services/inventoryService.ts#L186>).

```ts
.from("inventory_movements")
    .select(
      "id, restaurant_id, inventory_item_id, movement_type, quantity, reference_id, notes, created_by, created_at, inventory_items(name)"
    )
    .eq("restaurant_id", restaurantId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-162"></a>

## API-162 — GET /rest/v1/restaurants

Feature principal: FEAT-004; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/kdsService.ts:38](<../../src/services/kdsService.ts#L38>).

```ts
.from("restaurants")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-163"></a>

## API-163 — POST/GET /rest/v1/data_subject_requests

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:98](<../../src/services/privacyService.ts#L98>).

```ts
.from("data_subject_requests")
    .insert([
      {
        request_type: "contact",
        subject_email: email,
        status: "pending",
        sla_due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payload: { name: name ?? null, message },
      },
    ])
    .select("id")
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-164"></a>

## API-164 — GET /rest/v1/data_subject_requests

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:128](<../../src/services/privacyService.ts#L128>).

```ts
.from("data_subject_requests")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-165"></a>

## API-165 — GET /rest/v1/data_subject_requests

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:141](<../../src/services/privacyService.ts#L141>).

```ts
.from("data_subject_requests")
    .select("*")
    .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-166"></a>

## API-166 — PATCH /rest/v1/data_subject_requests

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:166](<../../src/services/privacyService.ts#L166>).

```ts
.from("data_subject_requests")
    .update(update)
    .eq("id", dsarId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-167"></a>

## API-167 — GET /rest/v1/consents

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:178](<../../src/services/privacyService.ts#L178>).

```ts
.from("consents")
    .select("*")
    .eq("subject_email", email)
    .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-168"></a>

## API-168 — POST /rest/v1/consents

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:198](<../../src/services/privacyService.ts#L198>).

```ts
.from("consents").insert([
    {
      subject_id: params.subjectId,
      subject_email: params.subjectEmail,
      scope: params.scope,
      purpose: params.purpose,
      legal_basis: params.legalBasis,
      granted: params.granted,
      granted_at: params.granted ? new Date().toISOString() : null,
      privacy_policy_version: CURRENT_POLICY_VERSION,
      proof: {
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        via: params.via,
        policy_version: CURRENT_POLICY_VERSION,
      },
    },
  ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-169"></a>

## API-169 — PATCH /rest/v1/consents

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:223](<../../src/services/privacyService.ts#L223>).

```ts
.from("consents")
    .update({ granted: false, revoked_at: new Date().toISOString() })
    .eq("subject_email", email)
    .eq("scope", scope)
    .eq("granted", true);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-170"></a>

## API-170 — GET /rest/v1/consents

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:233](<../../src/services/privacyService.ts#L233>).

```ts
.from("consents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-171"></a>

## API-171 — GET /rest/v1/consents

Feature principal: FEAT-019; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/privacyService.ts:251](<../../src/services/privacyService.ts#L251>).

```ts
.from("consents")
    .select("*", { count: "exact", head: true })
    .eq("subject_email", email);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-172"></a>

## API-172 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:44](<../../src/services/restaurantService.ts#L44>).

```ts
.from("orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-173"></a>

## API-173 — PATCH /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:149](<../../src/services/restaurantService.ts#L149>).

```ts
.from("orders")
    .update(updateData)
    .eq("id", orderId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-174"></a>

## API-174 — GET /rest/v1/menu_items

Feature principal: FEAT-005; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:166](<../../src/services/restaurantService.ts#L166>).

```ts
.from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-175"></a>

## API-175 — POST/GET /rest/v1/menu_items

Feature principal: FEAT-005; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:219](<../../src/services/restaurantService.ts#L219>).

```ts
.from("menu_items")
    .insert([item])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-176"></a>

## API-176 — PATCH /rest/v1/menu_items

Feature principal: FEAT-005; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:237](<../../src/services/restaurantService.ts#L237>).

```ts
.from("menu_items")
    .update(updates)
    .eq("id", itemId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-177"></a>

## API-177 — PATCH /rest/v1/menu_items

Feature principal: FEAT-005; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:254](<../../src/services/restaurantService.ts#L254>).

```ts
.from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", itemId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-178"></a>

## API-178 — DELETE /rest/v1/menu_items

Feature principal: FEAT-005; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:263](<../../src/services/restaurantService.ts#L263>).

```ts
.from("menu_items").delete().eq("id", itemId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-179"></a>

## API-179 — POST/GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:289](<../../src/services/restaurantService.ts#L289>).

```ts
.from("orders")
    .insert([orderToInsert])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-180"></a>

## API-180 — GET /rest/v1/restaurant_customers

Feature principal: FEAT-008; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:306](<../../src/services/restaurantService.ts#L306>).

```ts
.from("restaurant_customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("phone", phone)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-181"></a>

## API-181 — PATCH /rest/v1/restaurant_customers

Feature principal: FEAT-008; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:322](<../../src/services/restaurantService.ts#L322>).

```ts
.from("restaurant_customers")
        .update({ name, email: email || existing.email || null, updated_at: now })
        .eq("id", existing.id)
    : supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-182"></a>

## API-182 — POST /rest/v1/restaurant_customers

Feature principal: FEAT-008; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:326](<../../src/services/restaurantService.ts#L326>).

```ts
.from("restaurant_customers")
        .insert([{ restaurant_id: restaurantId, name, phone, email: email || null, updated_at: now }]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-183"></a>

## API-183 — PATCH/GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:391](<../../src/services/restaurantService.ts#L391>).

```ts
.from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-184"></a>

## API-184 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:412](<../../src/services/restaurantService.ts#L412>).

```ts
.from("orders")
        .select("total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", today.toISOString()),
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-185"></a>

## API-185 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:417](<../../src/services/restaurantService.ts#L417>).

```ts
.from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
      supabase
        
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-186"></a>

## API-186 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:422](<../../src/services/restaurantService.ts#L422>).

```ts
.from("orders")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
    ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-187"></a>

## API-187 — GET /rest/v1/restaurant_customers

Feature principal: FEAT-008; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:466](<../../src/services/restaurantService.ts#L466>).

```ts
.from("restaurant_customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false }),
    supabase
      
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-188"></a>

## API-188 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:471](<../../src/services/restaurantService.ts#L471>).

```ts
.from("orders")
      .select(
        "id, customer_phone, customer_name, customer_email, total, created_at, updated_at"
      )
      .eq("restaurant_id", restaurantId)
      .not("customer_phone", "is", null)
      .gte("created_at", ninetyDaysAgo)
      .order("created_at", { ascending: false }),
  ]);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-189"></a>

## API-189 — POST/GET /rest/v1/restaurant_customers

Feature principal: FEAT-008; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:531](<../../src/services/restaurantService.ts#L531>).

```ts
.from("restaurant_customers")
    .insert([customer])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-190"></a>

## API-190 — PATCH/GET /rest/v1/restaurant_customers

Feature principal: FEAT-008; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:542](<../../src/services/restaurantService.ts#L542>).

```ts
.from("restaurant_customers")
    .update(updates)
    .eq("id", customerId)
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-191"></a>

## API-191 — GET /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/restaurantService.ts:554](<../../src/services/restaurantService.ts#L554>).

```ts
.from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-192"></a>

## API-192 — GET /rest/v1/breach_register

Feature principal: FEAT-024; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/securityService.ts:49](<../../src/services/securityService.ts#L49>).

```ts
.from("breach_register")
    .select("*")
    .order("detected_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-193"></a>

## API-193 — POST/GET /rest/v1/breach_register

Feature principal: FEAT-024; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/securityService.ts:73](<../../src/services/securityService.ts#L73>).

```ts
.from("breach_register")
    .insert({
      severity: input.severity,
      status: "detected",
      description: input.description,
      affected_data_categories: input.affected_data_categories ?? null,
      affected_subjects_count: input.affected_subjects_count ?? null,
      containment_measures: input.containment_measures ?? null,
    })
    .select("*")
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-194"></a>

## API-194 — PATCH/GET /rest/v1/breach_register

Feature principal: FEAT-024; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/securityService.ts:103](<../../src/services/securityService.ts#L103>).

```ts
.from("breach_register")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-195"></a>

## API-195 — GET /rest/v1/audit_log

Feature principal: FEAT-024; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/securityService.ts:134](<../../src/services/securityService.ts#L134>).

```ts
.from("audit_log")
      .select("*", { count: "exact", head: true })
      .in("action", q.actions)
      .gte("created_at", since);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-196"></a>

## API-196 — GET /rest/v1/audit_log

Feature principal: FEAT-024; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/securityService.ts:161](<../../src/services/securityService.ts#L161>).

```ts
.from("audit_log")
    .select("id, actor_email, action, table_name, created_at, ip")
    .order("created_at", { ascending: false })
    .limit(limit);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-197"></a>

## API-197 — GET /rest/v1/order_payments

Feature principal: FEAT-013; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/splitBillService.ts:26](<../../src/services/splitBillService.ts#L26>).

```ts
.from("order_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("payment_number", { ascending: true });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-198"></a>

## API-198 — POST/GET /rest/v1/order_payments

Feature principal: FEAT-013; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/splitBillService.ts:37](<../../src/services/splitBillService.ts#L37>).

```ts
.from("order_payments")
    .insert([input])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-199"></a>

## API-199 — PATCH /rest/v1/order_payments

Feature principal: FEAT-013; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/splitBillService.ts:50](<../../src/services/splitBillService.ts#L50>).

```ts
.from("order_payments")
    .update({ payment_status: status })
    .eq("id", paymentId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-200"></a>

## API-200 — DELETE /rest/v1/order_payments

Feature principal: FEAT-013; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/splitBillService.ts:59](<../../src/services/splitBillService.ts#L59>).

```ts
.from("order_payments")
    .delete()
    .eq("id", paymentId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-201"></a>

## API-201 — PATCH /rest/v1/orders

Feature principal: FEAT-006; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/splitBillService.ts:74](<../../src/services/splitBillService.ts#L74>).

```ts
.from("orders")
    .update({ is_split: true, split_count: splitCount })
    .eq("id", orderId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-202"></a>

## API-202 — GET /rest/v1/restaurant_tables

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tableService.ts:105](<../../src/services/tableService.ts#L105>).

```ts
.from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-203"></a>

## API-203 — POST/GET /rest/v1/restaurant_tables

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tableService.ts:125](<../../src/services/tableService.ts#L125>).

```ts
.from("restaurant_tables")
    .insert([input])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-204"></a>

## API-204 — PATCH /rest/v1/restaurant_tables

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tableService.ts:138](<../../src/services/tableService.ts#L138>).

```ts
.from("restaurant_tables")
    .update(patch)
    .eq("id", tableId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-205"></a>

## API-205 — DELETE /rest/v1/restaurant_tables

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tableService.ts:149](<../../src/services/tableService.ts#L149>).

```ts
.from("restaurant_tables")
    .delete()
    .eq("id", tableId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-206"></a>

## API-206 — PATCH/GET /rest/v1/restaurant_tables

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tableService.ts:164](<../../src/services/tableService.ts#L164>).

```ts
.from("restaurant_tables")
    .update({ qr_token: qrToken })
    .eq("id", tableId)
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-207"></a>

## API-207 — GET /rest/v1/table_sessions

Feature principal: FEAT-014; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tableService.ts:178](<../../src/services/tableService.ts#L178>).

```ts
.from("table_sessions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("started_at", { ascending: false })
    .limit(100);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-208"></a>

## API-208 — POST/GET /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tipsService.ts:28](<../../src/services/tipsService.ts#L28>).

```ts
.from("tips")
    .insert([input])
    .select()
    .single();
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-209"></a>

## API-209 — GET /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tipsService.ts:41](<../../src/services/tipsService.ts#L41>).

```ts
.from("tips")
    .select("*")
    .eq("waiter_id", waiterId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-210"></a>

## API-210 — GET /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tipsService.ts:56](<../../src/services/tipsService.ts#L56>).

```ts
.from("tips")
    .select("*, waiters(name)")
    .eq("restaurant_id", restaurantId);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-211"></a>

## API-211 — PATCH /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tipsService.ts:73](<../../src/services/tipsService.ts#L73>).

```ts
.from("tips")
    .update({ status: "paid_out" as TipStatus, paid_out_at: new Date().toISOString() })
    .in("id", tipIds);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: escritura/borrado/subida según operación. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-212"></a>

## API-212 — GET /rest/v1/tips

Feature principal: FEAT-012; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/tipsService.ts:92](<../../src/services/tipsService.ts#L92>).

```ts
.from("tips")
    .select("waiter_id, amount, waiters(name)")
    .eq("restaurant_id", restaurantId)
    .not("waiter_id", "is", null);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-213"></a>

## API-213 — GET /rest/v1/waiters

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/waiterService.ts:30](<../../src/services/waiterService.ts#L30>).

```ts
.from("waiters")
    .select("id, restaurant_id, name, is_active, photo_url, phone, email, role, created_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-214"></a>

## API-214 — GET /rest/v1/waiter_sessions

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/waiterService.ts:39](<../../src/services/waiterService.ts#L39>).

```ts
.from("waiter_sessions")
    .select(
      "id, waiter_id, restaurant_id, started_at, ended_at, tables_served, orders_count, total_sales, total_tips, waiters(name, role)"
    )
    .eq("restaurant_id", restaurantId)
    .is("ended_at", null)
    .order("started_at", { ascending: false });
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

<a id="api-215"></a>

## API-215 — GET /rest/v1/waiter_sessions

Feature principal: FEAT-011; otros consumidores pueden compartir esta operación. Estado: CONFIRMADO (expresión cliente). Fuente: [src/services/waiterService.ts:51](<../../src/services/waiterService.ts#L51>).

```ts
.from("waiter_sessions")
    .select(
      "id, waiter_id, restaurant_id, started_at, ended_at, tables_served, orders_count, total_sales, total_tips, waiters(name, role)"
    )
    .eq("restaurant_id", restaurantId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);
```

Body, query, proyección y filtros: expresión anterior; variables y payloads se definen en el símbolo fuente. Respuesta: resultado Supabase `{data,error,count}` según selección y single/maybeSingle. Autorización: grants y policies de la tabla en DATA_MODEL/SQL_CATALOG; no se presupone que un filtro cliente conceda permisos. Errores HTTP: gateway no ejecutado; el cliente puede transformar el error o devolver boolean/array vacío. Side effects: lectura. Integraciones: Supabase. Tests: ver TRACEABILITY; MISSING cuando no existe prueba de esta cadena completa.

## Interfaces de proveedor adicionales

AS-IS — CONFIRMADO; no se asigna una ruta HTTP interna ficticia al SDK.

| Interfaz | Inputs/outputs y autorización | Feature/evidencia |
|---|---|---|
| Auth SDK | signInWithPassword email/password; OAuth Google redirect; getSession/getUser, updateUser contraseña, signOut; errores del SDK y perfil guard | FEAT-001; src/pages/public/LoginPage.tsx, SetupPassword.tsx, useAuth.ts |
| Storage menu-images | upload JPEG a storagePath/name, Content-Type image/jpeg, upsert=false; createSignedUrl duración 100 años; URL o error | FEAT-005; src/components/ImageDropZone.tsx, policies bucket en SQL_CATALOG |
| Realtime channel | postgres_changes de menu_items/restaurants; INSERT orders_events con restaurant_id; snapshots a callback | FEAT-003/005/006/016; restaurantService/adminService |
| Funciones dinámicas | invokePrivacy(fn,body), nombres definidos por requestAccess/Erase/Export/Object/Rectify/Revoke; respuestas se normalizan | FEAT-019; src/services/privacyService.ts; handlers Edge indexados arriba |

No se encontró GraphQL como cliente de la aplicación; exposición local de graphql_public figura en config y necesita validar catálogo/uso real. Operaciones dinámicas/SDK no inferidas por regex se registran explícitamente aquí; no se afirma completitud de superficies de plataforma ajenas a código versionado.


## Cambio autorizado — contratos que prevalecen sobre baseline

Endpoints conservados; grupos representan subrutas con el mismo control, no un endpoint único. Firmas SQL exactas y ACL declaradas: SQL_CATALOG. Config JWT explícita; autorización en handler para funciones públicas. Pruebas específicas enlazadas en la spec de tarea. Runtime y proveedor real REQUIRES VALIDATION.

| ID | Superficie | Entrada | Respuesta/errores | Autorización/efectos | Evidencia | Tarea |
| --- | --- | --- | --- | --- | --- | --- |
| API-216 | POST privacy-access/export/erase/rectify/object/revoke-consent | email, payload; cuerpos legacy compatibles | 200 pending_verification sin datos; JWT confirmado coincidente ejecuta; 400 entrada/401 JWT/403 identidad/429 límite/503 DB o correo | Identidad verificada, hash24h y claim SQL; no datos personales para correo ajeno | [dsar.ts](<../../supabase/functions/_shared/dsar.ts>) | TASK-004 |
| API-217 | POST verify-dsar | token, confirm:true; o requestId/download_token para reintentar | 200 descarga real/pending rectificación; token vencido/repetido no ejecuta; 503 descarga incompleta | Claim único; capacidad snapshot24h y proyección permitida | [dsar.ts](<../../supabase/functions/_shared/dsar.ts>) | TASK-004 |
| API-218 | POST privacy-contact | email y payload de contacto | 200 pending sin acceso a datos; revisión administrativa | No representa derecho cumplido ni identidad verificada | [index.ts](<../../supabase/functions/privacy-contact/index.ts>) | TASK-004 |
| API-219 | RPC switch_restaurant | p_restaurant_id uuid | Selección perfil;42501 si no autorizado | Membresía; admin AAL2 sin bypass owner | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql>) | TASK-007 |
| API-220 | RPC write_pos_order | p_restaurant_id,p_order,p_key uuid,p_order_id opcional | Pedido completo id, currency y tip_amount sin access_token;partes suman total+propina;accepted/paid al cobrar;conflicto clave/cuerpo distinto | SQL Auth/tenant; cliente,mesero,sesión,caja propios;CRM/pago/tip/split transaccional | [20261006000006_pos_contracts.sql](<../../supabase/migrations/20261006000006_pos_contracts.sql>) | TASK-006 |
| API-221 | RPC create_order | Firma pública conservada, p_key opcional;items máximo50,quantity máximo100 | JSON id/order_id, access_token;pending/pending;rechazo no qr/inactivo | Precios servidor;rate por recurso;sin fallback INSERT | [20261006000019_public_order_idempotency.sql](<../../supabase/migrations/20261006000019_public_order_idempotency.sql>) | TASK-006 |
| API-222 | RPC save_recipe | p_restaurant_id,p_menu_item_id,p_ingredients,sin p_recipe_id: upsert por menu_item_id | Receta y rollback si relación inválida | Owner tenant; reemplazo transaccional/bloqueo padre | [20261006000003_atomic_inventory.sql](<../../supabase/migrations/20261006000003_atomic_inventory.sql>) | TASK-010 |
| API-223 | RPC start_table_session_by_qr | p_qr_token | Sesión única con capability;active/payment_pending reutilizada;QR inválido denegado | QR vigente,bloqueo fila,índice único | [20261006000007_qr_and_atomic_limits.sql](<../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql>) | TASK-008 |
| API-224 | RPC create_table_order | p_session_token,p_order_data:operation_key/items | Pedido único;conflicto por contenido distinto;payment_pending denegado | Capacidad activa y precios/tenant servidor | [20261006000007_qr_and_atomic_limits.sql](<../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql>) | TASK-008 |
| API-225 | RPC get_table_orders/checkout_receipt | p_session_token o p_token | Lista permitida/payment_status;recibo estado/importe/moneda/propina | Capacidad sesión vigente o receipt24h | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>) | TASK-008 |
| API-226 | POST order-pay/flow-checkout/mp-checkout/create-payment-intent | session_token/tip_amount o registration_request_id/plan | Intento reutilizado;409/503 reconcile con receipt mesa;sin creación nueva incierta | Proveedor/moneda permitidos;catálogo servidor;reserva antes de fetch | [checkout.ts](<../../supabase/functions/_shared/checkout.ts>) | TASK-009 |
| API-227 | POST mp-webhook | x-signature,x-request-id,data.id | 401 firma ausente/inválida;503 conciliación;received tras escritura | HMAC,ventana5min,lookup remoto y SQL atómico | [index.ts](<../../supabase/functions/mp-webhook/index.ts>) | TASK-009 |
| API-228 | POST/GET webhooks/flow;GET/POST webhooks/webpay | Token proveedor;Flow return sólo lectura | Consulta estado remoto;browser return no prueba pago;503 recuperación | Referencia,importe,moneda e ID conciliados;credenciales servidor | [index.ts](<../../supabase/functions/webhooks/flow/index.ts>) | TASK-009 |
| API-229 | POST flow-customer/create/register/unregister;GET register-status | restaurant_id o token | Contrato de tarjetas conservado;error persistencia reconcile | JWT owner propio/admin AAL2;reserva interna antes de efecto | [index.ts](<../../supabase/functions/flow-customer/index.ts>) | TASK-009 |
| API-230 | POST flow-subscription/sync-plans/create/cancel;GET status | restaurant_id,plan_id,at_period_end | Planes nuevos versionados;contratos anteriores conservados | Sync admin AAL2;owner propio demás;operación durable | [index.ts](<../../supabase/functions/flow-subscription/index.ts>) | TASK-009 |
| API-231 | RPC restaurant_dashboard/admin_platform_stats | restaurant_id o firma exacta catálogo | Agregados;error visible;sin truncamiento max_rows | Tenant o admin AAL2 | [20261006000010_reports_and_dsar_admin.sql](<../../supabase/migrations/20261006000010_reports_and_dsar_admin.sql>) | TASK-013 |
| API-232 | RPC review_dsar_rectification/admin_transition_dsar | id/fields/status según firma SQL | name/phone permitidos,verified pending;contacto estados permitidos | Admin AAL2;auditoría transaccional | [20261006000010_reports_and_dsar_admin.sql](<../../supabase/migrations/20261006000010_reports_and_dsar_admin.sql>) | TASK-004 |
| API-233 | RPC record_my_consent/browser_signal | scope/acción o kind permitido (sin metadata) | Consentimiento identidad servidor;signal no confiable | Auth confirmado consent,rate20/5min signal | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>) | TASK-005 |
| API-234 | POST/GET menu-image | Archivo multipart o ID menú | 2MB JPEG/PNG/WebP;URL temporal publicada/owner | Upload owner/admin AAL2;Storage privado,bytes/MIME | [index.ts](<../../supabase/functions/menu-image/index.ts>) | TASK-014 |
| API-235 | POST ai-recommendations | Cuerpo legacy ignorado | 503 ai_disabled;sin salida externa | Desactivado independientemente de rol/plan | [index.ts](<../../supabase/functions/ai-recommendations/index.ts>) | TASK-012 |
| API-236 | POST invite-owner | x-internal-function-secret | processed/failed outbox;503 incertidumbre | Secreto servidor;claim SKIP LOCKED y finish verificable | [index.ts](<../../supabase/functions/invite-owner/index.ts>) | TASK-009 |
| API-237 | RPC submit_dsar/execute_dsar/prepare_dsar_download/read_dsar_download/finish_dsar_download | Entrada canónica/hash,id,cursor | Páginas500,snapshot estable;final sólo tras lecturas completas | Sólo service role;identity/claims SQL | [20261006000016_dsar_pagination.sql](<../../supabase/migrations/20261006000016_dsar_pagination.sql>) | TASK-004 |
| API-238 | RPC reserve_checkout/record_checkout_result/confirm_checkout/settle_verified_payment | Referencia/importe/moneda/proveedor/estado | creating/pending/reconcile/confirmed/rejected/cancelled;replay sin efectos | Sólo service role;pedido/tip/stock/sesión transaccional | [20261006000008_checkout_reservations.sql](<../../supabase/migrations/20261006000008_checkout_reservations.sql>) | TASK-009 |
| API-239 | RPC reserve_provider_operation/record_provider_operation | restaurant,kind,payload o id/result | Reserva durable,result checked;incertidumbre reconcile | Sólo service role,mutaciones locales atómicas | [20261006000017_provider_operations.sql](<../../supabase/migrations/20261006000017_provider_operations.sql>) | TASK-009 |
| API-240 | RPC accounting_lease/accounting_emission_candidates/accounting_dispatch_cron | restaurant/token/release o configuración privada | Lease120s,batch tras filtro SQL;cron off por defecto | Internas service/cron según ACL;secreto nunca browser | [20261006000022_pin_and_accounting_candidates.sql](<../../supabase/migrations/20261006000022_pin_and_accounting_candidates.sql>) | TASK-014 |
| API-241 | RPC begin_admin_mfa_recovery/complete_admin_mfa_recovery | Perfil según firma SQL | Bloqueo/epoch,nuevo factor tras reset;sin bypass | Sólo service role;auditoría e identidad humana previa | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>) | TASK-003 |
| API-242 | PostgREST orders/reports/CRM/waiters;Storage | Proyecciones permitidas,filtros restaurant,páginas500 | Sin INSERT público orders;finanzas protegidas;pin_hash ilegible;errores visibles | RLS y grants,consumidores/catálogo | [20261006000022_pin_and_accounting_candidates.sql](<../../supabase/migrations/20261006000022_pin_and_accounting_candidates.sql>) | TASK-003 |
| API-243 | RPC cash_shift_metrics/open_cash_shift/close_cash_shift/can_close_split_order | p_shift_id; p_restaurant_id/p_opening_cash/p_notes/p_responsible_waiter_id; p_actual_cash; p_order_id, según firma SQL | Resumen {total,count,cash,card,transfer,qr,total_tips,cash_tips,card_tips,waiter_summary}; turnos completos; boolean exacto;42501 ajeno/22023 dinero inválido | Auth tenant/admin AAL2; apertura serializada, cierre bloqueado/idempotente; helper interno sin EXECUTE público | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql>) | TASK-006 |

`write_pos_order.split_parts[].amount` incluye propina en los nuevos registros; no debe sumarse de nuevo en el cobro. El componente `tip_amount` por parte se calcula en SQL, no se acepta del navegador. El resultado `tip_amount` del pedido es una proyección persistida en la respuesta idempotente; la fuente del ledger es `tips`. Métodos permitidos: cash/card/transfer/qr. Los wrappers históricos createOrderPayment/updateOrderPayment/deleteOrderPayment/markOrderAsSplit/createTip carecen de consumidor UI activo y sus escrituras directas quedan denegadas; la UI usa write_pos_order. No representan una API alternativa habilitada.

## Cambio autorizado — catálogo monetario y reporte SQL

| ID | Superficie | Entrada/salida/errores | Permisos y efectos | Evidencia |
| --- | --- | --- | --- | --- |
| API-244 | POST /rest/v1/rpc/restaurant_sales_report | p_restaurant_id uuid, p_days integer default30; 1/7/30/90. JSON totalRevenue,totalOrders,avgOrderValue,totalSubtotal,totalTax,totalDiscount,currency,historicalCurrencyCount,windowStart,windowEnd,timezone,topItems[{name,count,revenue}],dailyRevenue[{date,revenue,orders}],orderTypeDistribution[{type,count}]. 42501 unauthorized,22023 invalid_report_window/invalid_restaurant_timezone; error de proyección visible | authenticated + is_my_restaurant, admin AAL2; lectura agregada sin límite de filas descargadas; service/anon sin EXECUTE | [SQL25](<../../supabase/migrations/20261006000025_sales_report_aggregation.sql:2>), [getSalesReport](<../../src/services/reportsService.ts:24>), TASK-013 |

API-220 conserva pedido completo con `currency` para pedidos nuevos (DATA-058); NULL histórico permanece desconocido. `catalog_prices_valid`, `guard_catalog_prices`, `capture_order_currency`, `guard_restaurant_currency` y `price_order_items` son helpers/triggers privados: sin EXECUTE público/authenticated; no constituyen endpoints alternativos. SQL24 valida precisión/opciones y captura moneda, sin reinterpretación de transacciones. Reportes agrupan por created_at y zona regional fija del país; no hay configuración timezone persistida en baseline. El contrato completo de ventana/advertencias está en TASK-013. Ejecución SQL local PASS; despliegue UNKNOWN.

## Cambio autorizado — correcciones verificadas con runtime

| ID | Superficie / entrada | Respuesta y errores | Autorización / efectos | Evidencia |
| --- | --- | --- | --- | --- |
| API-245 | RPC `create_waiter(p_restaurant_id,p_name,p_pin,p_role)` / `update_waiter(p_waiter_id,p_name,p_pin,p_role,p_is_active)` / `validate_waiter_pin(p_restaurant_id,p_pin)`; firmas exactas SQL29 | Alta/actualización conservan contrato; validación devuelve mesero y capacidad. `23505 waiter_pin_in_use`, `22023 invalid_waiter_input/ambiguous_waiter_pin`, `42501 unauthorized` | Auth miembro owner/staff del restaurante o admin AAL2. Bloqueo del restaurante serializa alta/cambio; PIN 4–72 caracteres; bcrypt privado; duplicado histórico no genera sesión | [SQL29](<../../supabase/migrations/20261006000029_unambiguous_waiter_pins.sql>), [S06](<../../src/tests/security/S06-pin-hash.test.ts>), TASK-003 / FEAT-011/FR-213 |

API-234 genera URLs con `PUBLIC_SUPABASE_URL` (servidor); Storage permanece privado y la redirección valida el origen interno antes de usar el origen público configurado. API-216/217/237 usan `orders.customer_email` nullable (DATA-059), sin atribuir identidad a un valor escrito por visitante. API-219/alta de sucursal exige nombre/correo/teléfono y genera slug único en servidor; plan/catálogo derivan del primario. API-239 usa `remote_status` local para evitar colisión con la columna `status`.

Handlers de aplicación rechazan `Origin` explícitamente ajeno con `403 origin_denied` antes de efectos. Kong local puede sobrescribir ACAO: la prueba verifica denegación efectiva. Callbacks API-227/228 aceptan Origin de proveedor porque su autenticidad depende de HMAC o consulta remota, no del encabezado del navegador. SDK Edge fijado a 2.86.0; validación local usa bundle instalado sin descargar desde esm.sh.

API-239 / SQL30: reserve_provider_operation devuelve `new:false,state:confirmed,response` al repetir cancelación de igual suscripción/modalidad. providerOperation reutiliza ese resultado; creating/reconcile no llama al proveedor. No modifica contratos anteriores ni deduplica futuras altas de suscripción. FEAT-015/FR-273 / BR-060; I17.


Estado vigente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), evidencia LOCAL_VALIDATION (referencia histórica excluida de esta distribución).

## Cambio adicional TASK-016

- API-246: get_operational_settings() → configuración/revisión/metadatos; save_operational_settings(p_settings jsonb,p_revision int) → nueva revisión. Auth admin AAL2 real; 42501 denegado, PT409/HTTP409 conflicto, 22023 valores/campos inválidos. Auditoría transaccional sin datos de contactos. Campos de responsables hasta200 caracteres; campos desconocidos rechazados.
- API-247: set_restaurant_report_timezone(p_restaurant_id uuid,p_timezone text), admin AAL2, nombre IANA válido. Sólo actualiza restaurante existente; audita ID/zona. Reportes preservan fallback regional al faltar configuración.
- API-248: purge_dsar_artifacts(p_limit int=500), sólo service role. Cron SQL llama cmor_internal.purge_dsar_artifacts, no expuesta por PostgREST ni ejecutable por roles públicos. Límite1–1000. Respuesta snapshots/snapshot_rows/requests; idempotente, SKIP LOCKED, sin PII ni efectos externos.
- API-249: set_dsar_retention_hold(p_id uuid,p_hold bool), admin AAL2, cambio auditado; NULL/ID inexistente se rechazan.
- API-250: GET operations-readiness, JWT validado y admin AAL2. 403/405/503 o200 configured booleans y verified:false. Nunca devuelve secretos ni hace llamadas de proveedor. verify_jwt=false explícito; autorización interna.

## API-251 — Inspector privado de imágenes (TASK-016, AS-IS local)

Fuente: `services/image-inspector/inspector.py`, `Handler.do_POST`, `canonicalize`, `ClamAV.scan`; consumidor `menu-image` → `inspectImage`. POST `/inspect`: bearer secreto de servidor≥32 caracteres, cuerpo binario≤2MiB, `X-Image-Type` PNG/JPEG/WebP; verifica ClamAV y decodificación completa, devuelve PNG canónico con Content-Length, X-Input-SHA256 y dimensiones. Errores400 contenido inválido/amenaza,403 secreto erróneo,413 tamaño,503 configuración/firma vencida/motor caído/ocupado. GET `/health` indica disponibilidad sin revelar versión, firmas ni secretos. Sin acceso de navegador, persistencia ni efectos externos de negocio. TLS/proxy/red son configuración del cliente. Edge sólo escribe Storage tras éxito y hash coincidente; nunca conserva el original subido. I13 valida el recorrido real; tests Python verifican EICAR real y formatos; adaptador prueba rechazo/fallo/tamaño/hash. No se confunde presencia de variables en operations-readiness con salud efectiva.

### Ampliación API-234 — TASK-016

POST multipart mantiene restaurant_id/file: requiere Content-Length; errores411 sin longitud,413 cuerpo>2200000 bytes,408 lectura>10s,400 contenido/decodificación/antivirus inválidos,503 inspección ausente/caída/vencida. El archivo sigue limitado a2MiB. Se drena contenido rechazado sin retenerlo para evitar bloqueo de forwarding local; ninguna escritura ocurre tras error. GET exige URL canónica publicada por el mismo restaurant_id de la carpeta; un tercero no puede publicar la ruta ajena para obtener firma. I13 verifica413, corrupción, metadatos, ACL e intento de publicación cruzada. Casos de longitud subdeclarada y stream detenido ejecutan readImageUpload real con Request local. Transporte del proxy desplegado REQUIERE VALIDACIÓN.

## Reserva confirmada de facturación — SQL34

`reserve_provider_operation` conserva firma y acceso exclusivo service_role. Bajo el bloqueo de restaurante, creating/reconcile impide otra llamada; cliente confirmado y suscripción activa del mismo plan se reutilizan cuando la respuesta coincide con las filas y referencias actuales. Cancelación conserva replay previo. No se reutiliza una suscripción cancelada. La unicidad local no promete exactly-once externo; incertidumbre requiere conciliación. Duplicados históricos bloquean migración sin eliminación arbitraria. FEAT-018/FR-349; I17.
