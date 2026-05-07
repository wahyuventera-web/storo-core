-- Add custom domain support to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE;

-- Update domain for known stores
UPDATE stores SET domain = 'adewapglider.com' WHERE slug = 'adewap-glider';
UPDATE stores SET domain = 'nutiver.com' WHERE slug = 'nutiver';

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stores_domain ON stores(domain) WHERE domain IS NOT NULL;
