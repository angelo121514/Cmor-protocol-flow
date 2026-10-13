> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Auditoría multi-país (Fase 1 + Fase 2) — 2026-09-01/02

Auditoría completa post-implementación en dos rondas:

- **Ronda 1 (2026-09-01)**: verificación directa con pruebas contra producción. Encontró y corrigió 2 bugs críticos (verify_jwt, CHECK plan) + 2 menores. Detalle en secciones siguientes.
- **Ronda 2 (2026-09-02)**: 3 agentes independientes (auditoría de implementación, revisión de arquitectura, auditoría de seguridad). Encontró 2 críticos adicionales, 1 alto de seguridad y ~10 medios/menores — todos corregidos y verificados. Resumen al final del documento.

## Veredicto

**2 bugs críticos detectados y corregidos en producción durante la auditoría.**
El resto del sistema verificado OK: 233 tests, regresión Chile intacta,
guardrails funcionando en vivo, sin datos de prueba residuales.

## Bugs críticos encontrados y corregidos

### 1. `verify_jwt: true` en mp-checkout y mp-webhook (habría roto TODO el pago MP)

- **Síntoma**: al desplegar con `supabase functions deploy` sin el flag, ambas
  functions quedaron con `verify_jwt: true` (heredado del default). El registro
  es anónimo (sin JWT) y Mercado Pago no envía JWT → ambas rechazarían toda
  llamada con 401.
- **Corrección**: redeploy con `--no-verify-jwt`. Confirmado en prod:
  `mp-checkout` v2 y `mp-webhook` v2 con `verify_jwt: false`.
- **Lección**: siempre desplegar functions públicas con `--no-verify-jwt`
  explícito (los archivos no llevan config.toml por function).

### 2. CHECK `payment_intents.plan` rechazaba `table_order` (habría roto el pago de mesa MP)

- **Síntoma**: el CHECK existente solo permitía `starter/pro/lifetime/test_plan`,
  pero `order-pay` rama MP inserta `plan: 'table_order'`. El primer pago de
  mesa en BR/PE habría fallado con `violates check constraint`.
- **Corrección**: CHECK ampliado a `'table_order'`, aplicado a prod y al
  archivo de migración. Verificado con INSERT real (con ROLLBACK).

## Bugs menores encontrados y corregidos

### 3. `FunctionsHttpError.message` no contiene el texto del servidor

- `supabase.functions.invoke` con respuesta 503 devuelve un error cuyo
  `message` genérico no incluye el body. El código de `RegisterPage` nunca
  habría detectado "MP no configurado" → el usuario veía un error genérico
  en vez de la activación asistida.
- **Corrección**: `extractFunctionError()` en `mpService.ts` lee
  `error.context.json()` y extrae el campo `error` real.

### 4. Pantalla de éxito engañosa tras activación asistida

- Si MP no está configurado y el registro caía a activación asistida, la
  pantalla decía "¡Pago confirmado!" cuando no hubo pago.
- **Corrección**: estado `mpAssisted` + títulos diferenciados
  ("¡Solicitud recibida!" / "Coordinaremos el pago contigo").

## Verificaciones aprobadas (sin cambios necesarios)

### Base de datos de producción
- CHECKs: `country`, `currency`, `default_language`, `provider` (+`mp`),
  `plan` (+`table_order`) — todos con los valores esperados.
- Grants por columna: `restaurants` (country/tax_rate en 4 privilegios),
  `menu_items` (name_pt/description_pt: 6 grants anon/authenticated).
- Selects públicos tipo PostgREST (simulados con la anon key real):
  `restaurants?slug=...&select=...,country,tax_rate,...` → 200 OK;
  `menu_items?select=name,name_pt,...` → 200 OK (sin error 42501).
- Los 5 restaurantes existentes: `country='CL', tax_rate=0.19` (regresión).

### Regresión Chile (criterio sagrado) — aprobada
- Fórmula de `create_order`/`create_table_order` con restaurante CL real
  (`motomoto-07ea`, activo): 1000 → subtotal 840 = legacy exacto.
- Simulación end-to-end registro BR (con ROLLBACK): la RPC
  `auto_approve_registration_v2` propagó `BR → BRL → pt → tax_rate 0 →
  plan activo` correctamente.
- Suite completa: **233 passed / 28 skipped**, `tsc -b` limpio.

