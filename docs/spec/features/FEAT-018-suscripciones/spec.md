> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-018 — Planes, trial, tarjeta y suscripción recurrente

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-018.
- Objetivo: Planes, trial, tarjeta y suscripción recurrente dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-018/FR-001, FEAT-018/NFR-001, FEAT-018/SEC-F001 y FEAT-018/EDGE-001.

## Actores

Owner, admin para sincronizar planes; Flow.

## Preconditions

Owner con acceso al restaurante; Flow configurado y plan permitido.

Punto de entrada y trigger: /restaurant/subscription, /restaurant/settings; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | Catálogo comercial expone free_trial, starter, pro y lifetime; lifetime es pago único y no recurrente. | CONFIRMADO | [src/hooks/useFlowSubscription.ts](<../../../../src/hooks/useFlowSubscription.ts>); [src/services/flowService.ts](<../../../../src/services/flowService.ts>); [src/pages/restaurant/Subscription.tsx](<../../../../src/pages/restaurant/Subscription.tsx>); [src/config/config.ts](<../../../../src/config/config.ts>); [supabase/functions/flow-customer/index.ts](<../../../../supabase/functions/flow-customer/index.ts>); [supabase/functions/flow-subscription/index.ts](<../../../../supabase/functions/flow-subscription/index.ts>) |
| FR-002 | flow-customer permite crear cliente, registrar tarjeta, consultar registro por token y desvincular tarjeta con ownership. | CONFIRMADO | [src/hooks/useFlowSubscription.ts](<../../../../src/hooks/useFlowSubscription.ts>); [src/services/flowService.ts](<../../../../src/services/flowService.ts>); [src/pages/restaurant/Subscription.tsx](<../../../../src/pages/restaurant/Subscription.tsx>); [src/config/config.ts](<../../../../src/config/config.ts>); [supabase/functions/flow-customer/index.ts](<../../../../supabase/functions/flow-customer/index.ts>); [supabase/functions/flow-subscription/index.ts](<../../../../supabase/functions/flow-subscription/index.ts>) |
| FR-003 | flow-subscription crea/cancela/consulta recurrentes; sync-plans requiere admin; free_trial declarado es 14 días. | CONFIRMADO | [src/hooks/useFlowSubscription.ts](<../../../../src/hooks/useFlowSubscription.ts>); [src/services/flowService.ts](<../../../../src/services/flowService.ts>); [src/pages/restaurant/Subscription.tsx](<../../../../src/pages/restaurant/Subscription.tsx>); [src/config/config.ts](<../../../../src/config/config.ts>); [supabase/functions/flow-customer/index.ts](<../../../../supabase/functions/flow-customer/index.ts>); [supabase/functions/flow-subscription/index.ts](<../../../../supabase/functions/flow-subscription/index.ts>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): El cutoff de trial está también en trigger de pedidos; fechas promocionales de texto no prueban ventanas temporales de oferta.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Planes no escribibles directamente por authenticated según hardening; eficacia de RPC privilegiadas requiere validar is_admin.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Owner consulta plan/suscripción y, cuando corresponde, vincula tarjeta con Flow.
2. Crear/cancelar recurrente llama funciones con ownership y catálogo permitido.
3. Los registros locales y webhooks reflejan suscripción/pagos; lifetime permanece pago único, no recurrente.

## Alternative Flows

