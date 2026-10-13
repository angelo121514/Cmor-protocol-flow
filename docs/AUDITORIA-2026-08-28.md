> Referencia técnica histórica saneada. Para comenzar, usar las guías de instalación y despliegue del README. Las afirmaciones de validación histórica no certifican esta copia.

# Auditoría completa — CMOR FLOW (2026-08-28)

Auditoría de seguridad, bugs de negocio y calidad de código, con correcciones aplicadas
y verificación end-to-end contra producción (proyecto Supabase `YOUR_PROJECT_REF`).

**Alcance ejecutado:** corrección total (críticos + altos + medios/bajos), aplicación de
migraciones a producción vía MCP, pruebas de funcionamiento (suite automatizada + smoke
en navegador).

---

## 1. Resumen ejecutivo

Se confirmaron **3 vulnerabilidades críticas** (dos de ellas explotables con dinero:
auto-activarse el plan `lifetime` de $1.900.000 CLP y escalar a admin de la plataforma),
**~12 bugs de negocio de alto impacto** (doble cobro en el POS, propinas perdidas en
silencio, inventario con condiciones de carrera, corte de trial sólo en el frontend) y
**~20 hallazgos medios/bajos** (rendimiento, deuda técnica, locale, dead code).

Las 3 vulnerabilidades críticas quedaron **cerradas y verificadas en producción**
(REST real con anon key + catálogo de privilegios). Las migraciones están aplicadas
y versionadas en el repo. La suite de tests queda en **171/171 pasando** (antes 160/161,
con 1 test documentando un bug que ahora está corregido), TypeScript compila limpio
desde cero (reveló 6 errores latentes que la caché ocultaba) y el build de producción
pasa con **~500 KB menos** de dependencias muertas.

---

## 2. Hallazgos de seguridad y su estado

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|-----------|----------|-----------|--------|
| S-1 | **CRÍTICA** | Owner podía auto-activarse cualquier plan sin pagar: UPDATE directo de `subscription_plan`/`status`/`trial_ends_at` ("pago simulado" con escritura real) y policy `restaurants_owner_update` sin restricción de columnas | `RestaurantSettings.tsx:246-296` + `20260101000001_auth_profiles.sql:306` | ✅ **CERRADA** — fake checkout eliminado (redirige al checkout real de Flow vía `useFlowSubscription.subscribe`) + grants por columna que excluyen esas columnas + trigger server-side de corte de servicio |
| S-2 | **CRÍTICA** | Escalada a admin: `profiles_update_self` + grant UPDATE de tabla permitían `UPDATE profiles SET role='admin'`; `is_admin()` lee esa columna | `20260101000001:289` + `20260807020200` grants | ✅ **CERRADA** — `REVOKE UPDATE/INSERT/DELETE` en `profiles` y `GRANT UPDATE (display_name)` únicamente. Verificado: `has_column_privilege('authenticated','profiles','role','UPDATE') = false` |
| S-3 | **CRÍTICA** | `anon` (y cualquier usuario autenticado vía rama pública) podía leer `kitchen_pin_hash`, `kitchen_token`, `flow_*`, `internal_notes`, `block_reason` de TODOS los restaurantes activos | `restaurants_public_menu_select` + `GRANT SELECT` de tabla completa | ✅ **CERRADA** — grants de SELECT por columna; policy pública restringida a `anon`; admin pasa a leer vía RPC `admin_list_restaurants()`. Verificado por REST: `select=kitchen_token` → `42501 permission denied`; el menú público sigue funcionando |
| S-4 | ALTA | Fallback hardcodeado de claves Webpay en 2 Edge Functions | `create-payment-intent/index.ts:31-32`, `webhooks/webpay/index.ts:27-28` | ✅ **CORREGIDA** — falla cerrada si no hay secrets (el frontend ya no usa Webpay; usa Flow.cl) |
| S-5 | ALTA | Path legacy de creación de órdenes con totales del cliente (flag `use_rpc_create_order`) | `restaurantService.ts:284-294` | ✅ **MITIGADA** — el flag está activo globalmente en producción y el nuevo trigger `validate_public_order_write` valida corte de servicio en TODO insert; las RPCs recalculan precios server-side |
| S-6 | ALTA | `anon` con INSERT/UPDATE/DELETE/TRUNCATE en `profiles`, `restaurants`, `payment_intents`, `registration_requests` (grants huérfanos) | `information_schema.role_table_grants` | ✅ **CERRADA** — revocados; sólo lo que cada flujo necesita |
| S-7 | MEDIA | `ai-recommendations` sin rate limit → coste OpenRouter ilimitado | `ai-recommendations/index.ts` | ✅ **CERRADA** — 10 análisis/24 h por usuario con nueva tabla `ai_usage_log`; función desplegada (v7) |
| S-8 | MEDIA | INSERT anónimo abierto en `payment_intents` | policy + grants | ✅ **CERRADA** — revocado; sólo Edge Functions (service_role) escriben |
| S-9 | BAJA | `profiles_insert_trigger` `WITH CHECK (true)` con grant INSERT anónimo | grants heredados | ✅ **CERRADA** (sin grant ya no es alcanzable; el trigger `handle_new_user` es SECURITY DEFINER) |
| S-10 | BAJA | `.env` con `RESEND_API_KEY` real en disco (NO commiteado, verificado con `git check-ignore` y `git log --all`) | `.env:15` | ⚠️ **ACCIÓN DEL USUARIO**: rotar la clave en Resend |

