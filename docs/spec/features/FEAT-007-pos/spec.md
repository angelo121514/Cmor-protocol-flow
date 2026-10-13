> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-007 — POS, cobro manual y envío a cocina

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-007.
- Objetivo: POS, cobro manual y envío a cocina dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-007/FR-001, FEAT-007/NFR-001, FEAT-007/SEC-F001 y FEAT-007/EDGE-001.

## Actores

Cajero/owner, mesero identificado por PIN; cocina.

## Preconditions

Restaurante activo, carrito no vacío; número de mesa obligatorio para order_type=table.

Punto de entrada y trigger: /restaurant/pos y alias /restaurant/cash; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | El POS bloquea doble envío local mientras orderSubmitting está activo y muestra éxito optimista con snapshots para revertir ante fallo. | CONFIRMADO | [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>) |
| FR-002 | El carrito se conserva en sessionStorage con expiración de 12 horas; la clave pos_cart_draft no incluye restaurante. | CONFIRMADO | [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>) |
| FR-003 | El POS solicita crear/actualizar pedidos y cobro, pero la rama RPC crea pending/pending y devuelve order_id; POS espera savedOrder.id. RISK-010 requiere validar contrato antes de afirmar cobro efectivo. El trigger rechaza completed sin paid. | CONFIRMADO | [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): La prevención doble submit es local al componente; no demuestra idempotencia de pedidos entre pestañas o reintentos.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Cobros y cambios usan permisos DB del usuario; PIN mesero aporta atribución, no reemplaza Auth del dueño.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El cajero arma carrito, define mesa/cliente/método y solicita envío o cobro.
2. POS aplica guard local y actualiza UI optimista; crea/actualiza mediante servicio.
3. Fallo restaura snapshots; éxito intenta usar savedOrder.id, ticket/propina y sync contable. La rama RPC retorna shape/estados divergentes, no se asume cobro correcto.

## Alternative Flows

Variación específica: Cambio de sucursal con borrador POS. La clave única no está asociada a restaurant_id; preservación/cruce de carrito REQUIERE VALIDACIÓN y revalidación server-side de productos.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Carrito vacío o mesa sin número.
- When: Se envía el pedido.
- Then: La UI muestra error y no envía hasta completar la condición.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Guard orderSubmitting activo. When: Se pulsa envío otra vez. Then: Handler retorna sin nuevo envío desde ese componente.
- Caso 3 — CONFIRMADO. Given: Servicio RPC responde order_id sin id. When: POS intenta propina/ticket/currentOrderId. Then: Ramas savedOrder.id pueden no registrar vínculos; no hay shape normalizado en wrapper observado.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Cambio de sucursal con borrador POS.
- Comportamiento actual: La clave única no está asociada a restaurant_id; preservación/cruce de carrito REQUIERE VALIDACIÓN y revalidación server-side de productos.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>); [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| orders | DATA-026 |
| restaurant_customers | DATA-036 |
| tips | DATA-040 |
| order_payments | DATA-025 |
| cash_shifts | DATA-008 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API: N/A para lógica puramente cliente; revisar operaciones compartidas por tabla. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

API: N/A o compartida; consumidores/fuentes listados en Evidence.

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Cobros y cambios usan permisos DB del usuario; PIN mesero aporta atribución, no reemplaza Auth del dueño.

Reglas de negocio relacionadas: [BR-007](../../BUSINESS_RULES.md#br-007). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Pedidos, CRM, propinas y pagos divididos en varias llamadas; posible fallo parcial después del éxito optimista.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: La UI muestra error y no envía hasta completar la condición. Fallos parciales/concurrencia: La prevención doble submit es local al componente; no demuestra idempotencia de pedidos entre pestañas o reintentos. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/e2e/E08-pos-realtime-verification.spec.ts](<../../../../src/tests/e2e/E08-pos-realtime-verification.spec.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>)
- [src/services/restaurantService.ts](<../../../../src/services/restaurantService.ts>)
- [src/hooks/useWaiterSession.ts](<../../../../src/hooks/useWaiterSession.ts>)
- [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Fallo restaura snapshots; éxito intenta usar savedOrder.id, ticket/propina y sync contable. La rama RPC retorna shape/estados divergentes, no se asume cobro correcto.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-035](../../BUSINESS_RULES.md#br-035) → FEAT-007/FR-002.

Regla adicional: [BR-043](../../BUSINESS_RULES.md#br-043) → FEAT-007/FR-003.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-007 — Sucursales](../../changes/TASK-007.md): FEAT-004/FR-250, FEAT-004/FR-251, FEAT-004/FR-252. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
