> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Auditoría estática de seguridad

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

AS-IS, 2026-10-05. No se explotaron vulnerabilidades ni se accedió a sistemas externos. Severidad expresa impacto potencial condicionado al despliegue; ausencia de evidencia no demuestra seguridad. **CONTROL CONFIRMADO** significa mecanismo local encontrado, no control probado en producción.

## Fronteras e identidad

Supabase real es el cliente activo: [config/supabase.ts](../../src/config/supabase.ts) declara `isMockMode=false` y `createClient` con persistSession, autoRefreshToken y detectSessionInUrl. MockSupabaseClient permanece en tests y ramas legacy, pero no se importa allí. JWT se valida en handlers con getUser cuando corresponde. No existe cookie HttpOnly de aplicación demostrada; almacenamiento/persistencia del SDK no debe confundirse con una garantía de protección frente a XSS.

RequireRole es experiencia de navegación; no protege la API. SQL usa RLS y SECURITY DEFINER; Edge service role omite RLS. Los roles owner/staff/admin del perfil, metadata Auth, roles de mesero y tokens KDS son mecanismos diferentes.

## Controles reales

| Control | Estado actual | Evidencia | Riesgo | Constitución | Acción recomendada TO-BE |
|---|---|---|---|---|---|
| Guards y sesión | CONTROL CONFIRMADO en UI; server-side parcial | [useAuth](../../src/hooks/useAuth.ts), [RequireRole](../../src/components/RequireRole.tsx), [_shared authorization](../../supabase/functions/_shared/authorization.ts) | RISK-002 CRITICAL potencial | SEC-002/003/015 | Probar identidad y permisos en SQL/Edge separados de UI |
| Admin / helper RLS | CONTROL PARCIAL; semántica de current_user requiere validación | [is_admin](../../supabase/migrations/20260628000001_fix_is_admin_webhook.sql) | RISK-002 | SEC-001/003/004/005 | Verificar propietario de función y evaluar helper con actores aislados |
| Aislamiento por membresía | CONTROL PARCIAL | [is_my_restaurant](../../supabase/migrations/20260101000007_multi_restaurant.sql), [grants](../../supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql) | RISK-002/003 HIGH | SEC-004/008 | Validar todas las rutas directas/RPC/Edge y relaciones entre tenants |
| DSAR acceso/erase | CONTROL PARCIAL | [cors identity](../../supabase/functions/_shared/cors.ts), [verify-dsar](../../supabase/functions/verify-dsar/index.ts) | RISK-004/009 HIGH | SEC-002/006/008/010 | Claim atómico y verificación uniforme; nunca loggear token |
| Export por email | CONTROL AUSENTE de identidad en handler | [privacy-export](../../supabase/functions/privacy-export/index.ts), config verify_jwt=false | RISK-001 CRITICAL | SEC-002/003/008/009/011 | Exigir identidad demostrada antes de recolectar/entregar datos |
| Object/revoke-consent | CONTROL AUSENTE de identidad en handler | [object](../../supabase/functions/privacy-object/index.ts), [revoke](../../supabase/functions/privacy-revoke-consent/index.ts) | RISK-001 HIGH | SEC-003/008/009 | Verificar titular antes de revocar; rectificación directa sólo registra pending |
| Columnas de planes/roles/secrets | CONTROL CONFIRMADO en DDL | [hardening](../../supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql), [contabilidad](../../supabase/migrations/20260906000001_accounting_grant_hardening.sql) | RISK-005 MEDIUM | SEC-005/007 | Verificar grants acumulativos/defaults y permisos efectivos |
| Pago server-side | CONTROL PARCIAL | [order-pay](../../supabase/functions/order-pay/index.ts), [webhook Flow](../../supabase/functions/webhooks/flow/index.ts) | RISK-006 HIGH | SEC-009/012/013/015 | Reservar operación, comprobar writes y reconciliar fallos parciales |
| Webhook MP | CONTROL PARCIAL: firma opcional | [signatureValid](../../supabase/functions/mp-webhook/index.ts) | RISK-006 MEDIUM | SEC-012/013 | Configurar firma y validar replay, importe/referencia/moneda; mantener lookup remoto |
| KDS público | CONTROL CONFIRMADO de PIN/token/TTL/rate limit condicional | [hardening KDS](../../supabase/migrations/20260807020000_harden_public_kds_access.sql) | LOW; runtime no verificado | SEC-006/008 | Probar revocación, expiración y headers de IP confiables |
| Sesiones de mesa | CONTROL PARCIAL | [start_table_session](../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql) | RISK-003 HIGH | SEC-004/008 | No conceder token sólo por table_id conocido; revisar concurrencia y estado pendiente |
| Entrada y precios | CONTROL PARCIAL | [create_order](../../supabase/migrations/20260831000001_multi_country.sql), [trigger](../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql) | RISK-010 HIGH | SEC-006/015 | Mantener precios server-side y compatibilidad con shape/estado POS |
| Rate limits | CONTROL PARCIAL | cors.checkRateLimit, validate_public_order_write, AI isWithinAiRateLimit | RISK-011 MEDIUM | SEC-006/010 | Probar atomicidad, IP confiable y contador no disponible |
| CORS | CONTROL CONFIRMADO como header; no autenticación | [_shared/cors](../../supabase/functions/_shared/cors.ts) | LOW | SEC-002/003 | No usar Origin como identidad; probar handlers sin browser |
| CSP y headers | CONTROL CONFIRMADO en config, NO DETERMINABLE servidos | [vercel.json](../../vercel.json) | LOW | SEC-011 | Probar compatibilidad y headers en despliegue aprobado |
| Auditoría | CONTROL PARCIAL: append-only para app roles, inserción pública | [privacy foundation](../../supabase/migrations/20260101000002_privacy_foundation.sql), log_admin_action | RISK-005 MEDIUM | SEC-014 | Separar eventos no confiables de actor/evidencia confiables |
| Logs y telemetría | CONTROL PARCIAL | [logger](../../src/utils/logger.ts), [instrumentation](../../src/instrumentation.ts), DSAR sendEmail | RISK-004 HIGH | SEC-007/011 | Cubrir console, URLs de token y errores/mensajes libres |
| MFA admin | NO DETERMINABLE como enforcement | [metadata mfa_required](../../supabase/migrations/20260622000015_p2_15_force_mfa_admins.sql), deprecated (referencia histórica excluida de esta distribución) | RISK-012 MEDIUM | SEC-002/005 | Demostrar desafío MFA/AAL en rutas sensibles, no sólo flag metadata |
| Credencial tributaria | CONTROL CONFIRMADO local de AES-GCM, HMAC y grants | [accounting](../../supabase/functions/accounting/index.ts), [tax signing](../../supabase/functions/_shared/tax-signing.ts) | MEDIUM operacional | SEC-007/009/012 | Verificar custodia/rotación master key y autorización de NC/artefactos |

