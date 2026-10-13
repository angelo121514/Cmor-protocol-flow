> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-004 — DSAR completo

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-019/FR-220** — Los seis derechos requieren identidad verificada; JWT ajeno/inválido se rechaza y visitante sólo inicia verificación.
- **FEAT-019/FR-221** — Token SHA-256, 24 h, claim atómico; descarga usa snapshot paginado y capacidad independiente para recuperar fallos.
- **FEAT-019/FR-222** — Rectificación verificada queda pending para admin AAL2; name/phone permitidos; exportación excluye secretos y terceros.

## Evidencia y trazabilidad

Features: FEAT-019. Hallazgos: RISK-001, RISK-004, RISK-009, DEBT-001, DEBT-009, DEBT-010, DEBT-017. Constitución: SEC-002, SEC-003, SEC-004, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011, SEC-014.

Código: [dsar.ts](<../../../supabase/functions/_shared/dsar.ts>); [privacy-runtime.ts](<../../../supabase/functions/_shared/privacy-runtime.ts>); [VerifyDsar.tsx](<../../../src/pages/public/VerifyDsar.tsx>); [privacyService.ts](<../../../src/services/privacyService.ts>); [Privacy.tsx](<../../../src/pages/admin/Privacy.tsx>).

Migraciones nuevas: [20261006000002_verified_dsar.sql](<../../../supabase/migrations/20261006000002_verified_dsar.sql>); [20261006000010_reports_and_dsar_admin.sql](<../../../supabase/migrations/20261006000010_reports_and_dsar_admin.sql>); [20261006000016_dsar_pagination.sql](<../../../supabase/migrations/20261006000016_dsar_pagination.sql>).

## Contrato, implementación y compatibilidad

Los seis derechos requieren identidad verificada; JWT ajeno/inválido se rechaza y visitante sólo inicia verificación. Token SHA-256, 24 h, claim atómico; descarga usa snapshot paginado y capacidad independiente para recuperar fallos. Rectificación verificada queda pending para admin AAL2; name/phone permitidos; exportación excluye secretos y terceros. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[trusted-handlers.test.ts](<../../../src/tests/local/trusted-handlers.test.ts>); [recovery-contracts.test.ts](<../../../src/tests/local/recovery-contracts.test.ts>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>); [local-public-contracts.spec.ts](<../../../src/tests/e2e/local-public-contracts.spec.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Retención legal, purga de snapshots y baja contractual owner/staff requieren procedimiento separado. Descarga automática >100000 registros requiere operador.

## Validación con Docker disponible

SQL27 añade orders.customer_email nullable, también a particiones; no inventa datos históricos. La suite HTTP exige confirmación, descarga JSON/CSV, vencimiento/replay y revisión de rectificación con admin AAL2. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Retención legal, purga de snapshots y baja contractual owner/staff requieren procedimiento separado. Descarga automática >100000 registros requiere operador.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Purga de snapshots y retención opt-in/hold probadas; política legal, conservación y baja contractual quedan al administrador.
