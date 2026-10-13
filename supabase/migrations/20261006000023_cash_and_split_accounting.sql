BEGIN;
-- Ambiguous legacy data must be reconciled explicitly, never discarded.
DO $$ DECLARE ids text; BEGIN
  SELECT string_agg(restaurant_id::text,',') INTO ids FROM
    (SELECT restaurant_id FROM public.cash_shifts WHERE status='open' GROUP BY restaurant_id HAVING count(*)>1) q;
  IF ids IS NOT NULL THEN RAISE EXCEPTION 'duplicate_open_cash_shifts: %',ids; END IF;
  SELECT string_agg(o.id::text,',') INTO ids FROM public.orders o
  WHERE o.is_split AND o.payment_status='paid' AND o.status NOT IN ('cancelled','rejected')
    AND o.total IS DISTINCT FROM (SELECT sum(p.amount-CASE WHEN p.includes_tip THEN p.tip_amount ELSE 0 END)
      FROM public.order_payments p WHERE p.order_id=o.id AND p.restaurant_id=o.restaurant_id AND p.payment_status='paid');
  IF ids IS NOT NULL THEN RAISE EXCEPTION 'legacy_split_reconciliation_required: %',ids; END IF;
END $$;
CREATE UNIQUE INDEX cash_one_open_per_restaurant ON public.cash_shifts(restaurant_id) WHERE status='open';
REVOKE INSERT,UPDATE,DELETE ON public.cash_shifts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.open_cash_shift(p_restaurant_id uuid,p_opening_cash numeric DEFAULT 0,
 p_notes text DEFAULT NULL,p_responsible_waiter_id uuid DEFAULT NULL)
RETURNS public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.cash_shifts; decimals int;
BEGIN
 IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT CASE WHEN currency='CLP' THEN 0 ELSE 2 END INTO decimals FROM public.restaurants WHERE id=p_restaurant_id FOR UPDATE;
 IF p_opening_cash IS NULL OR p_opening_cash::text IN ('NaN','Infinity','-Infinity') OR p_opening_cash<0
   OR round(p_opening_cash,decimals)<>p_opening_cash THEN RAISE EXCEPTION 'invalid_opening_cash' USING ERRCODE='22023'; END IF;
 IF p_responsible_waiter_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.waiters
   WHERE id=p_responsible_waiter_id AND restaurant_id=p_restaurant_id AND is_active) THEN
   RAISE EXCEPTION 'invalid_responsible_waiter' USING ERRCODE='22023'; END IF;
 SELECT * INTO s FROM public.cash_shifts WHERE restaurant_id=p_restaurant_id AND status='open' FOR UPDATE;
 IF s.id IS NOT NULL THEN RETURN s; END IF;
 INSERT INTO public.cash_shifts(restaurant_id,opened_by,opening_cash,notes,responsible_waiter_id,opened_at)
 VALUES(p_restaurant_id,auth.uid(),p_opening_cash,p_notes,p_responsible_waiter_id,clock_timestamp()) RETURNING * INTO s;
 RETURN s;
END $$;

