> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-014 — Mesas, QR y sesiones de consumo

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-014.
- Objetivo: Mesas, QR y sesiones de consumo dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-014/FR-001, FEAT-014/NFR-001, FEAT-014/SEC-F001 y FEAT-014/EDGE-001.

## Actores

Owner, cliente anónimo; mesero asignado.

## Preconditions

Mesa y restaurante activos; token QR para lookup público y session_token para pedidos.

Punto de entrada y trigger: /restaurant/tables, /mesa/:qrToken, /mesa/:qrToken/pagar; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | El owner gestiona mesas y puede regenerar qr_token usando crypto.randomUUID. | CONFIRMADO | [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [src/pages/customer/TableQR.tsx](<../../../../src/pages/customer/TableQR.tsx>); [src/pages/restaurant/Tables.tsx](<../../../../src/pages/restaurant/Tables.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |
| FR-002 | start_table_session recibe table_id, devuelve una sesión active existente o crea una y marca mesa occupied. | CONFIRMADO | [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [src/pages/customer/TableQR.tsx](<../../../../src/pages/customer/TableQR.tsx>); [src/pages/restaurant/Tables.tsx](<../../../../src/pages/restaurant/Tables.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |
| FR-003 | create_table_order sólo acepta sesión active, recalcula precios base y rechaza selected_size_id/addon_ids; devuelve token de pedido y total de sesión. | CONFIRMADO | [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [src/pages/customer/TableQR.tsx](<../../../../src/pages/customer/TableQR.tsx>); [src/pages/restaurant/Tables.tsx](<../../../../src/pages/restaurant/Tables.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): TableQR refresca estado cada 15 segundos; lista de sesiones del owner limita 100.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Capability pública; start_table_session sólo exige table_id, no qr_token: revisar exposición de sesión en RISK-003.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Owner crea mesa y presenta QR; cliente abre /mesa/:qrToken y resuelve get_table_by_token.
2. start_table_session con table_id entrega sesión; cliente consulta cuenta usando session_token.
3. Pedido de mesa usa create_table_order; sesión payment_pending rechaza más pedidos de esa sesión y pago cerrado libera mesa.

## Alternative Flows

Variación específica: Mesa durante payment_pending. create_table_order no encuentra sesión active y retorna invalid_session; start_table_session sólo busca active y podría crear otra sesión.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Variantes solicitadas en pedido de mesa.
- When: Se envían selected_size_id o selected_addon_ids no vacíos.
- Then: SQL devuelve menu_options_not_supported_for_table_qr.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: QR regenerado. When: Cliente reutiliza QR anterior. Then: Lookup ya no encuentra qr_token coincidente; no demuestra revocación de session_token ya emitido.
- Caso 3 — CONFIRMADO. Given: Sesión closed. When: Se intenta create_table_order. Then: No encuentra sesión active y retorna invalid_session.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Mesa durante payment_pending.
- Comportamiento actual: create_table_order no encuentra sesión active y retorna invalid_session; start_table_session sólo busca active y podría crear otra sesión.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [src/pages/customer/TableQR.tsx](<../../../../src/pages/customer/TableQR.tsx>); [src/pages/restaurant/Tables.tsx](<../../../../src/pages/restaurant/Tables.tsx>); [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurant_tables | DATA-037 |
| table_sessions | DATA-039 |
| orders | DATA-026 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-035, API-052, API-056, API-069, API-070, API-071, API-096, API-147, API-202, API-203, API-204, API-205, API-206, API-207. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-035](../../API_SPEC.md#api-035), [API-052](../../API_SPEC.md#api-052), [API-056](../../API_SPEC.md#api-056), [API-069](../../API_SPEC.md#api-069), [API-070](../../API_SPEC.md#api-070), [API-071](../../API_SPEC.md#api-071), [API-096](../../API_SPEC.md#api-096), [API-147](../../API_SPEC.md#api-147), [API-202](../../API_SPEC.md#api-202), [API-203](../../API_SPEC.md#api-203), [API-204](../../API_SPEC.md#api-204), [API-205](../../API_SPEC.md#api-205), [API-206](../../API_SPEC.md#api-206), [API-207](../../API_SPEC.md#api-207)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Capability pública; start_table_session sólo exige table_id, no qr_token: revisar exposición de sesión en RISK-003.

Reglas de negocio relacionadas: [BR-014](../../BUSINESS_RULES.md#br-014). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Crea sesiones/pedidos, cambia estado de mesa y total_amount; pago finalizado cierra sesión/libera mesa.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: SQL devuelve menu_options_not_supported_for_table_qr. Fallos parciales/concurrencia: TableQR refresca estado cada 15 segundos; lista de sesiones del owner limita 100. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U17-qrTables.test.ts](<../../../../src/tests/unit/U17-qrTables.test.ts>)
- [src/tests/e2e/E09-tables-validation.spec.ts](<../../../../src/tests/e2e/E09-tables-validation.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/tableService.ts](<../../../../src/services/tableService.ts>)
- [src/pages/customer/TableQR.tsx](<../../../../src/pages/customer/TableQR.tsx>)
- [src/pages/restaurant/Tables.tsx](<../../../../src/pages/restaurant/Tables.tsx>)
- [supabase/migrations/20260831000001_multi_country.sql](<../../../../supabase/migrations/20260831000001_multi_country.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Pedido de mesa usa create_table_order; sesión payment_pending rechaza más pedidos de esa sesión y pago cerrado libera mesa.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-037](../../BUSINESS_RULES.md#br-037) → FEAT-014/FR-002.


## Cambio autorizado — 2026-10-06

- [TASK-008 — Mesas QR](../../changes/TASK-008.md): FEAT-014/FR-260, FEAT-014/FR-261, FEAT-014/FR-262. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
