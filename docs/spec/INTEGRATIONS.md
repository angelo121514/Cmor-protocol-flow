> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Integraciones externas y configuración

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

AS-IS. Se inspeccionó código, no se consultaron proveedores. Nombres de variables sin valores. Contratos externos reales, cuentas, regiones, secretos y rate limits operativos DESCONOCIDOS salvo constantes locales. Cualquier comentario que diga configurado/no configurado no demuestra el estado actual del proveedor.

| Servicio | Propósito/features | SDK/cliente y autenticación | Interfaz, payload/retorno | Fallos, timeout, retry e idempotencia |
|---|---|---|---|---|
| Supabase Auth | Identidad, invitaciones y correo FEAT-001/002 | supabase-js; anon/JWT cliente, service role servidor | password/OAuth, getUser, sesión, updateUser, inviteUserByEmail, consume_invitation complementa SQL | Errores SDK; persistSession/autoRefresh/detectSession; políticas efectivas de Auth no verificadas |
| Supabase DB/PostgREST | CRUD/RPC, RLS y membresías múltiples | SDK con apikey/JWT, SQL privileges | Tablas y RPC de [API_SPEC](API_SPEC.md); respuestas data/error/count | Límites/proyección/grants influyen; max_rows local 1000; atomicidad sólo dentro de operaciones SQL/transacciones comprobadas |
| Supabase Realtime | Pedidos, carta/listados FEAT-003/005/006/016 | channels postgres_changes | orders_events snapshots; menu_items/restaurants | Pedido refetch 30s; no SLA/entrega exactamente una vez |
| Supabase Storage | Imágenes de carta FEAT-005 | SDK, bucket menu-images | JPEG comprimido, upload y createSignedUrl | Sin retry general confirmado; signed URL de 100 años; objetos abandonados sin limpieza acreditada |
| Flow | Registro Chile, tarjeta, planes, suscripciones y cuenta mesa FEAT-015/018 | FlowApiClient WebCrypto HMAC-SHA256 de claves ordenadas | payment/create, payment/getStatus; customer/create/register/registerStatus/unRegister; plan/create; subscription/create/cancel/get según consumidores | API URL por defecto sandbox; parseo JSON y throw, sin timeout/retry general; webhook consulta remoto y claim SQL de token |
| Mercado Pago | Checkout y cuenta BR/PE FEAT-015/021 | MercadoPagoApiClient, Bearer servidor | POST /v1/payments: amount, description, payment_method_id, payer.email, external_reference, notification_url; GET /v1/payments/{id} | Sin token createPayment retorna null; idempotency key=externalReference; sin timeout/retry explícito; firma webhook opcional |
| Transbank Webpay | Ruta de pago alternativa/legacy FEAT-015 | fetch con Tbk-Api-Key-Id/Secret | POST transacciones v1.2 con buy_order/session_id/amount/return_url; callback consulta/commit | Sin credenciales falla cerrado; muchos errores con HTTP 200; catálogo difiere de planes actuales, consumer vigente REQUIERE VALIDACIÓN |
| cmorflow-tax-api | DTE 33/39, NC 61, estado y artifacts Chile FEAT-022 | TaxApiClient; HMAC, timestamp, nonce, API key; credencial AES-GCM local | /dtes, /dtes/{id}, externalReference, /credit-notes, /artifact-links; pricingMode GROSS y receptor | 30s por intento, máximo 2 intentos; re-firma nonce y misma Idempotency-Key; queued/reconciliación y URLs temporales según cliente |
| OpenRouter | Recomendaciones negocio FEAT-020 | fetch Bearer OPENROUTER_API_KEY | /api/v1/chat/completions, modelo configurado deepseek/deepseek-v4-flash; JSON recommendations | No timeout/retry explícito; parsea/normaliza enums y strings; contador fail-open; no certifica disponibilidad real del modelo |
| Resend | Email de verificación DSAR FEAT-019 | fetch API key servidor | Email con verificationUrl; access/erase sendEmail | Si falta key sólo loggea URL; no envío efectivo y fuga capability RISK-004; entrega/retry no verificados |
| Sentry | Frontend trazas/errores/replay FEAT-024 | @sentry/react y DSN | release, errores, contextos y breadcrumbs con redacción parcial | Sólo inicia con DSN HTTPS; exclusiones de errores; no se demuestra cobertura de console/Edge |
| GitHub Actions / Slack | CI, healthcheck, monitor y backups FEAT-024 | Actions, secrets; Slack webhook | Workflows y scripts versionados; backup artifacts | Schedules/config confirmados, ejecución/restore/despacho no verificados; ninguna notificación enviada en esta auditoría |

