BEGIN;
-- Private, short-lived snapshots prevent max_rows truncation and shifting offsets.
CREATE TABLE public.dsar_downloads(request_id uuid PRIMARY KEY REFERENCES public.data_subject_requests(id),
 token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',read_until bigint NOT NULL DEFAULT 0);
CREATE TABLE public.dsar_export_rows(request_id uuid NOT NULL REFERENCES public.dsar_downloads(request_id) ON DELETE CASCADE,
 position bigint GENERATED ALWAYS AS IDENTITY,dataset text NOT NULL,record jsonb NOT NULL,PRIMARY KEY(request_id,position));
ALTER TABLE public.dsar_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsar_export_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dsar_downloads,public.dsar_export_rows FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.dsar_downloads,public.dsar_export_rows TO service_role;
CREATE FUNCTION public.prepare_dsar_download(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.data_subject_requests; token text; ids uuid[];
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.data_subject_requests WHERE id=p_id AND status='in_progress' AND verified_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR d.request_type NOT IN ('access','export') THEN RAISE EXCEPTION 'invalid_request'; END IF;
 DELETE FROM public.dsar_downloads WHERE expires_at<=now();
 token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.dsar_downloads(request_id,token_hash) VALUES(d.id,encode(extensions.digest(token,'sha256'),'hex'));
 SELECT COALESCE(array_agg(id),'{}'::uuid[]) INTO ids FROM public.restaurant_customers WHERE lower(email)=d.subject_email;
 INSERT INTO public.dsar_export_rows(request_id,dataset,record)
 SELECT d.id,'authUsers',jsonb_build_object('id',id,'email',email,'created_at',created_at) FROM auth.users WHERE lower(email)=d.subject_email;
 INSERT INTO public.dsar_export_rows(request_id,dataset,record)
 SELECT d.id,'customers',jsonb_build_object('id',id,'name',name,'phone',phone,'email',email) FROM public.restaurant_customers WHERE id=ANY(ids);
 INSERT INTO public.dsar_export_rows(request_id,dataset,record)
 SELECT d.id,'orders',jsonb_build_object('id',id,'order_number',order_number,'status',status,'total',total,'payment_method',payment_method,'created_at',created_at)
 FROM public.orders WHERE customer_id=ANY(ids) OR lower(customer_email)=d.subject_email;
 INSERT INTO public.dsar_export_rows(request_id,dataset,record)
 SELECT d.id,'registrationRequests',jsonb_build_object('id',id,'restaurant_name',restaurant_name,'owner_name',owner_name,'email',email,'status',status,'created_at',created_at)
 FROM public.registration_requests WHERE lower(email)=d.subject_email;
 INSERT INTO public.dsar_export_rows(request_id,dataset,record)
 SELECT d.id,'invitations',jsonb_build_object('email',email,'created_at',created_at) FROM public.invitations WHERE lower(email)=d.subject_email;
 INSERT INTO public.dsar_export_rows(request_id,dataset,record)
 SELECT d.id,'consents',jsonb_build_object('scope',scope,'granted',granted,'granted_at',granted_at,'revoked_at',revoked_at) FROM public.consents WHERE lower(subject_email)=d.subject_email;
 RETURN jsonb_build_object('success',true,'requestId',d.id,'request_type',d.request_type,'status','in_progress','download_token',token);
END $$;
CREATE FUNCTION public.read_dsar_download(p_id uuid,p_hash text,p_after bigint DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb; cursor bigint; download public.dsar_downloads;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO download FROM public.dsar_downloads WHERE request_id=p_id AND token_hash=p_hash AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR p_after<0 THEN RAISE EXCEPTION 'invalid_download'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(page) ORDER BY position),'[]'),COALESCE(max(position),p_after) INTO rows,cursor
 FROM (SELECT position,dataset,record FROM public.dsar_export_rows WHERE request_id=p_id AND position>p_after ORDER BY position LIMIT 500) page;
 UPDATE public.dsar_downloads SET read_until=GREATEST(read_until,cursor) WHERE request_id=p_id;
 RETURN jsonb_build_object('rows',rows,'cursor',cursor,'more',EXISTS(SELECT 1 FROM public.dsar_export_rows WHERE request_id=p_id AND position>cursor));
END $$;
CREATE FUNCTION public.finish_dsar_download(p_id uuid,p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.data_subject_requests; download public.dsar_downloads;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.data_subject_requests WHERE id=p_id FOR UPDATE;
 SELECT * INTO download FROM public.dsar_downloads WHERE request_id=p_id AND token_hash=p_hash AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.dsar_export_rows WHERE request_id=p_id AND position>download.read_until) THEN RAISE EXCEPTION 'incomplete_download'; END IF;
 IF d.status='in_progress' THEN
  UPDATE public.data_subject_requests SET status='fulfilled',fulfilled_at=now(),result_metadata=jsonb_build_object('completed',true,'rows',(SELECT count(*) FROM public.dsar_export_rows WHERE request_id=p_id)) WHERE id=p_id;
  INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('dsar_download_ready','data_subject_requests',p_id::text,'{}');
 ELSIF d.status<>'fulfilled' THEN RAISE EXCEPTION 'invalid_request'; END IF;
 RETURN jsonb_build_object('success',true,'requestId',p_id,'request_type',d.request_type,'status','fulfilled');
END $$;
REVOKE ALL ON FUNCTION public.prepare_dsar_download(uuid),public.read_dsar_download(uuid,text,bigint),public.finish_dsar_download(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_dsar_download(uuid),public.read_dsar_download(uuid,text,bigint),public.finish_dsar_download(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