### Verificación en producción (post-migraciones)

```
has_column_privilege authenticated→restaurants.subscription_plan UPDATE = false   (S-1)
has_column_privilege authenticated→restaurants.status             UPDATE = false   (S-1)
has_column_privilege authenticated→restaurants.kitchen_token      UPDATE = false   (S-3)
has_column_privilege authenticated→profiles.role                  UPDATE = false   (S-2)
has_column_privilege anon→restaurants.kitchen_token               SELECT  = false   (S-3)
has_table_privilege    anon→payment_intents                       INSERT  = false   (S-8)

REST real con anon key:
  GET /rest/v1/restaurants?select=kitchen_token  → 42501 permission denied ✅
  GET /rest/v1/restaurants?select=name…          → 200 con datos          ✅ (menú QR funciona)
```

Advisors de Supabase post-corrección: sin hallazgos ERROR/CRITICAL. Los WARN de
"SECURITY DEFINER ejecutable por anon/authenticated" corresponden a RPCs públicas por
diseño (QR, KDS, pagos) que validan ownership internamente; los INFO son particiones
hijas de `orders` (heredan policies del padre) y tablas legacy/service-only.

---

## 3. Bugs de negocio corregidos

| # | Bug | Evidencia | Corrección |
|---|-----|-----------|------------|
| B-1 | **Doble cobro**: doble clic en "Pagar"/"A Cocina" creaba dos pedidos (`orderSubmitting` era dead code) | `Pos.tsx:1326-1345`, `:106` | Guard real: flag al entrar + `finally`, botones `disabled` + `loading` |
| B-2 | **"Estado Pago" ignorado**: el dropdown no afectaba el pedido creado | `Pos.tsx:550` | `payment_status: finalStatus === "completed" ? paymentStatus : "pending"` |
| B-3 | **Propina perdida en silencio** si fallaba `createTip` (sólo `console.error`) | `Pos.tsx:611-613` | Error visible al cajero con instrucción de registro manual |
| B-4 | Revert optimista no restauraba propina/estado de pago | `Pos.tsx:562-631` | Snapshots completos (carrito + propina + paymentStatus) |
| B-5 | **Corte de trial sólo en frontend**: el INSERT legacy y el flujo QR sin check server-side | RPC `create_order` era el único punto | Trigger `validate_public_order_write` extendido: rechaza pedidos de restaurantes `blocked` o trial vencido (cualquier rol excepto service_role). Además **pg_cron diario** (`sweep-expired-trials`, 04:00 UTC) bloquea trials vencidos |
| B-6 | **Inventario no atómico**: read-then-write con pérdida de escrituras y movimientos sin log | `inventoryService.ts:158-201` | RPC `adjust_inventory_stock` SECURITY DEFINER (UPDATE atómico + INSERT de movimiento en la misma transacción) + mensajes claros en UI |
| B-7 | **Stock negativo** permitido sin restricción | sin CHECK en BD | CHECK `current_stock >= 0` + saneo de negativos históricos con movimiento de auditoría + clamp a 0 en la deducción por venta (no rompe pedidos cuando el stock registrado es insuficiente) |
| B-8 | **Ticket con doble conteo**: `item_total` (total de línea en BD por ambas RPCs) multiplicado por cantidad al imprimir | `Pos.tsx:1598` | Semántica unificada: los escritores envían total de línea (`unit × qty`, redondeado) y el ticket imprime `item_total` directo. `Orders`/`Reports` ya lo leían así |
| B-9 | **Reports mostraba errores como "sin ventas"** | `Reports.tsx:157-161` | Estado de error distinguido (`Alert`), errores manejados en tabs tips/inventario/meseros, criterio `min_stock > 0` consistente con Inventory |
| B-10 | **Agrupación diaria ambigua** (etiqueta mes/día sin año, sin orden garantizado) | `Reports.tsx:118-133` | Clave ISO + orden cronológico + etiqueta formateada al final |
| B-11 | **Alarma de cocina frágil** (`remaining % 10` podía nunca dispararse) | `Orders.tsx:62` | Disparo por transición a expirado + beeps cada 10 s reales |
| B-12 | Carritos perdidos al recargar (POS y menú QR) | `Pos.tsx:80`, `CustomerMenu.tsx:319` | Persistencia con expiración (POS 12 h en sessionStorage; QR 4 h por slug en localStorage) — **verificado en navegador**: pizza qty 1 restaurada tras reload |