## Hallazgos y riesgos trazables

### RISK-001 — Exportación y revocación sin identidad

CRITICAL para confidencialidad; HIGH para alteración de consentimientos. **CONFIRMADO:** privacy-export recibe email, consulta con service role y entrega JSON/CSV sin getUser/verifyRequesterIdentity. Selecciona `restaurants(*)` e `invitations(*)`, por lo que puede incluir columnas sensibles si existen. Object/revoke-consent actualizan por email sin autenticar titular. Rectify crea una solicitud pending y no debe describirse como cambio directo de datos. FEAT-019; SEC-002/003/008/009/011. Exposición efectiva depende de despliegue, pero el defecto de control está en el handler.

### RISK-002 — current_user dentro de SECURITY DEFINER

CRITICAL potencial; **REQUIERE VALIDACIÓN** del propietario desplegado. is_admin es SECURITY DEFINER y retorna verdadero cuando current_user es service_role/postgres/supabase_admin, además del perfil admin. En ejecución SECURITY DEFINER current_user corresponde al propietario de la función: si éste pertenece a esa lista, la condición puede autorizar independientemente del caller. is_my_restaurant incluye OR is_admin, y numerosas policies/RPCs lo usan. No se verificó pg_proc/proowner ni se ejecutó explotación. FEAT-001/003/004 y todas las dependientes de RLS; SEC-001/003/004/005.

### RISK-003 — UUID de mesa concede sesión capability

