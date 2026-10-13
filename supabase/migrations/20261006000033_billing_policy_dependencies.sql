BEGIN;
-- Invoice RLS joins subscriptions. Grant only its two dependency columns;
-- the subscription's own RLS still enforces restaurant membership.
GRANT SELECT(id,customer_id) ON public.flow_subscriptions TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
