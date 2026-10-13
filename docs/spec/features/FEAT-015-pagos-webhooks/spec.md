> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-015 — Checkout, pago de mesa y conciliación de webhooks

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-015.
- Objetivo: Checkout, pago de mesa y conciliación de webhooks dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-015/FR-001, FEAT-015/NFR-001, FEAT-015/SEC-F001 y FEAT-015/EDGE-001.

## Actores

Cliente/prospecto; Flow, Mercado Pago y Transbank.

## Preconditions

Intención/solicitud o sesión válida; proveedor configurado.

Punto de entrada y trigger: Registro y /mesa/:qrToken/pagar; /payment/error; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | order-pay recalcula suma de pedidos no cancelled/rejected y limita propina a 100%; CL usa Flow, BR/PE Mercado Pago, BO rechaza pago online. | CONFIRMADO | [supabase/functions/order-pay/index.ts](<../../../../supabase/functions/order-pay/index.ts>); [supabase/functions/flow-checkout/index.ts](<../../../../supabase/functions/flow-checkout/index.ts>); [supabase/functions/mp-checkout/index.ts](<../../../../supabase/functions/mp-checkout/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/create-payment-intent/index.ts](<../../../../supabase/functions/create-payment-intent/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../../../supabase/functions/webhooks/webpay/index.ts>) |
| FR-002 | Flow consulta estado real y reclama webhook atómicamente; processed retorna 200 y busy retorna 503. | CONFIRMADO | [supabase/functions/order-pay/index.ts](<../../../../supabase/functions/order-pay/index.ts>); [supabase/functions/flow-checkout/index.ts](<../../../../supabase/functions/flow-checkout/index.ts>); [supabase/functions/mp-checkout/index.ts](<../../../../supabase/functions/mp-checkout/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/create-payment-intent/index.ts](<../../../../supabase/functions/create-payment-intent/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../../../supabase/functions/webhooks/webpay/index.ts>) |
| FR-003 | Mercado Pago valida firma si existe secreto y siempre consulta pago real; concilia importe y referencia contra intención local. | CONFIRMADO | [supabase/functions/order-pay/index.ts](<../../../../supabase/functions/order-pay/index.ts>); [supabase/functions/flow-checkout/index.ts](<../../../../supabase/functions/flow-checkout/index.ts>); [supabase/functions/mp-checkout/index.ts](<../../../../supabase/functions/mp-checkout/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/create-payment-intent/index.ts](<../../../../supabase/functions/create-payment-intent/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../../../supabase/functions/webhooks/webpay/index.ts>) |
| FR-004 | La finalización de sesión evita repetir cierre si status=closed; retorno del navegador Flow no activa una cuenta por sí mismo. | CONFIRMADO | [supabase/functions/order-pay/index.ts](<../../../../supabase/functions/order-pay/index.ts>); [supabase/functions/flow-checkout/index.ts](<../../../../supabase/functions/flow-checkout/index.ts>); [supabase/functions/mp-checkout/index.ts](<../../../../supabase/functions/mp-checkout/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/create-payment-intent/index.ts](<../../../../supabase/functions/create-payment-intent/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../../../supabase/functions/webhooks/webpay/index.ts>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Clientes Flow/MP no declaran timeout ni retry general; webhook Flow tiene lease/reclamación de 5 minutos. Validación externa no equivale a SLA.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Confirmación server-side con service role; firma MP opcional y writes no comprobados en order-pay dejan controles parciales.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Registro o cuenta válida solicita checkout/order-pay con referencia/capability.
2. El handler calcula importe y crea pago externo, luego intenta persistir intención/estado local.
3. El webhook consulta proveedor/conciliación y finaliza cuenta o activa plan; retorno navegador muestra resultado/pending y no demuestra confirmación.

## Alternative Flows

Variación específica: Repetir order-pay con sesión payment_pending. El handler la acepta; no hay claim local previo a crear Flow. En MP idempotency key depende de ORDP-session.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Session token desconocido.
- When: Se inicia pago de mesa.
- Then: order-pay devuelve 404 invalid_session.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Cuenta suma cero. When: Se llama order-pay. Then: Devuelve 400 empty_bill; no crea pago.
- Caso 3 — CONFIRMADO de código; resultado real REQUIERE VALIDACIÓN. Given: Proveedor registra cobro pero UPDATE local falla. When: Continúa order-pay. Then: Algunos writes no comprueban error; puede devolver éxito sin estado coherente.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Repetir order-pay con sesión payment_pending.
- Comportamiento actual: El handler la acepta; no hay claim local previo a crear Flow. En MP idempotency key depende de ORDP-session.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [supabase/functions/order-pay/index.ts](<../../../../supabase/functions/order-pay/index.ts>); [supabase/functions/flow-checkout/index.ts](<../../../../supabase/functions/flow-checkout/index.ts>); [supabase/functions/mp-checkout/index.ts](<../../../../supabase/functions/mp-checkout/index.ts>); [supabase/functions/mp-webhook/index.ts](<../../../../supabase/functions/mp-webhook/index.ts>); [supabase/functions/create-payment-intent/index.ts](<../../../../supabase/functions/create-payment-intent/index.ts>); [supabase/functions/webhooks/flow/index.ts](<../../../../supabase/functions/webhooks/flow/index.ts>); [supabase/functions/webhooks/webpay/index.ts](<../../../../supabase/functions/webhooks/webpay/index.ts>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| payment_intents | DATA-029 |
| flow_payments | DATA-015 |
| flow_webhook_events | DATA-018 |
| table_sessions | DATA-039 |
| orders | DATA-026 |
| tips | DATA-040 |
| registration_requests | DATA-035 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-010, API-011, API-012, API-023, API-024, API-032, API-033. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-010](../../API_SPEC.md#api-010), [API-011](../../API_SPEC.md#api-011), [API-012](../../API_SPEC.md#api-012), [API-023](../../API_SPEC.md#api-023), [API-024](../../API_SPEC.md#api-024), [API-032](../../API_SPEC.md#api-032), [API-033](../../API_SPEC.md#api-033)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Confirmación server-side con service role; firma MP opcional y writes no comprobados en order-pay dejan controles parciales.

Reglas de negocio relacionadas: [BR-015](../../BUSINESS_RULES.md#br-015). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Llamadas de cobro, intenciones, activación de restaurante, marca payment_pending y cierre/pago/propina de sesiones.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: order-pay devuelve 404 invalid_session. Fallos parciales/concurrencia: Clientes Flow/MP no declaran timeout ni retry general; webhook Flow tiene lease/reclamación de 5 minutos. Validación externa no equivale a SLA. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/integration/flow-integration.test.ts](<../../../../src/tests/integration/flow-integration.test.ts>)
- [src/tests/e2e/E06-webpay-payment.spec.ts](<../../../../src/tests/e2e/E06-webpay-payment.spec.ts>)
- [src/tests/e2e/E07-flow-payment.spec.ts](<../../../../src/tests/e2e/E07-flow-payment.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [supabase/functions/order-pay/index.ts](<../../../../supabase/functions/order-pay/index.ts>)
- [supabase/functions/flow-checkout/index.ts](<../../../../supabase/functions/flow-checkout/index.ts>)
- [supabase/functions/mp-checkout/index.ts](<../../../../supabase/functions/mp-checkout/index.ts>)
- [supabase/functions/mp-webhook/index.ts](<../../../../supabase/functions/mp-webhook/index.ts>)
- [supabase/functions/create-payment-intent/index.ts](<../../../../supabase/functions/create-payment-intent/index.ts>)
- [supabase/functions/webhooks/flow/index.ts](<../../../../supabase/functions/webhooks/flow/index.ts>)
- [supabase/functions/webhooks/webpay/index.ts](<../../../../supabase/functions/webhooks/webpay/index.ts>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

El webhook consulta proveedor/conciliación y finaliza cuenta o activa plan; retorno navegador muestra resultado/pending y no demuestra confirmación.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-008 — Mesas QR](../../changes/TASK-008.md): FEAT-014/FR-260, FEAT-014/FR-261, FEAT-014/FR-262. Validación local PASS; despliegue UNKNOWN.
- [TASK-009 — Pagos y webhooks](../../changes/TASK-009.md): FEAT-015/FR-270, FEAT-015/FR-271, FEAT-015/FR-272. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.

FEAT-015/FR-273: cancelación repetida; API-239 / BR-060 / SQL30 / I17.
