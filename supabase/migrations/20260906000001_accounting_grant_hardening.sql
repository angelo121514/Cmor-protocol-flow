-- =====================================================================
-- CMOR FLOW — Hardening de grants para el módulo Contabilidad
-- ---------------------------------------------------------------------
-- El proyecto tiene ALTER DEFAULT PRIVILEGES que otorga ALL (arwdDxtm) a
-- anon/authenticated sobre TODA tabla nueva en public. Por eso
-- accounting_config/accounting_documents nacieron con INSERT/UPDATE/SELECT
-- en todas las columnas (incl. tax_secret_encrypted) aunque la migración
-- original solo otorgara SELECT por columnas — los privilegios se suman.
-- RLS bloqueaba INSERT/UPDATE (solo hay política SELECT), pero el SELECT
-- del ciphertext de la credencial era superficie innecesaria.
--
-- Principio: app roles solo SELECT de columnas seguras; toda escritura
-- por service role (bypasea RLS). Igual que 20260828000001_audit_lock_sensitive_columns.
-- Idempotente. NO aplicar con `supabase db push`.
-- =====================================================================

BEGIN;

REVOKE ALL ON public.accounting_config FROM anon, authenticated;
REVOKE ALL ON public.accounting_documents FROM anon, authenticated;

-- SELECT de columnas seguras solo para el dueño autenticado (RLS filtra filas).
GRANT SELECT (
  restaurant_id, auto_emit, tax_key_version, last_sync_at, created_at, updated_at
) ON TABLE public.accounting_config TO authenticated;
GRANT SELECT (
  id, restaurant_id, order_id, dte_type, status, attempt, request_id, dte_id,
  folio, sii_status, track_id, amount, external_reference, receiver_rut,
  receiver_name, related_document_id, last_error, trace_id, accepted_at,
  created_at, updated_at
) ON TABLE public.accounting_documents TO authenticated;

-- Blindado extra para la tabla del secreto del cron (REVOKE ya en migración
-- anterior; se re-afirma por idempotencia).
REVOKE ALL ON public.accounting_cron_secret FROM anon, authenticated;

COMMIT;
