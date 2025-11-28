-- ============================================
-- UPGRADE SQL - Nadogradnja recipes i foods tablica
-- ============================================
-- Pokreni ovu SQL skriptu u Supabase SQL Editor
-- 
-- Kako pokrenuti:
-- 1. Otvori Supabase Dashboard: https://app.supabase.com
-- 2. Odaberi svoj projekt (zspuauneubodthvrmzqg)
-- 3. Idi na SQL Editor (lijevo u meniju)
-- 4. Klikni "New Query"
-- 5. Kopiraj SAV sadržaj ove datoteke
-- 6. Zalijepi u SQL Editor
-- 7. Klikni "RUN" ili pritisni Ctrl+Enter
-- 8. Provjeri da li su poruke "Success" prikazane
-- 
-- ============================================
-- NADOGRADNJA RECIPES TABLICE
-- ============================================

-- Dodaj meal_type kolonu
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS meal_type TEXT 
CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));

-- Dodaj cuisine kolonu
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS cuisine TEXT;

-- Dodaj prep_time_minutes kolonu
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER 
CHECK (prep_time_minutes >= 0);

-- Dodaj difficulty kolonu
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- Dodaj goal_tags kolonu (JSONB array)
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS goal_tags JSONB DEFAULT '[]'::jsonb;

-- Dodaj diet_tags kolonu (JSONB array)
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS diet_tags JSONB DEFAULT '[]'::jsonb;

-- Dodaj health_score kolonu
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS health_score NUMERIC(5, 2) 
CHECK (health_score >= 0 AND health_score <= 100);

-- Dodaj indexe za nove kolone
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON recipes(prep_time_minutes);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_goal_tags ON recipes USING GIN(goal_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_diet_tags ON recipes USING GIN(diet_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_health_score ON recipes(health_score);

-- Komentari za nove kolone
COMMENT ON COLUMN recipes.meal_type IS 'Tip obroka: breakfast, lunch, dinner, snack';
COMMENT ON COLUMN recipes.cuisine IS 'Kuhinja (npr. "mediteranska", "azijska", "italijanska")';
COMMENT ON COLUMN recipes.prep_time_minutes IS 'Vrijeme pripreme u minutama';
COMMENT ON COLUMN recipes.difficulty IS 'Težina pripreme (npr. "easy", "medium", "hard")';
COMMENT ON COLUMN recipes.goal_tags IS 'JSON array tagova za cilj (npr. ["gain", "lose", "maintain"])';
COMMENT ON COLUMN recipes.diet_tags IS 'JSON array tagova za dijetu (npr. ["gluten-free", "vegetarian", "keto"])';
COMMENT ON COLUMN recipes.health_score IS 'Health score od 0-100 (viša vrijednost = zdravije)';

-- ============================================
-- NADOGRADNJA FOODS TABLICE
-- ============================================

-- Dodaj is_usda kolonu
ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS is_usda BOOLEAN DEFAULT true;

-- Dodaj default_serving_size_g kolonu
ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS default_serving_size_g NUMERIC(10, 2) DEFAULT 100 
CHECK (default_serving_size_g > 0);

-- Dodaj index za is_usda
CREATE INDEX IF NOT EXISTS idx_foods_is_usda ON foods(is_usda);

-- Komentari za nove kolone
COMMENT ON COLUMN foods.is_usda IS 'Označava da li je namirnica iz USDA baze';
COMMENT ON COLUMN foods.default_serving_size_g IS 'Zadana veličina porcije u gramima (obično 100g)';

-- ============================================
-- NADOGRADNJA MEAL_PLANS TABLICE
-- ============================================

-- Dodaj version/type kolonu za razlikovanje PRO i osnovnih planova
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'standard' 
CHECK (plan_type IN ('standard', 'pro'));

-- Dodaj plan_version kolonu
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS plan_version TEXT DEFAULT '1.0';

-- Dodaj deviation_percent kolonu (koliko je plan blizu ciljnim makroima u %)
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS deviation_percent NUMERIC(5, 2);

-- Dodaj indexe
CREATE INDEX IF NOT EXISTS idx_meal_plans_type ON meal_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_meal_plans_version ON meal_plans(plan_version);

-- Komentari
COMMENT ON COLUMN meal_plans.plan_type IS 'Tip plana: standard (osnovni) ili pro (napredni sa scoring sistemom)';
COMMENT ON COLUMN meal_plans.plan_version IS 'Verzija plana (npr. "1.0", "2.0")';
COMMENT ON COLUMN meal_plans.deviation_percent IS 'Prosječno odstupanje od ciljnih makroa u postocima';

-- ============================================
-- PROVJERA
-- ============================================

-- Provjeri da li su kolone dodane
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'recipes' 
  AND column_name IN ('meal_type', 'cuisine', 'prep_time_minutes', 'difficulty', 'goal_tags', 'diet_tags', 'health_score')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'foods' 
  AND column_name IN ('is_usda', 'default_serving_size_g')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'meal_plans' 
  AND column_name IN ('plan_type', 'plan_version', 'deviation_percent')
ORDER BY column_name;

