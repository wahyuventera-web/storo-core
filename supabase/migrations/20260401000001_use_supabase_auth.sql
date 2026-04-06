-- ============================================================
-- Migrate from clerk_user_id → user_id (Supabase auth.uid())
-- ============================================================

-- Rename column on clients table
ALTER TABLE public.clients
  RENAME COLUMN clerk_user_id TO user_id;

-- The user_id now references Supabase auth users directly
-- RLS policies already use auth.uid() so they remain valid

-- Update RLS policies to match new column name
DROP POLICY IF EXISTS "clients_own_data" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own" ON public.clients;

CREATE POLICY "clients_own_data" ON public.clients
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "clients_insert_own" ON public.clients
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Update onboarding_requests policies (use subquery on clients)
DROP POLICY IF EXISTS "own_requests_select" ON public.onboarding_requests;
DROP POLICY IF EXISTS "own_requests_insert" ON public.onboarding_requests;
DROP POLICY IF EXISTS "own_requests_update" ON public.onboarding_requests;

CREATE POLICY "own_requests_select" ON public.onboarding_requests
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "own_requests_insert" ON public.onboarding_requests
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "own_requests_update" ON public.onboarding_requests
  FOR UPDATE USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()::text)
  );

-- Update notifications policies
DROP POLICY IF EXISTS "own_notifications" ON public.client_notifications;
CREATE POLICY "own_notifications" ON public.client_notifications
  FOR ALL USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()::text)
  );

-- Update invoices policies
DROP POLICY IF EXISTS "own_invoices" ON public.invoices;
CREATE POLICY "own_invoices" ON public.invoices
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()::text)
  );

-- Update reserved_slugs policies
DROP POLICY IF EXISTS "slugs_own_reserve" ON public.reserved_slugs;
CREATE POLICY "slugs_own_reserve" ON public.reserved_slugs
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()::text)
  );
