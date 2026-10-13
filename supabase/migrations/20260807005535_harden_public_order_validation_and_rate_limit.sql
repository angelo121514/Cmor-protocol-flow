-- Los pedidos públicos siguen usando RPC, pero toda inserción queda protegida
-- también en la tabla para evitar cantidades negativas/cero y abuso básico.
CREATE OR REPLACE FUNCTION public.validate_public_order_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_quantity_text text;
  v_headers jsonb;
  v_client_ip text;
  v_allowed boolean;
BEGIN
  IF NEW.total IS NULL OR NEW.total <= 0
     OR NEW.subtotal IS NULL OR NEW.subtotal < 0
     OR NEW.tax IS NULL OR NEW.tax < 0 THEN
    RAISE EXCEPTION 'invalid_order_amount' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(NEW.items) <> 'array'
     OR jsonb_array_length(NEW.items) = 0
     OR jsonb_array_length(NEW.items) > 50 THEN
    RAISE EXCEPTION 'invalid_order_items' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(NEW.items) LOOP
    v_quantity_text := v_item ->> 'quantity';
    IF jsonb_typeof(v_item) <> 'object'
       OR v_quantity_text IS NULL
       OR v_quantity_text !~ '^[1-9][0-9]*$'
       OR v_quantity_text::integer > 100 THEN
      RAISE EXCEPTION 'invalid_item_quantity' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- PostgREST entrega estos headers sólo en peticiones HTTP. Procesos internos
  -- (webhooks/service_role) siguen funcionando sin depender de una IP.
  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  v_client_ip := COALESCE(
    NULLIF(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''),
    NULLIF(v_headers ->> 'x-real-ip', '')
  );

  IF v_client_ip IS NOT NULL THEN
    v_allowed := public.check_rate_limit(
      'order:' || NEW.restaurant_id::text || ':' || v_client_ip,
      'ip',
      'public_create_order',
      20,
      5
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'order_rate_limit_exceeded' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_public_order_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_public_order_write() TO service_role;

-- `check_rate_limit` sólo debe ser llamada desde una función/trigger del
-- servidor; su ejecución directa permitiría manipular contadores arbitrarios.
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, text, integer, integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, integer, integer)
TO service_role;

DROP TRIGGER IF EXISTS trg_validate_public_order_write ON public.orders;
CREATE TRIGGER trg_validate_public_order_write
  BEFORE INSERT OR UPDATE OF subtotal, tax, total, items
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_public_order_write();

NOTIFY pgrst, 'reload schema';
