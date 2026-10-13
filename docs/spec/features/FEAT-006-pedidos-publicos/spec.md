> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-006 — Pedidos públicos, estados y seguimiento

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-006.
- Objetivo: Pedidos públicos, estados y seguimiento dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-006/FR-001, FEAT-006/NFR-001, FEAT-006/SEC-F001 y FEAT-006/EDGE-001.

## Actores

Cliente anónimo, owner; cocina como consumidor.

## Preconditions

Restaurante activo/trial vigente, carrito con productos disponibles.

Punto de entrada y trigger: /menu/:slug, /restaurant/orders; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | create_order recalcula precio de carta, tamaño y addons; total es suma de items y subtotal=total/(1+tax_rate). | CONFIRMADO | [src/pages/customer/CustomerMenu.tsx](<../../../../src/pages/customer/CustomerMenu.tsx>); [src/pages/restaurant/Orders.tsx](<../../../../src/pages/restaurant/Orders.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>); [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>) |
| FR-002 | SQL rechaza carrito vacío o más de 50 líneas; el trigger limita cantidades a enteros de 1 a 100 y total positivo. | CONFIRMADO | [src/pages/customer/CustomerMenu.tsx](<../../../../src/pages/customer/CustomerMenu.tsx>); [src/pages/restaurant/Orders.tsx](<../../../../src/pages/restaurant/Orders.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>); [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>) |
| FR-003 | get_my_order acepta access_token durante 24h y lo anula tras devolver el pedido. | CONFIRMADO | [src/pages/customer/CustomerMenu.tsx](<../../../../src/pages/customer/CustomerMenu.tsx>); [src/pages/restaurant/Orders.tsx](<../../../../src/pages/restaurant/Orders.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>); [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>) |
| FR-004 | createOrder elige RPC mediante flag cacheado 5 minutos; si no lo activa usa INSERT directo y vinculación CRM separada. | CONFIRMADO | [src/pages/customer/CustomerMenu.tsx](<../../../../src/pages/customer/CustomerMenu.tsx>); [src/pages/restaurant/Orders.tsx](<../../../../src/pages/restaurant/Orders.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>); [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): subscribeToOrders carga últimos 7 días, escucha orders_events y hace refetch de respaldo cada 30 segundos.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Pedido público permite crear por restaurante activo; grant safe RPC evita necesitar lectura pública de orders. El fallback legacy no garantiza recálculo SQL.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. CustomerMenu carga restaurante/carta y mantiene carrito por slug.
2. Al enviar, createOrder consulta flag y usa create_order o INSERT legacy.
3. El resultado se muestra; OrderEvent alimenta panel/cocina; get_my_order permite una lectura por token cuando el consumidor lo usa.

## Alternative Flows

