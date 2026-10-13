BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profile_restaurants GROUP BY profile_id HAVING count(*)>5 OR count(*) FILTER(WHERE is_primary)>1) THEN
  RAISE EXCEPTION 'ambiguous_memberships_require_reconciliation'; END IF;
END $$;
CREATE UNIQUE INDEX one_primary_restaurant ON public.profile_restaurants(profile_id) WHERE is_primary;
CREATE OR REPLACE FUNCTION public.consume_invitation(p_token text) RETURNS TABLE(restaurant_id uuid,email text,success boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inv public.invitations; profile public.profiles; verified_email text; primary_exists boolean;
BEGIN
 SELECT * INTO profile FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF profile.id IS NULL OR profile.role='admin' THEN RAISE EXCEPTION 'invitation_role_denied' USING ERRCODE='42501'; END IF;
 SELECT lower(u.email) INTO verified_email FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL;
 SELECT * INTO inv FROM public.invitations i WHERE i.token=p_token AND i.status IN ('pending','sent') AND i.expires_at>now() FOR UPDATE;
 IF inv.id IS NULL OR verified_email IS NULL OR verified_email<>lower(inv.email) THEN RETURN QUERY SELECT NULL::uuid,NULL::text,false;RETURN; END IF;
 primary_exists:=EXISTS(SELECT 1 FROM public.profile_restaurants pr WHERE pr.profile_id=auth.uid() AND pr.is_primary);
 INSERT INTO public.profile_restaurants(profile_id,restaurant_id,is_primary) VALUES(auth.uid(),inv.restaurant_id,NOT primary_exists)
 ON CONFLICT ON CONSTRAINT profile_restaurants_profile_id_restaurant_id_key DO NOTHING;
 UPDATE public.profiles SET restaurant_id=inv.restaurant_id,role=CASE WHEN profile.role='owner' OR inv.role='owner' THEN 'owner' ELSE 'staff' END WHERE id=auth.uid();
 UPDATE public.invitations SET status='consumed',consumed_at=now() WHERE id=inv.id;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('invitation_consumed','invitations',inv.id::text,'{}');
 RETURN QUERY SELECT inv.restaurant_id,inv.email,true;
END $$;
CREATE OR REPLACE FUNCTION public.get_table_orders(p_session_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE session uuid; data jsonb;
BEGIN
 SELECT id INTO session FROM public.table_sessions WHERE session_token=p_session_token AND status IN ('active','payment_pending');
 IF session IS NULL THEN RAISE EXCEPTION 'invalid_session' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'payment_status',o.payment_status,
  'items',o.items,'total',o.total,'created_at',o.created_at) ORDER BY o.created_at,o.id),'[]') INTO data FROM public.orders o WHERE o.table_session_id=session;
 RETURN data;
END $$;
ALTER TABLE public.inventory_items ADD CONSTRAINT stock_finite_nonnegative CHECK(current_stock>=0 AND current_stock<>'NaN'::numeric);
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT recipe_quantity_positive CHECK(quantity_needed>0 AND quantity_needed<>'NaN'::numeric);
CREATE TABLE public.browser_signals(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid,kind text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.browser_signal(p_kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_kind NOT IN ('login_failed','export_clicked','network_failed') OR auth.uid() IS NULL THEN RAISE EXCEPTION 'invalid_signal'; END IF;
 IF NOT public.check_rate_limit(auth.uid()::text,'resource','browser_signal',20,5) THEN RAISE EXCEPTION 'signal_rate_limit'; END IF;
 INSERT INTO public.browser_signals(actor_id,kind) VALUES(auth.uid(),p_kind);
END $$;
ALTER TABLE public.browser_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.browser_signals FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.browser_signals TO service_role;
CREATE POLICY admin_reads_browser_signals ON public.browser_signals FOR SELECT TO authenticated USING(public.is_admin());
GRANT SELECT ON public.browser_signals TO authenticated;
REVOKE ALL ON FUNCTION public.browser_signal(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.browser_signal(text),public.consume_invitation(text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_table_orders(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_table_orders(text) TO anon,authenticated;
CREATE FUNCTION public.begin_admin_mfa_recovery(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 UPDATE public.profiles SET admin_mfa_blocked=true,admin_mfa_reset_at=now() WHERE id=p_id AND role='admin';
 IF NOT FOUND THEN RAISE EXCEPTION 'admin_not_found'; END IF;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('admin_mfa_recovery_started','profiles',p_id::text,'{}');
END $$;
CREATE FUNCTION public.complete_admin_mfa_recovery(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 UPDATE public.profiles p SET admin_mfa_blocked=false WHERE id=p_id AND role='admin' AND admin_mfa_blocked AND
  EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=p.id AND f.status='verified' AND f.created_at>=p.admin_mfa_reset_at);
 IF NOT FOUND THEN RAISE EXCEPTION 'new_verified_factor_required'; END IF;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('admin_mfa_recovery_completed','profiles',p_id::text,'{}');
END $$;
REVOKE ALL ON FUNCTION public.begin_admin_mfa_recovery(uuid),public.complete_admin_mfa_recovery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_admin_mfa_recovery(uuid),public.complete_admin_mfa_recovery(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
