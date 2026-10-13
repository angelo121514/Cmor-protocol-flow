> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# TASK-003 — Autorización y MFA

Autorizado por el plan del usuario, 2026-10-06. **Implementación y validación local CONFIRMADAS; despliegue DESCONOCIDO.** Implementación: Codex en este checkout. Responsable técnico/aprobación operativa: por asignar. Vulnerabilidades potenciales; no hay evidencia de incidente activo.

## Requisitos de cambio

- **FEAT-001/FR-210** — is_admin deriva auth.uid, perfil admin, AAL2 y factor activo; current_user no identifica al solicitante.
- **FEAT-001/FR-211** — Las rutas owner no permiten bypass admin AAL1; automatizaciones usan funciones internas service role.
- **FEAT-001/FR-212** — Recuperación administrativa bloquea perfil, exige nuevo factor y deniega JWT anteriores mediante epoch.

## Evidencia y trazabilidad

Features: FEAT-001, FEAT-003, FEAT-011, FEAT-024. Hallazgos: RISK-002, RISK-012, DEBT-002, DEBT-018. Constitución: SEC-001, SEC-002, SEC-003, SEC-004, SEC-005, SEC-009, SEC-015.

Código: [authorization.ts](<../../../supabase/functions/_shared/authorization.ts>); [MfaGate.tsx](<../../../src/components/MfaGate.tsx>); [RequireRole.tsx](<../../../src/components/RequireRole.tsx>).

Migraciones nuevas: [20261006000001_identity_and_trusted_audit.sql](<../../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql>); [20261006000004_preserve_pricing_and_service_paths.sql](<../../../supabase/migrations/20261006000004_preserve_pricing_and_service_paths.sql>); [20261006000011_operation_and_files.sql](<../../../supabase/migrations/20261006000011_operation_and_files.sql>); [20261006000012_explicit_rpc_surface.sql](<../../../supabase/migrations/20261006000012_explicit_rpc_surface.sql>); [20261006000021_remaining_trust_boundaries.sql](<../../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql>); [20261006000022_pin_and_accounting_candidates.sql](<../../../supabase/migrations/20261006000022_pin_and_accounting_candidates.sql>).

## Contrato, implementación y compatibilidad

is_admin deriva auth.uid, perfil admin, AAL2 y factor activo; current_user no identifica al solicitante. Las rutas owner no permiten bypass admin AAL1; automatizaciones usan funciones internas service role. Recuperación administrativa bloquea perfil, exige nuevo factor y deniega JWT anteriores mediante epoch. Las firmas y errores vigentes se documentan en [API_SPEC](../API_SPEC.md); entidades/estados en [DATA_MODEL](../DATA_MODEL.md). Declaraciones SQL locales no certifican ejecución. Las operaciones remotas inciertas conservan estado de recuperación y no autorizan repetir efectos.

## Pruebas de comportamiento, negativas y límites

[mfa-ui.test.tsx](<../../../src/tests/local/mfa-ui.test.tsx>); [I11-mfa-and-concurrent-qr.test.ts](<../../../src/tests/integration/I11-mfa-and-concurrent-qr.test.ts>); [security_and_inventory.test.sql](<../../../supabase/tests/database/security_and_inventory.test.sql>).

Given actores anónimo, owner A/B, staff, admin AAL1/AAL2, service role y datos sintéticos; When se invoca la implementación con datos propios, ajenos, inválidos, vencidos o concurrentes; Then se cumplen los requisitos y el rechazo no produce efectos parciales. Los casos concretos y assertions están en los archivos citados. Los mocks prueban decisiones de handler; pgTAP/PostgREST prueban permisos y transacciones, con ejecución local registrada en VALIDATION_REPORT. [TESTING](../TESTING.md) distingue suites efectivas y pendientes.

## Data Validation y aceptación

Preservar baseline histórico, backfills deterministas y contratos existentes; datos ambiguos deben bloquear migración con informe. Cerrar sólo tras pruebas reproducibles en la capa confiable, contrato/trazabilidad, instalación limpia/upgrade aplicable, riesgo residual y responsable. No aceptar un skip ni mocks como certificación SQL/Deno. Resultados actuales en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## Riesgo residual y pendiente

Permisos/MFA/recovery/PIN probados localmente. Operador de recuperación e identidad por asignar; propietarios/grants desplegados UNKNOWN.

## Revisión incremental local

Los módulos Edge usan [ports.ts](<../../../supabase/functions/_shared/ports.ts>) con interfaces SDK y respuestas verificadas; el adaptador de tipos Deno no sustituye ejecución. El JWT sólo se interpreta después de getUser y exige AAL/iat válidos. Prueba de navegador real preparada en TASK-002; enrolamiento, recuperación y permisos efectivos se comprobaron en runtime local.

## Validación con Docker disponible

SQL26 declara grants DML de backend para las tablas de dominio y SELECT/INSERT de audit_log; UPDATE/DELETE/TRUNCATE de auditoría siguen revocados. La identidad humana no depende de estos grants. Handlers de aplicación rechazan Origin ajeno antes de ejecutar: Kong local puede sobrescribir ACAO. Callbacks de proveedores validan firma/consulta remota independientemente de Origin. Resultados y estados de cierre en [VALIDATION_REPORT](../VALIDATION_REPORT.md).

## PIN de meseros sin selección ambigua

**FEAT-011/FR-213** — PIN único por restaurante bajo bloqueo; duplicados históricos se rechazan al validar sin elegir un mesero arbitrario. SQL29 serializa alta/cambio por fila de restaurante y rechaza `23505/waiter_pin_in_use`. Validación con varios hashes coincidentes devuelve `ambiguous_waiter_pin`, sin crear sesión. No modifica filas históricas: el owner debe rotar el PIN mediante operación explícita. Prueba real: [S06](<../../../src/tests/security/S06-pin-hash.test.ts>). API-245 / BR-059 / SEC-002 / SEC-003. Migración: [SQL29](<../../../supabase/migrations/20261006000029_unambiguous_waiter_pins.sql>).


## Resultado final local

VALIDATED LOCAL: ver [VALIDATION_REPORT](../VALIDATION_REPORT.md) y LOCAL_VALIDATION (referencia histórica excluida de esta distribución). Permisos/MFA/recovery/PIN probados localmente. Operador de recuperación e identidad por asignar; propietarios/grants desplegados UNKNOWN.

## Estado vigente de cierre

Validación local/CI aprobada; evidencia local (referencia histórica excluida de esta distribución) y CI (referencia histórica excluida de esta distribución). Permisos/MFA/recovery/PIN probados localmente. Operador de recuperación e identidad por asignar; propietarios/grants desplegados UNKNOWN.
