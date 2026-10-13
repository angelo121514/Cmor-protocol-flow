-- Tabla puente: un usuario puede pertenecer a N restaurantes
CREATE TABLE IF NOT EXISTS public.profile_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, restaurant_id)
);

CREATE INDEX idx_pr_profile ON public.profile_restaurants(profile_id);
CREATE INDEX idx_pr_restaurant ON public.profile_restaurants(restaurant_id);

-- ═══════════════════════════════════════════════════════════════
-- LÍMITE: Máximo 5 restaurantes por persona (trigger de control)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_max_restaurants()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.profile_restaurants
  WHERE profile_id = NEW.profile_id;

  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Límite alcanzado: máximo 5 restaurantes por usuario'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_max_restaurants ON public.profile_restaurants;
CREATE TRIGGER enforce_max_restaurants
  BEFORE INSERT ON public.profile_restaurants
  FOR EACH ROW EXECUTE FUNCTION public.check_max_restaurants();

COMMENT ON FUNCTION public.check_max_restaurants() IS
  'Limita a 5 restaurantes máximo por usuario. Cambiar el 5 aquí para modificar el límite.';

-- RLS: cada usuario solo ve sus propias asociaciones
ALTER TABLE public.profile_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own associations" ON public.profile_restaurants
  FOR ALL USING (profile_id = auth.uid());

-- Migrar datos existentes: insertar las relaciones actuales
INSERT INTO public.profile_restaurants (profile_id, restaurant_id, is_primary)
SELECT id, restaurant_id, true
FROM public.profiles
WHERE restaurant_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Actualizar is_my_restaurant para aceptar TODOS los restaurantes del usuario
CREATE OR REPLACE FUNCTION public.is_my_restaurant(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_restaurants
    WHERE profile_id = auth.uid()
      AND restaurant_id = p_restaurant_id
  ) OR public.is_admin();
$$;
