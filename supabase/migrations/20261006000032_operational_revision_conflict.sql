BEGIN;
CREATE OR REPLACE FUNCTION public.save_operational_settings(p_settings jsonb,p_revision integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE key text; old public.operational_settings; days integer; attested boolean;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_mfa_required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_settings) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 FOR key IN SELECT jsonb_object_keys(p_settings) LOOP
  IF key NOT IN ('security_owner','privacy_owner','payments_owner','accounting_owner','printer_label','catalog_approved','retention_policy_reference','request_retention_days','request_purge_enabled','printer_test_confirmed') THEN RAISE EXCEPTION 'unknown_setting' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOREACH key IN ARRAY ARRAY['security_owner','privacy_owner','payments_owner','accounting_owner','printer_label','retention_policy_reference'] LOOP
  IF jsonb_typeof(p_settings->key) IS DISTINCT FROM 'string' OR length(p_settings->>key)>200 THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOREACH key IN ARRAY ARRAY['catalog_approved','request_purge_enabled','printer_test_confirmed'] LOOP
  IF jsonb_typeof(p_settings->key) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_settings' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF p_settings->'request_retention_days' IS DISTINCT FROM 'null'::jsonb THEN
  IF jsonb_typeof(p_settings->'request_retention_days') IS DISTINCT FROM 'number' OR (p_settings->>'request_retention_days') !~ '^[0-9]{1,4}$' THEN RAISE EXCEPTION 'invalid_retention_days' USING ERRCODE='22023'; END IF;
  days:=(p_settings->>'request_retention_days')::integer;
  IF days NOT BETWEEN 1 AND 3650 THEN RAISE EXCEPTION 'invalid_retention_days' USING ERRCODE='22023'; END IF;
 END IF;
 IF (p_settings->>'request_purge_enabled')::boolean AND (days IS NULL OR length(btrim(p_settings->>'retention_policy_reference'))=0 OR length(btrim(p_settings->>'privacy_owner'))=0) THEN RAISE EXCEPTION 'retention_policy_required' USING ERRCODE='22023'; END IF;
 attested:=(p_settings->>'printer_test_confirmed')::boolean;
 IF attested AND length(btrim(p_settings->>'printer_label'))=0 THEN RAISE EXCEPTION 'printer_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO old FROM public.operational_settings WHERE id FOR UPDATE;
 IF p_revision IS DISTINCT FROM old.revision THEN RAISE EXCEPTION 'settings_revision_conflict' USING ERRCODE='PT409'; END IF;
 UPDATE public.operational_settings SET config=p_settings-'printer_test_confirmed',revision=revision+1,updated_at=now(),updated_by=auth.uid(),
 printer_attested_at=CASE WHEN attested THEN now() WHEN old.config->>'printer_label'=p_settings->>'printer_label' THEN old.printer_attested_at ELSE NULL END,
 printer_attested_by=CASE WHEN attested THEN auth.uid() WHEN old.config->>'printer_label'=p_settings->>'printer_label' THEN old.printer_attested_by ELSE NULL END WHERE id;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('operational_settings_updated','operational_settings','true',jsonb_build_object('revision',old.revision+1,'printer_manual_attestation',attested));
 RETURN public.get_operational_settings();
END $$;
REVOKE ALL ON FUNCTION public.save_operational_settings(jsonb,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.save_operational_settings(jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
