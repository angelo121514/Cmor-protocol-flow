BEGIN;
-- Preserve existing contracts: snapshots come from their recorded intent/Flow plan.
CREATE FUNCTION public.settle_verified_payment(p_reference text,p_provider text,p_remote_id text,p_amount numeric,p_currency text,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.checkout_attempts; i public.payment_intents; s record; r record; sub record; old record;
 v_ids uuid[]; v_total numeric; v_tip numeric; v_target uuid; v_kind text; v_currency text; result jsonb;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('payment:'||p_reference,0));
 IF EXISTS(SELECT 1 FROM public.checkout_attempts WHERE reference=p_reference) THEN
  RETURN public.confirm_checkout(p_reference,p_provider,p_remote_id,p_amount,p_currency,p_status);
 END IF;
 IF p_reference LIKE 'SUB-%' THEN
  IF p_provider<>'flow' OR p_reference !~ '^SUB-.+-[0-9]+$' THEN RAISE EXCEPTION 'invalid_subscription_reference'; END IF;
  SELECT fs.*,fc.restaurant_id,fp.amount,fp.currency INTO sub FROM public.flow_subscriptions fs
   JOIN public.flow_customers fc ON fc.id=fs.customer_id JOIN public.flow_plans fp ON fp.id=fs.plan_id
   WHERE fs.id=regexp_replace(p_reference,'^SUB-(.+)-[0-9]+$','\1') FOR UPDATE OF fs;
  IF NOT FOUND OR sub.amount IS DISTINCT FROM p_amount OR sub.currency IS DISTINCT FROM p_currency THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
  SELECT * INTO old FROM public.flow_payments WHERE flow_order=p_remote_id::numeric FOR UPDATE;
  IF FOUND AND (old.commerce_order<>p_reference OR old.amount<>p_amount) THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
  IF FOUND AND old.status=2 THEN RETURN jsonb_build_object('success',true,'replayed',true); END IF;
  INSERT INTO public.flow_payments(restaurant_id,subscription_id,flow_order,commerce_order,amount,status,payment_method,transaction_date)
   VALUES(sub.restaurant_id,sub.id,p_remote_id::numeric,p_reference,p_amount,
    CASE p_status WHEN 'approved' THEN 2 WHEN 'rejected' THEN 3 WHEN 'cancelled' THEN 4 ELSE 1 END,'Flow',now())
   ON CONFLICT(flow_order) DO UPDATE SET status=EXCLUDED.status;
  IF p_status='approved' THEN
   UPDATE public.flow_subscriptions SET status=1,current_period_start=now(),updated_at=now() WHERE id=sub.id;
   UPDATE public.restaurants SET is_active=true,status='active' WHERE id=sub.restaurant_id;
  ELSIF p_status IN ('rejected','cancelled') THEN UPDATE public.flow_subscriptions SET status=2,updated_at=now() WHERE id=sub.id;
  END IF;
  RETURN jsonb_build_object('success',true);
 END IF;
 IF p_provider='webpay' THEN
  v_kind:='registration';
  SELECT * INTO i FROM public.payment_intents WHERE provider='webpay' AND buy_order=p_reference AND webpay_token IS NOT NULL FOR UPDATE;
  IF NOT FOUND OR i.amount IS DISTINCT FROM p_amount OR p_currency<>'CLP' OR p_remote_id<>i.buy_order THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
  v_target:=i.registration_request_id; v_total:=i.amount;v_tip:=0;v_currency:='CLP';
  PERFORM 1 FROM public.registration_requests WHERE id=v_target FOR UPDATE;
  IF i.status='authorized' AND EXISTS(SELECT 1 FROM public.restaurants WHERE registration_request_id=v_target) THEN RETURN jsonb_build_object('success',true,'replayed',true); END IF;
 ELSIF p_reference LIKE 'R-%' THEN
  v_kind:='registration'; v_target:=substring(p_reference FROM 3)::uuid;
  SELECT * INTO i FROM public.payment_intents WHERE registration_request_id=v_target AND provider=p_provider
   AND flow_order=p_remote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'legacy_intent_not_found'; END IF;
  SELECT country INTO r FROM public.registration_requests WHERE id=v_target FOR UPDATE;
  v_currency:=CASE r.country WHEN 'BR' THEN 'BRL' WHEN 'PE' THEN 'PEN' ELSE 'CLP' END;
  IF i.amount IS DISTINCT FROM p_amount OR v_currency IS DISTINCT FROM p_currency THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
  IF i.status='authorized' AND EXISTS(SELECT 1 FROM public.restaurants WHERE registration_request_id=v_target) THEN
   RETURN jsonb_build_object('success',true,'replayed',true);
  END IF;
  v_total:=i.amount;v_tip:=0;
 ELSIF p_reference LIKE 'ORDP-%' THEN
  v_kind:='table';v_target:=substring(p_reference FROM 6)::uuid;
  PERFORM 1 FROM public.restaurant_tables WHERE id=(SELECT table_id FROM public.table_sessions WHERE id=v_target) FOR UPDATE;
  SELECT * INTO s FROM public.table_sessions WHERE id=v_target FOR UPDATE;
  IF NOT FOUND OR s.status<>'payment_pending' THEN RAISE EXCEPTION 'legacy_session_requires_reconciliation'; END IF;
  SELECT currency INTO v_currency FROM public.restaurants WHERE id=s.restaurant_id;
  SELECT sum(total),array_agg(id ORDER BY id) INTO v_total,v_ids FROM public.orders WHERE table_session_id=s.id
   AND status NOT IN ('cancelled','rejected') AND payment_status<>'paid';
  v_tip:=COALESCE(s.tip_amount,0);v_total:=v_total+v_tip;
  IF v_total IS DISTINCT FROM p_amount OR v_currency IS DISTINCT FROM p_currency THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
  IF p_provider='mp' AND NOT EXISTS(SELECT 1 FROM public.payment_intents WHERE session_id=v_target::text
    AND provider='mp' AND flow_order=p_remote_id AND amount=p_amount) THEN RAISE EXCEPTION 'legacy_intent_not_found'; END IF;
 ELSE RAISE EXCEPTION 'unknown_reference'; END IF;
 INSERT INTO public.checkout_attempts(kind,target_id,provider,reference,amount,currency,tip_amount,plan,order_ids,state,remote_id)
 VALUES(v_kind,v_target,p_provider,p_reference,v_total,v_currency,v_tip,i.plan,COALESCE(v_ids,'{}'),'pending',p_remote_id) RETURNING * INTO a;
 result:=public.confirm_checkout(p_reference,p_provider,p_remote_id,p_amount,p_currency,p_status);
 IF v_kind='registration' THEN UPDATE public.payment_intents SET status=CASE p_status WHEN 'approved' THEN 'authorized'
  WHEN 'rejected' THEN 'rejected' WHEN 'cancelled' THEN 'cancelled' ELSE status END WHERE id=i.id; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.settle_verified_payment(text,text,text,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settle_verified_payment(text,text,text,numeric,text,text) TO service_role;
-- Provider-controlled relations and monetary state are not browser-writable.
REVOKE INSERT,UPDATE,DELETE ON public.flow_plans,public.flow_subscriptions,public.flow_customers,
 public.flow_payments,public.flow_invoices,public.payment_intents FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
