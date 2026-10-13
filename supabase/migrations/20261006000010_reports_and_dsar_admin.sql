BEGIN;
CREATE FUNCTION public.restaurant_dashboard(p_restaurant_id uuid,p_start timestamptz) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('pendingOrders',count(*) FILTER(WHERE status='pending'),
  'completedToday',count(*) FILTER(WHERE status='completed' AND payment_status='paid' AND created_at>=p_start),
  'revenueToday',COALESCE(sum(total) FILTER(WHERE payment_status='paid' AND status NOT IN ('cancelled','rejected') AND paid_at>=p_start),0),
  'pendingQrCount',count(*) FILTER(WHERE order_type='qr' AND payment_status='pending' AND status NOT IN ('cancelled','rejected')),
  'totalOrders',count(*)) INTO result FROM public.orders WHERE restaurant_id=p_restaurant_id;
 RETURN result || jsonb_build_object(
  'activeWaiters',(SELECT count(*) FROM public.waiters WHERE restaurant_id=p_restaurant_id AND is_active),
  'occupiedTables',(SELECT count(*) FROM public.restaurant_tables WHERE restaurant_id=p_restaurant_id AND status='occupied'),
  'totalTables',(SELECT count(*) FROM public.restaurant_tables WHERE restaurant_id=p_restaurant_id),
  'lowStockCount',(SELECT count(*) FROM public.inventory_items WHERE restaurant_id=p_restaurant_id AND current_stock<=min_stock),
  'tipsToday',(SELECT COALESCE(sum(amount),0) FROM public.tips WHERE restaurant_id=p_restaurant_id AND created_at>=p_start),
  'shiftOpen',EXISTS(SELECT 1 FROM public.cash_shifts WHERE restaurant_id=p_restaurant_id AND status='open'),
  'unreadNotifications',(SELECT count(*) FROM public.notifications WHERE restaurant_id=p_restaurant_id AND NOT is_read));
END $$;
CREATE FUNCTION public.admin_transition_dsar(p_id uuid,p_status text,p_reason text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.data_subject_requests;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.data_subject_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR d.request_type<>'contact' OR d.status NOT IN ('pending','in_progress') OR
  p_status NOT IN ('in_progress','fulfilled','rejected','cancelled') THEN RAISE EXCEPTION 'invalid_transition'; END IF;
 UPDATE public.data_subject_requests SET status=p_status,fulfilled_by=auth.uid(),
  fulfilled_at=CASE WHEN p_status='fulfilled' THEN now() END,rejection_reason=p_reason WHERE id=p_id;
 INSERT INTO public.audit_log(action,table_name,row_id,metadata) VALUES('dsar_contact_transition','data_subject_requests',p_id::text,jsonb_build_object('status',p_status));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.restaurant_dashboard(uuid,timestamptz),public.admin_transition_dsar(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restaurant_dashboard(uuid,timestamptz),public.admin_transition_dsar(uuid,text,text) TO authenticated;
-- RLS expressions may evaluate these for anon; both return false without an identity.
GRANT EXECUTE ON FUNCTION public.is_admin(),public.is_my_restaurant(uuid) TO anon;
NOTIFY pgrst,'reload schema';
COMMIT;
