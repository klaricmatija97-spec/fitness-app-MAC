-- ============================================
-- GENERATOR LOGS TABLICA
-- ============================================
-- Tablica za praćenje generiranja programa (debug)
-- Pokreni u Supabase SQL Editoru
-- ============================================

CREATE TABLE IF NOT EXISTS generator_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES training_plans(id) ON DELETE CASCADE,
  tip TEXT NOT NULL CHECK (tip IN ('info', 'warning', 'error', 'debug')),
  poruka TEXT NOT NULL,
  podaci JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index za brže pretrage
CREATE INDEX IF NOT EXISTS idx_generator_logs_program ON generator_logs(program_id);
CREATE INDEX IF NOT EXISTS idx_generator_logs_tip ON generator_logs(tip);
CREATE INDEX IF NOT EXISTS idx_generator_logs_created ON generator_logs(created_at DESC);

-- RLS
ALTER TABLE generator_logs ENABLE ROW LEVEL SECURITY;

-- Policy - samo service role može pristupiti
CREATE POLICY "Service role can manage generator_logs"
  ON generator_logs FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE generator_logs IS 'Logovi PRO generatora za debugging';

