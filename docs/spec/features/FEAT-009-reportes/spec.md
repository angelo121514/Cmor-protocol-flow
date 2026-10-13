> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-009 — Reportes y analítica de ventas

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-009.
- Objetivo: Reportes y analítica de ventas dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-009/FR-001, FEAT-009/NFR-001, FEAT-009/SEC-F001 y FEAT-009/EDGE-001.

## Actores

Owner y admin en analítica de plataforma.

## Preconditions

Restaurante accesible y rango de fechas seleccionado.

Punto de entrada y trigger: /restaurant/reports, /admin/analytics; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Las métricas de ventas usan get_daily_sales, get_top_items, get_avg_ticket, get_sales_by_hour, get_sales_by_order_type y get_reports_summary. | CONFIRMADO | [src/pages/restaurant/Reports.tsx](<../../../../src/pages/restaurant/Reports.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>) |
| FR-002 | Reportes complementarios leen propinas, inventario, meseros y turnos de caja desde sus tablas. | CONFIRMADO | [src/pages/restaurant/Reports.tsx](<../../../../src/pages/restaurant/Reports.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>) |
| FR-003 | La capa cliente transforma fechas y genera exportaciones; indicadores de ingresos deben contrastarse con filtro de estado/pago de cada consumidor. | CONFIRMADO | [src/pages/restaurant/Reports.tsx](<../../../../src/pages/restaurant/Reports.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Agregación SQL reduce transferencia de pedidos para reportes RPC; no se ha medido rendimiento ni cobertura temporal de todos los reportes.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RPCs de reporte incluyen is_my_restaurant; eficacia ligada a RISK-002. Exportaciones deben limitar tenant y campos sensibles.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El owner elige rango en reportes o admin abre analítica de plataforma.
2. Servicios consultan RPC de ventas y paneles específicos leen tablas adicionales.
3. La UI presenta agregados/exportación según consumidor, con fallbacks específicos ante error.

## Alternative Flows

Variación específica: Día límite de un rango y zona horaria distinta. Hay cálculos de inicio de día en navegador y agrupaciones SQL; equivalencia entre zonas REQUIERE VALIDACIÓN.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: RPC de reporte devuelve error.
- When: Se consulta un reporte.
- Then: El servicio devuelve los valores por defecto específicos de cada wrapper; revisar contrato API, no asumir respuesta única.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — REQUIERE VALIDACIÓN. Given: Pedidos al límite de fecha con timezone diferente. When: Se compara agregación UI y SQL. Then: Equivalencia de ventanas no está demostrada.
- Caso 3 — REQUIERE VALIDACIÓN. Given: Tips/stock/meseros/caja sin permisos. When: Se carga reporte correspondiente. Then: Contrato depende de query/error handling del panel, no del resultado de otras RPC.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Día límite de un rango y zona horaria distinta.
- Comportamiento actual: Hay cálculos de inicio de día en navegador y agrupaciones SQL; equivalencia entre zonas REQUIERE VALIDACIÓN.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/pages/restaurant/Reports.tsx](<../../../../src/pages/restaurant/Reports.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| orders | DATA-026 |
| tips | DATA-040 |
| inventory_items | DATA-019 |
| waiters | DATA-043 |
| cash_shifts | DATA-008 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-062, API-063, API-066, API-067, API-068, API-072. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-062](../../API_SPEC.md#api-062), [API-063](../../API_SPEC.md#api-063), [API-066](../../API_SPEC.md#api-066), [API-067](../../API_SPEC.md#api-067), [API-068](../../API_SPEC.md#api-068), [API-072](../../API_SPEC.md#api-072)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RPCs de reporte incluyen is_my_restaurant; eficacia ligada a RISK-002. Exportaciones deben limitar tenant y campos sensibles.

Reglas de negocio relacionadas: [BR-009](../../BUSINESS_RULES.md#br-009). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Lecturas y descarga de archivos en navegador; no se observa envío automático de reportes.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El servicio devuelve los valores por defecto específicos de cada wrapper; revisar contrato API, no asumir respuesta única. Fallos parciales/concurrencia: Agregación SQL reduce transferencia de pedidos para reportes RPC; no se ha medido rendimiento ni cobertura temporal de todos los reportes. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U21-tax-and-trial-helpers.test.ts](<../../../../src/tests/unit/U21-tax-and-trial-helpers.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/pages/restaurant/Reports.tsx](<../../../../src/pages/restaurant/Reports.tsx>)
- [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>)
- [supabase/migrations/20260710000008_notifications_usage.sql](<../../../../supabase/migrations/20260710000008_notifications_usage.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

La UI presenta agregados/exportación según consumidor, con fallbacks específicos ante error.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-007 — Sucursales](../../changes/TASK-007.md): FEAT-004/FR-250, FEAT-004/FR-251, FEAT-004/FR-252. Validación local PASS; despliegue UNKNOWN.
- [TASK-013 — Reportes y CRM](../../changes/TASK-013.md): FEAT-009/FR-310, FEAT-009/FR-311, FEAT-009/FR-312. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.

Cambio incremental: **FEAT-009/FR-313**, contrato/datos/reglas y aceptación en [TASK-013](../../changes/TASK-013.md). Estado LOCAL / REQUIRES VALIDATION SQL.


TASK-016: [configuración por cliente y pruebas de cierre](../../changes/TASK-016.md). FEAT-009/FR-342; validación del delta en curso.