---

## 4. Rendimiento y deuda técnica corregida

- **N+1 de recetas eliminado**: 1 query con join anidado en vez de 1 query por receta; `itemMap` memoizado.
- **`getCustomers`**: ya no descarga TODO el histórico de órdenes — 90 días, columnas mínimas.
- **Polling redundante del POS**: intervalo de QR 10 s → 60 s (el realtime `orders_events` mantiene la lista); banner de turno con manejo de error (ya no muestra "sin turno" falso) y sin sombra de `window.fetch`.
- **`removeChannel`** en los cleanups realtime (POS directo y wrapper `subscribeToOrders`).
- **IVA unificado**: `splitTaxFromTotal()` desde `APP_CONFIG.taxRate` — eliminados los 4 literales `1.19` (Pos, CustomerMenu, Reports, helper muerto ahora usado).
- **`getTrialDaysLeft`/`isTrialExpired` centralizados** en `helpers.ts` (había 6 copias con 3 variantes) — usados en Pos, CustomerMenu, Dashboard, Settings, AllRestaurants.
- **Locale `es-CL`** en `formatDateTime/formatDate/formatTime` (antes `en-IN`) y `isValidPhone` corregido a formato chileno (era regex de India).
- **Dead code fuera del bundle**: `mockSupabase` (1.166 líneas) ya no se importa estáticamente; `jspdf` + `html2canvas` removidos de dependencias (~500 KB, uno con CVE conocido); chunk `pdf` eliminado de `vite.config`.
- **Tipos**: `Order.payment_status` como unión (`"paid"|"pending"|"failed"` según CHECK real de BD); `RestaurantSettings` usa RPC `kitchen_pin_is_set` en vez de leer el hash.
- **Drift de esquema reparado**: las columnas `currency`, `usd_exchange_rate`, `default_language`, `default_prep_time` NO existían en producción (migración `20260101000003` marcada aplicada pero nunca ejecutada) — la página de Configuración estaba rota en producción. Reparadas idempotentemente.

---

## 5. Migraciones aplicadas a producción

| Migración | Contenido |
|---|---|
| `20260828000000_audit_repair_missing_columns` | Columnas de configuración faltantes (drift) |
| `20260828000001_audit_lock_sensitive_columns` | Grants por columna en `profiles` y `restaurants`; revoca permisos huérfanos de anon |
| `audit_fix_registration_grants` + `audit_fix_restaurants_update_grant` | Correcciones de los grants (admin necesita leer `registration_requests`; sintaxis correcta `GRANT UPDATE (cols)` — la lista de columnas no se adjunta sola a UPDATE) |
| `20260828000002_audit_enforce_service_cutoff` | Trigger de corte de servicio para todo INSERT/UPDATE de órdenes + `sweep_expired_trials()` + job pg_cron diario |
| `20260828000003_audit_ai_usage_log` | Tabla de conteo para rate limit de IA |
| `20260828000004_audit_scope_restaurant_visibility` | Policy owner-only + policy admin + RPC `admin_list_restaurants()`; elimina policy legacy basada en tabla `users` |
| `20260828000005_audit_kitchen_pin_status` | RPC booleana del estado del PIN (sin exponer el hash) |
| `20260828000006_audit_atomic_inventory_adjust` | RPC atómica de ajuste + clamp en deducción + CHECK stock ≥ 0 |

