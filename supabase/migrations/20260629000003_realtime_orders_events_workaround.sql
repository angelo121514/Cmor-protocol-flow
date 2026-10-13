-- =====================================================================
-- CMOR FLOW — Workaround Realtime para tabla orders particionada
-- ---------------------------------------------------------------------
-- Bug de Supabase: las tablas particionadas no emiten eventos Realtime
-- correctamente. Este workaround crea una tabla espejo NO particionada
-- (orders_events) y un trigger que replica cada cambio de orders ahí.
-- El frontend escucha orders_events en vez de orders.
--
-- Síntomas en producción:
--   - La pestaña POS/Pedidos no se actualiza cuando un cliente hace pedido
--   - El fallback de polling cada 30s es lo único que funciona
--   - WebSocket Realtime se conecta pero no recibe eventos postgres_changes
--
-- Solución verificada en producción el 2026-06-29.
-- =====================================================================

BEGIN;

-- 1. Tabla espejo (NO particionada — esto es CRÍTICO)
CREATE TABLE IF NOT EXISTS public.orders_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE')),
  order_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_events_restaurant
  ON public.orders_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_events_order
  ON public.orders_events (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_events_cleanup
  ON public.orders_events (created_at);

-- 2. RLS: misma política que orders (is_my_restaurant + is_admin)
ALTER TABLE public.orders_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant owners can read own order events" ON public.orders_events;
CREATE POLICY "Restaurant owners can read own order events" ON public.orders_events
  FOR SELECT TO authenticated
  USING (public.is_my_restaurant(restaurant_id) OR public.is_admin());

GRANT SELECT ON public.orders_events TO authenticated, anon;

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.orders_events (order_id, restaurant_id, event_type, order_data)
    VALUES (OLD.id, OLD.restaurant_id, 'DELETE', NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.orders_events (order_id, restaurant_id, event_type, order_data)
    VALUES (NEW.id, NEW.restaurant_id, 'UPDATE', to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO public.orders_events (order_id, restaurant_id, event_type, order_data)
    VALUES (NEW.id, NEW.restaurant_id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

-- 4. Trigger en tabla madre orders (afecta todas las particiones)
DROP TRIGGER IF EXISTS orders_realtime_mirror ON public.orders;
CREATE TRIGGER orders_realtime_mirror
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_event();

-- 5. Activar orders_events en Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders_events;
  END IF;
END $$;

-- 6. Replica identity FULL para DELETE events con payload
ALTER TABLE public.orders_events REPLICA IDENTITY FULL;

-- 7. Documentación
COMMENT ON TABLE public.orders_events IS
  'Tabla espejo para Realtime. Workaround al bug de Supabase con tablas particionadas. NO particionar esta tabla.';
COMMENT ON FUNCTION public.notify_order_event() IS
  'Trigger function que replica cambios de orders a orders_events para Realtime.';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────
-- Rollback:
-- ─────────────────────────────────────────────────────
-- BEGIN;
--   DROP TRIGGER IF EXISTS orders_realtime_mirror ON public.orders;
--   DROP FUNCTION IF EXISTS public.notify_order_event();
--   DROP TABLE IF EXISTS public.orders_events;
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
