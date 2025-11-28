-- ============================================
-- SUPABASE SQL SCRIPT - PROFESIONALNA BAZA PODATAKA
-- ============================================
-- Kreira tablice za namirnice, recepte i vježbe
-- Zalipej ovu skriptu u Supabase SQL Editor
-- ============================================

-- 1. TABLICA: foods (Namirnice)
-- ============================================
CREATE TABLE IF NOT EXISTS foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    calories_per_100g NUMERIC(10, 2) NOT NULL CHECK (calories_per_100g >= 0),
    protein_per_100g NUMERIC(10, 2) NOT NULL CHECK (protein_per_100g >= 0),
    carbs_per_100g NUMERIC(10, 2) NOT NULL CHECK (carbs_per_100g >= 0),
    fat_per_100g NUMERIC(10, 2) NOT NULL CHECK (fat_per_100g >= 0),
    category TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    allergens TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexi za foods
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_tags ON foods USING GIN(tags);

-- Komentar za tablicu
COMMENT ON TABLE foods IS 'Profesionalna baza namirnica sa makronutrijentima po 100g';
COMMENT ON COLUMN foods.name IS 'Naziv namirnice';
COMMENT ON COLUMN foods.calories_per_100g IS 'Kalorije po 100g';
COMMENT ON COLUMN foods.protein_per_100g IS 'Proteini po 100g (u gramima)';
COMMENT ON COLUMN foods.carbs_per_100g IS 'Ugljikohidrati po 100g (u gramima)';
COMMENT ON COLUMN foods.fat_per_100g IS 'Masti po 100g (u gramima)';
COMMENT ON COLUMN foods.category IS 'Kategorija namirnice (npr. "povrće", "voće", "meso", "morski plodovi", itd.)';
COMMENT ON COLUMN foods.tags IS 'JSON array tagova (npr. ["gluten-free", "vegetarian", "high-protein"])';
COMMENT ON COLUMN foods.allergens IS 'Alergeni (npr. "mlijeko, orašasti plodovi")';

-- 2. TABLICA: recipes (Recepti)
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    total_calories NUMERIC(10, 2) NOT NULL CHECK (total_calories >= 0),
    total_protein NUMERIC(10, 2) NOT NULL CHECK (total_protein >= 0),
    total_carbs NUMERIC(10, 2) NOT NULL CHECK (total_carbs >= 0),
    total_fat NUMERIC(10, 2) NOT NULL CHECK (total_fat >= 0),
    cooking_time_min INTEGER CHECK (cooking_time_min >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexi za recipes
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_recipes_cooking_time ON recipes(cooking_time_min);

-- Komentar za tablicu
COMMENT ON TABLE recipes IS 'Profesionalna baza recepata sa ukupnim makronutrijentima';
COMMENT ON COLUMN recipes.name IS 'Naziv recepta';
COMMENT ON COLUMN recipes.description IS 'Opis recepta';
COMMENT ON COLUMN recipes.tags IS 'JSON array tagova (npr. ["doručak", "gluten-free", "high-protein", "quick"])';
COMMENT ON COLUMN recipes.total_calories IS 'Ukupne kalorije za cijeli recept';
COMMENT ON COLUMN recipes.total_protein IS 'Ukupni proteini za cijeli recept (u gramima)';
COMMENT ON COLUMN recipes.total_carbs IS 'Ukupni ugljikohidrati za cijeli recept (u gramima)';
COMMENT ON COLUMN recipes.total_fat IS 'Ukupne masti za cijeli recept (u gramima)';
COMMENT ON COLUMN recipes.cooking_time_min IS 'Vrijeme kuhanja u minutama';

-- 3. TABLICA: recipe_ingredients (Sastojci recepata)
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
    grams NUMERIC(10, 2) NOT NULL CHECK (grams > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, food_id)
);

-- Indexi za recipe_ingredients
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_food_id ON recipe_ingredients(food_id);

-- Komentar za tablicu
COMMENT ON TABLE recipe_ingredients IS 'Veza između recepata i namirnica - sastojci recepata';
COMMENT ON COLUMN recipe_ingredients.recipe_id IS 'ID recepta';
COMMENT ON COLUMN recipe_ingredients.food_id IS 'ID namirnice';
COMMENT ON COLUMN recipe_ingredients.grams IS 'Količina namirnice u gramima za ovaj recept';

