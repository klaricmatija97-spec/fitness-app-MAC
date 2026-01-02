-- =====================================================
-- TRAINER INVITES - Sigurni pozivni kodovi za trenere
-- =====================================================

-- Tablica za pozivnice
CREATE TABLE IF NOT EXISTS trainer_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Podaci o treneru
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Pozivni kod
  invite_code VARCHAR(12) NOT NULL UNIQUE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'used', 'expired', 'rejected')),
  
  -- Vremenski okviri
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Veza s trenerom nakon registracije
  trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
  
  -- Tko je odobrio (za audit)
  approved_by VARCHAR(255),
  
  -- Napomena admina
  admin_notes TEXT
);

-- Indeksi za brže pretrage
CREATE INDEX IF NOT EXISTS idx_trainer_invites_email ON trainer_invites(email);
CREATE INDEX IF NOT EXISTS idx_trainer_invites_code ON trainer_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_trainer_invites_status ON trainer_invites(status);

-- Funkcija za generiranje unique koda
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(12) := 'TRN-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger za automatsko generiranje koda pri unosu
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_code ON trainer_invites;
CREATE TRIGGER trigger_set_invite_code
  BEFORE INSERT ON trainer_invites
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();

-- Funkcija za automatsko postavljanje isteka (48h od odobrenja)
CREATE OR REPLACE FUNCTION set_invite_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.approved_at := NOW();
    NEW.expires_at := NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_expiry ON trainer_invites;
CREATE TRIGGER trigger_set_invite_expiry
  BEFORE UPDATE ON trainer_invites
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_expiry();

-- View za pending zahtjeve (za admin)
CREATE OR REPLACE VIEW pending_trainer_requests AS
SELECT 
  id,
  name,
  email,
  phone,
  created_at,
  admin_notes
FROM trainer_invites
WHERE status = 'pending'
ORDER BY created_at ASC;

-- View za aktivne pozivnice
CREATE OR REPLACE VIEW active_trainer_invites AS
SELECT 
  id,
  name,
  email,
  invite_code,
  approved_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 AS hours_remaining
FROM trainer_invites
WHERE status = 'approved' 
  AND expires_at > NOW()
ORDER BY expires_at ASC;

-- =====================================================
-- PRIMJERI KORIŠTENJA:
-- =====================================================

-- 1. Trener podnosi zahtjev (API to radi):
-- INSERT INTO trainer_invites (name, email, phone) VALUES ('Ivan Horvat', 'ivan@email.com', '0991234567');

-- 2. Admin odobrava (API to radi):
-- UPDATE trainer_invites SET status = 'approved', approved_by = 'admin@corpex.hr' WHERE id = '...';

-- 3. Validacija koda pri registraciji:
-- SELECT * FROM trainer_invites 
-- WHERE invite_code = 'TRN-X7K9M2' 
--   AND email = 'ivan@email.com'
--   AND status = 'approved'
--   AND expires_at > NOW();

-- 4. Označavanje kao iskorišten:
-- UPDATE trainer_invites SET status = 'used', used_at = NOW(), trainer_id = '...' WHERE id = '...';

