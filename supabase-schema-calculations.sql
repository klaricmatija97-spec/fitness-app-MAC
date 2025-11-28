-- Tablica za spremanje kalkulacija iz kalkulatora
-- Pokreni ovu skriptu u Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Kreiraj tablicu user_calculations (jednostavnija verzija bez client_id reference)
CREATE TABLE IF NOT EXISTS user_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Može biti clientId ili privremeni ID
  total_calories NUMERIC NOT NULL,
  protein_grams NUMERIC NOT NULL,
  carb_grams NUMERIC NOT NULL,
  fat_grams NUMERIC NOT NULL,
  bmr NUMERIC,
  tdee NUMERIC,
  goal_type TEXT CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  activity_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Kreiraj index na user_id za brže pretraživanje
CREATE INDEX IF NOT EXISTS idx_user_calculations_user_id ON user_calculations(user_id);

-- Kreiraj index na created_at za sortiranje
CREATE INDEX IF NOT EXISTS idx_user_calculations_created_at ON user_calculations(created_at DESC);

-- Omogući Row Level Security (RLS)
ALTER TABLE user_calculations ENABLE ROW LEVEL SECURITY;

-- Kreiraj policy za service role (za API rute)
CREATE POLICY IF NOT EXISTS "Service role can manage user_calculations"
  ON user_calculations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Ako već postoji client_calculations tablica, možemo je koristiti kao fallback
-- Provjeri da li postoji client_calculations tablica
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'client_calculations'
  ) THEN
    -- Kreiraj client_calculations tablicu ako ne postoji
    CREATE TABLE client_calculations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL,
      bmr NUMERIC NOT NULL,
      tdee NUMERIC NOT NULL,
      target_calories NUMERIC NOT NULL,
      goal_type TEXT NOT NULL CHECK (goal_type IN ('lose', 'maintain', 'gain')),
      protein_grams NUMERIC NOT NULL,
      carbs_grams NUMERIC NOT NULL,
      fats_grams NUMERIC NOT NULL,
      activity_level TEXT,
      calculated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(client_id)
    );

    CREATE INDEX IF NOT EXISTS idx_client_calculations_client_id ON client_calculations(client_id);
    
    ALTER TABLE client_calculations ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY IF NOT EXISTS "Service role can manage client_calculations"
      ON client_calculations
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Komentari za dokumentaciju
COMMENT ON TABLE user_calculations IS 'Tablica za spremanje kalkulacija kalorija i makronutrijenata iz kalkulatora';
COMMENT ON COLUMN user_calculations.user_id IS 'ID korisnika (može biti clientId ili privremeni ID)';
COMMENT ON COLUMN user_calculations.total_calories IS 'Ukupne dnevne kalorije';
COMMENT ON COLUMN user_calculations.protein_grams IS 'Proteini u gramima';
COMMENT ON COLUMN user_calculations.carb_grams IS 'Ugljikohidrati u gramima';
COMMENT ON COLUMN user_calculations.fat_grams IS 'Masti u gramima';
COMMENT ON COLUMN user_calculations.bmr IS 'Basal Metabolic Rate';
COMMENT ON COLUMN user_calculations.tdee IS 'Total Daily Energy Expenditure';



