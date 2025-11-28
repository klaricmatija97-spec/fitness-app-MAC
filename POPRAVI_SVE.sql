-- KOMPLETNI FIX ZA SVE TABLICE I POLICIES
-- Pokreni ovaj SQL u Supabase SQL Editor

-- 1. Obriši sve postojeće policies
DROP POLICY IF EXISTS "Service role can manage clients" ON clients;
DROP POLICY IF EXISTS "Service role can manage programs" ON client_programs;
DROP POLICY IF EXISTS "Service role can manage user_accounts" ON user_accounts;
DROP POLICY IF EXISTS "Service role can manage client_calculations" ON client_calculations;
DROP POLICY IF EXISTS "Service role can manage meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Service role can manage training_plans" ON training_plans;
DROP POLICY IF EXISTS "Service role can manage workout_sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Service role can manage chat_messages" ON chat_messages;

-- 2. Kreiraj nove policies koje dozvoljavaju service_role sve operacije
CREATE POLICY "Service role can manage clients"
  ON clients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage programs"
  ON client_programs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage user_accounts"
  ON user_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage client_calculations"
  ON client_calculations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage meal_plans"
  ON meal_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage training_plans"
  ON training_plans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage workout_sessions"
  ON workout_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage chat_messages"
  ON chat_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Provjeri da li su policies kreirane
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

