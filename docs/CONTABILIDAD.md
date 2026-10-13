> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Módulo Contabilidad — CMOR FLOW × cmorflow-tax-api

> Implementado 2026-09-05/06. Motor de facturación electrónica chilena (DTE al SII)
> expuesto por el proyecto `<ruta-local>` (NestJS en Render).

## Qué hace

- Botón **Contabilidad** en el panel del dueño (solo restaurantes con `country = 'CL'`,
  todos los planes), con card en "Acciones Rápidas" de RestaurantHome.
- Página con 3 pestañas: **Resumen** (stat cards del período: aceptados, monto,
  IVA débito fiscal estimado, rechazos), **Documentos** (tabla de DTEs con estado
  SII, descarga XML/PDF, emisión manual de boleta/factura, anulación por nota de
  crédito) y **Configuración** (conexión al motor, credencial, auto-emisión).
- **Emisión automática de boletas (39)** opt-in por restaurante (`auto_emit`), con
  reintentos y cola de conciliación. Factura (33) y nota de crédito (61) siempre manuales.
- **No toca** el flujo de cobro: la emisión es un bucle de conciliación idempotente
  desacoplado (ver abajo).

## Arquitectura

```
pg_cron "accounting-sync" (cada 5 min) ──┐
Página Contabilidad / botón Sincronizar ─┼→ edge fn "accounting" (verify_jwt=false)
Cobro POS exitoso (CL, fire-and-forget) ─┘
   syncRestaurant(lease 45s):
     1. Reconcilia docs 'queued' sin request_id (findByExternalReference rescata
        timeouts; si el motor no la conoce, re-emite con la MISMA Idempotency-Key).
     2. Catch-up auto_emit: órdenes pagadas sin doc válido → INSERT write-ahead
        'queued' ON CONFLICT (restaurant_id, external_reference) DO NOTHING
        → recién entonces POST /dtes. Máx 20 por corrida.
     3. Poll: 1 GET por doc en queued/processing/submitted con request_id.
```

Componentes:

| Pieza | Archivo |
|---|---|
| Firma HMAC (puro, WebCrypto, testeado) | `supabase/functions/_shared/tax-signing.ts` |
| Tipos del motor (DTO whitelist estricta) | `supabase/functions/_shared/tax-types.ts` |
| Cliente HTTP del motor (timeout 30s, 1 retry re-firmando) | `supabase/functions/_shared/tax-client.ts` |
| Builder orden→payload (GROSS, sin totals) | `supabase/functions/_shared/accounting-payload.ts` |
| Edge function router | `supabase/functions/accounting/index.ts` |
| Servicio frontend | `src/services/accountingService.ts` |
| Helpers puros frontend | `src/utils/accounting.ts` |
| Página | `src/pages/restaurant/Accounting.tsx` |
| Migración | `supabase/migrations/20260905000001_accounting_module.sql` |

## Autenticación HMAC (motor)

- Headers: `X-Api-Key` (credencial `cmor_live_*`), `X-Timestamp` (±300s), `X-Nonce`
  (UUID de un solo uso), `X-Signature`.
- Canónico: `METHOD\n<ruta con query>\n<sha256hex(body)>\n<timestamp>\n<nonce>`;
  clave HMAC = `sha256hex(secreto cmc_…)`.
- El body entra en la firma: se serializa UNA vez y se reutilizan los mismos bytes.
- `Idempotency-Key` obligatorio en emisiones: **es el id de la fila local**
  (`accounting_documents.id`); reintentos con la misma key son replay seguro.
- Los nonces son de un solo uso: cada retry RE-FIRMA (nonce nuevo) pero conserva
  la Idempotency-Key.

## Idempotencia y re-emisión tras rechazo

- `external_reference` incluye el intento: `order:{order_id}:{tipo}:a{attempt}`
  (NC: `nc:{document_id}:a{n}`) — el motor dedupea por (tenant, external_reference).
- Write-ahead: la fila se inserta `queued` con `ON CONFLICT DO NOTHING` ANTES de
  llamar al motor — dos sync concurrentes no pueden duplicar la emisión.
- Unique parcial en DB: `(restaurant_id, external_reference)`.
- Fallo transitorio (timeout, 5xx, 429): la fila queda `queued` y el próximo run
  reintenta con la misma key (el motor re-replica la respuesta original).
- Fallo terminal (`rejected`/`failed`): **nueva fila** con `attempt+1` → nueva
  Idempotency-Key y nueva external_reference. Cap de re-emisión automática: 3.
  La emisión manual siempre permite un intento más.
- Rescate de huérfanos: si un POST murió por timeout, el sync siguiente hace
  `GET /dtes?externalReference=…` primero (rescata el DTE ya creado) y solo
  re-emite si el motor no lo conoce (404 NOT_FOUND).

## Reglas tributarias aplicadas (CL)

- Precios de carta = **brutos** (IVA 19% incluido, como `create_order`):
  `pricingMode: 'GROSS'`, `unitPrice` = precio de carta.
