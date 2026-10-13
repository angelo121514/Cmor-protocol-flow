BEGIN;
CREATE TABLE public.operational_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),revision integer NOT NULL DEFAULT 0,
 config jsonb NOT NULL DEFAULT '{"security_owner":"","privacy_owner":"","payments_owner":"","accounting_owner":"","printer_label":"","catalog_approved":false,"retention_policy_reference":"","request_retention_days":null,"request_purge_enabled":false}',
 updated_at timestamptz NOT NULL DEFAULT now(),updated_by uuid REFERENCES public.profiles(id),
 printer_attested_at timestamptz,printer_attested_by uuid REFERENCES public.profiles(id));
INSERT INTO public.operational_settings(id) VALUES(true);
ALTER TABLE public.operational_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_settings FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.get_operational_settings() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_mfa_required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT to_jsonb(s)-'id' FROM public.operational_settings s WHERE id);
END $$;
CREATE FUNCTION public.save_operational_settings(p_settings jsonb,p_revision integer) RETURNS jsonb
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
 IF p_revision IS DISTINCT FROM old.revision THEN RAISE EXCEPTION 'settings_revision_conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.operational_settings SET config=p_settings-'printer_test_confirmed',revision=revision+1,updated_at=now(),updated_by=auth.uid(),
 printer_attested_at=CASE WHEN attested THEN now() WHEN old.config->>'printer_label'=p_settings->>'printer_label' THEN old.printer_attested_at ELSE NULL END,
 printer_attested_by=CASE WHEN attested THEN auth.uid() WHEN old.config->>'printer_label'=p_settings->>'printer_label' THEN old.printer_attested_by ELSE NULL END WHERE id;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('operational_settings_updated','operational_settings','true',jsonb_build_object('revision',old.revision+1,'printer_manual_attestation',attested));
 RETURN public.get_operational_settings();
