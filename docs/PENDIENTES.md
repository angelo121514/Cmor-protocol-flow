> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Pendientes del usuario — CMOR FLOW (al 2026-09-06)

Checklist completo de todo lo que queda por hacer, ordenado por prioridad.
Generado tras las Fases 1 y 2 multi-país, las 2 rondas de auditoría y el
módulo Contabilidad (motor tributario).

---

## 1. Migraciones a Supabase — ✅ NADA PENDIENTE (pero lee la advertencia)

**Todas las migraciones del repo están aplicadas y verificadas en producción
(`YOUR_PROJECT_REF`):**

| Migración (repo) | Qué hace | Estado en prod |
|---|---|---|
| `20260828*_audit_*` (7) | Hardening seguridad auditoría 28-08 | ✅ aplicadas (ronda auditoría) |
| `20260831000001_multi_country` | country/tax_rate, CHECKs ampliados, grants, 7 RPCs multi-país | ✅ aplicada + verificada en vivo |
| `20260901000001_phase2_multi_country` | menu_items.name_pt/description_pt + grants, payment_intents provider 'mp' + plan 'table_order' | ✅ aplicada + verificada en vivo |
| `20260902000001_audit_fixes` | CHECK país en registration_requests + create_restaurant_branch hereda plan/estado del padre | ✅ aplicada + verificada en vivo |
| `20260905000001_accounting_module` | accounting_config + accounting_documents + RLS/grants + cron accounting-sync (pg_cron/pg_net) + accounting_cron_secret | ✅ aplicada + verificada en vivo |
| `20260906000001_accounting_grant_hardening` | REVOKE ALL + re-grant SELECT por columnas en accounting_* (contrarresta ALTER DEFAULT PRIVILEGES que otorga ALL a toda tabla nueva) | ✅ aplicada + verificada en vivo |

**⚠️ ADVERTENCIA — NO ejecutar `supabase db push`:**
`supabase_migrations.schema_migrations` en prod usa versiones con timestamp
(p.ej. `20260902155212` para audit_fixes), que NO coinciden con los nombres de
archivo del repo. Un `db push` re-aplicaría las migraciones del repo — y
`20260831000001_multi_country.sql` contiene la versión VIEJA de
`create_restaurant_branch` (confía en `p_subscription_plan` del cliente).
Re-aplicarla restauraría el bypass de seguridad corregido en `20260902000001`.

**Cómo aplicar migraciones futuras:**
- Opción recomendada: pedírmelo (aplico vía MCP `apply_migration` + verificación
  en vivo, como en estas sesiones).
- Opción manual: Supabase Dashboard → SQL Editor (corre como service_role),
  pegando el SQL del archivo de migración.
- Si algún día quieres normalizar el historial para usar `db push`: hay que
  alinear `schema_migrations` con los nombres de archivo (tarea delicada, pídela).

---

## 2. Commit + push — 🔴 LO ÚNICO QUE BLOQUEA TODO LO DEMÁS

El working tree acumula **sin commitear**: fixes de la auditoría 2026-08-28 +
Fase 1 + Fase 2 multi-país + las correcciones de las 2 rondas de auditoría
(~45 archivos modificados + ~10 nuevos). **El frontend solo llega a
producción con push → Vercel auto-deploy**; la BD ya está al día.

- [ ] Decidir si te organizo los commits por fase (recomendado):
  1. `fix: hardening seguridad (auditoría 2026-08-28)`
  2. `feat: soporte multi-país Fase 1 (CL/BR/BO/PE)`
  3. `feat: Fase 2 — Mercado Pago BR/PE, platos multilingües, landing, panel es/pt`
  4. `fix: correcciones auditoría multi-país (webhook MP, impuestos, branch)`
  … o un solo commit si prefieres.
- [ ] `git push origin main` → esperar el deploy de Vercel.
- [ ] Verificar en el navegador tras el deploy:
  - Landing con selector de país y precios en moneda local
  - Registro con selector de país (flujo CL con Flow intacto)
  - Carta pública (CustomerMenu) en pt si configuras un restaurante BR
  - Panel con selector ES/PT en el navbar

---

