BEGIN;
CREATE FUNCTION public.platform_dashboard(p_start timestamptz) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('activeRestaurants',(SELECT count(*) FROM public.restaurants WHERE is_active),
  'pendingRequests',(SELECT count(*) FROM public.registration_requests WHERE status='pending'),
  'totalOrders',(SELECT count(*) FROM public.orders),
  'todayRevenue',(SELECT COALESCE(sum(total),0) FROM public.orders WHERE payment_status='paid' AND status NOT IN ('cancelled','rejected') AND paid_at>=p_start));
END $$;
REVOKE ALL ON FUNCTION public.platform_dashboard(timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.platform_dashboard(timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
