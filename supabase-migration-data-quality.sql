-- ============================================
-- SUPABASE MIGRATION - Data Quality Fields
-- ============================================
-- Dodaje version i data_quality_status kolone u recipes tablicu
-- 
-- Kako pokrenuti:
-- 1. Otvori Supabase Dashboard: https://app.supabase.com
-- 2. Odaberi svoj projekt
-- 3. Idi na SQL Editor
-- 4. Kopiraj SAV sadržaj ove datoteke
-- 5. Zalijepi u SQL Editor i klikni "RUN"
-- ============================================

-- Dodaj version kolonu (1 = legacy, 2 = edamam+semantic verified)
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 
CHECK (version IN (1, 2));

-- Dodaj data_quality_status kolonu
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS data_quality_status TEXT 
CHECK (data_quality_status IN ('VERIFIED', 'NEEDS_REVIEW', 'INVALID_MAPPING', 'NEEDS_REMAP'));

-- Dodaj data_quality_errors kolonu (JSONB array)
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS data_quality_errors JSONB DEFAULT '[]'::jsonb;

-- Dodaj edamam_audit_trail kolonu (JSONB object)
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS edamam_audit_trail JSONB;

-- Dodaj indexe za nove kolone
CREATE INDEX IF NOT EXISTS idx_recipes_version ON recipes(version);
CREATE INDEX IF NOT EXISTS idx_recipes_data_quality_status ON recipes(data_quality_status);
CREATE INDEX IF NOT EXISTS idx_recipes_data_quality_errors ON recipes USING GIN(data_quality_errors);

-- Komentari za nove kolone
COMMENT ON COLUMN recipes.version IS 'Recipe version: 1 = legacy (old macros), 2 = edamam+semantic verified';
COMMENT ON COLUMN recipes.data_quality_status IS 'Data quality status: VERIFIED | NEEDS_REVIEW | INVALID_MAPPING | NEEDS_REMAP';
COMMENT ON COLUMN recipes.data_quality_errors IS 'Array of error messages from validation (JSONB)';
COMMENT ON COLUMN recipes.edamam_audit_trail IS 'Full Edamam audit trail for recipe (JSONB)';

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Postavi sve postojeće recepte na version 1 (legacy)
UPDATE recipes 
SET version = 1, 
    data_quality_status = NULL
WHERE version IS NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete! All existing recipes are marked as version 1 (legacy).';
  RAISE NOTICE 'Run the migration script (scripts/migrate-meals-to-edamam.ts) to verify and update recipes.';
END $$;






















