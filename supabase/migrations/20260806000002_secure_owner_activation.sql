-- Fase 2: el navegador no puede autoasignarse roles ni restaurantes.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- Los metadatos del usuario son controlados por el cliente. Solo se usan
  -- para el nombre visible; rol y restaurante se asignan al consumir una
  -- invitación validada en el servidor.
  INSERT INTO public.profiles (id, role, restaurant_id, display_name)
  VALUES (NEW.id, 'owner', NULL, v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_invitation(p_token text)
RETURNS TABLE(restaurant_id uuid, email text, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE;
    RETURN;
  END IF;

  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = p_token
    AND status IN ('pending', 'sent')
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE;
    RETURN;
  END IF;

  SELECT lower(email) INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL OR v_user_email <> lower(v_inv.email) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET restaurant_id = v_inv.restaurant_id,
      role = CASE WHEN v_inv.role = 'staff' THEN 'staff' ELSE 'owner' END
  WHERE id = auth.uid();

  INSERT INTO public.profile_restaurants (profile_id, restaurant_id, is_primary)
  VALUES (auth.uid(), v_inv.restaurant_id, true)
  ON CONFLICT (profile_id, restaurant_id)
  DO UPDATE SET is_primary = true;

  UPDATE public.invitations
  SET status = 'consumed', consumed_at = now()
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.restaurant_id, v_inv.email, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_invitation(text) TO authenticated;

REVOKE ALL ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
TO service_role;
