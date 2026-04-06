-- ============================================================
-- Storo.id Platform Tables
-- PRD: Client Portal & Onboarding
-- ============================================================

-- Client profiles (extended from Clerk user data)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  shopee_store_name TEXT,
  shopee_store_url TEXT,
  address TEXT,
  -- Identity
  ktp_url TEXT,
  ktp_verified BOOLEAN DEFAULT false,
  -- Bank account
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_own_data" ON public.clients
  FOR ALL USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "clients_insert_own" ON public.clients
  FOR INSERT WITH CHECK (clerk_user_id = auth.uid()::text);

-- ============================================================

-- Available templates (engineer-managed)
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  demo_url TEXT,
  repo_url TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_public_read" ON public.templates
  FOR SELECT USING (is_active = true);

-- Seed default templates
INSERT INTO public.templates (name, display_name, description, features, sort_order)
VALUES
  ('modern', 'Modern Minimalist', 'Desain bersih dan modern, cocok untuk semua kategori produk', '["Dark mode", "Mega menu", "Product zoom", "Quick view"]', 1),
  ('clean', 'Clean & Simple', 'Tampilan simpel yang fokus pada produk dan konversi', '["Fast loading", "Clean layout", "Mobile first", "SEO optimized"]', 2),
  ('fashion', 'Fashion Store', 'Khusus untuk fashion, pakaian, dan aksesoris', '["Lookbook", "Size guide", "Color swatch", "Instagram feed"]', 3),
  ('electronics', 'Tech & Electronics', 'Ideal untuk gadget, elektronik, dan teknologi', '["Spec comparison", "Tech specs", "360 view", "Bundle deals"]', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================

-- Domain availability cache
CREATE TABLE IF NOT EXISTS public.reserved_slugs (
  slug TEXT PRIMARY KEY,
  store_id UUID,
  client_id UUID REFERENCES public.clients(id),
  reserved_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reserved_slugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slugs_public_read" ON public.reserved_slugs
  FOR SELECT USING (true);

CREATE POLICY "slugs_own_reserve" ON public.reserved_slugs
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE clerk_user_id = auth.uid()::text)
  );

-- ============================================================

-- Onboarding requests (1 per store requested)
CREATE TABLE IF NOT EXISTS public.onboarding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Client choices
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'business', 'enterprise')),
  template_name TEXT NOT NULL,
  requested_slug TEXT NOT NULL,
  custom_domain TEXT,
  -- File uploads
  files_uploaded JSONB DEFAULT '[]',
  upload_method TEXT DEFAULT 'platform' CHECK (upload_method IN ('platform', 'whatsapp')),
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'in_progress', 'live', 'rejected')),
  status_note TEXT,
  assigned_engineer TEXT,
  -- Result
  store_id UUID,
  store_url TEXT,
  live_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_requests_select" ON public.onboarding_requests
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "own_requests_insert" ON public.onboarding_requests
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "own_requests_update" ON public.onboarding_requests
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE clerk_user_id = auth.uid()::text)
  );

-- ============================================================

-- Client notifications
CREATE TABLE IF NOT EXISTS public.client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'billing')),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_notifications" ON public.client_notifications
  FOR ALL USING (
    client_id IN (SELECT id FROM public.clients WHERE clerk_user_id = auth.uid()::text)
  );

-- ============================================================

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  store_id UUID,
  type TEXT NOT NULL CHECK (type IN ('setup', 'monthly', 'disbursement')),
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_invoices" ON public.invoices
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE clerk_user_id = auth.uid()::text)
  );

-- ============================================================

-- Updated_at trigger function (reuse existing or create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_requests_updated_at
  BEFORE UPDATE ON public.onboarding_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Storage buckets (run in Supabase dashboard or via CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ktp-uploads', 'ktp-uploads', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shopee-uploads', 'shopee-uploads', false);
