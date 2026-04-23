-- ============================================================
-- Add Xendit payment columns to existing invoices table
-- ============================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_ref TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for fast webhook lookup by provider_ref (Xendit invoice ID)
CREATE INDEX IF NOT EXISTS idx_invoices_provider_ref
  ON public.invoices(provider_ref);

-- Index for JSONB metadata queries (webhook fallback lookup)
CREATE INDEX IF NOT EXISTS idx_invoices_metadata_xendit_id
  ON public.invoices USING GIN (metadata);
