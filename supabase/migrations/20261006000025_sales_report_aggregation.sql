BEGIN;
CREATE FUNCTION public.restaurant_sales_report(p_restaurant_id uuid,p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.restaurants; start_at timestamptz; result jsonb; tz text;
BEGIN
 IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_days IS NULL OR p_days NOT IN (1,7,30,90) THEN RAISE EXCEPTION 'invalid_report_window' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM public.restaurants WHERE id=p_restaurant_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'restaurant_not_found' USING ERRCODE='P0002'; END IF;
 -- Regional default only: the baseline has no restaurant timezone column.
 tz:=CASE r.country WHEN 'CL' THEN 'America/Santiago' WHEN 'BR' THEN 'America/Sao_Paulo' WHEN 'BO' THEN 'America/La_Paz' WHEN 'PE' THEN 'America/Lima' END;
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
