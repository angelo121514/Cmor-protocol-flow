> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-024 — Incidentes, auditoría y operación

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-024.
- Objetivo: Incidentes, auditoría y operación dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-024/FR-001, FEAT-024/NFR-001, FEAT-024/SEC-F001 y FEAT-024/EDGE-001.

## Actores

Admin/DPO y workflows; Sentry y Slack configurables.

## Preconditions

Admin para UI; secretos de workflows/DSN para integraciones operativas.

Punto de entrada y trigger: /admin/security; healthcheck; GitHub Actions; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Security permite registrar incidentes con estados detected/investigating/contained/notified/closed y consultar auditoría/anomalías. | CONFIRMADO | [src/services/securityService.ts](<../../../../src/services/securityService.ts>); [src/pages/admin/Security.tsx](<../../../../src/pages/admin/Security.tsx>); [src/instrumentation.ts](<../../../../src/instrumentation.ts>); [src/utils/logger.ts](<../../../../src/utils/logger.ts>); [supabase/functions/healthcheck/index.ts](<../../../../supabase/functions/healthcheck/index.ts>); [.github/workflows/ci.yml](<../../../../.github/workflows/ci.yml>); .github/workflows/backup.yml (referencia histórica excluida de esta distribución); [.github/workflows/monitor.yml](<../../../../.github/workflows/monitor.yml>); .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución) |
| FR-002 | listAnomalies cuenta acciones por ventanas y retorna count=0 si falla una query; el threshold configurado no se aplica en ese servicio. | CONFIRMADO | [src/services/securityService.ts](<../../../../src/services/securityService.ts>); [src/pages/admin/Security.tsx](<../../../../src/pages/admin/Security.tsx>); [src/instrumentation.ts](<../../../../src/instrumentation.ts>); [src/utils/logger.ts](<../../../../src/utils/logger.ts>); [supabase/functions/healthcheck/index.ts](<../../../../supabase/functions/healthcheck/index.ts>); [.github/workflows/ci.yml](<../../../../.github/workflows/ci.yml>); .github/workflows/backup.yml (referencia histórica excluida de esta distribución); [.github/workflows/monitor.yml](<../../../../.github/workflows/monitor.yml>); .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución) |
| FR-003 | Sentry sólo se inicializa con DSN HTTPS y redacta ciertos headers, cookies y tokens; logger redacta claves PII en contextos. | CONFIRMADO | [src/services/securityService.ts](<../../../../src/services/securityService.ts>); [src/pages/admin/Security.tsx](<../../../../src/pages/admin/Security.tsx>); [src/instrumentation.ts](<../../../../src/instrumentation.ts>); [src/utils/logger.ts](<../../../../src/utils/logger.ts>); [supabase/functions/healthcheck/index.ts](<../../../../supabase/functions/healthcheck/index.ts>); [.github/workflows/ci.yml](<../../../../.github/workflows/ci.yml>); .github/workflows/backup.yml (referencia histórica excluida de esta distribución); [.github/workflows/monitor.yml](<../../../../.github/workflows/monitor.yml>); .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución) |
| FR-004 | CI declara lint/type-check/build/tests y jobs externos condicionales; backups y healthchecks son configuración, no evidencia de ejecuciones exitosas. | CONFIRMADO | [src/services/securityService.ts](<../../../../src/services/securityService.ts>); [src/pages/admin/Security.tsx](<../../../../src/pages/admin/Security.tsx>); [src/instrumentation.ts](<../../../../src/instrumentation.ts>); [src/utils/logger.ts](<../../../../src/utils/logger.ts>); [supabase/functions/healthcheck/index.ts](<../../../../supabase/functions/healthcheck/index.ts>); [.github/workflows/ci.yml](<../../../../.github/workflows/ci.yml>); .github/workflows/backup.yml (referencia histórica excluida de esta distribución); [.github/workflows/monitor.yml](<../../../../.github/workflows/monitor.yml>); .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): UI security refresca cada 60s; Sentry traces 10%, replay 5% y errores 100% según configuración, no cobertura garantizada.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RLS admin para incidentes; audit_log tiene inserciones públicas en historia que requieren revisar alcance; logs console no pasan por logger.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Admin abre Security, consulta eventos/anomalías y crea/actualiza incidente cuando procede.
2. El servicio lee/escribe registros; console/logger/Sentry aportan señales sólo donde se llaman.
3. Workflows y healthcheck declaran controles operativos independientes; no se ejecutaron ni acreditan funcionamiento real en esta auditoría.

## Alternative Flows

