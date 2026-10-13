BEGIN;
ALTER FUNCTION public.create_order(uuid,jsonb,text,text,text,text,text,text,text) RENAME TO _create_public_order_internal;
REVOKE ALL ON FUNCTION public._create_public_order_internal(uuid,jsonb,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.create_order(p_restaurant_id uuid,p_items jsonb,p_customer_name text DEFAULT NULL,p_customer_phone text DEFAULT NULL,
 p_customer_email text DEFAULT NULL,p_order_type text DEFAULT 'qr',p_table_number text DEFAULT NULL,p_notes text DEFAULT NULL,p_payment_method text DEFAULT 'qr',p_key uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE key uuid:=COALESCE(p_key,gen_random_uuid()); fingerprint text; previous public.order_operations; v_result jsonb;
BEGIN
 fingerprint:=encode(extensions.digest(jsonb_build_object('type','public','restaurant',p_restaurant_id,'items',p_items,'name',p_customer_name,'phone',p_customer_phone,
  'email',p_customer_email,'order_type',p_order_type,'table',p_table_number,'notes',p_notes,'payment',p_payment_method)::text,'sha256'),'hex');
 INSERT INTO public.order_operations(restaurant_id,operation_key,fingerprint) VALUES(p_restaurant_id,key,fingerprint) ON CONFLICT DO NOTHING;
 SELECT * INTO previous FROM public.order_operations WHERE restaurant_id=p_restaurant_id AND operation_key=key FOR UPDATE;
 IF previous.fingerprint<>fingerprint THEN RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505'; END IF;
 IF previous.result IS NOT NULL THEN RETURN previous.result; END IF;
 v_result:=public._create_public_order_internal(p_restaurant_id,p_items,p_customer_name,p_customer_phone,p_customer_email,p_order_type,p_table_number,p_notes,p_payment_method);
 IF NOT COALESCE((v_result->>'success')::boolean,false) THEN RAISE EXCEPTION 'invalid_public_order'; END IF;
 UPDATE public.order_operations SET result=v_result WHERE restaurant_id=p_restaurant_id AND operation_key=key;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.create_order(uuid,jsonb,text,text,text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(uuid,jsonb,text,text,text,text,text,text,text,uuid) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
