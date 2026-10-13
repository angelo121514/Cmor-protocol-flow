-- Fase 3: Sistema de Propinas
-- Crea tabla tips + columnas de configuración en restaurants (tips_enabled,
-- tips_default_pct, tips_suggested_pcts). RLS con USING+WITH CHECK.
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

BEGIN;

-- Tabla de propinas
-- Nota: order_id NO lleva REFERENCES porque orders está particionada y
-- Postgres no soporta FK hacia tablas particionadas. La integridad se
-- valida por aplicación (service layer).
CREATE TABLE IF NOT EXISTS public.tips (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id      uuid,
  waiter_id     uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  amount        decimal(10,2) NOT NULL CHECK (amount >= 0),
  percentage    decimal(5,2),
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('cash','card','transfer','qr')),
  status        text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected','pending_payout','paid_out')),
  paid_out_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_waiter ON public.tips(waiter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_restaurant ON public.tips(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_order ON public.tips(order_id);

-- Configuración de propinas por restaurante
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tips_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tips_default_pct decimal(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS tips_suggested_pcts decimal(5,2)[] NOT NULL DEFAULT ARRAY[10.00, 15.00, 20.00];

-- RLS
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages tips" ON public.tips;
CREATE POLICY "Owner manages tips" ON public.tips
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS public.tips;
-- ALTER TABLE public.restaurants
--   DROP COLUMN IF EXISTS tips_enabled,
--   DROP COLUMN IF EXISTS tips_default_pct,
--   DROP COLUMN IF EXISTS tips_suggested_pcts;