### Guardrails en vivo (contra las functions desplegadas, con registros de prueba)
- `flow-checkout` + registro BR → **rechazado** con mensaje correcto ✓
- `mp-checkout` + registro BR → **"MP no está configurado"** (falla cerrada) ✓
- `mp-checkout` sin body → 400 validación ✓
- `mp-webhook` con notificación no-payment → `{"received": true}` ✓
- Selects anon con columnas nuevas → 200 OK ✓
- Todos los datos de prueba eliminados (DELETE verificado; simulaciones con ROLLBACK).

### Lint
- Archivos nuevos: limpios excepto 3 avisos `react-refresh/only-export-components`
  en `panelI18n.tsx` — patrón aceptado (provider + hooks en un archivo, igual
  que el código de contexto del proyecto). El `useEffect` sin usar fue corregido.

## Cobertura de la simulación de flujos

| Flujo | Método | Resultado |
|---|---|---|
| Registro BR → activación (webhook MP) | RPC en prod con ROLLBACK | ✓ config regional propagada |
| Pago mesa MP: insert payment_intents | SQL con ROLLBACK | ✓ CHECK acepta table_order |
| Guardrail Flow vs registro BR | curl en vivo | ✓ rechazado |
| Guardrail MP sin token | curl en vivo | ✓ 503 falla cerrada |
| Webhook MP no-payment | curl en vivo | ✓ ignored |
| Menú público anon con columnas nuevas | curl con anon key | ✓ 200 |
| Fórmula impuesto CL vs legacy | SQL sobre restaurante real | ✓ 840 = 840 |
| Suite de tests | vitest 261 tests | ✓ 233 pass / 28 skip |

## No cubierto por esta auditoría (requiere credenciales o UI manual)

- Pago MP real end-to-end (requiere `MERCADO_PAGO_ACCESS_TOKEN`): el código
  está probado hasta la frontera de la API de MP; el resto se activará con el
  secret (recomiendo primero sandbox/test users).
- Recorrido visual del navegador (carta pt, panel ES/PT, landing): requiere
  deploy de Vercel (push). Los tests unitarios cubren la lógica.
- Firma x-signature del webhook MP (se activa al configurar el secret;
  el chequeo principal server-side ya funciona sin ella).

---

# Ronda 2 (2026-09-02): 3 agentes independientes

Tres revisores en paralelo con acceso de solo lectura al código y a prod:
**(1) auditoría de implementación con pruebas**, **(2) revisión de
arquitectura**, **(3) auditoría de seguridad**. Informes completos en la
sesión; aquí el consolidado de hallazgos y su estado.

## Hallazgos corregidos (todos verificados)

