-- ============================================
-- ADD TRAINER_ID TO CLIENTS TABLE
-- ============================================
-- 
-- Dodaje trainer_id stupac u clients tablicu
-- Omogućava trenerima da imaju dodijeljene klijente
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- Dodaj trainer_id stupac ako ne postoji
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS trainer_id UUID;

-- Kreiraj index za brže pretrage po treneru
CREATE INDEX IF NOT EXISTS idx_clients_trainer_id ON clients(trainer_id);

-- Komentar
COMMENT ON COLUMN clients.trainer_id IS 'ID trenera koji je dodijeljen ovom klijentu';

-- ============================================
-- GOTOVO!
-- ============================================
-- Dodan stupac:
-- ✅ clients.trainer_id (UUID, nullable)
-- ✅ Index za brže pretrage
-- ============================================

