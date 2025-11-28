-- SQL skripta za dodavanje dodatnih stupaca u clients tablicu
-- Pokreni ovu skriptu u Supabase SQL Editor ako stupci ne postoje

-- Dodaj dodatne stupce ako ne postoje
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS training_frequency TEXT,
ADD COLUMN IF NOT EXISTS training_duration TEXT,
ADD COLUMN IF NOT EXISTS training_location TEXT,
ADD COLUMN IF NOT EXISTS equipment TEXT[],
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS meal_frequency TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS diet_type TEXT,
ADD COLUMN IF NOT EXISTS other_diet_type TEXT,
ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC,
ADD COLUMN IF NOT EXISTS injuries TEXT,
ADD COLUMN IF NOT EXISTS biggest_challenge TEXT,
ADD COLUMN IF NOT EXISTS other_challenge TEXT;

-- Napomena: Kalkulacije (bmr, tdee, target_calories, protein_grams, carbs_grams, fats_grams)
-- se NE dodaju u clients tablicu - one idu u client_calculations tablicu!



