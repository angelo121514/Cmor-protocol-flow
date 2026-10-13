-- =====================================================
-- Migración 20260627000001_flow_integration_tables.sql
-- Integración de API Flow.cl para Suscripciones Recurrentes
-- =====================================================

BEGIN;

-- ─────────────────────────────────────────────────────
-- 1. Crear tabla de planes (flow_plans)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_plans (
  id text PRIMARY KEY, -- planId de Flow.cl
  name text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  interval integer NOT NULL CHECK (interval IN (1, 2, 3, 4)), -- 1=diario, 2=semanal, 3=mensual, 4=anual
  interval_count integer NOT NULL DEFAULT 1,
  trial_period_days integer NOT NULL DEFAULT 0,
  days_until_due integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_plans ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_plans
DROP POLICY IF EXISTS "Cualquiera puede ver los planes" ON public.flow_plans;
CREATE POLICY "Cualquiera puede ver los planes" ON public.flow_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo admins pueden modificar planes" ON public.flow_plans;
CREATE POLICY "Solo admins pueden modificar planes" ON public.flow_plans
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────
-- 2. Crear tabla de clientes Flow (flow_customers)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_customers (
  id text PRIMARY KEY, -- customerId de Flow.cl
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  credit_card_type text,
  last4_card_digits text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_customers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_customers
DROP POLICY IF EXISTS "Restaurant owners y admins pueden gestionar sus clientes Flow" ON public.flow_customers;
CREATE POLICY "Restaurant owners y admins pueden gestionar sus clientes Flow" ON public.flow_customers
  FOR ALL TO authenticated 
  USING (public.is_my_restaurant(restaurant_id) OR public.is_admin()) 
  WITH CHECK (public.is_my_restaurant(restaurant_id) OR public.is_admin());


-- ─────────────────────────────────────────────────────
-- 3. Crear tabla de suscripciones (flow_subscriptions)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_subscriptions (
  id text PRIMARY KEY, -- subscriptionId de Flow.cl
  plan_id text REFERENCES public.flow_plans(id) ON DELETE RESTRICT NOT NULL,
  customer_id text REFERENCES public.flow_customers(id) ON DELETE CASCADE NOT NULL,
  status integer NOT NULL CHECK (status IN (0, 1, 2, 3, 4, 5)), -- 0=Created, 1=Active, 2=Past_due, 3=Unpaid, 4=Cancelled, 5=Trial
  subscription_start timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_subscriptions
DROP POLICY IF EXISTS "Restaurant owners y admins pueden ver/gestionar sus suscripciones" ON public.flow_subscriptions;
CREATE POLICY "Restaurant owners y admins pueden ver/gestionar sus suscripciones" ON public.flow_subscriptions
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.flow_customers c 
      WHERE c.id = customer_id AND public.is_my_restaurant(c.restaurant_id)
    )
  )
  WITH CHECK (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.flow_customers c 
      WHERE c.id = customer_id AND public.is_my_restaurant(c.restaurant_id)
    )
  );


-- ─────────────────────────────────────────────────────
-- 4. Modificar tabla restaurants para asociar Flow
-- ─────────────────────────────────────────────────────
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS flow_customer_id text REFERENCES public.flow_customers(id) ON DELETE SET NULL;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS flow_subscription_id text REFERENCES public.flow_subscriptions(id) ON DELETE SET NULL;


-- ─────────────────────────────────────────────────────
-- 5. Crear tabla de pagos (flow_payments)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  subscription_id text REFERENCES public.flow_subscriptions(id) ON DELETE SET NULL,
  flow_order numeric UNIQUE NOT NULL,
  commerce_order text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status integer NOT NULL CHECK (status IN (1, 2, 3, 4)), -- 1=Pendiente, 2=Pagada, 3=Rechazada, 4=Anulada
  payment_method text,
  transaction_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_payments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_payments
DROP POLICY IF EXISTS "Restaurant owners y admins pueden ver sus pagos Flow" ON public.flow_payments;
CREATE POLICY "Restaurant owners y admins pueden ver sus pagos Flow" ON public.flow_payments
  FOR ALL TO authenticated
  USING (public.is_my_restaurant(restaurant_id) OR public.is_admin())
  WITH CHECK (public.is_my_restaurant(restaurant_id) OR public.is_admin());


-- ─────────────────────────────────────────────────────
-- 6. Crear tabla de facturas (flow_invoices)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_invoices (
  id text PRIMARY KEY, -- invoiceId de Flow.cl
  subscription_id text REFERENCES public.flow_subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_invoices
DROP POLICY IF EXISTS "Restaurant owners y admins pueden ver sus facturas Flow" ON public.flow_invoices;
CREATE POLICY "Restaurant owners y admins pueden ver sus facturas Flow" ON public.flow_invoices
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.flow_subscriptions s
      JOIN public.flow_customers c ON c.id = s.customer_id
      WHERE s.id = subscription_id AND public.is_my_restaurant(c.restaurant_id)
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.flow_subscriptions s
      JOIN public.flow_customers c ON c.id = s.customer_id
      WHERE s.id = subscription_id AND public.is_my_restaurant(c.restaurant_id)
    )
  );


-- ─────────────────────────────────────────────────────
-- 7. Crear tabla de cupones (flow_coupons)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_coupons (
  id text PRIMARY KEY, -- couponId de Flow.cl
  name text NOT NULL,
  percent_off numeric,
  amount_off numeric,
  currency text,
  duration text NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_coupons ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_coupons
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede ver cupones" ON public.flow_coupons;
CREATE POLICY "Cualquier usuario autenticado puede ver cupones" ON public.flow_coupons
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Solo admins pueden modificar cupones" ON public.flow_coupons;
CREATE POLICY "Solo admins pueden modificar cupones" ON public.flow_coupons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────
-- 8. Crear tabla de logs para webhook (flow_webhook_events)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flow_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_token text UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.flow_webhook_events ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para flow_webhook_events
DROP POLICY IF EXISTS "Solo admins pueden ver los eventos de webhook" ON public.flow_webhook_events;
CREATE POLICY "Solo admins pueden ver los eventos de webhook" ON public.flow_webhook_events
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ─────────────────────────────────────────────────────
-- 9. Actualizar constraints y columnas de payment_intents
-- ─────────────────────────────────────────────────────
ALTER TABLE public.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_provider_check;
ALTER TABLE public.payment_intents ADD CONSTRAINT payment_intents_provider_check CHECK (provider IN ('webpay', 'flow'));

ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS flow_order text;
ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS flow_token text;


-- ─────────────────────────────────────────────────────
-- 10. Triggers para updated_at automático
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_flow_plans_updated_at ON public.flow_plans;
CREATE TRIGGER update_flow_plans_updated_at BEFORE UPDATE ON public.flow_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_flow_customers_updated_at ON public.flow_customers;
CREATE TRIGGER update_flow_customers_updated_at BEFORE UPDATE ON public.flow_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_flow_subscriptions_updated_at ON public.flow_subscriptions;
CREATE TRIGGER update_flow_subscriptions_updated_at BEFORE UPDATE ON public.flow_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────
-- 11. Índices para rendimiento
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_flow_customers_restaurant ON public.flow_customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_flow_subscriptions_customer ON public.flow_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_flow_payments_restaurant ON public.flow_payments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_flow_payments_flow_order ON public.flow_payments(flow_order);
CREATE INDEX IF NOT EXISTS idx_flow_invoices_subscription ON public.flow_invoices(subscription_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
