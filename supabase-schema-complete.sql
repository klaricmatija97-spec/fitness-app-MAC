-- COMPLETE CORPEX Database Schema for Supabase
-- Pokreni ovu skriptu u Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- Kopiraj SAV sadržaj i klikni RUN

-- ============================================
-- PART 1: Base Schema (Onboarding)
-- ============================================

-- Create clients table to store intake form submissions
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  honorific TEXT NOT NULL,
  age_range TEXT NOT NULL,
  weight_value NUMERIC NOT NULL,
  weight_unit TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lb')),
  height_value NUMERIC NOT NULL,
  height_unit TEXT NOT NULL CHECK (height_unit IN ('cm', 'in')),
  activities TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  diet_cleanliness INTEGER NOT NULL CHECK (diet_cleanliness >= 0 AND diet_cleanliness <= 100),
  other_activities TEXT,
  other_goals TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Create client_programs table to link clients with their assigned plans
CREATE TABLE IF NOT EXISTS client_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meal_plan_id TEXT,
  training_plan_id TEXT,
  phase TEXT DEFAULT 'intake',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_programs_client_id ON client_programs(client_id);

-- ============================================
-- PART 2: Phase 2 Extensions (Payment, Login, Calculations, Plans)
-- ============================================

-- Add payment and subscription fields to clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS has_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT FALSE;

-- Create user accounts table for login
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  UNIQUE(client_id)
);

-- Create client_calculations table for calories and macros
CREATE TABLE IF NOT EXISTS client_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  bmr NUMERIC NOT NULL,
  tdee NUMERIC NOT NULL,
  target_calories NUMERIC NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  protein_grams NUMERIC NOT NULL,
  carbs_grams NUMERIC NOT NULL,
  fats_grams NUMERIC NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  meals JSONB NOT NULL,
  total_calories NUMERIC NOT NULL,
  total_protein NUMERIC NOT NULL,
  total_carbs NUMERIC NOT NULL,
  total_fats NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create training_plans table
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  exercises JSONB NOT NULL,
  warmup_type TEXT NOT NULL CHECK (warmup_type IN ('treadmill', 'bike', 'bodyweight')),
  estimated_calories_burned NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workout_sessions table for tracking workouts
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  training_plan_id UUID REFERENCES training_plans(id),
  date DATE NOT NULL,
  exercises_completed JSONB NOT NULL,
  calories_burned NUMERIC,
  duration_minutes INTEGER,
  watch_data JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table for AI chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_accounts_client_id ON user_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_client_calculations_client_id ON client_calculations(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_id ON meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_client_id ON training_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON chat_messages(client_id);

-- ============================================
-- PART 4: Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: Security Policies (Service Role)
-- ============================================

-- Allow service role full access (used by API with service_role_key)
CREATE POLICY "Service role can manage clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage programs"
  ON client_programs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage user_accounts"
  ON user_accounts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage client_calculations"
  ON client_calculations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage meal_plans"
  ON meal_plans FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage training_plans"
  ON training_plans FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage workout_sessions"
  ON workout_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage chat_messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 6: Triggers
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at on clients table
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS! Sve tabele su kreirane.
-- ============================================

