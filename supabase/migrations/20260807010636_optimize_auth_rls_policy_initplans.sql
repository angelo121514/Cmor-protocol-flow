-- Cache authentication context once per statement in RLS policies.  The
-- expressions remain logically equivalent while avoiding per-row JWT lookups.
ALTER POLICY "Restaurant owners can update their restaurant" ON public.restaurants
  USING (
    (SELECT auth.uid())::text IN (
      SELECT users.id::text
      FROM public.users
      WHERE users.restaurant_id = restaurants.id
    )
  );

ALTER POLICY profiles_select_self ON public.profiles
  USING (id = (SELECT auth.uid()));

ALTER POLICY profiles_update_self ON public.profiles
  USING (id = (SELECT auth.uid()));

ALTER POLICY consents_select_self ON public.consents
  USING (subject_id = (SELECT auth.uid()));

ALTER POLICY consents_update_self ON public.consents
  USING (
    subject_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

ALTER POLICY "Users can view own notifications" ON public.notifications
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can update own notifications" ON public.notifications
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY dsr_select_self ON public.data_subject_requests
  USING (
    subject_id = (SELECT auth.uid())
    OR subject_email = COALESCE((SELECT auth.jwt() ->> 'email'), '')
  );

ALTER POLICY "Users see own associations" ON public.profile_restaurants
  USING (profile_id = (SELECT auth.uid()));
