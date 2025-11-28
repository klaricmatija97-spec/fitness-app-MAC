DROP POLICY IF EXISTS "Service role can manage clients" ON clients;
DROP POLICY IF EXISTS "Service role can manage programs" ON client_programs;
DROP POLICY IF EXISTS "Service role can manage user_accounts" ON user_accounts;
DROP POLICY IF EXISTS "Service role can manage client_calculations" ON client_calculations;
DROP POLICY IF EXISTS "Service role can manage meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Service role can manage training_plans" ON training_plans;
DROP POLICY IF EXISTS "Service role can manage workout_sessions" ON workout_sessions;
DROP POLICY IF EXISTS "Service role can manage chat_messages" ON chat_messages;

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

