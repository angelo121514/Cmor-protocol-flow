BEGIN;
ALTER TABLE public.orders ADD COLUMN cash_shift_id uuid REFERENCES public.cash_shifts(id);
-- Existing payments retain their original amount semantics. New POS parts include tips.
ALTER TABLE public.order_payments ADD COLUMN includes_tip boolean NOT NULL DEFAULT false;
ALTER TABLE public.order_payments ADD CONSTRAINT split_tip_component CHECK (NOT includes_tip OR (tip_amount>=0 AND tip_amount<=amount));
CREATE TABLE public.order_operations(restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  operation_key uuid NOT NULL, fingerprint text NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(restaurant_id,operation_key));
ALTER TABLE public.order_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_operations FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_order(p_restaurant_id uuid,p_items jsonb,
  p_customer_name text DEFAULT NULL,p_customer_phone text DEFAULT NULL,p_customer_email text DEFAULT NULL,
  p_order_type text DEFAULT 'qr',p_table_number text DEFAULT NULL,p_notes text DEFAULT NULL,p_payment_method text DEFAULT 'qr')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; prices jsonb;
BEGIN
  IF p_order_type <> 'qr' THEN RETURN jsonb_build_object('success',false,'error','pos_authentication_required'); END IF;
  prices:=public.price_order_items(p_restaurant_id,p_items);
  INSERT INTO public.orders(restaurant_id,order_number,customer_name,customer_phone,customer_email,order_type,table_number,customer_notes,items,subtotal,tax,total,status,payment_status,payment_method)
  VALUES(p_restaurant_id,public.generate_order_number_atomic(),p_customer_name,p_customer_phone,p_customer_email,'qr',p_table_number,p_notes,prices->'items',
   (prices->>'subtotal')::numeric,(prices->>'tax')::numeric,(prices->>'total')::numeric,'pending','pending','qr') RETURNING * INTO o;
  RETURN jsonb_build_object('success',true,'order_id',o.id,'id',o.id,'order_number',o.order_number,'access_token',o.access_token,'total',o.total,'subtotal',o.subtotal,'tax',o.tax,'status',o.status,'payment_status',o.payment_status);
END;

