> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Deuda técnica observable

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

AS-IS. Prioridades sugeridas son TO-BE RECOMMENDATION; ninguna corrección se implementó. No se considera deuda una preferencia de estilo sin impacto observable. Evidencia adicional y riesgos en SECURITY/AUDIT_REPORT.

| ID | Categoría | Descripción y evidencia | Impacto/riesgo | Feature | Prioridad |
|---|---|---|---|---|---|
| DEBT-001 | Seguridad | DSAR handlers directos sin identidad: privacy-export/object/revoke | Divulgación/alteración por email; RISK-001 | 019 | P0 |
| DEBT-002 | Seguridad/datos | is_admin SECURITY DEFINER con current_user privilegiado | Posible bypass sistémico según propietario; RISK-002 | transversal | P0 validación |
| DEBT-003 | Compatibilidad | create_order devuelve order_id y pending/pending; POS espera id/status/pago enviados | Pedido/cobro/propina/seguimiento incoherente; RISK-010 | 006/007/012/013 | P1 |
| DEBT-004 | Datos/config | useAuth.switchRestaurant actualiza columna revocada en profiles | Switch real puede fallar aunque mocks pasen | 004 | P1 |
| DEBT-005 | Datos/concurrencia | saveRecipe borra/reinserta ingredientes en llamadas separadas | Receta parcial ante fallo; no rollback conjunto | 005/010 | P1 |
| DEBT-006 | Datos/auditoría | Clamp stock y RETURNING reconstruyen before incorrecto; EXISTS de deducción no claim | Ledger incorrecto/deducción concurrente; RISK-007 | 010 | P1 |
| DEBT-007 | Integraciones | order-pay crea externo antes de writes, no comprueba todos los errores | Cobro/estado local divergente; RISK-006 | 015 | P1 |
| DEBT-008 | Testing | Integración RLS con beforeAll vacío/login comentado; S06 verifica objetos construidos | Falsa confianza si se presentan como pruebas de aislamiento/hash | 001/004/011 | P1 |
| DEBT-009 | Observabilidad | DSAR fallback imprime token URL; mensajes console/errores libres | Fuga capability/PII; RISK-004 | 019/024 | P1 |
| DEBT-010 | Mantenibilidad | Tipos manuales, DSAR status/payload/request_metadata/purpose/scope divergentes | Contratos desincronizados y ramas incompletas | 019 | P1 |
| DEBT-011 | Compatibilidad monetaria | Split usa enteros/tolerancia 1; propina round/ceil | Resultados inconsistentes en centavos | 012/013/021 | P2 |
| DEBT-012 | Performance | getDashboardStats descarga pedidos sin paginación; max_rows local 1000 | Totales potencialmente truncados y coste navegador | 023 | P2 |
| DEBT-013 | Observabilidad | Anomalías consultan acciones sin productor claro; query fallida se vuelve cero | Silencia fallos y no distingue ausencia de eventos | 024 | P2 |
| DEBT-014 | Documentación/config | README dice mock automático; supabase.ts usa sólo cliente real; .env.example incompleto | Setup engañoso y operaciones mal interpretadas | transversal | P2 |
| DEBT-015 | Integraciones/precios | Catálogo Webpay distinto de config/regional/Flow | Contratos de precio incompatibles según ruta | 015/018/021 | P1 validación |
| DEBT-016 | Infraestructura | Dispatch contable tiene URL de proyecto fija y depende de pg_cron existente | Portabilidad de entorno; despliegue no reproducido | 022 | P2 |
| DEBT-017 | Privacidad | Consentimiento registrado sin enforcement observado para IA; export select * | Minimización/alcance no acreditados | 019/020 | P1 |
| DEBT-018 | Código histórico | deprecated MFA sin consumidores actuales claros; tablas/users/logins legacy revocados | Confusión del modelo real y mantenimiento | 001/003 | P3; INFERIDO |

Fuentes navegables: [API](API_SPEC.md), [inventario](SOURCE_INVENTORY.md), [cronología SQL](SQL_CATALOG.md), [matriz](TRACEABILITY.md). Posibles componentes huérfanos se distinguen de componentes usados sólo por trigger/cron/test; no se sugiere borrado automático.


## Cambio autorizado — deudas

| Deuda | Implementación / evidencia | Estado |
| --- | --- | --- |
| DEBT-001 | [TASK-004](changes/TASK-004.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-002 | [TASK-003](changes/TASK-003.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-003 | [TASK-006](changes/TASK-006.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-004 | [TASK-007](changes/TASK-007.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-005 | [TASK-010](changes/TASK-010.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-006 | [TASK-010](changes/TASK-010.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-007 | [TASK-009](changes/TASK-009.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-008 | [TASK-002](changes/TASK-002.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-009 | [TASK-004](changes/TASK-004.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-010 | [TASK-004](changes/TASK-004.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-011 | [TASK-011](changes/TASK-011.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-012 | [TASK-013](changes/TASK-013.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-013 | [TASK-005](changes/TASK-005.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-014 | [TASK-014](changes/TASK-014.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-015 | [TASK-011](changes/TASK-011.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-016 | [TASK-014](changes/TASK-014.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-017 | [TASK-004](changes/TASK-004.md); [TASK-005](changes/TASK-005.md); [TASK-012](changes/TASK-012.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |
| DEBT-018 | [TASK-003](changes/TASK-003.md); [TASK-014](changes/TASK-014.md) | LOCAL VALIDATED; aceptación operativa y despliegue pendientes |

Resultados, alcance y residual: [VALIDATION_REPORT](VALIDATION_REPORT.md) / [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md).
