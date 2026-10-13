> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-002 — Registro, aprobación y activación

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-002.
- Objetivo: Registro, aprobación y activación dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-002/FR-001, FEAT-002/NFR-001, FEAT-002/SEC-F001 y FEAT-002/EDGE-001.

## Actores

Prospecto, administrador; Supabase Auth y proveedor de pagos.

## Preconditions

Solicitud pending con email del dueño; plan elegido y país válido.

Punto de entrada y trigger: /register, /admin/requests; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | RegisterPage crea la solicitud y deriva free_trial a activate-trial-registration; planes pagos pasan a la pasarela correspondiente al país. | CONFIRMADO | [src/pages/public/RegisterPage.tsx](<../../../../src/pages/public/RegisterPage.tsx>); [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [supabase/functions/activate-trial-registration/index.ts](<../../../../supabase/functions/activate-trial-registration/index.ts>); [supabase/functions/invite-owner/index.ts](<../../../../supabase/functions/invite-owner/index.ts>) |
| FR-002 | La activación gratuita sólo envía free_trial a auto_approve_registration_v2; SQL crea restaurante trial de 14 días y una invitación de 7 días. | CONFIRMADO | [src/pages/public/RegisterPage.tsx](<../../../../src/pages/public/RegisterPage.tsx>); [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [supabase/functions/activate-trial-registration/index.ts](<../../../../supabase/functions/activate-trial-registration/index.ts>); [supabase/functions/invite-owner/index.ts](<../../../../supabase/functions/invite-owner/index.ts>) |
| FR-003 | La aprobación administrativa real crea restaurante e invitación; la rama mock conserva credenciales temporales y no envía correo real. | CONFIRMADO | [src/pages/public/RegisterPage.tsx](<../../../../src/pages/public/RegisterPage.tsx>); [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [supabase/functions/activate-trial-registration/index.ts](<../../../../supabase/functions/activate-trial-registration/index.ts>); [supabase/functions/invite-owner/index.ts](<../../../../supabase/functions/invite-owner/index.ts>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Origin permitido y UUID validado en la Edge pública; envío de invitación puede fallar después de activar y se informa invitation_sent=false.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Activación gratuita pública limitada en handler; activación paga depende de is_admin/service role en SQL: RISK-002 requiere validación.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El prospecto valida formulario, país y plan e inserta registration_requests.
2. Free trial invoca activate-trial-registration; un plan pago inicia pasarela o informa falta de pago online según país.
3. Activación crea restaurante/invitación y solicita email; aprobación manual usa RPC admin.

## Alternative Flows

Variación específica: Activación repetida de una solicitud ya procesada. La Edge Function no encuentra pending y devuelve 409; la RPC devuelve request_not_found_or_processed.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: UUID de registro malformado.
- When: Se solicita activar trial.
- Then: La Edge responde 400 sin llamar a activación.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Solicitud pending pero envío de invitación falla. When: Se activa trial. Then: Restaurante puede estar creado; respuesta success=true e invitation_sent=false.
- Caso 3 — CONFIRMADO. Given: Plan de pago enviado a activación gratuita. When: Se llama activate-trial-registration. Then: Handler no usa plan cliente y envía free_trial a SQL.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Activación repetida de una solicitud ya procesada.
- Comportamiento actual: La Edge Function no encuentra pending y devuelve 409; la RPC devuelve request_not_found_or_processed.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/pages/public/RegisterPage.tsx](<../../../../src/pages/public/RegisterPage.tsx>); [src/services/adminService.ts](<../../../../src/services/adminService.ts>); [supabase/functions/activate-trial-registration/index.ts](<../../../../supabase/functions/activate-trial-registration/index.ts>); [supabase/functions/invite-owner/index.ts](<../../../../supabase/functions/invite-owner/index.ts>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| registration_requests | DATA-035 |
| restaurants | DATA-038 |
| invitations | DATA-021 |
| payment_intents | DATA-029 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-001, API-022, API-046, API-053, API-073, API-112, API-116, API-136, API-137, API-139. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-001](../../API_SPEC.md#api-001), [API-022](../../API_SPEC.md#api-022), [API-046](../../API_SPEC.md#api-046), [API-053](../../API_SPEC.md#api-053), [API-073](../../API_SPEC.md#api-073), [API-112](../../API_SPEC.md#api-112), [API-116](../../API_SPEC.md#api-116), [API-136](../../API_SPEC.md#api-136), [API-137](../../API_SPEC.md#api-137), [API-139](../../API_SPEC.md#api-139)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Activación gratuita pública limitada en handler; activación paga depende de is_admin/service role en SQL: RISK-002 requiere validación.

Reglas de negocio relacionadas: [BR-002](../../BUSINESS_RULES.md#br-002). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Inserta restaurante/invitación, cambia solicitud a verified y solicita email de invitación.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: La Edge responde 400 sin llamar a activación. Fallos parciales/concurrencia: Origin permitido y UUID validado en la Edge pública; envío de invitación puede fallar después de activar y se informa invitation_sent=false. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/security/S02-auto-approve.test.ts](<../../../../src/tests/security/S02-auto-approve.test.ts>)
- [src/tests/e2e/E01-register-owner.spec.ts](<../../../../src/tests/e2e/E01-register-owner.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/pages/public/RegisterPage.tsx](<../../../../src/pages/public/RegisterPage.tsx>)
- [src/services/adminService.ts](<../../../../src/services/adminService.ts>)
- [supabase/functions/activate-trial-registration/index.ts](<../../../../supabase/functions/activate-trial-registration/index.ts>)
- [supabase/functions/invite-owner/index.ts](<../../../../supabase/functions/invite-owner/index.ts>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Activación crea restaurante/invitación y solicita email; aprobación manual usa RPC admin.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-030](../../BUSINESS_RULES.md#br-030) → FEAT-002/FR-002.


## Cambio autorizado — 2026-10-06

- [TASK-009 — Pagos y webhooks](../../changes/TASK-009.md): FEAT-015/FR-270, FEAT-015/FR-271, FEAT-015/FR-272. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
