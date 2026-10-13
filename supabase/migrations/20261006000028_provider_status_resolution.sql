BEGIN;
-- Resolve provider state separately from the restaurant/subscription columns.
CREATE OR REPLACE FUNCTION public.record_provider_operation(p_id uuid,p_data jsonb DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.provider_operations; plan public.flow_plans; rest public.restaurants; subscription text; remote_status int;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT restaurant_id INTO op.restaurant_id FROM public.provider_operations WHERE id=p_id;
 SELECT * INTO rest FROM public.restaurants WHERE id=op.restaurant_id FOR UPDATE;
 SELECT * INTO op FROM public.provider_operations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'operation_not_found'; END IF;
 IF op.state='confirmed' THEN RETURN op.response; END IF;
 IF p_data IS NULL THEN UPDATE public.provider_operations SET state='reconcile' WHERE id=p_id;RETURN NULL; END IF;
 IF op.kind='customer' THEN
  IF NULLIF(p_data->>'customerId','') IS NULL THEN RAISE EXCEPTION 'invalid_provider_response'; END IF;
  INSERT INTO public.flow_customers(id,restaurant_id,email,name) VALUES(p_data->>'customerId',op.restaurant_id,rest.email,rest.name);
  UPDATE public.restaurants SET flow_customer_id=p_data->>'customerId' WHERE id=op.restaurant_id;
 ELSIF op.kind='subscription' THEN
  SELECT * INTO plan FROM public.flow_plans WHERE id=op.payload->>'plan_id';
  IF NOT FOUND OR plan.business_plan IS NULL OR plan.currency<>'CLP' OR p_data->>'planId' IS DISTINCT FROM plan.id OR p_data->>'customerId' IS DISTINCT FROM rest.flow_customer_id THEN RAISE EXCEPTION 'invalid_provider_response'; END IF;
  subscription:=p_data->>'subscriptionId';remote_status:=(p_data->>'status')::int;
  IF NULLIF(subscription,'') IS NULL OR remote_status NOT BETWEEN 0 AND 5 THEN RAISE EXCEPTION 'invalid_provider_response'; END IF;
  INSERT INTO public.flow_subscriptions(id,plan_id,customer_id,status,subscription_start,trial_ends_at,current_period_start,current_period_end)
  VALUES(subscription,plan.id,rest.flow_customer_id,remote_status,(p_data->>'subscription_start')::timestamptz,(p_data->>'trial_end')::timestamptz,
   COALESCE((p_data->>'current_period_start')::timestamptz,now()),(p_data->>'current_period_end')::timestamptz);
  UPDATE public.restaurants SET flow_subscription_id=subscription,subscription_plan=plan.business_plan,
   is_active=CASE WHEN remote_status IN (1,5) THEN true ELSE is_active END,trial_ends_at=(p_data->>'trial_end')::timestamptz WHERE id=rest.id;
 ELSIF op.kind='cancel' THEN
  subscription:=op.payload->>'subscription_id';remote_status:=(p_data->>'status')::int;
  IF p_data->>'subscriptionId' IS DISTINCT FROM subscription THEN RAISE EXCEPTION 'invalid_provider_response'; END IF;
  UPDATE public.flow_subscriptions SET status=remote_status,updated_at=now() WHERE id=subscription AND customer_id=rest.flow_customer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription_not_found'; END IF;
  IF (op.payload->>'at_period_end')::int=0 THEN UPDATE public.restaurants SET is_active=false,status='blocked' WHERE id=rest.id; END IF;
 ELSIF op.kind='card_register' THEN
  IF NULLIF(p_data->>'url','') IS NULL OR NULLIF(p_data->>'token','') IS NULL THEN RAISE EXCEPTION 'invalid_provider_response'; END IF;
 ELSE
  IF p_data->>'customerId' IS DISTINCT FROM rest.flow_customer_id THEN RAISE EXCEPTION 'invalid_provider_response'; END IF;
  UPDATE public.flow_customers SET credit_card_type=NULL,last4_card_digits=NULL,updated_at=now() WHERE id=rest.flow_customer_id AND restaurant_id=rest.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found'; END IF;
 END IF;
 UPDATE public.provider_operations SET state='confirmed',response=p_data WHERE id=p_id;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('provider_operation_confirmed','provider_operations',p_id::text,jsonb_build_object('kind',op.kind));
 RETURN p_data;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
