BEGIN;
ALTER TABLE public.data_subject_requests ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE public.data_subject_requests ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.data_subject_requests ADD COLUMN IF NOT EXISTS requester_ip text;
ALTER TABLE public.data_subject_requests DROP CONSTRAINT IF EXISTS data_subject_requests_status_check;
ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_status_check
  CHECK (status IN ('pending','pending_verification','verified','in_progress','fulfilled','rejected','cancelled','expired','failed'));
-- Preserve links already issued, but stop retaining their capabilities in plaintext.
UPDATE public.data_subject_requests SET token_hash = encode(extensions.digest(verification_token,'sha256'),'hex')
WHERE verification_token IS NOT NULL AND token_hash IS NULL;
UPDATE public.data_subject_requests SET status='pending_verification' WHERE token_hash IS NOT NULL AND status='pending' AND verified_at IS NULL AND request_type<>'contact';
UPDATE public.data_subject_requests SET verification_token = NULL;
ALTER TABLE public.data_subject_requests ALTER COLUMN verification_token DROP DEFAULT;
CREATE UNIQUE INDEX dsar_token_hash_unique ON public.data_subject_requests(token_hash) WHERE token_hash IS NOT NULL;
REVOKE ALL ON public.data_subject_requests FROM anon;
REVOKE SELECT ON public.data_subject_requests FROM authenticated;
GRANT SELECT(id,request_type,subject_id,subject_email,status,payload,fulfilled_at,fulfilled_by,
  result_metadata,rejection_reason,sla_due_at,created_at,updated_at,verified_at)