- `totals` **no se declara**: el motor recalcula (sin `TOTALS_MISMATCH` posible).
- Guardrail server-side: la suma de `item_total` debe cuadrar con `orders.total`
  (±$1) o la emisión se rechaza (`items_mismatch`) sin gastar folio.
- Boleta 39: sin receptor. Factura 33: RUT (validado módulo 11 también en el edge,
  revalidado por el motor) + razón social obligatorios; giro/dirección/comuna
  recomendados por el SII — el modal los pide.
- La propina no se incluye en la boleta de la orden (queda fuera del consumo).
- Split bills: la boleta se emite por la orden completa.

## Seguridad

- `verify_jwt = false` (patrón `order-pay`): cada ruta valida explícitamente —
  rutas del dueño con `requireRestaurantOwner` (JWT Bearer), ruta cron con
  `X-Cron-Secret` comparado en tiempo constante contra `accounting_cron_secret`.
- Credencial del motor en reposo: **AES-256-GCM** (clave = SHA-256 de
  `ACCOUNTING_MASTER_KEY`, IV aleatorio de 12 bytes, AAD = restaurant_id),
  formato `v1:{iv}:{ciphertext}`. Nunca sale del edge; `GET /config` solo
  devuelve `key_id_masked`.
- Alta/rotación de credencial: `POST /config` con `credential: {key_id, secret}`.
  Se valida ACTIVAMENTE contra el motor (probe HMAC que debe responder
  404 NOT_FOUND) antes de guardar.
- RLS en `accounting_config`/`accounting_documents`: solo SELECT para miembros
  (`is_my_restaurant`); INSERT/UPDATE exclusivamente service role. Grants por
  columna (nunca se expone `tax_secret_encrypted` ni `tax_key_id` a la app).

## Provisionamiento de un restaurante (operación manual, v1)

1. Crear el tenant del restaurante en la base del motor (tabla `tenants`, es compartida con el ERP).
2. Crear credencial API: `npm run admin:bootstrap -- <TENANT_UUID>` (motor) y luego
   `POST /api/v1/credentials` con la credencial admin → permisos
   `dte:emit,dte:read,artifacts:read`. El secreto `cmc_…` se muestra UNA vez.
3. En CMOR FLOW: panel del dueño → Contabilidad → Configuración → pegar Key ID +
   secreto → "Validar y guardar". (El dueño necesita que soporte le entregue la
   credencial; alternativamente se inserta cifrada por SQL con el edge.)

## Estados de un documento

`queued` → `processing` → `submitted` → `accepted | observed | rejected | failed | cancelled`
(fuente de verdad: `GET /dtes/:requestId` del motor; el sync local lo refleja en
`accounting_documents.status`).

## Variables y cron

- Secrets del edge: `TAX_API_BASE_URL` (staging del motor: `https://tax.example.test/api/v1`),
  `ACCOUNTING_MASTER_KEY` (≥32 chars, genera el cifrado; rotarla implica re-cifrar
  credenciales — el formato `v1:` deja espacio para versiones futuras).
- Cron `accounting-sync` (pg_cron cada 5 min): llama
  `public.accounting_dispatch_cron()` → `net.http_post` al `/sync` del edge con
  `X-Cron-Secret`. El secreto vive SOLO en `public.accounting_cron_secret`
  (RLS sin políticas + REVOKE a anon/authenticated; generado con `gen_random_bytes`
  en la migración — no está en git ni en env). Rotación: `UPDATE` de esa fila.
- El dispatch no llama al edge si no hay ningún restaurante con credencial.
- Modo cron procesa máx 10 restaurantes por corrida (orden por `last_sync_at`).

## Límites

- Motor: 60 req/min por credencial → máx 20 emisiones + 20 polls + 20 reconciliaciones
  por restaurante por corrida.
- Motor: solo Chile. La página muestra "Próximamente" para BR/BO/PE.
- Nota: el edge no firma RCOF manual (el motor genera el RCOF diario automático
  por tenant con boletas).

## Roadmap fase 2

- Webhooks entrantes del motor (`dte.accepted` etc., firma `whsec_…`) → ruta nueva
  en el edge `webhooks` con verificación HMAC; el polling queda como respaldo.
- Auto-provisión de credenciales vía credencial admin `cmor_admin_*` guardada como
  secret del edge.
- Libro contable de partida doble estilo APR (asientos automáticos por triggers,
  plan de cuentas, balance de comprobación).
- RCOF manual desde la página.

## Verificación

- Tests: `src/tests/unit/U24-accounting.test.ts` (vectores dorados HMAC del
  GUIDE.md del motor, builder DTE, RUT módulo 11, IVA, estados, períodos
  Santiago). Suite completa: 253 passing.
- Smoke test del edge desplegado: `POST /functions/v1/accounting/sync` sin
  secret → 400 `restaurant_id es requerido` (falla al path del dueño, como debe).
