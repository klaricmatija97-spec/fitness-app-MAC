-- ============================================
-- TRAINER CONNECT SYSTEM
-- ============================================
-- Sustav za povezivanje klijenata s trenerima
-- Trener ima jedinstveni kod, klijent unese kod i poveže se
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- 1. Kreiraj tablicu za trenere (ako ne postoji)
CREATE TABLE IF NOT EXISTS trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Veza na auth.users ako koristiš Supabase Auth
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  trainer_code VARCHAR(10) UNIQUE NOT NULL, -- Jedinstveni kod (npr. TRN-A3X9)
  bio TEXT,
  specializations TEXT[], -- npr. ['hipertrofija', 'snaga', 'rehabilitacija']
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  max_clients INTEGER DEFAULT 50, -- Maksimalan broj klijenata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dodaj trainer_code stupac ako tablica već postoji
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS trainer_code VARCHAR(10) UNIQUE;

-- 3. Kreiraj index za brže pretrage po kodu
CREATE INDEX IF NOT EXISTS idx_trainers_code ON trainers(trainer_code);
CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);

-- 4. Dodaj connected_at stupac u clients tablicu
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;

-- 5. Dodaj invite_status stupac u clients tablicu
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS invite_status VARCHAR(20) DEFAULT 'connected';
-- Mogući statusi: 'pending', 'connected', 'disconnected'

-- 6. Funkcija za generiranje jedinstvenog trainer koda
CREATE OR REPLACE FUNCTION generate_trainer_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  new_code VARCHAR(10);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generiraj kod format: TRN-XXXX (4 random alfanumerička znaka)
    new_code := 'TRN-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Provjeri da li kod već postoji
    SELECT EXISTS(SELECT 1 FROM trainers WHERE trainer_code = new_code) INTO code_exists;
    
    -- Ako ne postoji, izađi iz petlje
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger za automatsko generiranje koda pri insertu
CREATE OR REPLACE FUNCTION set_trainer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trainer_code IS NULL THEN
    NEW.trainer_code := generate_trainer_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_trainer_code ON trainers;
CREATE TRIGGER trigger_set_trainer_code
  BEFORE INSERT ON trainers
  FOR EACH ROW
  EXECUTE FUNCTION set_trainer_code();

-- 8. Ubaci mock trenera za testiranje (ako ne postoji)
INSERT INTO trainers (id, name, email, trainer_code, specializations)
VALUES (
  '6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7',
  'Demo Trener',
  'trener@demo.com',
  'TRN-DEMO',
  ARRAY['hipertrofija', 'snaga', 'kondicija']
)
ON CONFLICT (id) DO UPDATE SET
  trainer_code = COALESCE(trainers.trainer_code, 'TRN-DEMO');

-- 9. Komentari
COMMENT ON TABLE trainers IS 'Tablica trenera s jedinstvenim kodovima za povezivanje';
COMMENT ON COLUMN trainers.trainer_code IS 'Jedinstveni kod trenera (format: TRN-XXXX) koji klijent koristi za povezivanje';
COMMENT ON COLUMN clients.connected_at IS 'Datum i vrijeme kada se klijent povezao s trenerom';
COMMENT ON COLUMN clients.invite_status IS 'Status pozivnice: pending, connected, disconnected';

-- ============================================
-- GOTOVO!
-- ============================================
-- Dodano:
-- ✅ trainers tablica s trainer_code
-- ✅ Automatsko generiranje koda (TRN-XXXX)
-- ✅ connected_at i invite_status u clients
-- ✅ Demo trener s kodom: TRN-DEMO
-- ============================================

-- Provjeri rezultat:
SELECT id, name, email, trainer_code FROM trainers;

