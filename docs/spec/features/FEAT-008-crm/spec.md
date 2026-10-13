> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-008 — CRM e historial de clientes

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-008.
- Objetivo: CRM e historial de clientes dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-008/FR-001, FEAT-008/NFR-001, FEAT-008/SEC-F001 y FEAT-008/EDGE-001.

## Actores

Owner/cajero; cliente como titular de datos.

## Preconditions

Usuario con acceso al restaurante; nombre y teléfono para vínculo automático.

Punto de entrada y trigger: /restaurant/crm, selector de cliente en POS; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | getCustomers combina clientes persistidos con pedidos de los últimos 90 días por teléfono, sin duplicar IDs de pedidos. | CONFIRMADO | [src/pages/restaurant/Crm.tsx](<../../../../src/pages/restaurant/Crm.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>) |
| FR-002 | Los teléfonos sin fila CRM producen clientes sintéticos con id order:<restaurantId>:<phone> e isSynthetic=true. | CONFIRMADO | [src/pages/restaurant/Crm.tsx](<../../../../src/pages/restaurant/Crm.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>) |
| FR-003 | getCustomerOrders devuelve por defecto los 3 pedidos más recientes por customer_id; CRUD de clientes usa restaurant_customers. | CONFIRMADO | [src/pages/restaurant/Crm.tsx](<../../../../src/pages/restaurant/Crm.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Historial agregado acotado a 90 días; no se confirma paginación completa de clientes ni superación del max_rows del gateway.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: PII de nombre/teléfono/email requiere RLS; el teléfono es clave de agregación por restaurante, no prueba de identidad.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. CRM consulta clientes y pedidos recientes del restaurante.
2. El servicio agrega por teléfono y construye clientes sintéticos cuando no hay fila.
3. Editar/crear persiste fila CRM; consultar historial por customer_id devuelve hasta límite solicitado.

## Alternative Flows

Variación específica: Pedido con teléfono pero sin fila CRM. Se expone un cliente sintético; ese id no equivale a UUID persistido válido para UPDATE.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Error al consultar historial individual.
- When: getCustomerOrders recibe error Supabase.
- Then: El servicio registra el error y devuelve [], sin distinguir historial vacío de fallo.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Falla búsqueda/creación CRM en legacy. When: Se crea pedido. Then: Helper retorna null; createOrder puede continuar sin customer_id.
- Caso 3 — REQUIERE VALIDACIÓN. Given: Cliente sintético order:.... When: Se intenta UPDATE por id. Then: No es UUID de fila persistida; rechazo/gestión exacta de esa UI requiere validación.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Pedido con teléfono pero sin fila CRM.
- Comportamiento actual: Se expone un cliente sintético; ese id no equivale a UUID persistido válido para UPDATE.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/pages/restaurant/Crm.tsx](<../../../../src/pages/restaurant/Crm.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurant_customers | DATA-036 |
| orders | DATA-026 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-180, API-181, API-182, API-187, API-189, API-190. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-180](../../API_SPEC.md#api-180), [API-181](../../API_SPEC.md#api-181), [API-182](../../API_SPEC.md#api-182), [API-187](../../API_SPEC.md#api-187), [API-189](../../API_SPEC.md#api-189), [API-190](../../API_SPEC.md#api-190)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

PII de nombre/teléfono/email requiere RLS; el teléfono es clave de agregación por restaurante, no prueba de identidad.

Reglas de negocio relacionadas: [BR-008](../../BUSINESS_RULES.md#br-008). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Actualiza nombre/email del cliente en pedidos; lectura y edición CRM.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El servicio registra el error y devuelve [], sin distinguir historial vacío de fallo. Fallos parciales/concurrencia: Historial agregado acotado a 90 días; no se confirma paginación completa de clientes ni superación del max_rows del gateway. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

TEST: MISSING — no se identificó prueba dedicada de esta cadena.

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/pages/restaurant/Crm.tsx](<../../../../src/pages/restaurant/Crm.tsx>)
- [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Editar/crear persiste fila CRM; consultar historial por customer_id devuelve hasta límite solicitado.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-013 — Reportes y CRM](../../changes/TASK-013.md): FEAT-009/FR-310, FEAT-009/FR-311, FEAT-009/FR-312. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
