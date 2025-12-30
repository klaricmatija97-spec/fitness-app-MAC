-- ============================================
-- MANUAL BUILDER MIGRATION
-- ============================================
-- Dodaje podršku za MANUAL/HYBRID kreiranje programa
-- Trener može ručno definirati mezocikluse, tjedne i treninge
-- 
-- source tipovi:
--   'auto'   - potpuno automatski generirano
--   'manual' - potpuno ručno kreirano
--   'hybrid' - kombinacija auto + manual
-- ============================================

-- 1. DODAJ source STUPAC U training_programs
-- ============================================

ALTER TABLE training_programs
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'auto' 
  CHECK (source IN ('auto', 'manual', 'hybrid'));

COMMENT ON COLUMN training_programs.source IS 'Način kreiranja: auto (generator), manual (trener), hybrid (kombinacija)';

-- 2. DODAJ is_manual STUPAC U mesocycles
-- ============================================

ALTER TABLE mesocycles
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN mesocycles.is_manual IS 'True ako je mezociklus ručno kreiran od trenera';

-- 3. DODAJ is_manual STUPAC U program_sessions
-- ============================================

ALTER TABLE program_sessions
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN program_sessions.is_manual IS 'True ako je sesija ručno kreirana od trenera';

-- 4. DODAJ is_manual STUPAC U session_exercises
-- ============================================

ALTER TABLE session_exercises
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN session_exercises.is_manual IS 'True ako je vježba ručno dodana od trenera';

-- 5. DODAJ manual_order STUPAC ZA CUSTOM REDOSLIJED
-- ============================================

ALTER TABLE mesocycles
ADD COLUMN IF NOT EXISTS manual_order INTEGER;

ALTER TABLE program_sessions
ADD COLUMN IF NOT EXISTS manual_order INTEGER;

ALTER TABLE session_exercises
ADD COLUMN IF NOT EXISTS manual_order INTEGER;

-- 6. INDEX ZA BRŽE FILTRIRANJE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_programs_source ON training_programs(source);
CREATE INDEX IF NOT EXISTS idx_mesocycles_manual ON mesocycles(is_manual) WHERE is_manual = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_manual ON program_sessions(is_manual) WHERE is_manual = TRUE;

-- 7. HELPER VIEW - UNIFIED PROGRAM VIEW
-- ============================================

CREATE OR REPLACE VIEW v_program_overview AS
SELECT 
  p.id AS program_id,
  p.name AS program_name,
  p.goal,
  p.level,
  p.split_type,
  p.duration_weeks,
  p.sessions_per_week,
  p.source AS program_source,
  p.status,
  p.client_id,
  p.trainer_id,
  COUNT(DISTINCT m.id) AS total_mesocycles,
  COUNT(DISTINCT CASE WHEN m.is_manual THEN m.id END) AS manual_mesocycles,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT CASE WHEN s.is_manual THEN s.id END) AS manual_sessions,
  COUNT(DISTINCT e.id) AS total_exercises,
  COUNT(DISTINCT CASE WHEN e.is_manual THEN e.id END) AS manual_exercises,
  p.created_at,
  p.updated_at
FROM training_programs p
LEFT JOIN mesocycles m ON m.program_id = p.id
LEFT JOIN program_sessions s ON s.program_id = p.id
LEFT JOIN session_exercises e ON e.session_id = s.id
GROUP BY p.id;

COMMENT ON VIEW v_program_overview IS 'Pregled programa s statistikama auto vs manual komponenti';

-- ============================================
-- GOTOVO!
-- ============================================
-- Dodani stupci:
-- ✅ training_programs.source (auto/manual/hybrid)
-- ✅ mesocycles.is_manual
-- ✅ program_sessions.is_manual
-- ✅ session_exercises.is_manual
-- ✅ manual_order stupci za custom redoslijed
-- ✅ v_program_overview view
-- ============================================

