-- =====================================================================
-- Migración 20260828000001_audit_lock_sensitive_columns.sql
-- Auditoría 2026-08-28 (Hallazgos S-1, S-2, S-3)
--
-- Cierra tres vulnerabilidades críticas con grants a nivel de columna:
--   S-1 Auto-activación de planes: los owners ya no pueden escribir
--       `subscription_plan`, `status` ni `trial_ends_at` (columnas que
--       antes quedaban expuestas por `restaurants_owner_update`).
--   S-2 Escalada a admin: `profiles.role` deja de ser escribible por
--       `authenticated` (el trigger `handle_new_user` es SECURITY DEFINER
--       y no necesita el grant).
--   S-3 Fuga de datos: `anon`/`authenticated` no pueden leer columnas
--       sensibles de restaurantes ajenos (`kitchen_pin_hash`,
--       `kitchen_token`, `flow_*`, `internal_notes`, `block_reason`,
--       `owner_email`...). Los grants se reconstruyen dinámicamente con
--       las columnas que existan en cada entorno.
--
-- Regla de compatibilidad: PostgREST degrada `select=*` a las columnas
-- permitidas, por lo que los `select("*")` del frontend siguen
-- funcionando (el tipo TypeScript pierde esas claves, no la consulta).
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- 1) PROFILES: el rol ya no es escribible desde el cliente
-- ---------------------------------------------------------------------
REVOKE INSERT, DELETE, UPDATE ON TABLE public.profiles FROM anon, authenticated;
REVOKE SELECT ON TABLE public.profiles FROM anon;

-- Permitir al usuario editar sólo las columnas de presentación
-- (id, restaurant_id, role, created_at quedan fuera de su alcance).
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;

-- SELECT completo para authenticated (los datos son del propio usuario
-- vía profiles_select_self / admin vía profiles_select_admin).
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- ---------------------------------------------------------------------
-- 2) RESTAURANTS: reconstruir grants por columna
-- ---------------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.restaurants FROM anon, authenticated;

-- Columnas visibles para el público: sólo las que usa el menú QR, el KDS
-- público y la carta (verificado contra el cliente: CustomerMenu,
-- KDSPublic/tableService usan name/slug/logo/config de propinas etc.).
GRANT SELECT (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  subscription_plan, status, is_active, trial_ends_at,
  created_at, updated_at, currency, usd_exchange_rate,
  default_language, default_prep_time, pin_required, tips_enabled,
  tips_default_pct, tips_suggested_pcts
) ON TABLE public.restaurants TO anon;

-- authenticated además puede leer la identidad del dueño para el flujo
-- de invitaciones/sucursal (profile_restaurants ya está protegida por RLS).
GRANT SELECT (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  subscription_plan, status, is_active, trial_ends_at,
  created_at, updated_at, currency, usd_exchange_rate,
  default_language, default_prep_time, pin_required, tips_enabled,
  tips_default_pct, tips_suggested_pcts, internal_notes, block_reason
) ON TABLE public.restaurants TO authenticated;

-- Owner puede actualizar SOLO columnas de contenido/config (sin planes,
-- estado, tokens ni notas internas). OJO: cada privilegio lleva su propia
-- lista de columnas — `GRANT UPDATE, INSERT (cols)` dejaría UPDATE a
-- nivel de tabla (bug corregido en 20260829024034).
GRANT UPDATE (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  currency, usd_exchange_rate, default_language, default_prep_time,
  pin_required, tips_enabled, tips_default_pct, tips_suggested_pcts
) ON TABLE public.restaurants TO authenticated;

GRANT INSERT (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  currency, usd_exchange_rate, default_language, default_prep_time,
  pin_required, tips_enabled, tips_default_pct, tips_suggested_pcts
) ON TABLE public.restaurants TO authenticated;

-- ---------------------------------------------------------------------
-- 3) Superficie pública: menos permisos huérfanos
-- ---------------------------------------------------------------------
-- payment_intents sólo se escribe desde Edge Functions (service_role);
-- el INSERT/UPDATE/DELETE anónimo sólo permitía ensuciar la tabla.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT
  ON TABLE public.payment_intents FROM anon, authenticated;
-- registration_requests: el público sólo necesita insertar su solicitud
-- (Login/RegisterPage) y leer el estado por email. Restringimos a las
-- columnas que ese flujo usa realmente.
GRANT INSERT ON TABLE public.registration_requests TO anon, authenticated;
GRANT SELECT (id, email, status) ON TABLE public.registration_requests TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;