-- Dodaj kolonu usda_fdc_id u foods tablicu
-- Pokreni ovu SQL skriptu u Supabase SQL Editor prije pokretanja import skripte

ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS usda_fdc_id BIGINT UNIQUE;

-- Dodaj index za brže pretraživanje
CREATE INDEX IF NOT EXISTS idx_foods_usda_fdc_id ON foods(usda_fdc_id);