Variación específica: Oferta, moneda y precio por país frente a plan Flow. Precios regionales y catálogo Flow/Webpay no constituyen una única fuente; conciliación requiere validación de configuración externa.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Plan recurrente inválido.
- When: Se solicita create en flow-subscription.
- Then: Handler devuelve 400 antes de crear suscripción.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Owner de otro restaurante. When: Llama create/cancel/status. Then: requireRestaurantOwner valida perfil/membresía; handler rechaza 403 si falla.
- Caso 3 — CONFIRMADO. Given: No hay suscripción para status. When: Se consulta flow-subscription/status. Then: Puede retornar success=true,subscription=null con HTTP 200.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Oferta, moneda y precio por país frente a plan Flow.
- Comportamiento actual: Precios regionales y catálogo Flow/Webpay no constituyen una única fuente; conciliación requiere validación de configuración externa.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/hooks/useFlowSubscription.ts](<../../../../src/hooks/useFlowSubscription.ts>); [src/services/flowService.ts](<../../../../src/services/flowService.ts>); [src/pages/restaurant/Subscription.tsx](<../../../../src/pages/restaurant/Subscription.tsx>); [src/config/config.ts](<../../../../src/config/config.ts>); [supabase/functions/flow-customer/index.ts](<../../../../supabase/functions/flow-customer/index.ts>); [supabase/functions/flow-subscription/index.ts](<../../../../supabase/functions/flow-subscription/index.ts>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| restaurants | DATA-038 |
| flow_plans | DATA-016 |
| flow_customers | DATA-013 |
| flow_subscriptions | DATA-017 |
| flow_payments | DATA-015 |
| flow_invoices | DATA-014 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-013, API-014, API-015, API-016, API-017, API-018, API-019, API-020, API-107, API-133, API-134. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-013](../../API_SPEC.md#api-013), [API-014](../../API_SPEC.md#api-014), [API-015](../../API_SPEC.md#api-015), [API-016](../../API_SPEC.md#api-016), [API-017](../../API_SPEC.md#api-017), [API-018](../../API_SPEC.md#api-018), [API-019](../../API_SPEC.md#api-019), [API-020](../../API_SPEC.md#api-020), [API-107](../../API_SPEC.md#api-107), [API-133](../../API_SPEC.md#api-133), [API-134](../../API_SPEC.md#api-134)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Planes no escribibles directamente por authenticated según hardening; eficacia de RPC privilegiadas requiere validar is_admin.

Reglas de negocio relacionadas: [BR-018](../../BUSINESS_RULES.md#br-018). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Registra cliente/tarjeta/suscripción en Flow y refleja estados en tablas locales; webhooks actualizan pagos.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Handler devuelve 400 antes de crear suscripción. Fallos parciales/concurrencia: El cutoff de trial está también en trigger de pedidos; fechas promocionales de texto no prueban ventanas temporales de oferta. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U13-planCatalog.test.ts](<../../../../src/tests/unit/U13-planCatalog.test.ts>)
- [src/tests/unit/U21-tax-and-trial-helpers.test.ts](<../../../../src/tests/unit/U21-tax-and-trial-helpers.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/hooks/useFlowSubscription.ts](<../../../../src/hooks/useFlowSubscription.ts>)
- [src/services/flowService.ts](<../../../../src/services/flowService.ts>)
- [src/pages/restaurant/Subscription.tsx](<../../../../src/pages/restaurant/Subscription.tsx>)
- [src/config/config.ts](<../../../../src/config/config.ts>)
- [supabase/functions/flow-customer/index.ts](<../../../../supabase/functions/flow-customer/index.ts>)
- [supabase/functions/flow-subscription/index.ts](<../../../../supabase/functions/flow-subscription/index.ts>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Los registros locales y webhooks reflejan suscripción/pagos; lifetime permanece pago único, no recurrente.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-029](../../BUSINESS_RULES.md#br-029) → FEAT-018/FR-001.


## Cambio autorizado — 2026-10-06

- [TASK-009 — Pagos y webhooks](../../changes/TASK-009.md): FEAT-015/FR-270, FEAT-015/FR-271, FEAT-015/FR-272. Validación local PASS; despliegue UNKNOWN.
- [TASK-011 — Dinero y precios](../../changes/TASK-011.md): FEAT-021/FR-290, FEAT-021/FR-291, FEAT-021/FR-292. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.


TASK-016: [configuración por cliente y pruebas de cierre](../../changes/TASK-016.md). FEAT-018/FR-343; validación del delta en curso.
