-- ============================================
-- PRO TRAINING GENERATOR - SCHEMA MIGRATION
-- ============================================
-- 
-- Ova migracija dodaje podršku za:
-- - Mezocikluse (periodizacija)
-- - Poboljšane training programe
-- - Trener override funkcionalnosti
-- - Program template sustav
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- ============================================
-- 1. TRAINING PROGRAMS TABLICA (POBOLJŠANA)
-- ============================================

-- Dodaj nove stupce u postojeću training_plans tablicu
-- (ako tablica ne postoji, kreiraj je)

DO $$ 
BEGIN
  -- Provjeri postoji li tablica training_plans
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'training_plans') THEN
    CREATE TABLE training_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      plan_name TEXT NOT NULL,
      exercises JSONB,
      warmup_type TEXT DEFAULT 'bodyweight',
      estimated_calories_burned INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Dodaj nove PRO stupce
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS trener_id UUID,
ADD COLUMN IF NOT EXISTS cilj TEXT CHECK (cilj IN ('hipertrofija', 'maksimalna_snaga', 'misicna_izdrzljivost', 'rekreacija_zdravlje')),
ADD COLUMN IF NOT EXISTS razina TEXT CHECK (razina IN ('pocetnik', 'srednji', 'napredni')),
ADD COLUMN IF NOT EXISTS split_tip TEXT CHECK (split_tip IN ('full_body', 'upper_lower', 'push_pull_legs', 'body_part_split')),
ADD COLUMN IF NOT EXISTS ukupno_tjedana INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS treninzi_tjedno INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS opis TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'aktivan', 'pauziran', 'zavrsen')),
ADD COLUMN IF NOT EXISTS datum_pocetka DATE,
ADD COLUMN IF NOT EXISTS datum_zavrsetka DATE,
ADD COLUMN IF NOT EXISTS je_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS template_id UUID,
ADD COLUMN IF NOT EXISTS validacija_rezultat JSONB,
ADD COLUMN IF NOT EXISTS napomene_trenera TEXT,
ADD COLUMN IF NOT EXISTS generator_verzija TEXT DEFAULT '1.0.0';

-- Index za brže pretrage
CREATE INDEX IF NOT EXISTS idx_training_plans_client ON training_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_trener ON training_plans(trener_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_plans_template ON training_plans(je_template) WHERE je_template = TRUE;


-- ============================================
-- 2. MESOCYCLES TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS training_mesocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  redni_broj INTEGER NOT NULL,
  naziv TEXT NOT NULL,
  tip TEXT NOT NULL CHECK (tip IN ('akumulacija', 'intenzifikacija', 'realizacija', 'deload')),
  trajanje_tjedana INTEGER NOT NULL DEFAULT 4,
  fokus_opis TEXT,
  
  -- Volumen kontrola
  pocetni_volumen_po_grupi JSONB, -- Record<MuscleGroup, number>
  zavrsni_volumen_po_grupi JSONB,
  
  -- Intenzitet kontrola
  pocetni_intenzitet_postotak INTEGER DEFAULT 70,
  zavrsni_intenzitet_postotak INTEGER DEFAULT 85,
  
  -- Progresija
  tip_progresije TEXT DEFAULT 'linearna' CHECK (tip_progresije IN ('linearna', 'valna', 'dvostruka')),
  
  -- Meta
  napomene_treneru TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(program_id, redni_broj)
);

CREATE INDEX IF NOT EXISTS idx_mesocycles_program ON training_mesocycles(program_id);


-- ============================================
-- 3. MESOCYCLE WEEKS TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS training_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesocycle_id UUID NOT NULL REFERENCES training_mesocycles(id) ON DELETE CASCADE,
  tjedan_broj INTEGER NOT NULL,
  je_deload BOOLEAN DEFAULT FALSE,
  volumen_modifikator DECIMAL(3,2) DEFAULT 1.0,
  intenzitet_modifikator DECIMAL(3,2) DEFAULT 1.0,
  napomene TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(mesocycle_id, tjedan_broj)
);

CREATE INDEX IF NOT EXISTS idx_weeks_mesocycle ON training_weeks(mesocycle_id);


-- ============================================
-- 4. WORKOUT SESSIONS TABLICA (POBOLJŠANA)
-- ============================================

CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES training_weeks(id) ON DELETE CASCADE,
  dan_u_tjednu INTEGER NOT NULL CHECK (dan_u_tjednu BETWEEN 1 AND 7),
  naziv TEXT NOT NULL,
  tip_treninga TEXT,
  procijenjeno_trajanje_min INTEGER DEFAULT 60,
  
  -- Struktura treninga (JSONB)
  zagrijavanje JSONB,
  zavrsni_dio JSONB,
  
  -- Meta
  napomene TEXT,
  trener_locked BOOLEAN DEFAULT FALSE,
  stvarno_trajanje_min INTEGER, -- Popunjava se nakon izvršenja
  izvrseno_na TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_week ON training_sessions(week_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dan ON training_sessions(dan_u_tjednu);


-- ============================================
-- 5. SESSION EXERCISES TABLICA (POBOLJŠANA)
-- ============================================

CREATE TABLE IF NOT EXISTS training_session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  redni_broj INTEGER NOT NULL,
  
  -- Referenca na library
  exercise_library_id TEXT NOT NULL,
  naziv TEXT NOT NULL,
  naziv_en TEXT,
  
  -- Propisani parametri
  setovi INTEGER NOT NULL DEFAULT 3,
  ponavljanja TEXT NOT NULL DEFAULT '8-12',
  odmor_sekunde INTEGER DEFAULT 90,
  tempo TEXT, -- "3-1-2-0"
  rir INTEGER CHECK (rir BETWEEN 0 AND 5),
  rpe DECIMAL(3,1) CHECK (rpe BETWEEN 5 AND 10),
  postotak_1rm INTEGER CHECK (postotak_1rm BETWEEN 20 AND 100),
  
  -- Meta
  tip_vjezbe TEXT CHECK (tip_vjezbe IN ('compound', 'isolation')),
  obrazac_pokreta TEXT,
  primarne_grupe TEXT[] DEFAULT '{}',
  sekundarne_grupe TEXT[] DEFAULT '{}',
  oprema TEXT,
  
  -- Zamjene i prilagodbe
  alternativne_vjezbe JSONB,
  napomene TEXT,
  je_superser BOOLEAN DEFAULT FALSE,
  superser_partner_id UUID REFERENCES training_session_exercises(id),
  
  -- Trener kontrole
  trener_override BOOLEAN DEFAULT FALSE,
  originalna_vjezba_id TEXT,
  
  -- Izvršenje (popunjava se nakon)
  stvarni_setovi INTEGER,
  stvarna_ponavljanja TEXT,
  koristeno_opterecenje TEXT,
  napomene_izvrsenja TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, redni_broj)
);

CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON training_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_library ON training_session_exercises(exercise_library_id);


-- ============================================
-- 6. TRAINER OVERRIDES TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS training_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  trener_id UUID NOT NULL,
  
  -- Tip i lokacija override-a
  tip TEXT NOT NULL CHECK (tip IN ('zamjena_vjezbe', 'promjena_setova', 'promjena_ponavljanja', 'promjena_opreme', 'zakljucavanje')),
  lokacija_path TEXT, -- npr. "mezociklus_1.tjedan_2.trening_1.vjezba_3"
  
  -- Vrijednosti
  originalna_vrijednost JSONB,
  nova_vrijednost JSONB,
  razlog TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overrides_program ON training_overrides(program_id);
CREATE INDEX IF NOT EXISTS idx_overrides_trener ON training_overrides(trener_id);


-- ============================================
-- 7. PROGRAM TEMPLATES TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS training_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv TEXT NOT NULL,
  opis TEXT,
  
  -- Konfiguracija
  cilj TEXT NOT NULL,
  razina TEXT NOT NULL,
  trajanje_tjedana INTEGER NOT NULL,
  split_tip TEXT NOT NULL,
  treninzi_tjedno INTEGER NOT NULL,
  
  -- Template podaci (kompletan program kao JSONB)
  program_data JSONB NOT NULL,
  
  -- Meta
  kreirao_trener_id UUID,
  javno_dostupan BOOLEAN DEFAULT FALSE,
  broj_koristenja INTEGER DEFAULT 0,
  ocjena DECIMAL(2,1) CHECK (ocjena BETWEEN 0 AND 5),
  tagovi TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_cilj ON training_templates(cilj);
CREATE INDEX IF NOT EXISTS idx_templates_razina ON training_templates(razina);
CREATE INDEX IF NOT EXISTS idx_templates_public ON training_templates(javno_dostupan) WHERE javno_dostupan = TRUE;


