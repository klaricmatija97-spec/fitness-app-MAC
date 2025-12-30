-- ============================================
-- PRO TRAINING GENERATOR - OPTIMIZIRANA MIGRACIJA
-- ============================================
-- 
-- Ova migracija SAMO DODAJE nove tablice i stupce
-- NE DIRA postojeće tablice osim dodavanja stupaca
--
-- POSTOJEĆE tablice koje već imaš:
-- ✅ clients
-- ✅ training_plans (dodajemo samo nove stupce)
-- ✅ workout_sessions
-- ✅ workout_exercises
--
-- NOVE tablice koje kreiramo:
-- 🆕 training_mesocycles
-- 🆕 training_weeks  
-- 🆕 training_sessions (proširena verzija)
-- 🆕 training_session_exercises
-- 🆕 training_overrides
-- 🆕 training_templates
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================


-- ============================================
-- 1. DODAJ NOVE STUPCE U POSTOJEĆU training_plans
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

-- Dodaj check constraints ako ne postoje
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

-- Dodaj indexe za nove stupce
CREATE INDEX IF NOT EXISTS idx_training_plans_trener ON training_plans(trener_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);
CREATE INDEX IF NOT EXISTS idx_training_plans_template ON training_plans(je_template) WHERE je_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_plans_cilj ON training_plans(cilj);


-- ============================================
-- 2. KREIRAJ training_mesocycles TABLICU
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
  pocetni_volumen_po_grupi JSONB,
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

COMMENT ON TABLE training_mesocycles IS 'Mezociklusi unutar programa - faze periodizacije prema IFT';


-- ============================================
-- 3. KREIRAJ training_weeks TABLICU
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

COMMENT ON TABLE training_weeks IS 'Tjedni unutar mezociklusa s modifikatorima volumena/intenziteta';


