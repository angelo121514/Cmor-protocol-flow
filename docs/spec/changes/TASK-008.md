> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-008 — Mesas QR

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-014/FR-260** — QR vigente inicia sesión; table_id UUID no concede capacidad pública.
- **FEAT-014/FR-261** — Una mesa mantiene una sesión active/payment_pending; inicio concurrente bloquea fila y reutiliza sesión.
- **FEAT-014/FR-262** — Durante pago se impiden nuevos pedidos; cierre/rotación revoca capacidades.

## Evidencia y trazabilidad

Features: FEAT-014, FEAT-015. Hallazgos: RISK-003. Constitución: SEC-004, SEC-008, SEC-009, SEC-010, SEC-015.

Código: [tableService.ts](<../../../src/services/tableService.ts>); [TableQR.tsx](<../../../src/pages/customer/TableQR.tsx>); [QRPayment.tsx](<../../../src/pages/customer/QRPayment.tsx>).

Migraciones nuevas: [20261006000007_qr_and_atomic_limits.sql](<../../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql>); [20261006000015_capability_rotation.sql](<../../../supabase/migrations/20261006000015_capability_rotation.sql>); [20261006000021_remaining_trust_boundaries.sql](<../../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>).

## Contrato, implementación y compatibilidad

QR vigente inicia sesión; table_id UUID no concede capacidad pública. Una mesa mantiene una sesión active/payment_pending; inicio concurrente bloquea fila y reutiliza sesión. Durante pago se impiden nuevos pedidos; cierre/rotación revoca capacidades. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[I11-mfa-and-concurrent-qr.test.ts](<../../../src/tests/integration/I11-mfa-and-concurrent-qr.test.ts>); [local-public-contracts.spec.ts](<../../../src/tests/e2e/local-public-contracts.spec.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Capacidades QR vigentes comparten cuenta por decisión aprobada. Rotación/cierre revocan capacidades anteriores; QR desplegados UNKNOWN.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Capacidades QR vigentes comparten cuenta por decisión aprobada. Rotación/cierre revocan capacidades anteriores; QR desplegados UNKNOWN.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Capacidades QR vigentes comparten cuenta por decisión aprobada. Rotación/cierre revocan capacidades anteriores; QR desplegados UNKNOWN.
