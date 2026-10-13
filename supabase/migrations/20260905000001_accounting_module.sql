-- =====================================================================
-- CMOR FLOW — Módulo Contabilidad (integración con cmorflow-tax-api)
-- ---------------------------------------------------------------------
-- Fase 1: tablas de configuración y documentos tributarios (DTE Chile).
--
-- - accounting_config: 1:1 con restaurants. Guarda la credencial API del
--   motor (key_id + secret cifrado AES-256-GCM en el edge con
--   ACCOUNTING_MASTER_KEY) y el toggle de emisión automática.
-- - accounting_documents: cola local de DTEs (boleta 39, factura 33, NC 61)
--   con su estado consolidado del motor (queued→submitted→accepted/...).
--   order_id NO lleva REFERENCES: orders está particionada y Postgres no
--   soporta FK hacia tablas particionadas (mismo patrón que tips).
-- - Cron de sincronización cada 5 min vía pg_cron + pg_net, autenticado
--   con un secreto en accounting_cron_secret (RLS sin políticas: solo lo
--   lee el edge con service role).
--
-- Nota: la app (anon/authenticated) solo tiene SELECT por columna en
-- documents y config — todo INSERT/UPDATE pasa por el edge con service role.
--
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- NO aplicar con `supabase db push` (ver docs/PENDIENTES.md).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net; -- funciones en schema net (verificado en prod)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- 1) Configuración contable por restaurante
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_config (
  restaurant_id        uuid PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  auto_emit            boolean NOT NULL DEFAULT false,
  tax_key_id           text,
  tax_secret_encrypted text,
  tax_key_version      integer NOT NULL DEFAULT 1,
  last_sync_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2) Documentos tributarios emitidos hacia el motor
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id            uuid, -- sin FK: orders es particionada
  dte_type            integer NOT NULL CHECK (dte_type IN (33, 39, 61)),
  status              text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','processing','submitted','accepted','observed','rejected','failed','cancelled')),
  attempt             integer NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  request_id          text,
  dte_id              text,
  folio               integer,
  sii_status          text,
  track_id            text,
  amount              numeric(14,2),
  external_reference  text NOT NULL,
  receiver_rut        text,
  receiver_name       text,
  related_document_id uuid REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
  last_error          text,
  trace_id            text,
  payload             jsonb,
  accepted_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Dedupe write-ahead: un sync concurrente no puede duplicar la emisión
-- (external_reference incluye el attempt: order:{id}:39:a{n}).
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounting_docs_ext_ref
  ON public.accounting_documents (restaurant_id, external_reference);

CREATE INDEX IF NOT EXISTS idx_accounting_docs_rest_status
  ON public.accounting_documents (restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_accounting_docs_rest_created
  ON public.accounting_documents (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_docs_request
  ON public.accounting_documents (request_id);

-- ---------------------------------------------------------------------
-- 3) RLS: lectura para miembros del restaurante, escritura solo service role
-- ---------------------------------------------------------------------
ALTER TABLE public.accounting_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads accounting config" ON public.accounting_config;
CREATE POLICY "Owner reads accounting config" ON public.accounting_config
  FOR SELECT
  USING (public.is_my_restaurant(restaurant_id));

DROP POLICY IF EXISTS "Owner reads accounting documents" ON public.accounting_documents;
CREATE POLICY "Owner reads accounting documents" ON public.accounting_documents
  FOR SELECT
  USING (public.is_my_restaurant(restaurant_id));

-- Grants por columna (regla PostgREST: sin SELECT en la columna, select= falla).
-- accounting_config: NUNCA exponer tax_secret_encrypted ni tax_key_id a la app.
GRANT SELECT (
  restaurant_id, auto_emit, tax_key_version, last_sync_at, created_at, updated_at
) ON TABLE public.accounting_config TO authenticated;
GRANT SELECT (
  id, restaurant_id, order_id, dte_type, status, attempt, request_id, dte_id,
  folio, sii_status, track_id, amount, external_reference, receiver_rut,
  receiver_name, related_document_id, last_error, trace_id, accepted_at,
  created_at, updated_at
) ON TABLE public.accounting_documents TO authenticated;

-- ---------------------------------------------------------------------
-- 4) Cron de sincronización (cada 5 min) — pg_cron + pg_net
-- ---------------------------------------------------------------------
-- El secreto se genera aquí mismo (no vive en el repo ni en env vars):
-- el edge "accounting" lo lee con service role y lo compara con el header
-- X-Cron-Secret. Rotación = UPDATE de la fila.
CREATE TABLE IF NOT EXISTS public.accounting_cron_secret (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_cron_secret ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.accounting_cron_secret FROM anon, authenticated;

INSERT INTO public.accounting_cron_secret (id, secret)
SELECT 1, encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM public.accounting_cron_secret WHERE id = 1);

-- Dispatch: solo llama al edge si hay algún restaurante con credencial.
-- SECURITY DEFINER lee el secreto; cron.job solo contiene esta llamada.
CREATE OR REPLACE FUNCTION public.accounting_dispatch_cron()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_secret  text;
  v_pending integer;
BEGIN
  SELECT secret INTO v_secret FROM public.accounting_cron_secret WHERE id = 1;
  IF v_secret IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_pending
  FROM public.accounting_config
  WHERE tax_key_id IS NOT NULL AND tax_secret_encrypted IS NOT NULL;
  IF v_pending = 0 THEN
    RETURN NULL;
  END IF;

  RETURN net.http_post(
    url => 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/accounting/sync',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', v_secret
    ),
    body => jsonb_build_object('source', 'cron'),
    timeout_milliseconds => 120000
  );
END $$;

REVOKE ALL ON FUNCTION public.accounting_dispatch_cron() FROM PUBLIC, anon, authenticated;

-- cron.schedule con job_name existente actualiza el job (pg_cron ≥ 1.4): idempotente.
SELECT cron.schedule(
  'accounting-sync',
  '*/5 * * * *',
  $$SELECT public.accounting_dispatch_cron();$$
);

ANALYZE public.accounting_config;
ANALYZE public.accounting_documents;

COMMIT;

-- Rollback:
-- SELECT cron.unschedule('accounting-sync');
-- DROP FUNCTION IF EXISTS public.accounting_dispatch_cron();
-- DROP TABLE IF EXISTS public.accounting_cron_secret;
-- DROP TABLE IF EXISTS public.accounting_documents;
-- DROP TABLE IF EXISTS public.accounting_config;
