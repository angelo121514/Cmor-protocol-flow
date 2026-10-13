> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Índice maestro SDD

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

Fecha: 2026-10-05. Commit base: 319a4d2a9bd88d2b1b16b3d61ef8ae7094a8948d. Empezar por SYSTEM_OVERVIEW y AUDIT_REPORT. Navegación: feature → FR/NFR/SEC → reglas → API/datos → código → tests → seguridad; cambios futuros: spec → PLAN → TASKS.

## Documentos

- [CONSTITUTION](CONSTITUTION.md)
- [SYSTEM_OVERVIEW](SYSTEM_OVERVIEW.md)
- [ARCHITECTURE](ARCHITECTURE.md)
- [DOMAIN_MODEL](DOMAIN_MODEL.md)
- [FEATURES](FEATURES.md)
- [API_SPEC](API_SPEC.md)
- [DATA_MODEL](DATA_MODEL.md)
- [BUSINESS_RULES](BUSINESS_RULES.md)
- [USER_FLOWS](USER_FLOWS.md)
- [INTEGRATIONS](INTEGRATIONS.md)
- [SECURITY](SECURITY.md)
- [THREAT_MODEL](THREAT_MODEL.md)
- [TESTING](TESTING.md)
- [TECHNICAL_DEBT](TECHNICAL_DEBT.md)
- [GLOSSARY](GLOSSARY.md)
- [TRACEABILITY](TRACEABILITY.md)
- [PLAN](PLAN.md)
- [TASKS](TASKS.md)
- [AUDIT_REPORT](AUDIT_REPORT.md)
- [SOURCE_INVENTORY](SOURCE_INVENTORY.md)
- [SQL_CATALOG](SQL_CATALOG.md)
- [VALIDATION_REPORT](VALIDATION_REPORT.md)

## Features

