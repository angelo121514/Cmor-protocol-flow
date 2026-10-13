> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-006 — POS y pedidos

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-007/FR-240** — create_order público recalcula precios y sólo inicia qr/pending; se elimina INSERT público de respaldo.
- **FEAT-007/FR-241** — write_pos_order consolida pedido, CRM, pago, propina y división en transacción idempotente.
- **FEAT-007/FR-242** — Cobrar deja accepted/paid; completed implica paid; persistencia exitosa precede recibo y confirmación.

- **FEAT-017/FR-243** — Caja única por restaurante; agregación SQL sin truncamiento, bloqueo al cerrar y separación de ventas/propinas por medio sin multiplicar joins.
- **FEAT-013/FR-244** — Partes POS incluyen propina; asignación exacta por restos mayores y compatibilidad explícita de importes históricos.

## Evidencia y trazabilidad

Features: FEAT-006, FEAT-007, FEAT-008, FEAT-012, FEAT-013, FEAT-016, FEAT-017. Hallazgos: RISK-010, DEBT-003. Constitución: SEC-003, SEC-004, SEC-006, SEC-009, SEC-010, SEC-015.

Código: [Pos.tsx](<../../../src/pages/restaurant/Pos.tsx>); [restaurantService.ts](<../../../src/services/restaurantService.ts>); [idempotent-operation.ts](<../../../src/services/idempotent-operation.ts>); [splitBillService.ts](<../../../src/services/splitBillService.ts>).

Migraciones nuevas: [20261006000013_tenant_invariants.sql](<../../../supabase/migrations/20261006000013_tenant_invariants.sql>); [20261006000023_cash_and_split_accounting.sql](<../../../supabase/migrations/20261006000023_cash_and_split_accounting.sql>); [20261006000005_shared_order_pricing.sql](<../../../supabase/migrations/20261006000005_shared_order_pricing.sql>); [20261006000006_pos_contracts.sql](<../../../supabase/migrations/20261006000006_pos_contracts.sql>); [20261006000019_public_order_idempotency.sql](<../../../supabase/migrations/20261006000019_public_order_idempotency.sql>).

## Contrato, implementación y compatibilidad

create_order público recalcula precios y sólo inicia qr/pending; se elimina INSERT público de respaldo. write_pos_order consolida pedido, CRM, pago, propina y división en transacción idempotente. Cobrar deja accepted/paid; completed implica paid; persistencia exitosa precede recibo y confirmación. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[I02-rls-same-tenant-allowed.test.ts](<../../../src/tests/integration/I02-rls-same-tenant-allowed.test.ts>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

Prueba adicional confiable pendiente: [I14-mfa-recovery-and-cash.test.ts](<../../../src/tests/integration/I14-mfa-recovery-and-cash.test.ts>).

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

POS/cocina/cobro/CRM/propinas/división/caja aprobados en SQL/HTTP/navegador local. Impresora física y operación real no verificadas.

## Contrato de división y caja

Las partes cobradas suman `orders.total + tip_amount`. SQL asigna la propina proporcionalmente en unidades mínimas mediante restos mayores, con desempate por orden de las partes. Cada pago nuevo tiene `includes_tip=true`; su venta neta es `amount-tip_amount`. Los registros históricos conservan `includes_tip=false` e importes originales. La propina se registra por medio y la idempotencia impide duplicarla. Un total manual con fracciones de unidad mínima se rechaza.

El instante de pago vincula el turno abierto bajo bloqueo. El cierre bloquea ese turno y usa la misma agregación SQL que el resumen; no depende de `completed`. El resumen por mesero usa agregados separados para pedidos y propinas. No se permite modificar `cash_shifts` desde PostgREST. Turnos abiertos duplicados o pagos divididos históricos sin conciliación exacta bloquean la migración23 con IDs. Los cierres históricos no se recalculan.

## Recuperación del navegador

[src/services/pos-operation.ts](<../../../src/services/pos-operation.ts>) conserva cuerpo, ID, modo y clave en sessionStorage antes de enviar la RPC. Una respuesta incierta bloquea contenido nuevo hasta recuperar la solicitud original; soporta el formato anterior de firma/clave. No caduca automáticamente una operación incierta. Un rechazo SQL con rollback demostrable permite corregir el borrador; transporte, autorización revocada y conflicto de idempotencia conservan el bloqueo. Un registro corrupto necesita conciliación interna antes de retirarlo. Prueba local: [pos-operation.test.ts](<../../../src/tests/local/pos-operation.test.ts>). Cerrar el navegador puede perder sessionStorage: no sustituye conciliación del ledger persistido ni garantiza exactly-once tras perder toda la capacidad cliente.

## Validación con Docker disponible

SQL27 completa la columna de correo requerida por la RPC. Input vincula etiquetas a IDs React estables para permitir operación accesible y pruebas de usuario. El navegador prueba pago persistido, conciliación tras fallo, CRM y división/caja. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). POS/cocina/cobro/CRM/propinas/división/caja aprobados en SQL/HTTP/navegador local. Impresora física y operación real no verificadas.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). POS/cocina/cobro/CRM/propinas/división/caja aprobados en SQL/HTTP/navegador local. Impresora física y operación real no verificadas.
