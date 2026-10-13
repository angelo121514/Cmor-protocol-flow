-- =====================================================================
-- Migración 20260828000003_audit_ai_usage_log.sql
-- Auditoría 2026-08-28 — soporta el rate limit por usuario de la Edge
-- Function ai-recommendations (10 análisis / 24 h). Sin esta tabla, un
-- owner podría llamar la función en bucle y quemar créditos OpenRouter.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sólo service_role (Edge Functions) escribe; nadie lee desde el cliente.
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_usage_log FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_window
  ON public.ai_usage_log (user_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
COMMIT;