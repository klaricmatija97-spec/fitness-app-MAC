-- SQL skripta za dodavanje allergies kolone u clients tablicu
-- Pokreni ovu skriptu u Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Dodaj allergies kolonu ako ne postoji (koristi DO blok za provjeru)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'allergies'
    ) THEN
        ALTER TABLE clients ADD COLUMN allergies TEXT;
        RAISE NOTICE 'Kolona allergies je uspješno dodana!';
    ELSE
        RAISE NOTICE 'Kolona allergies već postoji.';
    END IF;
END $$;

-- Provjeri da li je kolona dodana
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'allergies';

