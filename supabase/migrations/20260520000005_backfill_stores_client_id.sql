-- ============================================================
-- Backfill stores.client_id untuk toko orphan yang tidak ke-cover oleh
-- migrasi 20260504100000_link_stores_to_clients.sql.
-- ============================================================
--
-- Konteks: Migrasi sebelumnya (20260504...) backfill client_id via JOIN ke
-- onboarding_requests.store_id. Toko orphan (Adewap Glider, dll) saat itu
-- tidak punya onboarding_request → stores.client_id tetap NULL → dashboard
-- /dashboard/[storeId] return 404 karena query `.eq("client_id", ...)` fail.
--
-- Migrasi 20260430110000 baru saja create onboarding_requests placeholder
-- untuk orphan stores (Step 3) — tapi belum re-sync stores.client_id.
-- Migrasi ini melengkapi loop tersebut.
--
-- Strategi:
--   1. Update stores.client_id dari onboarding_requests yang baru ter-link
--      (chain: stores.id → onboarding_requests.store_id → onboarding_requests.client_id).
--   2. Fallback: kalau stores tidak punya onboarding_request, resolve langsung
--      via stores.user_id → clients.user_id.
-- ============================================================

-- Step 1: Re-run backfill via onboarding_requests (idempotent terhadap migrasi 20260504...).
UPDATE public.stores s
SET client_id = r.client_id
FROM public.onboarding_requests r
WHERE r.store_id = s.id
  AND s.client_id IS NULL
  AND r.client_id IS NOT NULL;

-- Step 2: Fallback resolve via stores.user_id (TEXT auth uid) → clients.user_id.
-- Cover toko orphan yang sama sekali tidak punya onboarding_request linked.
UPDATE public.stores s
SET client_id = c.id
FROM public.clients c
WHERE s.client_id IS NULL
  AND s.user_id IS NOT NULL
  AND s.user_id != 'system-preview'
  AND c.user_id = s.user_id;
