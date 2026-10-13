> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# FEAT-017 — Apertura y cierre de turnos de caja

> AS-IS histórico del baseline 2026-10-05. El bloque Cambio autorizado al final incorpora el contrato vigente local. SQL/runtime REQUIRES VALIDATION.

## Identificación

- Feature ID: FEAT-017.
- Objetivo: Apertura y cierre de turnos de caja dentro de la operación real de CMOR FLOW.
- Estado: AS-IS — CONFIRMADO (comportamiento local); despliegue DESCONOCIDO.
- Confianza: MEDIA para cadena completa; implementación citada confirmada, runtime/servicios externos no verificados.
- IDs de requisitos se referencian como FEAT-017/FR-001, FEAT-017/NFR-001, FEAT-017/SEC-F001 y FEAT-017/EDGE-001.

## Actores

Owner/cajero; mesero responsable opcional.

## Preconditions

Restaurante accesible; fondo inicial o conteo final y turno válido.

Punto de entrada y trigger: Panel de caja integrado en POS; /restaurant/cash resuelve Pos; acción del actor en pantalla o llamada del consumidor indicado.

## Functional Requirements

| ID | Comportamiento actual verificable | Certeza | Evidencia de implementación |
| --- | --- | --- | --- |
| FR-001 | open_cash_shift devuelve turno abierto existente sin duplicar en flujo secuencial; el responsable se pasa como waiter_id opcional. | CONFIRMADO | [src/services/cashShiftService.ts](<../../../../src/services/cashShiftService.ts>); [src/pages/restaurant/CashShift.tsx](<../../../../src/pages/restaurant/CashShift.tsx>); [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>) |
| FR-002 | close_cash_shift calcula totales server-side y devuelve sin recalcular un turno ya closed. | CONFIRMADO | [src/services/cashShiftService.ts](<../../../../src/services/cashShiftService.ts>); [src/pages/restaurant/CashShift.tsx](<../../../../src/pages/restaurant/CashShift.tsx>); [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>) |
| FR-003 | Preview suma sólo paid y excluye cancelled/rejected; métodos desconocidos caen en cash. expectedCash=fondo+ventas efectivo+propinas efectivo y diferencia=real-esperado. | CONFIRMADO | [src/services/cashShiftService.ts](<../../../../src/services/cashShiftService.ts>); [src/pages/restaurant/CashShift.tsx](<../../../../src/pages/restaurant/CashShift.tsx>); [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>) |

## Non-Functional Requirements

- NFR-001 — CONFIRMADO (mecanismo local, no objetivo de servicio): Preview consulta pedidos cada 30 segundos; histórico limitado a 50 turnos.
- TO-BE RECOMMENDATION: cualquier garantía adicional de rendimiento/disponibilidad necesita spec y medición; no se atribuye al sistema actual.

## Security Requirements

- SEC-F001 — AS-IS: RPC valida ownership; preview del navegador no es fuente autoritativa para cierre.
- SEC-F002 — TO-BE RECOMMENDATION, SEC-002/003/004/008/010/015: preservar o completar verificación server-side antes de modificar esta feature; denegar acceso a recursos ajenos y probar el rechazo. No implica que el control ya sea completo.
- Controles y riesgos relacionados: [SECURITY](../../SECURITY.md), [THREAT_MODEL](../../THREAT_MODEL.md).

## Main Flow

1. Desde POS el operador abre turno con fondo y responsable opcional.
2. La UI actualiza preview de ventas paid y consulta caja activa.
3. Al cerrar envía conteo; close_cash_shift calcula y persiste resumen; repetir cierre devuelve fila cerrada existente.

## Alternative Flows

Variación específica: Cerrar otra vez con conteo diferente. La RPC devuelve el cierre existente, no vuelve a ajustar diferencia.

Las ramas real/mock, proveedor o estado sólo aplican cuando se describen explícitamente arriba. No se presupone una variante funcional inexistente.

## Undesired Behavior

- Given: Pedido pendiente de pago.
- When: Se agrega al preview por método.
- Then: sumSalesByMethod lo excluye.

Ante error de red/base de datos, el retorno y manejo concreto están en los contratos citados en API; no hay un fallback uniforme entre servicios. Prueba de todas las ramas de error: MISSING.

### Casos negativos adicionales observables

- Caso 2 — CONFIRMADO. Given: Método de pago desconocido, status válido y paid. When: Se calcula preview. Then: Se suma en cash, no en categoría unknown.
- Caso 3 — CONFIRMADO. Given: Turno cerrado. When: Se repite close_cash_shift. Then: Retorna existente sin recalcular con conteo nuevo.

Evidencia: consumidores y contratos de esta feature en Evidence/API; no se ejecutaron contra sistemas externos.

## Edge Cases