| Feature | Datos | Regla | Tests relacionados |
| --- | --- | --- | --- |
| [FEAT-001](features/FEAT-001-identidad-sesion/spec.md) | profiles, profile_restaurants, restaurants, invitations | [BR-001](BUSINESS_RULES.md#br-001) | MISSING |
| [FEAT-002](features/FEAT-002-registro-activacion/spec.md) | registration_requests, restaurants, invitations, payment_intents | [BR-002](BUSINESS_RULES.md#br-002) | [src/tests/security/S02-auto-approve.test.ts](<../../src/tests/security/S02-auto-approve.test.ts>); [src/tests/e2e/E01-register-owner.spec.ts](<../../src/tests/e2e/E01-register-owner.spec.ts>) |
| [FEAT-003](features/FEAT-003-administracion/spec.md) | restaurants, registration_requests, audit_log, invitations, orders | [BR-003](BUSINESS_RULES.md#br-003) | [src/tests/e2e/E05-admin-actions.spec.ts](<../../src/tests/e2e/E05-admin-actions.spec.ts>) |
| [FEAT-004](features/FEAT-004-sucursales/spec.md) | restaurants, profile_restaurants, profiles | [BR-004](BUSINESS_RULES.md#br-004) | [src/tests/unit/U11-createRestaurantBranch.test.ts](<../../src/tests/unit/U11-createRestaurantBranch.test.ts>); [src/tests/unit/U12-branchCreationEmpirical.test.tsx](<../../src/tests/unit/U12-branchCreationEmpirical.test.tsx>); [src/tests/unit/RestaurantSwitcher.test.tsx](<../../src/tests/unit/RestaurantSwitcher.test.tsx>) |
| [FEAT-005](features/FEAT-005-carta-imagenes/spec.md) | menu_items, menu_categories, recipes, recipe_ingredients | [BR-005](BUSINESS_RULES.md#br-005) | [src/tests/e2e/E02-create-menu.spec.ts](<../../src/tests/e2e/E02-create-menu.spec.ts>); [src/tests/e2e/E10-menu-validation.spec.ts](<../../src/tests/e2e/E10-menu-validation.spec.ts>) |
| [FEAT-006](features/FEAT-006-pedidos-publicos/spec.md) | orders, orders_events, menu_items, restaurant_customers, feature_flags, rate_limits | [BR-006](BUSINESS_RULES.md#br-006) | [src/tests/unit/U01-calculateOrderTotals.test.ts](<../../src/tests/unit/U01-calculateOrderTotals.test.ts>); [src/tests/unit/U04-calculateItemPrice.test.ts](<../../src/tests/unit/U04-calculateItemPrice.test.ts>); [src/tests/e2e/E03-customer-order.spec.ts](<../../src/tests/e2e/E03-customer-order.spec.ts>); [src/tests/security/S01-rls-orders.test.ts](<../../src/tests/security/S01-rls-orders.test.ts>) |
| [FEAT-007](features/FEAT-007-pos/spec.md) | orders, restaurant_customers, tips, order_payments, cash_shifts | [BR-007](BUSINESS_RULES.md#br-007) | [src/tests/e2e/E08-pos-realtime-verification.spec.ts](<../../src/tests/e2e/E08-pos-realtime-verification.spec.ts>) |
| [FEAT-008](features/FEAT-008-crm/spec.md) | restaurant_customers, orders | [BR-008](BUSINESS_RULES.md#br-008) | MISSING |
| [FEAT-009](features/FEAT-009-reportes/spec.md) | orders, tips, inventory_items, waiters, cash_shifts | [BR-009](BUSINESS_RULES.md#br-009) | [src/tests/unit/U21-tax-and-trial-helpers.test.ts](<../../src/tests/unit/U21-tax-and-trial-helpers.test.ts>) |
| [FEAT-010](features/FEAT-010-inventario-recetas/spec.md) | inventory_items, recipes, recipe_ingredients, inventory_movements, orders | [BR-010](BUSINESS_RULES.md#br-010) | [src/tests/unit/U13-inventoryService.test.ts](<../../src/tests/unit/U13-inventoryService.test.ts>) |
| [FEAT-011](features/FEAT-011-meseros-pin/spec.md) | waiters, waiter_sessions, orders | [BR-011](BUSINESS_RULES.md#br-011) | [src/tests/unit/U14-waiterService.test.ts](<../../src/tests/unit/U14-waiterService.test.ts>); [src/tests/security/S06-pin-hash.test.ts](<../../src/tests/security/S06-pin-hash.test.ts>) |
| [FEAT-012](features/FEAT-012-propinas/spec.md) | tips, orders, waiters | [BR-012](BUSINESS_RULES.md#br-012) | [src/tests/unit/U15-tipsService.test.ts](<../../src/tests/unit/U15-tipsService.test.ts>); [src/tests/unit/U17-qrTables.test.ts](<../../src/tests/unit/U17-qrTables.test.ts>) |
| [FEAT-013](features/FEAT-013-cuentas-divididas/spec.md) | order_payments, orders | [BR-013](BUSINESS_RULES.md#br-013) | [src/tests/unit/U16-splitBill.test.ts](<../../src/tests/unit/U16-splitBill.test.ts>) |
| [FEAT-014](features/FEAT-014-mesas-sesiones-qr/spec.md) | restaurant_tables, table_sessions, orders | [BR-014](BUSINESS_RULES.md#br-014) | [src/tests/unit/U17-qrTables.test.ts](<../../src/tests/unit/U17-qrTables.test.ts>); [src/tests/e2e/E09-tables-validation.spec.ts](<../../src/tests/e2e/E09-tables-validation.spec.ts>) |
| [FEAT-015](features/FEAT-015-pagos-webhooks/spec.md) | payment_intents, flow_payments, flow_webhook_events, table_sessions, orders, tips, registration_requests | [BR-015](BUSINESS_RULES.md#br-015) | [src/tests/integration/flow-integration.test.ts](<../../src/tests/integration/flow-integration.test.ts>); [src/tests/e2e/E06-webpay-payment.spec.ts](<../../src/tests/e2e/E06-webpay-payment.spec.ts>); [src/tests/e2e/E07-flow-payment.spec.ts](<../../src/tests/e2e/E07-flow-payment.spec.ts>) |
| [FEAT-016](features/FEAT-016-cocina-kds/spec.md) | restaurants, orders, orders_events, rate_limits | [BR-016](BUSINESS_RULES.md#br-016) | [src/tests/unit/U18-kds.test.ts](<../../src/tests/unit/U18-kds.test.ts>) |
| [FEAT-017](features/FEAT-017-turnos-caja/spec.md) | cash_shifts, orders, tips, waiters | [BR-017](BUSINESS_RULES.md#br-017) | [src/tests/unit/U19-cashShift.test.ts](<../../src/tests/unit/U19-cashShift.test.ts>) |
| [FEAT-018](features/FEAT-018-suscripciones/spec.md) | restaurants, flow_plans, flow_customers, flow_subscriptions, flow_payments, flow_invoices | [BR-018](BUSINESS_RULES.md#br-018) | [src/tests/unit/U13-planCatalog.test.ts](<../../src/tests/unit/U13-planCatalog.test.ts>); [src/tests/unit/U21-tax-and-trial-helpers.test.ts](<../../src/tests/unit/U21-tax-and-trial-helpers.test.ts>) |
| [FEAT-019](features/FEAT-019-privacidad-dsar/spec.md) | consents, data_subject_requests, audit_log, restaurant_customers, orders, restaurants, invitations | [BR-019](BUSINESS_RULES.md#br-019) | [src/tests/security/S03-dsar-verification.test.ts](<../../src/tests/security/S03-dsar-verification.test.ts>); [src/tests/e2e/E04-dsar-flow.spec.ts](<../../src/tests/e2e/E04-dsar-flow.spec.ts>) |
| [FEAT-020](features/FEAT-020-recomendaciones-ia/spec.md) | ai_usage_log, orders, menu_items, inventory_items, tips, profile_restaurants | [BR-020](BUSINESS_RULES.md#br-020) | MISSING |
| [FEAT-021](features/FEAT-021-configuracion-regional/spec.md) | restaurants, registration_requests, menu_items | [BR-021](BUSINESS_RULES.md#br-021) | [src/tests/unit/U22-regional-config.test.ts](<../../src/tests/unit/U22-regional-config.test.ts>); [src/tests/unit/U23-phase2-multi-country.test.ts](<../../src/tests/unit/U23-phase2-multi-country.test.ts>) |
| [FEAT-022](features/FEAT-022-contabilidad-dte/spec.md) | accounting_config, accounting_documents, accounting_cron_secret, orders, restaurants | [BR-022](BUSINESS_RULES.md#br-022) | [src/tests/unit/U24-accounting.test.ts](<../../src/tests/unit/U24-accounting.test.ts>) |
| [FEAT-023](features/FEAT-023-dashboard-notificaciones/spec.md) | notifications, orders, waiters, restaurant_tables, inventory_items, cash_shifts, tips | [BR-023](BUSINESS_RULES.md#br-023) | [src/tests/unit/U20-dashboard-widgets.test.ts](<../../src/tests/unit/U20-dashboard-widgets.test.ts>) |
| [FEAT-024](features/FEAT-024-seguridad-operacion/spec.md) | breach_register, audit_log, restaurants | [BR-024](BUSINESS_RULES.md#br-024) | [src/tests/security/S07-column-hardening.test.ts](<../../src/tests/security/S07-column-hardening.test.ts>) |


## Cambio autorizado — corrección integral

- [Estado actual](IMPLEMENTATION_STATUS.md)
- [Orden de despliegue/recuperación](DEPLOYMENT_MANIFEST.md)
- Registro verificable (referencia histórica excluida de esta distribución)

- [TASK-002 — Entorno y pruebas](changes/TASK-002.md)
- [TASK-003 — Autorización y MFA](changes/TASK-003.md)
- [TASK-004 — DSAR completo](changes/TASK-004.md)
- [TASK-005 — Auditoría y consentimientos](changes/TASK-005.md)
- [TASK-006 — POS y pedidos](changes/TASK-006.md)
- [TASK-007 — Sucursales](changes/TASK-007.md)
- [TASK-008 — Mesas QR](changes/TASK-008.md)
- [TASK-009 — Pagos y webhooks](changes/TASK-009.md)
- [TASK-010 — Inventario y recetas](changes/TASK-010.md)
- [TASK-011 — Dinero y precios](changes/TASK-011.md)
- [TASK-012 — Límites e IA](changes/TASK-012.md)
- [TASK-013 — Reportes y CRM](changes/TASK-013.md)
- [TASK-014 — Operación, archivos y configuración](changes/TASK-014.md)
- [TASK-015 — Cierre SDD](changes/TASK-015.md)


Estado vigente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), evidencia LOCAL_VALIDATION (referencia histórica excluida de esta distribución).


## Estado vigente de la entrega

Cierre local/CI y configuración por cliente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), LOCAL_VALIDATION (referencia histórica excluida de esta distribución), CI_VALIDATION (referencia histórica excluida de esta distribución). Reconstrucción inicial y resultados previos se conservan como evidencia histórica; no certifican producción.
