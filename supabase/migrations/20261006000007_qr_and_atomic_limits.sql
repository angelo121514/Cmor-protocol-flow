BEGIN;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.table_sessions WHERE status IN ('active','payment_pending') GROUP BY table_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'multiple_open_table_sessions_require_reconciliation'; END IF;
END $$;
CREATE UNIQUE INDEX one_open_table_session ON public.table_sessions(table_id) WHERE status IN ('active','payment_pending');
REVOKE ALL ON FUNCTION public.start_table_session(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.start_table_session_by_qr(p_qr_token text)
RETURNS TABLE(session_token text,session_id uuid,table_number text,restaurant_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.restaurant_tables; s public.table_sessions; r public.restaurants;
BEGIN
  SELECT * INTO t FROM public.restaurant_tables WHERE qr_token::text=p_qr_token AND is_active FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'invalid_qr' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.restaurants WHERE id=t.restaurant_id;
  IF NOT r.is_active OR r.status NOT IN ('active','trial') OR (r.status='trial' AND (r.trial_ends_at IS NULL OR r.trial_ends_at<=now())) THEN
    RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM public.table_sessions WHERE table_id=t.id AND status IN ('active','payment_pending') FOR UPDATE;
  IF s.id IS NULL THEN
    INSERT INTO public.table_sessions(table_id,restaurant_id,status) VALUES(t.id,t.restaurant_id,'active') RETURNING * INTO s;
    UPDATE public.restaurant_tables SET status='occupied' WHERE id=t.id;
  END IF;
  RETURN QUERY SELECT s.session_token,s.id,t.table_number,t.restaurant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.start_table_session_by_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_table_session_by_qr(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_table_order(p_session_token text,p_order_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.table_sessions; prices jsonb; o public.orders; key uuid; fingerprint text; previous public.order_operations; v_result jsonb;
BEGIN
  SELECT * INTO s FROM public.table_sessions WHERE session_token=p_session_token AND status IN ('active','payment_pending') FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'invalid_or_locked_session' USING ERRCODE='42501'; END IF;
  key:=COALESCE((p_order_data->>'operation_key')::uuid,gen_random_uuid());
  fingerprint:=encode(extensions.digest('table:'||s.id::text||p_order_data::text,'sha256'),'hex');
  INSERT INTO public.order_operations(restaurant_id,operation_key,fingerprint) VALUES(s.restaurant_id,key,fingerprint) ON CONFLICT DO NOTHING;
  SELECT * INTO previous FROM public.order_operations WHERE restaurant_id=s.restaurant_id AND operation_key=key FOR UPDATE;
  IF previous.fingerprint<>fingerprint THEN RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505'; END IF;
  IF previous.result IS NOT NULL THEN RETURN previous.result; END IF;
  IF s.status<>'active' THEN RAISE EXCEPTION 'session_payment_pending'; END IF;
  -- The current table UI sends plain items. Unknown variant identifiers must never be silently undercharged.
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_order_data->'items') x
    WHERE NULLIF(x->>'selected_size_id','') IS NOT NULL OR COALESCE(jsonb_array_length(x->'selected_addon_ids'),0)>0) THEN
    RAISE EXCEPTION 'unsupported_variant_identifier' USING ERRCODE='22023'; END IF;
  prices:=public.price_order_items(s.restaurant_id,p_order_data->'items');
  INSERT INTO public.orders(restaurant_id,order_number,customer_name,customer_phone,order_type,table_number,
    table_session_id,customer_notes,items,subtotal,tax,total,status,payment_status,payment_method)
  VALUES(s.restaurant_id,public.generate_order_number_atomic(),p_order_data->>'customer_name',p_order_data->>'customer_phone',
    'table',(SELECT table_number FROM public.restaurant_tables WHERE id=s.table_id),s.id,p_order_data->>'customer_notes',
    prices->'items',(prices->>'subtotal')::numeric,(prices->>'tax')::numeric,(prices->>'total')::numeric,'pending','pending','qr') RETURNING * INTO o;
  v_result:=jsonb_build_object('success',true,'order_id',o.id,'order_number',o.order_number,'total',o.total,
    'subtotal',o.subtotal,'tax',o.tax,'session_total',(SELECT sum(total) FROM public.orders WHERE table_session_id=s.id AND status NOT IN ('cancelled','rejected')));
  UPDATE public.order_operations SET result=v_result WHERE restaurant_id=s.restaurant_id AND operation_key=key;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.create_table_order(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_table_order(text,jsonb) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.check_menu_items_trial_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_plan text;
BEGIN
  SELECT subscription_plan INTO v_plan FROM public.restaurants WHERE id=NEW.restaurant_id FOR UPDATE;
  IF v_plan='free_trial' AND (SELECT count(*) FROM public.menu_items WHERE restaurant_id=NEW.restaurant_id)>=30 THEN
    RAISE EXCEPTION 'menu_limit' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text,p_identifier_type text,p_endpoint text,
  p_max_attempts int DEFAULT 5,p_window_minutes int DEFAULT 60) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_identifier IS NULL OR p_max_attempts<1 OR p_window_minutes<1 THEN RAISE EXCEPTION 'invalid_limit' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_endpoint||':'||p_identifier_type||':'||p_identifier,0));
  IF (SELECT count(*) FROM public.rate_limits WHERE identifier=p_identifier AND identifier_type=p_identifier_type
    AND endpoint=p_endpoint AND window_start>=now()-make_interval(mins=>p_window_minutes))>=p_max_attempts THEN RETURN false; END IF;
  INSERT INTO public.rate_limits(identifier,identifier_type,endpoint,window_start) VALUES(p_identifier,p_identifier_type,p_endpoint,now());
  RETURN true;
END;
$$;
REVOKE INSERT,UPDATE,DELETE ON public.rate_limits FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.check_rate_limit(text,text,text,int,int),public.check_menu_items_trial_limit() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,text,text,int,int) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
