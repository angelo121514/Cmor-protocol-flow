-- Paso 4: reduce la superficie pública del monitor de cocina sin romper el
-- flujo QR/KDS. El PIN se limita por IP y los tokens dejan de ser perpetuos.
BEGIN;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS kitchen_token_expires_at timestamptz;

-- Los monitores ya abiertos conservan una ventana breve; los nuevos tokens
-- expiran siempre doce horas después de autenticarse.
UPDATE public.restaurants
SET kitchen_token_expires_at = now() + interval '12 hours'
WHERE kitchen_token IS NOT NULL AND kitchen_token_expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.kitchen_login(
  p_restaurant_id uuid,
  p_pin text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
  v_token text;
  v_headers jsonb;
  v_client_ip text;
BEGIN
  -- El mismo error para PIN inválido, restaurante desconocido o rate-limit.
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 32 THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;
  v_client_ip := COALESCE(
    NULLIF(split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''),
    NULLIF(v_headers ->> 'x-real-ip', '')
  );
  IF v_client_ip IS NOT NULL
     AND NOT public.check_rate_limit(
       'kitchen_login:' || p_restaurant_id::text || ':' || v_client_ip,
       'ip', 'kitchen_login', 10, 5
     ) THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
  END IF;

  SELECT r.kitchen_pin_hash INTO v_hash
  FROM public.restaurants r
  WHERE r.id = p_restaurant_id AND r.is_active = true AND r.status IN ('active','trial');
  IF v_hash IS NULL OR crypt(p_pin, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = '42501';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.restaurants
  SET kitchen_token = v_token,
      kitchen_token_expires_at = now() + interval '12 hours'
  WHERE id = p_restaurant_id;
  RETURN v_token;
END;
$$;

-- Entrega al monitor sólo los campos operativos que necesita la cocina.
CREATE OR REPLACE FUNCTION public.kds_get_orders(p_kitchen_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_restaurant uuid; v_out jsonb;
BEGIN
  SELECT r.id INTO v_restaurant
  FROM public.restaurants r
  WHERE r.kitchen_token = p_kitchen_token
    AND r.kitchen_token_expires_at > now()
    AND r.is_active = true;
  IF v_restaurant IS NULL THEN RAISE EXCEPTION 'invalid' USING ERRCODE = '42501'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'table_number', o.table_number,
    'customer_notes', o.customer_notes,
    'total', o.total,
    'accepted_at', o.accepted_at,
    'created_at', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', item.value ->> 'name',
        'quantity', item.value -> 'quantity',
        'special_instructions', item.value ->> 'special_instructions'
      ))
      FROM jsonb_array_elements(o.items) AS item(value)
    ), '[]'::jsonb)
  ) ORDER BY o.created_at), '[]'::jsonb)
  INTO v_out
  FROM public.orders o
  WHERE o.restaurant_id = v_restaurant
    AND o.status IN ('pending','accepted','preparing','ready');
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.kds_get_restaurant(p_kitchen_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row record;
BEGIN
  SELECT r.id, r.name INTO v_row
  FROM public.restaurants r
  WHERE r.kitchen_token = p_kitchen_token
    AND r.kitchen_token_expires_at > now()
    AND r.is_active = true;
  IF v_row IS NULL THEN RAISE EXCEPTION 'invalid' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('id', v_row.id, 'name', v_row.name, 'default_prep_time', 15);
END;
$$;

-- Son helpers internos/RLS y no forman parte del contrato público del cliente.
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_my_restaurant(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_flag_enabled(text, uuid) FROM anon;

NOTIFY pgrst, 'reload schema';
COMMIT;
