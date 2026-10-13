-- Fase 5: RPC para que el webhook Flow marque una sesión como pagada.
--
-- El webhook Flow (Edge Function, service_role) recibe la confirmación de pago
-- con commerceOrder = 'ORDP-<session_id>'. Esta RPC hace el trabajo atómico:
--   1. Valida que la sesión exista y no esté ya cerrada (idempotencia).
--   2. Marca todos los pedidos de la sesión como completed/paid.
--      (Esto dispara el trigger de inventario de la Fase 1 automáticamente.)
--   3. Inserta una propina (si tip_amount > 0 y waiter_id resoluble).
--   4. Cierra la sesión (status='closed', closed_at, fija totales).
--   5. Libera la mesa (status='available').
--
-- El GRANT es solo a authenticated, pero el webhook la invoca con el client
-- service_role (que bypasea RLS y puede ejecutar cualquier función GRANTada
-- a authenticated/anon por cómo Supabase resuelve permisos del service role).
-- Para máxima compatibilidad, también se otorga a anon.

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_session_payment(
  p_session_id uuid,
  p_tip_amount numeric DEFAULT 0,
  p_transaction_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session record;
  v_already_closed boolean;
  v_waiter_id uuid;
  v_processed_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT s.id, s.restaurant_id, s.table_id, s.status, s.tip_amount
    INTO v_session
    FROM public.table_sessions s
    WHERE s.id = p_session_id
    LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
  END IF;

  -- Idempotencia: si ya está cerrada, no hacer nada.
  IF v_session.status = 'closed' THEN
    RETURN jsonb_build_object('success', true, 'already_closed', true);
  END IF;

  -- Marcar pedidos pendientes como completados/pagados.
  -- status pasa a 'completed' (dispara trigger de inventario Fase 1) y
  -- payment_status a 'paid' con método 'qr' y el transaction_id de Flow.
  WITH updated AS (
    UPDATE public.orders
      SET status = 'completed',
          payment_status = 'paid',
          payment_method = 'qr',
          payment_transaction_id = COALESCE(p_transaction_id, payment_transaction_id),
          completed_at = now(),
          updated_at = now()
      WHERE table_session_id = v_session.id
        AND status NOT IN ('completed','cancelled','rejected')
      RETURNING id
  )
  SELECT count(*) INTO v_processed_count FROM updated;

  -- Propina: asociar al mesero del último pedido de la sesión (si lo hubo).
  IF p_tip_amount > 0 THEN
    SELECT o.waiter_id INTO v_waiter_id
      FROM public.orders o
      WHERE o.table_session_id = v_session.id AND o.waiter_id IS NOT NULL
      ORDER BY o.created_at DESC LIMIT 1;

    IF v_waiter_id IS NOT NULL THEN
      INSERT INTO public.tips(
        restaurant_id, order_id, waiter_id, amount,
        percentage, payment_method, status
      )
      VALUES (
        v_session.restaurant_id, NULL, v_waiter_id, p_tip_amount,
        NULL, 'qr', 'collected'
      );
    ELSE
      -- Sin mesero asignado: propina genérica del restaurante.
      INSERT INTO public.tips(
        restaurant_id, order_id, waiter_id, amount,
        percentage, payment_method, status
      )
      VALUES (
        v_session.restaurant_id, NULL, NULL, p_tip_amount,
        NULL, 'qr', 'collected'
      );
    END IF;
  END IF;

  -- Cerrar sesión.
  UPDATE public.table_sessions
    SET status = 'closed',
        closed_at = now(),
        tip_amount = p_tip_amount
    WHERE id = v_session.id;

  -- Liberar la mesa.
  UPDATE public.restaurant_tables
    SET status = 'available'
    WHERE id = v_session.table_id;

  RETURN jsonb_build_object(
    'success', true,
    'orders_completed', v_processed_count,
    'tip_amount', p_tip_amount
  );
END;
$$;
REVOKE ALL ON FUNCTION public.complete_session_payment(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session_payment(uuid,numeric,text) TO service_role;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.complete_session_payment(uuid,numeric,text);
