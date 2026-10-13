-- Función RPC para crear una sucursal y asociarla al usuario actual
CREATE OR REPLACE FUNCTION public.create_restaurant_branch(
  p_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_address text,
  p_restaurant_type text,
  p_subscription_plan text,
  p_status text,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_new_restaurant_id uuid;
BEGIN
  -- 1. Obtener el ID del usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Insertar el nuevo restaurante
  INSERT INTO public.restaurants (
    name,
    email,
    phone,
    city,
    address,
    restaurant_type,
    subscription_plan,
    status,
    is_active
  ) VALUES (
    p_name,
    p_email,
    p_phone,
    p_city,
    p_address,
    p_restaurant_type,
    p_subscription_plan,
    p_status,
    p_is_active
  ) RETURNING id INTO v_new_restaurant_id;

  -- 3. Crear la asociación en la tabla puente
  -- El trigger 'enforce_max_restaurants' verificará automáticamente que no se excedan los 5 restaurantes
  INSERT INTO public.profile_restaurants (
    profile_id,
    restaurant_id,
    is_primary
  ) VALUES (
    v_user_id,
    v_new_restaurant_id,
    false
  );

  RETURN v_new_restaurant_id;
END;
$$;
