> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-015 — Cierre SDD

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-024/FR-330** — Specs, reglas, API, datos, feature specs y trazabilidad actualizados sin renumerar baseline.
- **FEAT-024/FR-331** — CI exige lint, tipos, build, unitarias, SQL/Edge, E2E local, documentación y audit dependencias/secretos.
- **FEAT-024/FR-332** — Cerrar sólo con prueba confiable, contrato/residual; separar local/desplegado y asignar responsables.

## Evidencia y trazabilidad

Features: FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-005, FEAT-006, FEAT-007, FEAT-008, FEAT-009, FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014, FEAT-015, FEAT-016, FEAT-017, FEAT-018, FEAT-019, FEAT-020, FEAT-021, FEAT-022, FEAT-023, FEAT-024. Hallazgos: RISK-001, RISK-002, RISK-003, RISK-004, RISK-005, RISK-006, RISK-007, RISK-008, RISK-009, RISK-010, RISK-011, RISK-012, DEBT-001, DEBT-002, DEBT-003, DEBT-004, DEBT-005, DEBT-006, DEBT-007, DEBT-008, DEBT-009, DEBT-010, DEBT-011, DEBT-012, DEBT-013, DEBT-014, DEBT-015, DEBT-016, DEBT-017, DEBT-018. Constitución: SEC-001, SEC-002, SEC-003, SEC-004, SEC-005, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011, SEC-012, SEC-013, SEC-014, SEC-015.

Código: [ci.yml](<../../../.github/workflows/ci.yml>); [check-spec.mjs](<../../../scripts/check-spec.mjs>); [DEPLOYMENT_MANIFEST.md](<../DEPLOYMENT_MANIFEST.md>).

Migraciones nuevas: N/A: no introduce SQL propio; valida/prepara el conjunto.

## Contrato, implementación y compatibilidad

Specs, reglas, API, datos, feature specs y trazabilidad actualizados sin renumerar baseline. CI exige lint, tipos, build, unitarias, SQL/Edge, E2E local, documentación y audit dependencias/secretos. Cerrar sólo con prueba confiable, contrato/residual; separar local/desplegado y asignar responsables. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[check-spec.mjs](<../../../scripts/check-spec.mjs>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Validación local completada; adopción formal, responsables nominados, CI remoto, despliegue y observación continua pendientes (nivel 5).

El check documental exige cobertura de todos los archivos cambiados, rechaza fuentes duplicadas y verifica hashes actuales normalizados LF, entidades/reglas/APIs canónicas, trazabilidad y 89 migraciones históricas intactas. No certifica permisos ni ejecución SQL.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Validación local completada; adopción formal, responsables nominados, CI remoto, despliegue y observación continua pendientes (nivel 5).

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Cierre local/CI y entrega en PR aprobados. Nivel5 requiere adopción formal y operación continua; producción no verificada.
