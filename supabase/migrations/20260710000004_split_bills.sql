-- Fase 4: División de Cuentas
-- Crea tabla order_payments (pagos parciales de un pedido), columnas is_split
-- y split_count en orders, y RPC can_close_split_order que valida que la suma
-- de pagos paid >= total antes de cerrar la mesa.
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.order_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  payment_number integer NOT NULL DEFAULT 1,
  amount        decimal(10,2) NOT NULL CHECK (amount > 0),
  tip_amount    decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash','card','transfer','qr')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  transaction_id text,
  payer_label   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_restaurant ON public.order_payments(restaurant_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_split boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages order_payments" ON public.order_payments;
CREATE POLICY "Owner manages order_payments" ON public.order_payments
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

-- RPC: validar cierre de cuenta (suma de pagos paid >= total)
CREATE OR REPLACE FUNCTION public.can_close_split_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total decimal; v_paid decimal; v_restaurant uuid;
BEGIN
  SELECT total, restaurant_id INTO v_total, v_restaurant FROM public.orders WHERE id = p_order_id;
  IF v_restaurant IS NULL THEN
    RETURN false;
  END IF;
  IF NOT public.is_my_restaurant(v_restaurant) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(sum(amount),0) INTO v_paid
    FROM public.order_payments WHERE order_id = p_order_id AND payment_status = 'paid';
  RETURN v_paid >= v_total;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_close_split_order(uuid) TO authenticated;

COMMIT;

-- Rollback:
-- ALTER TABLE public.orders DROP COLUMN IF EXISTS is_split, DROP COLUMN IF EXISTS split_count;
-- DROP FUNCTION IF EXISTS public.can_close_split_order(uuid);
-- DROP TABLE IF EXISTS public.order_payments;
