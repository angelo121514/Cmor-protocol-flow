-- Fase 8: Dashboard del Dueño (realtime + notifications)
--
-- 1. Tabla notifications (declarada pero nunca creada — se crea desde cero).
--    Las notificaciones se insertan vía SECURITY DEFINER (triggers de inventario
--    bajo, pedidos nuevos). El dueño las consulta vía SELECT (RLS).
--    Se marcan como read con una RPC.
--
-- 2. Security fix transversal: las 6 RPCs de reports (get_daily_sales, etc.)
--    NO validan ownership. Cualquier usuario autenticado puede pasar un UUID
--    ajeno y leer datos de otro restaurante. Se añade is_my_restaurant
--    al inicio de cada función (RAISE 42501 si no es dueño).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY.

BEGIN;

-- =========================================================================
-- notifications: alertas del sistema para el dueño del restaurante.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN (
    'low_stock', 'order_new', 'order_completed', 'order_cancelled',
    'shift_opened', 'shift_closed', 'info'
  )),
  title           text NOT NULL,
  message         text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_restaurant
  ON public.notifications(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(restaurant_id)
  WHERE is_read = false;

-- RLS: solo el dueño puede ver/insertar/actualizar sus notificaciones.
-- INSERT se permite sin restricción adicional porque las insertan triggers
-- SECURITY DEFINER (no el cliente directamente).
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner manages notifications" ON public.notifications;
CREATE POLICY "Owner manages notifications" ON public.notifications
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));

-- RPC: marcar notificaciones como leídas.
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_restaurant_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.notifications
    SET is_read = true
    WHERE restaurant_id = p_restaurant_id AND is_read = false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid) TO authenticated;

-- =========================================================================
-- SECURITY FIX: añadir is_my_restaurant a las 6 RPCs de reports.
-- Todas eran SECURITY DEFINER sin validar que el caller es dueño del
-- restaurante pasado como parámetro. Un usuario autenticado podía leer datos
-- de cualquier restaurante pasando su UUID.
-- =========================================================================

-- 1. get_daily_sales
CREATE OR REPLACE FUNCTION public.get_daily_sales(
  p_restaurant_id uuid,
  p_from date,
  p_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  day date,
  total numeric,
  order_count int,
  avg_ticket numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    DATE(o.created_at) AS day,
    COALESCE(SUM(o.total), 0) AS total,
    COUNT(*)::int AS order_count,
    COALESCE(AVG(o.total), 0)::numeric AS avg_ticket
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND DATE(o.created_at) BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled')
  GROUP BY DATE(o.created_at)
  ORDER BY day;
END;
$$;

-- 2. get_top_items
CREATE OR REPLACE FUNCTION public.get_top_items(
  p_restaurant_id uuid,
  p_from date,
  p_to date DEFAULT CURRENT_DATE,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  menu_item_id uuid,
  name text,
  total_sold int,
  revenue numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    (item->>'menu_item_id')::uuid AS menu_item_id,
    item->>'name' AS name,
    SUM((item->>'quantity')::int)::int AS total_sold,
    SUM((item->>'item_total')::numeric) AS revenue
  FROM public.orders o,
       jsonb_array_elements(o.items) AS item
  WHERE o.restaurant_id = p_restaurant_id
    AND DATE(o.created_at) BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled')
  GROUP BY (item->>'menu_item_id')::uuid, item->>'name'
  ORDER BY total_sold DESC
  LIMIT p_limit;
END;
$$;

-- 3. get_avg_ticket
CREATE OR REPLACE FUNCTION public.get_avg_ticket(
  p_restaurant_id uuid,
  p_from date,
  p_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  avg_ticket numeric,
  min_ticket numeric,
  max_ticket numeric,
  total_orders int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    AVG(o.total)::numeric AS avg_ticket,
    MIN(o.total)::numeric AS min_ticket,
    MAX(o.total)::numeric AS max_ticket,
    COUNT(*)::int AS total_orders
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND DATE(o.created_at) BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled');
END;
$$;

-- 4. get_sales_by_hour
CREATE OR REPLACE FUNCTION public.get_sales_by_hour(
  p_restaurant_id uuid,
  p_from date,
  p_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hour_of_day int,
  total numeric,
  order_count int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM o.created_at)::int AS hour_of_day,
    COALESCE(SUM(o.total), 0) AS total,
    COUNT(*)::int AS order_count
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND DATE(o.created_at) BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled')
  GROUP BY hour_of_day
  ORDER BY hour_of_day;
END;
$$;

-- 5. get_sales_by_order_type
CREATE OR REPLACE FUNCTION public.get_sales_by_order_type(
  p_restaurant_id uuid,
  p_from date,
  p_to date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  order_type text,
  total numeric,
  order_count int,
  percentage numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_orders int;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT COUNT(*) INTO v_total_orders
    FROM public.orders
    WHERE restaurant_id = p_restaurant_id
      AND DATE(created_at) BETWEEN p_from AND p_to
      AND status NOT IN ('cancelled');

  RETURN QUERY
  SELECT
    o.order_type,
    COALESCE(SUM(o.total), 0) AS total,
    COUNT(*)::int AS order_count,
    CASE WHEN v_total_orders > 0
      THEN (COUNT(*)::numeric / v_total_orders * 100)
      ELSE 0
    END AS percentage
  FROM public.orders o
  WHERE o.restaurant_id = p_restaurant_id
    AND DATE(o.created_at) BETWEEN p_from AND p_to
    AND o.status NOT IN ('cancelled')
  GROUP BY o.order_type
  ORDER BY total DESC;
END;
$$;

-- 6. get_reports_summary
CREATE OR REPLACE FUNCTION public.get_reports_summary(
  p_restaurant_id uuid,
  p_from date,
  p_to date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(total), 0),
    'total_orders', COUNT(*),
    'avg_ticket', COALESCE(AVG(total), 0),
    'unique_customers', COUNT(DISTINCT customer_email),
    'cancelled_orders', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'completion_rate', CASE WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100)
      ELSE 0
    END
  ) INTO v_result
  FROM public.orders
  WHERE restaurant_id = p_restaurant_id
    AND DATE(created_at) BETWEEN p_from AND p_to;

  RETURN v_result;
END;
$$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.mark_notifications_read(uuid);
-- DROP TABLE IF EXISTS public.notifications;
-- (Las 6 RPCs de reports se restauran a su versión original sin
--  is_my_restaurant ejecutando la migración 20260622000010 de nuevo.)
