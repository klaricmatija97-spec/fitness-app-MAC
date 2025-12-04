-- ============================================
-- DODAJ NUTRITION POLJA U CLIENTS TABLICU
-- ============================================
-- Ova polja se popunjavaju iz kalkulatora i koriste za generiranje jelovnika

-- Kalorije i makronutrijenti iz kalkulatora
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_calories NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS protein_grams NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS carbs_grams NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS fats_grams NUMERIC;

-- BMR i TDEE iz kalkulatora
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bmr NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tdee NUMERIC;

-- Tip cilja (lose/maintain/gain)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'maintain';

-- Broj obroka dnevno (3, 5 ili 6)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meal_frequency TEXT DEFAULT '5';

-- Tip dijete (optional)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS diet_type TEXT;

-- ============================================
-- PROVJERA - prikaži strukturu tablice
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('target_calories', 'protein_grams', 'carbs_grams', 'fats_grams', 'bmr', 'tdee', 'goal_type', 'meal_frequency', 'diet_type')
ORDER BY column_name;

