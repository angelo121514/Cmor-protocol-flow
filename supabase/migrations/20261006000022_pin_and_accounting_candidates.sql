BEGIN;
-- A table-level SELECT grant also exposes pin_hash; revoke it before projecting.
REVOKE ALL ON public.waiters FROM PUBLIC,anon;
REVOKE SELECT,INSERT,UPDATE ON public.waiters FROM authenticated;
GRANT SELECT(id,restaurant_id,name,is_active,photo_url,phone,email,role,created_at,updated_at) ON public.waiters TO authenticated;

-- Filter already handled orders in PostgreSQL, before applying a bounded batch.
CREATE FUNCTION public.accounting_emission_candidates(p_restaurant uuid,p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid,total numeric,items jsonb,order_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_service_actor() THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_limit'; END IF;
 RETURN QUERY SELECT o.id,o.total,o.items,o.order_number::text FROM public.orders o
 WHERE o.restaurant_id=p_restaurant AND o.payment_status='paid'
 AND NOT EXISTS(SELECT 1 FROM public.accounting_documents d WHERE d.order_id=o.id AND d.dte_type=39
   AND (d.status IN ('queued','processing','submitted','accepted','observed') OR d.attempt>=3))
 ORDER BY o.created_at,o.id LIMIT p_limit;
END $$;
REVOKE ALL ON FUNCTION public.accounting_emission_candidates(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accounting_emission_candidates(uuid,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
