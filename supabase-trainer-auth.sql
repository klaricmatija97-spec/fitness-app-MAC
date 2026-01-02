-- ============================================
-- TRAINER AUTHENTICATION MIGRATION
-- ============================================
-- Dodaje potrebne stupce za trener autentikaciju
-- 
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- 1. Dodaj password_hash stupac u trainers tablicu
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN trainers.password_hash IS 'Bcrypt hash lozinke trenera';

-- 2. Dodaj last_login stupac za praćenje zadnje prijave
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

COMMENT ON COLUMN trainers.last_login IS 'Vrijeme zadnje prijave trenera';

-- 3. Dodaj refresh_token stupac za JWT refresh tokene (opcijalno - za revokaciju)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;

COMMENT ON COLUMN trainers.refresh_token_hash IS 'Hash refresh tokena za sigurnu revokaciju';

-- ============================================
-- DEMO TRENER S LOZINKOM
-- ============================================
-- Lozinka: "demo123" -> bcrypt hash
-- Za testiranje, možete koristiti: https://bcrypt-generator.com/

-- Ažuriraj postojećeg demo trenera ako postoji
UPDATE trainers
SET password_hash = '$2a$10$rC9vKkjPpZS0jAhN8xOPxuF9rN6h5u0RCF.SRpKx0DjKz0EGvpXKu'
WHERE email = 'demo@trainer.com';

-- ============================================
-- PROVJERA
-- ============================================
SELECT 
  id,
  name,
  email,
  trainer_code,
  CASE WHEN password_hash IS NOT NULL THEN 'DA' ELSE 'NE' END AS ima_lozinku,
  last_login
FROM trainers
LIMIT 10;

