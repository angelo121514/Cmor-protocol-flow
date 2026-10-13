> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-011 — Dinero y precios

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-021/FR-290** — CLP usa 0 decimales y USD/BRL/BOB/PEN 2; unidades mínimas exactas y mitad hacia arriba.
- **FEAT-021/FR-291** — Partes suman exactamente total; restos van a primeras partes; división manual rechaza diferencias.
- **FEAT-021/FR-292** — Catálogo compartido para nuevos cobros; precios brutos/tasa efectiva y contratos existentes se conservan.

## Evidencia y trazabilidad

Features: FEAT-012, FEAT-013, FEAT-018, FEAT-021. Hallazgos: RISK-008, DEBT-011, DEBT-015. Constitución: SEC-006, SEC-015.

Código: [money.ts](<../../../shared/money.ts>); [plan-prices.ts](<../../../shared/plan-prices.ts>); [regional.ts](<../../../src/config/regional.ts>); [helpers.ts](<../../../src/utils/helpers.ts>); [SplitBillModal.tsx](<../../../src/components/SplitBillModal.tsx>); [tipsService.ts](<../../../src/services/tipsService.ts>).

Migraciones nuevas: [20261006000005_shared_order_pricing.sql](<../../../supabase/migrations/20261006000005_shared_order_pricing.sql>); [20261006000006_pos_contracts.sql](<../../../supabase/migrations/20261006000006_pos_contracts.sql>); [20261006000008_checkout_reservations.sql](<../../../supabase/migrations/20261006000008_checkout_reservations.sql>); [20261006000017_provider_operations.sql](<../../../supabase/migrations/20261006000017_provider_operations.sql>).

## Contrato, implementación y compatibilidad

CLP usa 0 decimales y USD/BRL/BOB/PEN 2; unidades mínimas exactas y mitad hacia arriba. Partes suman exactamente total; restos van a primeras partes; división manual rechaza diferencias. Catálogo compartido para nuevos cobros; precios brutos/tasa efectiva y contratos existentes se conservan. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[money-and-pagination.test.ts](<../../../src/tests/local/money-and-pagination.test.ts>); [U21-tax-and-trial-helpers.test.ts](<../../../src/tests/unit/U21-tax-and-trial-helpers.test.ts>); [U22-regional-config.test.ts](<../../../src/tests/unit/U22-regional-config.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Precios/contratos históricos no reinterpretados; moneda histórica NULL sigue desconocida. Validar catálogo comercial antes de nuevos cobros.

## Revisión incremental local

- **FEAT-021/FR-293** — Precisión y moneda nativa verificadas en catálogo, carrito y pedido nuevo.

[SQL24](<../../../supabase/migrations/20261006000024_canonical_money.sql>) valida valores finitos/no negativos y precisión 0/2 de base/opciones, nombres no ambiguos y máximo de unidades mínimas. Preflight registra IDs inválidos y bloquea, sin redondear ni reescribir datos existentes. price_order_items acumula unidades mínimas; sumMoney/multiplyMoney evitan sumas binarias del carrito. CustomerMenu, POS, TableQR y modales calculan en moneda nativa; conversión CLP/USD es sólo presentación.

**DATA-058 / BR-058:** cada pedido nuevo captura moneda; históricos conservan NULL porque la evidencia no demuestra la moneda original. La moneda del pedido es inmutable. Cambiar moneda de un restaurante con pedidos devuelve currency_change_requires_reconciliation; requiere spec/reconciliación posterior, sin conversión implícita. La UI de reportes advierte históricos sin moneda. [canonical_money](<../../../supabase/tests/database/canonical_money.test.sql>) y [pricing_boundaries](<../../../supabase/tests/database/pricing_boundaries.test.sql>) ejecutados: SQL/pgTAP y helpers monetarios PASS local (VALIDATION_REPORT).

price_order_items bloquea el restaurante FOR SHARE antes de leer el catálogo; captura/guardas mantienen ese bloqueo hasta persistir el pedido. Así un cambio concurrente de moneda no puede intercalarse entre cálculo y captura. Compilación PostgreSQL CONFIRMADA local. El bloqueo FOR SHARE se comprobó estáticamente; una prueba dedicada de contención entre cambio de moneda y captura sigue REQUIRES VALIDATION.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Precios/contratos históricos no reinterpretados; moneda histórica NULL sigue desconocida. Validar catálogo comercial antes de nuevos cobros.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Contención monetaria real en ambos órdenes aprobada en I18; catálogo y moneda histórica requieren validación comercial del cliente.
