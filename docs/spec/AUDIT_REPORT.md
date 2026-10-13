> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Informe de reconstrucción y auditoría SDD

> **Cierre vigente:** validación local y CI completas, código `c31b9046da18c34134a9ffc5ab7998b4b8a30f56`. 320 unitarias; upgrade 54 y clean 52, 38 assertions SQL y9 recorridos privados por instalación; 6 recorridos públicos; 8 pruebas Python con ClamAV real por instalación. Lint/tipos/build/docs/SQL lint/auditoría aprobados. [CI](https://github.com/YOUR_ORG/CMOR-FLOW/actions/runs/37871166729); evidencia local (referencia histórica excluida de esta distribución); evidencia CI (referencia histórica excluida de esta distribución). Los resultados anteriores son históricos. Configuración real por el administrador del cliente; producción no verificada.

## Evidencia histórica y reconstrucción previa

> **Estado vigente 2026-10-08 — TASK-016 todavía en curso.** Pasaron320 pruebas unitarias,52 de integración,38 assertions pgTAP,8 pruebas Python con antivirus real y9 recorridos privados de navegador. La integración probó SQL34 sobre la instalación122 anterior: no sustituye certificar clean123 y baseline89→123. Docker Desktop dejó de responder y falla al iniciar por sailor-ingest.sock; la revisión automática rechazó eliminar ese socket, sin detalle adicional. No se restableció Docker ni se tocaron volúmenes. Certificación final de instalación, informes/CI remoto y commit pendientes. La configuración real queda al administrador de cada cliente por instrucción del usuario. Los resultados anteriores que siguen abajo son históricos. [Evidencia del seguimiento](FOLLOWUP_VALIDATION.json).

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

Fecha: 2026-10-05 (America/Santiago). Commit base: `319a4d2a9bd88d2b1b16b3d61ef8ae7094a8948d`. Estado inicial Git limpio. Evidencia local; sólo se crea documentación dentro de docs/spec. Resultado de controles documentales en [VALIDATION_REPORT](VALIDATION_REPORT.md).

## Executive Summary

CMOR FLOW combina SPA React/TypeScript/Vite con Supabase Auth, PostgREST, PostgreSQL/RLS/RPC, Storage y Realtime; Edge Deno orquesta pagos, privacidad, IA y contabilidad. La lógica está distribuida entre UI, servicios, SQL y handlers; no hay backend Node separado ni estructura DDD formal demostrada.

Se reconstruyeron 24 features con specs individuales, 20 documentos obligatorios y catálogos adicionales de fuentes, SQL y validación. El inventario API contiene contratos Edge/subrutas, funciones SQL candidatas RPC y operaciones cliente: **215 entradas iniciales**, no 215 endpoints independientes ni todos expuestos necesariamente. Una función trigger/interna no se vuelve pública por aparecer en ese inventario. DATA_MODEL conserva **43 declaraciones de tabla**, incluidas históricas/de transformación; no es un count del catálogo efectivo.

**Riesgos prioritarios:** export/consentimientos DSAR sin identidad en ciertos handlers; helper is_admin SECURITY DEFINER con current_user dependiente del propietario; capacidad de sesión de mesa por UUID; divergencia POS/create_order; pago y cambios locales separados. Estos hallazgos no se corrigieron ni se explotaron. [SECURITY](SECURITY.md) distingue controles presentes, parciales, ausentes y no determinables.

**Validación local:** 253 pruebas pasaron en 29 archivos seleccionados. No se ejecutaron suites conectadas ni E2E; no se midió cobertura actual. Las pruebas de mocks/texto no certifican permisos reales. [TESTING](TESTING.md).

## Confidence Level

**MEDIUM.** Evidencia fuerte de rutas, consumidores, handlers, DDL y pruebas locales; menor certeza de catálogo aplicado, propietarios/grants/policies efectivos, proveedores, jobs y decisiones de negocio. La extracción SQL conserva cronología y bloques dinámicos, pero no ejecuta ni materializa su resultado. Trazabilidad documental por feature no equivale a test específico de cada requisito.

## Well Understood Areas

- Rutas públicas y shells internos, identidad resuelta y consumidores directos de datos.
- Recálculo SQL de pedidos, desglose de impuesto bruto, numeración, restricciones y mecanismo Realtime espejo.
- Inventario/recetas, meseros, propinas, cuentas divididas y turnos, con diferencias entre helpers y operaciones atómicas.
- Mesa/sesión/pago y KDS con tokens distintos; TTL/rate limits declarados.
- Contabilidad: cifrado, HMAC, write-ahead, referencias, reconciliación y cron declarados; helpers localmente probados.

## Ambiguous Areas

- Rol/grants efectivos de functions/policies y current_user de is_admin; herencia de default privileges.
- Propagación de planes, precios y estado pagado entre catálogo, pasarelas y consumidores POS.
- Semántica esperada de selección activa vs restaurante primario, capacidades de mesas y concurrentes.
- DSAR payload/metadata, stubs, schema Auth y consistencia entre rutas verificadas/directas.
- Qué decisiones comerciales/legales pretende imponer el texto promocional, documentos de privacidad y configuración regional.

## Unknowns

Producción/staging: migraciones aplicadas, catálogo/owner, versiones, secrets, endpoints desplegados, config gateway JWT, cron activo, telemetría/alertas, restore probado, volumen/tráfico, SLA, regiones/custodia de datos y contratos externos. No se sabe si Mercado Pago/Webpay/motor/Resend están configurados actualmente. No se consultaron servicios externos.

## Human Validation Required

1. ¿Quién es propietario de is_admin y qué retorna para anónimo/owner/admin en una base aislada con grants equivalentes al despliegue?
2. ¿Qué migraciones/config son baseline oficial y cuál es el catálogo efectivo de policies, columnas, EXECUTE y privilegios por defecto?
3. ¿Debe todo derecho DSAR exigir identidad antes de recolectar o mutar datos? ¿Quién valida rectificación y cumplimiento real de SLA/retención?
4. ¿Se usa actualmente create_order para POS y cuál es el contrato normalizado esperado para id/order_id, estado y pago?
5. ¿Cómo se selecciona sucursal activa con grants actuales, y debe heredarse del primario o del seleccionado?
6. ¿Basta un table_id para obtener cuenta de mesa, y qué debe ocurrir al iniciar sesión durante payment_pending o simultáneamente?
7. ¿Cuáles son precios/catálogos oficiales por país/proveedor, disponibilidad de tarjeta/PIX/Flow y reglas de centavos/propinas/división?
8. ¿Qué operaciones deben tener auditoría confiable y MFA exigida, y qué producers alimentan anomalías/notificaciones?
9. ¿Quién opera master key/credenciales tributarias y cron, y cuál es el procedimiento probado de rotación/recuperación?

## Inconsistencies

| Evidencia A | Evidencia B | Conclusión |
|---|---|---|
| README promete mock automático sin env | supabase.ts declara mock desactivado y createClient real | CONFIRMADO drift de setup |
| switchRestaurant actualiza profiles.restaurant_id | hardening sólo concede UPDATE display_name | CONFIRMADO incompatibilidad declarada; runtime requiere validación |
| POS envía status/pago y lee savedOrder.id | create_order wrapper omite esos estados; retorna order_id y pending/pending | CONFIRMADO contrato divergente RISK-010 |
| Comentario sucursal dice restaurante activo | SQL consulta is_primary=true | CONFIRMADO herencia del primario |
| DsarStatus TS omite pending_verification/expired | handlers los escriben | CONFIRMADO contrato de tipos divergente |
| Rutas DSAR directas usan payload.fields/scope | verify-dsar usa request_metadata, purpose y executors incompletos | CONFIRMADO caminos distintos |
| Comentarios dicen movimiento real al clamp | RETURNING stock_final+needed produce descuento solicitado | CONFIRMADO fórmula divergente |
| Catálogo APP_CONFIG/Flow actual | PLANS de Webpay mantiene precios diferentes | CONFIRMADO divergencia; consumidor oficial requiere validación |
| Metadata mfa_required y docs hablan MFA | No enforcement AAL/desafío probado; componente deprecado | REQUIERE VALIDACIÓN, flag no demuestra control |
| .env.example listado parcial | Variables usadas por MP/Webpay/accounting/invitaciones no presentes | CONFIRMADO ejemplo incompleto |
| Nuevas funciones mp-checkout/mp-webhook | No bloques de verify_jwt en config.toml | REQUIERE VALIDACIÓN del gateway desplegado para rutas públicas |

Fuentes navegables en [SECURITY](SECURITY.md), [FEATURES](FEATURES.md), [API_SPEC](API_SPEC.md), [SQL_CATALOG](SQL_CATALOG.md) y [SOURCE_INVENTORY](SOURCE_INVENTORY.md).

## Security Findings

RISK-001 es el defecto de identidad más directo. RISK-002 puede afectar el aislamiento global según propietario efectivo. RISK-003/004/006/009/010 afectan capacidades, secretos en logs, pagos, derechos y coherencia de pedidos. No se afirma que controles ausentes hayan sido explotados. El código también implementa controles relevantes: RLS/membresías, grants por columna, recálculo de precios, claims Flow, KDS TTL/PIN, AES-GCM/HMAC e idempotencia contable.

## Testing Gaps

RLS integración tiene fixtures de preparación vacíos/login comentado en I01; S06 comprueba objetos construidos y no SQL; Flow firma espejo local. Contratos completos POS/RPC, DSAR, grants y carreras/pagos externos no quedan certificados por las 253 pruebas. Coverage histórico no se presenta como medición vigente. [TESTING](TESTING.md) prioriza pruebas futuras.

## Technical Debt

Seguridad DSAR/helper, switch/shape POS, operaciones multillamada sin rollback conjunto, tipos manuales, ledger stock clamp, reportes sin paginación uniforme, señales de anomalía con fallback cero y docs/env drift. [TECHNICAL_DEBT](TECHNICAL_DEBT.md) registra impacto/evidencia/prioridad; no se recomienda reescribir por estilo.

## Orphan Components

- **INFERIDO:** deprecated/MFASetup y mfaService sin consumidores activos claros; README deprecated registra aislamiento previo, no borrado autorizado.
- **CONFIRMADO histórico:** users/admin_users y login RPC legacy se mantienen en historia, con revocaciones posteriores. No llamar «tabla huérfana» sin verificar llamadas SQL o administración externa.
- **REQUIERE VALIDACIÓN:** create-payment-intent/Webpay con catálogo alternativo y sin consumer frontend actual claro; tests/healthcheck sí referencian esa superficie.
- **REQUIERE VALIDACIÓN:** flow_coupons, tablas/fuentes históricas, acciones de anomalías y productores de notificaciones. Falta de from() directo no elimina uso SQL/cron.
- **No huérfanos:** CashShift está embebido en Pos, AiChatbot se monta en CustomerMenu, mockSupabase lo usan tests; orders_events y accounting_cron_secret tienen productores/consumidores técnicos.

## Documentation Drift

README refleja fases antiguas, rutas incompletas y mock automático. SQL históricos cambian trial de 30/15 días frente a 14 vigente. Auditorías/ch[AUTOR]gs previos son evidencia temporal, no conclusiones actuales automáticamente. Comentarios sobre particiones, seguridad o despliegue no reemplazan las definiciones/catálogo real. Los documentos previos no fueron editados; contradicciones quedan aquí.

## Recommended Next Steps

**TO-BE RECOMMENDATION:** validar primero is_admin/grants y DSAR; acordar specs de corrección para identidad, capacidades y contratos POS/pago; preparar integración PostgreSQL local con fixtures reales; reconciliar baseline SQL/config de despliegue y precios; adoptar constitución/owners/DoD; añadir pruebas específicas a FR/SEC y checks de trazabilidad; sólo entonces implementar mediante TASKS y rollout autorizado.

## SDD READINESS

**3 — Features y requisitos trazables.** Se dispone de especificación local, seguridad, catálogos y vínculos a código; las lagunas se explicitan. No corresponde nivel 4 porque faltan validación fiable de controles críticos y pruebas específicas de numerosas cadenas/requisitos. Para nivel 5, además faltan adopción formal, owners, revisión de specs antes de cambios y enforcement de gobernanza/CI.

## Cambio autorizado — triaje final

Sin evidencia de incidente activo. Las secciones anteriores registran impacto potencial del baseline; esta tabla describe el delta probado. No se consultaron logs de producción. La skill IR aporta impacto, evidencia, confianza, responsable y criterio de cierre; ninguna notificación externa se inició.

| Hallazgo | Evidencia / constitución | Confianza | Responsable | Estado / cierre |
| --- | --- | --- | --- | --- |
| RISK-001 | [TASK-004](changes/TASK-004.md); SEC-002, SEC-003, SEC-004, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011, SEC-014 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-002 | [TASK-003](changes/TASK-003.md); SEC-001, SEC-002, SEC-003, SEC-004, SEC-005, SEC-009, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-003 | [TASK-008](changes/TASK-008.md); SEC-004, SEC-008, SEC-009, SEC-010, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-004 | [TASK-004](changes/TASK-004.md); SEC-002, SEC-003, SEC-004, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011, SEC-014 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-005 | [TASK-005](changes/TASK-005.md); SEC-007, SEC-014, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-006 | [TASK-009](changes/TASK-009.md); SEC-007, SEC-009, SEC-010, SEC-011, SEC-012, SEC-013, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-007 | [TASK-010](changes/TASK-010.md); SEC-003, SEC-004, SEC-010, SEC-014, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-008 | [TASK-011](changes/TASK-011.md); SEC-006, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-009 | [TASK-004](changes/TASK-004.md); SEC-002, SEC-003, SEC-004, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011, SEC-014 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-010 | [TASK-006](changes/TASK-006.md); SEC-003, SEC-004, SEC-006, SEC-009, SEC-010, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-011 | [TASK-007](changes/TASK-007.md); [TASK-012](changes/TASK-012.md); SEC-001, SEC-003, SEC-004, SEC-005, SEC-006, SEC-010, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |
| RISK-012 | [TASK-003](changes/TASK-003.md); [TASK-012](changes/TASK-012.md); SEC-001, SEC-002, SEC-003, SEC-004, SEC-005, SEC-006, SEC-009, SEC-010, SEC-015 | ALTA en comportamiento local; impacto del baseline conservado arriba | Codex implementación/validación; operador técnico/seguridad/privacidad por designar | MITIGATED_LOCAL_VALIDATED; cierre operativo pendiente; residual en spec y estado |

Pruebas concretas por dominio: [VALIDATION_REPORT](VALIDATION_REPORT.md); contratos API-216–245, datos DATA-044–059 y reglas BR-047–060 en sus documentos canónicos. Cierre operativo exige responsable nominado y aceptación residual; local validado no significa desplegado/verificado. [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md).

## Entrega final en 15 puntos

1. Baseline y working tree preservados;89 históricas intactas y30 nuevas.
2. React/Vite/TypeScript/Supabase mantenidos; cambios incrementales TASK-002–015.
3. Identidad SQL/Edge deriva JWT validado; humanos y automatizaciones separados.
4. Admin requiere MFA real, enrolamiento/desafío y recovery probado sin bypass.
5. DSAR seis derechos verifican identidad; tokens hash24h/claim y rectificación administrativa.
6. Auditoría transaccional y consentimientos con identidad servidor; señales browser sin confianza.
7. POS persiste accepted/paid, CRM/propina/división/caja en transacciones e idempotencia.
8. Sucursales por membresía; herencia, límites y borradores aislados.
9. QR válido comparte cuenta; UUID no concede sesión; pago/rotación/cierre revocan capacidades.
10. Pagos reservados antes de proveedor, callbacks conciliados; cancelación repetida reutilizada.
11. Stock insuficiente vende, registra descuento real y faltante; receta/claim concurrentes.
12. Moneda en unidades mínimas, impuesto bruto, redondeo mitad arriba, catálogo común y límites atómicos; IA externa off.
13. Reportes SQL con 1251 registros, paginación, errores visibles; cron/DTE/Storage probados con simuladores.
14. Evidencia y residual en LOCAL_VALIDATION/VALIDATION_REPORT/CHANGE_REGISTRY; CI obligatorio configurado, sin ejecución remota.
15. SDD READINESS4 local; nivel 5/operación pendientes. Despliegue, responsables, catálogo real, retención, MFA/outbox y logs históricos requieren operador. Sin incidente activo demostrado.

## RISK-013 — Dependencias de desarrollo vulnerables (ampliación TASK-016)

Impacto potencial: ejecución mediante plantillas Faker no confiables, agotamiento de recursos de parsers/build y lectura arbitraria vía servidor de mocks Vitest. Evidencia: auditoría npm inicial19 avisos (11 altos/8 moderados), package-lock anterior y actualización en FEAT-024/FR-347. No se demuestra explotación ni incidente. Responsabilidad técnica de corrección: Codex; actualización continua: administrador de cada instalación/CI. Confianza ALTA en inventario instalado, DESCONOCIDO estado desplegado. Criterio de cierre: auditoría sin avisos, lock reproducible, build/estilos/suites y CI aprobados; no basta cambiar una versión. Estado IN_PROGRESS hasta registrar resultados finales. SEC-007/014/015; [TASK-016](changes/TASK-016.md).

## RISK-014 — Firma de imagen privada por publicación ajena

Impacto potencial: owner B que conozca la ruta A podría enlazarla en su propia carta y habilitar firma mediante servicio privilegiado si GET sólo comprobara URL/publicación. Evidencia: API-234, menu-image GET y filtro restaurant_id añadido. Confianza ALTA en cadena local; no evidencia de explotación ni incidente. Responsable técnico: Codex; inventario/capacidades desplegadas: administrador de la instalación. Cierre local exige I13 con imagen A privada y publicación B→404, publicación A→302 y escrituras directas denegadas. Estado IN_PROGRESS hasta resultados finales. Residual: URL Storage legacy firmadas100 años requieren revisión operativa; no se afirma su revocación. SEC-004/008/014; FEAT-024/FR-348; [TASK-016](changes/TASK-016.md).

## Triaje vigente TASK-016

RISK-006: reserva tardía confirmada y proveedor único probados en I17/SQL34. RISK-013: npm0 y CI aprobados. RISK-014: publicación ajena y escrituras Storage denegadas en I13, ambas instalaciones. Confianza ALTA en reproducción; responsable de operación/aceptación: administrador del cliente. Criterio local satisfecho con comportamiento, prueba confiable, contrato y residual; estado productivo DESCONOCIDO. SEC-003/004/007/008/014/015. Sin indicios de incidente activo. Evidencia (referencia histórica excluida de esta distribución).


## Entrega vigente en 15 puntos

1. Baseline preservado:89 migraciones intactas y34 nuevas, 123 totales.
2. React/Vite/TypeScript/Supabase mantenidos; paquetes TASK-002–016 trazados.
3. Identidad JWT y automatizaciones separadas; permisos y relaciones verificados.
4. MFA admin real y recuperación administrativa; owners voluntario.
5. Seis derechos DSAR verificados, hash24h/claim, exportación y revisión administrativa.
6. Auditoría transaccional e identidad servidor; browser_signal no confiable.
7. POS accepted/paid, CRM/propina/división/caja atómicos e idempotentes.
8. Sucursales por membresía, límites y borradores aislados.
9. QR válido comparte cuenta; UUID aislado no concede acceso, rotación/cierre revocan.
10. Reserva/conciliación de pagos y clientes; firma, replay y timeout probados con proveedores simulados.
11. Stock insuficiente vende, registra descuento real y faltante; receta/claim atómicos.
12. Dinero mínimo, mitad arriba, impuesto bruto y catálogo común; IA externa ai_disabled.
13. Reportes/facturación1251, errores visibles, cron/DTE simulados e imágenes con antivirus real.
14. Commit/PR y CI aprobados;320 unitarias,54 upgrade,52 clean,9 recorridos privados por instalación y6 públicos;38 assertions SQL por instalación.
15. SDD READINESS4 local/CI; administrador configura cada cliente. Nivel 5 y producción requieren adopción/despliegue/verificación separados.