-- Serialize the instant of collection with closing the active shift. Pending kitchen work is independent.
CREATE OR REPLACE FUNCTION public.capture_order_payment_shift() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE shift_id uuid;
BEGIN
 IF NEW.payment_status='paid' AND (TG_OP='INSERT' OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
   SELECT id INTO shift_id FROM public.cash_shifts WHERE restaurant_id=NEW.restaurant_id AND status='open' FOR UPDATE;
   NEW.cash_shift_id:=shift_id; NEW.paid_at:=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_capture_order_payment_shift BEFORE INSERT OR UPDATE OF payment_status ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.capture_order_payment_shift();
REVOKE ALL ON FUNCTION public.capture_order_payment_shift() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.can_close_split_order(p_order_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; collected numeric;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 IF o.id IS NULL OR NOT public.is_my_restaurant(o.restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT sum(amount-CASE WHEN includes_tip THEN tip_amount ELSE 0 END) INTO collected FROM public.order_payments
 WHERE order_id=o.id AND restaurant_id=o.restaurant_id AND payment_status='paid';
 RETURN COALESCE(collected,0)=o.total;
END $$;

-- Internal aggregate has no row limit and is shared by the preview and the transactional close.
CREATE OR REPLACE FUNCTION public.cash_shift_totals_internal(p_shift uuid,p_until timestamptz) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH shift AS (SELECT * FROM public.cash_shifts WHERE id=p_shift),
 orders AS MATERIALIZED (
  SELECT o.* FROM public.orders o CROSS JOIN shift s WHERE o.restaurant_id=s.restaurant_id
   AND o.payment_status='paid' AND o.status NOT IN ('cancelled','rejected')
   AND (o.cash_shift_id=s.id OR (o.cash_shift_id IS NULL AND o.paid_at>=s.opened_at AND o.paid_at<=p_until))
 ), ledger AS (
  SELECT o.id,o.total AS amount,COALESCE(NULLIF(o.payment_method,''),'cash') AS method FROM orders o WHERE NOT COALESCE(o.is_split,false)
  UNION ALL SELECT o.id,p.amount-CASE WHEN p.includes_tip THEN p.tip_amount ELSE 0 END,p.payment_method
   FROM orders o JOIN public.order_payments p ON p.order_id=o.id AND p.restaurant_id=o.restaurant_id
   WHERE o.is_split AND p.payment_status='paid'
 ), tips AS MATERIALIZED (
  SELECT t.* FROM public.tips t CROSS JOIN shift s WHERE t.restaurant_id=s.restaurant_id
   AND (EXISTS(SELECT 1 FROM orders o WHERE o.id=t.order_id)
    OR (t.order_id IS NULL AND t.created_at>=s.opened_at AND t.created_at<=p_until))
 ), waiter_totals AS (
  SELECT w.id AS waiter_id,w.name,
   (SELECT count(DISTINCT o.table_number) FROM orders o WHERE o.waiter_id=w.id) AS tables,
   COALESCE((SELECT sum(o.total) FROM orders o WHERE o.waiter_id=w.id),0) AS sales,
   COALESCE((SELECT sum(t.amount) FROM tips t WHERE t.waiter_id=w.id),0) AS tips
  FROM public.waiters w CROSS JOIN shift s WHERE w.restaurant_id=s.restaurant_id
   AND (w.is_active OR EXISTS(SELECT 1 FROM orders o WHERE o.waiter_id=w.id) OR EXISTS(SELECT 1 FROM tips t WHERE t.waiter_id=w.id))
 ) SELECT jsonb_build_object(
  'total',COALESCE((SELECT sum(total) FROM orders),0),'count',(SELECT count(*) FROM orders),
  'cash',COALESCE((SELECT sum(amount) FROM ledger WHERE method NOT IN ('card','transfer','qr')),0),
  'card',COALESCE((SELECT sum(amount) FROM ledger WHERE method='card'),0),
  'transfer',COALESCE((SELECT sum(amount) FROM ledger WHERE method='transfer'),0),
  'qr',COALESCE((SELECT sum(amount) FROM ledger WHERE method='qr'),0),
  'total_tips',COALESCE((SELECT sum(amount) FROM tips),0),
  'cash_tips',COALESCE((SELECT sum(amount) FROM tips WHERE payment_method='cash'),0),
  'card_tips',COALESCE((SELECT sum(amount) FROM tips WHERE payment_method IN ('card','qr')),0),
  'waiter_summary',COALESCE((SELECT jsonb_agg(to_jsonb(w) ORDER BY sales DESC,waiter_id) FROM waiter_totals w),'[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.cash_shift_totals_internal(uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.cash_shift_metrics(p_shift_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.cash_shifts;
BEGIN
 SELECT * INTO s FROM public.cash_shifts WHERE id=p_shift_id;
 IF s.id IS NULL OR NOT public.is_my_restaurant(s.restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF s.status='closed' THEN RETURN jsonb_build_object('total',s.total_sales,'count',s.orders_count,
  'cash',s.cash_sales,'card',s.card_sales,'transfer',s.transfer_sales,'qr',s.qr_sales,
  'total_tips',s.total_tips,'cash_tips',s.cash_tips,'card_tips',s.card_tips,'waiter_summary',s.waiter_summary); END IF;
 RETURN public.cash_shift_totals_internal(s.id,clock_timestamp());
END $$;

CREATE OR REPLACE FUNCTION public.close_cash_shift(p_shift_id uuid,p_actual_cash numeric,p_notes text DEFAULT NULL)
RETURNS public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.cash_shifts; totals jsonb; until_time timestamptz; expected numeric; decimals int;
BEGIN
 SELECT * INTO s FROM public.cash_shifts WHERE id=p_shift_id FOR UPDATE;
 IF s.id IS NULL OR NOT public.is_my_restaurant(s.restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF s.status='closed' THEN RETURN s; END IF;
 SELECT CASE WHEN currency='CLP' THEN 0 ELSE 2 END INTO decimals FROM public.restaurants WHERE id=s.restaurant_id;
 IF p_actual_cash IS NULL OR p_actual_cash::text IN ('NaN','Infinity','-Infinity') OR p_actual_cash<0 OR round(p_actual_cash,decimals)<>p_actual_cash THEN
  RAISE EXCEPTION 'invalid_actual_cash' USING ERRCODE='22023'; END IF;
 until_time:=clock_timestamp(); totals:=public.cash_shift_totals_internal(s.id,until_time);
 expected:=s.opening_cash+(totals->>'cash')::numeric+(totals->>'cash_tips')::numeric;
 UPDATE public.cash_shifts SET status='closed',closed_by=auth.uid(),closed_at=until_time,
  total_sales=(totals->>'total')::numeric,orders_count=(totals->>'count')::int,
  cash_sales=(totals->>'cash')::numeric,card_sales=(totals->>'card')::numeric,
  transfer_sales=(totals->>'transfer')::numeric,qr_sales=(totals->>'qr')::numeric,
  total_tips=(totals->>'total_tips')::numeric,cash_tips=(totals->>'cash_tips')::numeric,card_tips=(totals->>'card_tips')::numeric,
  waiter_summary=totals->'waiter_summary',expected_cash=expected,actual_cash=p_actual_cash,cash_difference=p_actual_cash-expected,
  notes=COALESCE(p_notes,notes) WHERE id=s.id RETURNING * INTO s;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('cash_shift_closed','cash_shifts',s.id::text,jsonb_build_object('orders_count',s.orders_count));
 RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.open_cash_shift(uuid,numeric,text,uuid),public.close_cash_shift(uuid,numeric,text),
 public.cash_shift_metrics(uuid),public.can_close_split_order(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_cash_shift(uuid,numeric,text,uuid),public.close_cash_shift(uuid,numeric,text),
 public.cash_shift_metrics(uuid),public.can_close_split_order(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