- EDGE-001 — Condición: Cerrar otra vez con conteo diferente.
- Comportamiento actual: La RPC devuelve el cierre existente, no vuelve a ajustar diferencia.
- Comportamiento esperado según evidencia: el descrito, sin corregirlo por intuición; si consta REQUIERE VALIDACIÓN, no existe expectativa de negocio confirmada.
- Fuente: [src/services/cashShiftService.ts](<../../../../src/services/cashShiftService.ts>); [src/pages/restaurant/CashShift.tsx](<../../../../src/pages/restaurant/CashShift.tsx>); [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>); [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>).

## Data

| Tabla/concepto | Referencia |
| --- | --- |
| cash_shifts | DATA-008 |
| orders | DATA-026 |
| tips | DATA-040 |
| waiters | DATA-043 |

Inputs/outputs y campos importantes: [API_SPEC](../../API_SPEC.md), contratos API-051, API-086, API-129, API-142, API-143, API-149. Las validaciones de feature figuran en FR y casos negativos; columnas, defaults y constraints en [DATA_MODEL](../../DATA_MODEL.md).

## API

[API-051](../../API_SPEC.md#api-051), [API-086](../../API_SPEC.md#api-086), [API-129](../../API_SPEC.md#api-129), [API-142](../../API_SPEC.md#api-142), [API-143](../../API_SPEC.md#api-143), [API-149](../../API_SPEC.md#api-149)

Supabase Auth/Realtime/Storage son interfaces adicionales de proveedor cuando figuran en evidencia.

## Authorization

RPC valida ownership; preview del navegador no es fuente autoritativa para cierre.

Reglas de negocio relacionadas: [BR-017](../../BUSINESS_RULES.md#br-017). La UI no concede permisos al servidor. Grants y policies deben leerse cronológicamente, incluyendo revocaciones posteriores.

## Side Effects

Abre/cierra fila cash_shifts y persiste resumen de métodos/meseros; no envía cobros externos.

Eventos SQL/Realtime e integraciones: [ARCHITECTURE](../../ARCHITECTURE.md), [INTEGRATIONS](../../INTEGRATIONS.md). No se declara un bus de dominio inexistente.

## Failure Modes

Caso de rechazo confirmado: sumSalesByMethod lo excluye. Fallos parciales/concurrencia: Preview consulta pedidos cada 30 segundos; histórico limitado a 50 turnos. Efectos en sistemas externos no ejecutados: DESCONOCIDO.

## Observability

Auditoría SQL y logs únicamente cuando el consumidor citado los escribe. console.* no equivale a métricas ni al logger con redacción. [SECURITY](../../SECURITY.md) y [TESTING](../../TESTING.md) registran límites de evidencia.

## Tests

- [src/tests/unit/U19-cashShift.test.ts](<../../../../src/tests/unit/U19-cashShift.test.ts>)

Las pruebas anteriores son relacionadas a nivel feature, no cobertura completa de todos los FR. Estado de ejecución y qué prueban: [TESTING](../../TESTING.md). Integración real de RLS/Edge/proveedor: no ejecutada; REQUIERE VALIDACIÓN.

## Evidence

- [src/services/cashShiftService.ts](<../../../../src/services/cashShiftService.ts>)
- [src/pages/restaurant/CashShift.tsx](<../../../../src/pages/restaurant/CashShift.tsx>)
- [src/pages/restaurant/Pos.tsx](<../../../../src/pages/restaurant/Pos.tsx>)
- [supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>)

Fuentes adicionales por contrato/datos: [API_SPEC](../../API_SPEC.md), [SQL_CATALOG](../../SQL_CATALOG.md), [SOURCE_INVENTORY](../../SOURCE_INVENTORY.md). Las afirmaciones de implementación no certifican despliegue ni cumplimiento regulatorio.

## Alcance de modo mock

CONFIRMADO: config/supabase.ts declara isMockMode=false y sólo instancia cliente real. Las ramas legacy/mock de estas fuentes son evidencia histórica/test, no un fallback automático vigente. El README anterior contradice esta implementación.

## Postconditions

Al cerrar envía conteo; close_cash_shift calcula y persiste resumen; repetir cierre devuelve fila cerrada existente.

Resultado confirmado de implementación, no resultado observado en producción. Los efectos externos o fallos parciales no verificables se conservan como DESCONOCIDO/REQUIERE VALIDACIÓN.


## Cambio autorizado — 2026-10-06

- [TASK-006 — POS y pedidos](../../changes/TASK-006.md): FEAT-007/FR-240, FEAT-007/FR-241, FEAT-007/FR-242. Validación local PASS; despliegue UNKNOWN.
- [TASK-015 — Cierre SDD](../../changes/TASK-015.md): FEAT-024/FR-330, FEAT-024/FR-331, FEAT-024/FR-332. Validación local PASS; despliegue UNKNOWN.
