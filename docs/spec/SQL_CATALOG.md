> Referencia de arquitectura heredada y saneada. No constituye evidencia de despliegue ni validación de esta distribución. Las guías públicas del README prevalecen para instalaciones nuevas.

# Catálogo SQL y cronología declarada

> Actualización 2026-10-07: las secciones anteriores a «Cambio autorizado» conservan la reconstrucción del baseline 2026-10-05. Para contratos modificados prevalecen las specs TASK-002–015 y el [estado actual](IMPLEMENTATION_STATUS.md). La validación local final está en LOCAL_VALIDATION; el despliegue permanece UNKNOWN.

Fecha de análisis: 2026-10-05 (America/Santiago). Commit base: `319a4d2a9bd88d2b1b16b3d61ef8ae7094a8948d`. Evidencia local; despliegue real DESCONOCIDO.

AS-IS — CONFIRMADO: extracción de las 89 migraciones, sin ejecutarlas. Es un registro de declaraciones, no un dump del catálogo desplegado. `DO` y SQL dinámico se conservan como evidencia, no se evalúan. Un `CREATE OR REPLACE` no elimina grants previos; revocaciones de PUBLIC y grants por columna deben leerse junto a RLS. Las tablas `orders_new`/`orders_old` pertenecen a la transformación de particiones; no se consideran entidades nuevas.

## 20260101000000_initial_schema.sql

[supabase/migrations/20260101000000_initial_schema.sql](<../../supabase/migrations/20260101000000_initial_schema.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```


```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```


```sql
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT NOT NULL,
  address TEXT,
  restaurant_type TEXT NOT NULL,
  heard_from TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'verified', 'rejected')),
  contacted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


