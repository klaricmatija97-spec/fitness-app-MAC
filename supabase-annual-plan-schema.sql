-- ============================================
-- ANNUAL PLAN SCHEMA MIGRATION
-- ============================================
-- 
-- Omogućava treneru da kreira godišnji plan (makrociklus)
-- koji se sastoji od više mezociklusa
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- ============================================
-- 1. ANNUAL PROGRAMS TABLICA
-- ============================================

CREATE TABLE IF NOT EXISTS annual_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL,
  
  -- Osnovne informacije
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER NOT NULL, -- 2024, 2025, itd.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_annual_programs_client ON annual_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_annual_programs_trainer ON annual_programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_annual_programs_year ON annual_programs(year);
CREATE INDEX IF NOT EXISTS idx_annual_programs_status ON annual_programs(status);

-- ============================================
-- 2. ANNUAL PLAN MESOCYCLES (LINK TABLICA)
-- ============================================
-- Povezuje annual_programs s mezociklusima iz training_programs

CREATE TABLE IF NOT EXISTS annual_plan_mesocycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_program_id UUID NOT NULL REFERENCES annual_programs(id) ON DELETE CASCADE,
  
  -- Referenca na training_program (koji sadrži mezocikluse)
  training_program_id UUID NOT NULL,
  
  -- Pozicija unutar godišnjeg plana
  order_index INTEGER NOT NULL,
  planned_start_date DATE,
  planned_end_date DATE,
  
  -- Status mezociklusa unutar godišnjeg plana
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'skipped')),
  
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(annual_program_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_annual_plan_mesocycles_annual ON annual_plan_mesocycles(annual_program_id);
CREATE INDEX IF NOT EXISTS idx_annual_plan_mesocycles_program ON annual_plan_mesocycles(training_program_id);
CREATE INDEX IF NOT EXISTS idx_annual_plan_mesocycles_order ON annual_plan_mesocycles(annual_program_id, order_index);

-- ============================================
-- 3. COMMENTS / NOTES
-- ============================================

COMMENT ON TABLE annual_programs IS 'Godišnji planovi (makrociklusi) za klijente';
COMMENT ON TABLE annual_plan_mesocycles IS 'Povezivanje mezociklusa s godišnjim planom';
COMMENT ON COLUMN annual_programs.year IS 'Godina za koju je plan kreiran (2024, 2025, itd.)';
COMMENT ON COLUMN annual_plan_mesocycles.order_index IS 'Redoslijed mezociklusa unutar godišnjeg plana (1, 2, 3, ...)';
COMMENT ON COLUMN annual_plan_mesocycles.status IS 'Status mezociklusa: planned (planiran), active (aktivan), completed (završen), skipped (preskočen)';

-- ============================================
-- GOTOVO!
-- ============================================
-- Dodane tablice:
-- ✅ annual_programs - glavni godišnji plan
-- ✅ annual_plan_mesocycles - povezivanje mezociklusa s planom
-- ============================================

