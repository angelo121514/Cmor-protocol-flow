-- Fase 9: Trabajador responsable al abrir caja
--
-- Agrega responsable_waiter_id a cash_shifts para registrar qué trabajador
-- (mesero/cajero) abrió el turno. Es obligatorio desde el frontend, pero a
-- nivel de DB es nullable para no romper turnos existentes.
-- Recrea open_cash_shift con el parámetro adicional (DROP FUNCTION por cambio
-- de firma).

BEGIN;

-- =========================================================================
-- Columna responsible_waiter_id
-- =========================================================================
ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS responsible_waiter_id uuid
  REFERENCES public.waiters(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.cash_shifts.responsible_waiter_id IS
  'Trabajador (waiter) responsable del turno de caja. Nullable por compatibilidad.';

-- =========================================================================
-- Recrear open_cash_shift con p_responsible_waiter_id
-- =========================================================================
DROP FUNCTION IF EXISTS public.open_cash_shift(uuid, decimal, text);

CREATE OR REPLACE FUNCTION public.open_cash_shift(
  p_restaurant_id        uuid,
  p_opening_cash         decimal DEFAULT 0,
  p_notes                text DEFAULT NULL,
  p_responsible_waiter_id uuid DEFAULT NULL
) RETURNS public.cash_shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.cash_shifts;
BEGIN
  IF NOT public.is_my_restaurant(p_restaurant_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
    RAISE EXCEPTION 'El fondo inicial no puede ser negativo' USING ERRCODE = '23514';
  END IF;

  -- ¿Ya hay un turno abierto? Retornarlo sin duplicar.
  SELECT * INTO v_existing
    FROM public.cash_shifts
    WHERE restaurant_id = p_restaurant_id AND status = 'open'
    LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.cash_shifts(
      restaurant_id, opened_by, opening_cash, notes, responsible_waiter_id
    )
    VALUES (p_restaurant_id, auth.uid(), p_opening_cash, p_notes, p_responsible_waiter_id)
    RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;
GRANT EXECUTE ON FUNCTION public.open_cash_shift(uuid, decimal, text, uuid) TO authenticated;

COMMIT;
