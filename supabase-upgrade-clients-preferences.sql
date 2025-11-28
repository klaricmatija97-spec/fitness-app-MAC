-- ============================================
-- UPGRADE SQL - Nadogradnja clients tablice sa user preferences
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
-- NADOGRADNJA CLIENTS TABLICE SA USER PREFERENCES
-- ============================================

-- Dodaj diet_type kolonu
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS diet_type TEXT DEFAULT 'none'
CHECK (diet_type IN ('none', 'vegetarian', 'vegan'));

-- Dodaj disliked_foods kolonu (TEXT array)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS disliked_foods TEXT[] DEFAULT NULL;

-- Dodaj disliked_ingredients kolonu (TEXT array)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS disliked_ingredients TEXT[] DEFAULT NULL;

-- Dodaj max_same_recipe_per_week kolonu
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS max_same_recipe_per_week INTEGER DEFAULT 2
CHECK (max_same_recipe_per_week >= 1 AND max_same_recipe_per_week <= 7);

-- Dodaj max_prep_time_minutes kolonu (ako već ne postoji - možda je dodana u prošlom upgrade-u)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS max_prep_time_minutes INTEGER DEFAULT 30
CHECK (max_prep_time_minutes >= 0);

-- Dodaj indexe za nove kolone
CREATE INDEX IF NOT EXISTS idx_clients_diet_type ON clients(diet_type);
CREATE INDEX IF NOT EXISTS idx_clients_disliked_foods ON clients USING GIN(disliked_foods);
CREATE INDEX IF NOT EXISTS idx_clients_disliked_ingredients ON clients USING GIN(disliked_ingredients);

-- Komentari za nove kolone
COMMENT ON COLUMN clients.diet_type IS 'Tip prehrane: none (obična), vegetarian (vegetarijanska), vegan (veganska)';
COMMENT ON COLUMN clients.disliked_foods IS 'Lista namirnica ili tagova koje korisnik ne voli (TEXT array)';
COMMENT ON COLUMN clients.disliked_ingredients IS 'Lista sastojaka koje korisnik ne voli (npr. ["tuna", "mushroom"])';
COMMENT ON COLUMN clients.max_same_recipe_per_week IS 'Maksimalno ponavljanje istog recepta u 7 dana (1-7)';
COMMENT ON COLUMN clients.max_prep_time_minutes IS 'Maksimalno vrijeme pripreme obroka u minutama';

-- ============================================
-- NADOGRADNJA MEAL_PLANS TABLICE ZA WEEKLY PLAN
-- ============================================

-- Ako već ne postoji plan_type kolona, dodaj je
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'standard'
CHECK (plan_type IN ('standard', 'pro', 'pro_weekly'));

-- Dodaj plan_json kolonu za spremanje kompletnog WeeklyPlan JSON-a
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS plan_json JSONB;

-- Dodaj index za plan_type
CREATE INDEX IF NOT EXISTS idx_meal_plans_plan_type ON meal_plans(plan_type);

-- Komentari
COMMENT ON COLUMN meal_plans.plan_type IS 'Tip plana: standard (osnovni), pro (PRO dnevni), pro_weekly (PRO tjedni)';
COMMENT ON COLUMN meal_plans.plan_json IS 'JSON reprezentacija kompletnog plana (koristi se za pro_weekly)';

-- ============================================
-- PROVJERA
-- ============================================

-- Provjeri da li su kolone dodane
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
  AND column_name IN ('diet_type', 'disliked_foods', 'disliked_ingredients', 'max_same_recipe_per_week', 'max_prep_time_minutes')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'meal_plans' 
  AND column_name IN ('plan_type', 'plan_json')
ORDER BY column_name;