## 3. Edge Functions — ⚠️ una pendiente de deploy

Estado actual en prod: `mp-checkout` v3, `mp-webhook` v3, `order-pay` v7,
`flow-checkout` v23 (todas con los fixes de auditoría), **`accounting` v1
(módulo Contabilidad, desplegada 2026-09-06 con secrets
`TAX_API_BASE_URL` + `ACCOUNTING_MASTER_KEY`)**.

- [ ] **`supabase functions deploy webhooks`** — el repo tiene el fix del router
  Flow (claves Webpay corregidas) que nunca se desplegó. Opcional (el frontend
  ya no usa Webpay) pero recomendado para dejar repo = prod. Requiere
  `supabase link --project-ref YOUR_PROJECT_REF`.
- El resto está al día — nada más pendiente.

---

## 3b. Contabilidad (motor tributario cmorflow-tax-api) — qué falta para producir

El código está completo y desplegado (ver `docs/CONTABILIDAD.md`). Para que un
restaurante CL emita boletas reales falta la parte operativa:

- [ ] **Crear el tenant del restaurante en la base del motor** (tabla `tenants`
      del tax-api; es compartida con el ERP) — hasta ahora solo existe CMORAPR.
- [ ] **Crear la credencial API del restaurante** (`cmor_live_*` con permisos
      `dte:emit,dte:read,artifacts:read`) con el bootstrap admin del motor, y
      guardarla en el panel: Contabilidad → Configuración (se valida contra el
      motor y se cifra AES-256-GCM antes de guardar).
- [ ] **Cargar CAF + firma electrónica del restaurante en el motor**
      (`POST /configuration/caf` y `/configuration/signature`) y activar
      `INTEGRATIONS_API_ENABLED=true` / credenciales del ambiente destino.
      Hoy el motor staging está habilitado; producción del motor sigue gated
      hasta la certificación SII (boletas 39/41 + RCOF).
- [ ] **Activar `auto_emit`** por restaurante en la pestaña Configuración y
      probar con una orden de prueba end-to-end (folio aceptado por el SII).
- [ ] (Opcional, fase 2) Webhooks entrantes del motor con `whsec_…` para estados
      push en vez de polling; auto-provisión de credenciales vía `cmor_admin_*`.
- [ ] Nota lint INFO: `accounting_cron_secret` aparece como "RLS sin políticas"
      en el advisor — es intencional (tabla blindada, solo service role la lee).
      Igual que `admin_users`/`users`. No "corregir" abriendo políticas.

---

## 4. Mercado Pago — activación cuando lo decidas

El código está desplegado y probado hasta la frontera de la API de MP. Mientras
no haya token, `mp-checkout` responde 503 y el frontend muestra "activación
asistida" (nada se rompe). Para activarlo:

- [ ] Crear cuenta vendedor de Mercado Pago en **Brasil** y/o **Perú**
      (MP no opera en Bolivia — ahí sigue la activación manual).
- [ ] Obtener el Access Token (empieza por **sandbox/test**) y configurarlo:
      `supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...`
      (o Dashboard → Edge Functions → Secrets).
- [ ] (Recomendado) `supabase secrets set MERCADO_PAGO_WEBHOOK_SECRET=...` y
      **probar la firma con notificaciones reales del sandbox** — el manifest
      fue alineado con el SDK oficial en la auditoría, pero conviene validarlo
      con un pago sandbox antes de producción.
- [ ] En el panel de MP, configurar la URL de notificación (webhook):
      `https://YOUR_PROJECT_REF.supabase.co/functions/v1/mp-webhook`
- [ ] Prueba sandbox end-to-end: registro BR con PIX → activación automática;
      pago de mesa QR BR → cierre de mesa.
- [ ] Antes de pasar a token de producción: rate-limit por IP en mp-checkout
      (la tabla `rate_limits` ya existe — ver Pendientes 6).

---

## 5. Decisiones de negocio pendientes

