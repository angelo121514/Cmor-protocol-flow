BEGIN;
CREATE TABLE public.checkout_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('table','registration')),
 target_id uuid NOT NULL, provider text NOT NULL CHECK(provider IN ('flow','mp','webpay')),
 reference text NOT NULL UNIQUE, amount numeric NOT NULL CHECK(amount>0), currency text NOT NULL,
 tip_amount numeric NOT NULL DEFAULT 0 CHECK(tip_amount>=0), plan text,
 order_ids uuid[] NOT NULL DEFAULT '{}', state text NOT NULL DEFAULT 'creating'
 CHECK(state IN ('creating','pending','reconcile','confirmed','rejected','cancelled')),
 remote_id text, provider_token text, response jsonb, receipt_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
 created_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz
);
ALTER TABLE public.checkout_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_attempts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.checkout_attempts TO service_role;
CREATE UNIQUE INDEX checkout_one_live_target ON public.checkout_attempts(kind,target_id)
 WHERE state IN ('creating','pending','reconcile');

CREATE FUNCTION public.reserve_checkout(p_kind text,p_target uuid,p_provider text,p_tip numeric DEFAULT 0,
 p_amount numeric DEFAULT NULL,p_currency text DEFAULT NULL,p_plan text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s record; r record; a public.checkout_attempts; total numeric; ids uuid[]; c text; decimals int; email text;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_kind='table' THEN
  PERFORM 1 FROM public.restaurant_tables WHERE id=(SELECT table_id FROM public.table_sessions WHERE id=p_target) FOR UPDATE;
  SELECT * INTO s FROM public.table_sessions WHERE id=p_target FOR UPDATE;
  IF NOT FOUND OR s.status NOT IN ('active','payment_pending') THEN RAISE EXCEPTION 'invalid_session'; END IF;
  SELECT * INTO r FROM public.restaurants WHERE id=s.restaurant_id;
  IF NOT r.is_active OR r.status NOT IN ('active','trial') OR
   (r.status='trial' AND (r.trial_ends_at IS NULL OR r.trial_ends_at<=now())) THEN RAISE EXCEPTION 'restaurant_not_active'; END IF;
  c:=r.currency; email:=r.email;
  SELECT COALESCE(sum(o.total),0),array_agg(o.id ORDER BY o.id) INTO total,ids FROM public.orders o
   WHERE o.table_session_id=s.id AND o.status NOT IN ('cancelled','rejected') AND o.payment_status<>'paid';
  IF total<=0 THEN RAISE EXCEPTION 'empty_bill'; END IF;
  IF p_tip IS NULL OR p_tip<0 OR p_tip>total THEN RAISE EXCEPTION 'invalid_tip'; END IF;
  decimals:=CASE c WHEN 'CLP' THEN 0 WHEN 'BRL' THEN 2 WHEN 'PEN' THEN 2 ELSE -1 END;
  IF decimals<0 OR p_tip<>round(p_tip,decimals) THEN RAISE EXCEPTION 'unsupported_currency_or_precision'; END IF;
  total:=round(total+p_tip,decimals);
 ELSEIF p_kind='registration' THEN
  SELECT * INTO r FROM public.registration_requests WHERE id=p_target AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_registration'; END IF;
  c:=CASE r.country WHEN 'BR' THEN 'BRL' WHEN 'PE' THEN 'PEN' WHEN 'CL' THEN 'CLP' ELSE NULL END;
  email:=r.email; total:=p_amount;
  IF c IS NULL OR c IS DISTINCT FROM p_currency OR p_plan NOT IN ('starter','pro','lifetime','test_plan')
   OR total IS NULL OR total<=0 OR total<>round(total,CASE c WHEN 'CLP' THEN 0 ELSE 2 END) THEN RAISE EXCEPTION 'invalid_price'; END IF;
 ELSE RAISE EXCEPTION 'invalid_kind'; END IF;
 IF NOT ((p_provider IN ('flow','webpay') AND c='CLP' AND (p_provider<>'webpay' OR p_kind='registration')) OR (p_provider='mp' AND c IN ('BRL','PEN'))) THEN RAISE EXCEPTION 'unsupported_provider_currency'; END IF;
 SELECT * INTO a FROM public.checkout_attempts WHERE kind=p_kind AND target_id=p_target
  AND state IN ('creating','pending','reconcile') FOR UPDATE;
 IF FOUND THEN
 IF a.provider<>p_provider OR a.amount<>total OR a.tip_amount<>p_tip OR a.plan IS DISTINCT FROM p_plan THEN RAISE EXCEPTION 'checkout_conflict' USING ERRCODE='23505'; END IF;
  RETURN to_jsonb(a)||jsonb_build_object('new',false,'email',email);
 END IF;
 a.id:=gen_random_uuid();
 INSERT INTO public.checkout_attempts(id,kind,target_id,provider,reference,amount,currency,tip_amount,plan,order_ids)
 VALUES(a.id,p_kind,p_target,p_provider,CASE WHEN p_provider='webpay' THEN 'WP-'||left(replace(a.id::text,'-',''),23) ELSE (CASE p_kind WHEN 'table' THEN 'ORDP-' ELSE 'R-' END)||a.id END,total,c,p_tip,p_plan,COALESCE(ids,'{}')) RETURNING * INTO a;
 IF p_kind='table' THEN UPDATE public.table_sessions SET status='payment_pending',tip_amount=p_tip WHERE id=p_target; END IF;
 RETURN to_jsonb(a)||jsonb_build_object('new',true,'email',email);
END $$;
-- Do not release an uncertain attempt: a provider may have accepted it before a timeout.
CREATE FUNCTION public.record_checkout_result(p_id uuid,p_remote_id text,p_token text,p_response jsonb,p_uncertain boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.checkout_attempts;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.checkout_attempts WHERE id=p_id FOR UPDATE;
 IF a.state='confirmed' AND (p_remote_id IS NULL OR a.remote_id=p_remote_id) THEN
  UPDATE public.checkout_attempts SET provider_token=COALESCE(p_token,provider_token),response=COALESCE(p_response,response) WHERE id=p_id;
  RETURN;
 END IF;
 UPDATE public.checkout_attempts SET remote_id=COALESCE(p_remote_id,remote_id),provider_token=COALESCE(p_token,provider_token),
  response=COALESCE(p_response,response),state=CASE WHEN p_uncertain THEN 'reconcile' ELSE 'pending' END
 WHERE id=p_id AND state IN ('creating','reconcile');
 IF NOT FOUND THEN RAISE EXCEPTION 'checkout_state_conflict'; END IF;
END $$;
CREATE FUNCTION public.confirm_checkout(p_reference text,p_provider text,p_remote_id text,p_amount numeric,p_currency text,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.checkout_attempts; s record; result jsonb; waiter uuid; n int;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.checkout_attempts WHERE reference=p_reference;
 IF NOT FOUND THEN RAISE EXCEPTION 'checkout_not_found'; END IF;
 IF a.kind='table' THEN
  PERFORM 1 FROM public.restaurant_tables WHERE id=(SELECT table_id FROM public.table_sessions WHERE id=a.target_id) FOR UPDATE;
  PERFORM 1 FROM public.table_sessions WHERE id=a.target_id FOR UPDATE;
 ELSE PERFORM 1 FROM public.registration_requests WHERE id=a.target_id FOR UPDATE; END IF;
 SELECT * INTO a FROM public.checkout_attempts WHERE reference=p_reference FOR UPDATE;
 IF a.provider<>p_provider OR a.amount IS DISTINCT FROM p_amount OR a.currency IS DISTINCT FROM p_currency
  OR NULLIF(p_remote_id,'') IS NULL OR (a.remote_id IS NOT NULL AND a.remote_id<>p_remote_id) THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
 IF a.state='confirmed' THEN RETURN jsonb_build_object('success',true,'replayed',true); END IF;
 IF a.state IN ('rejected','cancelled') THEN RAISE EXCEPTION 'terminal_checkout'; END IF;
 IF p_status IN ('rejected','cancelled') THEN
  UPDATE public.checkout_attempts SET state=p_status,remote_id=p_remote_id WHERE id=a.id;
  IF a.kind='table' THEN UPDATE public.table_sessions SET status='active',tip_amount=0 WHERE id=a.target_id AND status='payment_pending'; END IF;
  RETURN jsonb_build_object('success',true,'state',p_status);
 END IF;
 IF p_status IS NULL OR p_status<>'approved' THEN RETURN jsonb_build_object('success',true,'state','pending'); END IF;
 IF a.kind='table' THEN
  SELECT * INTO s FROM public.table_sessions WHERE id=a.target_id FOR UPDATE;
  IF s.status<>'payment_pending' THEN RAISE EXCEPTION 'invalid_session_state'; END IF;
  IF EXISTS(SELECT 1 FROM public.orders WHERE id=ANY(a.order_ids) AND
   (table_session_id IS DISTINCT FROM a.target_id OR payment_status='paid' OR status IN ('cancelled','rejected'))) THEN RAISE EXCEPTION 'bill_changed'; END IF;
  IF (SELECT COALESCE(sum(total),0) FROM public.orders WHERE id=ANY(a.order_ids))+a.tip_amount<>a.amount THEN RAISE EXCEPTION 'bill_changed'; END IF;
  UPDATE public.orders SET status='completed',payment_status='paid',payment_method='qr',paid_at=now(),completed_at=now(),
   payment_transaction_id=p_remote_id,updated_at=now() WHERE id=ANY(a.order_ids);
  GET DIAGNOSTICS n=ROW_COUNT;
  SELECT waiter_id INTO waiter FROM public.orders WHERE id=ANY(a.order_ids) AND waiter_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;
  IF a.tip_amount>0 THEN INSERT INTO public.tips(restaurant_id,waiter_id,amount,payment_method,status)
   VALUES(s.restaurant_id,waiter,a.tip_amount,'qr','collected'); END IF;
  UPDATE public.table_sessions SET status='closed',closed_at=now(),session_token=gen_random_uuid()::text WHERE id=s.id;
  UPDATE public.restaurant_tables SET status='available' WHERE id=s.table_id;
 ELSE
  result:=public.auto_approve_registration_v2(a.target_id,a.plan,p_provider,p_remote_id,a.amount);
  IF NOT COALESCE((result->>'success')::boolean,false) THEN RAISE EXCEPTION 'registration_approval_failed'; END IF;
 END IF;
 UPDATE public.checkout_attempts SET state='confirmed',remote_id=p_remote_id,confirmed_at=now() WHERE id=a.id;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('payment_confirmed','checkout',a.id::text,
  jsonb_build_object('provider',p_provider,'amount',a.amount,'currency',a.currency));
 RETURN jsonb_build_object('success',true,'state','confirmed','registration',result,'orders_completed',n);
END $$;
CREATE FUNCTION public.checkout_receipt(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.checkout_attempts;
BEGIN
 SELECT * INTO a FROM public.checkout_attempts WHERE receipt_token=p_token AND kind='table' AND created_at>now()-interval '24 hours';
 IF NOT FOUND THEN RAISE EXCEPTION 'invalid_receipt'; END IF;
 RETURN jsonb_build_object('state',a.state,'amount',a.amount,'currency',a.currency,'tip_amount',a.tip_amount,'confirmed_at',a.confirmed_at);
END $$;
REVOKE ALL ON FUNCTION public.reserve_checkout(text,uuid,text,numeric,numeric,text,text), public.record_checkout_result(uuid,text,text,jsonb,boolean),
 public.confirm_checkout(text,text,text,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_checkout(text,uuid,text,numeric,numeric,text,text), public.record_checkout_result(uuid,text,text,jsonb,boolean),
 public.confirm_checkout(text,text,text,numeric,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.checkout_receipt(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkout_receipt(text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
