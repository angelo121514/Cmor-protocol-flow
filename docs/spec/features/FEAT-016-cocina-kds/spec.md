> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-016 — Pantalla de cocina interna y pública

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-016.
- Objetivo: Pantalla de cocina interna y pública dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-016/FR-001, FEAT-016/NFR-001, FEAT-016/SEC-F001 y FEAT-016/EDGE-001.

## Actores

Owner/staff interno, operador cocina con PIN.

## Preconditions

Sesión owner para KDS interno o PIN de cocina para token público.

Punto de entrada y trigger: /restaurant/kds, /kds/:restaurantSlug; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | kitchen_login valida PIN de 4 a 32 caracteres, hashea/verifica en SQL y emite token de 12 horas. | CONFIRMADO | [src/services/kdsService.ts](<../../../../src/services/kdsService.ts>); [src/pages/customer/KDSPublic.tsx](<../../../../src/pages/customer/KDSPublic.tsx>); [src/pages/restaurant/KDS.tsx](<../../../../src/pages/restaurant/KDS.tsx>); [supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../../../supabase/migrations/20260807020000_harden_public_kds_access.sql>) |
| FR-002 | KDS público guarda token en sessionStorage y hace polling cada 5 segundos; KDS interno usa suscripción de pedidos. | CONFIRMADO | [src/services/kdsService.ts](<../../../../src/services/kdsService.ts>); [src/pages/customer/KDSPublic.tsx](<../../../../src/pages/customer/KDSPublic.tsx>); [src/pages/restaurant/KDS.tsx](<../../../../src/pages/restaurant/KDS.tsx>); [supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../../../supabase/migrations/20260807020000_harden_public_kds_access.sql>) |
| FR-003 | partitionOrders separa pending/accepted/preparing/ready y ordena FIFO por created_at; ignora estados terminales. | CONFIRMADO | [src/services/kdsService.ts](<../../../../src/services/kdsService.ts>); [src/pages/customer/KDSPublic.tsx](<../../../../src/pages/customer/KDSPublic.tsx>); [src/pages/restaurant/KDS.tsx](<../../../../src/pages/restaurant/KDS.tsx>); [supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../../../supabase/migrations/20260807020000_harden_public_kds_access.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Polling 5s y reloj visual 30s; no son garantía de entrega o tiempo máximo de preparación.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Token expirable opaco y rate limit por IP si existen headers; grants excluyen kitchen_pin_hash/token del cliente normal.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. KDS interno carga sesión Auth; pantalla pública resuelve slug y pide PIN o recupera token almacenado.
2. kitchen_login emite token y polling pide órdenes activas; interno recibe eventos de pedidos.
3. La pantalla ordena FIFO y presenta columnas; token inválido borra sesión de cocina y vuelve a pedir PIN.

## Alternative Flows

Variación específica: Nuevo login de cocina con PIN correcto. Sobrescribe el token único del restaurante; el token anterior deja de coincidir.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: PIN incorrecto, recurso desconocido o rate limit.
- When: Se llama kitchen_login.
- Then: SQL lanza invalid/42501 sin distinguir las causas.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Token cocina vencido o sustituido. When: Se llama kds_get_orders. Then: No satisface token/expiry y SQL rechaza; UI elimina token inválido.
- Caso 3 — CONFIRMADO. Given: PIN de 33 caracteres. When: Se llama kitchen_login. Then: Lanza invalid/42501.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Nuevo login de cocina con PIN correcto.
- Comportamiento actual: Sobrescribe el token único del restaurante; el token anterior deja de coincidir.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/kdsService.ts](<../../../../src/services/kdsService.ts>); [src/pages/customer/KDSPublic.tsx](<../../../../src/pages/customer/KDSPublic.tsx>); [src/pages/restaurant/KDS.tsx](<../../../../src/pages/restaurant/KDS.tsx>); [supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../../../supabase/migrations/20260807020000_harden_public_kds_access.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurants | DATA-038 |
| orders | DATA-026 |
| orders_events | DATA-027 |
| rate_limits | DATA-032 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-077, API-078, API-079, API-080, API-094. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-077](../../API_SPEC.md#api-077), [API-078](../../API_SPEC.md#api-078), [API-079](../../API_SPEC.md#api-079), [API-080](../../API_SPEC.md#api-080), [API-094](../../API_SPEC.md#api-094)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Token expirable opaco y rate limit por IP si existen headers; grants excluyen kitchen_pin_hash/token del cliente normal.

Reglas de negocio relacionadas: [BR-016](../../BUSINESS_RULES.md#br-016). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Rota token y su expiración; lecturas de pedidos activos; cambios de estado en KDS interno.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: SQL lanza invalid/42501 sin distinguir las causas. Fallos parciales/concurrencia: Polling 5s y reloj visual 30s; no son garantía de entrega o tiempo máximo de preparación. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U18-kds.test.ts](<../../../../src/tests/unit/U18-kds.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/kdsService.ts](<../../../../src/services/kdsService.ts>)
- [src/pages/customer/KDSPublic.tsx](<../../../../src/pages/customer/KDSPublic.tsx>)
- [src/pages/restaurant/KDS.tsx](<../../../../src/pages/restaurant/KDS.tsx>)
- [supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../../../supabase/migrations/20260807020000_harden_public_kds_access.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

La pantalla ordena FIFO y presenta columnas; token inválido borra sesión de cocina y vuelve a pedir PIN.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
