BEGIN;
ALTER TABLE public.profiles ADD COLUMN admin_mfa_blocked boolean NOT NULL DEFAULT false,ADD COLUMN admin_mfa_reset_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((auth.jwt()->>'aal') = 'aal2', false)
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND NOT admin_mfa_blocked
     AND (admin_mfa_reset_at IS NULL OR (auth.jwt()->>'iat')::numeric>=extract(epoch FROM admin_mfa_reset_at)))
    AND EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified');
$$;

CREATE OR REPLACE FUNCTION public.is_service_actor() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(auth.role() = 'service_role', false);
$$;

CREATE OR REPLACE FUNCTION public.is_my_restaurant(p_restaurant_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
    AND ((p.role = 'admin' AND public.is_admin()) OR
      (p.role IN ('owner','staff') AND (p.restaurant_id = p_restaurant_id OR EXISTS (
        SELECT 1 FROM public.profile_restaurants pr
        WHERE pr.profile_id = p.id AND pr.restaurant_id = p_restaurant_id))))) ;
$$;
REVOKE ALL ON FUNCTION public.is_admin(), public.is_my_restaurant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(), public.is_my_restaurant(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_service_actor() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_service_actor() TO service_role;

CREATE OR REPLACE FUNCTION public.switch_restaurant(p_restaurant_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'restaurant_access_denied' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.restaurants WHERE id = p_restaurant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'restaurant_not_found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.profiles SET restaurant_id = p_restaurant_id WHERE id = auth.uid();
  RETURN p_restaurant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.switch_restaurant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_restaurant(uuid) TO authenticated;

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS trusted boolean NOT NULL DEFAULT false;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.consents FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.data_subject_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_trusted_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.trusted := true;
  NEW.actor_id := auth.uid();
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO NEW.actor_email FROM auth.users WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER audit_trusted_insert BEFORE INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_trusted_insert();
REVOKE ALL ON FUNCTION public.audit_trusted_insert() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_my_consent(p_scope text, p_purpose text,
  p_legal_basis text, p_granted boolean, p_policy_version text, p_via text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RAISE EXCEPTION 'verified_identity_required' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.consents(subject_id, subject_email, scope, purpose, legal_basis,
    granted, granted_at, revoked_at, privacy_policy_version, proof)
  VALUES (auth.uid(), lower(v_email), p_scope, p_purpose, p_legal_basis, p_granted,
    CASE WHEN p_granted THEN now() END, CASE WHEN NOT p_granted THEN now() END,
    p_policy_version, jsonb_build_object('via',p_via,'identity_verified',true)) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_my_consent(text,text,text,boolean,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_my_consent(text,text,text,boolean,text,text) TO authenticated;

-- Serialize membership quota checks even if a caller bypasses the UI RPC.
CREATE OR REPLACE FUNCTION public.enforce_membership_quota() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = NEW.profile_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.profile_restaurants
    WHERE profile_id = NEW.profile_id AND restaurant_id = NEW.restaurant_id)
    AND (SELECT count(*) FROM public.profile_restaurants WHERE profile_id = NEW.profile_id) >= 5 THEN
    RAISE EXCEPTION 'restaurant_limit' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER membership_quota BEFORE INSERT ON public.profile_restaurants
FOR EACH ROW EXECUTE FUNCTION public.enforce_membership_quota();
REVOKE ALL ON FUNCTION public.enforce_membership_quota() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
