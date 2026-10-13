> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-011 — Meseros, PIN y sesiones

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-011.
- Objetivo: Meseros, PIN y sesiones dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-011/FR-001, FEAT-011/NFR-001, FEAT-011/SEC-F001 y FEAT-011/EDGE-001.

## Actores

Owner, mesero; POS como consumidor de sesión.

## Preconditions

Acceso al restaurante; PIN y mesero activo para validar sesión.

Punto de entrada y trigger: /restaurant/waiters, WaiterPinPad en POS; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Crear y actualizar meseros usa RPCs; los PIN se hashean en SQL y el listado de servicio excluye pin_hash. | CONFIRMADO | [src/services/waiterService.ts](<../../../../src/services/waiterService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/pages/restaurant/Waiters.tsx](<../../../../src/pages/restaurant/Waiters.tsx>); [supabase/migrations/20260710000002_waiters.sql](<../../../../supabase/migrations/20260710000002_waiters.sql>) |
| FR-002 | validatePin devuelve data=null,error=null cuando no hay filas por PIN incorrecto. | CONFIRMADO | [src/services/waiterService.ts](<../../../../src/services/waiterService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/pages/restaurant/Waiters.tsx](<../../../../src/pages/restaurant/Waiters.tsx>); [supabase/migrations/20260710000002_waiters.sql](<../../../../supabase/migrations/20260710000002_waiters.sql>) |
| FR-003 | Historial de sesiones cerradas se limita por defecto a 50; end_waiter_session cierra y calcula atribución según SQL. | CONFIRMADO | [src/services/waiterService.ts](<../../../../src/services/waiterService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/pages/restaurant/Waiters.tsx](<../../../../src/pages/restaurant/Waiters.tsx>); [supabase/migrations/20260710000002_waiters.sql](<../../../../supabase/migrations/20260710000002_waiters.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): PIN de mesero y token KDS son mecanismos separados; la sesión de mesero no equivale a sesión Supabase.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Writes sensibles via RPC; leer pin_hash por otras rutas depende de grants efectivos, no sólo proyección de getWaiters.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Owner crea/edita mesero por RPC y el servicio lee sólo proyección de campos visibles.
2. El operador valida PIN desde POS y recibe identidad/sesión o data=null.
3. Los pedidos/propinas pueden guardar atribución; terminar sesión invoca RPC y consulta de historial.

## Alternative Flows

Variación específica: Edición de mesero sin nuevo PIN. El cliente envía p_pin=null y conserva el hash anterior según rama RPC.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: PIN no coincide.
- When: Se valida mesero.
- Then: No hay ActiveWaiter; el cliente debe tratar data=null como rechazo, no como éxito.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: PIN erróneo sin filas. When: Se ejecuta validatePin. Then: Retorna data=null,error=null; no ActiveWaiter.
- Caso 3 — REQUIERE VALIDACIÓN. Given: Usuario sin acceso al mesero. When: Se actualiza por UUID. Then: SQL contiene ownership; eficacia global depende de is_admin.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Edición de mesero sin nuevo PIN.
- Comportamiento actual: El cliente envía p_pin=null y conserva el hash anterior según rama RPC.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/waiterService.ts](<../../../../src/services/waiterService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/pages/restaurant/Waiters.tsx](<../../../../src/pages/restaurant/Waiters.tsx>); [supabase/migrations/20260710000002_waiters.sql](<../../../../supabase/migrations/20260710000002_waiters.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| waiters | DATA-043 |
| waiter_sessions | DATA-042 |
| orders | DATA-026 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-057, API-059, API-098, API-101, API-118, API-123, API-128, API-130, API-146, API-213, API-214, API-215. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-057](../../API_SPEC.md#api-057), [API-059](../../API_SPEC.md#api-059), [API-098](../../API_SPEC.md#api-098), [API-101](../../API_SPEC.md#api-101), [API-118](../../API_SPEC.md#api-118), [API-123](../../API_SPEC.md#api-123), [API-128](../../API_SPEC.md#api-128), [API-130](../../API_SPEC.md#api-130), [API-146](../../API_SPEC.md#api-146), [API-213](../../API_SPEC.md#api-213), [API-214](../../API_SPEC.md#api-214), [API-215](../../API_SPEC.md#api-215)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Writes sensibles via RPC; leer pin_hash por otras rutas depende de grants efectivos, no sólo proyección de getWaiters.

Reglas de negocio relacionadas: [BR-011](../../BUSINESS_RULES.md#br-011). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Inserta/actualiza mesero y sesiones; pedidos/propinas atribuidos a mesero.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: No hay ActiveWaiter; el cliente debe tratar data=null como rechazo, no como éxito. Fallos parciales/concurrencia: PIN de mesero y token KDS son mecanismos separados; la sesión de mesero no equivale a sesión Supabase. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U14-waiterService.test.ts](<../../../../src/tests/unit/U14-waiterService.test.ts>)
- [src/tests/security/S06-pin-hash.test.ts](<../../../../src/tests/security/S06-pin-hash.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/waiterService.ts](<../../../../src/services/waiterService.ts>)
- [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>)
- [src/pages/restaurant/Waiters.tsx](<../../../../src/pages/restaurant/Waiters.tsx>)
- [supabase/migrations/20260710000002_waiters.sql](<../../../../supabase/migrations/20260710000002_waiters.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Los pedidos/propinas pueden guardar atribución; terminar sesión invoca RPC y consulta de historial.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-003 — Autorización y MFA](../../changes/TASK-003.md): FEAT-001/FR-210, FEAT-001/FR-211, FEAT-001/FR-212. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.

FEAT-011/FR-213: PIN sin ambigüedad; API-245 / BR-059 / SQL29 / S06.
