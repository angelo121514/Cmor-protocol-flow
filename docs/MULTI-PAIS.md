> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Guía multi-país (Chile, Brasil, Bolivia, Perú)

Fase 1 (2026-08-31): configuración regional, impuestos por restaurante, carta pt, Flow solo Chile.
Fase 2 (2026-09-01): Mercado Pago (BR/PE), platos multilingües, landing internacional, panel es/pt.

Implementación **aditiva**. Chile conserva su comportamiento legacy exacto: si un restaurante chileno existente se comporta distinto tras este cambio, hay un bug (regresión sagrada).

## Países soportados y configuración sugerida

| País | Moneda | Locale | Decimales | Impuesto sugerido | Idiomas carta | Pago online |
|---|---|---|---|---|---|---|
| 🇨🇱 CL (default) | CLP `$` | es-CL | 0 | IVA 19% | es/en | Flow.cl |
| 🇧🇷 BR | BRL `R$` | pt-BR | 2 | sin sugerencia (el dueño configura ISS/ICMS) | pt/en | manual |
| 🇧🇴 BO | BOB `Bs` | es-BO | 2 | IVA 13% | es/en | manual |
| 🇵🇪 PE | PEN `S/` | es-PE | 2 | IGV 18% | es/en | manual |

## Separación de responsabilidades (regla de oro)

- **La BD guarda la configuración efectiva** de cada restaurante:
  `restaurants.country`, `restaurants.currency`, `restaurants.tax_rate`,
  `restaurants.default_language`.
- **`src/config/regional.ts`** es la fuente de **defaults/recomendaciones por
  país** (`REGIONAL_CONFIG`) y de los **precios de planes por país**
  (`PLAN_PRICES`). El país *sugiere*, el dueño decide: cualquier valor se
  puede editar en Configuración del Local.
- El impuesto es **configuración inicial sugerida, no legislación rígida**.

## Cómo editar un valor operacional

| Qué | Dónde |
|---|---|
| **Precios de planes por país** | `src/config/regional.ts` → `PLAN_PRICES`. ⚠️ CL es copia exacta de `APP_CONFIG.plans` (config.ts); si cambias uno, cambia ambos (el test U22 vigila que coincidan). |
| **Tasa de impuesto de un restaurante** | El dueño la edita en Configuración → "Tasa de Impuesto (%)" (el valor vive en `restaurants.tax_rate` como fracción: 19% = 0.19). |
| **Tasa sugerida por país** | `REGIONAL_CONFIG[c].suggestedTaxRate` en `src/config/regional.ts`. |
| **Idiomas de la carta por país** | `REGIONAL_CONFIG[c].languages`. |
| **Bloquear/habilitar Flow por país** | `paymentGateway: "flow" \| "manual"` en `REGIONAL_CONFIG`. |

## Cadena obligatoria para columnas nuevas en `restaurants`

(Trampa histórica de PostgREST: si falta el grant, TODO select falla con 42501.)

1. Migración `ALTER TABLE ... ADD COLUMN` en `supabase/migrations/`.
2. Añadir la columna a los **grants** (SELECT anon + authenticated, UPDATE/INSERT authenticated si aplica).
3. Añadirla a **`RESTAURANT_COLUMNS`** en `src/config/supabase.ts`.
4. (Si es pública) verificar que no haya que excluirla del grant anon.

## RPCs con soporte multi-país (desplegadas en prod 2026-08-31)

- `create_order` / `create_table_order`: impuesto = `COALESCE(r.tax_rate, 0.19)` (antes: literal `1.19`).
- `auto_approve_registration_v2` (webhook Flow) y `admin_create_restaurant_v2`
  (aprobación manual): leen `registration_requests.country` y propagan
  country/currency/language/tax_rate al restaurante creado.
- `create_restaurant_branch`: la sucursal hereda la config regional del padre.
- `get_table_by_token`: devuelve `restaurant_currency/country/language` (TableQR/QRPayment).
- `kds_get_restaurant`: expone config regional en el jsonb (aditivo).

## Guardrails de pago (Flow solo en Chile)

- **Frontend**: los botones de Flow (suscripción en Settings, registro, pago QR de mesa) solo se muestran si `isFlowCountry(country)`. Fuera de CL: "activación asistida" / "pago en el local".
- **Server-side**: `flow-checkout` rechaza solicitudes no-CL y `order-pay` rechaza sesiones de restaurantes no-CL — no se puede saltar el gating desde el cliente.
- **Fase 2 (no implementada)**: Mercado Pago/PIX (Brasil), pasarelas para BO/PE, landing internacional, traducción del panel del dueño.

