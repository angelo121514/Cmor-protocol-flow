BEGIN;
-- A caller can observe absence before another operation commits and reserve
-- after that commit. Recheck persisted effects under the restaurant lock.
DO $preflight$
BEGIN
 IF EXISTS (SELECT 1 FROM public.flow_customers GROUP BY restaurant_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'duplicate_flow_customers_require_reconciliation';
 END IF;
 IF EXISTS (SELECT 1 FROM public.flow_subscriptions WHERE status IN (1,5) GROUP BY customer_id,plan_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'duplicate_active_subscriptions_require_reconciliation';
 END IF;
END $preflight$;
CREATE UNIQUE INDEX flow_customers_one_per_restaurant ON public.flow_customers(restaurant_id);
CREATE UNIQUE INDEX flow_subscriptions_one_active_plan ON public.flow_subscriptions(customer_id,plan_id) WHERE status IN (1,5);
CREATE OR REPLACE FUNCTION public.reserve_provider_operation(p_restaurant uuid,p_kind text,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.provider_operations; r public.restaurants; hash text;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.restaurants WHERE id=p_restaurant FOR UPDATE;
 IF NOT FOUND OR r.country<>'CL' THEN RAISE EXCEPTION 'unsupported_restaurant'; END IF;
 hash:=encode(extensions.digest(p_payload::text,'sha256'),'hex');
 IF p_kind='cancel' THEN
  SELECT * INTO op FROM public.provider_operations WHERE restaurant_id=p_restaurant AND kind=p_kind AND fingerprint=hash AND state='confirmed' ORDER BY created_at DESC,id DESC LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(op)||jsonb_build_object('new',false); END IF;
 END IF;
 SELECT * INTO op FROM public.provider_operations WHERE restaurant_id=p_restaurant AND kind=p_kind AND state IN ('creating','reconcile') FOR UPDATE;
 IF FOUND THEN
  IF op.fingerprint<>hash THEN RAISE EXCEPTION 'operation_conflict'; END IF;
  RETURN to_jsonb(op)||jsonb_build_object('new',false);
 END IF;
 IF p_kind IN ('customer','subscription') THEN
  SELECT * INTO op FROM public.provider_operations o
  WHERE o.restaurant_id=p_restaurant AND o.kind=p_kind AND o.fingerprint=hash AND o.state='confirmed'
   AND ((p_kind='customer' AND o.response->>'customerId'=r.flow_customer_id
     AND EXISTS (SELECT 1 FROM public.flow_customers c WHERE c.id=r.flow_customer_id AND c.restaurant_id=r.id))
    OR (p_kind='subscription' AND o.response->>'subscriptionId'=r.flow_subscription_id
     AND EXISTS (SELECT 1 FROM public.flow_subscriptions s WHERE s.id=r.flow_subscription_id
      AND s.customer_id=r.flow_customer_id AND s.plan_id=p_payload->>'plan_id' AND s.status IN (1,5))))
  ORDER BY o.created_at DESC,o.id DESC LIMIT 1;
  IF FOUND THEN RETURN to_jsonb(op)||jsonb_build_object('new',false); END IF;
 END IF;
 INSERT INTO public.provider_operations(restaurant_id,kind,payload,fingerprint) VALUES(p_restaurant,p_kind,p_payload,hash) RETURNING * INTO op;
 RETURN to_jsonb(op)||jsonb_build_object('new',true);
END $$;
REVOKE ALL ON FUNCTION public.reserve_provider_operation(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_provider_operation(uuid,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
