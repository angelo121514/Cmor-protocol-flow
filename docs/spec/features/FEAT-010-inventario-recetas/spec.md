> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-010 — Inventario, recetas y movimientos

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-010.
- Objetivo: Inventario, recetas y movimientos dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-010/FR-001, FEAT-010/NFR-001, FEAT-010/SEC-F001 y FEAT-010/EDGE-001.

## Actores

Owner; pedidos completados como trigger secundario.

## Preconditions

Insumo/receta del restaurante; delta y tipo de movimiento para ajustes.

Punto de entrada y trigger: /restaurant/inventory, editor de recetas en /restaurant/menu; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | adjust_inventory_stock modifica stock e inserta movimiento en una RPC, valida ownership y rechaza stock negativo. | CONFIRMADO | [src/services/inventoryService.ts](<../../../../src/services/inventoryService.ts>); [src/pages/restaurant/Inventory.tsx](<../../../../src/pages/restaurant/Inventory.tsx>); [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>); [supabase/migrations/20260710000001_inventory.sql](<../../../../supabase/migrations/20260710000001_inventory.sql>) |
| FR-002 | saveRecipe hace upsert de receta, DELETE de ingredientes y luego INSERT; esas llamadas no forman una transacción única. | CONFIRMADO | [src/services/inventoryService.ts](<../../../../src/services/inventoryService.ts>); [src/pages/restaurant/Inventory.tsx](<../../../../src/pages/restaurant/Inventory.tsx>); [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>); [supabase/migrations/20260710000001_inventory.sql](<../../../../supabase/migrations/20260710000001_inventory.sql>) |
| FR-003 | La deducción al completar un pedido omite productos sin receta y utiliza GREATEST(0,current_stock-v_needed); detecta deducción previa por reference_id. | CONFIRMADO | [src/services/inventoryService.ts](<../../../../src/services/inventoryService.ts>); [src/pages/restaurant/Inventory.tsx](<../../../../src/pages/restaurant/Inventory.tsx>); [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>); [supabase/migrations/20260710000001_inventory.sql](<../../../../supabase/migrations/20260710000001_inventory.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Ajuste SQL atómico confirmado por implementación; pruebas concurrentes reales MISSING. Deducción previa mediante EXISTS no prueba exclusión mutua.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RPC y policies comprueban is_my_restaurant; consistencia de restaurant_id en relaciones requiere revisar constraints y RISK-002.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. El owner gestiona insumos o vincula receta al plato.
2. Ajuste de stock invoca RPC atómica; guardar receta hace llamadas separadas de upsert/borrado/inserción.
3. Un pedido completado dispara deducción por receta y registro de movimientos, con clamp y lagunas documentadas.

## Alternative Flows

Variación específica: Consumo de receta mayor que stock. Stock queda en 0; el cálculo RETURNING current_stock+v_needed infiere stock anterior y puede registrar más descuento que el real (RISK-007).

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Delta deja stock menor que cero.
- When: Se ajusta inventario vía RPC.
- Then: Se lanza insufficient_stock/22023 y se revierte la transacción RPC.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: DELETE ingredientes exitoso e INSERT falla. When: Se guarda receta. Then: Retorna error y receta puede quedar sin ingredientes; no hay transacción única cliente.
- Caso 3 — CONFIRMADO. Given: Tipo de movimiento fuera del enum. When: Se llama adjust_inventory_stock. Then: Lanza invalid_movement_type/22023.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Consumo de receta mayor que stock.
- Comportamiento actual: Stock queda en 0; el cálculo RETURNING current_stock+v_needed infiere stock anterior y puede registrar más descuento que el real (RISK-007).
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/inventoryService.ts](<../../../../src/services/inventoryService.ts>); [src/pages/restaurant/Inventory.tsx](<../../../../src/pages/restaurant/Inventory.tsx>); [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>); [supabase/migrations/20260710000001_inventory.sql](<../../../../supabase/migrations/20260710000001_inventory.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| inventory_items | DATA-019 |
| recipes | DATA-034 |
| recipe_ingredients | DATA-033 |
| inventory_movements | DATA-020 |
| orders | DATA-026 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-034, API-037, API-058, API-085, API-120, API-127, API-148, API-151, API-152, API-153, API-154, API-155, API-156, API-157, API-158, API-159, API-160, API-161. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-034](../../API_SPEC.md#api-034), [API-037](../../API_SPEC.md#api-037), [API-058](../../API_SPEC.md#api-058), [API-085](../../API_SPEC.md#api-085), [API-120](../../API_SPEC.md#api-120), [API-127](../../API_SPEC.md#api-127), [API-148](../../API_SPEC.md#api-148), [API-151](../../API_SPEC.md#api-151), [API-152](../../API_SPEC.md#api-152), [API-153](../../API_SPEC.md#api-153), [API-154](../../API_SPEC.md#api-154), [API-155](../../API_SPEC.md#api-155), [API-156](../../API_SPEC.md#api-156), [API-157](../../API_SPEC.md#api-157), [API-158](../../API_SPEC.md#api-158), [API-159](../../API_SPEC.md#api-159), [API-160](../../API_SPEC.md#api-160), [API-161](../../API_SPEC.md#api-161)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RPC y policies comprueban is_my_restaurant; consistencia de restaurant_id en relaciones requiere revisar constraints y RISK-002.

Reglas de negocio relacionadas: [BR-010](../../BUSINESS_RULES.md#br-010). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Actualiza stock e historial; borrado de ingredientes por cascade; descuento desde trigger de pedidos.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: Se lanza insufficient_stock/22023 y se revierte la transacción RPC. Fallos parciales/concurrencia: Ajuste SQL atómico confirmado por implementación; pruebas concurrentes reales MISSING. Deducción previa mediante EXISTS no prueba exclusión mutua. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U13-inventoryService.test.ts](<../../../../src/tests/unit/U13-inventoryService.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/inventoryService.ts](<../../../../src/services/inventoryService.ts>)
- [src/pages/restaurant/Inventory.tsx](<../../../../src/pages/restaurant/Inventory.tsx>)
- [supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>)
- [supabase/migrations/20260710000001_inventory.sql](<../../../../supabase/migrations/20260710000001_inventory.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Un pedido completado dispara deducción por receta y registro de movimientos, con clamp y lagunas documentadas.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-031](../../BUSINESS_RULES.md#br-031) → FEAT-010/FR-001.

Regla adicional: [BR-033](../../BUSINESS_RULES.md#br-033) → FEAT-010/FR-003.

Regla adicional: [BR-046](../../BUSINESS_RULES.md#br-046) → FEAT-010/FR-002.


## Cambio autorizado — 2026-10-06

- [TASK-010 — Inventario y recetas](../../changes/TASK-010.md): FEAT-010/FR-280, FEAT-010/FR-281, FEAT-010/FR-282. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
