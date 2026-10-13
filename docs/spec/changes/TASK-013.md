> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-013 — Reportes y CRM

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-009/FR-310** — Dashboard agrega en SQL por payment_status/tenant, sin truncamiento max_rows.
- **FEAT-009/FR-311** — Listados/exportaciones paginan con orden estable; error DB no equivale a cero ventas.
- **FEAT-009/FR-312** — Informes acotados declaran ventana; CSV neutraliza fórmulas.

## Evidencia y trazabilidad

Features: FEAT-008, FEAT-009, FEAT-023. Hallazgos: DEBT-012. Constitución: SEC-003, SEC-004, SEC-010, SEC-011.

Código: [dashboardService.ts](<../../../src/services/dashboardService.ts>); [adminService.ts](<../../../src/services/adminService.ts>); [Reports.tsx](<../../../src/pages/restaurant/Reports.tsx>); [Crm.tsx](<../../../src/pages/restaurant/Crm.tsx>); [pagination.ts](<../../../src/services/pagination.ts>).

Migraciones nuevas: [20261006000010_reports_and_dsar_admin.sql](<../../../supabase/migrations/20261006000010_reports_and_dsar_admin.sql>); [20261006000014_admin_dashboard.sql](<../../../supabase/migrations/20261006000014_admin_dashboard.sql>); [20261006000022_pin_and_accounting_candidates.sql](<../../../supabase/migrations/20261006000022_pin_and_accounting_candidates.sql>).

## Contrato, implementación y compatibilidad

Dashboard agrega en SQL por payment_status/tenant, sin truncamiento max_rows. Listados/exportaciones paginan con orden estable; error DB no equivale a cero ventas. Informes acotados declaran ventana; CSV neutraliza fórmulas. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[money-and-pagination.test.ts](<../../../src/tests/local/money-and-pagination.test.ts>); [I12-financial-privacy-limits.test.ts](<../../../src/tests/integration/I12-financial-privacy-limits.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Agregación SQL con 1251 registros y paginador/CRM1251 probados; CSV de reportes exporta agregados. Listados paginados no son snapshots; validar zona regional por local.

## Revisión incremental local

- **FEAT-009/FR-313** — Reporte SQL con ventana limitada, zona regional, permisos y fallos visibles.

[API-244 / SQL25](<../../../supabase/migrations/20261006000025_sales_report_aggregation.sql>) agrega sin max_rows: totales, cinco platos, últimos catorce días presentes, tipos y conteo de moneda histórica desconocida. Sólo authenticated con is_my_restaurant; service/anon sin EXECUTE. Ventanas 1/7/30/90 incluyen hoy desde medianoche regional hasta now, por created_at; no por fecha de cobro. País CL→America/Santiago, BR→America/Sao_Paulo, BO→America/La_Paz, PE→America/Lima. **INFERIDO como valor regional, REQUIERE VALIDACIÓN comercial para otras zonas; el baseline no tiene columna timezone.**

[reportsService](<../../../src/services/reportsService.ts>) valida respuesta completa; error DB/contrato no se convierte en cero. La pantalla descarta respuestas tardías y oculta resultados de otra clave restaurante/ventana. CRM incluye status/payment_status/items y contabiliza pagos en preparación. [Contratos](<../../../src/tests/local/sales-report-contract.test.ts>) y [CRM1251](<../../../src/tests/local/menu-and-crm-contracts.test.ts>) aprobados con mocks; [I15](<../../../src/tests/integration/I15-sales-report-aggregation.test.ts>) probó 1251 pagos/uno impago/tenant/grants con SQL real: PASS. Cambio de sucursal y CRM autenticado PASS; exportación masiva de reportes y pantalla de historial de facturación no tienen E2E específico.

El historial de facturación pagina payments/invoices por ID estable y muestra errores de carga. useFlowSubscription propaga fallos en lugar de presentar ausencia de contrato/tarjeta y limpia tarjeta ausente. Prueba de pantalla autenticada de facturación REQUIRES VALIDATION.


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Agregación SQL con 1251 registros y paginador/CRM1251 probados; CSV de reportes exporta agregados. Listados paginados no son snapshots; validar zona regional por local.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Agregación SQL1251 y paginador/CRM1251 probados; CSV de reportes exporta agregados. Listados paginados no son snapshots; validar zona regional por local.