- [ ] **Precios BR/BO/PE**: los actuales son provisionales (Starter R$149 /
      Bs190 / S/119; Pro R$520 / Bs660 / S/390; Vitalicio R$9.900 /
      Bs12.500 / S/7.500). Defínelos en `src/config/regional.ts` →
      `PLAN_PRICES` (CL debe quedar copia exacta de config.ts — el test U22
      lo vigila). El guard U23 detecta drift con flow-checkout.
- [ ] **`test_plan`**: sigue disponible en los checkouts públicos a 5 BRL /
      5 PEN / 350 CLP (activo inmediato, límites starter). Decidir si se
      elimina del checkout público o se deja (también en flow-checkout).
- [ ] **Plan anual**: se exhibe en Landing/Settings en 4 monedas pero ningún
      checkout lo cobra (preexistente en CL). Decidir: soportar el cobro
      anual en Flow/MP o mostrar solo mensual.
- [ ] **Bolivia**: sin pasarela online (MP no opera). Mantener activación
      manual o investigar PagosNet/QR-Simple (requiere contrato bancario
      local solo gestionable por ti).
- [ ] **Landing en portugués**: la landing ya tiene selector de país y
      precios por moneda, pero los TEXTOS siguen solo en español (pendiente
      pequeño de la Fase 2).
- [ ] **Panel completo en pt**: hoy nav/logout/banner están traducidos y el
      resto cae al español. Ampliar el diccionario
      (`src/i18n/panelI18n.tsx`) progresivamente según demanda.

---

## 6. Operación y seguridad (heredadas de la auditoría 2026-08-28)

- [ ] **Rotar `RESEND_API_KEY`** (pendiente desde la auditoría): nueva clave en
      dashboard.resend.com → `supabase secrets set RESEND_API_KEY=...` →
      actualizar `.env` local → revocar la vieja.
- [ ] **Trials vencidos** (el sweep cron ya los bloqueó automáticamente — ya
      no es urgente): `[AUTOR]di-9242`, `resto-1786060317508-64e0`,
      `resto-menu-1786060344674-cb4e` están `blocked`. Si alguno es cliente
      real, reactivar con:
      ```sql
      UPDATE restaurants SET status='active', trial_ends_at=now()+interval '14 days'
      WHERE slug='...';
      ```
      `el-encuentro-familiar-807b` está en trial activo hasta 2026-09-09.
- [ ] Decidir repo público: LICENSE MIT (sin urgencia).
- [ ] (Opcional) TS strict + limpiar los ~370 problemas de lint preexistentes.
- [ ] (Opcional) Tests E2E locales con Supabase local.

---

## 7. Mejoras recomendadas (no bloqueantes — del informe de arquitectura/seguridad)

1. **Consolidar precios en `supabase/functions/_shared/plan-prices.ts`**
   (6 copias hoy: config.ts, flow-checkout, flow-subscription,
   create-payment-intent, regional.ts, mp-checkout). Hacer ANTES del 5º país
   o del primer cambio comercial de precios. El guard U23 ya detecta drift de
   las 2 que cobran dinero.
2. **Webhook Flow (caso ORDP) no concilia monto** contra payment_intents (MP
   sí lo hace) — deuda preexistente de la Fase 5.
3. **Rate-limit por IP en mp-checkout** usando la tabla `rate_limits`
   existente — recomendado antes de activar MP con token real.
4. **REVOKE INSERT/UPDATE/DELETE de anon en `menu_items`** (hoy tabla
   completa desde 2026-08; neutralizado por RLS, pero hardening barato).
5. **Tipar las claves de `panelI18n`** (union PanelKey) para que renombrar un
   texto del panel no rompa la traducción en silencio.
6. **Decommissionar Webpay** (`create-payment-intent` + ruta webpay del
   router): sigue desplegada con precios divergentes ($50/$24.900) aunque
   nadie la invoca.

---

## Referencias

- `docs/MULTI-PAIS.md` — guía operativa multi-país (config, impuestos, MP).
- `docs/CONTABILIDAD.md` — módulo Contabilidad: motor tributario, HMAC, cron, provisionamiento.
- `docs/AUDITORIA-MULTIPAIS-2026-09-01.md` — 2 rondas de auditoría completas.
- `docs/AUDITORIA-2026-08-28.md` — auditoría de seguridad original.