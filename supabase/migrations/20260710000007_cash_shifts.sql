-- Fase 7: Cierre de Turno / Caja (cash_shifts)
--
-- Turno de caja: se abre con un fondo inicial, acumula ventas en vivo y se
-- cierra con el conteo real del efectivo. La diferencia (esperado vs. real)
-- se cuadra server-side al cerrar, junto con un resumen de propinas por mesero.
--
-- Las RPCs open_cash_shift / close_cash_shift son SECURITY DEFINER con
-- validación is_my_restaurant (RAISE 42501). El cálculo de totales al cerrar
-- vive en la RPC (no en el frontend) para que el monto no sea manipulable.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY.
-- open_cash_shift retorna el turno activo si ya existe uno (no duplica).
-- close_cash_shift retorna el turno sin recalcular si ya está cerrado.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- cash_shifts: un turno de caja por restaurante.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.cash_shifts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  opened_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  total_sales     decimal(10,2) NOT NULL DEFAULT 0,
  cash_sales      decimal(10,2) NOT NULL DEFAULT 0,
  card_sales      decimal(10,2) NOT NULL DEFAULT 0,
  transfer_sales  decimal(10,2) NOT NULL DEFAULT 0,
  qr_sales        decimal(10,2) NOT NULL DEFAULT 0,
  total_tips      decimal(10,2) NOT NULL DEFAULT 0,
  cash_tips       decimal(10,2) NOT NULL DEFAULT 0,
  card_tips       decimal(10,2) NOT NULL DEFAULT 0,
  opening_cash    decimal(10,2) NOT NULL DEFAULT 0,
  expected_cash   decimal(10,2) NOT NULL DEFAULT 0,
  actual_cash     decimal(10,2),
  cash_difference decimal(10,2),
  -- Contrato: Array<{ waiter_id: uuid; name: text; tables: int; sales: decimal; tips: decimal }>
  waiter_summary  jsonb NOT NULL DEFAULT '[]'::jsonb,
  orders_count    integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_restaurant
  ON public.cash_shifts(restaurant_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_open
  ON public.cash_shifts(restaurant_id) WHERE status = 'open';

-- Trigger updated_at (reutiliza update_updated_at_column() existente).
DROP TRIGGER IF EXISTS trg_cash_shifts_updated_at ON public.cash_shifts;
CREATE TRIGGER trg_cash_shifts_updated_at BEFORE UPDATE ON public.cash_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (mismo estándar que el resto de operaciones: FOR ALL USING + WITH CHECK).
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages cash_shifts" ON public.cash_shifts;
CREATE POLICY "Owner manages cash_shifts" ON public.cash_shifts
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

-- =========================================================================
-- open_cash_shift: abre un turno de caja.
-- Idempotente: si ya hay un turno 'open' para el restaurante, lo retorna tal
-- cual (no crea duplicados). Valida ownership y que el fondo no sea negativo.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.open_cash_shift(
  p_restaurant_id uuid,
  p_opening_cash  decimal DEFAULT 0,
  p_notes         text DEFAULT NULL
) RETURNS public.cash_shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.cash_shifts;
  v_id uuid;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
    RAISE EXCEPTION 'El fondo inicial no puede ser negativo' USING ERRCODE = '23514';
  END IF;

  -- ¿Ya hay un turno abierto? Retornarlo sin duplicar.
  SELECT * INTO v_existing
    FROM public.cash_shifts
    WHERE restaurant_id = p_restaurant_id AND status = 'open'
    LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.cash_shifts(restaurant_id, opened_by, opening_cash, notes)
    VALUES (p_restaurant_id, auth.uid(), p_opening_cash, p_notes)
    RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;
GRANT EXECUTE ON FUNCTION public.open_cash_shift(uuid, decimal, text) TO authenticated;

-- =========================================================================
-- close_cash_shift: cierra el turno calculando totales server-side.
--
-- Bucketiza los pedidos completed del rango [opened_at, now()] por método de
-- pago (null → cash, como el POS), arma el waiter_summary agregando tips y
-- ventas por mesero, y cuadra la caja:
--   expected_cash   = opening_cash + cash_sales + cash_tips
--   cash_difference = actual_cash - expected_cash
--
-- Idempotente: si el turno ya está cerrado, lo retorna sin recalcular.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.close_cash_shift(
  p_shift_id    uuid,
  p_actual_cash decimal,
  p_notes       text DEFAULT NULL
) RETURNS public.cash_shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_shift  public.cash_shifts;
  v_rest   uuid;
  v_method text;
  v_cash   decimal(10,2) := 0;
  v_card   decimal(10,2) := 0;
  v_trans  decimal(10,2) := 0;
  v_qr     decimal(10,2) := 0;
  v_total  decimal(10,2) := 0;
  v_count  integer := 0;
  v_ttips  decimal(10,2) := 0;
  v_ctips  decimal(10,2) := 0;
  v_dtips  decimal(10,2) := 0;
  v_exp    decimal(10,2);
  v_diff   decimal(10,2);
  v_wsum   jsonb := '[]'::jsonb;
  v_row    record;
BEGIN
  SELECT * INTO v_shift FROM public.cash_shifts WHERE id = p_shift_id;
  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'shift not found' USING ERRCODE = '404';
  END IF;
  IF NOT public.is_my_restaurant(v_shift.restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Idempotente: ya cerrado → retornar sin recalcular.
  IF v_shift.status = 'closed' THEN
    RETURN v_shift;
  END IF;

  v_rest := v_shift.restaurant_id;

  -- Ventas por método: pedidos completed dentro del rango del turno.
  -- payment_method no tiene CHECK; null/vacío se trata como cash (igual que POS).
  FOR v_row IN
    SELECT total,
           COALESCE(NULLIF(payment_method, ''), 'cash') AS method
      FROM public.orders
      WHERE restaurant_id = v_rest
        AND status = 'completed'
        AND completed_at >= v_shift.opened_at
        AND completed_at <= now()
  LOOP
    v_count := v_count + 1;
    v_total := v_total + v_row.total;
    CASE v_row.method
      WHEN 'cash'      THEN v_cash  := v_cash  + v_row.total;
      WHEN 'card'      THEN v_card  := v_card  + v_row.total;
      WHEN 'transfer'  THEN v_trans := v_trans + v_row.total;
      WHEN 'qr'        THEN v_qr    := v_qr    + v_row.total;
      ELSE             v_cash      := v_cash  + v_row.total;  -- desconocido → cash
    END CASE;
  END LOOP;

  -- Propinas del rango del turno.
  SELECT
    COALESCE(sum(amount), 0),
    COALESCE(sum(amount) FILTER (WHERE payment_method = 'cash'), 0),
    COALESCE(sum(amount) FILTER (WHERE payment_method IN ('card','qr')), 0)
    INTO v_ttips, v_ctips, v_dtips
    FROM public.tips
    WHERE restaurant_id = v_rest
      AND created_at >= v_shift.opened_at
      AND created_at <= now();

  -- waiter_summary: ventas y propinas por mesero en el rango del turno.
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.sales DESC NULLS LAST), '[]'::jsonb)
    INTO v_wsum
    FROM (
      SELECT
        w.id   AS waiter_id,
        w.name AS name,
        COUNT(DISTINCT o.table_number) AS tables,
        COALESCE(sum(o.total), 0)      AS sales,
        COALESCE(sum(t.amount), 0)     AS tips
        FROM public.waiters w
        LEFT JOIN public.orders o
          ON o.waiter_id = w.id
         AND o.restaurant_id = v_rest
         AND o.status = 'completed'
         AND o.completed_at >= v_shift.opened_at
         AND o.completed_at <= now()
        LEFT JOIN public.tips t
          ON t.waiter_id = w.id
         AND t.restaurant_id = v_rest
         AND t.created_at >= v_shift.opened_at
         AND t.created_at <= now()
        WHERE w.restaurant_id = v_rest
          AND w.is_active = true
        GROUP BY w.id, w.name
    ) x;

  v_exp  := v_shift.opening_cash + v_cash + v_ctips;
  v_diff := p_actual_cash - v_exp;

  UPDATE public.cash_shifts SET
    closed_by       = auth.uid(),
    closed_at       = now(),
    total_sales     = v_total,
    cash_sales      = v_cash,
    card_sales      = v_card,
    transfer_sales  = v_trans,
    qr_sales        = v_qr,
    total_tips      = v_ttips,
    cash_tips       = v_ctips,
    card_tips       = v_dtips,
    expected_cash   = v_exp,
    actual_cash     = p_actual_cash,
    cash_difference = v_diff,
    waiter_summary  = v_wsum,
    orders_count    = v_count,
    status          = 'closed',
    notes           = COALESCE(p_notes, notes)
    WHERE id = p_shift_id
    RETURNING * INTO v_shift;

  RETURN v_shift;
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_cash_shift(uuid, decimal, text) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.close_cash_shift(uuid, decimal, text);
-- DROP FUNCTION IF EXISTS public.open_cash_shift(uuid, decimal, text);
-- DROP TRIGGER IF EXISTS trg_cash_shifts_updated_at ON public.cash_shifts;
-- DROP TABLE IF EXISTS public.cash_shifts;
