-- SQL skripta za dodavanje dodatnih stupaca u clients tablicu
-- Pokreni ovu skriptu u Supabase SQL Editor ako stupci ne postoje

-- Dodaj dodatne stupce ako ne postoje (koristi DO blok za provjeru)
DO $$ 
BEGIN
    -- training_frequency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'training_frequency') THEN
        ALTER TABLE clients ADD COLUMN training_frequency TEXT;
    END IF;
    
    -- training_duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'training_duration') THEN
        ALTER TABLE clients ADD COLUMN training_duration TEXT;
    END IF;
    
    -- training_location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'training_location') THEN
        ALTER TABLE clients ADD COLUMN training_location TEXT;
    END IF;
    
    -- equipment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'equipment') THEN
        ALTER TABLE clients ADD COLUMN equipment TEXT[];
    END IF;
    
    -- experience
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'experience') THEN
        ALTER TABLE clients ADD COLUMN experience TEXT;
    END IF;
    
    -- meal_frequency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'meal_frequency') THEN
        ALTER TABLE clients ADD COLUMN meal_frequency TEXT;
    END IF;
    
    -- allergies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'allergies') THEN
        ALTER TABLE clients ADD COLUMN allergies TEXT;
    END IF;
    
    -- diet_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'diet_type') THEN
        ALTER TABLE clients ADD COLUMN diet_type TEXT;
    END IF;
    
    -- other_diet_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'other_diet_type') THEN
        ALTER TABLE clients ADD COLUMN other_diet_type TEXT;
    END IF;
    
    -- sleep_hours
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'sleep_hours') THEN
        ALTER TABLE clients ADD COLUMN sleep_hours NUMERIC;
    END IF;
    
    -- injuries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'injuries') THEN
        ALTER TABLE clients ADD COLUMN injuries TEXT;
    END IF;
    
    -- biggest_challenge
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'biggest_challenge') THEN
        ALTER TABLE clients ADD COLUMN biggest_challenge TEXT;
    END IF;
    
    -- other_challenge
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'other_challenge') THEN
        ALTER TABLE clients ADD COLUMN other_challenge TEXT;
    END IF;
    
    RAISE NOTICE 'Svi stupci su provjereni i dodani ako su potrebni.';
END $$;

-- Napomena: Kalkulacije (bmr, tdee, target_calories, protein_grams, carbs_grams, fats_grams)
-- se NE dodaju u clients tablicu - one idu u client_calculations tablicu!
