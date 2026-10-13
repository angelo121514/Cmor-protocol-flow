> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Plan técnico para futuras modificaciones mediante SDD

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

**TO-BE RECOMMENDATION.** Este documento gobierna cambios futuros si los responsables lo adoptan. No es un plan de reescritura ni autoriza ejecutar las recomendaciones de auditoría.

## Arquitectura técnica vigente y fronteras

Respetar React/Vite con servicios y consumidores directos existentes; Supabase Auth/PostgREST/SQL/RLS/Storage/Realtime y Edge Deno para integraciones. Documentar una decisión explícita antes de mover responsabilidades. [ARCHITECTURE](ARCHITECTURE.md) describe AS-IS; no introducir controllers/repositories ficticios en las specs.

- UI: interacción, feedback, estado/borradores, formato regional y validación de experiencia.
- SQL/RLS/grants: permisos de datos, integridad, recálculo de pedido, estados críticos, constraints y operaciones atómicas existentes.
- Edge: autenticidad de actor/capability, límites de entrada y proveedor, orchestration, manejo de secretos e integraciones con service role.
- Motor tributario/pago/Auth: contratos externos; no cambiar su supuesto de comportamiento sin evidencia y una spec de integración.

## Decisiones antes de modificar una feature

1. Elegir FEAT e identificar FR/NFR/SEC/EDGE actuales y consumidores por TRACEABILITY/API/DATA_MODEL. Resolver contradicciones relevantes de AUDIT_REPORT con responsable de negocio/técnico; conservar desconocidos no bloqueantes explícitos.
2. Escribir spec de cambio con antes/después, objetivo, actor, aceptación, reglas, datos, APIs, fallos y regresiones. Clasificar bug fix, feature, cambio de contrato o migración. IDs existentes no se reutilizan para comportamientos diferentes.
3. Definir módulo confiable de cada validación y efecto. Decidir atomicidad, idempotencia, concurrencia y compensación antes de implementar llamadas múltiples. No prometer rollback de proveedor externo mediante transacción local.
4. Elegir pruebas que demostrarán el cambio y fallos; diferenciar unit/mock, contrato, integración PostgreSQL aislada y E2E. Acordar entorno/datos antes de acciones externas.
5. Crear tareas con plantilla TASKS y enlazar spec, regla, implementación, tests y riesgos. La implementación sólo empieza tras acordar el cambio concreto.

## Integridad del dominio y datos

Preservar completed⇒paid, vínculo de items con restaurante, cálculo de precio bruto/tasa efectiva, snapshots de pedido, pertenencia de sesiones y referencias contables. Reexaminar límites secuenciales ante concurrencia y campos denormalizados sin FK. No convertir un comportamiento erróneo AS-IS en norma deseable por documentarlo.

Cambios de schemas: comparar migraciones y catálogo efectivo antes de decidir; identificar grants/default privileges/RLS/triggers y consumidores de cada columna. Mantener orden de migraciones y compatibilidad con datos previos. Definir backfill, constraints, verificación de filas y rollback cuando viable. Si rollback no es seguro, documentar recuperación y responsable. Los SQL históricos no reemplazan esa evaluación. No usar comentarios sobre producción como prueba del catálogo.

## Seguridad e integraciones

Cumplir [Security Constitution](CONSTITUTION.md): permisos server-side por actor/recurso/tenant, least privilege y denegación ante error. Revisar owner/security context de funciones SQL privilegiadas; verificar service role rutas individualmente. UUID conocido no es permiso; capabilities necesitan alcance, TTL/rotación y revocación especificados.

No incluir secretos ni PII innecesaria en logs/tests/docs. Inputs/respuestas externas necesitan validación runtime. Pagos/DSAR/DTE requieren definir replay, claim/idempotencia, control de fallos parciales, restricciones de moneda/importe/referencia y auditoría confiable. Cambios en cuota/retención requieren política de fallos y capacidad medible.

## APIs y compatibilidad

Especificar método, path, body/query/headers, respuesta y error por rama, roles, tenant y side effects. Considerar PostgREST/table/RPC como contratos públicos aunque no haya controller. Revisar order_id/id, estados JSON y HTTP 200 con success=false; no normalizar silenciosamente un contrato sin evaluar consumidores. Mantener parámetros ignorados por compatibilidad sólo si la spec lo pide.

Versionar o acordar breaking changes; probar consumidores actuales. Para nuevas columnas, revisar grants por columna y SELECT explícitos antes de desplegar. Para Realtime, considerar el espejo y fallback, no sólo tabla orders.

## Testing, observabilidad y rollout

Usar estrategia de TESTING. Cambios de permisos requieren negativos owner A/B/anónimo/admin y ownership de relaciones; monetarios requieren centavos/redondeo; tiempo requiere límites de fecha/expiración y zonas; integraciones requieren duplicado, timeout, tercero inesperado y fallo posterior al efecto externo.

Definir logs/métricas/auditoría con actor y correlación seguros; distinguir cero/vacío de error. Identificar feature flags y estados de rollout/rollback sin inventar plataformas. Verificar primero localmente y desplegar en entorno autorizado con validación de grants/migraciones/secretos, observación de errores y plan de recuperación.

## Definition of Done propuesta

- Spec de cambio aprobada por responsables y trazada a IDs existentes/nuevos.
- Implementación respeta AS-IS que la spec preserva y documenta los cambios intencionales.
- Pruebas de comportamiento, rechazo, límites, seguridad y regresión pertinentes pasan; omitidas tienen razón explícita.
- Contratos, datos, grants/RLS y efectos se verifican en el nivel confiable; no sólo mocks/guard UI.
- Secretos no expuestos; auditoría/errores/redacción comprobados en operaciones sensibles.
- Docs e índice/matriz actualizados, riesgo residual y validación humana registrados.
- Compatibilidad, migración/rollback y observación posterior definidos cuando aplican.

Adoptar estas reglas formalmente, asignar owners de specs y automatizar checks documentales es trabajo futuro. No se modificó CI para hacerlas obligatorias en esta fase.


## Cambio autorizado — secuencia y gates

TASK-002 → TASK-003/004/005 → TASK-011/007/010 → TASK-006/008/009/012 → TASK-013/014 → TASK-015. Código consumidor preparado; gates locales completos según VALIDATION_REPORT; ejecución operativa pendiente. Exigir clean/upgrade/backfill, permisos reales/pruebas negativas. DoD: requisito+prueba confiable+contrato+residual+responsable; exigir gates verdes y aceptación operativa. No despliegue. [Manifiesto](DEPLOYMENT_MANIFEST.md).


Estado vigente: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), evidencia LOCAL_VALIDATION (referencia histórica excluida de esta distribución).