**Edge Functions desplegadas**: `ai-recommendations` (v7, con rate limit) y
`create-payment-intent` (v18, falla cerrada sin secrets). El router `webhooks`
tiene la corrección en el repo; desplegar con `supabase functions deploy webhooks`
cuando se retome el flujo Webpay (el frontend actual no lo usa).

---

## 6. Pruebas de funcionamiento

| Prueba | Resultado |
|---|---|
| `npm test` (unit + security + integration mocks) | ✅ **171 passed / 0 failed** (28 skipped: requieren Supabase local) |
| Tests nuevos | ✅ `S07-column-hardening` (4 tests de regresión de las 3 vulnerabilidades), `U21-tax-and-trial-helpers` (IVA + trial), `U02` actualizado al comportamiento corregido |
| `tsc -b` limpio desde cero | ✅ 0 errores (reveló y corrigió 6 errores latentes: `TableQR`, `SetupPassword`, casts en 3 servicios, `RestaurantSettings`) |
| `npm run build` (producción) | ✅ OK, sin chunk PDF y sin mock en bundle |
| Lint | 374 problemas (baseline pre-auditoría: 379 — sin regresión; deuda preexistente documentada) |
| REST real con anon key | ✅ fuga cerrada (42501) y menú funcional (200) |
| Smoke en navegador (dev server + BD real) | ✅ Menú QR carga restaurante + 3 productos con precios; carrito persiste tras recargar (pizza qty 1, $9.000); guard de sesión redirige `/restaurant/pos` → `/login` |
| Advisors Supabase (security) | Sin ERROR/CRITICAL; WARNs por diseño (RPCs públicas con validación interna) |

---

## 7. Pendientes / recomendaciones (requieren decisión o acción del usuario)

1. **Rotar `RESEND_API_KEY`** (`.env:15`): está en disco, no en git, pero se leyó durante la auditoría. Rotación en dashboard de Resend.
2. **Desplegar `webhooks`** con `supabase functions deploy webhooks` para subir el fix de las claves Webpay (inofensivo hoy: el frontend usa Flow.cl y la clave hardcodeada era la pública de integración de Transbank).
3. **Corte de trial en producción**: el sweep pg_cron bloqueará los 3 restaurantes con trial vencido (`[AUTOR]di`, `Resto-1786060317508`, `Resto-Menu-1786060344674` — los dos últimos parecen pruebas). El primer sweep corre a las 04:00 UTC. Si alguno debe seguir activo, pagar/reactivarlo manualmente antes.
4. **Lint (374 problemas preexistentes)**: mayoría `no-explicit-any` en `supabase/functions` y páginas grandes; con `strict: true` pendiente (~158 `any`). Roadmap gradual sugerido: activar `noImplicitAny` primero.
5. **Realtime y columnas**: los payloads de Realtime no respetan grants de columna; mitigado quitando la rama pública de `restaurants_owner_select` para autenticados (sólo ven sus restaurantes por RLS). Si en el futuro se necesita exposición más amplia, mover columnas sensibles a tabla separada.
6. **License MIT + `"private": false`** en un repo público: revisar si es intencional para un producto comercial.
7. **Tests de integración/E2E contra Supabase local** (28 skipped): requieren `supabase start` + seeds `E2E_*`; quedaron fuera de esta sesión.

---

## 8. Archivos tocados

- **26 archivos modificados**, 9 nuevos (7 migraciones + 2 suites de test): ver `git status`.
- Cliente adaptado al hardening por columna: `useAuth`, `CustomerMenu`, `RestaurantSettings`, `adminService` (RPC admin), `kitchen_pin_is_set`.
- Cambios NO commiteados (esperando tu revisión): los dejo organizados por fase en el working tree.
