-- =====================================================================
-- Migración 20260901000001_phase2_multi_country.sql
-- Fase 2 multi-país: Mercado Pago (BR/PE) + platos multilingües
--
-- ADITIVA: no elimina datos ni constraints vigentes.
--   1. menu_items: name_pt + description_pt (traducciones de la carta)
--      con grants por columna en los 4 roles (regla PostgREST).
--   2. payment_intents: CHECK de provider ampliado a 'mp' (Mercado Pago).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) menu_items: columnas de traducción al portugués
-- ---------------------------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_pt TEXT;
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Grants por columna (mismos roles que hoy tienen acceso total a esta tabla)
GRANT SELECT (name_pt, description_pt), INSERT (name_pt, description_pt),
      UPDATE (name_pt, description_pt)
  ON TABLE public.menu_items TO anon;
GRANT SELECT (name_pt, description_pt), INSERT (name_pt, description_pt),
      UPDATE (name_pt, description_pt)
  ON TABLE public.menu_items TO authenticated;

-- ---------------------------------------------------------------------
-- 2) payment_intents: aceptar provider 'mp' (Mercado Pago) y el plan
--    'table_order' que order-pay registra para pagos de mesa QR
--    (nombres verificados en prod 2026-09-01)
-- ---------------------------------------------------------------------
ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_provider_check;

ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_provider_check
  CHECK (provider IN ('webpay', 'flow', 'mp'));

ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_plan_check;

ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_plan_check
  CHECK (plan IN ('starter', 'pro', 'lifetime', 'test_plan', 'table_order'));

ANALYZE public.menu_items;

NOTIFY pgrst, 'reload schema';

COMMIT;