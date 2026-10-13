BEGIN;
ALTER TABLE public.accounting_cron_secret ADD COLUMN endpoint_url text,ADD COLUMN enabled boolean NOT NULL DEFAULT false;
REVOKE ALL ON public.accounting_cron_secret FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.accounting_dispatch_cron() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,net AS $$
DECLARE c public.accounting_cron_secret;
BEGIN
 SELECT * INTO c FROM public.accounting_cron_secret WHERE id=1;
 IF NOT c.enabled THEN RETURN NULL; END IF;
 IF c.secret IS NULL OR c.endpoint_url IS NULL OR c.endpoint_url !~ '^https://[^/]+/functions/v1/accounting/sync$' THEN
  RAISE EXCEPTION 'invalid_accounting_dispatch_configuration'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.accounting_config WHERE tax_key_id IS NOT NULL AND tax_secret_encrypted IS NOT NULL) THEN RETURN NULL; END IF;
 RETURN net.http_post(url=>c.endpoint_url,headers=>jsonb_build_object('Content-Type','application/json','X-Cron-Secret',c.secret),
  body=>jsonb_build_object('source','cron'),timeout_milliseconds=>30000);
END $$;
REVOKE ALL ON FUNCTION public.accounting_dispatch_cron() FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS "Anon can read via signed URL" ON storage.objects;
DROP POLICY IF EXISTS "Owners can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Owners manage their logos" ON storage.objects;
CREATE POLICY "Owners read their legacy logos" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id IN ('logos','qr-codes') AND public.is_my_restaurant(((storage.foldername(name))[1])::uuid));
-- Only the authenticated upload Edge validates file bytes. SQL MIME metadata is insufficient.
UPDATE storage.buckets SET public=false,file_size_limit=2097152,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']
 WHERE id IN ('menu-images','logos','qr-codes');
REVOKE UPDATE(id,registration_request_id),INSERT(id,registration_request_id) ON public.restaurants FROM authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.profile_restaurants FROM PUBLIC,anon,authenticated;
REVOKE UPDATE ON public.orders FROM PUBLIC,anon,authenticated;
GRANT UPDATE(status,internal_notes,customer_notes,updated_at,completed_at,accepted_at,preparing_at,ready_at) ON public.orders TO authenticated;
-- Definer RPCs alone control amounts and payment state.
REVOKE ALL ON FUNCTION public.complete_session_payment(uuid,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session_payment(uuid,numeric,text) TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