## Estado de producción

- **Fase 1 (2026-08-31)**: migración `20260831000001_multi_country` (columnas country/tax_rate, CHECKs ampliados, grants, 7 RPCs); `flow-checkout` v23 y `order-pay` v5 con guardrail no-CL. Los 5 restaurantes existentes quedaron `country='CL', tax_rate=0.19`.
- **Fase 2 (2026-09-01)**: migración `20260901000001_phase2_multi_country` (`menu_items.name_pt/description_pt` con grants, `payment_intents.provider` acepta `'mp'`); Edge Functions `mp-checkout` v1, `mp-webhook` v1 y `order-pay` v6 (bifurcación Flow/MP).
- Suite: 233 tests pasando / 28 skipped; `tsc -b` limpio.

## Fase 2 — Mercado Pago (Brasil y Perú)

**Estado: código desplegado, pendiente de credenciales.** Para activarlo:

1. Crear cuenta de Mercado Pago vendedor (BR y/o PE) en mercadopago.com.
2. Obtener el **Access Token** (Producción o Test/sandbox) y configurarlo como secret:
   `supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=...` (y opcionalmente `MERCADO_PAGO_WEBHOOK_SECRET` para validar la firma del webhook).
3. En el panel de Mercado Pago, configurar la URL de notificación (webhook):
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/mp-webhook`
4. Sin el token, `mp-checkout` responde 503 `not_configured` (falla cerrada) y el frontend muestra activación asistida — nada se rompe.

Flujo implementado:
- **Registro BR/PE**: `RegisterPage` → `mp-checkout` → PIX (Brasil, QR copia-y-paga) o tarjeta (Perú) → pantalla `mp_pending` → el webhook `mp-webhook` confirma (consulta el pago real vía API, valida monto) → `auto_approve_registration_v2` activa el restaurante.
- **Pago de mesa QR BR/PE**: `QRPayment` → `order-pay` detecta el país y crea el pago MP (PIX/tarjeta) → pantalla de espera con polling de la sesión → `mp-webhook` → `complete_session_payment` cierra la mesa.
- `mp-webhook` también maneja `external_reference` `ORDP-<session_id>` (mesas) y `R-<request_id>` (registros), con doble validación de monto contra `payment_intents`.
- Bolivia sigue sin pasarela online (Mercado Pago no opera; PagosNet/QR-Simple requieren contrato bancario local — decisión del dueño).

## Platos multilingües (Fase 2)

- `menu_items.name_pt` / `menu_items.description_pt` (opcionales).
- El dueño los carga en Menú → editar plato ("Nome em Português").
- La carta pública (`CustomerMenu`, `TableQR`) muestra la traducción cuando el idioma activo es pt; cae al original si no está cargada.

## Panel del dueño en portugués (Fase 2)

- Diccionario es→pt: `src/i18n/panelI18n.tsx` (traducción progresiva — lo no traducido cae al español).
- Provider global en `main.tsx`, selector ES/PT en el navbar del Dashboard, persistencia en `localStorage["cmor-panel-lang"]`.
- Traducido: nav completo, logout, banner de trial expirado. El resto de las páginas cae al español hasta ampliar el diccionario.

## Landing internacional (Fase 2)

- Selector de país en el navbar de `LandingPage` (default 🇨🇱): ajusta los precios de los planes a la moneda del país.
- Los CTAs llevan `?country=` y el registro llega pre-seleccionado.

## Precios provisionales BR/BO/PE (editables en `src/config/regional.ts`)

| Plan | 🇧🇷 BR (R$) | 🇧🇴 BO (Bs) | 🇵🇪 PE (S/) | 🇨🇱 CL ($ CLP) |
|---|---|---|---|---|
| Básico mensual (orig.) | 149 (199) | 190 (250) | 119 (159) | 28.000 (40.000) |
| Básico anual | 1.490 | 1.900 | 1.190 | 285.600 |
| Pro mensual (orig.) | 520 (690) | 660 (890) | 390 (519) | 98.000 (120.000) |
| Pro anual | 5.190 | 6.600 | 3.899 | 999.600 |
| Vitalicio pago único | 9.900 | 12.500 | 7.500 | 1.900.000 |

Editar solo el objeto `PLAN_PRICES` de `regional.ts`; el test U22 exige que los
valores de CL sigan siendo exactamente los de `config.ts`.