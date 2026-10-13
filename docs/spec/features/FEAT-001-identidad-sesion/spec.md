> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-001 — Identidad, sesión e invitaciones

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-001.
- Objetivo: Identidad, sesión e invitaciones dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-001/FR-001, FEAT-001/NFR-001, FEAT-001/SEC-F001 y FEAT-001/EDGE-001.

## Actores

Owner, staff y administrador; Supabase Auth como actor secundario.

## Preconditions

Sesión válida de Supabase y perfil asociado para paneles; invitación vigente para vincular propietario.

Punto de entrada y trigger: /login, /admin/login, /setup-password; guards /restaurant/* y /admin/*; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | El guard espera la resolución de sesión, redirige anónimos al login y rechaza un perfil ausente o sin restaurante salvo admin. | CONFIRMADO | [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/components/RequireRole.tsx](<../../../../src/components/RequireRole.tsx>); [src/pages/public/LoginPage.tsx](<../../../../src/pages/public/LoginPage.tsx>); [src/pages/public/SetupPassword.tsx](<../../../../src/pages/public/SetupPassword.tsx>); [src/pages/admin/LoginPage.tsx](<../../../../src/pages/admin/LoginPage.tsx>); [src/config/authClient.ts](<../../../../src/config/authClient.ts>) |
| FR-002 | El panel admin sólo admite profile.role=admin; el guard owner admite cualquier perfil asociado, incluido staff y admin. | CONFIRMADO | [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/components/RequireRole.tsx](<../../../../src/components/RequireRole.tsx>); [src/pages/public/LoginPage.tsx](<../../../../src/pages/public/LoginPage.tsx>); [src/pages/public/SetupPassword.tsx](<../../../../src/pages/public/SetupPassword.tsx>); [src/pages/admin/LoginPage.tsx](<../../../../src/pages/admin/LoginPage.tsx>); [src/config/authClient.ts](<../../../../src/config/authClient.ts>) |
| FR-003 | SetupPassword consume el token de invitación y exige contraseña de al menos 8 caracteres antes de updateUser. | CONFIRMADO | [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/components/RequireRole.tsx](<../../../../src/components/RequireRole.tsx>); [src/pages/public/LoginPage.tsx](<../../../../src/pages/public/LoginPage.tsx>); [src/pages/public/SetupPassword.tsx](<../../../../src/pages/public/SetupPassword.tsx>); [src/pages/admin/LoginPage.tsx](<../../../../src/pages/admin/LoginPage.tsx>); [src/config/authClient.ts](<../../../../src/config/authClient.ts>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): AuthProvider comparte una resolución de identidad entre guard, shell y páginas; no hay SLA de login confirmado.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Guard frontend confirmado; autorización efectiva depende de RLS y comprobaciones Edge, no del guard.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El usuario inicia password/OAuth o abre enlace de invitación.
2. Auth resuelve sesión; useAuth obtiene perfil y membresías.
3. RequireRole permite o redirige según perfil; SetupPassword vincula invitación y actualiza contraseña cuando corresponde.

## Alternative Flows

Variación específica: Perfil sin restaurante. Se redirige a /login?error=no_restaurant; una sesión Auth por sí sola no abre el panel.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Sin sesión resuelta.
- When: Se intenta abrir /admin.
- Then: Se redirige al login administrativo.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Sesión válida pero profile=null. When: Se abre panel. Then: Guard redirige /login?error=no_profile.
- Caso 3 — CONFIRMADO. Given: Contraseña de menos de 8 caracteres. When: Se guarda SetupPassword. Then: Formulario rechaza y no realiza updateUser.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Perfil sin restaurante.
- Comportamiento actual: Se redirige a /login?error=no_restaurant; una sesión Auth por sí sola no abre el panel.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>); [src/components/RequireRole.tsx](<../../../../src/components/RequireRole.tsx>); [src/pages/public/LoginPage.tsx](<../../../../src/pages/public/LoginPage.tsx>); [src/pages/public/SetupPassword.tsx](<../../../../src/pages/public/SetupPassword.tsx>); [src/pages/admin/LoginPage.tsx](<../../../../src/pages/admin/LoginPage.tsx>); [src/config/authClient.ts](<../../../../src/config/authClient.ts>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| profiles | DATA-031 |
| profile_restaurants | DATA-030 |
| restaurants | DATA-038 |
| invitations | DATA-021 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-102, API-106, API-108, API-110, API-113, API-115. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-102](../../API_SPEC.md#api-102), [API-106](../../API_SPEC.md#api-106), [API-108](../../API_SPEC.md#api-108), [API-110](../../API_SPEC.md#api-110), [API-113](../../API_SPEC.md#api-113), [API-115](../../API_SPEC.md#api-115)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Guard frontend confirmado; autorización efectiva depende de RLS y comprobaciones Edge, no del guard.

Reglas de negocio relacionadas: [BR-001](../../BUSINESS_RULES.md#br-001). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Cambios en sesión Auth, consumo de invitación y vinculación de perfil. Logout limpia sesión vía SDK.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Se redirige al login administrativo. Fallos parciales/concurrencia: AuthProvider comparte una resolución de identidad entre guard, shell y páginas; no hay SLA de login confirmado. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

TEST: MISSING — no se identificó prueba dedicada de esta cadena.

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/hooks/useAuth.ts](<../../../../src/hooks/useAuth.ts>)
- [src/components/RequireRole.tsx](<../../../../src/components/RequireRole.tsx>)
- [src/pages/public/LoginPage.tsx](<../../../../src/pages/public/LoginPage.tsx>)
- [src/pages/public/SetupPassword.tsx](<../../../../src/pages/public/SetupPassword.tsx>)
- [src/pages/admin/LoginPage.tsx](<../../../../src/pages/admin/LoginPage.tsx>)
- [src/config/authClient.ts](<../../../../src/config/authClient.ts>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

RequireRole permite o redirige según perfil; SetupPassword vincula invitación y actualiza contraseña cuando corresponde.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-003 — Autorización y MFA](../../changes/TASK-003.md): FEAT-001/FR-210, FEAT-001/FR-211, FEAT-001/FR-212. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