$$;
REVOKE INSERT ON public.orders FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.create_order(uuid,jsonb,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(uuid,jsonb,text,text,text,text,text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.write_pos_order(p_restaurant_id uuid,p_order jsonb,p_key uuid,p_order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; v_prices jsonb; v_fingerprint text; v_previous public.order_operations;
  v_customer uuid; v_waiter uuid; v_session uuid; v_cash uuid; v_method text; v_paid text; v_tip numeric; part jsonb; v_number int:=0; v_sum numeric; v_decimals int;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  IF p_key IS NULL OR p_order IS NULL THEN RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023'; END IF;
  v_fingerprint:=encode(extensions.digest(p_order::text||COALESCE(p_order_id::text,''),'sha256'),'hex');
  INSERT INTO public.order_operations(restaurant_id,operation_key,fingerprint) VALUES(p_restaurant_id,p_key,v_fingerprint)
    ON CONFLICT DO NOTHING;
  SELECT * INTO v_previous FROM public.order_operations WHERE restaurant_id=p_restaurant_id AND operation_key=p_key FOR UPDATE;
  IF v_previous.fingerprint<>v_fingerprint THEN RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505'; END IF;
  IF v_previous.result IS NOT NULL THEN RETURN v_previous.result; END IF;
  v_method:=COALESCE(p_order->>'payment_method','cash'); v_paid:=COALESCE(p_order->>'payment_status','pending');
  IF v_method NOT IN ('cash','card','transfer','qr') OR v_paid NOT IN ('paid','pending') OR
    COALESCE(p_order->>'order_type','counter') NOT IN ('counter','phone','table','qr') THEN
    RAISE EXCEPTION 'invalid_payment' USING ERRCODE='22023'; END IF;
  SELECT CASE WHEN currency='CLP' THEN 0 ELSE 2 END INTO v_decimals FROM public.restaurants WHERE id=p_restaurant_id;
  v_prices:=public.price_order_items(p_restaurant_id,p_order->'items');
  v_tip:=round(COALESCE((p_order->>'tip_amount')::numeric,0),v_decimals);
  IF v_tip::text IN ('NaN','Infinity','-Infinity') OR v_tip<0 OR v_tip>(v_prices->>'total')::numeric THEN RAISE EXCEPTION 'invalid_tip' USING ERRCODE='22023'; END IF;
  v_waiter:=NULLIF(p_order->>'waiter_id','')::uuid;
  IF v_waiter IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.waiters WHERE id=v_waiter AND restaurant_id=p_restaurant_id AND is_active) THEN
    RAISE EXCEPTION 'invalid_waiter' USING ERRCODE='22023'; END IF;
  v_session:=NULLIF(p_order->>'table_session_id','')::uuid;
  IF v_session IS NOT NULL THEN
    PERFORM 1 FROM public.table_sessions WHERE id=v_session AND restaurant_id=p_restaurant_id AND status='active' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_table_session' USING ERRCODE='22023'; END IF;
  END IF;
  v_cash:=NULLIF(p_order->>'cash_shift_id','')::uuid;
  IF v_cash IS NOT NULL THEN
    PERFORM 1 FROM public.cash_shifts WHERE id=v_cash AND restaurant_id=p_restaurant_id AND status='open' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_cash_shift' USING ERRCODE='22023'; END IF;
  END IF;
  v_customer:=NULLIF(p_order->>'customer_id','')::uuid;
  IF v_customer IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.restaurant_customers WHERE id=v_customer AND restaurant_id=p_restaurant_id) THEN
    RAISE EXCEPTION 'invalid_customer' USING ERRCODE='22023'; END IF;
  IF v_customer IS NULL AND NULLIF(trim(p_order->>'customer_phone'),'') IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('crm:'||p_restaurant_id::text||':'||(p_order->>'customer_phone'),0));
    SELECT id INTO v_customer FROM public.restaurant_customers WHERE restaurant_id=p_restaurant_id AND phone=p_order->>'customer_phone' LIMIT 1;
    IF v_customer IS NULL THEN
      INSERT INTO public.restaurant_customers(restaurant_id,name,phone,email)
      VALUES(p_restaurant_id,COALESCE(p_order->>'customer_name','Cliente POS'),p_order->>'customer_phone',p_order->>'customer_email') RETURNING id INTO v_customer;
    END IF;
  END IF;
  IF p_order_id IS NULL THEN
    INSERT INTO public.orders(restaurant_id,customer_id,order_number,order_type,table_number,customer_name,customer_phone,
      customer_email,customer_notes,internal_notes,items,subtotal,tax,total,status,payment_status,payment_method,waiter_id,waiter_name,table_session_id,cash_shift_id)
    VALUES(p_restaurant_id,v_customer,public.generate_order_number_atomic(),COALESCE(p_order->>'order_type','counter'),
      p_order->>'table_number',p_order->>'customer_name',p_order->>'customer_phone',p_order->>'customer_email',
      p_order->>'customer_notes',p_order->>'internal_notes',v_prices->'items',(v_prices->>'subtotal')::numeric,
      (v_prices->>'tax')::numeric,(v_prices->>'total')::numeric,'accepted','pending',v_method,v_waiter,
      (SELECT name FROM public.waiters WHERE id=v_waiter),v_session,v_cash) RETURNING * INTO o;
  ELSE
    SELECT * INTO o FROM public.orders WHERE id=p_order_id AND restaurant_id=p_restaurant_id FOR UPDATE;
    IF o.id IS NULL OR o.status IN ('completed','cancelled','rejected') OR o.payment_status='paid' THEN
      RAISE EXCEPTION 'order_not_editable' USING ERRCODE='22023'; END IF;
    UPDATE public.orders SET status=CASE WHEN o.status='pending' THEN 'accepted' ELSE o.status END,items=v_prices->'items',subtotal=(v_prices->>'subtotal')::numeric,tax=(v_prices->>'tax')::numeric,
      total=(v_prices->>'total')::numeric,customer_id=v_customer,customer_name=p_order->>'customer_name',
      customer_phone=p_order->>'customer_phone',customer_notes=p_order->>'customer_notes',waiter_id=v_waiter,
      waiter_name=(SELECT name FROM public.waiters WHERE id=v_waiter),payment_method=v_method,table_session_id=COALESCE(v_session,o.table_session_id),cash_shift_id=COALESCE(v_cash,o.cash_shift_id) WHERE id=o.id RETURNING * INTO o;
  END IF;
  IF p_order ? 'split_parts' THEN
    IF jsonb_typeof(p_order->'split_parts')<>'array' OR jsonb_array_length(p_order->'split_parts') NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION 'invalid_split' USING ERRCODE='22023'; END IF;
    SELECT sum((x->>'amount')::numeric) INTO v_sum FROM jsonb_array_elements(p_order->'split_parts') x;
    IF v_sum IS NULL OR v_sum<>o.total+v_tip THEN RAISE EXCEPTION 'split_total_mismatch' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM public.order_payments WHERE order_id=o.id) THEN RAISE EXCEPTION 'split_already_recorded' USING ERRCODE='23505'; END IF;
    FOR part IN SELECT jsonb_array_elements(p_order->'split_parts') LOOP
      IF part->>'amount' IS NULL OR (part->>'amount')::numeric::text IN ('NaN','Infinity','-Infinity')
        OR (part->>'amount')::numeric<=0 OR round((part->>'amount')::numeric,v_decimals)<>(part->>'amount')::numeric
        OR COALESCE(part->>'payment_method','') NOT IN ('cash','card','transfer','qr') THEN
        RAISE EXCEPTION 'invalid_split_amount' USING ERRCODE='22023'; END IF;
    END LOOP;
    -- Largest remainders allocate every tip unit exactly; ties use the original part order.
    FOR part IN
      WITH raw AS (
        SELECT x.item,x.ordinality AS n,(x.item->>'amount')::numeric*power(10::numeric,v_decimals) AS units
        FROM jsonb_array_elements(p_order->'split_parts') WITH ORDINALITY x(item,ordinality)
      ), quotas AS (
        SELECT *,v_tip*power(10::numeric,v_decimals)*units/(v_sum*power(10::numeric,v_decimals)) AS quota FROM raw
      ), ranked AS (
        SELECT *,floor(quota) AS base,row_number() OVER(ORDER BY quota-floor(quota) DESC,n) AS rank,
          v_tip*power(10::numeric,v_decimals)-sum(floor(quota)) OVER() AS remaining FROM quotas
      ) SELECT item||jsonb_build_object('tip_allocation',(base+CASE WHEN rank<=remaining THEN 1 ELSE 0 END)/power(10::numeric,v_decimals)) FROM ranked ORDER BY n
    LOOP
      v_number:=v_number+1;
      INSERT INTO public.order_payments(order_id,restaurant_id,payment_number,amount,tip_amount,includes_tip,payment_method,payment_status,payer_label)
        VALUES(o.id,p_restaurant_id,v_number,(part->>'amount')::numeric,(part->>'tip_allocation')::numeric,true,part->>'payment_method','paid',part->>'payer_label');
      IF (part->>'tip_allocation')::numeric>0 THEN
        INSERT INTO public.tips(restaurant_id,order_id,waiter_id,amount,payment_method)
          VALUES(p_restaurant_id,o.id,v_waiter,(part->>'tip_allocation')::numeric,part->>'payment_method');
      END IF;
    END LOOP;
    UPDATE public.orders SET is_split=true,split_count=v_number WHERE id=o.id; v_paid:='paid';
  END IF;
  IF v_paid='paid' THEN
    UPDATE public.orders SET payment_status='paid',paid_at=now(),payment_method=v_method WHERE id=o.id;
    IF v_tip>0 AND NOT (p_order ? 'split_parts') THEN INSERT INTO public.tips(restaurant_id,order_id,waiter_id,amount,payment_method)
      VALUES(p_restaurant_id,o.id,v_waiter,v_tip,v_method); END IF;
  END IF;
  SELECT * INTO o FROM public.orders WHERE id=o.id;
  UPDATE public.order_operations SET result=(to_jsonb(o)-'access_token')||jsonb_build_object('tip_amount',CASE WHEN v_paid='paid' THEN v_tip ELSE 0 END) WHERE restaurant_id=p_restaurant_id AND operation_key=p_key;
  INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('pos_order_saved','orders',o.id::text,jsonb_build_object('paid',v_paid='paid'));
  RETURN (to_jsonb(o)-'access_token')||jsonb_build_object('tip_amount',CASE WHEN v_paid='paid' THEN v_tip ELSE 0 END);