-- ============================================
-- 4. KREIRAJ training_sessions TABLICU (proširena)
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
  stvarno_trajanje_min INTEGER,
  izvrseno_na TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_week ON training_sessions(week_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dan ON training_sessions(dan_u_tjednu);

COMMENT ON TABLE training_sessions IS 'Pojedinačni treninzi unutar tjedna';


-- ============================================
-- 5. KREIRAJ training_session_exercises TABLICU
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
  tempo TEXT,
  rir INTEGER CHECK (rir IS NULL OR rir BETWEEN 0 AND 5),
  rpe DECIMAL(3,1) CHECK (rpe IS NULL OR rpe BETWEEN 5 AND 10),
  postotak_1rm INTEGER CHECK (postotak_1rm IS NULL OR postotak_1rm BETWEEN 20 AND 100),
  
  -- Meta
  tip_vjezbe TEXT CHECK (tip_vjezbe IS NULL OR tip_vjezbe IN ('compound', 'isolation')),
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

COMMENT ON TABLE training_session_exercises IS 'Vježbe unutar treninga s detaljnim parametrima prema IFT';


-- ============================================
-- 6. KREIRAJ training_overrides TABLICU
-- ============================================

CREATE TABLE IF NOT EXISTS training_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  trener_id UUID NOT NULL,
  
  -- Tip i lokacija override-a
  tip TEXT NOT NULL CHECK (tip IN ('zamjena_vjezbe', 'promjena_setova', 'promjena_ponavljanja', 'promjena_opreme', 'zakljucavanje')),
  lokacija_path TEXT,
  
  -- Vrijednosti
  originalna_vrijednost JSONB,
  nova_vrijednost JSONB,
  razlog TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overrides_program ON training_overrides(program_id);
CREATE INDEX IF NOT EXISTS idx_overrides_trener ON training_overrides(trener_id);

COMMENT ON TABLE training_overrides IS 'Trener prilagodbe i override-ovi programa';


-- ============================================
-- 7. KREIRAJ training_templates TABLICU
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
  
  -- Template podaci
  program_data JSONB NOT NULL,
  
  -- Meta
  kreirao_trener_id UUID,
  javno_dostupan BOOLEAN DEFAULT FALSE,
  broj_koristenja INTEGER DEFAULT 0,
  ocjena DECIMAL(2,1) CHECK (ocjena IS NULL OR ocjena BETWEEN 0 AND 5),
  tagovi TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_cilj ON training_templates(cilj);
CREATE INDEX IF NOT EXISTS idx_templates_razina ON training_templates(razina);
CREATE INDEX IF NOT EXISTS idx_templates_public ON training_templates(javno_dostupan) WHERE javno_dostupan = TRUE;

COMMENT ON TABLE training_templates IS 'Predlošci programa za brzo kreiranje';


-- ============================================
-- 8. RLS POLICIES ZA NOVE TABLICE
-- ============================================

ALTER TABLE training_mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

-- Service role policies (za API)
CREATE POLICY "Service role can manage mesocycles"
  ON training_mesocycles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage weeks"
  ON training_weeks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage sessions"
  ON training_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage session_exercises"
  ON training_session_exercises FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage overrides"
  ON training_overrides FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage templates"
  ON training_templates FOR ALL
  USING (auth.role() = 'service_role');

-- Public templates readable by all
CREATE POLICY "Public templates visible to all"
  ON training_templates FOR SELECT
  USING (javno_dostupan = TRUE);


-- ============================================
-- 9. TRIGGER ZA UPDATED_AT
-- ============================================

-- Koristi postojeću funkciju update_updated_at_column() 
-- (već kreirana u supabase-schema.sql)

DROP TRIGGER IF EXISTS set_mesocycles_updated_at ON training_mesocycles;
CREATE TRIGGER set_mesocycles_updated_at
  BEFORE UPDATE ON training_mesocycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_weeks_updated_at ON training_weeks;
CREATE TRIGGER set_weeks_updated_at
  BEFORE UPDATE ON training_weeks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_sessions_updated_at ON training_sessions;
CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_session_exercises_updated_at ON training_session_exercises;
CREATE TRIGGER set_session_exercises_updated_at
  BEFORE UPDATE ON training_session_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_templates_updated_at ON training_templates;
CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON training_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 10. HELPER FUNKCIJA
-- ============================================

CREATE OR REPLACE FUNCTION get_complete_training_program(p_program_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'program', to_jsonb(tp.*),
    'mezociklusi', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'mezociklus', to_jsonb(tm.*),
          'tjedni', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'tjedan', to_jsonb(tw.*),
                'treninzi', (
                  SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                      'trening', to_jsonb(ts.*),
                      'vjezbe', (
                        SELECT COALESCE(jsonb_agg(to_jsonb(tse.*) ORDER BY tse.redni_broj), '[]'::jsonb)
                        FROM training_session_exercises tse
                        WHERE tse.session_id = ts.id
                      )
                    ) ORDER BY ts.dan_u_tjednu
                  ), '[]'::jsonb)
                  FROM training_sessions ts
                  WHERE ts.week_id = tw.id
                )
              ) ORDER BY tw.tjedan_broj
            ), '[]'::jsonb)
            FROM training_weeks tw
            WHERE tw.mesocycle_id = tm.id
          )
        ) ORDER BY tm.redni_broj
      ), '[]'::jsonb)
      FROM training_mesocycles tm
      WHERE tm.program_id = tp.id
    )
  ) INTO result
  FROM training_plans tp
  WHERE tp.id = p_program_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_complete_training_program IS 'Dohvaća kompletan program s mezociklusima, tjednima, treninzima i vježbama';


-- ============================================
-- GOTOVO!
-- ============================================
-- 
-- Migracija je završena. Kreirane su:
-- ✅ Novi stupci u training_plans
-- ✅ training_mesocycles tablica
-- ✅ training_weeks tablica
-- ✅ training_sessions tablica
-- ✅ training_session_exercises tablica
-- ✅ training_overrides tablica
-- ✅ training_templates tablica
-- ✅ RLS policies
-- ✅ Indexi
-- ✅ Triggeri
-- ✅ Helper funkcija
--
-- ============================================

