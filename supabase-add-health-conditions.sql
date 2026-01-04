-- SQL skripta za dodavanje health_conditions stupca u clients tablicu
-- Pokreni ovu skriptu u Supabase SQL Editor

DO $$ 
BEGIN
    -- health_conditions (ozljede, bolesti, zdravstvena stanja)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'health_conditions') THEN
        ALTER TABLE clients ADD COLUMN health_conditions TEXT;
        RAISE NOTICE 'Stupac health_conditions uspješno dodan.';
    ELSE
        RAISE NOTICE 'Stupac health_conditions već postoji.';
    END IF;
    
    -- food_preferences (preferirane namirnice)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'food_preferences') THEN
        ALTER TABLE clients ADD COLUMN food_preferences TEXT;
        RAISE NOTICE 'Stupac food_preferences uspješno dodan.';
    ELSE
        RAISE NOTICE 'Stupac food_preferences već postoji.';
    END IF;
    
    -- avoid_ingredients (izbjegavane namirnice)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'avoid_ingredients') THEN
        ALTER TABLE clients ADD COLUMN avoid_ingredients TEXT;
        RAISE NOTICE 'Stupac avoid_ingredients uspješno dodan.';
    ELSE
        RAISE NOTICE 'Stupac avoid_ingredients već postoji.';
    END IF;
END $$;

-- Provjeri da li su stupci dodani
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('health_conditions', 'food_preferences', 'avoid_ingredients');


