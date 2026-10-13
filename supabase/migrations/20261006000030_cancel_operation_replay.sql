BEGIN;
-- Cancellation is identified by subscription and at_period_end. Unlike a
-- new subscription or card registration, repeating it cannot mean a new effect.
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
 INSERT INTO public.provider_operations(restaurant_id,kind,payload,fingerprint) VALUES(p_restaurant,p_kind,p_payload,hash) RETURNING * INTO op;
 RETURN to_jsonb(op)||jsonb_build_object('new',true);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