END;
$$;
REVOKE ALL ON FUNCTION public.write_pos_order(uuid,jsonb,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.write_pos_order(uuid,jsonb,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_order_relation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.restaurant_customers WHERE id=NEW.customer_id AND restaurant_id=NEW.restaurant_id)
    OR NEW.waiter_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.waiters WHERE id=NEW.waiter_id AND restaurant_id=NEW.restaurant_id)
    OR NEW.cash_shift_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.cash_shifts WHERE id=NEW.cash_shift_id AND restaurant_id=NEW.restaurant_id)
    OR NEW.table_session_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.table_sessions WHERE id=NEW.table_session_id AND restaurant_id=NEW.restaurant_id) THEN
    RAISE EXCEPTION 'cross_restaurant_relation' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.table_session_id IS NOT NULL AND (NEW.total IS DISTINCT FROM OLD.total OR NEW.items IS DISTINCT FROM OLD.items)
    AND EXISTS(SELECT 1 FROM public.table_sessions WHERE id=OLD.table_session_id AND status='payment_pending') THEN
    RAISE EXCEPTION 'bill_locked_for_payment'; END IF;
  IF TG_OP='UPDATE' AND OLD.payment_status='paid' AND (NEW.total IS DISTINCT FROM OLD.total OR NEW.items IS DISTINCT FROM OLD.items OR NEW.restaurant_id<>OLD.restaurant_id) THEN
    RAISE EXCEPTION 'paid_order_immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER order_relation BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_relation();
REVOKE ALL ON FUNCTION public.validate_order_relation() FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.order_payments FROM authenticated,anon;
NOTIFY pgrst,'reload schema';
COMMIT;