Variación específica: Acciones de anomalías sin productores. El conteo cero no distingue falta de instrumentación de ausencia real de abuso; export_data no coincide con dsar_export_fulfilled.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Consulta de anomalía falla.
- When: Se ejecuta listAnomalies.
- Then: Retorna count=0 para esa categoría y continúa, sin error global.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: DB/Auth caídos pero OPTIONS de funciones exitoso. When: Se consulta healthcheck. Then: Status HTTP lo determina DB/Auth; OPTIONS no demuestra lógica protegida.
- Caso 3 — CONFIRMADO de diferencia; productor externo DESCONOCIDO. Given: Exportaciones emiten dsar_export_fulfilled. When: Anomalía consulta export_data. Then: No cuenta esos eventos salvo otro productor escriba action buscada.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Acciones de anomalías sin productores.
- Comportamiento actual: El conteo cero no distingue falta de instrumentación de ausencia real de abuso; export_data no coincide con dsar_export_fulfilled.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/securityService.ts](<../../../../src/services/securityService.ts>); [src/pages/admin/Security.tsx](<../../../../src/pages/admin/Security.tsx>); [src/instrumentation.ts](<../../../../src/instrumentation.ts>); [src/utils/logger.ts](<../../../../src/utils/logger.ts>); [supabase/functions/healthcheck/index.ts](<../../../../supabase/functions/healthcheck/index.ts>); [.github/workflows/ci.yml](<../../../../.github/workflows/ci.yml>); .github/workflows/backup.yml (referencia histórica excluida de esta distribución); [.github/workflows/monitor.yml](<../../../../.github/workflows/monitor.yml>); .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| breach_register | DATA-007 |
| audit_log | DATA-006 |
| restaurants | DATA-038 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-021, API-192, API-193, API-194, API-195, API-196. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-021](../../API_SPEC.md#api-021), [API-192](../../API_SPEC.md#api-192), [API-193](../../API_SPEC.md#api-193), [API-194](../../API_SPEC.md#api-194), [API-195](../../API_SPEC.md#api-195), [API-196](../../API_SPEC.md#api-196)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RLS admin para incidentes; audit_log tiene inserciones públicas en historia que requieren revisar alcance; logs console no pasan por logger.

Reglas de negocio relacionadas: [BR-024](../../BUSINESS_RULES.md#br-024). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Incidentes y auditoría; telemetría a Sentry; workflows pueden enviar Slack, hacer backup o leer healthcheck, no ejecutados en esta auditoría.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Retorna count=0 para esa categoría y continúa, sin error global. Fallos parciales/concurrencia: UI security refresca cada 60s; Sentry traces 10%, replay 5% y errores 100% según configuración, no cobertura garantizada. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/security/S07-column-hardening.test.ts](<../../../../src/tests/security/S07-column-hardening.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/securityService.ts](<../../../../src/services/securityService.ts>)
- [src/pages/admin/Security.tsx](<../../../../src/pages/admin/Security.tsx>)
- [src/instrumentation.ts](<../../../../src/instrumentation.ts>)
- [src/utils/logger.ts](<../../../../src/utils/logger.ts>)
- [supabase/functions/healthcheck/index.ts](<../../../../supabase/functions/healthcheck/index.ts>)
- [.github/workflows/ci.yml](<../../../../.github/workflows/ci.yml>)
- .github/workflows/backup.yml (referencia histórica excluida de esta distribución)
- [.github/workflows/monitor.yml](<../../../../.github/workflows/monitor.yml>)
- .github/workflows/healthcheck.yml (referencia histórica excluida de esta distribución)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Workflows y healthcheck declaran controles operativos independientes; no se ejecutaron ni acreditan funcionamiento real en esta auditoría.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-045](../../BUSINESS_RULES.md#br-045) → FEAT-024/FR-002.


## Cambio autorizado — 2026-10-06

- [TASK-002 — Entorno y pruebas](../../changes/TASK-002.md): FEAT-024/FR-200, FEAT-024/FR-201, FEAT-024/FR-202. Validación local PASS; despliegue UNKNOWN.
- [TASK-003 — Autorización y MFA](../../changes/TASK-003.md): FEAT-001/FR-210, FEAT-001/FR-211, FEAT-001/FR-212. Validación local PASS; despliegue UNKNOWN.
- [TASK-005 — Auditoría y consentimientos](../../changes/TASK-005.md): FEAT-024/FR-230, FEAT-024/FR-231, FEAT-024/FR-232. Validación local PASS; despliegue UNKNOWN.
- [TASK-014 — Operación, archivos y configuración](../../changes/TASK-014.md): FEAT-022/FR-320, FEAT-022/FR-321, FEAT-022/FR-322. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.


TASK-016: [configuración por cliente y pruebas de cierre](../../changes/TASK-016.md). FEAT-024/FR-340, FEAT-024/FR-345; validación del delta en curso.

FEAT-024/FR-346: [TASK-016](../../changes/TASK-016.md) y API-251 especifican inspección completa y antivirus antes de Storage. Configuración por administrador del cliente.

FEAT-024/FR-347: dependencias y CSS compatibles, auditoría y evidencia en [TASK-016](../../changes/TASK-016.md).

FEAT-024/FR-348: API-234/BR-064 vinculan publicación y carpeta al mismo restaurante; [TASK-016](../../changes/TASK-016.md).
