-- ============================================
-- Povezivanje programa (za godišnji plan)
-- ============================================
-- Omogućava povezivanje programa tako da klijent može prijeći
-- s jedne faze na drugu automatski

-- Dodaj kolone za povezivanje programa
ALTER TABLE training_programs
ADD COLUMN IF NOT EXISTS annual_program_id UUID REFERENCES annual_programs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS previous_program_id UUID REFERENCES training_programs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_program_id UUID REFERENCES training_programs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase_order INTEGER,
ADD COLUMN IF NOT EXISTS total_phases INTEGER;

-- Indeksi za brže pretraživanje
CREATE INDEX IF NOT EXISTS idx_training_programs_annual ON training_programs(annual_program_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_previous ON training_programs(previous_program_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_next ON training_programs(next_program_id);

-- Komentar
COMMENT ON COLUMN training_programs.annual_program_id IS 'ID godišnjeg plana kojem pripada ovaj program';
COMMENT ON COLUMN training_programs.previous_program_id IS 'ID prethodnog programa u sekvenci (za automatski prijelaz)';
COMMENT ON COLUMN training_programs.next_program_id IS 'ID sljedećeg programa u sekvenci (za automatski prijelaz)';
COMMENT ON COLUMN training_programs.phase_order IS 'Redni broj faze u godišnjem planu (1, 2, 3...)';
COMMENT ON COLUMN training_programs.total_phases IS 'Ukupan broj faza u godišnjem planu';

