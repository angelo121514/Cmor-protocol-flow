-- Plan De por vida: pago único de $500.000 CLP, sin renovación.

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_subscription_plan_check;

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_subscription_plan_check
  CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise', 'lifetime', 'test_plan'));

ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_plan_check;

ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_plan_check
  CHECK (plan IN ('starter', 'pro', 'lifetime', 'test_plan'));

-- La cuenta del propietario se activa por invitación. Nunca por parámetros
-- provenientes del navegador ni por metadatos de Supabase Auth.
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'consumed', 'cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz
);

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.invitations
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS invitations_pending_idx
  ON public.invitations (status, created_at);

CREATE OR REPLACE FUNCTION public.auto_approve_registration_v2(
  p_request_id uuid,
  p_plan text DEFAULT 'free_trial',
  p_payment_provider text DEFAULT 'trial',
  p_transaction_id text DEFAULT NULL,
  p_amount numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request registration_requests;
  v_restaurant_id uuid;
  v_trial_ends timestamptz;
  v_slug text;
BEGIN
  IF p_plan NOT IN ('free_trial', 'starter', 'pro', 'lifetime', 'test_plan') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_plan');
  END IF;

  -- Los planes pagados solo pueden ser activados por un webhook/servicio confiable
  -- o por un administrador. El cliente nunca decide el plan al activar una cuenta.
  IF p_plan IN ('starter', 'pro', 'lifetime', 'test_plan')
     AND NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized_paid_plan',
      'message', 'Para activar un plan pago, el pago debe confirmarse vía webhook'
    );
  END IF;

  SELECT * INTO v_request
  FROM public.registration_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'request_not_found_or_processed');
  END IF;

  IF v_request.email IS NULL OR btrim(v_request.email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'owner_email_required');
  END IF;

  v_trial_ends := CASE WHEN p_plan = 'free_trial' THEN now() + interval '14 days' ELSE NULL END;

  v_slug := lower(regexp_replace(v_request.restaurant_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN
    v_slug := 'restaurante';
  END IF;
  v_slug := v_slug || '-' || substring(p_request_id::text, 1, 4);

  INSERT INTO public.restaurants (
    name, slug, email, owner_name, phone,
    subscription_plan, status, trial_ends_at, is_active,
    registration_request_id
  ) VALUES (
    v_request.restaurant_name,
    v_slug,
    v_request.email,
    v_request.owner_name,
    v_request.phone,
    p_plan,
    CASE WHEN p_plan = 'free_trial' THEN 'trial' ELSE 'active' END,
    v_trial_ends,
    true,
    p_request_id
  )
  RETURNING id INTO v_restaurant_id;

  -- Solo una invitación activa por restaurante. El correo se envía desde una
  -- Edge Function con service role después de confirmar la activación.
  UPDATE public.invitations
  SET status = 'cancelled'
  WHERE restaurant_id = v_restaurant_id
    AND status IN ('pending', 'sent');

  INSERT INTO public.invitations (restaurant_id, email, role, expires_at)
  VALUES (v_restaurant_id, v_request.email, 'owner', now() + interval '7 days');

  UPDATE public.registration_requests
  SET status = 'verified',
      updated_at = now(),
      internal_notes = jsonb_build_object(
        'plan', p_plan,
        'payment_provider', p_payment_provider,
        'transaction_id', p_transaction_id,
        'amount', p_amount,
        'billing_type', CASE WHEN p_plan = 'lifetime' THEN 'one_time' ELSE 'recurring' END,
        'auto_approved', true,
        'approved_at', now()
      )
  WHERE id = p_request_id;

  NOTIFY pgrst, 'reload schema';

  RETURN jsonb_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'trial_ends_at', v_trial_ends,
    'is_lifetime', p_plan = 'lifetime'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_paid_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.subscription_plan IN ('starter', 'pro', 'enterprise', 'lifetime')
     AND NEW.status = 'trial' THEN
    NEW.status := 'active';
    NEW.trial_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
