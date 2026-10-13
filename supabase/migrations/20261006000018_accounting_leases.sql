BEGIN;
ALTER TABLE public.accounting_config ADD COLUMN sync_lease uuid,ADD COLUMN lease_expires_at timestamptz;
REVOKE ALL ON public.accounting_config FROM PUBLIC,anon,authenticated;
GRANT SELECT(restaurant_id,auto_emit,tax_key_id,tax_key_version,last_sync_at) ON public.accounting_config TO authenticated;
CREATE FUNCTION public.accounting_lease(p_restaurant uuid,p_token uuid DEFAULT NULL,p_release boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE token uuid;
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_release THEN
  UPDATE public.accounting_config SET sync_lease=NULL,lease_expires_at=NULL WHERE restaurant_id=p_restaurant AND sync_lease=p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'lease_lost'; END IF;RETURN NULL;
 ELSIF p_token IS NULL THEN
  token:=gen_random_uuid();
  UPDATE public.accounting_config SET sync_lease=token,lease_expires_at=now()+interval '120 seconds',last_sync_at=now()
   WHERE restaurant_id=p_restaurant AND (sync_lease IS NULL OR lease_expires_at<=now());
  IF NOT FOUND THEN RETURN NULL; END IF;RETURN token;
 ELSE
  UPDATE public.accounting_config SET lease_expires_at=now()+interval '120 seconds' WHERE restaurant_id=p_restaurant AND sync_lease=p_token AND lease_expires_at>now();
  IF NOT FOUND THEN RAISE EXCEPTION 'lease_lost'; END IF;RETURN p_token;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.accounting_lease(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accounting_lease(uuid,uuid,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
