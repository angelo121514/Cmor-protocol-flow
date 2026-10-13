> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-012 — Registro y liquidación de propinas

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-012.
- Objetivo: Registro y liquidación de propinas dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-012/FR-001, FEAT-012/NFR-001, FEAT-012/SEC-F001 y FEAT-012/EDGE-001.

## Actores

Owner/cajero; mesero beneficiario.

## Preconditions

Permisos del restaurante y monto/porcentaje de propina.

Punto de entrada y trigger: POS, /restaurant/reports y pago QR; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | calculateTipAmount retorna 0 si total o porcentaje no es positivo; usa Math.round con decimales de moneda. | CONFIRMADO | [src/services/tipsService.ts](<../../../../src/services/tipsService.ts>); [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [supabase/migrations/20260710000003_tips.sql](<../../../../supabase/migrations/20260710000003_tips.sql>) |
| FR-002 | markTipsAsPaid marca IDs como paid_out y registra paid_out_at. | CONFIRMADO | [src/services/tipsService.ts](<../../../../src/services/tipsService.ts>); [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [supabase/migrations/20260710000003_tips.sql](<../../../../supabase/migrations/20260710000003_tips.sql>) |
| FR-003 | Resúmenes por mesero agregan monto/cantidad en el navegador a partir de tips filtradas por restaurante y fechas. | CONFIRMADO | [src/services/tipsService.ts](<../../../../src/services/tipsService.ts>); [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [supabase/migrations/20260710000003_tips.sql](<../../../../supabase/migrations/20260710000003_tips.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Decimales parametrizados; default 0 conserva cálculo CLP.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: Mutaciones de propinas deben pasar RLS; paid_out es liquidación al mesero, diferente de pago del pedido.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Cajero/cliente selecciona porcentaje o monto y helper calcula propina.
2. El servicio o finalización QR registra tips con atribución cuando dispone de IDs.
3. El owner consulta agregado y marca IDs paid_out al liquidar, independientemente del pago del pedido.

## Alternative Flows

Variación específica: Misma propina porcentual fraccionaria en POS y QR. POS usa round; calcTipFromPercent QR usa ceil. La diferencia es comportamiento actual, no una regla monetaria uniforme.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Total o porcentaje no positivo.
- When: Se calcula propina con helper POS.
- Then: El helper retorna 0.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO del mensaje; cobro depende RISK-010. Given: Propina creada después de guardar pedido y falla INSERT. When: POS maneja tipError. Then: Muestra aviso de que pedido se cobró pero propina no registrada; no se presume rollback del pedido.
- Caso 3 — REQUIERE VALIDACIÓN. Given: Tip IDs de otro restaurante. When: Se solicita paid_out. Then: Debe decidirlo RLS; prueba efectiva no ejecutada.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Misma propina porcentual fraccionaria en POS y QR.
- Comportamiento actual: POS usa round; calcTipFromPercent QR usa ceil. La diferencia es comportamiento actual, no una regla monetaria uniforme.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/tipsService.ts](<../../../../src/services/tipsService.ts>); [src/services/tableService.ts](<../../../../src/services/tableService.ts>); [supabase/migrations/20260710000003_tips.sql](<../../../../supabase/migrations/20260710000003_tips.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| tips | DATA-040 |
| orders | DATA-026 |
| waiters | DATA-043 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-126, API-150, API-208, API-209, API-210, API-211, API-212. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-126](../../API_SPEC.md#api-126), [API-150](../../API_SPEC.md#api-150), [API-208](../../API_SPEC.md#api-208), [API-209](../../API_SPEC.md#api-209), [API-210](../../API_SPEC.md#api-210), [API-211](../../API_SPEC.md#api-211), [API-212](../../API_SPEC.md#api-212)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

Mutaciones de propinas deben pasar RLS; paid_out es liquidación al mesero, diferente de pago del pedido.

Reglas de negocio relacionadas: [BR-012](../../BUSINESS_RULES.md#br-012). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Inserta tips y actualiza liquidación; complete_session_payment puede insertar propina QR.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: El helper retorna 0. Fallos parciales/concurrencia: Decimales parametrizados; default 0 conserva cálculo CLP. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U15-tipsService.test.ts](<../../../../src/tests/unit/U15-tipsService.test.ts>)
- [src/tests/unit/U17-qrTables.test.ts](<../../../../src/tests/unit/U17-qrTables.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/tipsService.ts](<../../../../src/services/tipsService.ts>)
- [src/services/tableService.ts](<../../../../src/services/tableService.ts>)
- [supabase/migrations/20260710000003_tips.sql](<../../../../supabase/migrations/20260710000003_tips.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

El owner consulta agregado y marca IDs paid_out al liquidar, independientemente del pago del pedido.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.

Regla adicional: [BR-034](../../BUSINESS_RULES.md#br-034) → FEAT-012/FR-001.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-011 — Dinero y precios](../../changes/TASK-011.md): FEAT-021/FR-290, FEAT-021/FR-291, FEAT-021/FR-292. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