END $$;
ALTER TABLE public.restaurants ADD COLUMN report_timezone text;
GRANT SELECT(report_timezone) ON public.restaurants TO authenticated;
CREATE FUNCTION public.set_restaurant_report_timezone(p_restaurant_id uuid,p_timezone text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_mfa_required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'invalid_restaurant_timezone' USING ERRCODE='22023'; END IF;
 UPDATE public.restaurants SET report_timezone=p_timezone WHERE id=p_restaurant_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'restaurant_not_found' USING ERRCODE='P0002'; END IF;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('report_timezone_configured','restaurants',p_restaurant_id::text,jsonb_build_object('timezone',p_timezone));
END $$;
ALTER TABLE public.data_subject_requests ADD COLUMN retention_hold boolean NOT NULL DEFAULT false;
GRANT SELECT(retention_hold) ON public.data_subject_requests TO authenticated;
CREATE FUNCTION public.set_dsar_retention_hold(p_id uuid,p_hold boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_mfa_required' USING ERRCODE='42501'; END IF;
 IF p_hold IS NULL THEN RAISE EXCEPTION 'invalid_hold'; END IF;
 UPDATE public.data_subject_requests SET retention_hold=p_hold WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('dsar_retention_hold_updated','data_subject_requests',p_id::text,jsonb_build_object('hold',p_hold));
END $$;
CREATE SCHEMA IF NOT EXISTS cmor_internal;
REVOKE ALL ON SCHEMA cmor_internal FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION cmor_internal.purge_dsar_artifacts(p_limit integer DEFAULT 500) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ids uuid[]; snapshots integer:=0; rows integer:=0; requests integer:=0; config jsonb; days integer;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_purge_limit' USING ERRCODE='22023'; END IF;
 SELECT array_agg(request_id) INTO ids FROM (SELECT request_id FROM public.dsar_downloads WHERE expires_at<=now() ORDER BY expires_at,request_id LIMIT p_limit FOR UPDATE SKIP LOCKED) d;
 SELECT count(*) INTO rows FROM public.dsar_export_rows WHERE request_id=ANY(ids);
 DELETE FROM public.dsar_downloads WHERE request_id=ANY(ids);GET DIAGNOSTICS snapshots=ROW_COUNT;
 -- Snapshot expiry is technical (24h). Legal request retention is opt-in.
 SELECT s.config INTO config FROM public.operational_settings s WHERE id;
 IF COALESCE((config->>'request_purge_enabled')::boolean,false) THEN
  days:=(config->>'request_retention_days')::integer;
  SELECT array_agg(id) INTO ids FROM (SELECT d.id FROM public.data_subject_requests d
   WHERE NOT d.retention_hold AND d.status IN ('fulfilled','rejected','cancelled','expired') AND COALESCE(d.fulfilled_at,d.updated_at,d.created_at)<now()-make_interval(days=>days)
   AND NOT EXISTS(SELECT 1 FROM public.dsar_downloads x WHERE x.request_id=d.id)
   ORDER BY COALESCE(d.fulfilled_at,d.updated_at,d.created_at),d.id LIMIT p_limit FOR UPDATE SKIP LOCKED) d;
  DELETE FROM public.data_subject_requests WHERE id=ANY(ids);GET DIAGNOSTICS requests=ROW_COUNT;
 END IF;
 IF snapshots>0 OR requests>0 THEN INSERT INTO public.audit_log(action,table_name,metadata) VALUES('dsar_artifacts_purged','data_subject_requests',jsonb_build_object('snapshots',snapshots,'snapshot_rows',rows,'requests',requests)); END IF;
 RETURN jsonb_build_object('snapshots',snapshots,'snapshot_rows',rows,'requests',requests);
END $$;
REVOKE ALL ON FUNCTION cmor_internal.purge_dsar_artifacts(integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.purge_dsar_artifacts(p_limit integer DEFAULT 500) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE='42501'; END IF;
 RETURN cmor_internal.purge_dsar_artifacts(p_limit);
END $$;
REVOKE ALL ON FUNCTION public.get_operational_settings(),public.save_operational_settings(jsonb,integer),public.set_restaurant_report_timezone(uuid,text),public.set_dsar_retention_hold(uuid,boolean),public.purge_dsar_artifacts(integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_operational_settings(),public.save_operational_settings(jsonb,integer),public.set_restaurant_report_timezone(uuid,text),public.set_dsar_retention_hold(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_dsar_artifacts(integer) TO service_role;
SELECT cron.schedule('dsar-artifact-purge','17 * * * *','SELECT cmor_internal.purge_dsar_artifacts(500);');
CREATE OR REPLACE FUNCTION public.restaurant_sales_report(p_restaurant_id uuid,p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.restaurants; start_at timestamptz; result jsonb; tz text;
BEGIN
 IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_days IS NULL OR p_days NOT IN (1,7,30,90) THEN RAISE EXCEPTION 'invalid_report_window' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.restaurants WHERE id=p_restaurant_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'restaurant_not_found' USING ERRCODE='P0002'; END IF;
 -- Explicit administrator configuration; preserve regional fallback until setup.
 tz:=COALESCE(r.report_timezone,CASE r.country WHEN 'CL' THEN 'America/Santiago' WHEN 'BR' THEN 'America/Sao_Paulo' WHEN 'BO' THEN 'America/La_Paz' WHEN 'PE' THEN 'America/Lima' END);
 IF tz IS NULL OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN
  RAISE EXCEPTION 'invalid_restaurant_timezone' USING ERRCODE='22023'; END IF;
 start_at:=((now() AT TIME ZONE tz)::date-(p_days-1))::timestamp AT TIME ZONE tz;
 WITH eligible AS MATERIALIZED (
  SELECT o.* FROM public.orders o WHERE o.restaurant_id=p_restaurant_id
   AND o.payment_status='paid' AND o.status IN ('accepted','preparing','ready','completed')
   AND o.created_at>=start_at AND o.created_at<=now()
 ), totals AS (
  SELECT COALESCE(sum(total),0) AS revenue,count(*) AS orders,
   COALESCE(sum(COALESCE(subtotal,round(total/(1+COALESCE(r.tax_rate,0.19)),CASE WHEN r.currency='CLP' THEN 0 ELSE 2 END))),0) AS subtotal,
   COALESCE(sum(COALESCE(tax,total-round(total/(1+COALESCE(r.tax_rate,0.19)),CASE WHEN r.currency='CLP' THEN 0 ELSE 2 END))),0) AS tax,
   COALESCE(sum(discount),0) AS discount,count(*) FILTER(WHERE currency IS NULL) AS unknown_currency
  FROM eligible
 ), items AS (
  SELECT item->>'name' AS name,sum(COALESCE(NULLIF(item->>'quantity','')::numeric,0)) AS count,
   sum(COALESCE(NULLIF(item->>'item_total','')::numeric,NULLIF(item->>'subtotal','')::numeric,0)) AS revenue
  FROM eligible e CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.items,'[]'::jsonb)) item
  GROUP BY item->>'name' ORDER BY revenue DESC,name LIMIT 5
 ), daily AS (
  SELECT (created_at AT TIME ZONE tz)::date AS date,sum(total) AS revenue,count(*) AS orders
  FROM eligible GROUP BY 1 ORDER BY 1 DESC LIMIT 14
 ), types AS (
  SELECT CASE order_type WHEN 'qr' THEN 'Mesa (QR)' WHEN 'table' THEN 'Mesa' WHEN 'counter' THEN 'Mostrador'
   WHEN 'phone' THEN 'Teléfono' ELSE 'Otro' END AS type,count(*) AS count FROM eligible GROUP BY 1
 )
 SELECT jsonb_build_object('totalRevenue',revenue,'totalOrders',orders,
  'avgOrderValue',CASE WHEN orders=0 THEN 0 ELSE revenue/orders END,'totalSubtotal',subtotal,'totalTax',tax,
  'totalDiscount',discount,'currency',r.currency,'historicalCurrencyCount',unknown_currency,
  'windowStart',start_at,'windowEnd',now(),'timezone',tz,
  'topItems',COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.revenue DESC,i.name) FROM items i),'[]'::jsonb),
  'dailyRevenue',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.date) FROM daily d),'[]'::jsonb),
  'orderTypeDistribution',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.type) FROM types t),'[]'::jsonb))
 INTO result FROM totals;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.restaurant_sales_report(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.restaurant_sales_report(uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
