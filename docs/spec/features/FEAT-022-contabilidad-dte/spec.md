> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-022 — Contabilidad y documentos tributarios Chile

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-022.
- Objetivo: Contabilidad y documentos tributarios Chile dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-022/FR-001, FEAT-022/NFR-001, FEAT-022/SEC-F001 y FEAT-022/EDGE-001.

## Actores

Owner/admin y cron interno; motor cmorflow-tax-api.

## Preconditions

Restaurante CL, orden paid para emitir, credencial configurada y master key para cifrar.

Punto de entrada y trigger: /restaurant/accounting; accounting/config, emit, sync, documents, credit-note, documents/:id/artifact; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Emite boleta 39/factura 33 de pedido pagado; factura requiere receiver.rut válido y name; nota de crédito 61 requiere documento accepted del mismo restaurante. | CONFIRMADO | [src/services/accountingService.ts](<../../../../src/services/accountingService.ts>); [src/pages/restaurant/Accounting.tsx](<../../../../src/pages/restaurant/Accounting.tsx>); [src/utils/accounting.ts](<../../../../src/utils/accounting.ts>); [supabase/functions/accounting/index.ts](<../../../../supabase/functions/accounting/index.ts>); [supabase/functions/_shared/accounting-payload.ts](<../../../../supabase/functions/_shared/accounting-payload.ts>); [supabase/functions/_shared/tax-client.ts](<../../../../supabase/functions/_shared/tax-client.ts>); [supabase/functions/_shared/tax-signing.ts](<../../../../supabase/functions/_shared/tax-signing.ts>); [supabase/migrations/20260905000001_accounting_module.sql](<../../../../supabase/migrations/20260905000001_accounting_module.sql>); [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>) |
| FR-002 | La credencial se cifra AES-GCM con AAD restaurant_id; el cliente normal sólo lee columnas seguras por grants y RLS. | CONFIRMADO | [src/services/accountingService.ts](<../../../../src/services/accountingService.ts>); [src/pages/restaurant/Accounting.tsx](<../../../../src/pages/restaurant/Accounting.tsx>); [src/utils/accounting.ts](<../../../../src/utils/accounting.ts>); [supabase/functions/accounting/index.ts](<../../../../supabase/functions/accounting/index.ts>); [supabase/functions/_shared/accounting-payload.ts](<../../../../supabase/functions/_shared/accounting-payload.ts>); [supabase/functions/_shared/tax-client.ts](<../../../../supabase/functions/_shared/tax-client.ts>); [supabase/functions/_shared/tax-signing.ts](<../../../../supabase/functions/_shared/tax-signing.ts>); [supabase/migrations/20260905000001_accounting_module.sql](<../../../../supabase/migrations/20260905000001_accounting_module.sql>); [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>) |
| FR-003 | La emisión usa fila queued write-ahead y referencia externa única por restaurante; sync reconcilia timeout, hace catch-up/poll y lease 45s. | CONFIRMADO | [src/services/accountingService.ts](<../../../../src/services/accountingService.ts>); [src/pages/restaurant/Accounting.tsx](<../../../../src/pages/restaurant/Accounting.tsx>); [src/utils/accounting.ts](<../../../../src/utils/accounting.ts>); [supabase/functions/accounting/index.ts](<../../../../supabase/functions/accounting/index.ts>); [supabase/functions/_shared/accounting-payload.ts](<../../../../supabase/functions/_shared/accounting-payload.ts>); [supabase/functions/_shared/tax-client.ts](<../../../../supabase/functions/_shared/tax-client.ts>); [supabase/functions/_shared/tax-signing.ts](<../../../../supabase/functions/_shared/tax-signing.ts>); [supabase/migrations/20260905000001_accounting_module.sql](<../../../../supabase/migrations/20260905000001_accounting_module.sql>); [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>) |
| FR-004 | TaxApiClient firma bytes exactos con HMAC, conserva Idempotency-Key y renueva nonce al reintentar; timeout 30s y máximo 2 intentos. | CONFIRMADO | [src/services/accountingService.ts](<../../../../src/services/accountingService.ts>); [src/pages/restaurant/Accounting.tsx](<../../../../src/pages/restaurant/Accounting.tsx>); [src/utils/accounting.ts](<../../../../src/utils/accounting.ts>); [supabase/functions/accounting/index.ts](<../../../../supabase/functions/accounting/index.ts>); [supabase/functions/_shared/accounting-payload.ts](<../../../../supabase/functions/_shared/accounting-payload.ts>); [supabase/functions/_shared/tax-client.ts](<../../../../supabase/functions/_shared/tax-client.ts>); [supabase/functions/_shared/tax-signing.ts](<../../../../supabase/functions/_shared/tax-signing.ts>); [supabase/migrations/20260905000001_accounting_module.sql](<../../../../supabase/migrations/20260905000001_accounting_module.sql>); [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Cron */5 * * * *; catch-up/poll/reconcile máximo 20 cada uno, hasta 10 restaurantes por corrida cron y 3 intentos auto; no se afirma capacidad medida.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Owner por JWT/membresía y cron por X-Cron-Secret; secreto y ciphertext inaccesibles a app roles según hardening final.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Owner configura credencial/auto_emit y solicita documento desde pedido paid CL.
2. Edge valida, cifra credencial o inserta queued write-ahead y llama motor con HMAC/idempotencia.
3. Sync owner/cron reconcilia/pollear/catch-up; usuario consulta documentos y artifacts o solicita NC sobre accepted.

## Alternative Flows

Variación específica: Emisión externa exitosa seguida de timeout antes de request_id local. Sync busca por externalReference y, si no existe en motor, reemite con la misma key; resultado desplegado requiere validación.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Documento no finalizado.
- When: Se solicitan artifacts.
- Then: Handler devuelve 409 document_not_finalized.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Pedido unpaid. When: Owner intenta accounting/emit. Then: Devuelve 409 order_not_paid.
- Caso 3 — CONFIRMADO. Given: Factura sin receiver válido. When: Se emite dte_type=33. Then: Devuelve 400 por rut/name requerido o dígito verificador inválido.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Emisión externa exitosa seguida de timeout antes de request_id local.
- Comportamiento actual: Sync busca por externalReference y, si no existe en motor, reemite con la misma key; resultado desplegado requiere validación.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/accountingService.ts](<../../../../src/services/accountingService.ts>); [src/pages/restaurant/Accounting.tsx](<../../../../src/pages/restaurant/Accounting.tsx>); [src/utils/accounting.ts](<../../../../src/utils/accounting.ts>); [supabase/functions/accounting/index.ts](<../../../../supabase/functions/accounting/index.ts>); [supabase/functions/_shared/accounting-payload.ts](<../../../../supabase/functions/_shared/accounting-payload.ts>); [supabase/functions/_shared/tax-client.ts](<../../../../supabase/functions/_shared/tax-client.ts>); [supabase/functions/_shared/tax-signing.ts](<../../../../supabase/functions/_shared/tax-signing.ts>); [supabase/migrations/20260905000001_accounting_module.sql](<../../../../supabase/migrations/20260905000001_accounting_module.sql>); [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| accounting_config | DATA-001 |
| accounting_documents | DATA-003 |
| accounting_cron_secret | DATA-002 |
| orders | DATA-026 |
| restaurants | DATA-038 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-003, API-004, API-005, API-006, API-007, API-008, API-009, API-036. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-003](../../API_SPEC.md#api-003), [API-004](../../API_SPEC.md#api-004), [API-005](../../API_SPEC.md#api-005), [API-006](../../API_SPEC.md#api-006), [API-007](../../API_SPEC.md#api-007), [API-008](../../API_SPEC.md#api-008), [API-009](../../API_SPEC.md#api-009), [API-036](../../API_SPEC.md#api-036)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Owner por JWT/membresía y cron por X-Cron-Secret; secreto y ciphertext inaccesibles a app roles según hardening final.

Reglas de negocio relacionadas: [BR-022](../../BUSINESS_RULES.md#br-022). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Documentos e IDs/estado local, emisión externa/NC y URLs temporales de artifacts; no se accede directamente al SII desde este repo.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Handler devuelve 409 document_not_finalized. Fallos parciales/concurrencia: Cron */5 * * * *; catch-up/poll/reconcile máximo 20 cada uno, hasta 10 restaurantes por corrida cron y 3 intentos auto; no se afirma capacidad medida. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U24-accounting.test.ts](<../../../../src/tests/unit/U24-accounting.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/accountingService.ts](<../../../../src/services/accountingService.ts>)
- [src/pages/restaurant/Accounting.tsx](<../../../../src/pages/restaurant/Accounting.tsx>)
- [src/utils/accounting.ts](<../../../../src/utils/accounting.ts>)
- [supabase/functions/accounting/index.ts](<../../../../supabase/functions/accounting/index.ts>)
- [supabase/functions/_shared/accounting-payload.ts](<../../../../supabase/functions/_shared/accounting-payload.ts>)
- [supabase/functions/_shared/tax-client.ts](<../../../../supabase/functions/_shared/tax-client.ts>)
- [supabase/functions/_shared/tax-signing.ts](<../../../../supabase/functions/_shared/tax-signing.ts>)
- [supabase/migrations/20260905000001_accounting_module.sql](<../../../../supabase/migrations/20260905000001_accounting_module.sql>)
- [supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Sync owner/cron reconcilia/pollear/catch-up; usuario consulta documentos y artifacts o solicita NC sobre accepted.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-038](../../BUSINESS_RULES.md#br-038) → FEAT-022/FR-002.

Regla adicional: [BR-039](../../BUSINESS_RULES.md#br-039) → FEAT-022/FR-001.

Regla adicional: [BR-044](../../BUSINESS_RULES.md#br-044) → FEAT-022/FR-003.


## Cambio autorizado — 2026-10-06

- [TASK-014 — Operación, archivos y configuración](../../changes/TASK-014.md): FEAT-022/FR-320, FEAT-022/FR-321, FEAT-022/FR-322. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
