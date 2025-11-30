-- Dodaj stupce za preferencije prehrane u clients tablicu
-- Pokreni ovo u Supabase SQL Editoru

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS avoid_ingredients TEXT DEFAULT NULL;

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS food_preferences TEXT DEFAULT NULL;

-- Provjeri da su stupci dodani
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('avoid_ingredients', 'food_preferences');