```sql
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_request_id UUID REFERENCES registration_requests(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT,
  address TEXT,
  restaurant_type TEXT,
  logo_url TEXT,
  qr_code_url TEXT,
  subscription_plan TEXT NOT NULL DEFAULT 'free_trial' CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'blocked', 'trial')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  internal_notes TEXT,
  block_reason TEXT,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  temp_password BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


```sql
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);
```


```sql
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  category TEXT,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sizes JSONB DEFAULT '[]'::jsonb,
  addons JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  prep_time_minutes INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('qr', 'counter', 'phone', 'table')),
  table_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'rejected')),
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_transaction_id TEXT,
  customer_notes TEXT,
  internal_notes TEXT,
  accepted_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, order_number)
);
```


```sql
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
```


```sql
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
```


```sql
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
```


```sql
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```


```sql
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(restaurant_id, is_available);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(restaurant_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
```


```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```


```sql
DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
```


```sql
CREATE TRIGGER update_registration_requests_updated_at BEFORE UPDATE ON registration_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_restaurants_updated_at ON restaurants;
```


```sql
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
```


```sql
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_menu_categories_updated_at ON menu_categories;
```


```sql
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
```


```sql
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
```


```sql
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
```


```sql
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```


```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_date TEXT;
  order_count INTEGER;
BEGIN
  today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO order_count
  FROM orders
  WHERE restaurant_id = NEW.restaurant_id
    AND DATE(created_at) = CURRENT_DATE;
  
  NEW.order_number := today_date || '-' || LPAD(order_count::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```


```sql
DROP TRIGGER IF EXISTS set_order_number ON orders;
```


```sql
CREATE TRIGGER set_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();
```

- Función `admin_login`; firma `p_email TEXT,   p_password_hash TEXT`; retorno/cualificadores `TABLE (   id UUID,   email TEXT,   name TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 242.
- Función `restaurant_login`; firma `p_email TEXT,   p_password_hash TEXT`; retorno/cualificadores `TABLE (   id UUID,   email TEXT,   role TEXT,   restaurant_id UUID,   temp_password BOOLEAN,   restaurant_name TEXT,   restaurant_slug TEXT,   restaurant_is_active BOOLEAN ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 268.
- Función `admin_create_restaurant`; firma `p_request_id UUID,   p_restaurant_name TEXT,   p_slug TEXT,   p_owner_name TEXT,   p_phone TEXT,   p_email TEXT,   p_city TEXT,   p_address TEXT,   p_subscription_plan TEXT,   p_password_hash TEXT,   p_internal_notes TEXT`; retorno/cualificadores `TABLE (   restaurant_id UUID,   user_id UUID,   success BOOLEAN,   message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 304.
- Función `admin_toggle_restaurant_status`; firma `p_restaurant_id UUID,   p_is_active BOOLEAN,   p_block_reason TEXT DEFAULT NULL`; retorno/cualificadores `BOOLEAN LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 355.
- Función `admin_reject_request`; firma `p_request_id UUID,   p_rejection_reason TEXT`; retorno/cualificadores `BOOLEAN LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 376.

```sql
GRANT EXECUTE ON FUNCTION admin_login TO anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION restaurant_login TO anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION admin_create_restaurant TO anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION admin_toggle_restaurant_status TO anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION admin_reject_request TO anon, authenticated;
```


```sql
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```


```sql
CREATE POLICY "Public can view available menu items" ON menu_items FOR SELECT USING (is_available = TRUE);
```


```sql
CREATE POLICY "Public can view active restaurants" ON restaurants FOR SELECT USING (is_active = TRUE AND status = 'active');
```


```sql
CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (TRUE);
```


```sql
CREATE POLICY "Restaurant owners can view their restaurant" ON restaurants FOR SELECT USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = restaurants.id));
```


```sql
CREATE POLICY "Restaurant owners can update their restaurant" ON restaurants FOR UPDATE USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = restaurants.id));
```


```sql
CREATE POLICY "Restaurant owners can manage menu" ON menu_items FOR ALL USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = menu_items.restaurant_id));
```


```sql
CREATE POLICY "Restaurant owners can manage orders" ON orders FOR ALL USING (auth.uid()::text IN (SELECT id::text FROM users WHERE restaurant_id = orders.restaurant_id));
```


```sql
ALTER TABLE registration_requests REPLICA IDENTITY FULL;
```


```sql
ALTER PUBLICATION supabase_realtime ADD TABLE registration_requests;
```


```sql
ALTER TABLE restaurants REPLICA IDENTITY FULL;
```


```sql
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
```


```sql
ALTER TABLE menu_items REPLICA IDENTITY FULL;
```


```sql
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
```


```sql
ALTER TABLE orders REPLICA IDENTITY FULL;
```


```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```


```sql
DO $$
BEGIN
  RAISE NOTICE '✓ Database setup complete!';
  RAISE NOTICE '✓ Tables created with indexes and triggers';
  RAISE NOTICE '✓ RPC functions configured';
  RAISE NOTICE '✓ RLS policies enabled';
  RAISE NOTICE '✓ Real-time replication configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin user: NO seed incluido — crear manualmente (ver comentario arriba)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Enable real-time in Supabase Dashboard > Database > Replication';
END $$;
```


## 20260101000001_auth_profiles.sql

[supabase/migrations/20260101000001_auth_profiles.sql](<../../supabase/migrations/20260101000001_auth_profiles.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  role          text NOT NULL DEFAULT 'owner'
                CHECK (role IN ('owner','staff','admin')),
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```


```sql
COMMENT ON TABLE  public.profiles IS 'Perfil de aplicación vinculado a auth.users.';
```


```sql
COMMENT ON COLUMN public.profiles.role IS 'owner | staff | admin';
```


```sql
CREATE INDEX IF NOT EXISTS profiles_restaurant_id_idx ON public.profiles(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS profiles_role_idx            ON public.profiles(role);
```

- Función `public.handle_new_user`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 46.

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```


```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- Función `public.is_admin`; firma ``; retorno/cualificadores `boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Fuente línea 78.
- Función `public.is_my_restaurant`; firma `p_restaurant_id uuid`; retorno/cualificadores `boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Fuente línea 95.
- Función `public.get_my_restaurant`; firma ``; retorno/cualificadores `SETOF public.restaurants LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Fuente línea 109.

```sql
CREATE TABLE IF NOT EXISTS public.invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email         text NOT NULL,
  token         text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role          text NOT NULL DEFAULT 'owner',
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','sent','consumed','cancelled')),
  created_by    uuid,  
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  consumed_at   timestamptz
);
```


```sql
CREATE INDEX IF NOT EXISTS invitations_email_idx    ON public.invitations(email);
```


```sql
CREATE INDEX IF NOT EXISTS invitations_status_idx   ON public.invitations(status);
```


```sql
CREATE INDEX IF NOT EXISTS invitations_token_idx    ON public.invitations(token);
```

- Función `public.admin_create_restaurant_v2`; firma `p_request_id        uuid,   p_restaurant_name   text,   p_slug              text,   p_owner_name        text,   p_phone             text,   p_email             text,   p_city              text,   p_address           text,   p_subscription_plan text,   p_internal_notes    text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 147.
- Función `public.admin_invite_owner`; firma `p_restaurant_id uuid,   p_email         text`; retorno/cualificadores `TABLE(invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 204.
- Función `public.consume_invitation`; firma `p_token text`; retorno/cualificadores `TABLE(restaurant_id uuid, email text, success boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 234.

```sql
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE public.invitations  ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS profiles_select_self    ON public.profiles;
```


```sql
DROP POLICY IF EXISTS profiles_select_admin   ON public.profiles;
```


```sql
DROP POLICY IF EXISTS profiles_update_self    ON public.profiles;
```


```sql
DROP POLICY IF EXISTS profiles_insert_trigger ON public.profiles;
```


```sql
CREATE POLICY profiles_select_self   ON public.profiles FOR SELECT USING (id = auth.uid());
```


```sql
CREATE POLICY profiles_select_admin  ON public.profiles FOR SELECT USING (public.is_admin());
```


```sql
CREATE POLICY profiles_update_self   ON public.profiles FOR UPDATE USING (id = auth.uid());
```


```sql
CREATE POLICY profiles_insert_trigger ON public.profiles FOR INSERT WITH CHECK (true);
```


```sql
DROP POLICY IF EXISTS invitations_admin_all ON public.invitations;
```


```sql
CREATE POLICY invitations_admin_all ON public.invitations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;
```


```sql
DROP POLICY IF EXISTS restaurants_owner_update ON public.restaurants;
```


```sql
CREATE POLICY restaurants_owner_select ON public.restaurants
  FOR SELECT USING (
    public.is_my_restaurant(id)
    OR (is_active AND status = 'active')  
  );
```


```sql
CREATE POLICY restaurants_owner_update ON public.restaurants
  FOR UPDATE USING (public.is_my_restaurant(id));
```


```sql
DROP POLICY IF EXISTS "Public can insert registration requests" ON public.registration_requests;
```


```sql
DROP POLICY IF EXISTS "Admins can select all registration requests" ON public.registration_requests;
```


```sql
DROP POLICY IF EXISTS "Admins can update all registration requests" ON public.registration_requests;
```


```sql
CREATE POLICY "Public can insert registration requests" ON public.registration_requests
  FOR INSERT WITH CHECK (true);
```


```sql
CREATE POLICY "Admins can select all registration requests" ON public.registration_requests
  FOR SELECT USING (public.is_admin());
```


```sql
CREATE POLICY "Admins can update all registration requests" ON public.registration_requests
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
DROP POLICY IF EXISTS "Restaurant owners can manage menu" ON public.menu_items;
```


```sql
DROP POLICY IF EXISTS "Public can view available menu items" ON public.menu_items;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners and admins can manage menu items" ON public.menu_items;
```


```sql
CREATE POLICY "Public can view available menu items" ON public.menu_items
  FOR SELECT USING (is_available = true);
```


```sql
CREATE POLICY "Restaurant owners and admins can manage menu items" ON public.menu_items
  FOR ALL USING (public.is_my_restaurant(restaurant_id)) WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
DROP POLICY IF EXISTS "Restaurant owners can manage categories" ON public.menu_categories;
```


```sql
DROP POLICY IF EXISTS "Public can view categories" ON public.menu_categories;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners and admins can manage menu categories" ON public.menu_categories;
```


```sql
CREATE POLICY "Public can view categories" ON public.menu_categories
  FOR SELECT USING (is_active = true);
```


```sql
CREATE POLICY "Restaurant owners and admins can manage menu categories" ON public.menu_categories
  FOR ALL USING (public.is_my_restaurant(restaurant_id)) WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON public.orders;
```


```sql
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners and admins can manage orders" ON public.orders;
```


```sql
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);
```


```sql
CREATE POLICY "Restaurant owners and admins can manage orders" ON public.orders
  FOR ALL USING (public.is_my_restaurant(restaurant_id)) WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
GRANT EXECUTE ON FUNCTION
  public.is_admin(),
  public.is_my_restaurant(uuid),
  public.get_my_restaurant(),
  public.admin_create_restaurant_v2(uuid,text,text,text,text,text,text,text,text,text),
  public.admin_invite_owner(uuid,text),
  public.consume_invitation(text)
TO authenticated, anon;
```


## 20260101000002_privacy_foundation.sql

[supabase/migrations/20260101000002_privacy_foundation.sql](<../../supabase/migrations/20260101000002_privacy_foundation.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
```


```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```


```sql
CREATE TABLE IF NOT EXISTS public.consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_email text NOT NULL,
  scope         text NOT NULL CHECK (scope IN
                  ('cookies','marketing','ai_profiling','analytics','third_party_share')),
  purpose       text NOT NULL,
  legal_basis   text NOT NULL CHECK (legal_basis IN
                  ('consent','contract','legal_obligation','legitimate_interest')),
  granted       boolean NOT NULL,
  granted_at    timestamptz,
  revoked_at    timestamptz,
  proof         jsonb,
  privacy_policy_version text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```


```sql
COMMENT ON TABLE public.consents IS
  'Registro granular de consentimientos. Ley 19.628 art. 4 / Ley 21.719 art. 9.';
```


```sql
CREATE INDEX IF NOT EXISTS consents_subject_id_idx
  ON public.consents(subject_id);
```


```sql
CREATE INDEX IF NOT EXISTS consents_subject_email_idx
  ON public.consents(subject_email);
```


```sql
CREATE INDEX IF NOT EXISTS consents_scope_granted_idx
  ON public.consents(scope, granted);
```


```sql
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS consents_select_self ON public.consents;
```


```sql
CREATE POLICY consents_select_self ON public.consents
  FOR SELECT USING (subject_id = auth.uid());
```


```sql
DROP POLICY IF EXISTS consents_select_admin ON public.consents;
```


```sql
CREATE POLICY consents_select_admin ON public.consents
  FOR SELECT USING (public.is_admin());
```


```sql
DROP POLICY IF EXISTS consents_insert_any ON public.consents;
```


```sql
CREATE POLICY consents_insert_any ON public.consents
  FOR INSERT WITH CHECK (true);
```


```sql
DROP POLICY IF EXISTS consents_update_self ON public.consents;
```


```sql
CREATE POLICY consents_update_self ON public.consents
  FOR UPDATE USING (subject_id = auth.uid() OR public.is_admin());
```


```sql
GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated, anon;
```


```sql
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            bigserial PRIMARY KEY,
  actor_id      uuid,
  actor_email   text,
  action        text NOT NULL,
  table_name    text,
  row_id        text,
  metadata      jsonb,
  before_state  jsonb,
  after_state   jsonb,
  ip            inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
) WITH (fillfactor = 95);
```


```sql
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS before_state jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb;
```


```sql
COMMENT ON TABLE public.audit_log IS
  'Log inmutable de eventos. Ley 21.719 art. 24 (seguridad del tratamiento).';
```


```sql
CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx
  ON public.audit_log(actor_id);
```


```sql
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON public.audit_log(created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON public.audit_log(action);
```


```sql
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS audit_log_admin_select ON public.audit_log;
```


```sql
CREATE POLICY audit_log_admin_select ON public.audit_log
  FOR SELECT USING (public.is_admin());
```


```sql
DROP POLICY IF EXISTS audit_log_insert_any ON public.audit_log;
```


```sql
CREATE POLICY audit_log_insert_any ON public.audit_log
  FOR INSERT WITH CHECK (true);
```


```sql
GRANT SELECT, INSERT ON public.audit_log TO authenticated, anon;
```


```sql
REVOKE UPDATE, DELETE ON public.audit_log FROM PUBLIC, authenticated, anon, service_role;
```


```sql
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
```


```sql
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = orders.restaurant_id
        AND r.is_active = true
        AND r.status = 'active'
    )
  );
```


```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
```


```sql
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());
```


```sql
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
```


```sql
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());
```


```sql
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
```


```sql
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);
```


```sql
COMMENT ON POLICY "Public can insert registration requests"
  ON public.registration_requests IS
  'El rate-limit (max 5/IP/día) se aplica en la capa de aplicación (Edge Function o RPC), no aquí.';
```


```sql
DROP POLICY IF EXISTS "Owners manage their logos" ON storage.objects;
```


```sql
CREATE POLICY "Owners manage their logos" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id IN ('logos','qr-codes')
    AND public.is_my_restaurant(
      ((storage.foldername(name))[1])::uuid
    )
  );
```


```sql
COMMENT ON TABLE public.admin_users IS
  '[DEPRECATED 2026-06-18] Tabla legacy con contraseñas SHA-256. '
  'NO usar para autenticación. El login admin pasa por auth.users + '
  'profiles.role=''admin''. Conservada solo para auditoría histórica.';
```


```sql
REVOKE ALL ON public.admin_users FROM anon, authenticated;
```


```sql
COMMENT ON FUNCTION public.admin_login(text, text) IS
  '[DEPRECATED 2026-06-18] Usar Supabase Auth. Mantenida solo para auditoría.';
```


```sql
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type    text NOT NULL CHECK (request_type IN
                    ('access','rectify','erase','object','export','revoke-consent','contact')),
  subject_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_email   text NOT NULL,
  verification_token text UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN
                    ('pending','verified','in_progress','fulfilled','rejected','cancelled')),
  payload         jsonb,
  fulfilled_at    timestamptz,
  fulfilled_by    uuid REFERENCES auth.users(id),
  result_metadata jsonb,
  rejection_reason text,
  sla_due_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```


```sql
COMMENT ON TABLE public.data_subject_requests IS
  'Cola de solicitudes de derechos del titular. Ley 19.628 art. 19 / Ley 21.719.';
```


```sql
CREATE INDEX IF NOT EXISTS dsr_subject_email_idx
  ON public.data_subject_requests(subject_email);
```


```sql
CREATE INDEX IF NOT EXISTS dsr_status_idx
  ON public.data_subject_requests(status);
```


```sql
CREATE INDEX IF NOT EXISTS dsr_sla_due_at_idx
  ON public.data_subject_requests(sla_due_at)
  WHERE status IN ('pending','verified','in_progress');
```

- Función `public.set_dsr_updated_at`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql`. Fuente línea 268.

```sql
DROP TRIGGER IF EXISTS dsr_updated_at ON public.data_subject_requests;
```


```sql
CREATE TRIGGER dsr_updated_at BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_dsr_updated_at();
```


```sql
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS dsr_select_self ON public.data_subject_requests;
```


```sql
CREATE POLICY dsr_select_self ON public.data_subject_requests
  FOR SELECT USING (
    subject_id = auth.uid()
    OR subject_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );
```


```sql
DROP POLICY IF EXISTS dsr_admin_all ON public.data_subject_requests;
```


```sql
CREATE POLICY dsr_admin_all ON public.data_subject_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
DROP POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests;
```


```sql
CREATE POLICY dsr_insert_any ON public.data_subject_requests
  FOR INSERT WITH CHECK (true);
```


```sql
GRANT SELECT, INSERT, UPDATE ON public.data_subject_requests TO authenticated, anon;
```

- Función `public.run_retention_sweep`; firma ``; retorno/cualificadores `TABLE(table_name text, rows_affected bigint, action text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 298.

```sql
COMMENT ON FUNCTION public.run_retention_sweep() IS
  'Sweep de retención semanal. Plazos según D7 (sujetos a validación legal). '
  'Usa anonimización cuando hay obligación legal de conservar (orders 6a SII).';
```


```sql
REVOKE ALL ON FUNCTION public.run_retention_sweep() FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.run_retention_sweep() TO service_role;
```


```sql
CREATE TABLE IF NOT EXISTS public.breach_register (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at     timestamptz NOT NULL DEFAULT now(),
  reported_at     timestamptz,
  severity        text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status          text NOT NULL DEFAULT 'detected' CHECK (status IN
                    ('detected','investigating','contained','notified','closed')),
  description     text NOT NULL,
  affected_data_categories text[],
  affected_subjects_count integer,
  containment_measures text,
  root_cause      text,
  authority_notified_at timestamptz,
  subjects_notified_at timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```


```sql
COMMENT ON TABLE public.breach_register IS
  'Registro de incidentes de seguridad. Ley 21.719: notificación <= 72h.';
```


```sql
CREATE INDEX IF NOT EXISTS breach_status_idx ON public.breach_register(status);
```


```sql
CREATE INDEX IF NOT EXISTS breach_detected_at_idx ON public.breach_register(detected_at DESC);
```

- Función `public.set_breach_updated_at`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql`. Fuente línea 427.

```sql
DROP TRIGGER IF EXISTS breach_updated_at ON public.breach_register;
```


```sql
CREATE TRIGGER breach_updated_at BEFORE UPDATE ON public.breach_register
  FOR EACH ROW EXECUTE FUNCTION public.set_breach_updated_at();
```


```sql
ALTER TABLE public.breach_register ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS breach_admin_all ON public.breach_register;
```


```sql
CREATE POLICY breach_admin_all ON public.breach_register
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
GRANT SELECT, INSERT, UPDATE ON public.breach_register TO authenticated;
```


```sql
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'retention_sweep_weekly';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;
```


```sql
SELECT cron.schedule(
  'retention_sweep_weekly',
  '0 7 * * 0',
  $$SELECT * FROM public.run_retention_sweep();$$
);
```

- Función `public.security_check_rls_status`; firma ``; retorno/cualificadores `TABLE(table_name text, rls_enabled boolean) LANGUAGE sql SECURITY DEFINER SET search_path = public`. Fuente línea 468.
- Función `public.security_check_security_definer`; firma ``; retorno/cualificadores `TABLE(proname text) LANGUAGE sql SECURITY DEFINER SET search_path = public`. Fuente línea 492.
- Función `public.security_check_admin_users_grants`; firma ``; retorno/cualificadores `TABLE(anon_select boolean, auth_select boolean) LANGUAGE sql SECURITY DEFINER SET search_path = public`. Fuente línea 505.

```sql
GRANT EXECUTE ON FUNCTION public.security_check_rls_status()          TO service_role, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.security_check_security_definer()    TO service_role, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.security_check_admin_users_grants()  TO service_role, authenticated;
```


## 20260101000003_registration_flow.sql

[supabase/migrations/20260101000003_registration_flow.sql](<../../supabase/migrations/20260101000003_registration_flow.sql>)


```sql
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD')),
ADD COLUMN IF NOT EXISTS usd_exchange_rate NUMERIC DEFAULT 950,
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'es' CHECK (default_language IN ('es', 'en')),
ADD COLUMN IF NOT EXISTS default_prep_time INTEGER DEFAULT 15;
```


```sql
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
```

- Función `public.admin_create_restaurant`; firma `p_request_id UUID,   p_restaurant_name TEXT,   p_slug TEXT,   p_owner_name TEXT,   p_phone TEXT,   p_email TEXT,   p_city TEXT,   p_address TEXT,   p_subscription_plan TEXT,   p_password_hash TEXT,   p_internal_notes TEXT`; retorno/cualificadores `TABLE (   restaurant_id UUID,   user_id UUID,   success BOOLEAN,   message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 23.
- Función `public.admin_create_restaurant_v2`; firma `p_request_id        uuid,   p_restaurant_name   text,   p_slug              text,   p_owner_name        text,   p_phone             text,   p_email             text,   p_city              text,   p_address           text,   p_subscription_plan text,   p_internal_notes    text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 77.

## 20260101000004_trial_limits.sql

[supabase/migrations/20260101000004_trial_limits.sql](<../../supabase/migrations/20260101000004_trial_limits.sql>)


```sql
CREATE OR REPLACE FUNCTION check_menu_items_trial_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_plan TEXT;
  v_count INTEGER;
BEGIN
  
  SELECT subscription_plan INTO v_plan
  FROM public.restaurants
  WHERE id = NEW.restaurant_id;

  
  IF v_plan = 'free_trial' THEN
    
    SELECT COUNT(*) INTO v_count
    FROM public.menu_items
    WHERE restaurant_id = NEW.restaurant_id;

    IF v_count >= 30 THEN
      RAISE EXCEPTION 'Límite de platos excedido. El plan de prueba gratuito está limitado a un máximo de 30 platos. Por favor, actualiza tu plan en Configuración para agregar más platos.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```


```sql
DROP TRIGGER IF EXISTS trg_check_menu_items_trial_limit ON public.menu_items;
```


```sql
CREATE TRIGGER trg_check_menu_items_trial_limit
BEFORE INSERT ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION check_menu_items_trial_limit();
```


## 20260101000005_trial_30_days.sql

[supabase/migrations/20260101000005_trial_30_days.sql](<../../supabase/migrations/20260101000005_trial_30_days.sql>)

- Función `public.admin_create_restaurant`; firma `p_request_id UUID,   p_restaurant_name TEXT,   p_slug TEXT,   p_owner_name TEXT,   p_phone TEXT,   p_email TEXT,   p_city TEXT,   p_address TEXT,   p_subscription_plan TEXT,   p_password_hash TEXT,   p_internal_notes TEXT`; retorno/cualificadores `TABLE (   restaurant_id UUID,   user_id UUID,   success BOOLEAN,   message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 1.
- Función `public.admin_create_restaurant_v2`; firma `p_request_id        uuid,   p_restaurant_name   text,   p_slug              text,   p_owner_name        text,   p_phone             text,   p_email             text,   p_city              text,   p_address           text,   p_subscription_plan text,   p_internal_notes    text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 59.
- Función `public.auto_approve_registration_v2`; firma `p_request_id        uuid,   p_plan              text,   p_payment_provider  text,   p_transaction_id    text,   p_amount            numeric`; retorno/cualificadores `TABLE(restaurant_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 115.

## 20260101000006_trial_15_days.sql

[supabase/migrations/20260101000006_trial_15_days.sql](<../../supabase/migrations/20260101000006_trial_15_days.sql>)


```sql
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
```

- Función `public.admin_create_restaurant`; firma `p_request_id UUID,   p_restaurant_name TEXT,   p_slug TEXT,   p_owner_name TEXT,   p_phone TEXT,   p_email TEXT,   p_city TEXT,   p_address TEXT,   p_subscription_plan TEXT,   p_password_hash TEXT,   p_internal_notes TEXT`; retorno/cualificadores `TABLE (   restaurant_id UUID,   user_id UUID,   success BOOLEAN,   message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 16.
- Función `public.admin_create_restaurant_v2`; firma `p_request_id        uuid,   p_restaurant_name   text,   p_slug              text,   p_owner_name        text,   p_phone             text,   p_email             text,   p_city              text,   p_address           text,   p_subscription_plan text,   p_internal_notes    text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 70.
- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan       text`; retorno/cualificadores `TABLE(restaurant_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 131.

```sql
DROP POLICY IF EXISTS "Public can view active restaurants" ON public.restaurants;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners can view their restaurant" ON public.restaurants;
```


```sql
DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;
```


```sql
CREATE POLICY restaurants_owner_select ON public.restaurants
  FOR SELECT USING (
    public.is_my_restaurant(id)
    OR (is_active = TRUE AND status IN ('active', 'trial'))
  );
```


```sql
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
```


```sql
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = orders.restaurant_id
        AND r.is_active = true
        AND r.status IN ('active', 'trial')
    )
  );
```


```sql
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
```


```sql
CREATE POLICY "Public can view orders" ON public.orders
  FOR SELECT TO anon
  USING (true);
```


## 20260101000007_multi_restaurant.sql

[supabase/migrations/20260101000007_multi_restaurant.sql](<../../supabase/migrations/20260101000007_multi_restaurant.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.profile_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, restaurant_id)
);
```


```sql
CREATE INDEX idx_pr_profile ON public.profile_restaurants(profile_id);
```


```sql
CREATE INDEX idx_pr_restaurant ON public.profile_restaurants(restaurant_id);
```

- Función `public.check_max_restaurants`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql`. Fuente línea 12.

```sql
DROP TRIGGER IF EXISTS enforce_max_restaurants ON public.profile_restaurants;
```


```sql
CREATE TRIGGER enforce_max_restaurants
  BEFORE INSERT ON public.profile_restaurants
  FOR EACH ROW EXECUTE FUNCTION public.check_max_restaurants();
```


```sql
COMMENT ON FUNCTION public.check_max_restaurants() IS
  'Limita a 5 restaurantes máximo por usuario. Cambiar el 5 aquí para modificar el límite.';
```


```sql
ALTER TABLE public.profile_restaurants ENABLE ROW LEVEL SECURITY;
```


```sql
CREATE POLICY "Users see own associations" ON public.profile_restaurants
  FOR ALL USING (profile_id = auth.uid());
```

- Función `public.is_my_restaurant`; firma `p_restaurant_id uuid`; retorno/cualificadores `boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Fuente línea 54.

## 20260101000008_create_branch_rpc.sql

[supabase/migrations/20260101000008_create_branch_rpc.sql](<../../supabase/migrations/20260101000008_create_branch_rpc.sql>)

- Función `public.create_restaurant_branch`; firma `p_name text,   p_email text,   p_phone text,   p_city text,   p_address text,   p_restaurant_type text,   p_subscription_plan text,   p_status text,   p_is_active boolean`; retorno/cualificadores `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 1.

## 20260101000009_multi_restaurant_insert.sql

[supabase/migrations/20260101000009_multi_restaurant_insert.sql](<../../supabase/migrations/20260101000009_multi_restaurant_insert.sql>)


```sql
DROP POLICY IF EXISTS restaurants_authenticated_insert ON public.restaurants;
```


```sql
CREATE POLICY restaurants_authenticated_insert ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

- Función `public.create_restaurant_branch`; firma `p_name text,   p_email text,   p_phone text,   p_city text DEFAULT NULL,   p_address text DEFAULT NULL,   p_restaurant_type text DEFAULT NULL`; retorno/cualificadores `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 8.

```sql
DROP POLICY IF EXISTS "Users see own associations" ON public.profile_restaurants;
```


```sql
CREATE POLICY "Users see own associations" ON public.profile_restaurants 
  FOR SELECT TO authenticated USING (profile_id = auth.uid());
```

- Función `public.handle_new_user`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 150.
- Función `public.consume_invitation`; firma `p_token text`; retorno/cualificadores `TABLE(restaurant_id uuid, email text, success boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 175.

## 20260101000010_set_pro_plan.sql

[supabase/migrations/20260101000010_set_pro_plan.sql](<../../supabase/migrations/20260101000010_set_pro_plan.sql>)


## 20260101000011_customers.sql

[supabase/migrations/20260101000011_customers.sql](<../../supabase/migrations/20260101000011_customers.sql>)


```sql
CREATE TABLE IF NOT EXISTS restaurant_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, phone)
);
```


```sql
ALTER TABLE restaurant_customers ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Restaurant staff can manage customers" ON restaurant_customers;
```


```sql
CREATE POLICY "Restaurant staff can manage customers" ON restaurant_customers
  FOR ALL USING (public.is_my_restaurant(restaurant_id)) WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES restaurant_customers(id) ON DELETE SET NULL;
```


## 20260622000001_p0_1_p0_3_p0_7_rls_orders_rpcs_admin.sql

[supabase/migrations/20260622000001_p0_1_p0_3_p0_7_rls_orders_rpcs_admin.sql](<../../supabase/migrations/20260622000001_p0_1_p0_3_p0_7_rls_orders_rpcs_admin.sql>)


```sql
DROP POLICY IF EXISTS dsr_insert_any ON public.data_subject_requests;
```


```sql
CREATE POLICY dsr_insert_any ON public.data_subject_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
```


```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS access_token uuid;
```


```sql
ALTER TABLE public.orders ALTER COLUMN access_token SET DEFAULT gen_random_uuid();
```


```sql
ALTER TABLE public.orders ALTER COLUMN access_token SET NOT NULL;
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_access_token
  ON public.orders(access_token)
  WHERE access_token IS NOT NULL;
```

- Función `public.get_my_order`; firma `p_token uuid`; retorno/cualificadores `public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 39.

```sql
GRANT EXECUTE ON FUNCTION public.get_my_order(uuid) TO anon, authenticated;
```


```sql
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
```


```sql
DO $$
BEGIN
  IF to_regprocedure('public.admin_login(text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_login(text,text) FROM anon, authenticated';
  END IF;
  IF to_regprocedure('public.admin_create_restaurant()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_create_restaurant() FROM anon, authenticated';
  END IF;
  IF to_regprocedure('public.admin_toggle_restaurant_status(uuid,boolean,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_toggle_restaurant_status(uuid,boolean,text) FROM anon, authenticated';
  END IF;
  IF to_regprocedure('public.admin_reject_request(uuid,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_reject_request(uuid,text) FROM anon, authenticated';
  END IF;
END $$;
```


## 20260622000002_p0_2_auto_approve_registration_v2_is_admin.sql

[supabase/migrations/20260622000002_p0_2_auto_approve_registration_v2_is_admin.sql](<../../supabase/migrations/20260622000002_p0_2_auto_approve_registration_v2_is_admin.sql>)


```sql
DROP FUNCTION IF EXISTS public.auto_approve_registration_v2(uuid, text, text, text, numeric);
```

- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan text DEFAULT 'free_trial',   p_payment_provider text DEFAULT 'trial',   p_transaction_id text DEFAULT NULL,   p_amount numeric DEFAULT 0`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 28.

```sql
GRANT EXECUTE ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
  TO anon, authenticated;
```


## 20260622000003_p0_3_feature_flags.sql

[supabase/migrations/20260622000003_p0_3_feature_flags.sql](<../../supabase/migrations/20260622000003_p0_3_feature_flags.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  description text NOT NULL,
  enabled_globally boolean NOT NULL DEFAULT false,
  enabled_for_restaurants uuid[] NOT NULL DEFAULT '{}',
  disabled_for_restaurants uuid[] NOT NULL DEFAULT '{}',
  rollout_percentage int NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Anyone can read flags" ON public.feature_flags;
```


```sql
CREATE POLICY "Anyone can read flags" ON public.feature_flags
  FOR SELECT TO anon, authenticated USING (true);
```


```sql
DROP POLICY IF EXISTS "Only admin can write flags" ON public.feature_flags;
```


```sql
CREATE POLICY "Only admin can write flags" ON public.feature_flags
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
```

- Función `public.is_flag_enabled`; firma `p_key text,   p_restaurant_id uuid DEFAULT NULL`; retorno/cualificadores `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 30.

```sql
GRANT EXECUTE ON FUNCTION public.is_flag_enabled(text, uuid) TO anon, authenticated;
```


## 20260622000004_p0_8_validate_image_urls.sql

[supabase/migrations/20260622000004_p0_8_validate_image_urls.sql](<../../supabase/migrations/20260622000004_p0_8_validate_image_urls.sql>)


```sql
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_image_urls_size;
```


```sql
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_image_urls_size
  CHECK (octet_length(image_urls::text) < 5000);
```

- Función `public.validate_image_urls`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql`. Fuente línea 14.

```sql
DROP TRIGGER IF EXISTS trg_validate_image_urls ON public.menu_items;
```


```sql
CREATE TRIGGER trg_validate_image_urls
  BEFORE INSERT OR UPDATE OF image_urls ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_image_urls();
```


## 20260622000005_p0_4_revoke_legacy_login.sql

[supabase/migrations/20260622000005_p0_4_revoke_legacy_login.sql](<../../supabase/migrations/20260622000005_p0_4_revoke_legacy_login.sql>)


```sql
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS migrated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deprecated_at timestamptz;
```


```sql
DO $$
DECLARE
  v_total int;
  v_pending int;
  v_pct numeric;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE migrated_at IS NULL)
    INTO v_total, v_pending
    FROM public.admin_users;

  IF v_total = 0 THEN
    RAISE NOTICE 'admin_users vacía — procediendo con REVOKE (sin riesgo)';
  ELSE
    v_pct := (v_pending::numeric / v_total::numeric) * 100;
    IF v_pct > 5 THEN
      RAISE EXCEPTION 'ABORT: %.1%% de admin_users sin migrar (% de %). Migrar al menos al 95%% antes de ejecutar',
        v_pct, v_pending, v_total;
    END IF;
  END IF;
END $$;
```


```sql
DO $$
BEGIN
  IF to_regprocedure('public.admin_login(text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.admin_login(text,text) FROM anon, authenticated';
  END IF;
  IF to_regprocedure('public.restaurant_login(text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.restaurant_login(text,text) FROM anon, authenticated';
  END IF;
END $$;
```


## 20260622000006_p0_8_create_bucket_menu_images.sql

[supabase/migrations/20260622000006_p0_8_create_bucket_menu_images.sql](<../../supabase/migrations/20260622000006_p0_8_create_bucket_menu_images.sql>)


```sql
DROP POLICY IF EXISTS "Owners can upload menu images" ON storage.objects;
```


```sql
CREATE POLICY "Owners can upload menu images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_my_restaurant(
      (storage.foldername(name))[1]::uuid
    )
  );
```


```sql
DROP POLICY IF EXISTS "Owners can read menu images" ON storage.objects;
```


```sql
CREATE POLICY "Owners can read menu images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_my_restaurant(
      (storage.foldername(name))[1]::uuid
    )
  );
```


```sql
DROP POLICY IF EXISTS "Owners can delete menu images" ON storage.objects;
```


```sql
CREATE POLICY "Owners can delete menu images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_my_restaurant(
      (storage.foldername(name))[1]::uuid
    )
  );
```


```sql
DROP POLICY IF EXISTS "Anon can read via signed URL" ON storage.objects;
```


```sql
CREATE POLICY "Anon can read via signed URL" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'menu-images');
```


## 20260622000007_p1_8_fix_race_condition_order_number.sql

[supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql](<../../supabase/migrations/20260622000007_p1_8_fix_race_condition_order_number.sql>)


```sql
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  START WITH 1000
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;
```


```sql
DO $$
DECLARE
  v_max int;
BEGIN
  SELECT COALESCE(MAX(substring(order_number from '\d+')::integer), 999) INTO v_max FROM public.orders;
  PERFORM setval('public.order_number_seq', GREATEST(v_max, 999));
  RAISE NOTICE 'order_number_seq set to %', GREATEST(v_max, 999);
END $$;
```

- Función `public.generate_order_number_atomic`; firma ``; retorno/cualificadores `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 25.

```sql
GRANT EXECUTE ON FUNCTION public.generate_order_number_atomic() TO anon, authenticated;
```

- Función `public.set_order_number`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql`. Fuente línea 42.

```sql
DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
```


```sql
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();
```


## 20260622000008_p1_5_audit_log_admin_actions.sql

[supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql](<../../supabase/migrations/20260622000008_p1_5_audit_log_admin_actions.sql>)

- Función `public.log_admin_action`; firma `p_action text,   p_target_type text DEFAULT NULL,   p_target_id uuid DEFAULT NULL,   p_before jsonb DEFAULT NULL,   p_after jsonb DEFAULT NULL`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 7.

```sql
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) TO authenticated;
```

- Función `public.admin_toggle_restaurant_status`; firma `p_restaurant_id uuid,   p_is_active boolean,   p_block_reason text DEFAULT NULL`; retorno/cualificadores `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 54.
- Función `public.admin_reject_request`; firma `p_request_id uuid,   p_rejection_reason text`; retorno/cualificadores `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 94.

```sql
GRANT EXECUTE ON FUNCTION public.admin_toggle_restaurant_status(uuid, boolean, text) TO authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.admin_reject_request(uuid, text) TO authenticated;
```


## 20260622000009_p1_1_rpc_create_order_server_side.sql

[supabase/migrations/20260622000009_p1_1_rpc_create_order_server_side.sql](<../../supabase/migrations/20260622000009_p1_1_rpc_create_order_server_side.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,     p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 16.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


## 20260622000010_p1_9_reports_rpcs.sql

[supabase/migrations/20260622000010_p1_9_reports_rpcs.sql](<../../supabase/migrations/20260622000010_p1_9_reports_rpcs.sql>)

- Función `public.get_daily_sales`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   day date,   total numeric,   order_count int,   avg_ticket numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 7.

```sql
GRANT EXECUTE ON FUNCTION public.get_daily_sales(uuid, date, date) TO authenticated;
```

- Función `public.get_top_items`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE,   p_limit int DEFAULT 20`; retorno/cualificadores `TABLE (   menu_item_id uuid,   name text,   total_sold int,   revenue numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 41.

```sql
GRANT EXECUTE ON FUNCTION public.get_top_items(uuid, date, date, int) TO authenticated;
```

- Función `public.get_avg_ticket`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   avg_ticket numeric,   min_ticket numeric,   max_ticket numeric,   total_orders int ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 78.

```sql
GRANT EXECUTE ON FUNCTION public.get_avg_ticket(uuid, date, date) TO authenticated;
```

- Función `public.get_sales_by_hour`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   hour_of_day int,   total numeric,   order_count int ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 110.

```sql
GRANT EXECUTE ON FUNCTION public.get_sales_by_hour(uuid, date, date) TO authenticated;
```

- Función `public.get_sales_by_order_type`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   order_type text,   total numeric,   order_count int,   percentage numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 142.

```sql
GRANT EXECUTE ON FUNCTION public.get_sales_by_order_type(uuid, date, date) TO authenticated;
```

- Función `public.get_reports_summary`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 187.

```sql
GRANT EXECUTE ON FUNCTION public.get_reports_summary(uuid, date, date) TO authenticated;
```


## 20260622000011_p1_11_partition_orders.sql

[supabase/migrations/20260622000011_p1_11_partition_orders.sql](<../../supabase/migrations/20260622000011_p1_11_partition_orders.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.orders_new (
  LIKE public.orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING STORAGE INCLUDING COMMENTS
) PARTITION BY RANGE (created_at);
```


```sql
DO $$
DECLARE
  v_start date := DATE '2025-01-01';
  v_end date := DATE '2026-12-31';
  v_month_start date := v_start;
  v_month_end date;
  v_partition_name text;
BEGIN
  WHILE v_month_start <= v_end LOOP
    v_month_end := (v_month_start + INTERVAL '1 month')::date;
    v_partition_name := 'orders_' || to_char(v_month_start, 'YYYY_MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.orders_new
       FOR VALUES FROM (%L) TO (%L)',
      v_partition_name, v_month_start, v_month_end
    );

    v_month_start := v_month_end;
  END LOOP;

  RAISE NOTICE 'Particiones creadas desde % hasta %', v_start, v_end;
END $$;
```


```sql
DO $$
DECLARE
  v_total int;
  v_batch_size int := 10000;
  v_offset int := 0;
  v_inserted int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.orders;
  RAISE NOTICE 'Migrando % pedidos...', v_total;

  LOOP
    INSERT INTO public.orders_new
    SELECT * FROM public.orders
    ORDER BY created_at
    LIMIT v_batch_size
    OFFSET v_offset;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    EXIT WHEN v_inserted = 0;

    v_offset := v_offset + v_batch_size;
    RAISE NOTICE 'Migrados % / %', v_offset, v_total;

    
    
    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE NOTICE 'Migración completada';
END $$;
```


```sql
DO $$
DECLARE
  v_old int;
  v_new int;
BEGIN
  SELECT COUNT(*) INTO v_old FROM public.orders;
  SELECT COUNT(*) INTO v_new FROM public.orders_new;

  IF v_old != v_new THEN
    RAISE EXCEPTION 'MIGRACIÓN INCOMPLETA: orders=%, orders_new=%', v_old, v_new;
  END IF;

  RAISE NOTICE 'Verificación OK: % pedidos migrados', v_new;
END $$;
```


```sql
ALTER TABLE public.orders RENAME TO orders_old;
```


```sql
ALTER TABLE public.orders_new RENAME TO orders;
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created
  ON public.orders (restaurant_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_access_token
  ON public.orders (access_token) WHERE access_token IS NOT NULL;
```


```sql
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
```


```sql
COMMENT ON TABLE public.orders_old IS 'DEPRECATED — reemplazada por orders (particionada). DROP después de 2026-06-29';
```


## 20260622000012_p1_7_payment_intents.sql

[supabase/migrations/20260622000012_p1_7_payment_intents.sql](<../../supabase/migrations/20260622000012_p1_7_payment_intents.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_request_id uuid REFERENCES public.registration_requests(id),
  buy_order text UNIQUE NOT NULL,
  session_id text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  plan text NOT NULL CHECK (plan IN ('starter', 'pro')),
  webpay_token text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'rejected', 'cancelled', 'refunded')),
  provider text NOT NULL DEFAULT 'webpay',
  webpay_response jsonb,
  authorized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
```


```sql
CREATE POLICY "Admin can read payment_intents" ON public.payment_intents
  FOR SELECT TO authenticated USING (public.is_admin());
```


```sql
CREATE POLICY "Anon can insert payment_intents" ON public.payment_intents
  FOR INSERT TO anon WITH CHECK (true);
```


```sql
CREATE INDEX idx_payment_intents_buy_order ON public.payment_intents(buy_order);
```


```sql
CREATE INDEX idx_payment_intents_request ON public.payment_intents(registration_request_id);
```


```sql
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);
```


## 20260622000013_p1_2_rate_limits.sql

[supabase/migrations/20260622000013_p1_2_rate_limits.sql](<../../supabase/migrations/20260622000013_p1_2_rate_limits.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,  
  identifier_type text NOT NULL CHECK (identifier_type IN ('ip', 'email')),
  endpoint text NOT NULL,    
  count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits (identifier, endpoint, window_start);
```


```sql
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
```


```sql
CREATE POLICY "Anon can insert rate_limits" ON public.rate_limits
  FOR INSERT TO anon, authenticated WITH CHECK (true);
```

- Función `public.check_rate_limit`; firma `p_identifier text,   p_identifier_type text,   p_endpoint text,   p_max_attempts int DEFAULT 5,   p_window_minutes int DEFAULT 60`; retorno/cualificadores `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 25.

```sql
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, int, int) TO anon, authenticated;
```


## 20260622000014_p2_14_fix_dsr_select_policy.sql

[supabase/migrations/20260622000014_p2_14_fix_dsr_select_policy.sql](<../../supabase/migrations/20260622000014_p2_14_fix_dsr_select_policy.sql>)


```sql
DROP POLICY IF EXISTS dsr_select_self ON public.data_subject_requests;
```


```sql
CREATE POLICY dsr_select_self ON public.data_subject_requests
  FOR SELECT USING (
    subject_id = auth.uid()
    OR subject_email = coalesce(auth.jwt() ->> 'email', '')
  );
```


## 20260622000015_p2_15_force_mfa_admins.sql

[supabase/migrations/20260622000015_p2_15_force_mfa_admins.sql](<../../supabase/migrations/20260622000015_p2_15_force_mfa_admins.sql>)


## 20260622000016_p2_16_enable_order_rpc_flags.sql

[supabase/migrations/20260622000016_p2_16_enable_order_rpc_flags.sql](<../../supabase/migrations/20260622000016_p2_16_enable_order_rpc_flags.sql>)


```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.get_my_order(uuid) TO anon, authenticated;
```


## 20260622000017_p2_17_fix_create_order_tax_rate.sql

[supabase/migrations/20260622000017_p2_17_fix_create_order_tax_rate.sql](<../../supabase/migrations/20260622000017_p2_17_fix_create_order_tax_rate.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,     p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 7.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


## 20260622000018_p2_18_fix_create_order_columns.sql

[supabase/migrations/20260622000018_p2_18_fix_create_order_columns.sql](<../../supabase/migrations/20260622000018_p2_18_fix_create_order_columns.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,     p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 8.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


## 20260622000019_p2_19_fix_create_order_items_flat_array.sql

[supabase/migrations/20260622000019_p2_19_fix_create_order_items_flat_array.sql](<../../supabase/migrations/20260622000019_p2_19_fix_create_order_items_flat_array.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,     p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 12.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners and admins can manage orders" ON public.orders;
```


```sql
CREATE POLICY "Restaurant owners and admins can manage orders" ON public.orders
  FOR ALL TO public
  USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


## 20260623000000_p2_20_create_order_link_crm.sql

[supabase/migrations/20260623000000_p2_20_create_order_link_crm.sql](<../../supabase/migrations/20260623000000_p2_20_create_order_link_crm.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,     p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 8.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


## 20260624000000_admin_delete_restaurant.sql

[supabase/migrations/20260624000000_admin_delete_restaurant.sql](<../../supabase/migrations/20260624000000_admin_delete_restaurant.sql>)

- Función `public.log_admin_action`; firma `p_action text,   p_target_type text DEFAULT NULL,   p_target_id uuid DEFAULT NULL,   p_before jsonb DEFAULT NULL,   p_after jsonb DEFAULT NULL`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 1.

```sql
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb, jsonb) TO authenticated;
```

- Función `public.admin_delete_restaurant`; firma `p_restaurant_id uuid`; retorno/cualificadores `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 65.

```sql
GRANT EXECUTE ON FUNCTION public.admin_delete_restaurant(uuid) TO authenticated;
```


## 20260624000001_enable_realtime_orders.sql

[supabase/migrations/20260624000001_enable_realtime_orders.sql](<../../supabase/migrations/20260624000001_enable_realtime_orders.sql>)


```sql
DO $$
BEGIN
  
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
```


## 20260624000002_fix_orders_replica_identity.sql

[supabase/migrations/20260624000002_fix_orders_replica_identity.sql](<../../supabase/migrations/20260624000002_fix_orders_replica_identity.sql>)


```sql
DO $$
DECLARE
  r RECORD;
BEGIN
  
  ALTER TABLE public.orders REPLICA IDENTITY FULL;
  
  
  FOR r IN 
    SELECT inhrelid::regclass AS partition_name
    FROM pg_inherits
    WHERE inhparent = 'public.orders'::regclass
  LOOP
    EXECUTE format('ALTER TABLE %s REPLICA IDENTITY FULL', r.partition_name);
  END LOOP;
END $$;
```


## 20260624000003_fix_create_order_tax_inclusive.sql

[supabase/migrations/20260624000003_fix_create_order_tax_inclusive.sql](<../../supabase/migrations/20260624000003_fix_create_order_tax_inclusive.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,     p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 10.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


## 20260627000001_flow_integration_tables.sql

[supabase/migrations/20260627000001_flow_integration_tables.sql](<../../supabase/migrations/20260627000001_flow_integration_tables.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.flow_plans (
  id text PRIMARY KEY, 
  name text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  interval integer NOT NULL CHECK (interval IN (1, 2, 3, 4)), 
  interval_count integer NOT NULL DEFAULT 1,
  trial_period_days integer NOT NULL DEFAULT 0,
  days_until_due integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_plans ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Cualquiera puede ver los planes" ON public.flow_plans;
```


```sql
CREATE POLICY "Cualquiera puede ver los planes" ON public.flow_plans
  FOR SELECT USING (true);
```


```sql
DROP POLICY IF EXISTS "Solo admins pueden modificar planes" ON public.flow_plans;
```


```sql
CREATE POLICY "Solo admins pueden modificar planes" ON public.flow_plans
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
CREATE TABLE IF NOT EXISTS public.flow_customers (
  id text PRIMARY KEY, 
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  credit_card_type text,
  last4_card_digits text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_customers ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners y admins pueden gestionar sus clientes Flow" ON public.flow_customers;
```


```sql
CREATE POLICY "Restaurant owners y admins pueden gestionar sus clientes Flow" ON public.flow_customers
  FOR ALL TO authenticated 
  USING (public.is_my_restaurant(restaurant_id) OR public.is_admin()) 
  WITH CHECK (public.is_my_restaurant(restaurant_id) OR public.is_admin());
```


```sql
CREATE TABLE IF NOT EXISTS public.flow_subscriptions (
  id text PRIMARY KEY, 
  plan_id text REFERENCES public.flow_plans(id) ON DELETE RESTRICT NOT NULL,
  customer_id text REFERENCES public.flow_customers(id) ON DELETE CASCADE NOT NULL,
  status integer NOT NULL CHECK (status IN (0, 1, 2, 3, 4, 5)), 
  subscription_start timestamptz,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_subscriptions ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners y admins pueden ver/gestionar sus suscripciones" ON public.flow_subscriptions;
```


```sql
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
```


```sql
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS flow_customer_id text REFERENCES public.flow_customers(id) ON DELETE SET NULL;
```


```sql
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS flow_subscription_id text REFERENCES public.flow_subscriptions(id) ON DELETE SET NULL;
```


```sql
CREATE TABLE IF NOT EXISTS public.flow_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  subscription_id text REFERENCES public.flow_subscriptions(id) ON DELETE SET NULL,
  flow_order numeric UNIQUE NOT NULL,
  commerce_order text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status integer NOT NULL CHECK (status IN (1, 2, 3, 4)), 
  payment_method text,
  transaction_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_payments ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners y admins pueden ver sus pagos Flow" ON public.flow_payments;
```


```sql
CREATE POLICY "Restaurant owners y admins pueden ver sus pagos Flow" ON public.flow_payments
  FOR ALL TO authenticated
  USING (public.is_my_restaurant(restaurant_id) OR public.is_admin())
  WITH CHECK (public.is_my_restaurant(restaurant_id) OR public.is_admin());
```


```sql
CREATE TABLE IF NOT EXISTS public.flow_invoices (
  id text PRIMARY KEY, 
  subscription_id text REFERENCES public.flow_subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'CLP',
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_invoices ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners y admins pueden ver sus facturas Flow" ON public.flow_invoices;
```


```sql
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
```


```sql
CREATE TABLE IF NOT EXISTS public.flow_coupons (
  id text PRIMARY KEY, 
  name text NOT NULL,
  percent_off numeric,
  amount_off numeric,
  currency text,
  duration text NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_coupons ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede ver cupones" ON public.flow_coupons;
```


```sql
CREATE POLICY "Cualquier usuario autenticado puede ver cupones" ON public.flow_coupons
  FOR SELECT TO authenticated USING (true);
```


```sql
DROP POLICY IF EXISTS "Solo admins pueden modificar cupones" ON public.flow_coupons;
```


```sql
CREATE POLICY "Solo admins pueden modificar cupones" ON public.flow_coupons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
CREATE TABLE IF NOT EXISTS public.flow_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_token text UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.flow_webhook_events ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Solo admins pueden ver los eventos de webhook" ON public.flow_webhook_events;
```


```sql
CREATE POLICY "Solo admins pueden ver los eventos de webhook" ON public.flow_webhook_events
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
```


```sql
ALTER TABLE public.payment_intents DROP CONSTRAINT IF EXISTS payment_intents_provider_check;
```


```sql
ALTER TABLE public.payment_intents ADD CONSTRAINT payment_intents_provider_check CHECK (provider IN ('webpay', 'flow'));
```


```sql
ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS flow_order text;
```


```sql
ALTER TABLE public.payment_intents ADD COLUMN IF NOT EXISTS flow_token text;
```


```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```


```sql
DROP TRIGGER IF EXISTS update_flow_plans_updated_at ON public.flow_plans;
```


```sql
CREATE TRIGGER update_flow_plans_updated_at BEFORE UPDATE ON public.flow_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_flow_customers_updated_at ON public.flow_customers;
```


```sql
CREATE TRIGGER update_flow_customers_updated_at BEFORE UPDATE ON public.flow_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS update_flow_subscriptions_updated_at ON public.flow_subscriptions;
```


```sql
CREATE TRIGGER update_flow_subscriptions_updated_at BEFORE UPDATE ON public.flow_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_customers_restaurant ON public.flow_customers(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_subscriptions_customer ON public.flow_subscriptions(customer_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_payments_restaurant ON public.flow_payments(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_payments_flow_order ON public.flow_payments(flow_order);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_invoices_subscription ON public.flow_invoices(subscription_id);
```


## 20260628000001_fix_is_admin_webhook.sql

[supabase/migrations/20260628000001_fix_is_admin_webhook.sql](<../../supabase/migrations/20260628000001_fix_is_admin_webhook.sql>)

- Función `public.is_admin`; firma ``; retorno/cualificadores `boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`. Fuente línea 7.

## 20260628000002_fix_auto_approve_registration_v2_owner_email.sql

[supabase/migrations/20260628000002_fix_auto_approve_registration_v2_owner_email.sql](<../../supabase/migrations/20260628000002_fix_auto_approve_registration_v2_owner_email.sql>)

- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan text DEFAULT 'free_trial',   p_payment_provider text DEFAULT 'trial',   p_transaction_id text DEFAULT NULL,   p_amount numeric DEFAULT 0`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 6.

```sql
GRANT EXECUTE ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
  TO anon, authenticated;
```


## 20260629000001_create_order_crm_item_descriptions.sql

[supabase/migrations/20260629000001_create_order_crm_item_descriptions.sql](<../../supabase/migrations/20260629000001_create_order_crm_item_descriptions.sql>)

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,   p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 5.

```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon, authenticated;
```


## 20260629000003_realtime_orders_events_workaround.sql

[supabase/migrations/20260629000003_realtime_orders_events_workaround.sql](<../../supabase/migrations/20260629000003_realtime_orders_events_workaround.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.orders_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE')),
  order_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_events_restaurant
  ON public.orders_events (restaurant_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_events_order
  ON public.orders_events (order_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_events_cleanup
  ON public.orders_events (created_at);
```


```sql
ALTER TABLE public.orders_events ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners can read own order events" ON public.orders_events;
```


```sql
CREATE POLICY "Restaurant owners can read own order events" ON public.orders_events
  FOR SELECT TO authenticated
  USING (public.is_my_restaurant(restaurant_id) OR public.is_admin());
```


```sql
GRANT SELECT ON public.orders_events TO authenticated, anon;
```

- Función `public.notify_order_event`; firma ``; retorno/cualificadores `TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 44.

```sql
DROP TRIGGER IF EXISTS orders_realtime_mirror ON public.orders;
```


```sql
CREATE TRIGGER orders_realtime_mirror
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_event();
```


```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders_events;
  END IF;
END $$;
```


```sql
ALTER TABLE public.orders_events REPLICA IDENTITY FULL;
```


```sql
COMMENT ON TABLE public.orders_events IS
  'Tabla espejo para Realtime. Workaround al bug de Supabase con tablas particionadas. NO particionar esta tabla.';
```


```sql
COMMENT ON FUNCTION public.notify_order_event() IS
  'Trigger function que replica cambios de orders a orders_events para Realtime.';
```


## 20260710000001_inventory.sql

[supabase/migrations/20260710000001_inventory.sql](<../../supabase/migrations/20260710000001_inventory.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```


```sql
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  unit          text NOT NULL CHECK (unit IN ('kg','g','l','ml','unidad','porcion')),
  current_stock decimal(12,3) NOT NULL DEFAULT 0,
  min_stock     decimal(12,3) NOT NULL DEFAULT 0,
  cost_per_unit decimal(10,2) NOT NULL DEFAULT 0,
  category      text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, name)
);
```


```sql
CREATE TABLE IF NOT EXISTS public.recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id)
);
```


```sql
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id         uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_needed   decimal(10,3) NOT NULL CHECK (quantity_needed > 0),
  unit              text NOT NULL,
  UNIQUE(recipe_id, inventory_item_id)
);
```


```sql
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type     text NOT NULL CHECK (movement_type IN
                      ('purchase','sale_deduction','manual_adjustment','waste','return')),
  quantity          decimal(12,3) NOT NULL,
  reference_id      text,
  notes             text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON public.inventory_items(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory_items(restaurant_id)
  WHERE current_stock <= min_stock;
```


```sql
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON public.recipes(menu_item_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_movements_restaurant ON public.inventory_movements(restaurant_id, created_at DESC);
```


```sql
DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory_items;
```


```sql
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
DROP TRIGGER IF EXISTS trg_recipes_updated_at ON public.recipes;
```


```sql
CREATE TRIGGER trg_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages inventory_items" ON public.inventory_items;
```


```sql
CREATE POLICY "Owner manages inventory_items" ON public.inventory_items
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages recipes" ON public.recipes;
```


```sql
CREATE POLICY "Owner manages recipes" ON public.recipes
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages recipe_ingredients" ON public.recipe_ingredients;
```


```sql
CREATE POLICY "Owner manages recipe_ingredients" ON public.recipe_ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND public.is_my_restaurant(r.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND public.is_my_restaurant(r.restaurant_id)
    )
  );
```


```sql
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages inventory_movements" ON public.inventory_movements;
```


```sql
CREATE POLICY "Owner manages inventory_movements" ON public.inventory_movements
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```

- Función `public._deduct_inventory_for_order_internal`; firma `p_order_id uuid`; retorno/cualificadores `TABLE(item_processed int, items_without_recipe int) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 113.
- Función `public.deduct_inventory_for_order`; firma `p_order_id uuid`; retorno/cualificadores `TABLE(item_processed int, items_without_recipe int) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 187.

```sql
GRANT EXECUTE ON FUNCTION public.deduct_inventory_for_order(uuid) TO authenticated;
```

- Función `public.on_order_completed_deduct_inventory`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 207.

```sql
DROP TRIGGER IF EXISTS orders_completed_inventory ON public.orders;
```


```sql
CREATE TRIGGER orders_completed_inventory
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_completed_deduct_inventory();
```


## 20260710000002_waiters.sql

[supabase/migrations/20260710000002_waiters.sql](<../../supabase/migrations/20260710000002_waiters.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```


```sql
CREATE TABLE IF NOT EXISTS public.waiters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  pin_hash      text NOT NULL,            
  is_active     boolean NOT NULL DEFAULT true,
  photo_url     text,
  phone         text,
  email         text,
  role          text NOT NULL DEFAULT 'waiter' CHECK (role IN ('waiter','bartender','host','cashier')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE TABLE IF NOT EXISTS public.waiter_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiter_id     uuid NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  tables_served integer DEFAULT 0,
  orders_count  integer DEFAULT 0,
  total_sales   decimal(10,2) DEFAULT 0,
  total_tips    decimal(10,2) DEFAULT 0
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_waiters_restaurant ON public.waiters(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_waiter_sessions_active ON public.waiter_sessions(restaurant_id) WHERE ended_at IS NULL;
```


```sql
DROP TRIGGER IF EXISTS trg_waiters_updated_at ON public.waiters;
```


```sql
CREATE TRIGGER trg_waiters_updated_at BEFORE UPDATE ON public.waiters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages waiters" ON public.waiters;
```


```sql
CREATE POLICY "Owner manages waiters" ON public.waiters
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
ALTER TABLE public.waiter_sessions ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages waiter_sessions" ON public.waiter_sessions;
```


```sql
CREATE POLICY "Owner manages waiter_sessions" ON public.waiter_sessions
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
DROP FUNCTION IF EXISTS public.validate_waiter_pin(uuid, text);
```

- Función `public.validate_waiter_pin`; firma `p_restaurant_id uuid,   p_pin text`; retorno/cualificadores `TABLE(waiter_id uuid, waiter_name text, waiter_role text, session_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`. Fuente línea 65.

```sql
GRANT EXECUTE ON FUNCTION public.validate_waiter_pin(uuid,text) TO authenticated;
```

- Función `public.create_waiter`; firma `p_restaurant_id uuid, p_name text, p_pin text, p_role text DEFAULT 'waiter'`; retorno/cualificadores `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`. Fuente línea 92.

```sql
GRANT EXECUTE ON FUNCTION public.create_waiter(uuid,text,text,text) TO authenticated;
```

- Función `public.update_waiter`; firma `p_waiter_id uuid,   p_name text DEFAULT NULL,   p_pin text DEFAULT NULL,   p_role text DEFAULT NULL,   p_is_active boolean DEFAULT NULL`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`. Fuente línea 110.

```sql
GRANT EXECUTE ON FUNCTION public.update_waiter(uuid,text,text,text,boolean) TO authenticated;
```

- Función `public.end_waiter_session`; firma `p_session_id uuid`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 139.

```sql
GRANT EXECUTE ON FUNCTION public.end_waiter_session(uuid) TO authenticated;
```


```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waiter_name text;
```


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS pin_required boolean NOT NULL DEFAULT false;
```


## 20260710000003_tips.sql

[supabase/migrations/20260710000003_tips.sql](<../../supabase/migrations/20260710000003_tips.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.tips (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id      uuid,
  waiter_id     uuid REFERENCES public.waiters(id) ON DELETE SET NULL,
  amount        decimal(10,2) NOT NULL CHECK (amount >= 0),
  percentage    decimal(5,2),
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('cash','card','transfer','qr')),
  status        text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected','pending_payout','paid_out')),
  paid_out_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_tips_waiter ON public.tips(waiter_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_tips_restaurant ON public.tips(restaurant_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_tips_order ON public.tips(order_id);
```


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tips_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tips_default_pct decimal(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS tips_suggested_pcts decimal(5,2)[] NOT NULL DEFAULT ARRAY[10.00, 15.00, 20.00];
```


```sql
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages tips" ON public.tips;
```


```sql
CREATE POLICY "Owner manages tips" ON public.tips
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


## 20260710000004_split_bills.sql

[supabase/migrations/20260710000004_split_bills.sql](<../../supabase/migrations/20260710000004_split_bills.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.order_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  payment_number integer NOT NULL DEFAULT 1,
  amount        decimal(10,2) NOT NULL CHECK (amount > 0),
  tip_amount    decimal(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('cash','card','transfer','qr')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  transaction_id text,
  payer_label   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_order_payments_restaurant ON public.order_payments(restaurant_id);
```


```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_split boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_count integer NOT NULL DEFAULT 1;
```


```sql
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages order_payments" ON public.order_payments;
```


```sql
CREATE POLICY "Owner manages order_payments" ON public.order_payments
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```

- Función `public.can_close_split_order`; firma `p_order_id uuid`; retorno/cualificadores `boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 34.

```sql
GRANT EXECUTE ON FUNCTION public.can_close_split_order(uuid) TO authenticated;
```


## 20260710000007_cash_shifts.sql

[supabase/migrations/20260710000007_cash_shifts.sql](<../../supabase/migrations/20260710000007_cash_shifts.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```


```sql
CREATE TABLE IF NOT EXISTS public.cash_shifts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  opened_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at       timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  total_sales     decimal(10,2) NOT NULL DEFAULT 0,
  cash_sales      decimal(10,2) NOT NULL DEFAULT 0,
  card_sales      decimal(10,2) NOT NULL DEFAULT 0,
  transfer_sales  decimal(10,2) NOT NULL DEFAULT 0,
  qr_sales        decimal(10,2) NOT NULL DEFAULT 0,
  total_tips      decimal(10,2) NOT NULL DEFAULT 0,
  cash_tips       decimal(10,2) NOT NULL DEFAULT 0,
  card_tips       decimal(10,2) NOT NULL DEFAULT 0,
  opening_cash    decimal(10,2) NOT NULL DEFAULT 0,
  expected_cash   decimal(10,2) NOT NULL DEFAULT 0,
  actual_cash     decimal(10,2),
  cash_difference decimal(10,2),
  
  waiter_summary  jsonb NOT NULL DEFAULT '[]'::jsonb,
  orders_count    integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_cash_shifts_restaurant
  ON public.cash_shifts(restaurant_id, opened_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_cash_shifts_open
  ON public.cash_shifts(restaurant_id) WHERE status = 'open';
```


```sql
DROP TRIGGER IF EXISTS trg_cash_shifts_updated_at ON public.cash_shifts;
```


```sql
CREATE TRIGGER trg_cash_shifts_updated_at BEFORE UPDATE ON public.cash_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages cash_shifts" ON public.cash_shifts;
```


```sql
CREATE POLICY "Owner manages cash_shifts" ON public.cash_shifts
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```

- Función `public.open_cash_shift`; firma `p_restaurant_id uuid,   p_opening_cash  decimal DEFAULT 0,   p_notes         text DEFAULT NULL`; retorno/cualificadores `public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 65.

```sql
GRANT EXECUTE ON FUNCTION public.open_cash_shift(uuid, decimal, text) TO authenticated;
```

- Función `public.close_cash_shift`; firma `p_shift_id    uuid,   p_actual_cash decimal,   p_notes       text DEFAULT NULL`; retorno/cualificadores `public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 105.

```sql
GRANT EXECUTE ON FUNCTION public.close_cash_shift(uuid, decimal, text) TO authenticated;
```


## 20260710000008_notifications_usage.sql

[supabase/migrations/20260710000008_notifications_usage.sql](<../../supabase/migrations/20260710000008_notifications_usage.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN (
    'low_stock', 'order_new', 'order_completed', 'order_cancelled',
    'shift_opened', 'shift_closed', 'info'
  )),
  title           text NOT NULL,
  message         text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  is_read         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant
  ON public.notifications(restaurant_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(restaurant_id)
  WHERE is_read = false;
```


```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages notifications" ON public.notifications;
```


```sql
CREATE POLICY "Owner manages notifications" ON public.notifications
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```

- Función `public.mark_notifications_read`; firma `p_restaurant_id uuid`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 47.

```sql
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid) TO authenticated;
```

- Función `public.get_daily_sales`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   day date,   total numeric,   order_count int,   avg_ticket numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 63.
- Función `public.get_top_items`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE,   p_limit int DEFAULT 20`; retorno/cualificadores `TABLE (   menu_item_id uuid,   name text,   total_sold int,   revenue numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 103.
- Función `public.get_avg_ticket`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   avg_ticket numeric,   min_ticket numeric,   max_ticket numeric,   total_orders int ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 139.
- Función `public.get_sales_by_hour`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   hour_of_day int,   total numeric,   order_count int ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 170.
- Función `public.get_sales_by_order_type`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `TABLE (   order_type text,   total numeric,   order_count int,   percentage numeric ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 201.
- Función `public.get_reports_summary`; firma `p_restaurant_id uuid,   p_from date,   p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 245.

## 20260712000001_update_trial_to_30_days.sql

[supabase/migrations/20260712000001_update_trial_to_30_days.sql](<../../supabase/migrations/20260712000001_update_trial_to_30_days.sql>)

- Función `public.admin_create_restaurant`; firma `p_request_id UUID,   p_restaurant_name TEXT,   p_slug TEXT,   p_owner_name TEXT,   p_phone TEXT,   p_email TEXT,   p_city TEXT,   p_address TEXT,   p_subscription_plan TEXT,   p_password_hash TEXT,   p_internal_notes TEXT`; retorno/cualificadores `TABLE (   restaurant_id UUID,   user_id UUID,   success BOOLEAN,   message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 7.
- Función `public.admin_create_restaurant_v2`; firma `p_request_id        uuid,   p_restaurant_name   text,   p_slug              text,   p_owner_name        text,   p_phone             text,   p_email             text,   p_city              text,   p_address           text,   p_subscription_plan text,   p_internal_notes    text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 61.
- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan text DEFAULT 'free_trial',   p_payment_provider text DEFAULT 'trial',   p_transaction_id text DEFAULT NULL,   p_amount numeric DEFAULT 0`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 122.

## 20260713000001_qr_tables.sql

[supabase/migrations/20260713000001_qr_tables.sql](<../../supabase/migrations/20260713000001_qr_tables.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```


```sql
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number  text NOT NULL,
  qr_token      text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  capacity      integer DEFAULT 4,
  status        text NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','occupied','reserved','cleaning')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, table_number)
);
```


```sql
CREATE TABLE IF NOT EXISTS public.table_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id      uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'),
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','payment_pending','closed')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  closed_at     timestamptz,
  total_amount  decimal(10,2) NOT NULL DEFAULT 0,
  tip_amount    decimal(10,2) NOT NULL DEFAULT 0
);
```


```sql
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.restaurant_tables(restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_tables_active ON public.restaurant_tables(restaurant_id) WHERE is_active = true;
```


```sql
CREATE INDEX IF NOT EXISTS idx_table_sessions_active ON public.table_sessions(restaurant_id) WHERE status IN ('active','payment_pending');
```


```sql
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON public.table_sessions(table_id, started_at DESC);
```


```sql
DROP TRIGGER IF EXISTS trg_restaurant_tables_updated_at ON public.restaurant_tables;
```


```sql
CREATE TRIGGER trg_restaurant_tables_updated_at BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```


```sql
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages restaurant_tables" ON public.restaurant_tables;
```


```sql
CREATE POLICY "Owner manages restaurant_tables" ON public.restaurant_tables
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner manages table_sessions" ON public.table_sessions;
```


```sql
CREATE POLICY "Owner manages table_sessions" ON public.table_sessions
  FOR ALL USING (public.is_my_restaurant(restaurant_id))
  WITH CHECK (public.is_my_restaurant(restaurant_id));
```


```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_session_id uuid REFERENCES public.table_sessions(id) ON DELETE SET NULL;
```

- Función `public.get_table_by_token`; firma `p_qr_token text`; retorno/cualificadores `TABLE(id uuid, restaurant_id uuid, table_number text, capacity int, status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 87.

```sql
GRANT EXECUTE ON FUNCTION public.get_table_by_token(text) TO anon, authenticated;
```

- Función `public.start_table_session`; firma `p_table_id uuid`; retorno/cualificadores `TABLE(session_token text, session_id uuid, table_number text, restaurant_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 116.

```sql
GRANT EXECUTE ON FUNCTION public.start_table_session(uuid) TO anon, authenticated;
```

- Función `public.get_session_by_token`; firma `p_session_token text`; retorno/cualificadores `TABLE(   session_id uuid, restaurant_id uuid, table_id uuid, table_number text,   status text, started_at timestamptz, total_amount decimal, tip_amount decimal ) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 163.

```sql
GRANT EXECUTE ON FUNCTION public.get_session_by_token(text) TO anon, authenticated;
```

- Función `public.get_table_orders`; firma `p_session_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 188.

```sql
GRANT EXECUTE ON FUNCTION public.get_table_orders(text) TO anon, authenticated;
```

- Función `public._session_total_internal`; firma `p_session_id uuid`; retorno/cualificadores `decimal LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 220.
- Función `public.create_table_order`; firma `p_session_token text,   p_order_data jsonb`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 236.

```sql
GRANT EXECUTE ON FUNCTION public.create_table_order(text,jsonb) TO anon, authenticated;
```


## 20260713000002_complete_session_payment.sql

[supabase/migrations/20260713000002_complete_session_payment.sql](<../../supabase/migrations/20260713000002_complete_session_payment.sql>)

- Función `public.complete_session_payment`; firma `p_session_id uuid,   p_tip_amount numeric DEFAULT 0,   p_transaction_id text DEFAULT NULL`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 17.

```sql
REVOKE ALL ON FUNCTION public.complete_session_payment(uuid,numeric,text) FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.complete_session_payment(uuid,numeric,text) TO service_role;
```


## 20260713000003_kds.sql

[supabase/migrations/20260713000003_kds.sql](<../../supabase/migrations/20260713000003_kds.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS kitchen_pin_hash text,
  ADD COLUMN IF NOT EXISTS kitchen_token text;
```

- Función `public.kitchen_login`; firma `p_restaurant_id uuid, p_pin text`; retorno/cualificadores `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 21.

```sql
GRANT EXECUTE ON FUNCTION public.kitchen_login(uuid, text) TO anon, authenticated;
```

- Función `public.kds_get_orders`; firma `p_kitchen_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 50.

```sql
GRANT EXECUTE ON FUNCTION public.kds_get_orders(text) TO anon, authenticated;
```

- Función `public.kds_get_restaurant`; firma `p_kitchen_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 84.

```sql
GRANT EXECUTE ON FUNCTION public.kds_get_restaurant(text) TO anon, authenticated;
```


## 20260713000004_kds_set_pin.sql

[supabase/migrations/20260713000004_kds_set_pin.sql](<../../supabase/migrations/20260713000004_kds_set_pin.sql>)

- Función `public.set_kitchen_pin`; firma `p_restaurant_id uuid,   p_pin text`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`. Fuente línea 7.

```sql
GRANT EXECUTE ON FUNCTION public.set_kitchen_pin(uuid, text) TO authenticated;
```


## 20260714000001_table_waiter_assignment.sql

[supabase/migrations/20260714000001_table_waiter_assignment.sql](<../../supabase/migrations/20260714000001_table_waiter_assignment.sql>)


```sql
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS assigned_waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL;
```


```sql
CREATE INDEX IF NOT EXISTS idx_tables_assigned_waiter
  ON public.restaurant_tables(assigned_waiter_id)
  WHERE assigned_waiter_id IS NOT NULL;
```


## 20260714000002_cash_shift_responsible.sql

[supabase/migrations/20260714000002_cash_shift_responsible.sql](<../../supabase/migrations/20260714000002_cash_shift_responsible.sql>)


```sql
ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS responsible_waiter_id uuid
  REFERENCES public.waiters(id) ON DELETE SET NULL;
```


```sql
COMMENT ON COLUMN public.cash_shifts.responsible_waiter_id IS
  'Trabajador (waiter) responsable del turno de caja. Nullable por compatibilidad.';
```


```sql
DROP FUNCTION IF EXISTS public.open_cash_shift(uuid, decimal, text);
```

- Función `public.open_cash_shift`; firma `p_restaurant_id        uuid,   p_opening_cash         decimal DEFAULT 0,   p_notes                text DEFAULT NULL,   p_responsible_waiter_id uuid DEFAULT NULL`; retorno/cualificadores `public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 24.

```sql
GRANT EXECUTE ON FUNCTION public.open_cash_shift(uuid, decimal, text, uuid) TO authenticated;
```


## 20260728000001_update_trial_to_14_days.sql

[supabase/migrations/20260728000001_update_trial_to_14_days.sql](<../../supabase/migrations/20260728000001_update_trial_to_14_days.sql>)

- Función `public.admin_create_restaurant`; firma `p_request_id UUID,   p_restaurant_name TEXT,   p_slug TEXT,   p_owner_name TEXT,   p_phone TEXT,   p_email TEXT,   p_city TEXT,   p_address TEXT,   p_subscription_plan TEXT,   p_password_hash TEXT,   p_internal_notes TEXT`; retorno/cualificadores `TABLE (   restaurant_id UUID,   user_id UUID,   success BOOLEAN,   message TEXT ) LANGUAGE plpgsql SECURITY DEFINER`. Fuente línea 7.
- Función `public.admin_create_restaurant_v2`; firma `p_request_id        uuid,   p_restaurant_name   text,   p_slug              text,   p_owner_name        text,   p_phone             text,   p_email             text,   p_city              text,   p_address           text,   p_subscription_plan text,   p_internal_notes    text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 61.
- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan text DEFAULT 'free_trial',   p_payment_provider text DEFAULT 'trial',   p_transaction_id text DEFAULT NULL,   p_amount numeric DEFAULT 0`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 122.

## 20260803000001_normalize_paid_subscription_status.sql

[supabase/migrations/20260803000001_normalize_paid_subscription_status.sql](<../../supabase/migrations/20260803000001_normalize_paid_subscription_status.sql>)

- Función `public.normalize_paid_subscription_status`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SET search_path = public`. Fuente línea 16.

```sql
DROP TRIGGER IF EXISTS normalize_paid_subscription_status ON public.restaurants;
```


```sql
CREATE TRIGGER normalize_paid_subscription_status
BEFORE INSERT OR UPDATE OF subscription_plan, status ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.normalize_paid_subscription_status();
```


## 20260806000001_lifetime_plan.sql

[supabase/migrations/20260806000001_lifetime_plan.sql](<../../supabase/migrations/20260806000001_lifetime_plan.sql>)


```sql
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_subscription_plan_check;
```


```sql
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_subscription_plan_check
  CHECK (subscription_plan IN ('free_trial', 'starter', 'pro', 'enterprise', 'lifetime', 'test_plan'));
```


```sql
ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_plan_check;
```


```sql
ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_plan_check
  CHECK (plan IN ('starter', 'pro', 'lifetime', 'test_plan'));
```


```sql
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'consumed', 'cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz
);
```


```sql
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
```


```sql
CREATE INDEX IF NOT EXISTS invitations_pending_idx
  ON public.invitations (status, created_at);
```

- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan text DEFAULT 'free_trial',   p_payment_provider text DEFAULT 'trial',   p_transaction_id text DEFAULT NULL,   p_amount numeric DEFAULT 0`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 41.
- Función `public.normalize_paid_subscription_status`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql`. Fuente línea 148.

## 20260806000002_secure_owner_activation.sql

[supabase/migrations/20260806000002_secure_owner_activation.sql](<../../supabase/migrations/20260806000002_secure_owner_activation.sql>)

- Función `public.handle_new_user`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 1.
- Función `public.consume_invitation`; firma `p_token text`; retorno/cualificadores `TABLE(restaurant_id uuid, email text, success boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth`. Fuente línea 30.

```sql
REVOKE ALL ON FUNCTION public.consume_invitation(text) FROM PUBLIC, anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.consume_invitation(text) TO authenticated;
```


```sql
REVOKE ALL ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.auto_approve_registration_v2(uuid, text, text, text, numeric)
TO service_role;
```


## 20260806000003_revoke_public_sensitive_rpcs.sql

[supabase/migrations/20260806000003_revoke_public_sensitive_rpcs.sql](<../../supabase/migrations/20260806000003_revoke_public_sensitive_rpcs.sql>)


```sql
REVOKE ALL ON FUNCTION public.complete_session_payment(uuid, numeric, text)
FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.complete_session_payment(uuid, numeric, text)
TO service_role;
```


```sql
REVOKE ALL ON FUNCTION public.run_retention_sweep()
FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.run_retention_sweep()
TO service_role;
```


## 20260806000004_harden_flow_webhook_idempotency.sql

[supabase/migrations/20260806000004_harden_flow_webhook_idempotency.sql](<../../supabase/migrations/20260806000004_harden_flow_webhook_idempotency.sql>)


```sql
ALTER TABLE public.flow_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
```

- Función `public.claim_flow_webhook_event`; firma `p_flow_token text,   p_payload jsonb`; retorno/cualificadores `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 4.

```sql
REVOKE ALL ON FUNCTION public.claim_flow_webhook_event(text, jsonb)
FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.claim_flow_webhook_event(text, jsonb)
TO service_role;
```


## 20260807004547_revoke_legacy_security_definer_execution.sql

[supabase/migrations/20260807004547_revoke_legacy_security_definer_execution.sql](<../../supabase/migrations/20260807004547_revoke_legacy_security_definer_execution.sql>)


```sql
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_login(text,text)',
    'public.restaurant_login(text,text)',
    'public.rls_auto_enable()',
    'public.test_create_user(uuid,text,text)',
    'public.security_check_rls_status()',
    'public.security_check_security_definer()',
    'public.security_check_admin_users_grants()'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END;
$$;
```


```sql
GRANT EXECUTE ON FUNCTION public.security_check_rls_status() TO service_role;
```


```sql
GRANT EXECUTE ON FUNCTION public.security_check_security_definer() TO service_role;
```


```sql
GRANT EXECUTE ON FUNCTION public.security_check_admin_users_grants() TO service_role;
```


## 20260807005314_restrict_anonymous_privileged_rpcs.sql

[supabase/migrations/20260807005314_restrict_anonymous_privileged_rpcs.sql](<../../supabase/migrations/20260807005314_restrict_anonymous_privileged_rpcs.sql>)


```sql
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_create_restaurant_v2(uuid,text,text,text,text,text,text,text,text,text)',
    'public.admin_delete_restaurant(uuid)',
    'public.admin_invite_owner(uuid,text)',
    'public.admin_reject_request(uuid,text)',
    'public.admin_toggle_restaurant_status(uuid,boolean,text)',
    'public.can_close_split_order(uuid)',
    'public.close_cash_shift(uuid,numeric,text)',
    'public.create_restaurant_branch(text,text,text,text,text,text,text,text,boolean)',
    'public.create_waiter(uuid,text,text,text)',
    'public.deduct_inventory_for_order(uuid)',
    'public.end_waiter_session(uuid)',
    'public.get_avg_ticket(uuid,date,date)',
    'public.get_daily_sales(uuid,date,date)',
    'public.get_my_restaurant()',
    'public.get_reports_summary(uuid,date,date)',
    'public.get_sales_by_hour(uuid,date,date)',
    'public.get_sales_by_order_type(uuid,date,date)',
    'public.get_top_items(uuid,date,date,integer)',
    'public.is_flag_enabled(text,uuid)',
    'public.mark_notifications_read(uuid)',
    'public.open_cash_shift(uuid,numeric,text,uuid)',
    'public.set_kitchen_pin(uuid,text)',
    'public.update_waiter(uuid,text,text,text,boolean)',
    'public.validate_waiter_pin(uuid,text)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    END IF;
  END LOOP;
END;
$$;
```


```sql
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_create_restaurant(uuid,text,text,text,text,text,text,text,text,text,text)',
    'public._deduct_inventory_for_order_internal(uuid)',
    'public._session_total_internal(uuid)',
    'public.generate_order_number_atomic()',
    'public.get_orders_policies()',
    'public.log_admin_action(text,text,uuid,jsonb,jsonb)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    END IF;
  END LOOP;
END;
$$;
```


## 20260807005535_harden_public_order_validation_and_rate_limit.sql

[supabase/migrations/20260807005535_harden_public_order_validation_and_rate_limit.sql](<../../supabase/migrations/20260807005535_harden_public_order_validation_and_rate_limit.sql>)

- Función `public.validate_public_order_write`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 1.

```sql
REVOKE ALL ON FUNCTION public.validate_public_order_write() FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.validate_public_order_write() TO service_role;
```


```sql
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, text, integer, integer)
FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, text, integer, integer)
TO service_role;
```


```sql
DROP TRIGGER IF EXISTS trg_validate_public_order_write ON public.orders;
```


```sql
CREATE TRIGGER trg_validate_public_order_write
  BEFORE INSERT OR UPDATE OF subtotal, tax, total, items
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_public_order_write();
```


## 20260807005738_pin_function_search_paths.sql

[supabase/migrations/20260807005738_pin_function_search_paths.sql](<../../supabase/migrations/20260807005738_pin_function_search_paths.sql>)


```sql
DO $$
DECLARE
  signature text;
  target regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.admin_create_restaurant(uuid,text,text,text,text,text,text,text,text,text,text)',
    'public.admin_login(text,text)',
    'public.check_max_restaurants()',
    'public.generate_order_number()',
    'public.get_orders_policies()',
    'public.normalize_paid_subscription_status()',
    'public.restaurant_login(text,text)',
    'public.set_breach_updated_at()',
    'public.set_dsr_updated_at()',
    'public.set_order_number()',
    'public.update_updated_at_column()',
    'public.validate_image_urls()'
  ]
  LOOP
    target := to_regprocedure(signature);
    IF target IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', target);
    END IF;
  END LOOP;
END $$;
```


## 20260807010049_revoke_trigger_function_api_access.sql

[supabase/migrations/20260807010049_revoke_trigger_function_api_access.sql](<../../supabase/migrations/20260807010049_revoke_trigger_function_api_access.sql>)


```sql
DO $$
DECLARE
  function_name text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'public.handle_new_user()',
    'public.notify_order_event()',
    'public.on_order_completed_deduct_inventory()'
  ]
  LOOP
    IF to_regprocedure(function_name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', function_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_name);
    END IF;
  END LOOP;
END
$$;
```


## 20260807010340_add_active_foreign_key_indexes.sql

[supabase/migrations/20260807010340_add_active_foreign_key_indexes.sql](<../../supabase/migrations/20260807010340_add_active_foreign_key_indexes.sql>)


```sql
CREATE INDEX IF NOT EXISTS idx_breach_register_created_by ON public.breach_register (created_by);
```


```sql
CREATE INDEX IF NOT EXISTS idx_cash_shifts_closed_by ON public.cash_shifts (closed_by);
```


```sql
CREATE INDEX IF NOT EXISTS idx_cash_shifts_opened_by ON public.cash_shifts (opened_by);
```


```sql
CREATE INDEX IF NOT EXISTS idx_cash_shifts_responsible_waiter ON public.cash_shifts (responsible_waiter_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_cash_shifts_restaurant ON public.cash_shifts (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_dsr_fulfilled_by ON public.data_subject_requests (fulfilled_by);
```


```sql
CREATE INDEX IF NOT EXISTS idx_dsr_subject ON public.data_subject_requests (subject_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_payments_restaurant ON public.flow_payments (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_payments_subscription ON public.flow_payments (subscription_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_subscriptions_customer ON public.flow_subscriptions (customer_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_flow_subscriptions_plan ON public.flow_subscriptions (plan_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by ON public.inventory_movements (created_by);
```


```sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements (inventory_item_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_inventory_movements_restaurant ON public.inventory_movements (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_invitations_restaurant ON public.invitations (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items (category_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON public.notifications (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_table_session ON public.orders (table_session_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON public.orders (waiter_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients (recipe_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON public.recipes (menu_item_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON public.recipes (restaurant_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_restaurants_flow_customer ON public.restaurants (flow_customer_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_restaurants_flow_subscription ON public.restaurants (flow_subscription_id);
```


```sql
CREATE INDEX IF NOT EXISTS idx_restaurants_registration_request ON public.restaurants (registration_request_id);
```


```sql
DO $$
BEGIN
  IF to_regclass('public.subscriptions_payments') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_payments_registration ON public.subscriptions_payments (registration_request_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_subscriptions_payments_restaurant ON public.subscriptions_payments (restaurant_id)';
  END IF;
END $$;
```


## 20260807010507_resolve_duplicate_menu_index_and_recipe_fk.sql

[supabase/migrations/20260807010507_resolve_duplicate_menu_index_and_recipe_fk.sql](<../../supabase/migrations/20260807010507_resolve_duplicate_menu_index_and_recipe_fk.sql>)


```sql
DROP INDEX IF EXISTS public.idx_menu_items_restaurant;
```


```sql
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_item
  ON public.recipe_ingredients (inventory_item_id);
```


## 20260807010636_optimize_auth_rls_policy_initplans.sql

[supabase/migrations/20260807010636_optimize_auth_rls_policy_initplans.sql](<../../supabase/migrations/20260807010636_optimize_auth_rls_policy_initplans.sql>)


```sql
ALTER POLICY "Restaurant owners can update their restaurant" ON public.restaurants
  USING (
    (SELECT auth.uid())::text IN (
      SELECT users.id::text
      FROM public.users
      WHERE users.restaurant_id = restaurants.id
    )
  );
```


```sql
ALTER POLICY profiles_select_self ON public.profiles
  USING (id = (SELECT auth.uid()));
```


```sql
ALTER POLICY profiles_update_self ON public.profiles
  USING (id = (SELECT auth.uid()));
```


```sql
ALTER POLICY consents_select_self ON public.consents
  USING (subject_id = (SELECT auth.uid()));
```


```sql
ALTER POLICY consents_update_self ON public.consents
  USING (
    subject_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );
```


```sql
ALTER POLICY "Users can view own notifications" ON public.notifications
  USING (user_id = (SELECT auth.uid()));
```


```sql
ALTER POLICY "Users can update own notifications" ON public.notifications
  USING (user_id = (SELECT auth.uid()));
```


```sql
ALTER POLICY dsr_select_self ON public.data_subject_requests
  USING (
    subject_id = (SELECT auth.uid())
    OR subject_email = COALESCE((SELECT auth.jwt() ->> 'email'), '')
  );
```


```sql
ALTER POLICY "Users see own associations" ON public.profile_restaurants
  USING (profile_id = (SELECT auth.uid()));
```


## 20260807010730_fix_dsr_auth_jwt_initplan.sql

[supabase/migrations/20260807010730_fix_dsr_auth_jwt_initplan.sql](<../../supabase/migrations/20260807010730_fix_dsr_auth_jwt_initplan.sql>)


```sql
ALTER POLICY dsr_select_self ON public.data_subject_requests
  USING (
    subject_id = (SELECT auth.uid())
    OR subject_email = COALESCE(((SELECT auth.jwt()) ->> 'email'), '')
  );
```


## 20260807013000_repair_payment_integrity_and_sql_lint.sql

[supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql](<../../supabase/migrations/20260807013000_repair_payment_integrity_and_sql_lint.sql>)


```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
```

- Función `public.enforce_order_payment_integrity`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 13.

```sql
DROP TRIGGER IF EXISTS orders_payment_integrity ON public.orders;
```


```sql
CREATE TRIGGER orders_payment_integrity
  BEFORE INSERT OR UPDATE OF status, payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_payment_integrity();
```

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,   p_customer_name text DEFAULT NULL,   p_customer_phone text DEFAULT NULL,   p_customer_email text DEFAULT NULL,   p_order_type text DEFAULT 'qr',   p_table_number text DEFAULT NULL,   p_notes text DEFAULT NULL,   p_payment_method text DEFAULT 'qr'`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 43.
- Función `public.create_table_order`; firma `p_session_token text, p_order_data jsonb`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 193.

```sql
DROP FUNCTION IF EXISTS public.get_my_order(uuid);
```

- Función `public.get_my_order`; firma `p_token uuid`; retorno/cualificadores `public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 283.

```sql
REVOKE ALL ON FUNCTION public.get_my_order(uuid) FROM PUBLIC;
```


```sql
GRANT EXECUTE ON FUNCTION public.get_my_order(uuid) TO anon, authenticated;
```

- Función `public.get_reports_summary`; firma `p_restaurant_id uuid, p_from date, p_to date DEFAULT CURRENT_DATE`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 300.
- Función `public.consume_invitation`; firma `p_token text`; retorno/cualificadores `TABLE(restaurant_id uuid, email text, success boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth`. Fuente línea 326.
- Función `public.start_table_session`; firma `p_table_id uuid`; retorno/cualificadores `TABLE(session_token text, session_id uuid, table_number text, restaurant_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 353.
- Función `public.kds_get_restaurant`; firma `p_kitchen_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 377.

```sql
ALTER FUNCTION public.admin_create_restaurant_v2(uuid,text,text,text,text,text,text,text,text,text)
  SET search_path TO public, extensions;
```


```sql
ALTER FUNCTION public.kitchen_login(uuid,text) SET search_path TO public, extensions;
```

- Función `public._deduct_inventory_for_order_internal`; firma `p_order_id uuid`; retorno/cualificadores `TABLE(item_processed integer, items_without_recipe integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 393.
- Función `public.deduct_inventory_for_order`; firma `p_order_id uuid`; retorno/cualificadores `TABLE(item_processed integer, items_without_recipe integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 426.
- Función `public.end_waiter_session`; firma `p_session_id uuid`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 438.
- Función `public.update_waiter`; firma `p_waiter_id uuid, p_name text DEFAULT NULL, p_pin text DEFAULT NULL, p_role text DEFAULT NULL, p_is_active boolean DEFAULT NULL`; retorno/cualificadores `void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`. Fuente línea 450.
- Función `public.close_cash_shift`; firma `p_shift_id uuid, p_actual_cash numeric, p_notes text DEFAULT NULL`; retorno/cualificadores `public.cash_shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 465.

## 20260807014500_finish_sql_lint_and_table_tax.sql

[supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql](<../../supabase/migrations/20260807014500_finish_sql_lint_and_table_tax.sql>)

- Función `public.consume_invitation`; firma `p_token text`; retorno/cualificadores `TABLE(restaurant_id uuid, email text, success boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth`. Fuente línea 2.
- Función `public.create_table_order`; firma `p_session_token text, p_order_data jsonb`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 32.
- Función `public.complete_session_payment`; firma `p_session_id uuid,   p_tip_amount numeric DEFAULT 0,   p_transaction_id text DEFAULT NULL`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 119.

## 20260807015000_revoke_order_trigger_function_execution.sql

[supabase/migrations/20260807015000_revoke_order_trigger_function_execution.sql](<../../supabase/migrations/20260807015000_revoke_order_trigger_function_execution.sql>)


```sql
REVOKE ALL ON FUNCTION public.enforce_order_payment_integrity() FROM PUBLIC, anon, authenticated;
```


## 20260807020000_harden_public_kds_access.sql

[supabase/migrations/20260807020000_harden_public_kds_access.sql](<../../supabase/migrations/20260807020000_harden_public_kds_access.sql>)


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS kitchen_token_expires_at timestamptz;
```

- Función `public.kitchen_login`; firma `p_restaurant_id uuid,   p_pin text`; retorno/cualificadores `text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`. Fuente línea 12.
- Función `public.kds_get_orders`; firma `p_kitchen_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 64.
- Función `public.kds_get_restaurant`; firma `p_kitchen_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 106.

```sql
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
```


```sql
REVOKE ALL ON FUNCTION public.is_my_restaurant(uuid) FROM anon;
```


```sql
REVOKE ALL ON FUNCTION public.is_flag_enabled(text, uuid) FROM anon;
```


## 20260807020100_revoke_public_access_to_rls_helpers.sql

[supabase/migrations/20260807020100_revoke_public_access_to_rls_helpers.sql](<../../supabase/migrations/20260807020100_revoke_public_access_to_rls_helpers.sql>)


```sql
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
```


```sql
REVOKE ALL ON FUNCTION public.is_my_restaurant(uuid) FROM PUBLIC, anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.is_my_restaurant(uuid) TO authenticated;
```


## 20260807020200_grant_app_table_privileges.sql

[supabase/migrations/20260807020200_grant_app_table_privileges.sql](<../../supabase/migrations/20260807020200_grant_app_table_privileges.sql>)


```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
```


```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.cash_shifts,
  public.flow_customers,
  public.flow_invoices,
  public.flow_payments,
  public.inventory_items,
  public.inventory_movements,
  public.menu_categories,
  public.menu_items,
  public.notifications,
  public.order_payments,
  public.orders,
  public.profile_restaurants,
  public.profiles,
  public.recipe_ingredients,
  public.recipes,
  public.restaurant_customers,
  public.restaurant_tables,
  public.restaurants,
  public.table_sessions,
  public.tips,
  public.waiter_sessions,
  public.waiters
TO authenticated;
```


```sql
GRANT SELECT ON TABLE public.restaurants, public.menu_categories, public.menu_items TO anon;
```


```sql
GRANT INSERT ON TABLE public.orders, public.payment_intents, public.rate_limits,
  public.registration_requests TO anon;
```


## 20260807020300_scope_public_menu_policies.sql

[supabase/migrations/20260807020300_scope_public_menu_policies.sql](<../../supabase/migrations/20260807020300_scope_public_menu_policies.sql>)


```sql
ALTER POLICY restaurants_owner_select ON public.restaurants TO authenticated;
```


```sql
DROP POLICY IF EXISTS restaurants_public_menu_select ON public.restaurants;
```


```sql
CREATE POLICY restaurants_public_menu_select
  ON public.restaurants
  FOR SELECT
  TO anon
  USING (is_active = true AND status IN ('active', 'trial'));
```


```sql
ALTER POLICY "Restaurant owners and admins can manage menu categories"
  ON public.menu_categories TO authenticated;
```


```sql
ALTER POLICY "Restaurant owners and admins can manage menu items"
  ON public.menu_items TO authenticated;
```


## 20260807020400_enable_safe_public_order_rpc.sql

[supabase/migrations/20260807020400_enable_safe_public_order_rpc.sql](<../../supabase/migrations/20260807020400_enable_safe_public_order_rpc.sql>)


```sql
REVOKE INSERT ON TABLE public.orders FROM anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.is_flag_enabled(text, uuid) TO anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon;
```


## 20260828000000_audit_repair_missing_columns.sql

[supabase/migrations/20260828000000_audit_repair_missing_columns.sql](<../../supabase/migrations/20260828000000_audit_repair_missing_columns.sql>)


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP' CHECK (currency IN ('CLP', 'USD')),
  ADD COLUMN IF NOT EXISTS usd_exchange_rate NUMERIC DEFAULT 950,
  ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'es' CHECK (default_language IN ('es', 'en')),
  ADD COLUMN IF NOT EXISTS default_prep_time INTEGER DEFAULT 15;
```


## 20260828000001_audit_lock_sensitive_columns.sql

[supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql](<../../supabase/migrations/20260828000001_audit_lock_sensitive_columns.sql>)


```sql
REVOKE INSERT, DELETE, UPDATE ON TABLE public.profiles FROM anon, authenticated;
```


```sql
REVOKE SELECT ON TABLE public.profiles FROM anon;
```


```sql
GRANT UPDATE (display_name) ON TABLE public.profiles TO authenticated;
```


```sql
GRANT SELECT ON TABLE public.profiles TO authenticated;
```


```sql
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.restaurants FROM anon, authenticated;
```


```sql
GRANT SELECT (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  subscription_plan, status, is_active, trial_ends_at,
  created_at, updated_at, currency, usd_exchange_rate,
  default_language, default_prep_time, pin_required, tips_enabled,
  tips_default_pct, tips_suggested_pcts
) ON TABLE public.restaurants TO anon;
```


```sql
GRANT SELECT (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  subscription_plan, status, is_active, trial_ends_at,
  created_at, updated_at, currency, usd_exchange_rate,
  default_language, default_prep_time, pin_required, tips_enabled,
  tips_default_pct, tips_suggested_pcts, internal_notes, block_reason
) ON TABLE public.restaurants TO authenticated;
```


```sql
GRANT UPDATE (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  currency, usd_exchange_rate, default_language, default_prep_time,
  pin_required, tips_enabled, tips_default_pct, tips_suggested_pcts
) ON TABLE public.restaurants TO authenticated;
```


```sql
GRANT INSERT (
  id, registration_request_id, name, slug, owner_name, phone, email,
  city, address, restaurant_type, logo_url, qr_code_url,
  currency, usd_exchange_rate, default_language, default_prep_time,
  pin_required, tips_enabled, tips_default_pct, tips_suggested_pcts
) ON TABLE public.restaurants TO authenticated;
```


```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT
  ON TABLE public.payment_intents FROM anon, authenticated;
```


```sql
GRANT INSERT ON TABLE public.registration_requests TO anon, authenticated;
```


```sql
GRANT SELECT (id, email, status) ON TABLE public.registration_requests TO anon, authenticated;
```


## 20260828000002_audit_enforce_service_cutoff.sql

[supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql](<../../supabase/migrations/20260828000002_audit_enforce_service_cutoff.sql>)

- Función `public.validate_public_order_write`; firma ``; retorno/cualificadores `trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 14.

```sql
REVOKE ALL ON FUNCTION public.validate_public_order_write() FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.validate_public_order_write() TO service_role;
```

- Función `public.sweep_expired_trials`; firma ``; retorno/cualificadores `integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 102.

```sql
REVOKE ALL ON FUNCTION public.sweep_expired_trials() FROM PUBLIC, anon, authenticated;
```


```sql
GRANT EXECUTE ON FUNCTION public.sweep_expired_trials() TO service_role;
```


```sql
SELECT cron.schedule(
  'sweep-expired-trials',
  '0 4 * * *',
  $cron$ SELECT public.sweep_expired_trials(); $cron$
)
WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
```


## 20260828000003_audit_ai_usage_log.sql

[supabase/migrations/20260828000003_audit_ai_usage_log.sql](<../../supabase/migrations/20260828000003_audit_ai_usage_log.sql>)


```sql
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
```


```sql
REVOKE ALL ON TABLE public.ai_usage_log FROM anon, authenticated;
```


```sql
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_window
  ON public.ai_usage_log (user_id, created_at DESC);
```


## 20260828000004_audit_scope_restaurant_visibility.sql

[supabase/migrations/20260828000004_audit_scope_restaurant_visibility.sql](<../../supabase/migrations/20260828000004_audit_scope_restaurant_visibility.sql>)


```sql
DROP POLICY IF EXISTS restaurants_owner_select ON public.restaurants;
```


```sql
CREATE POLICY restaurants_owner_select ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (public.is_my_restaurant(id));
```


```sql
CREATE POLICY restaurants_admin_select ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
```

- Función `public.admin_list_restaurants`; firma ``; retorno/cualificadores `jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public`. Fuente línea 29.

```sql
REVOKE ALL ON FUNCTION public.admin_list_restaurants() FROM PUBLIC, anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.admin_list_restaurants() TO authenticated;
```


```sql
DROP POLICY IF EXISTS "Restaurant owners can update their restaurant" ON public.restaurants;
```


## 20260828000005_audit_kitchen_pin_status.sql

[supabase/migrations/20260828000005_audit_kitchen_pin_status.sql](<../../supabase/migrations/20260828000005_audit_kitchen_pin_status.sql>)

- Función `public.kitchen_pin_is_set`; firma `p_restaurant_id uuid`; retorno/cualificadores `boolean LANGUAGE sql SECURITY DEFINER SET search_path = public`. Fuente línea 9.

```sql
REVOKE ALL ON FUNCTION public.kitchen_pin_is_set(uuid) FROM PUBLIC, anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.kitchen_pin_is_set(uuid) TO authenticated;
```


## 20260828000006_audit_atomic_inventory_adjust.sql

[supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql](<../../supabase/migrations/20260828000006_audit_atomic_inventory_adjust.sql>)

- Función `public.adjust_inventory_stock`; firma `p_item_id uuid,   p_delta numeric,   p_movement_type text,   p_notes text DEFAULT NULL`; retorno/cualificadores `public.inventory_movements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 13.

```sql
REVOKE ALL ON FUNCTION public.adjust_inventory_stock(uuid, numeric, text, text)
FROM PUBLIC, anon;
```


```sql
GRANT EXECUTE ON FUNCTION public.adjust_inventory_stock(uuid, numeric, text, text)
TO authenticated;
```

- Función `public._deduct_inventory_for_order_internal`; firma `p_order_id uuid`; retorno/cualificadores `TABLE(item_processed integer, items_without_recipe integer) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public`. Fuente línea 81.

```sql
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_current_stock_nonnegative;
```


```sql
ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_current_stock_nonnegative CHECK (current_stock >= 0);
```


## 20260831000001_multi_country.sql

[supabase/migrations/20260831000001_multi_country.sql](<../../supabase/migrations/20260831000001_multi_country.sql>)


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CL';
```


```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.19;
```


```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.restaurants'::regclass
      AND conname = 'restaurants_country_check'
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_country_check
      CHECK (country IN ('CL', 'BR', 'BO', 'PE'));
  END IF;
END $$;
```


```sql
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_currency_check;
```


```sql
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_currency_check
  CHECK (currency IN ('CLP', 'USD', 'BRL', 'BOB', 'PEN'));
```


```sql
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_default_language_check;
```


```sql
ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_default_language_check
  CHECK (default_language IN ('es', 'en', 'pt'));
```


```sql
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CL';
```


```sql
GRANT SELECT (country, tax_rate) ON TABLE public.restaurants TO anon;
```


```sql
GRANT SELECT (country, tax_rate) ON TABLE public.restaurants TO authenticated;
```


```sql
GRANT UPDATE (country, tax_rate) ON TABLE public.restaurants TO authenticated;
```


```sql
GRANT INSERT (country, tax_rate) ON TABLE public.restaurants TO authenticated;
```

- Función `public.create_order`; firma `p_restaurant_id uuid,   p_items jsonb,   p_customer_name text DEFAULT NULL::text,   p_customer_phone text DEFAULT NULL::text,   p_customer_email text DEFAULT NULL::text,   p_order_type text DEFAULT 'qr'::text,   p_table_number text DEFAULT NULL::text,   p_notes text DEFAULT NULL::text,   p_payment_method text DEFAULT 'qr'::text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 86.
- Función `public.create_table_order`; firma `p_session_token text, p_order_data jsonb`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 243.

```sql
DROP FUNCTION IF EXISTS public.get_table_by_token(text);
```

- Función `public.get_table_by_token`; firma `p_qr_token text`; retorno/cualificadores `TABLE(   id uuid,   restaurant_id uuid,   table_number text,   capacity integer,   status text,   restaurant_currency text,   restaurant_country text,   restaurant_language text ) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 341.
- Función `public.auto_approve_registration_v2`; firma `p_request_id uuid,   p_plan text DEFAULT 'free_trial'::text,   p_payment_provider text DEFAULT 'trial'::text,   p_transaction_id text DEFAULT NULL::text,   p_amount numeric DEFAULT 0`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 378.
- Función `public.admin_create_restaurant_v2`; firma `p_request_id uuid,   p_restaurant_name text,   p_slug text,   p_owner_name text,   p_phone text,   p_email text,   p_city text,   p_address text,   p_subscription_plan text,   p_internal_notes text`; retorno/cualificadores `TABLE(restaurant_id uuid, invitation_id uuid, success boolean, message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'`. Fuente línea 507.
- Función `public.create_restaurant_branch`; firma `p_name text,   p_email text,   p_phone text,   p_city text,   p_address text,   p_restaurant_type text,   p_subscription_plan text,   p_status text,   p_is_active boolean`; retorno/cualificadores `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 599.
- Función `public.kds_get_restaurant`; firma `p_kitchen_token text`; retorno/cualificadores `jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 664.

## 20260901000001_phase2_multi_country.sql

[supabase/migrations/20260901000001_phase2_multi_country.sql](<../../supabase/migrations/20260901000001_phase2_multi_country.sql>)


```sql
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_pt TEXT;
```


```sql
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS description_pt TEXT;
```


```sql
GRANT SELECT (name_pt, description_pt), INSERT (name_pt, description_pt),
      UPDATE (name_pt, description_pt)
  ON TABLE public.menu_items TO anon;
```


```sql
GRANT SELECT (name_pt, description_pt), INSERT (name_pt, description_pt),
      UPDATE (name_pt, description_pt)
  ON TABLE public.menu_items TO authenticated;
```


```sql
ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_provider_check;
```


```sql
ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_provider_check
  CHECK (provider IN ('webpay', 'flow', 'mp'));
```


```sql
ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_plan_check;
```


```sql
ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_plan_check
  CHECK (plan IN ('starter', 'pro', 'lifetime', 'test_plan', 'table_order'));
```


## 20260902000001_audit_fixes.sql

[supabase/migrations/20260902000001_audit_fixes.sql](<../../supabase/migrations/20260902000001_audit_fixes.sql>)


```sql
ALTER TABLE public.registration_requests
  DROP CONSTRAINT IF EXISTS registration_requests_country_check;
```


```sql
ALTER TABLE public.registration_requests
  ADD CONSTRAINT registration_requests_country_check
  CHECK (country IN ('CL', 'BR', 'BO', 'PE'));
```

- Función `public.create_restaurant_branch`; firma `p_name text,   p_email text,   p_phone text,   p_city text,   p_address text,   p_restaurant_type text,   p_subscription_plan text,   p_status text,   p_is_active boolean`; retorno/cualificadores `uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`. Fuente línea 25.

## 20260905000001_accounting_module.sql

[supabase/migrations/20260905000001_accounting_module.sql](<../../supabase/migrations/20260905000001_accounting_module.sql>)


```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```


```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
```


```sql
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
```


```sql
CREATE TABLE IF NOT EXISTS public.accounting_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id            uuid, 
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
```


```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounting_docs_ext_ref
  ON public.accounting_documents (restaurant_id, external_reference);
```


```sql
CREATE INDEX IF NOT EXISTS idx_accounting_docs_rest_status
  ON public.accounting_documents (restaurant_id, status);
```


```sql
CREATE INDEX IF NOT EXISTS idx_accounting_docs_rest_created
  ON public.accounting_documents (restaurant_id, created_at DESC);
```


```sql
CREATE INDEX IF NOT EXISTS idx_accounting_docs_request
  ON public.accounting_documents (request_id);
```


```sql
ALTER TABLE public.accounting_config ENABLE ROW LEVEL SECURITY;
```


```sql
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;
```


```sql
DROP POLICY IF EXISTS "Owner reads accounting config" ON public.accounting_config;
```


```sql
CREATE POLICY "Owner reads accounting config" ON public.accounting_config
  FOR SELECT
  USING (public.is_my_restaurant(restaurant_id));
```


```sql
DROP POLICY IF EXISTS "Owner reads accounting documents" ON public.accounting_documents;
```


```sql
CREATE POLICY "Owner reads accounting documents" ON public.accounting_documents
  FOR SELECT
  USING (public.is_my_restaurant(restaurant_id));
```


```sql
GRANT SELECT (
  restaurant_id, auto_emit, tax_key_version, last_sync_at, created_at, updated_at
) ON TABLE public.accounting_config TO authenticated;
```


```sql
GRANT SELECT (
  id, restaurant_id, order_id, dte_type, status, attempt, request_id, dte_id,
  folio, sii_status, track_id, amount, external_reference, receiver_rut,
  receiver_name, related_document_id, last_error, trace_id, accepted_at,
  created_at, updated_at
) ON TABLE public.accounting_documents TO authenticated;
```


```sql
CREATE TABLE IF NOT EXISTS public.accounting_cron_secret (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```


```sql
ALTER TABLE public.accounting_cron_secret ENABLE ROW LEVEL SECURITY;
```


```sql
REVOKE ALL ON public.accounting_cron_secret FROM anon, authenticated;
```

- Función `public.accounting_dispatch_cron`; firma ``; retorno/cualificadores `bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net`. Fuente línea 130.

```sql
REVOKE ALL ON FUNCTION public.accounting_dispatch_cron() FROM PUBLIC, anon, authenticated;
```


```sql
SELECT cron.schedule(
  'accounting-sync',
  '*/5 * * * *',
  $$SELECT public.accounting_dispatch_cron();$$
);
```


## 20260906000001_accounting_grant_hardening.sql

[supabase/migrations/20260906000001_accounting_grant_hardening.sql](<../../supabase/migrations/20260906000001_accounting_grant_hardening.sql>)


```sql
REVOKE ALL ON public.accounting_config FROM anon, authenticated;
```


```sql
REVOKE ALL ON public.accounting_documents FROM anon, authenticated;
```


```sql
GRANT SELECT (
  restaurant_id, auto_emit, tax_key_version, last_sync_at, created_at, updated_at
) ON TABLE public.accounting_config TO authenticated;
```


```sql
GRANT SELECT (
  id, restaurant_id, order_id, dte_type, status, attempt, request_id, dte_id,
  folio, sii_status, track_id, amount, external_reference, receiver_rut,
  receiver_name, related_document_id, last_error, trace_id, accepted_at,
  created_at, updated_at
) ON TABLE public.accounting_documents TO authenticated;
```


```sql
REVOKE ALL ON public.accounting_cron_secret FROM anon, authenticated;
```


## Cambio autorizado — últimas declaraciones nuevas

89 migraciones históricas intactas; 34 nuevas. Índice por nombre/firma textual normalizada (no resuelve DROP/overloads por tipos). PostgreSQL local materializa el catálogo; resultados en [VALIDATION_REPORT](VALIDATION_REPORT.md). No representa despliegue. SQL26–30 corrigen grants backend, contratos, estado proveedor, PIN ambiguo y replay de cancelación.

| Firma textual | Última declaración nueva | Línea |
| --- | --- | --- |
| `cmor_internal.purge_dsar_artifacts(p_limit integer DEFAULT 500)` | [20261006000031_client_operations_and_retention.sql](<../../supabase/migrations/20261006000031_client_operations_and_retention.sql:69>) | 69 |
| `public._create_order_priced_internal(p_restaurant_id uuid, p_items jsonb, p_customer_name text DEFAULT NULL::text, p_customer_phone text DEFAULT NULL::text, p_customer_email text DEFAULT NULL::text, p_order_type text DEFAULT 'qr'::text, p_table_number text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_payment_method text DEFAULT 'qr'::text)` | [20261006000004_preserve_pricing_and_service_paths.sql](<../../supabase/migrations/20261006000004_preserve_pricing_and_service_paths.sql:232>) | 232 |
| `public._deduct_inventory_for_order_internal(p_order_id uuid)` | [20261006000003_atomic_inventory.sql](<../../supabase/migrations/20261006000003_atomic_inventory.sql:59>) | 59 |
| `public.accounting_dispatch_cron()` | [20261006000011_operation_and_files.sql](<../../supabase/migrations/20261006000011_operation_and_files.sql:4>) | 4 |
| `public.accounting_emission_candidates(p_restaurant uuid,p_limit integer DEFAULT 20)` | [20261006000022_pin_and_accounting_candidates.sql](<../../supabase/migrations/20261006000022_pin_and_accounting_candidates.sql:8>) | 8 |
| `public.accounting_lease(p_restaurant uuid,p_token uuid DEFAULT NULL,p_release boolean DEFAULT false)` | [20261006000018_accounting_leases.sql](<../../supabase/migrations/20261006000018_accounting_leases.sql:5>) | 5 |
| `public.admin_transition_dsar(p_id uuid,p_status text,p_reason text DEFAULT NULL)` | [20261006000010_reports_and_dsar_admin.sql](<../../supabase/migrations/20261006000010_reports_and_dsar_admin.sql:21>) | 21 |
| `public.audit_trusted_insert()` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:51>) | 51 |
| `public.auto_approve_registration_v2(p_request_id uuid, p_plan text DEFAULT 'free_trial'::text, p_payment_provider text DEFAULT 'trial'::text, p_transaction_id text DEFAULT NULL::text, p_amount numeric DEFAULT 0)` | [20261006000004_preserve_pricing_and_service_paths.sql](<../../supabase/migrations/20261006000004_preserve_pricing_and_service_paths.sql:2>) | 2 |
| `public.begin_admin_mfa_recovery(p_id uuid)` | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql:52>) | 52 |
| `public.browser_signal(p_kind text)` | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql:37>) | 37 |
| `public.can_close_split_order(p_order_id uuid)` | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql:50>) | 50 |
| `public.capture_order_currency()` | [20261006000024_canonical_money.sql](<../../supabase/migrations/20261006000024_canonical_money.sql:40>) | 40 |
| `public.capture_order_payment_shift()` | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql:36>) | 36 |
| `public.cash_shift_metrics(p_shift_id uuid)` | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql:98>) | 98 |
| `public.cash_shift_totals_internal(p_shift uuid,p_until timestamptz)` | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql:62>) | 62 |
| `public.catalog_prices_valid(p_base numeric,p_sizes jsonb,p_addons jsonb,p_currency text)` | [20261006000024_canonical_money.sql](<../../supabase/migrations/20261006000024_canonical_money.sql:2>) | 2 |
| `public.check_menu_items_trial_limit()` | [20261006000007_qr_and_atomic_limits.sql](<../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql:62>) | 62 |
| `public.check_rate_limit(p_identifier text,p_identifier_type text,p_endpoint text, p_max_attempts int DEFAULT 5,p_window_minutes int DEFAULT 60)` | [20261006000007_qr_and_atomic_limits.sql](<../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql:72>) | 72 |
| `public.checkout_receipt(p_token text)` | [20261006000008_checkout_reservations.sql](<../../supabase/migrations/20261006000008_checkout_reservations.sql:121>) | 121 |
| `public.claim_invitations(p_restaurant uuid DEFAULT NULL)` | [20261006000020_invitation_delivery.sql](<../../supabase/migrations/20261006000020_invitation_delivery.sql:5>) | 5 |
| `public.close_cash_shift(p_shift_id uuid,p_actual_cash numeric,p_notes text DEFAULT NULL)` | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql:110>) | 110 |
| `public.complete_admin_mfa_recovery(p_id uuid)` | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql:59>) | 59 |
| `public.complete_session_payment(p_session_id uuid, p_tip_amount numeric DEFAULT 0, p_transaction_id text DEFAULT NULL)` | [20261006000004_preserve_pricing_and_service_paths.sql](<../../supabase/migrations/20261006000004_preserve_pricing_and_service_paths.sql:125>) | 125 |
| `public.confirm_checkout(p_reference text,p_provider text,p_remote_id text,p_amount numeric,p_currency text,p_status text)` | [20261006000008_checkout_reservations.sql](<../../supabase/migrations/20261006000008_checkout_reservations.sql:76>) | 76 |
| `public.consume_invitation(p_token text)` | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql:7>) | 7 |
| `public.create_order(p_restaurant_id uuid,p_items jsonb, p_customer_name text DEFAULT NULL,p_customer_phone text DEFAULT NULL,p_customer_email text DEFAULT NULL, p_order_type text DEFAULT 'qr',p_table_number text DEFAULT NULL,p_notes text DEFAULT NULL,p_payment_method text DEFAULT 'qr')` | [20261006000006_pos_contracts.sql](<../../supabase/migrations/20261006000006_pos_contracts.sql:12>) | 12 |
| `public.create_order(p_restaurant_id uuid,p_items jsonb,p_customer_name text DEFAULT NULL,p_customer_phone text DEFAULT NULL, p_customer_email text DEFAULT NULL,p_order_type text DEFAULT 'qr',p_table_number text DEFAULT NULL,p_notes text DEFAULT NULL,p_payment_method text DEFAULT 'qr',p_key uuid DEFAULT NULL)` | [20261006000019_public_order_idempotency.sql](<../../supabase/migrations/20261006000019_public_order_idempotency.sql:4>) | 4 |
| `public.create_restaurant_branch(p_name text, p_email text, p_phone text, p_city text, p_address text, p_restaurant_type text, p_subscription_plan text, p_status text, p_is_active boolean)` | [20261006000027_runtime_contract_repairs.sql](<../../supabase/migrations/20261006000027_runtime_contract_repairs.sql:5>) | 5 |
| `public.create_table_order(p_session_token text,p_order_data jsonb)` | [20261006000007_qr_and_atomic_limits.sql](<../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql:30>) | 30 |
| `public.create_waiter(p_restaurant_id uuid,p_name text,p_pin text,p_role text DEFAULT 'waiter')` | [20261006000029_unambiguous_waiter_pins.sql](<../../supabase/migrations/20261006000029_unambiguous_waiter_pins.sql:4>) | 4 |
| `public.enforce_membership_quota()` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:85>) | 85 |
| `public.execute_dsar(p_id uuid DEFAULT NULL,p_hash text DEFAULT NULL)` | [20261006000002_verified_dsar.sql](<../../supabase/migrations/20261006000002_verified_dsar.sql:54>) | 54 |
| `public.finish_dsar_download(p_id uuid,p_hash text)` | [20261006000016_dsar_pagination.sql](<../../supabase/migrations/20261006000016_dsar_pagination.sql:49>) | 49 |
| `public.finish_invitation_delivery(p_id uuid,p_claim uuid,p_sent boolean)` | [20261006000020_invitation_delivery.sql](<../../supabase/migrations/20261006000020_invitation_delivery.sql:14>) | 14 |
| `public.fixed_menu_tenant()` | [20261006000013_tenant_invariants.sql](<../../supabase/migrations/20261006000013_tenant_invariants.sql:23>) | 23 |
| `public.get_operational_settings()` | [20261006000031_client_operations_and_retention.sql](<../../supabase/migrations/20261006000031_client_operations_and_retention.sql:10>) | 10 |
| `public.get_table_orders(p_session_token text)` | [20261006000021_remaining_trust_boundaries.sql](<../../supabase/migrations/20261006000021_remaining_trust_boundaries.sql:24>) | 24 |
| `public.guard_catalog_prices()` | [20261006000024_canonical_money.sql](<../../supabase/migrations/20261006000024_canonical_money.sql:28>) | 28 |
| `public.guard_restaurant_currency()` | [20261006000024_canonical_money.sql](<../../supabase/migrations/20261006000024_canonical_money.sql:50>) | 50 |
| `public.is_admin()` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:4>) | 4 |
| `public.is_my_restaurant(p_restaurant_id uuid)` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:17>) | 17 |
| `public.is_service_actor()` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:12>) | 12 |
| `public.open_cash_shift(p_restaurant_id uuid,p_opening_cash numeric DEFAULT 0, p_notes text DEFAULT NULL,p_responsible_waiter_id uuid DEFAULT NULL)` | [20261006000023_cash_and_split_accounting.sql](<../../supabase/migrations/20261006000023_cash_and_split_accounting.sql:16>) | 16 |
| `public.platform_dashboard(p_start timestamptz)` | [20261006000014_admin_dashboard.sql](<../../supabase/migrations/20261006000014_admin_dashboard.sql:2>) | 2 |
| `public.prepare_dsar_download(p_id uuid)` | [20261006000016_dsar_pagination.sql](<../../supabase/migrations/20261006000016_dsar_pagination.sql:11>) | 11 |
| `public.price_order_items(p_restaurant_id uuid,p_items jsonb)` | [20261006000024_canonical_money.sql](<../../supabase/migrations/20261006000024_canonical_money.sql:62>) | 62 |
| `public.public_order_budget()` | [20261006000012_explicit_rpc_surface.sql](<../../supabase/migrations/20261006000012_explicit_rpc_surface.sql:25>) | 25 |
| `public.purge_dsar_artifacts(p_limit integer DEFAULT 500)` | [20261006000031_client_operations_and_retention.sql](<../../supabase/migrations/20261006000031_client_operations_and_retention.sql:91>) | 91 |
| `public.read_dsar_download(p_id uuid,p_hash text,p_after bigint DEFAULT 0)` | [20261006000016_dsar_pagination.sql](<../../supabase/migrations/20261006000016_dsar_pagination.sql:37>) | 37 |
| `public.record_checkout_result(p_id uuid,p_remote_id text,p_token text,p_response jsonb,p_uncertain boolean DEFAULT false)` | [20261006000008_checkout_reservations.sql](<../../supabase/migrations/20261006000008_checkout_reservations.sql:61>) | 61 |
| `public.record_my_consent(p_scope text, p_purpose text, p_legal_basis text, p_granted boolean, p_policy_version text, p_via text)` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:66>) | 66 |
| `public.record_provider_operation(p_id uuid,p_data jsonb DEFAULT NULL)` | [20261006000028_provider_status_resolution.sql](<../../supabase/migrations/20261006000028_provider_status_resolution.sql:3>) | 3 |
| `public.reserve_checkout(p_kind text,p_target uuid,p_provider text,p_tip numeric DEFAULT 0, p_amount numeric DEFAULT NULL,p_currency text DEFAULT NULL,p_plan text DEFAULT NULL)` | [20261006000008_checkout_reservations.sql](<../../supabase/migrations/20261006000008_checkout_reservations.sql:18>) | 18 |
| `public.reserve_provider_operation(p_restaurant uuid,p_kind text,p_payload jsonb)` | [20261006000034_provider_reservation_commit_race.sql](<../../supabase/migrations/20261006000034_provider_reservation_commit_race.sql:15>) | 15 |
| `public.restaurant_dashboard(p_restaurant_id uuid,p_start timestamptz)` | [20261006000010_reports_and_dsar_admin.sql](<../../supabase/migrations/20261006000010_reports_and_dsar_admin.sql:2>) | 2 |
| `public.restaurant_sales_report(p_restaurant_id uuid,p_days integer DEFAULT 30)` | [20261006000031_client_operations_and_retention.sql](<../../supabase/migrations/20261006000031_client_operations_and_retention.sql:100>) | 100 |
| `public.review_dsar_rectification(p_id uuid,p_approve boolean,p_reason text DEFAULT NULL)` | [20261006000002_verified_dsar.sql](<../../supabase/migrations/20261006000002_verified_dsar.sql:112>) | 112 |
| `public.revoke_closed_session()` | [20261006000015_capability_rotation.sql](<../../supabase/migrations/20261006000015_capability_rotation.sql:11>) | 11 |
| `public.rotate_table_capability()` | [20261006000015_capability_rotation.sql](<../../supabase/migrations/20261006000015_capability_rotation.sql:2>) | 2 |
| `public.save_operational_settings(p_settings jsonb,p_revision integer)` | [20261006000032_operational_revision_conflict.sql](<../../supabase/migrations/20261006000032_operational_revision_conflict.sql:2>) | 2 |
| `public.save_recipe(p_menu_item_id uuid,p_restaurant_id uuid,p_ingredients jsonb)` | [20261006000003_atomic_inventory.sql](<../../supabase/migrations/20261006000003_atomic_inventory.sql:21>) | 21 |
| `public.set_dsar_retention_hold(p_id uuid,p_hold boolean)` | [20261006000031_client_operations_and_retention.sql](<../../supabase/migrations/20261006000031_client_operations_and_retention.sql:59>) | 59 |
| `public.set_restaurant_report_timezone(p_restaurant_id uuid,p_timezone text)` | [20261006000031_client_operations_and_retention.sql](<../../supabase/migrations/20261006000031_client_operations_and_retention.sql:48>) | 48 |
| `public.settle_verified_payment(p_reference text,p_provider text,p_remote_id text,p_amount numeric,p_currency text,p_status text)` | [20261006000009_payment_compatibility.sql](<../../supabase/migrations/20261006000009_payment_compatibility.sql:3>) | 3 |
| `public.start_table_session_by_qr(p_qr_token text)` | [20261006000007_qr_and_atomic_limits.sql](<../../supabase/migrations/20261006000007_qr_and_atomic_limits.sql:9>) | 9 |
| `public.submit_dsar(p_email text, p_type text, p_payload jsonb, p_subject_id uuid, p_hash text, p_ip text)` | [20261006000002_verified_dsar.sql](<../../supabase/migrations/20261006000002_verified_dsar.sql:21>) | 21 |
| `public.switch_restaurant(p_restaurant_id uuid)` | [20261006000001_identity_and_trusted_audit.sql](<../../supabase/migrations/20261006000001_identity_and_trusted_audit.sql:31>) | 31 |
| `public.update_waiter(p_waiter_id uuid,p_name text DEFAULT NULL,p_pin text DEFAULT NULL,p_role text DEFAULT NULL,p_is_active boolean DEFAULT NULL)` | [20261006000029_unambiguous_waiter_pins.sql](<../../supabase/migrations/20261006000029_unambiguous_waiter_pins.sql:15>) | 15 |
| `public.validate_order_relation()` | [20261006000006_pos_contracts.sql](<../../supabase/migrations/20261006000006_pos_contracts.sql:141>) | 141 |
| `public.validate_public_order_write()` | [20261006000027_runtime_contract_repairs.sql](<../../supabase/migrations/20261006000027_runtime_contract_repairs.sql:76>) | 76 |
| `public.validate_recipe_parent()` | [20261006000012_explicit_rpc_surface.sql](<../../supabase/migrations/20261006000012_explicit_rpc_surface.sql:35>) | 35 |
| `public.validate_recipe_tenant()` | [20261006000003_atomic_inventory.sql](<../../supabase/migrations/20261006000003_atomic_inventory.sql:47>) | 47 |
| `public.validate_tenant_relations()` | [20261006000013_tenant_invariants.sql](<../../supabase/migrations/20261006000013_tenant_invariants.sql:6>) | 6 |
| `public.validate_waiter_pin(p_restaurant_id uuid,p_pin text)` | [20261006000029_unambiguous_waiter_pins.sql](<../../supabase/migrations/20261006000029_unambiguous_waiter_pins.sql:30>) | 30 |
| `public.write_pos_order(p_restaurant_id uuid,p_order jsonb,p_key uuid,p_order_id uuid DEFAULT NULL)` | [20261006000006_pos_contracts.sql](<../../supabase/migrations/20261006000006_pos_contracts.sql:31>) | 31 |
