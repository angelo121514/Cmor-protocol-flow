-- setup_v8_multi_restaurant_insert.sql
-- Adds an INSERT policy to public.restaurants allowing authenticated users to insert new restaurants.

DROP POLICY IF EXISTS restaurants_authenticated_insert ON public.restaurants;
CREATE POLICY restaurants_authenticated_insert ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- a. Database function (RPC) public.create_restaurant_branch
CREATE OR REPLACE FUNCTION public.create_restaurant_branch(
  p_name text,
  p_email text,
  p_phone text,
  p_city text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_restaurant_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_parent_id uuid;
  v_parent_plan text;
  v_parent_status text;
  v_parent_is_active boolean;
  v_parent_owner_name text;
  v_parent_trial_ends timestamptz;
  v_branch_count integer;
  v_base_slug text;
  v_slug text;
  v_counter integer;
  v_new_restaurant_id uuid;
BEGIN
  -- 1. Authenticated user check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get active/parent restaurant ID from user profile
  SELECT restaurant_id INTO v_parent_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'User profile has no active restaurant' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. Plan validation (must be pro or enterprise)
  SELECT subscription_plan, status, is_active, owner_name, trial_ends_at
  INTO v_parent_plan, v_parent_status, v_parent_is_active, v_parent_owner_name, v_parent_trial_ends
  FROM public.restaurants
  WHERE id = v_parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active restaurant not found' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_parent_plan NOT IN ('pro', 'enterprise') OR v_parent_plan IS NULL THEN
    RAISE EXCEPTION 'Plan upgrade required: branch creation only allowed on pro or enterprise plans'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Branch count validation (< 5)
  SELECT COUNT(*) INTO v_branch_count
  FROM public.profile_restaurants
  WHERE profile_id = v_user_id;

  IF v_branch_count >= 5 THEN
    RAISE EXCEPTION 'Branch limit reached: maximum of 5 restaurants allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Unique email check
  IF EXISTS (SELECT 1 FROM public.restaurants WHERE email = p_email) THEN
    RAISE EXCEPTION 'Restaurant email already in use' USING ERRCODE = 'unique_violation';
  END IF;

  -- 5. Unique slug generation
  v_base_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := regexp_replace(v_base_slug, '^-|-$', '', 'g');
  IF v_base_slug = '' THEN
    v_base_slug := 'branch';
  END IF;

  v_slug := v_base_slug;
  v_counter := 1;
  WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = v_slug) LOOP
    v_slug := v_base_slug || '-' || v_counter;
    v_counter := v_counter + 1;
  END LOOP;

  -- 6. Insert into public.restaurants
  INSERT INTO public.restaurants (
    name,
    slug,
    email,
    phone,
    city,
    address,
    restaurant_type,
    subscription_plan,
    status,
    is_active,
    owner_name,
    trial_ends_at
  ) VALUES (
    p_name,
    v_slug,
    p_email,
    p_phone,
    p_city,
    p_address,
    COALESCE(p_restaurant_type, 'branch'),
    v_parent_plan,
    v_parent_status,
    v_parent_is_active,
    v_parent_owner_name,
    v_parent_trial_ends
  )
  RETURNING id INTO v_new_restaurant_id;

  -- 7. Insert relationship in public.profile_restaurants
  INSERT INTO public.profile_restaurants (
    profile_id,
    restaurant_id,
    is_primary
  ) VALUES (
    v_user_id,
    v_new_restaurant_id,
    false
  );

  -- 8. Update public.profiles.restaurant_id
  UPDATE public.profiles
  SET restaurant_id = v_new_restaurant_id
  WHERE id = v_user_id;

  RETURN v_new_restaurant_id;
END;
$$;

-- b. Tighten RLS on profile_restaurants
DROP POLICY IF EXISTS "Users see own associations" ON public.profile_restaurants;
CREATE POLICY "Users see own associations" ON public.profile_restaurants 
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

-- c. Fix Broken Onboarding/Invitation Flows
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, role, restaurant_id, display_name)
  VALUES (NEW.id, 'owner', NULL, v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_invitation(p_token text)
RETURNS TABLE(restaurant_id uuid, email text, success boolean)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_profile_id uuid;
BEGIN
  SELECT * INTO v_inv FROM public.invitations
  WHERE token = p_token AND status IN ('pending','sent') LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, FALSE;
    RETURN;
  END IF;

  UPDATE public.invitations
  SET status = 'consumed', consumed_at = now()
  WHERE id = v_inv.id;

  -- Link the profile to the restaurant immediately if the user already exists
  UPDATE public.profiles
  SET restaurant_id = v_inv.restaurant_id
  WHERE id = (SELECT u.id FROM auth.users u WHERE u.email = v_inv.email)
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NOT NULL THEN
    INSERT INTO public.profile_restaurants (profile_id, restaurant_id, is_primary)
    VALUES (v_profile_id, v_inv.restaurant_id, true)
    ON CONFLICT (profile_id, restaurant_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT v_inv.restaurant_id, v_inv.email, TRUE;
END;
$$;
