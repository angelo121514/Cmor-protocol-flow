> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-012 — Límites e IA

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-020/FR-300** — Límites cinco restaurantes, treinta platos y presupuestos públicos se serializan SQL.
- **FEAT-020/FR-301** — Fallo de control deniega operación; pedidos validan cantidades 100/101 y líneas 50/51.
- **FEAT-020/FR-302** — IA externa ai_disabled sin OpenRouter/costo; asistente local de carta se conserva.

## Evidencia y trazabilidad

Features: FEAT-004, FEAT-005, FEAT-006, FEAT-020. Hallazgos: RISK-011, RISK-012, DEBT-017. Constitución: SEC-001, SEC-006, SEC-010, SEC-015.

Código: [aiService.ts](<../../../src/services/aiService.ts>); [AiRecommendations.tsx](<../../../src/pages/restaurant/AiRecommendations.tsx>); [index.ts](<../../../supabase/functions/ai-recommendations/index.ts>).

Migraciones nuevas: [20261006000004_preserve_pricing_and_service_paths.sql](<../../../supabase/migrations/20261006000004_preserve_pricing_and_service_paths.sql>); [20261006000007_qr_and_atomic_limits.sql](<../../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql>); [20261006000012_explicit_rpc_surface.sql](<../../../supabase/migrations/20261006000012_explicit_rpc_surface.sql>).

## Contrato, implementación y compatibilidad

Límites cinco restaurantes, treinta platos y presupuestos públicos se serializan SQL. Fallo de control deniega operación; pedidos validan cantidades 100/101 y líneas 50/51. IA externa ai_disabled sin OpenRouter/costo; asistente local de carta se conserva. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[trusted-handlers.test.ts](<../../../src/tests/local/trusted-handlers.test.ts>); [I03-I10-rpcs-auth-storage.test.ts](<../../../src/tests/integration/I03-I10-rpcs-auth-storage.test.ts>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>); [I13-edge-http.test.ts](<../../../src/tests/integration/I13-edge-http.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

IA externa permanece ai_disabled. Reactivación exige nueva spec de privacidad, límites y proveedor.

## Validación con Docker disponible

SQL27 retira el throttle histórico basado en headers IP para escrituras de pedidos. public_order_budget aplica el presupuesto por recurso a visitantes; owners autorizados y automatizaciones se verifican en servidor y mantienen sus operaciones legítimas. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). IA externa permanece ai_disabled. Reactivación exige nueva spec de privacidad, límites y proveedor.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). IA externa permanece ai_disabled. Reactivación exige nueva spec de privacidad, límites y proveedor.
