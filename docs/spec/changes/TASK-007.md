> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-007 — Sucursales

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-004/FR-250** — switch_restaurant exige membresía y cambia sólo la sucursal activa.
- **FEAT-004/FR-251** — Creación hereda contrato del restaurante primario y serializa límite de cinco membresías.
- **FEAT-004/FR-252** — Routes/borradores POS se aíslan por restaurantId; suscripciones se desmontan al cambiar.

## Evidencia y trazabilidad

Features: FEAT-004, FEAT-007, FEAT-009, FEAT-023. Hallazgos: RISK-011, DEBT-004. Constitución: SEC-003, SEC-004, SEC-005, SEC-015.

Código: [useAuth.ts](<../../../src/hooks/useAuth.ts>); [Dashboard.tsx](<../../../src/pages/restaurant/Dashboard.tsx>); [Pos.tsx](<../../../src/pages/restaurant/Pos.tsx>).

Migraciones nuevas: [20261006000001_identity_and_trusted_audit.sql](<../../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql>); [20261006000004_preserve_pricing_and_service_paths.sql](<../../../supabase/migrations/20261006000004_preserve_pricing_and_service_paths.sql>); [20261006000021_remaining_trust_boundaries.sql](<../../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>).

## Contrato, implementación y compatibilidad

switch_restaurant exige membresía y cambia sólo la sucursal activa. Creación hereda contrato del restaurante primario y serializa límite de cinco membresías. Routes/borradores POS se aíslan por restaurantId; suscripciones se desmontan al cambiar. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[I01-rls-cross-tenant-denied.test.ts](<../../../src/tests/integration/I01-rls-cross-tenant-denied.test.ts>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Datos desplegados ambiguos (primarios/membresías/sesiones) requieren preflight y reconciliación; no eliminación arbitraria.

## Revisión incremental local

KDS guarda capacidad con clave por slug y contrasta el restaurante devuelto contra la ruta antes de cargar pedidos. El token global histórico se ignora y requiere iniciar nuevamente con PIN. Seis E2E públicos incluyen dos casos de tenant/capacidad cruzada aprobados; no certifican RLS. Las rutas del dashboard se remontan con key=restaurantId para aislar estados, borradores y cargas de sucursal.

## Validación con Docker disponible

SQL27 genera slug único de sucursal y valida campos obligatorios/plan del primario en servidor. Las fixtures de sucursales usan correos únicos, respetando la restricción histórica. El navegador comprueba herencia y aislamiento del borrador al cambiar de sucursal. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Datos desplegados ambiguos (primarios/membresías/sesiones) requieren preflight y reconciliación; no eliminación arbitraria.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Datos desplegados ambiguos (primarios/membresías/sesiones) requieren preflight y reconciliación; no eliminación arbitraria.