Fuentes: [_shared Flow](../../supabase/functions/_shared/flow-client.ts), [_shared MP](../../supabase/functions/_shared/mp-client.ts), [TaxApiClient](../../supabase/functions/_shared/tax-client.ts), [tax signing](../../supabase/functions/_shared/tax-signing.ts), [AI handler](../../supabase/functions/ai-recommendations/index.ts), [ImageDropZone](../../src/components/ImageDropZone.tsx), [CI](../../.github/workflows/ci.yml). Payloads y códigos por rama en API_SPEC.

## Configuración por frontera

- Cliente Vite: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN, VITE_APP_VERSION. La anon key identifica proyecto/API y no concede acceso a datos privados sin permisos; nunca sustituirla por service role. Variables VITE se incluyen en frontend.
- Edge comunes: SUPABASE_URL, SUPABASE_SERVICE_ROLE o SUPABASE_SERVICE_ROLE_KEY; algunas funciones SUPABASE_ANON_KEY; APP_URL/PUBLIC_APP_URL para retornos/invitaciones, INTERNAL_FUNCTION_SECRET para invite-owner.
- Pagos: FLOW_API_KEY/FLOW_SECRET_KEY/FLOW_API_URL; MERCADO_PAGO_ACCESS_TOKEN/MERCADO_PAGO_API_URL/MERCADO_PAGO_WEBHOOK_SECRET; WEBPAY_COMMERCE_CODE/WEBPAY_API_KEY/WEBPAY_ENVIRONMENT.
- IA/correo: OPENROUTER_API_KEY y RESEND_API_KEY. Credenciales no configuradas generan comportamientos distintos: IA falla, DSAR puede quedar pendiente y loggear URL.
- Contabilidad: TAX_API_BASE_URL y ACCOUNTING_MASTER_KEY. Cron secret se genera en tabla accounting_cron_secret, no en una variable de frontend. Dispatch contiene URL del proyecto fijada en SQL; portabilidad REQUIERE VALIDACIÓN.
- Operación: APP_VERSION/APP_ENV en healthcheck; SUPABASE_DB_PASSWORD/SUPABASE_PROJECT_REF y otras variables referenciadas en scripts/workflows; SLACK_WEBHOOK_URL para notificación. Secrets de CI/E2E se describen en TESTING, nunca se publican.

`.env.example` no es inventario completo: no incluye todos los nombres usados por contabilidad, Mercado Pago, Webpay e invitaciones. **CONFIRMADO:** diferencia reconstruible al comparar [ejemplo](../../.env.example) y consumidores. No se editó configuración.

## Callbacks y límites de confianza

Flow: el router `/webhooks/flow` separa return del navegador de confirmación mutante y usa estado del proveedor más claim. Mercado Pago: `/mp-webhook`, firma con tolerancia 5 minutos cuando hay secreto y lookup remoto; no describir la firma como obligatoria actual. Webpay: token callback/commit y conciliación; no afirmar que un comentario de «firma» constituye firma de webhook observada.

El motor tributario es otro sistema: este repo no demuestra su conexión SII, custodia, permisos, validaciones ni SLA. El comentario de 60 req/min es presupuesto de diseño del código, no un rate limit consultado al proveedor. Circuit breakers: no se encontraron implementaciones explícitas en los clientes revisados.


## Cambio autorizado — proveedores

Flow/MP/Webpay/correo/Tax simulados local. LOCAL_TEST_ONLY rechaza fetch externo; gateway Docker descubierto sólo como origen exacto mock. No servicios reales. Firma MP obligatoria, HMAC/lookup Flow y conciliación Webpay; operador valida método/moneda antes de habilitar. OpenRouter sin ruta activa. Cron off, endpoint privado. Imágenes URL temporal, sin limpieza. SDK2.86.0 se empaqueta desde node_modules para ejecución offline. La primera invocación SQL descargó el helper pg_prove:3.36; luego se sustituyó por psql/pgTAP del contenedor. Ver VALIDATION_REPORT para alcance y desviación registrada.