HIGH, **CONFIRMADO** en contrato: start_table_session recibe p_table_id, devuelve session_token activo y no exige qr_token. IDs de mesas pueden ser devueltos por get_table_by_token; poseer ID no prueba autorización a cuenta de sesión. También sólo busca active: payment_pending puede permitir crear otra sesión para la misma mesa; carrera inicial no tiene claim comprobado. FEAT-014/015; SEC-008/004/009.

### RISK-004 — URLs con verification_token en logs

HIGH, **CONFIRMADO**: privacy-access/privacy-erase sendEmail loggean verificationUrl si falta RESEND_API_KEY. No se publica ningún valor de token real. El token autoriza acciones y no debe aparecer en logs. La redacción del frontend no protege console del backend. FEAT-019; SEC-007/011.

### RISK-005 — Evidencia de auditoría y grants acumulativos

MEDIUM, **CONFIRMADO** en DDL: audit_log_insert_any acepta INSERT con CHECK true y roles públicos tienen INSERT; actor_email/action son suministrables. Append-only no autentica autor. Consents permite inserción pública, por lo que tampoco prueba consentimiento auténtico. Grants posteriores por columnas no revocan automáticamente grants anteriores; verificar catálogo real. FEAT-019/024; SEC-005/014.

### RISK-006 — Pago y estados locales en pasos separados

HIGH/MEDIUM, **CONFIRMADO**: order-pay acepta payment_pending, crea pago externo antes del UPDATE local y no comprueba ciertos errores de INSERT/UPDATE. Flow carece de reserva local explícita de ese inicio; MP usa idempotency key por referencia pero inserción de intención sigue separada. Firma MP se omite si no hay secret; lookup remoto y conciliación existen y deben reconocerse como controles. FEAT-015; SEC-009/010/012/013.

### RISK-007 — Ledger de inventario al clamp y deducción concurrente

MEDIUM, **CONFIRMADO** de fórmula y **REQUIERE VALIDACIÓN** de concurrencia: RETURNING current_stock+v_needed después de GREATEST reconstruye un supuesto antes, no el stock previo real. Con 2 unidades y consumo de 5, queda 0 y movimiento -5, no -2. EXISTS de deducción previa no demuestra claim concurrente. FEAT-010; SEC-009/014, integridad de datos.

### RISK-008 — División y redondeo monetario

MEDIUM, **CONFIRMADO**: splitEqually usa Math.floor de unidades y validateSplitTotals tolera 1; moneda con centavos no cambia esos helpers. Propina POS usa round y QR ceil. No declarar explotación ni pérdida monetaria desplegada sin validar consumidores. FEAT-012/013/021.

### RISK-009 — DSAR parcial, schemas divergentes y carrera

HIGH, **CONFIRMADO** de secuencia: verify-dsar lee pending, marca in_progress, ejecuta, marca fulfilled y elimina token en llamadas independientes. Ejecutores de export/rectify/object difieren de endpoints directos; request_metadata/payload y purpose/scope no se usan uniformemente. Importa executeErase de un módulo que registra también Deno.serve; compatibilidad del bundle Deno REQUIERE VALIDACIÓN. Acceso auth.users mediante from no implica exposición del schema Auth. FEAT-019.

### RISK-010 — Contrato de pedido POS vs RPC

HIGH funcional/integridad, **CONFIRMADO**: create_order devuelve order_id/order_number/access_token y siempre inserta pending/pending. POS espera savedOrder.id y envía status/payment_status que wrapper RPC no pasa. Sin normalización adicional observable en createOrder, pueden faltar ID, pago/atribución/propina y seguimiento de pedido. Flag vigente/versiones desplegadas REQUIEREN VALIDACIÓN. FEAT-006/007/012/013/017/022.

### RISK-011 — Cuotas y límites con fallo permisivo/concurrencia

MEDIUM, **CONFIRMADO**: contador IA falla permitiendo uso, y count/insert no es reserva atómica. Límites por count de sucursales/platos tampoco acreditan concurrencia segura. Rate limits IP dependen de headers presentes y confianza de proxies. FEAT-004/005/006/020; SEC-010.

### RISK-012 — MFA y política de IA no acreditadas