-- ============================================
-- 8. EXERCISE LIBRARY CACHE TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS exercise_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  naziv_hr TEXT NOT NULL,
  force TEXT,
  level TEXT,
  mechanic TEXT,
  equipment TEXT,
  oprema_hr TEXT,
  primary_muscles TEXT[] DEFAULT '{}',
  primarne_grupe_hr TEXT[] DEFAULT '{}',
  secondary_muscles TEXT[] DEFAULT '{}',
  sekundarne_grupe_hr TEXT[] DEFAULT '{}',
  instructions TEXT[] DEFAULT '{}',
  upute_hr TEXT[] DEFAULT '{}',
  category TEXT,
  movement_pattern TEXT,
  potrebna_tehnika_razina TEXT,
  
  -- IFT specifično
  minimalni_setovi_tjedno INTEGER,
  maksimalni_setovi_tjedno INTEGER,
  idealan_rep_range TEXT,
  kontraindikacije TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_lib_muscle ON exercise_library USING GIN(primarne_grupe_hr);
CREATE INDEX IF NOT EXISTS idx_exercise_lib_pattern ON exercise_library(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_exercise_lib_level ON exercise_library(level);


-- ============================================
-- 9. RLS POLICIES
-- ============================================

-- Omogući RLS na svim tablicama
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

-- Policy za training_plans - klijent vidi svoje, trener vidi svoje klijente
CREATE POLICY IF NOT EXISTS "Users can view own training plans"
  ON training_plans FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = trener_id);

CREATE POLICY IF NOT EXISTS "Trainers can insert training plans"
  ON training_plans FOR INSERT
  WITH CHECK (auth.uid() = trener_id OR auth.uid() = client_id);

CREATE POLICY IF NOT EXISTS "Trainers can update training plans"
  ON training_plans FOR UPDATE
  USING (auth.uid() = trener_id OR auth.uid() = client_id);

-- Policy za templates - javne vide svi, privatne samo kreator
CREATE POLICY IF NOT EXISTS "Public templates visible to all"
  ON training_templates FOR SELECT
  USING (javno_dostupan = TRUE OR auth.uid() = kreirao_trener_id);


-- ============================================
-- 10. TRIGGER ZA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dodaj trigger na sve tablice
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY['training_plans', 'training_mesocycles', 'training_weeks', 
                        'training_sessions', 'training_session_exercises', 'training_templates',
                        'exercise_library'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;


-- ============================================
-- 11. HELPER FUNKCIJE
-- ============================================

-- Funkcija za dohvat kompletnog programa s mezociklusima
CREATE OR REPLACE FUNCTION get_complete_training_program(p_program_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'program', to_jsonb(tp.*),
    'mezociklusi', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'mezociklus', to_jsonb(tm.*),
          'tjedni', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'tjedan', to_jsonb(tw.*),
                'treninzi', (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'trening', to_jsonb(ts.*),
                      'vjezbe', (
                        SELECT jsonb_agg(to_jsonb(tse.*) ORDER BY tse.redni_broj)
                        FROM training_session_exercises tse
                        WHERE tse.session_id = ts.id
                      )
                    ) ORDER BY ts.dan_u_tjednu
                  )
                  FROM training_sessions ts
                  WHERE ts.week_id = tw.id
                )
              ) ORDER BY tw.tjedan_broj
            )
            FROM training_weeks tw
            WHERE tw.mesocycle_id = tm.id
          )
        ) ORDER BY tm.redni_broj
      )
      FROM training_mesocycles tm
      WHERE tm.program_id = tp.id
    )
  ) INTO result
  FROM training_plans tp
  WHERE tp.id = p_program_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- GOTOVO!
-- ============================================

COMMENT ON TABLE training_plans IS 'Glavni trening programi - PRO verzija s podrškom za periodizaciju';
COMMENT ON TABLE training_mesocycles IS 'Mezociklusi unutar programa - faze periodizacije';
COMMENT ON TABLE training_weeks IS 'Tjedni unutar mezociklusa';
COMMENT ON TABLE training_sessions IS 'Pojedinačni treninzi unutar tjedna';
COMMENT ON TABLE training_session_exercises IS 'Vježbe unutar treninga s detaljnim parametrima';
COMMENT ON TABLE training_overrides IS 'Trener prilagodbe i override-ovi';
COMMENT ON TABLE training_templates IS 'Predlošci programa za brzo kreiranje';
COMMENT ON TABLE exercise_library IS 'Cache vježbi iz lokalne baze';

