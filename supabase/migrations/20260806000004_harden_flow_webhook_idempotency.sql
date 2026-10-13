-- Fase 4: reclamación atómica de webhooks para evitar doble activación.

ALTER TABLE public.flow_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_flow_webhook_event(
  p_flow_token text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed_id uuid;
  v_processed_at timestamptz;
BEGIN
  INSERT INTO public.flow_webhook_events (
    flow_token, event_type, payload, processing_started_at
  ) VALUES (
    p_flow_token, 'payment_status', p_payload, now()
  )
  ON CONFLICT (flow_token) DO UPDATE
  SET payload = EXCLUDED.payload,
      processing_started_at = now()
  WHERE public.flow_webhook_events.processed_at IS NULL
    AND (
      public.flow_webhook_events.processing_started_at IS NULL
      OR public.flow_webhook_events.processing_started_at < now() - interval '5 minutes'
    )
  RETURNING id INTO v_claimed_id;

  IF v_claimed_id IS NOT NULL THEN
    RETURN 'claimed';
  END IF;

  SELECT processed_at INTO v_processed_at
  FROM public.flow_webhook_events
  WHERE flow_token = p_flow_token;

  RETURN CASE WHEN v_processed_at IS NOT NULL THEN 'processed' ELSE 'busy' END;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_flow_webhook_event(text, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_flow_webhook_event(text, jsonb)
TO service_role;
