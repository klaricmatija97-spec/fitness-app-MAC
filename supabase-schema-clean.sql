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
  has_paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMPTZ,
  subscription_active BOOLEAN DEFAULT FALSE,
  username TEXT UNIQUE,
  temp_password TEXT,
  password_changed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_client_programs_client_id ON client_programs(client_id);

CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_client_id ON user_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON user_accounts(username);

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
  activity_level TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_calculations_client_id ON client_calculations(client_id);

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

CREATE INDEX IF NOT EXISTS idx_meal_plans_client_id ON meal_plans(client_id);

CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  exercises JSONB NOT NULL,
  warmup_type TEXT NOT NULL CHECK (warmup_type IN ('treadmill', 'bike', 'bodyweight')),
  estimated_calories_burned NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_plans_client_id ON training_plans(client_id);

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

CREATE INDEX IF NOT EXISTS idx_workout_sessions_client_id ON workout_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON chat_messages(client_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Service role can manage clients') THEN
    DROP POLICY "Service role can manage clients" ON clients;
  END IF;
END $$;

CREATE POLICY "Service role can manage clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_programs' AND policyname = 'Service role can manage programs') THEN
    DROP POLICY "Service role can manage programs" ON client_programs;
  END IF;
END $$;

CREATE POLICY "Service role can manage programs"
  ON client_programs FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_accounts' AND policyname = 'Service role can manage user_accounts') THEN
    DROP POLICY "Service role can manage user_accounts" ON user_accounts;
  END IF;
END $$;

CREATE POLICY "Service role can manage user_accounts"
  ON user_accounts FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_calculations' AND policyname = 'Service role can manage client_calculations') THEN
    DROP POLICY "Service role can manage client_calculations" ON client_calculations;
  END IF;
END $$;

CREATE POLICY "Service role can manage client_calculations"
  ON client_calculations FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plans' AND policyname = 'Service role can manage meal_plans') THEN
    DROP POLICY "Service role can manage meal_plans" ON meal_plans;
  END IF;
END $$;

CREATE POLICY "Service role can manage meal_plans"
  ON meal_plans FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_plans' AND policyname = 'Service role can manage training_plans') THEN
    DROP POLICY "Service role can manage training_plans" ON training_plans;
  END IF;
END $$;

CREATE POLICY "Service role can manage training_plans"
  ON training_plans FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workout_sessions' AND policyname = 'Service role can manage workout_sessions') THEN
    DROP POLICY "Service role can manage workout_sessions" ON workout_sessions;
  END IF;
END $$;

CREATE POLICY "Service role can manage workout_sessions"
  ON workout_sessions FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Service role can manage chat_messages') THEN
    DROP POLICY "Service role can manage chat_messages" ON chat_messages;
  END IF;
END $$;

CREATE POLICY "Service role can manage chat_messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

