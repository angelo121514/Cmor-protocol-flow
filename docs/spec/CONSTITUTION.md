> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Constitución técnica de CMOR FLOW

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

Fecha: 2026-10-05. Baseline: `319a4d2a9bd88d2b1b16b3d61ef8ae7094a8948d`. Esta constitución distingue **AS-IS observado** de **TO-BE RECOMMENDATION**. Las normas propuestas necesitan adopción humana; esta documentación no modifica el sistema.

## A. Principios observados actualmente

| Principio | Certeza y evidencia | Límite |
|---|---|---|
| SPA React con servicios cliente y backend Supabase | CONFIRMADO: [App](../../src/App.tsx), [servicios](../../src/services/restaurantService.ts), [config](../../supabase/config.toml) | No existe separación universal controller/repository |
| Aislamiento por restaurante mediante membresías y RLS | CONFIRMADO como mecanismo: [multi_restaurant](../../supabase/migrations/20260101000007_multi_restaurant.sql) | Eficacia de `is_admin()` REQUIERE VALIDACIÓN, RISK-002 |
| Cálculo de pedidos en SQL | CONFIRMADO: [create_order/create_table_order](../../supabase/migrations/20260831000001_multi_country.sql) | Flag/fallback legacy sigue existiendo |
| Cierre de pedido exige pago | CONFIRMADO: [trigger payment_integrity](../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql) | No certifica que toda marca paid sea un pago externo conciliado |
| Protección de columnas sensibles por grants | CONFIRMADO: [hardening](../../supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql), [contabilidad](../../supabase/migrations/20260906000001_accounting_grant_hardening.sql) | Grants del despliegue y privilegios por defecto desconocidos |
| Numeración atómica, ajustes SQL e idempotencia en ciertas operaciones | CONFIRMADO: [numeración](../../supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql), [inventario](../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql), [TaxApiClient](../../supabase/functions/_shared/tax-client.ts) | No existe garantía global de idempotencia/transacciones |
| Pruebas y CI declarados | CONFIRMADO: [package.json](../../package.json), [CI](../../.github/workflows/ci.yml) | Jobs externos condicionales y preparación incompleta de tests |
| Logging y Sentry con redacción parcial | CONFIRMADO: [logger](../../src/utils/logger.ts), [instrumentation](../../src/instrumentation.ts) | `console.*` y ciertos mensajes no pasan por esa redacción |

## B. Principios constitucionales propuestos

**TO-BE RECOMMENDATION — no se presentan como enforcement actual.**

- Integridad funcional: toda modificación parte de una spec de cambio vinculada a FEAT/FR/NFR/SEC y preserva comportamientos confirmados, excepto cambios expresamente aprobados. Un bug confirmado se documenta AS-IS antes de proponer su reemplazo.
- Integridad del dominio y datos: conservar invariantes paid/completed, pertenencia de productos y sesión, estados de planes y constraints. Diseñar migraciones con rollback viable, validaciones y respaldo según el caso; documentar las irreversibles. No mezclar datos entre restaurantes/sucursales.
- Compatibilidad: revisar firmas RPC, subrutas Edge, proyecciones por columna, JSON de errores y enums antes de editar. Mantener parámetros legacy cuando lo exija una spec; documentar deprecaciones y breaking changes.
- Diseño: respetar responsabilidades vigentes mientras no haya una decisión explícita de arquitectura. Mantener las validaciones confiables en SQL/Edge, y experiencia de usuario en React; no deducir una capa DDD formal a partir del nombre de un servicio.
- Observabilidad: fallos de pago, autorización, cierres, privacidad y emisión deben distinguirse de resultados vacíos. Definir evidencia de auditoría y redacción antes de añadir telemetría.
- Trazabilidad: actualizar spec, código, regla, API, datos y tests en el mismo cambio. No renumerar IDs existentes; nuevos requisitos se añaden con IDs nuevos.

# Security Constitution

Normas **inegociables propuestas para modificaciones futuras**. La columna AS-IS de [SECURITY](SECURITY.md) determina si hoy están cumplidas, parcialmente cubiertas o ausentes.

| ID | Principio y obligación futura |
|---|---|
| SEC-001 | Denegación por defecto: recursos protegidos requieren autorización explícita; fallos al resolver identidad/permisos deben negar |
| SEC-002 | Autenticación obligatoria en interfaces privadas; nunca depender sólo de RequireRole |
| SEC-003 | Autorización server-side en SQL/Edge; service role obliga a comprobar actor y recurso antes de leer/escribir |
| SEC-004 | Aislamiento de restaurantes: ninguna lectura, escritura, borrado, exportación, inferencia o relación debe cruzar tenant sin permiso explícito del dominio |
| SEC-005 | Least privilege: grants de columnas/funciones/buckets y credenciales mínimos; revisar PUBLIC, anon, authenticated y privilegios por defecto |
| SEC-006 | Validar body/query/path/headers/cookies/archivos/eventos y respuestas de terceros en cada frontera; tipos TS no constituyen validación de runtime |
| SEC-007 | Gestión de secretos: prohibir credenciales hardcodeadas, en frontend, logs, repositorio o docs; citar sólo nombres de variables |
| SEC-008 | Protección IDOR: conocer un UUID no autoriza. Tokens capability deben tener alcance, expiración y rotación adecuados |
| SEC-009 | Operaciones sensibles: permisos explícitos para planes, bloqueos/borrados, cobros, cierres de caja, PIN, usuarios/invitaciones, exportación/erasure y credenciales/DTE/NC |
| SEC-010 | Fallos seguros: contador, validación o autorización fallidos no deben degradar a acceso/coste ilimitado; documentar recuperación legítima |
| SEC-011 | Errores públicos sin SQL, stack, secretos ni PII innecesaria; definir mensajes y status por contrato |
| SEC-012 | Dependencias externas no confiables: validar pago, importe, referencia, moneda y schemas antes de mutar estado; definir timeout y recuperación |
| SEC-013 | Webhooks: autenticidad según proveedor, anti-replay, conciliación, payload válido, claim/idempotencia y pruebas de duplicado/fallo parcial |
| SEC-014 | Auditoría: identificar acciones que requieren evidencia íntegra; evitar que una escritura pública suplante actor confiable |
| SEC-015 | No confiar en cliente: precios, roles, tenant, estado de pago, plan y límites críticos deben decidirse en capa confiable |

Adopción, excepciones con responsable/fecha y Definition of Done: [PLAN](PLAN.md). Esta constitución no afirma cumplimiento regulatorio.


## Cambio autorizado — principios exigidos

El usuario autorizó SEC-001–015 para estas modificaciones: autorización server-side, tenant, MFA admin, atomicidad/idempotencia, privacidad/fallos seguros. SQL nuevo y controles críticos comprobados localmente; SECURITY registra evidencia y riesgo residual. No equivale a adopción formal de nivel 5. Rollback desactiva/corrige hacia adelante sin restaurar accesos inseguros.
