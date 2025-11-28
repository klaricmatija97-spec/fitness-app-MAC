-- Provjeri da li tablice postoje
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Provjeri da li su RLS omogućene
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Provjeri da li postoje policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

