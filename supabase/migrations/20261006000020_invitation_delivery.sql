BEGIN;
ALTER TABLE public.invitations ADD COLUMN delivery_state text NOT NULL DEFAULT 'pending' CHECK(delivery_state IN ('pending','sending','sent','reconcile')),
 ADD COLUMN delivery_claim uuid,ADD COLUMN delivery_claim_expires timestamptz,ADD COLUMN delivery_attempts int NOT NULL DEFAULT 0;
UPDATE public.invitations SET delivery_state='sent' WHERE status IN ('sent','consumed');
CREATE FUNCTION public.claim_invitations(p_restaurant uuid DEFAULT NULL) RETURNS SETOF public.invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 UPDATE public.invitations SET delivery_state='reconcile' WHERE delivery_state='sending' AND delivery_claim_expires<=now();
 RETURN QUERY UPDATE public.invitations i SET delivery_state='sending',delivery_claim=gen_random_uuid(),delivery_claim_expires=now()+interval '2 minutes',delivery_attempts=delivery_attempts+1
 WHERE i.id IN (SELECT id FROM public.invitations WHERE status='pending' AND delivery_state='pending' AND expires_at>now()
  AND (p_restaurant IS NULL OR restaurant_id=p_restaurant) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20) RETURNING i.*;
END $$;
CREATE FUNCTION public.finish_invitation_delivery(p_id uuid,p_claim uuid,p_sent boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 UPDATE public.invitations SET delivery_state=CASE WHEN p_sent THEN 'sent' ELSE 'reconcile' END,
  status=CASE WHEN p_sent THEN 'sent' ELSE status END,sent_at=CASE WHEN p_sent THEN now() ELSE sent_at END,delivery_claim=NULL,delivery_claim_expires=NULL
 WHERE id=p_id AND delivery_claim=p_claim AND delivery_state='sending';
 IF NOT FOUND THEN RAISE EXCEPTION 'invitation_claim_lost'; END IF;RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_invitations(uuid),public.finish_invitation_delivery(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invitations(uuid),public.finish_invitation_delivery(uuid,uuid,boolean) TO service_role;
COMMIT;
