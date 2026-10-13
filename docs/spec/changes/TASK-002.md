> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-002 — Entorno y pruebas

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-024/FR-200** — Actores Auth reales, MFA TOTP, dos restaurantes aislados y proveedores deterministas.
- **FEAT-024/FR-201** — Rechazar destinos externos y fixtures ausentes; separar unitarias, SQL, Edge HTTP y navegador.
- **FEAT-024/FR-202** — Instalación limpia y actualización deben aprobar sin skips.

## Evidencia y trazabilidad

Features: FEAT-024. Hallazgos: DEBT-008. Constitución: SEC-006, SEC-010.

Código: [test-database-local.mjs](<../../../scripts/test-database-local.mjs>); [local-fixtures.mjs](<../../../scripts/local-fixtures.mjs>); [mock-providers.mjs](<../../../scripts/mock-providers.mjs>); [vitest.database.config.ts](<../../../vitest.database.config.ts>); [playwright.config.ts](<../../../playwright.config.ts>).

Migraciones nuevas: N/A: no introduce SQL propio; valida/prepara el conjunto.

## Contrato, implementación y compatibilidad

Actores Auth reales, MFA TOTP, dos restaurantes aislados y proveedores deterministas. Rechazar destinos externos y fixtures ausentes; separar unitarias, SQL, Edge HTTP y navegador. Instalación limpia y actualización deben aprobar sin skips. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[I01-rls-cross-tenant-denied.test.ts](<../../../src/tests/integration/I01-rls-cross-tenant-denied.test.ts>); [I13-edge-http.test.ts](<../../../src/tests/integration/I13-edge-http.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Entorno exclusivo cmor-flow-open-source-validation en puertos 55420–55424; CI remoto aprobado; ver CI_VALIDATION. Logs y credenciales sintéticas ignorados.

## Revisión incremental local

La suite [trusted-local-flows](<../../../src/tests/e2e/trusted-local-flows.spec.ts>) y [configuración autenticada](<../../../playwright.database.config.ts>) requieren fixtures reales. Los seis casos se ejecutaron y aprobaron en upgrade y clean: enrolamiento MFA; desafío sin bypass; POS/cocina/cobro; recuperación sin recibo prematuro; sucursales/borradores; división/propinas/caja/CRM. Los seis públicos aprobaron con API simulada. Las factories UI no sustituyen permisos SQL.

## Validación con Docker disponible

La pila desechable usa project_id cmor-flow-open-source-validation y puertos 55421/55422, PostgreSQL17. No reutiliza volúmenes originales ni puertos de otros proyectos. test-sql-local ejecuta pgTAP mediante psql y falla ante TAP incompleto; no necesita imagen pg_prove. El runner evita fixtures concurrentes, usa deadline para Edge, mata sólo sus hijos y compila SDK2.86.0 instalado en un import map local sin descargas esm.sh. reset-local-validation limita cualquier reset a esta pila y sólo recupera health timeout mediante start normal, sin ignore-health-check. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Entorno exclusivo cmor-flow-open-source-validation en puertos 55420–55424; CI remoto aprobado; ver CI_VALIDATION. Logs y credenciales sintéticas ignorados.

Lint excluye .local-test y su SDK generado; conserva todas las fuentes mantenidas. CI obtiene historial completo y comprueba tipos de tests.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Entorno exclusivo cmor-flow-open-source-validation y CI remoto aprobados; credenciales y logs sintéticos ignorados.
