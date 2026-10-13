-- Parenthesize the cached JWT before extracting its email claim so Postgres
-- plans the auth call as an initplan rather than evaluating it per row.
ALTER POLICY dsr_select_self ON public.data_subject_requests
  USING (
    subject_id = (SELECT auth.uid())
    OR subject_email = COALESCE(((SELECT auth.jwt()) ->> 'email'), '')
  );
