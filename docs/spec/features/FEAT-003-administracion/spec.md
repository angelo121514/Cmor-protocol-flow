> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-003 — Administración de restaurantes y plataforma

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-003.
- Objetivo: Administración de restaurantes y plataforma dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-003/FR-001, FEAT-003/NFR-001, FEAT-003/SEC-F001 y FEAT-003/EDGE-001.

## Actores

Administrador; dueño como destinatario de invitaciones.

## Preconditions

Perfil administrativo y permisos RPC efectivos.

Punto de entrada y trigger: /admin, /admin/requests, /admin/restaurants, /admin/analytics; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | El listado administrativo usa admin_list_restaurants para acceder a columnas internas protegidas por grants. | CONFIRMADO | [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [src/pages/admin/AllRestaurants.tsx](<../../../../src/pages/admin/AllRestaurants.tsx>); [src/pages/admin/PendingRequests.tsx](<../../../../src/pages/admin/PendingRequests.tsx>); [src/pages/admin/Analytics.tsx](<../../../../src/pages/admin/Analytics.tsx>) |
| FR-002 | El bloqueo/desbloqueo y rechazo de solicitudes usan admin_toggle_restaurant_status y admin_reject_request. | CONFIRMADO | [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [src/pages/admin/AllRestaurants.tsx](<../../../../src/pages/admin/AllRestaurants.tsx>); [src/pages/admin/PendingRequests.tsx](<../../../../src/pages/admin/PendingRequests.tsx>); [src/pages/admin/Analytics.tsx](<../../../../src/pages/admin/Analytics.tsx>) |
| FR-003 | deleteRestaurant usa admin_delete_restaurant en modo real; en mock elimina restaurantes/perfiles/usuarios de stores locales. | CONFIRMADO | [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [src/pages/admin/AllRestaurants.tsx](<../../../../src/pages/admin/AllRestaurants.tsx>); [src/pages/admin/PendingRequests.tsx](<../../../../src/pages/admin/PendingRequests.tsx>); [src/pages/admin/Analytics.tsx](<../../../../src/pages/admin/Analytics.tsx>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Suscripciones Realtime vuelven a consultar el listado; no hay garantía de latencia medida.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Guard admin y comprobaciones SQL presentes; owner de is_admin y alcance de auditoría REQUIEREN VALIDACIÓN.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El admin abre lista o solicitudes y los servicios consultan/suscriben cambios.
2. Una acción seleccionada llama RPC administrativa con IDs y argumentos.
3. SQL valida helper, muta recurso y registra auditoría cuando la función lo define; UI muestra resultado.

## Alternative Flows

Variación específica: Cambio de estado con isCurrentlyBlocked=true. El servicio pasa p_is_active=true para reactivar; no interpreta el argumento como estado nuevo.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Usuario sin autorización RPC.
- When: Intenta una mutación administrativa.
- Then: El SQL contiene comprobación is_admin; su eficacia requiere resolver RISK-002.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — REQUIERE VALIDACIÓN. Given: Owner real o anónimo. When: Se invoca RPC admin. Then: Contiene guard is_admin, pero rechazo efectivo depende de resolver RISK-002.
- Caso 3 — REQUIERE VALIDACIÓN. Given: Modo real con restaurant_id inexistente. When: Se pide DELETE. Then: Resultado booleano depende de RPC y errores; no afirmar eliminación exitosa sólo por UI.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Cambio de estado con isCurrentlyBlocked=true.
- Comportamiento actual: El servicio pasa p_is_active=true para reactivar; no interpreta el argumento como estado nuevo.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [src/pages/admin/AllRestaurants.tsx](<../../../../src/pages/admin/AllRestaurants.tsx>); [src/pages/admin/PendingRequests.tsx](<../../../../src/pages/admin/PendingRequests.tsx>); [src/pages/admin/Analytics.tsx](<../../../../src/pages/admin/Analytics.tsx>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurants | DATA-038 |
| registration_requests | DATA-035 |
| audit_log | DATA-006 |
| invitations | DATA-021 |
| orders | DATA-026 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-038, API-039, API-040, API-041, API-042, API-043, API-044, API-045, API-081, API-089, API-090, API-091. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-038](../../API_SPEC.md#api-038), [API-039](../../API_SPEC.md#api-039), [API-040](../../API_SPEC.md#api-040), [API-041](../../API_SPEC.md#api-041), [API-042](../../API_SPEC.md#api-042), [API-043](../../API_SPEC.md#api-043), [API-044](../../API_SPEC.md#api-044), [API-045](../../API_SPEC.md#api-045), [API-081](../../API_SPEC.md#api-081), [API-089](../../API_SPEC.md#api-089), [API-090](../../API_SPEC.md#api-090), [API-091](../../API_SPEC.md#api-091)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Guard admin y comprobaciones SQL presentes; owner de is_admin y alcance de auditoría REQUIEREN VALIDACIÓN.

Reglas de negocio relacionadas: [BR-003](../../BUSINESS_RULES.md#br-003). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Actualiza/borrra registros y registra acciones mediante funciones SQL de auditoría según operación.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El SQL contiene comprobación is_admin; su eficacia requiere resolver RISK-002. Fallos parciales/concurrencia: Suscripciones Realtime vuelven a consultar el listado; no hay garantía de latencia medida. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/e2e/E05-admin-actions.spec.ts](<../../../../src/tests/e2e/E05-admin-actions.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/adminService.ts](<../../../../src/services/adminService.ts>)
- [src/pages/admin/AllRestaurants.tsx](<../../../../src/pages/admin/AllRestaurants.tsx>)
- [src/pages/admin/PendingRequests.tsx](<../../../../src/pages/admin/PendingRequests.tsx>)
- [src/pages/admin/Analytics.tsx](<../../../../src/pages/admin/Analytics.tsx>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

SQL valida helper, muta recurso y registra auditoría cuando la función lo define; UI muestra resultado.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-003 — Autorización y MFA](../../changes/TASK-003.md): FEAT-001/FR-210, FEAT-001/FR-211, FEAT-001/FR-212. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
