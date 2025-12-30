-- ============================================
-- UPDATE EXISTING CLIENTS - DODAJ TRAINER_ID
-- ============================================
-- 
-- Ovaj SQL ažurira postojeće klijente koji nemaju trainer_id
-- i dodjeljuje ih mock treneru za testiranje
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- 1. Provjeri postojeće klijente (PRIJE ažuriranja)
SELECT id, name, email, trainer_id, created_at
FROM clients
ORDER BY created_at DESC;

-- 2. Ažuriraj sve klijente bez trainer_id da pripadaju mock treneru
UPDATE clients 
SET trainer_id = '6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7'
WHERE trainer_id IS NULL;

-- 3. Provjeri rezultat (NAKON ažuriranja)
SELECT id, name, email, trainer_id, created_at
FROM clients
ORDER BY created_at DESC;

-- ============================================
-- GOTOVO!
-- ============================================
-- Sada bi TrainerHomeScreen trebao prikazati sve klijente.
-- Osvježite aplikaciju (pull-to-refresh) ili zatvorite i otvorite ponovno.
-- ============================================

