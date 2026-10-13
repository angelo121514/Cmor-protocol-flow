-- =====================================================================
-- Migración 20260828000000_audit_repair_missing_columns.sql
-- Auditoría 2026-08-28 — reparación de drift de esquema.
--
-- La migración 20260101000003 está registrada como aplicada en producción
-- pero las 4 columnas de configuración del restaurante no existen (el
-- entorno se bootstrapeó con los scripts de database/ y el registro de
-- migraciones se reconcilió después). Sin estas columnas la página de
-- Configuración falla al guardar y el menú QR no puede leer moneda/IVA.
-- Reparación idempotente con los mismos defaults y CHECKs.
-- =====================================================================
BEGIN;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD')),
  ADD COLUMN IF NOT EXISTS usd_exchange_rate NUMERIC DEFAULT 950,
  ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'es' CHECK (default_language IN ('es', 'en')),
  ADD COLUMN IF NOT EXISTS default_prep_time INTEGER DEFAULT 15;

COMMIT;