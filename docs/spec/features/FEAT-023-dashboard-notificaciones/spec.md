> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-023 — Dashboard y notificaciones operativas

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-023.
- Objetivo: Dashboard y notificaciones operativas dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-023/FR-001, FEAT-023/NFR-001, FEAT-023/SEC-F001 y FEAT-023/EDGE-001.

## Actores

Owner; módulos operativos como productores.

## Preconditions

Restaurante activo en contexto y permisos de lectura.

Punto de entrada y trigger: /restaurant; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Dashboard agrega pedidos, meseros, mesas, stock, turno y propinas; sólo completed+paid contribuye a ingresos del día. | CONFIRMADO | [src/services/dashboardService.ts](<../../../../src/services/dashboardService.ts>); [src/pages/restaurant/RestaurantHome.tsx](<../../../../src/pages/restaurant/RestaurantHome.tsx>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>) |
| FR-002 | getUnreadNotifications consulta máximo 20 por restaurante, is_read=false; mark_notifications_read marca leídas vía RPC. | CONFIRMADO | [src/services/dashboardService.ts](<../../../../src/services/dashboardService.ts>); [src/pages/restaurant/RestaurantHome.tsx](<../../../../src/pages/restaurant/RestaurantHome.tsx>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>) |
| FR-003 | Errores de pedidos/meseros/mesas/caja producen data=null; errores de tips/stock degradan a cero. | CONFIRMADO | [src/services/dashboardService.ts](<../../../../src/services/dashboardService.ts>); [src/pages/restaurant/RestaurantHome.tsx](<../../../../src/pages/restaurant/RestaurantHome.tsx>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Home actualiza cada 30s; ausencia de todas las notificaciones no demuestra que sus productores estén implementados.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RLS filtra restaurante; errores a cero no son evidencia de inexistencia de datos ni salud del backend.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Home consulta métricas y notificaciones del restaurante activo.
2. El servicio agrega datasets y aplica filtros paid/completed; ciertos errores se convierten en cero.
3. La UI refresca periódicamente y acción de leer notificaciones llama mark_notifications_read.

## Alternative Flows

Variación específica: Más de 1000 pedidos en consulta sin paginación. totalOrders y agregados derivados pueden estar truncados por max_rows local=1000; no representan necesariamente toda la historia.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Query principal falla.
- When: Se carga dashboard.
- Then: El servicio devuelve error normalizado en vez de agregados; stock/propinas tienen fallback diferente.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Falla tips o stock. When: Se carga getDashboardStats. Then: Se degradan métricas correspondientes a cero; fallo principal produce error.
- Caso 3 — CONFIRMADO. Given: Más de 20 notificaciones no leídas. When: Se consulta getUnreadNotifications. Then: Sólo retorna las primeras 20 ordenadas; no total completo.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Más de 1000 pedidos en consulta sin paginación.
- Comportamiento actual: totalOrders y agregados derivados pueden estar truncados por max_rows local=1000; no representan necesariamente toda la historia.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/dashboardService.ts](<../../../../src/services/dashboardService.ts>); [src/pages/restaurant/RestaurantHome.tsx](<../../../../src/pages/restaurant/RestaurantHome.tsx>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| notifications | DATA-024 |
| orders | DATA-026 |
| waiters | DATA-043 |
| restaurant_tables | DATA-037 |
| inventory_items | DATA-019 |
| cash_shifts | DATA-008 |
| tips | DATA-040 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-082, API-144. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-082](../../API_SPEC.md#api-082), [API-144](../../API_SPEC.md#api-144)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RLS filtra restaurante; errores a cero no son evidencia de inexistencia de datos ni salud del backend.

Reglas de negocio relacionadas: [BR-023](../../BUSINESS_RULES.md#br-023). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Lecturas y marca de notificaciones; no se observó una cola externa de notificaciones.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El servicio devuelve error normalizado en vez de agregados; stock/propinas tienen fallback diferente. Fallos parciales/concurrencia: Home actualiza cada 30s; ausencia de todas las notificaciones no demuestra que sus productores estén implementados. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U20-dashboard-widgets.test.ts](<../../../../src/tests/unit/U20-dashboard-widgets.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/dashboardService.ts](<../../../../src/services/dashboardService.ts>)
- [src/pages/restaurant/RestaurantHome.tsx](<../../../../src/pages/restaurant/RestaurantHome.tsx>)
- [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

La UI refresca periódicamente y acción de leer notificaciones llama mark_notifications_read.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-007 — Sucursales](../../changes/TASK-007.md): FEAT-004/FR-250, FEAT-004/FR-251, FEAT-004/FR-252. Validación local PASS; despliegue UNKNOWN.
- [TASK-013 — Reportes y CRM](../../changes/TASK-013.md): FEAT-009/FR-310, FEAT-009/FR-311, FEAT-009/FR-312. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