ON public.data_subject_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_dsar(p_email text, p_type text, p_payload jsonb,
  p_subject_id uuid, p_hash text, p_ip text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_status text;
BEGIN
  IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF p_type NOT IN ('access','export','erase','rectify','object','revoke-consent','contact')
    OR p_email IS NULL OR length(p_email)>254 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('dsar-email:'||lower(p_email),0));
  IF p_ip IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('dsar-ip:'||p_ip,0)); END IF;
  IF (SELECT count(*) FROM public.data_subject_requests WHERE subject_email=lower(p_email)
      AND created_at>=now()-interval '30 days') >= 3 OR
    (p_ip IS NOT NULL AND (SELECT count(*) FROM public.data_subject_requests WHERE requester_ip=p_ip
      AND created_at>=now()-interval '1 day') >= 10) THEN
    RAISE EXCEPTION 'rate_limit' USING ERRCODE = 'P0001';
  END IF;
  IF p_subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users
    WHERE id=p_subject_id AND lower(email)=lower(p_email) AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'identity_mismatch' USING ERRCODE = '42501';
  END IF;
  v_status := CASE WHEN p_type='contact' THEN 'pending' WHEN p_subject_id IS NULL THEN 'pending_verification' ELSE 'verified' END;
  INSERT INTO public.data_subject_requests(request_type,subject_id,subject_email,status,payload,
    token_hash,token_expires_at,requester_ip,verified_at,sla_due_at)
  VALUES(p_type,p_subject_id,lower(p_email),v_status,COALESCE(p_payload,'{}'),p_hash,
    now()+interval '24 hours',p_ip,CASE WHEN p_subject_id IS NOT NULL THEN now() END,
    now()+CASE WHEN p_type='contact' THEN interval '30 days' ELSE interval '10 days' END)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'requestId',v_id,'status',v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_dsar(p_id uuid DEFAULT NULL,p_hash text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE d public.data_subject_requests; v_ids uuid[]; v_data jsonb; v_customers int:=0; v_orders int:=0;
BEGIN
  IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO d FROM public.data_subject_requests
    WHERE (p_id IS NOT NULL AND id=p_id) OR (p_hash IS NOT NULL AND token_hash=p_hash) FOR UPDATE;
  IF NOT FOUND OR d.status NOT IN ('verified','pending_verification') THEN
    RETURN jsonb_build_object('success',false,'error','invalid_token');
  END IF;
  IF d.status='pending_verification' THEN
    IF p_hash IS NULL OR d.token_hash IS DISTINCT FROM p_hash THEN
      RETURN jsonb_build_object('success',false,'error','invalid_token');
    END IF;
    IF now() >= d.token_expires_at THEN
      UPDATE public.data_subject_requests SET status='expired',token_hash=NULL WHERE id=d.id;
      RETURN jsonb_build_object('success',false,'error','expired');
    END IF;
  END IF;
  UPDATE public.data_subject_requests SET status='in_progress',verified_at=now(),token_hash=NULL WHERE id=d.id;
  SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]) INTO v_ids FROM public.restaurant_customers
    WHERE lower(email)=d.subject_email;
  IF d.request_type='rectify' THEN
    UPDATE public.data_subject_requests SET status='pending' WHERE id=d.id;
    v_data:=jsonb_build_object('review_required',true);
  ELSIF d.request_type IN ('access','export') THEN
    RETURN public.prepare_dsar_download(d.id);
  ELSIF d.request_type='erase' THEN
    UPDATE public.orders SET customer_name=NULL,customer_phone=NULL,customer_notes=NULL,customer_email=NULL
      WHERE customer_id=ANY(v_ids) OR lower(customer_email)=d.subject_email; GET DIAGNOSTICS v_orders=ROW_COUNT;
    UPDATE public.restaurant_customers SET name='Titular anonimizado',email=NULL,phone='erased-'||id::text
      WHERE id=ANY(v_ids); GET DIAGNOSTICS v_customers=ROW_COUNT;
    DELETE FROM public.registration_requests WHERE lower(email)=d.subject_email
      AND id NOT IN (SELECT registration_request_id FROM public.restaurants WHERE registration_request_id IS NOT NULL);
    DELETE FROM public.invitations WHERE lower(email)=d.subject_email;
    UPDATE public.consents SET granted=false,revoked_at=now() WHERE lower(subject_email)=d.subject_email AND granted;
    v_data:=jsonb_build_object('customers_anonymized',v_customers,'orders_anonymized_personal',v_orders,
      'note_b2b','La cuenta contractual owner/staff se gestiona por separado.');
  ELSIF d.request_type IN ('object','revoke-consent') THEN
    IF d.payload->>'scope' NOT IN ('cookies','marketing','analytics','ai_profiling','third_party_share')
      OR d.payload->>'scope' IS NULL THEN RAISE EXCEPTION 'invalid_scope' USING ERRCODE='22023'; END IF;
    UPDATE public.consents SET granted=false,revoked_at=now()
      WHERE lower(subject_email)=d.subject_email AND scope=d.payload->>'scope' AND granted;
    GET DIAGNOSTICS v_customers=ROW_COUNT;
    v_data:=jsonb_build_object('scope',d.payload->>'scope','consents_revoked',v_customers);
  ELSE RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023'; END IF;
  IF d.request_type<>'rectify' THEN
    UPDATE public.data_subject_requests SET status='fulfilled',fulfilled_at=now(),
      result_metadata=jsonb_build_object('completed',true) WHERE id=d.id;
  END IF;
  INSERT INTO public.audit_log(actor_email,action,table_name,row_id,metadata)
    VALUES(d.subject_email,'dsar_'||d.request_type,'data_subject_requests',d.id::text,
      jsonb_build_object('request_id',d.id,'review_required',d.request_type='rectify'));
  RETURN jsonb_build_object('success',true,'requestId',d.id,'request_type',d.request_type,
    'status',CASE WHEN d.request_type='rectify' THEN 'pending' ELSE 'fulfilled' END,'data',v_data);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_dsar_rectification(p_id uuid,p_approve boolean,p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.data_subject_requests; f jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO d FROM public.data_subject_requests WHERE id=p_id FOR UPDATE;
  IF d.id IS NULL OR d.request_type<>'rectify' OR d.status<>'pending' OR d.verified_at IS NULL THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE='22023'; END IF;
  IF p_approve THEN
    IF jsonb_typeof(d.payload->'fields') IS DISTINCT FROM 'array' OR jsonb_array_length(d.payload->'fields') NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'invalid_fields'; END IF;
    FOR f IN SELECT jsonb_array_elements(d.payload->'fields') LOOP
      IF f->>'field' NOT IN ('name','phone') OR length(COALESCE(f->>'correct','')) NOT BETWEEN 1 AND 120 THEN
        RAISE EXCEPTION 'invalid_field' USING ERRCODE='22023'; END IF;
      UPDATE public.restaurant_customers SET
        name=CASE WHEN f->>'field'='name' THEN f->>'correct' ELSE name END,
        phone=CASE WHEN f->>'field'='phone' THEN f->>'correct' ELSE phone END
        WHERE lower(email)=d.subject_email;
    END LOOP;
  END IF;
  UPDATE public.data_subject_requests SET status=CASE WHEN p_approve THEN 'fulfilled' ELSE 'rejected' END,
    fulfilled_by=auth.uid(),fulfilled_at=CASE WHEN p_approve THEN now() END,rejection_reason=p_reason WHERE id=d.id;
  INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('dsar_rectify_review','data_subject_requests',
    d.id::text,jsonb_build_object('approved',p_approve));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_dsar(text,text,jsonb,uuid,text,text),public.execute_dsar(uuid,text)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_dsar(text,text,jsonb,uuid,text,text),public.execute_dsar(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.review_dsar_rectification(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_dsar_rectification(uuid,boolean,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
