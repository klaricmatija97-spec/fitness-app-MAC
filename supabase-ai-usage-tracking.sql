-- Tablica za praćenje potrošnje AI agenta (OpenAI API)
-- Pokreni ovu skriptu u Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Kreiraj tablicu za praćenje AI usage-a
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(10, 6) NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, date)
);

-- Kreiraj indexe za brže pretraživanje
CREATE INDEX IF NOT EXISTS idx_ai_usage_client_id ON ai_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_client_date ON ai_usage(client_id, date DESC);

-- Omogući Row Level Security (RLS)
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Kreiraj policy za service role (za API rute)
CREATE POLICY IF NOT EXISTS "Service role can manage ai_usage"
  ON ai_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Dodaj trigger za ažuriranje updated_at
CREATE TRIGGER update_ai_usage_updated_at
  BEFORE UPDATE ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funkcija za provjeru dnevnog limita
CREATE OR REPLACE FUNCTION check_ai_usage_limit(
  p_client_id UUID,
  p_daily_request_limit INTEGER DEFAULT 50,
  p_daily_token_limit INTEGER DEFAULT 100000
)
RETURNS TABLE(
  can_proceed BOOLEAN,
  current_requests INTEGER,
  current_tokens INTEGER,
  remaining_requests INTEGER,
  remaining_tokens INTEGER,
  message TEXT
) AS $$
DECLARE
  v_usage RECORD;
BEGIN
  -- Dohvati današnju potrošnju
  SELECT 
    COALESCE(request_count, 0) as req_count,
    COALESCE(token_count, 0) as tok_count
  INTO v_usage
  FROM ai_usage
  WHERE client_id = p_client_id 
    AND date = CURRENT_DATE;
  
  -- Ako nema zapisa, korisnik još nije koristio AI danas
  IF v_usage IS NULL THEN
    RETURN QUERY SELECT 
      TRUE as can_proceed,
      0 as current_requests,
      0 as current_tokens,
      p_daily_request_limit as remaining_requests,
      p_daily_token_limit as remaining_tokens,
      'OK'::TEXT as message;
    RETURN;
  END IF;
  
  -- Provjeri limite
  IF v_usage.req_count >= p_daily_request_limit THEN
    RETURN QUERY SELECT 
      FALSE as can_proceed,
      v_usage.req_count as current_requests,
      v_usage.tok_count as current_tokens,
      0 as remaining_requests,
      GREATEST(0, p_daily_token_limit - v_usage.tok_count) as remaining_tokens,
      format('Dnevni limit zahtjeva (%s) je dosegnut', p_daily_request_limit)::TEXT as message;
    RETURN;
  END IF;
  
  IF v_usage.tok_count >= p_daily_token_limit THEN
    RETURN QUERY SELECT 
      FALSE as can_proceed,
      v_usage.req_count as current_requests,
      v_usage.tok_count as current_tokens,
      GREATEST(0, p_daily_request_limit - v_usage.req_count) as remaining_requests,
      0 as remaining_tokens,
      format('Dnevni limit tokena (%s) je dosegnut', p_daily_token_limit)::TEXT as message;
    RETURN;
  END IF;
  
  -- Sve je OK
  RETURN QUERY SELECT 
    TRUE as can_proceed,
    v_usage.req_count as current_requests,
    v_usage.tok_count as current_tokens,
    (p_daily_request_limit - v_usage.req_count) as remaining_requests,
    (p_daily_token_limit - v_usage.tok_count) as remaining_tokens,
    'OK'::TEXT as message;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za ažuriranje usage-a nakon zahtjeva
CREATE OR REPLACE FUNCTION update_ai_usage(
  p_client_id UUID,
  p_tokens_used INTEGER DEFAULT 0,
  p_estimated_cost NUMERIC(10, 6) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage (client_id, date, request_count, token_count, estimated_cost, last_request_at)
  VALUES (p_client_id, CURRENT_DATE, 1, p_tokens_used, p_estimated_cost, NOW())
  ON CONFLICT (client_id, date)
  DO UPDATE SET
    request_count = ai_usage.request_count + 1,
    token_count = ai_usage.token_count + p_tokens_used,
    estimated_cost = ai_usage.estimated_cost + p_estimated_cost,
    last_request_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

