> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-010 — Inventario y recetas

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-010/FR-280** — save_recipe reemplaza receta/ingredientes en una transacción con ownership.
- **FEAT-010/FR-281** — Consumos se agregan por ingrediente y bloquean stock en orden estable; marca por pedido evita repetir.
- **FEAT-010/FR-282** — Stock 2 y consumo 5 genera saldo 0, movimiento -2 y faltante 3; venta continúa.

## Evidencia y trazabilidad

Features: FEAT-010. Hallazgos: RISK-007, DEBT-005, DEBT-006. Constitución: SEC-003, SEC-004, SEC-010, SEC-014, SEC-015.

Código: [inventoryService.ts](<../../../src/services/inventoryService.ts>).

Migraciones nuevas: [20261006000003_atomic_inventory.sql](<../../../supabase/migrations/20261006000003_atomic_inventory.sql>); [20261006000012_explicit_rpc_surface.sql](<../../../supabase/migrations/20261006000012_explicit_rpc_surface.sql>); [20261006000021_remaining_trust_boundaries.sql](<../../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>).

## Contrato, implementación y compatibilidad

save_recipe reemplaza receta/ingredientes en una transacción con ownership. Consumos se agregan por ingrediente y bloquean stock en orden estable; marca por pedido evita repetir. Stock 2 y consumo 5 genera saldo 0, movimiento -2 y faltante 3; venta continúa. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[inventory_transactions.test.sql](<../../../supabase/tests/database/inventory_transactions.test.sql>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Ledger histórico conservado y backfill probado. Stock/referencias desplegados ambiguos requieren reconciliación identificada.

## Revisión incremental local

createMenuItem devuelve el ID persistido; el modal conserva ese ID si falla save_recipe y reintenta sobre el mismo plato. No informa receta guardada ni cierra al fallar; error de lectura no autoriza borrar una receta existente. [Pruebas del servicio](<../../../src/tests/local/menu-and-crm-contracts.test.ts>) aprobadas. Plato y receta siguen siendo dos operaciones; reemplazo de receta/ingredientes sí es transaccional en SQL.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Ledger histórico conservado y backfill probado. Stock/referencias desplegados ambiguos requieren reconciliación identificada.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Ledger histórico conservado y backfill probado. Stock/referencias desplegados ambiguos requieren reconciliación identificada.
