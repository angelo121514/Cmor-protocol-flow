-- Los cobros del POS se validan contra restaurants.status. En algunos locales
-- ya pagados el plan quedó actualizado a Pro, pero el estado conservó "trial";
-- eso producía el falso bloqueo `trial_expired`.
--
-- Normalizamos las filas existentes y evitamos que una actualización futura
-- deje un plan pagado en estado de prueba. No se modifica un local bloqueado:
-- un estado "blocked" sigue teniendo precedencia.

BEGIN;

UPDATE public.restaurants
SET
  status = 'active',
  trial_ends_at = NULL
WHERE subscription_plan IN ('starter', 'pro', 'enterprise')
  AND status = 'trial';

CREATE OR REPLACE FUNCTION public.normalize_paid_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.subscription_plan IN ('starter', 'pro', 'enterprise')
     AND NEW.status = 'trial' THEN
    NEW.status := 'active';
    NEW.trial_ends_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_paid_subscription_status ON public.restaurants;

CREATE TRIGGER normalize_paid_subscription_status
BEFORE INSERT OR UPDATE OF subscription_plan, status ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.normalize_paid_subscription_status();

COMMIT;
