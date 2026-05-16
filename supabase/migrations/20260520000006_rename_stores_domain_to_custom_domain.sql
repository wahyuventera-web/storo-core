-- ============================================================
-- Rename stores.domain → stores.custom_domain
-- ============================================================
--
-- Migrasi 20260507200000_stores_custom_domain.sql menamai kolom 'domain'
-- (lihat naming inconsistency: filename "custom_domain" tapi ALTER TABLE-nya
-- "ADD COLUMN domain"). Semua kode di src/lib/store/context.ts dan beberapa
-- page selalu select "custom_domain" → query gagal "column does not exist"
-- → getStoreForUser return null → dashboard 404.
--
-- Rename column supaya konsisten dengan onboarding_requests.custom_domain
-- dan semua code path. Idempotent: skip kalau kolom sudah benar / belum ada.
-- ============================================================

DO $$
BEGIN
  -- Rename kolom jika 'domain' ada dan 'custom_domain' belum ada
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stores'
      AND column_name = 'domain'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stores'
      AND column_name = 'custom_domain'
  ) THEN
    ALTER TABLE public.stores RENAME COLUMN domain TO custom_domain;
    RAISE NOTICE 'Renamed stores.domain → stores.custom_domain';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stores'
      AND column_name = 'custom_domain'
  ) THEN
    -- Kalau belum ada satu pun, create as custom_domain langsung
    ALTER TABLE public.stores ADD COLUMN custom_domain TEXT UNIQUE;
    RAISE NOTICE 'Added stores.custom_domain (was missing entirely)';
  ELSE
    RAISE NOTICE 'stores.custom_domain already exists, skipping';
  END IF;
END $$;

-- Rename index agar konsisten (idempotent)
DROP INDEX IF EXISTS public.idx_stores_domain;
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain
  ON public.stores(custom_domain)
  WHERE custom_domain IS NOT NULL;
