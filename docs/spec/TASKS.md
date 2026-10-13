> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Tareas de corrección integral

TASK-001 se conserva como plantilla. TASK-002–015 autorizadas por el usuario, sin aprobación de despliegue. [Validación](VALIDATION_REPORT.md).

## TASK-001 — Plantilla de cambio

**Estado:** TEMPLATE / NOT STARTED. **Owner:** por asignar antes de iniciar. **Spec de cambio:** por enlazar. **Feature:** FEAT existente o nuevo, sin renumerar otros.

### Requirement

Enumerar FEAT/FR, NFR y SEC-F que satisface; BR/EDGE y riesgos relacionados. Distinguir el comportamiento confirmado que se conserva del TO-BE solicitado. No implementar un requisito desconocido como si estuviera confirmado.

### Código afectado

Archivos/símbolos previstos y consumidores directos/indirectos de UI, servicio, Edge/RPC, tabla, grants/RLS, trigger/cron e integración. Enlazar evidencia del baseline y evitar cambios fuera de esos límites sin actualizar spec.

### Implementation

Describir cambio, contrato/estado antes y después, capa confiable que lo impone, efectos, atomicidad/claim, idempotencia, concurrencia y recuperación. Identificar parámetros/columnas/casos legacy y compatibilidad. Para proveedor externo, precisar mock/contrato y entorno de validación.

### Behavioral Tests

Given actor/precondiciones concretas; When operación y payload específicos; Then respuesta, estado persistido y side effects esperados. Indicar framework y nivel; comprobar implementación real pertinente, no recrear sólo su fórmula.

### Negative Tests

Entradas inválidas y relaciones/estados inexistentes pertinentes; contrato de rechazo HTTP/SQL/JSON y ausencia de efectos. Diferenciar éxito vacío de error.

### Edge Case Tests

Seleccionar casos del dominio: centavos, tasa cero, fecha exacta de expiración, cantidad 100/101, 50/51 líneas, quinta/sexta sucursal, 30/31 platos, sesión payment_pending, stock insuficiente, documento accepted/queued o reintento con misma referencia, según feature. No aplicar todos mecánicamente.

### Security Tests

Según contrato: anónimo, usuario válido sin rol/membresía, owner A ante recurso B, ID manipulado y recurso ajeno, token vencido/repetido, relación cruzada, escalada de rol/plan, firma webhook inválida/replay/importe divergente, secretos/PII en errores, payload de tercero inválido. Verificar rechazo en servidor/DB, no sólo UI. Registrar controles NO DETERMINABLE que exigen ambiente aislado.

### Regression Tests

Enlazar FR/BR de comportamiento anterior, usuarios/países y consumers que deben seguir funcionando. No equiparar tests del mock con compatibilidad Supabase real. Aceptar un cambio intencional sólo si figura en spec.

### Data Validation

Si aplica: fixtures/backfill, NULL/defaults/enums/constraints/FK, counts/ownership, grants por columna/default privileges y RLS, triggers/funciones sustituidas, catálogo efectivo, rollback y validación posterior. Si no aplica: N/A con razón.

### Acceptance Criteria

Condiciones medibles de comportamiento y rechazo; resultado de tests; contratos y trazabilidad actualizados; observabilidad segura; migración/compatibilidad/rollout cuando corresponda. Aplicar Definition of Done de PLAN; registrar riesgo residual y decisiones humanas.


## TASK-002 — Entorno y pruebas

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-002](changes/TASK-002.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-024/FR-200, FEAT-024/FR-201, FEAT-024/FR-202. **Hallazgos:** DEBT-008.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-003 — Autorización y MFA

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-003](changes/TASK-003.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-001/FR-210, FEAT-001/FR-211, FEAT-001/FR-212. **Hallazgos:** RISK-002, RISK-012, DEBT-002, DEBT-018.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-004 — DSAR completo

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-004](changes/TASK-004.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-019/FR-220, FEAT-019/FR-221, FEAT-019/FR-222. **Hallazgos:** RISK-001, RISK-004, RISK-009, DEBT-001, DEBT-009, DEBT-010, DEBT-017.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-005 — Auditoría y consentimientos

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-005](changes/TASK-005.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-024/FR-230, FEAT-024/FR-231, FEAT-024/FR-232. **Hallazgos:** RISK-005, DEBT-013, DEBT-017.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-006 — POS y pedidos

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-006](changes/TASK-006.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. **Hallazgos:** RISK-010, DEBT-003.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-007 — Sucursales

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-007](changes/TASK-007.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-004/FR-250, FEAT-004/FR-251, FEAT-004/FR-252. **Hallazgos:** RISK-011, DEBT-004.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-008 — Mesas QR

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-008](changes/TASK-008.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-014/FR-260, FEAT-014/FR-261, FEAT-014/FR-262. **Hallazgos:** RISK-003.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-009 — Pagos y webhooks

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-009](changes/TASK-009.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-015/FR-270, FEAT-015/FR-271, FEAT-015/FR-272. **Hallazgos:** RISK-006, DEBT-007.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-010 — Inventario y recetas

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-010](changes/TASK-010.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-010/FR-280, FEAT-010/FR-281, FEAT-010/FR-282. **Hallazgos:** RISK-007, DEBT-005, DEBT-006.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-011 — Dinero y precios

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-011](changes/TASK-011.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-021/FR-290, FEAT-021/FR-291, FEAT-021/FR-292. **Hallazgos:** RISK-008, DEBT-011, DEBT-015.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-012 — Límites e IA

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-012](changes/TASK-012.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-020/FR-300, FEAT-020/FR-301, FEAT-020/FR-302. **Hallazgos:** RISK-011, RISK-012, DEBT-017.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-013 — Reportes y CRM

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-013](changes/TASK-013.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-009/FR-310, FEAT-009/FR-311, FEAT-009/FR-312. **Hallazgos:** DEBT-012.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-014 — Operación, archivos y configuración

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-014](changes/TASK-014.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-022/FR-320, FEAT-022/FR-321, FEAT-022/FR-322. **Hallazgos:** DEBT-014, DEBT-016, DEBT-018.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.

## TASK-015 — Cierre SDD

**Estado:** LOCAL VALIDATED / OPERATIONAL ACCEPTANCE PENDING. **Spec:** [TASK-015](changes/TASK-015.md). **Responsable técnico:** por asignar; implementación Codex. **Requisitos:** FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. **Hallazgos:** RISK-001, RISK-002, RISK-003, RISK-004, RISK-005, RISK-006, RISK-007, RISK-008, RISK-009, RISK-010, RISK-011, RISK-012, DEBT-001, DEBT-002, DEBT-003, DEBT-004, DEBT-005, DEBT-006, DEBT-007, DEBT-008, DEBT-009, DEBT-010, DEBT-011, DEBT-012, DEBT-013, DEBT-014, DEBT-015, DEBT-016, DEBT-017, DEBT-018.

Migraciones, pruebas, aceptación y residual: spec enlazada. Integración local aprobada; despliegue UNKNOWN.


Estado vigente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), evidencia LOCAL_VALIDATION (referencia histórica excluida de esta distribución).

## TASK-016 — Cierre de pendientes

LOCAL_AND_CI_VALIDATED. [Spec](changes/TASK-016.md). Configuración por el administrador del cliente según decisión2026-10-07; pruebas adicionales/retención/entrega remota en curso.

TASK-016: validación local/CI aprobada; configuración del cliente por administrador. Evidencia (referencia histórica excluida de esta distribución).
