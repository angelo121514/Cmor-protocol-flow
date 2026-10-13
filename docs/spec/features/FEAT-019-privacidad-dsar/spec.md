> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-019 — Consentimientos, derechos y páginas de privacidad

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-019.
- Objetivo: Consentimientos, derechos y páginas de privacidad dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — REQUIERE VALIDACIÓN.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-019/FR-001, FEAT-019/NFR-001, FEAT-019/SEC-F001 y FEAT-019/EDGE-001.

## Actores

Titular, owner y admin/DPO; Resend y Supabase Auth.

## Preconditions

Email y payload según derecho; prueba de identidad sólo implementada en determinados handlers.

Punto de entrada y trigger: /legal/*, /verify-dsar, /restaurant/privacy, /admin/privacy; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Access/erase validan JWT del mismo email o crean pending_verification y envían token; verify-dsar exige token de al menos 32 caracteres y TTL 24h. | CONFIRMADO | [src/services/privacyService.ts](<../../../../src/services/privacyService.ts>); [supabase/functions/privacy-access/index.ts](<../../../../supabase/functions/privacy-access/index.ts>); [supabase/functions/privacy-erase/index.ts](<../../../../supabase/functions/privacy-erase/index.ts>); [supabase/functions/privacy-export/index.ts](<../../../../supabase/functions/privacy-export/index.ts>); [supabase/functions/privacy-object/index.ts](<../../../../supabase/functions/privacy-object/index.ts>); [supabase/functions/privacy-rectify/index.ts](<../../../../supabase/functions/privacy-rectify/index.ts>); [supabase/functions/privacy-revoke-consent/index.ts](<../../../../supabase/functions/privacy-revoke-consent/index.ts>); [supabase/functions/verify-dsar/index.ts](<../../../../supabase/functions/verify-dsar/index.ts>); [src/components/privacy/ConsentManager.tsx](<../../../../src/components/privacy/ConsentManager.tsx>); [src/components/privacy/CookieBanner.tsx](<../../../../src/components/privacy/CookieBanner.tsx>) |
| FR-002 | Export recolecta datos por email y devuelve JSON+CSV sin verificación observable de identidad; object/revoke-consent revocan por email; esto es AS-IS y hallazgo, no requisito deseable. | CONFIRMADO | [src/services/privacyService.ts](<../../../../src/services/privacyService.ts>); [supabase/functions/privacy-access/index.ts](<../../../../supabase/functions/privacy-access/index.ts>); [supabase/functions/privacy-erase/index.ts](<../../../../supabase/functions/privacy-erase/index.ts>); [supabase/functions/privacy-export/index.ts](<../../../../supabase/functions/privacy-export/index.ts>); [supabase/functions/privacy-object/index.ts](<../../../../supabase/functions/privacy-object/index.ts>); [supabase/functions/privacy-rectify/index.ts](<../../../../supabase/functions/privacy-rectify/index.ts>); [supabase/functions/privacy-revoke-consent/index.ts](<../../../../supabase/functions/privacy-revoke-consent/index.ts>); [supabase/functions/verify-dsar/index.ts](<../../../../supabase/functions/verify-dsar/index.ts>); [src/components/privacy/ConsentManager.tsx](<../../../../src/components/privacy/ConsentManager.tsx>); [src/components/privacy/CookieBanner.tsx](<../../../../src/components/privacy/CookieBanner.tsx>) |
| FR-003 | Rectify crea pending con payload.fields y SLA declarado de 15 días; no modifica directamente datos del titular en ese handler. | CONFIRMADO | [src/services/privacyService.ts](<../../../../src/services/privacyService.ts>); [supabase/functions/privacy-access/index.ts](<../../../../supabase/functions/privacy-access/index.ts>); [supabase/functions/privacy-erase/index.ts](<../../../../supabase/functions/privacy-erase/index.ts>); [supabase/functions/privacy-export/index.ts](<../../../../supabase/functions/privacy-export/index.ts>); [supabase/functions/privacy-object/index.ts](<../../../../supabase/functions/privacy-object/index.ts>); [supabase/functions/privacy-rectify/index.ts](<../../../../supabase/functions/privacy-rectify/index.ts>); [supabase/functions/privacy-revoke-consent/index.ts](<../../../../supabase/functions/privacy-revoke-consent/index.ts>); [supabase/functions/verify-dsar/index.ts](<../../../../supabase/functions/verify-dsar/index.ts>); [src/components/privacy/ConsentManager.tsx](<../../../../src/components/privacy/ConsentManager.tsx>); [src/components/privacy/CookieBanner.tsx](<../../../../src/components/privacy/CookieBanner.tsx>) |
| FR-004 | Consentimientos almacenan scope, purpose, legal_basis, versión y prueba; los handlers de verificación usan campos/ejecutores diferentes de las rutas directas. | CONFIRMADO | [src/services/privacyService.ts](<../../../../src/services/privacyService.ts>); [supabase/functions/privacy-access/index.ts](<../../../../supabase/functions/privacy-access/index.ts>); [supabase/functions/privacy-erase/index.ts](<../../../../supabase/functions/privacy-erase/index.ts>); [supabase/functions/privacy-export/index.ts](<../../../../supabase/functions/privacy-export/index.ts>); [supabase/functions/privacy-object/index.ts](<../../../../supabase/functions/privacy-object/index.ts>); [supabase/functions/privacy-rectify/index.ts](<../../../../supabase/functions/privacy-rectify/index.ts>); [supabase/functions/privacy-revoke-consent/index.ts](<../../../../supabase/functions/privacy-revoke-consent/index.ts>); [supabase/functions/verify-dsar/index.ts](<../../../../supabase/functions/verify-dsar/index.ts>); [src/components/privacy/ConsentManager.tsx](<../../../../src/components/privacy/ConsentManager.tsx>); [src/components/privacy/CookieBanner.tsx](<../../../../src/components/privacy/CookieBanner.tsx>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): SLA en datos: access/erase/export/object 30 días, rectify 15 y revoke 1 para tracking. Son valores implementados, no certificación legal de cumplimiento.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RISK-001 CRITICAL para export por email y revocación no autenticada. CORS no autentica titulares. Queries auth.users vía from requieren validar esquema expuesto.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Titular elige derecho y envía email/payload desde formularios.
2. Access/erase prueban identidad o piden correo/token; export/object/revoke actúan directamente por email y rectify crea pending.
3. verify-dsar ejecuta por tipo y marca resultado/auditoría con secuencia no atómica; paneles consultan solicitudes y consentimientos.

## Alternative Flows

Variación específica: Verificación simultánea o ejecución parcialmente fallida. La secuencia marca in_progress, ejecuta, marca fulfilled y borra token con llamadas separadas; no se demuestra claim atómico.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Token de más de 24h.
- When: Se verifica DSAR pending_verification.
- Then: Marca expired y devuelve 410; reutilización sin pending devuelve 404.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Email ajeno sin JWT. When: Se solicita privacy-export. Then: Handler no verifica identidad y puede devolver datos recolectados con service role; RISK-001.
- Caso 3 — CONFIRMADO. Given: No hay RESEND_API_KEY. When: Access/erase requieren email. Then: No se envía correo y se loggea URL con token; la solicitud queda pendiente.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Verificación simultánea o ejecución parcialmente fallida.
- Comportamiento actual: La secuencia marca in_progress, ejecuta, marca fulfilled y borra token con llamadas separadas; no se demuestra claim atómico.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/privacyService.ts](<../../../../src/services/privacyService.ts>); [supabase/functions/privacy-access/index.ts](<../../../../supabase/functions/privacy-access/index.ts>); [supabase/functions/privacy-erase/index.ts](<../../../../supabase/functions/privacy-erase/index.ts>); [supabase/functions/privacy-export/index.ts](<../../../../supabase/functions/privacy-export/index.ts>); [supabase/functions/privacy-object/index.ts](<../../../../supabase/functions/privacy-object/index.ts>); [supabase/functions/privacy-rectify/index.ts](<../../../../supabase/functions/privacy-rectify/index.ts>); [supabase/functions/privacy-revoke-consent/index.ts](<../../../../supabase/functions/privacy-revoke-consent/index.ts>); [supabase/functions/verify-dsar/index.ts](<../../../../supabase/functions/verify-dsar/index.ts>); [src/components/privacy/ConsentManager.tsx](<../../../../src/components/privacy/ConsentManager.tsx>); [src/components/privacy/CookieBanner.tsx](<../../../../src/components/privacy/CookieBanner.tsx>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| consents | DATA-009 |
| data_subject_requests | DATA-010 |
| audit_log | DATA-006 |
| restaurant_customers | DATA-036 |
| orders | DATA-026 |
| restaurants | DATA-038 |
| invitations | DATA-021 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-025, API-026, API-027, API-028, API-029, API-030, API-031, API-088, API-093, API-163, API-164, API-165, API-166, API-167, API-168, API-169, API-170, API-171. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-025](../../API_SPEC.md#api-025), [API-026](../../API_SPEC.md#api-026), [API-027](../../API_SPEC.md#api-027), [API-028](../../API_SPEC.md#api-028), [API-029](../../API_SPEC.md#api-029), [API-030](../../API_SPEC.md#api-030), [API-031](../../API_SPEC.md#api-031), [API-088](../../API_SPEC.md#api-088), [API-093](../../API_SPEC.md#api-093), [API-163](../../API_SPEC.md#api-163), [API-164](../../API_SPEC.md#api-164), [API-165](../../API_SPEC.md#api-165), [API-166](../../API_SPEC.md#api-166), [API-167](../../API_SPEC.md#api-167), [API-168](../../API_SPEC.md#api-168), [API-169](../../API_SPEC.md#api-169), [API-170](../../API_SPEC.md#api-170), [API-171](../../API_SPEC.md#api-171)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RISK-001 CRITICAL para export por email y revocación no autenticada. CORS no autentica titulares. Queries auth.users vía from requieren validar esquema expuesto.

Reglas de negocio relacionadas: [BR-019](../../BUSINESS_RULES.md#br-019). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Solicitud/auditoría, correo, exportación, anonimización/eliminación según executeErase y revocación de consentimiento; no se demuestra propagación a terceros.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Marca expired y devuelve 410; reutilización sin pending devuelve 404. Fallos parciales/concurrencia: SLA en datos: access/erase/export/object 30 días, rectify 15 y revoke 1 para tracking. Son valores implementados, no certificación legal de cumplimiento. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/security/S03-dsar-verification.test.ts](<../../../../src/tests/security/S03-dsar-verification.test.ts>)
- [src/tests/e2e/E04-dsar-flow.spec.ts](<../../../../src/tests/e2e/E04-dsar-flow.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/privacyService.ts](<../../../../src/services/privacyService.ts>)
- [supabase/functions/privacy-access/index.ts](<../../../../supabase/functions/privacy-access/index.ts>)
- [supabase/functions/privacy-erase/index.ts](<../../../../supabase/functions/privacy-erase/index.ts>)
- [supabase/functions/privacy-export/index.ts](<../../../../supabase/functions/privacy-export/index.ts>)
- [supabase/functions/privacy-object/index.ts](<../../../../supabase/functions/privacy-object/index.ts>)
- [supabase/functions/privacy-rectify/index.ts](<../../../../supabase/functions/privacy-rectify/index.ts>)
- [supabase/functions/privacy-revoke-consent/index.ts](<../../../../supabase/functions/privacy-revoke-consent/index.ts>)
- [supabase/functions/verify-dsar/index.ts](<../../../../supabase/functions/verify-dsar/index.ts>)
- [src/components/privacy/ConsentManager.tsx](<../../../../src/components/privacy/ConsentManager.tsx>)
- [src/components/privacy/CookieBanner.tsx](<../../../../src/components/privacy/CookieBanner.tsx>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

verify-dsar ejecuta por tipo y marca resultado/auditoría con secuencia no atómica; paneles consultan solicitudes y consentimientos.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-040](../../BUSINESS_RULES.md#br-040) → FEAT-019/FR-002.


## Cambio autorizado — 2026-10-06

- [TASK-004 — DSAR completo](../../changes/TASK-004.md): FEAT-019/FR-220, FEAT-019/FR-221, FEAT-019/FR-222. Validación local PASS; despliegue UNKNOWN.
- [TASK-005 — Auditoría y consentimientos](../../changes/TASK-005.md): FEAT-024/FR-230, FEAT-024/FR-231, FEAT-024/FR-232. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.


TASK-016: [configuración por cliente y pruebas de cierre](../../changes/TASK-016.md). FEAT-019/FR-341; validación del delta en curso.