MEDIUM, **NO DETERMINABLE/PARCIAL**: actualizar mfa_required en metadata no demuestra desafío MFA. En gatherData no se observa filtro de consentimiento ai_profiling; normalizar JSON no valida exhaustivamente respuesta del modelo. No se afirma cumplimiento legal. FEAT-001/019/020.

## Cobertura de otras categorías

- SQL injection: SDK parametriza operaciones y RPC reciben parámetros; no se identificó concatenación de SQL con entrada externa en las cadenas revisadas. Esto no demuestra inmunidad, especialmente en SQL dinámico/migraciones no ejecutadas.
- XSS: React usa renderizado de texto, CSP declarada y URLs de imágenes tienen checks SQL/cliente; no se acreditó sanitización universal ni protección de storage de sesión frente a scripts comprometidos.
- CSRF: APIs usan JWT/capabilities y CORS; no se demostró un esquema uniforme de cookies ni token CSRF de aplicación. NO DETERMINABLE para despliegue.
- SSRF: endpoints de proveedores se configuran en servidor; no se encontró URL arbitraria cliente que se use como destino de fetch de negocio revisado. No acredita control de red/egress.
- Archivos: validación image/* y tamaño UI, compresión y bucket limits/policies. Verificación binaria y limpieza de archivos abandonados no demostradas.
- Dependencias: manifest y lock inspeccionados; no se ejecutó npm audit porque accede a servicios externos. No se atribuyen CVEs sin evidencia local.
- Secretos: no se imprimieron valores de archivos privados; ejemplos/vectores de prueba no se clasifican automáticamente como credenciales reales. Una revisión por patrones no certifica ausencia de secretos. Ante detección real: `SECRET DETECTED — value intentionally omitted.`
- PII/retención: hay funciones y documentos locales, pero propagación de borrado a backups/proveedores, regiones y retención efectiva DESCONOCIDOS.

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

## RISK-013 — Dependencias de desarrollo vulnerables (ampliación TASK-016)

Impacto potencial: ejecución mediante plantillas Faker no confiables, agotamiento de recursos de parsers/build y lectura arbitraria vía servidor de mocks Vitest. Evidencia: auditoría npm inicial19 avisos (11 altos/8 moderados), package-lock anterior y actualización en FEAT-024/FR-347. No se demuestra explotación ni incidente. Responsabilidad técnica de corrección: Codex; actualización continua: administrador de cada instalación/CI. Confianza ALTA en inventario instalado, DESCONOCIDO estado desplegado. Criterio de cierre: auditoría sin avisos, lock reproducible, build/estilos/suites y CI aprobados; no basta cambiar una versión. Estado IN_PROGRESS hasta registrar resultados finales. SEC-007/014/015; [TASK-016](changes/TASK-016.md).

## RISK-014 — Firma de imagen privada por publicación ajena

Impacto potencial: owner B que conozca la ruta A podría enlazarla en su propia carta y habilitar firma mediante servicio privilegiado si GET sólo comprobara URL/publicación. Evidencia: API-234, menu-image GET y filtro restaurant_id añadido. Confianza ALTA en cadena local; no evidencia de explotación ni incidente. Responsable técnico: Codex; inventario/capacidades desplegadas: administrador de la instalación. Cierre local exige I13 con imagen A privada y publicación B→404, publicación A→302 y escrituras directas denegadas. Estado IN_PROGRESS hasta resultados finales. Residual: URL Storage legacy firmadas100 años requieren revisión operativa; no se afirma su revocación. SEC-004/008/014; FEAT-024/FR-348; [TASK-016](changes/TASK-016.md).

## Triaje vigente TASK-016

RISK-006: reserva tardía confirmada y proveedor único probados en I17/SQL34. RISK-013: npm0 y CI aprobados. RISK-014: publicación ajena y escrituras Storage denegadas en I13, ambas instalaciones. Confianza ALTA en reproducción; responsable de operación/aceptación: administrador del cliente. Criterio local satisfecho con comportamiento, prueba confiable, contrato y residual; estado productivo DESCONOCIDO. SEC-003/004/007/008/014/015. Sin indicios de incidente activo. Evidencia (referencia histórica excluida de esta distribución).