Variación específica: Segunda lectura del mismo access_token. La primera lectura lo borra; la siguiente produce P0002, aunque el TTL todavía esté vigente.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Producto de otro restaurante o no disponible.
- When: Se llama create_order.
- Then: Se retorna success=false con item_not_available; UUID inválido puede producir error SQL de cast.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Carrito de 51 líneas. When: Se llama create_order. Then: Retorna too_many_items; 50 es límite aceptado sujeto al resto de validaciones.
- Caso 3 — CONFIRMADO. Given: Cantidad 101 o total no positivo. When: Se inserta pedido que alcanza trigger. Then: Lanza invalid_item_quantity o invalid_order_amount; las casts malformadas pueden fallar antes.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Segunda lectura del mismo access_token.
- Comportamiento actual: La primera lectura lo borra; la siguiente produce P0002, aunque el TTL todavía esté vigente.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/pages/customer/CustomerMenu.tsx](<../../../../src/pages/customer/CustomerMenu.tsx>); [src/pages/restaurant/Orders.tsx](<../../../../src/pages/restaurant/Orders.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>); [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| orders | DATA-026 |
| orders_events | DATA-027 |
| menu_items | DATA-023 |
| restaurant_customers | DATA-036 |
| feature_flags | DATA-011 |
| rate_limits | DATA-032 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-049, API-050, API-054, API-060, API-061, API-064, API-074, API-075, API-083, API-084, API-087, API-092, API-095, API-097, API-099, API-100, API-117, API-119, API-121, API-122, API-124, API-125, API-135, API-140, API-141, API-145, API-172, API-173, API-179, API-183, API-184, API-185, API-186, API-188, API-191, API-201. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-049](../../API_SPEC.md#api-049), [API-050](../../API_SPEC.md#api-050), [API-054](../../API_SPEC.md#api-054), [API-060](../../API_SPEC.md#api-060), [API-061](../../API_SPEC.md#api-061), [API-064](../../API_SPEC.md#api-064), [API-074](../../API_SPEC.md#api-074), [API-075](../../API_SPEC.md#api-075), [API-083](../../API_SPEC.md#api-083), [API-084](../../API_SPEC.md#api-084), [API-087](../../API_SPEC.md#api-087), [API-092](../../API_SPEC.md#api-092), [API-095](../../API_SPEC.md#api-095), [API-097](../../API_SPEC.md#api-097), [API-099](../../API_SPEC.md#api-099), [API-100](../../API_SPEC.md#api-100), [API-117](../../API_SPEC.md#api-117), [API-119](../../API_SPEC.md#api-119), [API-121](../../API_SPEC.md#api-121), [API-122](../../API_SPEC.md#api-122), [API-124](../../API_SPEC.md#api-124), [API-125](../../API_SPEC.md#api-125), [API-135](../../API_SPEC.md#api-135), [API-140](../../API_SPEC.md#api-140), [API-141](../../API_SPEC.md#api-141), [API-145](../../API_SPEC.md#api-145), [API-172](../../API_SPEC.md#api-172), [API-173](../../API_SPEC.md#api-173), [API-179](../../API_SPEC.md#api-179), [API-183](../../API_SPEC.md#api-183), [API-184](../../API_SPEC.md#api-184), [API-185](../../API_SPEC.md#api-185), [API-186](../../API_SPEC.md#api-186), [API-188](../../API_SPEC.md#api-188), [API-191](../../API_SPEC.md#api-191), [API-201](../../API_SPEC.md#api-201)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Pedido público permite crear por restaurante activo; grant safe RPC evita necesitar lectura pública de orders. El fallback legacy no garantiza recálculo SQL.

Reglas de negocio relacionadas: [BR-006](../../BUSINESS_RULES.md#br-006). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Inserta pedido, puede crear/actualizar cliente, genera número atómico y evento espejo; completed exige paid y dispara descuento de inventario.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Se retorna success=false con item_not_available; UUID inválido puede producir error SQL de cast. Fallos parciales/concurrencia: subscribeToOrders carga últimos 7 días, escucha orders_events y hace refetch de respaldo cada 30 segundos. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U01-calculateOrderTotals.test.ts](<../../../../src/tests/unit/U01-calculateOrderTotals.test.ts>)
- [src/tests/unit/U04-calculateItemPrice.test.ts](<../../../../src/tests/unit/U04-calculateItemPrice.test.ts>)
- [src/tests/e2e/E03-customer-order.spec.ts](<../../../../src/tests/e2e/E03-customer-order.spec.ts>)
- [src/tests/security/S01-rls-orders.test.ts](<../../../../src/tests/security/S01-rls-orders.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/pages/customer/CustomerMenu.tsx](<../../../../src/pages/customer/CustomerMenu.tsx>)
- [src/pages/restaurant/Orders.tsx](<../../../../src/pages/restaurant/Orders.tsx>)
- [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>)
- [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>)
- [supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

El resultado se muestra; OrderEvent alimenta panel/cocina; get_my_order permite una lectura por token cuando el consumidor lo usa.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-025](../../BUSINESS_RULES.md#br-025) → FEAT-006/FR-002.

Regla adicional: [BR-026](../../BUSINESS_RULES.md#br-026) → FEAT-006/FR-002.

Regla adicional: [BR-027](../../BUSINESS_RULES.md#br-027) → FEAT-006/FR-001.

Regla adicional: [BR-036](../../BUSINESS_RULES.md#br-036) → FEAT-006/FR-003.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-012 — Límites e IA](../../changes/TASK-012.md): FEAT-020/FR-300, FEAT-020/FR-301, FEAT-020/FR-302. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
