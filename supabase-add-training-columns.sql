-- ============================================
-- DODAVANJE STUPACA U training_plans ZA PRO GENERATOR
-- ============================================
-- Pokreni u Supabase SQL Editoru
-- ============================================

ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS trener_id UUID,
ADD COLUMN IF NOT EXISTS cilj TEXT,
ADD COLUMN IF NOT EXISTS razina TEXT,
ADD COLUMN IF NOT EXISTS split_tip TEXT,
ADD COLUMN IF NOT EXISTS ukupno_tjedana INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS treninzi_tjedno INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS opis TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS datum_pocetka DATE,
ADD COLUMN IF NOT EXISTS datum_zavrsetka DATE,
ADD COLUMN IF NOT EXISTS je_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS validacija_rezultat JSONB,
ADD COLUMN IF NOT EXISTS napomene_trenera TEXT,
ADD COLUMN IF NOT EXISTS generator_verzija TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Dodaj check constraints
DO $$ 
BEGIN
  -- Cilj constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_plans_cilj_check'
  ) THEN
    ALTER TABLE training_plans 
    ADD CONSTRAINT training_plans_cilj_check 
    CHECK (cilj IS NULL OR cilj IN ('hipertrofija', 'maksimalna_snaga', 'misicna_izdrzljivost', 'rekreacija_zdravlje'));
  END IF;
  
  -- Razina constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_plans_razina_check'
  ) THEN
    ALTER TABLE training_plans 
    ADD CONSTRAINT training_plans_razina_check 
    CHECK (razina IS NULL OR razina IN ('pocetnik', 'srednji', 'napredni'));
  END IF;
  
  -- Split constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_plans_split_check'
  ) THEN
    ALTER TABLE training_plans 
    ADD CONSTRAINT training_plans_split_check 
    CHECK (split_tip IS NULL OR split_tip IN ('full_body', 'upper_lower', 'push_pull_legs', 'body_part_split'));
  END IF;
  
  -- Status constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_plans_status_check'
  ) THEN
    ALTER TABLE training_plans 
    ADD CONSTRAINT training_plans_status_check 
    CHECK (status IS NULL OR status IN ('draft', 'aktivan', 'pauziran', 'zavrsen'));
  END IF;
END $$;

-- Dodaj indexe
CREATE INDEX IF NOT EXISTS idx_training_plans_trener ON training_plans(trener_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_plans_template ON training_plans(je_template) WHERE je_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_plans_cilj ON training_plans(cilj);

-- Provjeri
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'training_plans' 
ORDER BY ordinal_position;

