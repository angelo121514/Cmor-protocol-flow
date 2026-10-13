> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-013 — División de cuentas y pagos parciales

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-013.
- Objetivo: División de cuentas y pagos parciales dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-013/FR-001, FEAT-013/NFR-001, FEAT-013/SEC-F001 y FEAT-013/EDGE-001.

## Actores

Cajero/owner; pagadores como etiquetas.

## Preconditions

Pedido accesible y partes/montos elegidos.

Punto de entrada y trigger: SplitBillModal en POS; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | splitEqually divide con Math.floor y devuelve resto separado; people<=0 devuelve partes vacías y remainder=total. | CONFIRMADO | [src/services/splitBillService.ts](<../../../../src/services/splitBillService.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>); [supabase/migrations/20260710000004_split_bills.sql](<../../../../supabase/migrations/20260710000004_split_bills.sql>) |
| FR-002 | validateSplitTotals acepta diferencia absoluta menor o igual a 1 unidad monetaria. | CONFIRMADO | [src/services/splitBillService.ts](<../../../../src/services/splitBillService.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>); [supabase/migrations/20260710000004_split_bills.sql](<../../../../supabase/migrations/20260710000004_split_bills.sql>) |
| FR-003 | El servicio persiste pagos parciales, marca is_split/split_count y consulta can_close_split_order por suma de pagos paid>=total. | CONFIRMADO | [src/services/splitBillService.ts](<../../../../src/services/splitBillService.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>); [supabase/migrations/20260710000004_split_bills.sql](<../../../../supabase/migrations/20260710000004_split_bills.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Marcación de pedido y escrituras de pagos son operaciones separadas; atomicidad de toda la división no demostrada.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RLS de order_payments y comprobación SQL de cierre; relaciones entre order_id y restaurant_id requieren revisión.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Cajero abre SplitBillModal para pedido existente o solicita creación previa.
2. Se calculan partes/resto, validan totales y se escriben pagos y flags en llamadas separadas.
3. can_close_split_order determina si pagos paid cubren total; errores y forma order_id/id afectan cadena POS.

## Alternative Flows

Variación específica: División de moneda con centavos. Math.floor y tolerancia 1 no se ajustan a decimales; el comportamiento puede diferir de repartir centavos (RISK-008).

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Partes con diferencia mayor a 1.
- When: Se valida total dividido.
- Then: El helper retorna valid=false; esto por sí solo no valida writes directos DB.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: people=0. When: Se llama splitEqually. Then: Devuelve parts=[] y remainder=total.
- Caso 3 — CONFIRMADO. Given: Pagos paid no alcanzan total. When: Se consulta can_close_split_order. Then: La condición SQL compara suma paid>=total y retorna falso si insuficiente.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: División de moneda con centavos.
- Comportamiento actual: Math.floor y tolerancia 1 no se ajustan a decimales; el comportamiento puede diferir de repartir centavos (RISK-008).
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/splitBillService.ts](<../../../../src/services/splitBillService.ts>); [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>); [supabase/migrations/20260710000004_split_bills.sql](<../../../../supabase/migrations/20260710000004_split_bills.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| order_payments | DATA-025 |
| orders | DATA-026 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-047, API-197, API-198, API-199, API-200. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-047](../../API_SPEC.md#api-047), [API-197](../../API_SPEC.md#api-197), [API-198](../../API_SPEC.md#api-198), [API-199](../../API_SPEC.md#api-199), [API-200](../../API_SPEC.md#api-200)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RLS de order_payments y comprobación SQL de cierre; relaciones entre order_id y restaurant_id requieren revisión.

Reglas de negocio relacionadas: [BR-013](../../BUSINESS_RULES.md#br-013). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Inserta/actualiza/borrra order_payments y actualiza flags de orders.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El helper retorna valid=false; esto por sí solo no valida writes directos DB. Fallos parciales/concurrencia: Marcación de pedido y escrituras de pagos son operaciones separadas; atomicidad de toda la división no demostrada. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U16-splitBill.test.ts](<../../../../src/tests/unit/U16-splitBill.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/splitBillService.ts](<../../../../src/services/splitBillService.ts>)
- [src/components/SplitBillModal.tsx](<../../../../src/components/SplitBillModal.tsx>)
- [supabase/migrations/20260710000004_split_bills.sql](<../../../../supabase/migrations/20260710000004_split_bills.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

can_close_split_order determina si pagos paid cubren total; errores y forma order_id/id afectan cadena POS.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-011 — Dinero y precios](../../changes/TASK-011.md): FEAT-021/FR-290, FEAT-021/FR-291, FEAT-021/FR-292. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