| # | Agente | Severidad | Hallazgo | Corrección aplicada |
|---|---|---|---|---|
| H6=A-2 | Impl+Seg | **CRÍTICO** | `mp-webhook` escribía `status: "completed"/"amount_mismatch"` que viola el CHECK de `payment_intents.status` → UPDATE falla silencioso, intents quedan `pending` para siempre, idempotencia rota | Webhook reescrito: estados válidos del CHECK (`authorized`/`rejected`), updates condicionados `.eq("status","pending")` con error chequeado |
| H2 | Impl+Arq | **CRÍTICO** | CheckoutModal de la carta calculaba impuesto con 19% hardcodeado aunque recibía `taxRate` del restaurante (BO 13% / PE 18% mostraban monto incorrecto) | `splitTaxFromTotal(total, taxRate, decimals)` — 1 línea |
| A-1 | Seg | **ALTO** | `create_restaurant_branch` aceptaba `p_subscription_plan/p_status` arbitrarios: bypass para auto-asignarse 'pro'/'active' sin pagar (preexistente; la Fase 1 lo tocó y lo dejó igual) | La RPC ahora HEREDA `subscription_plan/status/trial_ends_at` del restaurante padre; params ignorados (firma compatible). Aplicado a prod |
| H1 | Impl | MEDIO | Resumen del paso payment en RegisterPage mostraba "$28.000 CLP" hardcodeado para BR/BO/PE (se cobra R$ 149) | Usa `price(selectedPlan)` + `regional.currency` |
| H4 | Impl+Arq | MEDIO | Reportes: todas las métricas formateadas CLP aunque el componente ya tenía la moneda (15+3+11 puntos) | `fmtR` por componente con `restaurant.currency`; fallback de `splitTaxFromTotal` con tasa real |
| H5 | Impl | MEDIO | `calcTipFromPercent` con `Math.ceil` a entero → propinas BRL/PEN pierden centavos | Param `decimals` (default 0 = legacy); QRPayment pasa los de la moneda |
| H3 | Impl | MEDIO | Ticket impreso POS: addons con `$` literal + es-CL | Usa el wrapper `formatCurrency` del POS |
| H7 | Impl+Arq | MEDIO | Auto-detección pt documentada pero no conectada (`usePanelLangForCountry` sin callers) | Effect en Dashboard: si no hay preferencia guardada, BR entra en pt |
| H8 | Impl | MEDIO | `mp-checkout` insertaba `buy_order` fijo (`R-<id>`) → violaba UNIQUE al reintentar tras fallo | `buy_order` con timestamp como flow-checkout (el webhook concilia por `flow_token`) |
| A-2b | Seg | MEDIO | Errores de UPDATE del webhook descartados | Todos los updates chequean error |
| M-2 | Seg | MEDIO | Firma x-signature divergente del SDK MP (id del body en vez del query param, pares vacíos en manifest, sin anti-replay) | Manifest conforme al SDK: `data.id` del query, pares vacíos omitidos, tolerancia ts 5 min, comparación constant-time |
| M-4 | Seg | MEDIO | CASO B del webhook usaba `external_reference` para la sesión en vez de `intent.session_id` | Usa `intent.session_id` (patrón del CASO A) |
| H9/I-5 | Impl | MENOR | Casts `as any` innecesarios en `itemText` | Tipado correcto con Pick de 4 campos |
| H12 | Impl | MENOR | `requestMpTablePayment` código muerto | Eliminado |
| B-1 | Seg | BAJO | `tip_amount` sin cota en endpoint público | Cap: propina ≤ 100% de la cuenta |
| B-2 | Seg | BAJO | `order-pay` usaba `origin` sin whitelist (mitigado downstream) | Validado contra ALLOWED_ORIGINS |
| M-3 | Seg | MEDIO | `registration_requests.country` sin CHECK (no explotable, defensa en profundidad) | CHECK `('CL','BR','BO','PE')` — aplicado a prod |
| — | Arq | MENOR | Contrato de respuesta: rama Flow no devolvía `provider` | Ahora devuelve `provider: "flow"` |
| — | Arq | MENOR | `paymentGateway` de regional.ts desactualizado ('manual' para BR/PE desde Fase 2) | BR/PE = `"mp"` + helper `isMpCountry()`; gating de 2 sites unificado |
| — | Impl | MENOR | Alias `mpAssistedRef` engañoso | Renombrado a uso directo de estado |

## Mejoras de cobertura de tests (nuevas)

- Guard de drift de precios: `flow-checkout` debe cobrar exactamente los
  precios CL de `PLAN_PRICES` (parse real, no substring) — detecta la clase
  de divergencia histórica de Webpay.
- `mp-checkout`: buy_order con timestamp; webhook: estados válidos,
  `intent.session_id`, firma SDK, idempotencia.
- Suite final: **235 passed / 28 skipped** (2 tests nuevos netos).

## Verificación en vivo post-corrección (2026-09-02)

- Migración `20260902000001_audit_fixes` aplicada: CHECK de país en
  `registration_requests` + `create_restaurant_branch` heredando del padre
  (confirmado con `pg_get_functiondef`).
- Redesplegadas `mp-checkout` v3, `mp-webhook` v3, `order-pay` v7
  (todas verify_jwt=false) — smoke: 503 falla cerrada, webhook ignora
  no-payment, order-pay valida session_token.
- `tsc -b` limpio; suite 235 pass / 28 skip.

## Pendientes documentados (no bloqueantes, requieren decisión/recursos)

1. **M-1**: `test_plan` a 5 BRL/PEN sigue disponible en mp-checkout y
   flow-checkout (heredado de Flow). Decisión de negocio: eliminarlo del
   checkout público o dejarlo.
2. **Consolidación de precios en `_shared/plan-prices.ts`** (6 copias → 1):
   hacer antes del 5º país o del primer cambio comercial de precios.
3. **Webhook Flow (ORDP) no concilia monto contra payment_intents** — deuda
   preexistente de la Fase 5; MP ya lo hace. Elegir MP como patrón si se
   cierra.
4. **Anual se exhibe pero no se cobra** — preexistente en CL, ahora en 4
   monedas. Requiere decision de producto + soporte en flow/mp checkout.
5. **Anon INSERT/UPDATE en menu_items** (preexistente, tabla completa):
   neutralizado por RLS; corrección de fondo sería REVOKE y dejar solo
   SELECT para anon.
6. **B-3**: rate-limit por IP en mp-checkout usando la tabla `rate_limits`
   existente (deseable antes de activar MP con token real).