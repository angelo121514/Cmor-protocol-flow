> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-014 — Operación, archivos y configuración

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-022/FR-320** — Cron endpoint protegido desactivado local; lease token, reintentos y conciliación evitan emisión ciega.
- **FEAT-022/FR-321** — Imágenes nuevas validan bytes/MIME/tamaño Edge; Storage privado exige tenant, conserva imágenes existentes.
- **FEAT-022/FR-322** — Variables server-only y clasificación legacy; sin backups, migraciones remotas ni limpieza implícita.

## Evidencia y trazabilidad

Features: FEAT-005, FEAT-022, FEAT-024. Hallazgos: DEBT-014, DEBT-016, DEBT-018. Constitución: SEC-004, SEC-005, SEC-006, SEC-007, SEC-010, SEC-012.

Código: [index.ts](<../../../supabase/functions/accounting/index.ts>); [accounting-recovery.ts](<../../../supabase/functions/_shared/accounting-recovery.ts>); [index.ts](<../../../supabase/functions/menu-image/index.ts>); [image-validation.ts](<../../../shared/image-validation.ts>); [ImageDropZone.tsx](<../../../src/components/ImageDropZone.tsx>); [README.md](<../../../README.md>); [.env.example](<../../../.env.example>).

Migraciones nuevas: [20261006000011_operation_and_files.sql](<../../../supabase/migrations/20261006000011_operation_and_files.sql>); [20261006000018_accounting_leases.sql](<../../../supabase/migrations/20261006000018_accounting_leases.sql>); [20261006000022_pin_and_accounting_candidates.sql](<../../../supabase/migrations/20261006000022_pin_and_accounting_candidates.sql>).

## Contrato, implementación y compatibilidad

Cron endpoint protegido desactivado local; lease token, reintentos y conciliación evitan emisión ciega. Imágenes nuevas validan bytes/MIME/tamaño Edge; Storage privado exige tenant, conserva imágenes existentes. Variables server-only y clasificación legacy; sin backups, migraciones remotas ni limpieza implícita. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[recovery-contracts.test.ts](<../../../src/tests/local/recovery-contracts.test.ts>); [money-and-pagination.test.ts](<../../../src/tests/local/money-and-pagination.test.ts>); [I03-I10-rpcs-auth-storage.test.ts](<../../../src/tests/integration/I03-I10-rpcs-auth-storage.test.ts>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Cron externo desactivado localmente; DTE/leases probados con simulador. Imágenes validan cabecera/MIME/tamaño, con decodificación completa, canonización y antivirus real probados en TASK-016. Retención/limpieza explícita y DTE real pendientes.

## Revisión incremental local

deprecated/README (referencia histórica excluida de esta distribución) conserva los componentes históricos de MFA sin consumidor activo; sólo ese directorio histórico se excluye del lint/TS de producto, sin desactivar reglas activas. MockSupabase sigue tipado e incluido en lint; su consumidor es una prueba legacy y no constituye evidencia de Auth. No se identificó uploader activo de logos/qr-codes en src; esas escrituras legacy siguen denegadas y no se limpiaron archivos existentes.

## Validación con Docker disponible

Las Edge Functions fijan SDK2.86.0, igual al paquete instalado. PUBLIC_SUPABASE_URL distingue el origen público del gateway interno para imágenes; la firma Storage se conserva al publicar el redirect. La prueba HTTP usa un objeto existente para demostrar acceso owner y rechazo cross-tenant, MIME/contenido inválido, publicación y descarga. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Validación contable con runtime local

[I16](<../../../src/tests/integration/I16-accounting-runtime.test.ts>) prueba leases reales concurrentes, renovación, expiración y rechazo del token anterior; cron externo desactivado y permisos efectivos; alta de credencial cifrada por Edge, aislamiento, emisión contra simulador, recuperación de respuesta remota perdida por referencia, NOT_FOUND con reemisión y replay sin duplicados. Las pruebas puras de recuperación mantienen error/timeout en reconciliación. Ningún DTE se envía a SII/proveedor real. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Cron externo desactivado localmente; DTE/leases probados con simulador. Imágenes validan cabecera/MIME/tamaño, con decodificación completa, canonización y antivirus real probados en TASK-016. Retención/limpieza explícita y DTE real pendientes.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Imágenes decodificadas/canonizadas y antivirus real probados; cron/DTE simulados. Instalar servicio privado y revisar URLs heredadas con el administrador.
