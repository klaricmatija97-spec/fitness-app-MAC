-- ============================================
-- WORKOUT LOGS MIGRATION
-- ============================================
-- Kreira workout_logs tablicu za praćenje completed training sessions
-- 
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- ============================================
-- 1. WORKOUT LOGS TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Povezanost
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  program_id UUID REFERENCES training_programs(id) ON DELETE SET NULL,
  session_id UUID REFERENCES program_sessions(id) ON DELETE SET NULL,
  week_id UUID REFERENCES program_weeks(id) ON DELETE SET NULL,
  mesocycle_id UUID REFERENCES mesocycles(id) ON DELETE SET NULL,
  
  -- Vrijeme
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL, -- Izračunato: (completed_at - started_at) / 60
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'skipped')),
  adherence_score NUMERIC(5,2) DEFAULT 100.0, -- 0-100, izračunato na temelju completed exercises
  
  -- Statistike
  total_exercises INTEGER NOT NULL DEFAULT 0,
  completed_exercises INTEGER NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  completed_sets INTEGER NOT NULL DEFAULT 0,
  total_volume NUMERIC(10,2) DEFAULT 0, -- Ukupni volumen (sets × reps × weight)
  
  -- Napomene
  client_notes TEXT,
  trainer_notes TEXT,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE workout_logs IS 'Logovi completed workout sessions - za praćenje napretka i adherence';
COMMENT ON COLUMN workout_logs.adherence_score IS 'Procenat adherence (0-100) - izračunato na temelju completed exercises';
COMMENT ON COLUMN workout_logs.total_volume IS 'Ukupni volumen u kg (sets × reps × weight)';

-- ============================================
-- 2. WORKOUT LOG EXERCISES TABLICA
-- ============================================
-- Detalji o svakoj vježbi u completed sessionu

CREATE TABLE IF NOT EXISTS workout_log_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Povezanost
  workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES session_exercises(id) ON DELETE SET NULL,
  exercise_library_id TEXT, -- ID iz exercise library (fallback)
  
  -- Vježba info
  exercise_name TEXT NOT NULL,
  exercise_name_en TEXT,
  exercise_type TEXT, -- 'compound' | 'isolation'
  primary_muscles TEXT[], -- Array mišićnih grupa
  
  -- Planirano (iz originalnog programa)
  planned_sets INTEGER,
  planned_reps_min INTEGER,
  planned_reps_max INTEGER,
  planned_weight NUMERIC(10,2),
  planned_rir INTEGER, -- RIR iz programa
  
  -- Ostvareno
  completed_sets INTEGER NOT NULL DEFAULT 0,
  substituted BOOLEAN DEFAULT FALSE, -- Je li vježba zamijenjena
  substitution_reason TEXT,
  
  -- Napomene i problemi
  client_notes TEXT,
  pain_reported BOOLEAN DEFAULT FALSE,
  difficulty_reported BOOLEAN DEFAULT FALSE,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE workout_log_exercises IS 'Detalji o svakoj vježbi u completed workout sessionu';

-- ============================================
-- 3. WORKOUT LOG SETS TABLICA
-- ============================================
-- Detalji o svakom setu svake vježbe

CREATE TABLE IF NOT EXISTS workout_log_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Povezanost
  workout_log_exercise_id UUID NOT NULL REFERENCES workout_log_exercises(id) ON DELETE CASCADE,
  
  -- Set info
  set_number INTEGER NOT NULL, -- 1, 2, 3...
  is_warmup BOOLEAN DEFAULT FALSE,
  
  -- Planirano
  planned_reps INTEGER,
  planned_weight NUMERIC(10,2),
  planned_rir INTEGER,
  
  -- Ostvareno
  completed BOOLEAN DEFAULT TRUE,
  reps INTEGER, -- Stvarni broj ponavljanja
  weight NUMERIC(10,2), -- Težina u kg
  rir INTEGER CHECK (rir >= 0 AND rir <= 10), -- Reps in Reserve
  rpe NUMERIC(3,1) CHECK (rpe >= 1.0 AND rpe <= 10.0), -- Rate of Perceived Exertion
  
  -- Napomene
  notes TEXT,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE workout_log_sets IS 'Detalji o svakom setu u completed workout sessionu';

-- ============================================
-- 4. INDEXI ZA PERFORMANSU
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_id ON workout_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_program_id ON workout_logs(program_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_session_id ON workout_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_started_at ON workout_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_status ON workout_logs(status);
CREATE INDEX IF NOT EXISTS idx_workout_logs_adherence ON workout_logs(adherence_score);

CREATE INDEX IF NOT EXISTS idx_workout_log_exercises_log_id ON workout_log_exercises(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_workout_log_exercises_exercise_id ON workout_log_exercises(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_log_sets_exercise_id ON workout_log_sets(workout_log_exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_log_sets_set_number ON workout_log_sets(set_number);

-- ============================================
-- 5. TRIGGERI ZA updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_workout_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workout_logs_updated_at
  BEFORE UPDATE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_logs_updated_at();

CREATE TRIGGER trigger_workout_log_exercises_updated_at
  BEFORE UPDATE ON workout_log_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_log_sets ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role can manage workout_logs"
  ON workout_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage workout_log_exercises"
  ON workout_log_exercises FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage workout_log_sets"
  ON workout_log_sets FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 7. HELPER VIEW - WORKOUT LOGS SUMMARY
-- ============================================
-- Pojednostavljeni pregled za trenere

CREATE OR REPLACE VIEW v_workout_logs_summary AS
SELECT 
  wl.id,
  wl.client_id,
  wl.program_id,
  wl.session_id,
  wl.started_at,
  wl.completed_at,
  wl.duration_minutes,
  wl.status,
  wl.adherence_score,
  wl.total_exercises,
  wl.completed_exercises,
  wl.total_sets,
  wl.completed_sets,
  wl.total_volume,
  wl.client_notes,
  wl.trainer_notes,
  -- Program info
  tp.name AS program_name,
  tp.goal AS program_goal,
  -- Session info
  ps.split_name AS session_name,
  ps.day_of_week,
  -- Client info
  c.name AS client_name,
  c.email AS client_email
FROM workout_logs wl
LEFT JOIN training_programs tp ON tp.id = wl.program_id
LEFT JOIN program_sessions ps ON ps.id = wl.session_id
LEFT JOIN clients c ON c.id = wl.client_id;

COMMENT ON VIEW v_workout_logs_summary IS 'Pojednostavljeni pregled workout logs za trenere';

-- ============================================
-- 8. HELPER FUNCTION - IZRAČUNAJ ADHERENCE
-- ============================================

CREATE OR REPLACE FUNCTION calculate_adherence_score(
  completed_exercises INTEGER,
  total_exercises INTEGER
)
RETURNS NUMERIC(5,2) AS $$
BEGIN
  IF total_exercises = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((completed_exercises::NUMERIC / total_exercises::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_adherence_score IS 'Izračunava adherence score (0-100) na temelju completed/total exercises';

-- ============================================
-- 9. PROVJERA
-- ============================================

-- Provjeri da li su tablice kreirane
SELECT 
  'workout_logs' AS table_name,
  COUNT(*) AS row_count
FROM workout_logs
UNION ALL
SELECT 
  'workout_log_exercises',
  COUNT(*)
FROM workout_log_exercises
UNION ALL
SELECT 
  'workout_log_sets',
  COUNT(*)
FROM workout_log_sets;

