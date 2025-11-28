-- Phase 2 Database Schema - DODATNI SQL
-- Pokreni ovu skriptu u Supabase SQL Editor
-- Ovo će dodati sve tabele koje nedostaju

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_accounts_client_id ON user_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_client_calculations_client_id ON client_calculations(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_id ON meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_client_id ON training_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON chat_messages(client_id);

-- Enable RLS
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Service role policies
-- Prvo obriši ako postoje, zatim kreiraj
DROP POLICY IF EXISTS "Service role can manage user_accounts" ON user_accounts;
CREATE POLICY "Service role can manage user_accounts"
  ON user_accounts FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage client_calculations" ON client_calculations;
CREATE POLICY "Service role can manage client_calculations"
  ON client_calculations FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage meal_plans" ON meal_plans;
CREATE POLICY "Service role can manage meal_plans"
  ON meal_plans FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage training_plans" ON training_plans;
CREATE POLICY "Service role can manage training_plans"
  ON training_plans FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage workout_sessions" ON workout_sessions;
CREATE POLICY "Service role can manage workout_sessions"
  ON workout_sessions FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage chat_messages" ON chat_messages;
CREATE POLICY "Service role can manage chat_messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');

