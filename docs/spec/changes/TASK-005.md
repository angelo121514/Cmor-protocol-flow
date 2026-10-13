> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-005 — Auditoría y consentimientos

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-024/FR-230** — Actor confiable derivado en servidor; anon no inserta auditoría ni suplanta subject_id.
- **FEAT-024/FR-231** — Consentimiento persistido exige Auth confirmado; correo escrito no prueba identidad.
- **FEAT-024/FR-232** — browser_signals separa señales no confiables; telemetría minimiza tokens, correo y rutas sensibles.

## Evidencia y trazabilidad

Features: FEAT-019, FEAT-024. Hallazgos: RISK-005, DEBT-013, DEBT-017. Constitución: SEC-007, SEC-014, SEC-015.

Código: [privacyService.ts](<../../../src/services/privacyService.ts>); [securityService.ts](<../../../src/services/securityService.ts>); [telemetry.ts](<../../../src/utils/telemetry.ts>); [instrumentation.ts](<../../../src/instrumentation.ts>).

Migraciones nuevas: [20261006000001_identity_and_trusted_audit.sql](<../../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql>); [20261006000021_remaining_trust_boundaries.sql](<../../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>).

## Contrato, implementación y compatibilidad

Actor confiable derivado en servidor; anon no inserta auditoría ni suplanta subject_id. Consentimiento persistido exige Auth confirmado; correo escrito no prueba identidad. browser_signals separa señales no confiables; telemetría minimiza tokens, correo y rutas sensibles. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[I01-rls-cross-tenant-denied.test.ts](<../../../src/tests/integration/I01-rls-cross-tenant-denied.test.ts>); [telemetry.test.ts](<../../../src/tests/local/telemetry.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

No se inspeccionaron logs históricos; no hay evidencia de incidente activo. Señales de navegador siguen sin confianza de auditoría.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). No se inspeccionaron logs históricos; no hay evidencia de incidente activo. Señales de navegador siguen sin confianza de auditoría.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). No se inspeccionaron logs históricos; no hay evidencia de incidente activo. Señales de navegador siguen sin confianza de auditoría.