-- 4. TABLICA: workout_exercises (Vježbe)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    equipment TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    instructions TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexi za workout_exercises
CREATE INDEX IF NOT EXISTS idx_workout_exercises_name ON workout_exercises(name);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_muscle_group ON workout_exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_equipment ON workout_exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_level ON workout_exercises(level);

-- Komentar za tablicu
COMMENT ON TABLE workout_exercises IS 'Profesionalna baza vježbi za trening';
COMMENT ON COLUMN workout_exercises.name IS 'Naziv vježbe';
COMMENT ON COLUMN workout_exercises.muscle_group IS 'Mišićna grupa (npr. "chest", "back", "legs", "shoulders", "arms", "core")';
COMMENT ON COLUMN workout_exercises.equipment IS 'Oprema potrebna (npr. "dumbbells", "barbell", "bodyweight", "cable", "machine")';
COMMENT ON COLUMN workout_exercises.level IS 'Nivo težine: beginner, intermediate, advanced, expert';
COMMENT ON COLUMN workout_exercises.instructions IS 'Upute za izvođenje vježbe';
COMMENT ON COLUMN workout_exercises.video_url IS 'URL videozapisa sa demonstracijom vježbe';

-- ============================================
-- TRIGGER ZA AUTOMATSKO AŽURIRANJE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigeri za updated_at
CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_exercises_updated_at BEFORE UPDATE ON workout_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Omogući RLS za sve tablice
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Policies za foods - svi mogu čitati, samo authenticated mogu mijenjati
CREATE POLICY "Anyone can read foods" ON foods
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert foods" ON foods
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update foods" ON foods
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete foods" ON foods
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies za recipes - svi mogu čitati, samo authenticated mogu mijenjati
CREATE POLICY "Anyone can read recipes" ON recipes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert recipes" ON recipes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update recipes" ON recipes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete recipes" ON recipes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies za recipe_ingredients - svi mogu čitati, samo authenticated mogu mijenjati
CREATE POLICY "Anyone can read recipe_ingredients" ON recipe_ingredients
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert recipe_ingredients" ON recipe_ingredients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update recipe_ingredients" ON recipe_ingredients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete recipe_ingredients" ON recipe_ingredients
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies za workout_exercises - svi mogu čitati, samo authenticated mogu mijenjati
CREATE POLICY "Anyone can read workout_exercises" ON workout_exercises
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert workout_exercises" ON workout_exercises
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update workout_exercises" ON workout_exercises
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete workout_exercises" ON workout_exercises
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- FUNKCIJA ZA AUTOMATSKO IZRAČUNAVANJE MAKROA RECEPTA
-- ============================================
CREATE OR REPLACE FUNCTION calculate_recipe_macros(recipe_uuid UUID)
RETURNS TABLE (
    total_calories NUMERIC,
    total_protein NUMERIC,
    total_carbs NUMERIC,
    total_fat NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(SUM((ri.grams / 100.0) * f.calories_per_100g)::numeric, 2) as total_calories,
        ROUND(SUM((ri.grams / 100.0) * f.protein_per_100g)::numeric, 2) as total_protein,
        ROUND(SUM((ri.grams / 100.0) * f.carbs_per_100g)::numeric, 2) as total_carbs,
        ROUND(SUM((ri.grams / 100.0) * f.fat_per_100g)::numeric, 2) as total_fat
    FROM recipe_ingredients ri
    JOIN foods f ON ri.food_id = f.id
    WHERE ri.recipe_id = recipe_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_recipe_macros IS 'Izračunava ukupne makronutrijente recepta na osnovu sastojaka';

-- ============================================
-- ZAVRŠETAK SKRIPTE
-- ============================================
-- Sve tablice su kreirane sa:
-- ✅ Primary keys (UUID)
-- ✅ Foreign keys sa proper CASCADE/RESTRICT
-- ✅ Check constraints
-- ✅ Indexi za performanse
-- ✅ RLS policies
-- ✅ Triggers za updated_at
-- ✅ Helper funkcija za izračun makroa

-- Sada možete dodati podatke u tablice!
-- ============================================
