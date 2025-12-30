-- ============================================
-- TRAINER PORTFOLIO MIGRATION
-- ============================================
--
-- Dodaje portfolio polja u trainers tablicu
-- Omogućava klijentima da pregledaju profile trenera
--
-- UPUTE: Izvršite ovaj SQL u Supabase SQL Editoru
-- ============================================

-- ============================================
-- 0. PROVJERI POTREBNE STUPCE (PREDUVJETI)
-- ============================================

-- Dodaj connected_trainer_id u clients ako ne postoji
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS connected_trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_connected_trainer_id ON clients(connected_trainer_id);

-- Dodaj trainer_code u trainers ako ne postoji
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS trainer_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_trainers_trainer_code ON trainers(trainer_code);

-- ============================================
-- 1. DODAJ PORTFOLIO POLJA U TRAINERS TABLICU
-- ============================================

-- Bio / Opis trenera
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN trainers.bio IS 'Kratki opis trenera - tko je, što radi, njegova filozofija';

-- Profilna slika
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN trainers.avatar_url IS 'URL profilne slike trenera';

-- Cover/Hero slika
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

COMMENT ON COLUMN trainers.cover_image_url IS 'URL naslovne slike za profil';

-- Specijalizacije (JSON array)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';

COMMENT ON COLUMN trainers.specializations IS 'Lista specijalizacija (npr. hipertrofija, powerlifting, rehabilitacija)';

-- Certifikati (JSON array)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';

COMMENT ON COLUMN trainers.certifications IS 'Lista certifikata [{name, issuer, year}]';

-- Godine iskustva
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0;

COMMENT ON COLUMN trainers.years_of_experience IS 'Broj godina iskustva kao trener';

-- Lokacija
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN trainers.location IS 'Grad/Lokacija trenera';

-- Satnica (za prikaz, ne za naplatu)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);

COMMENT ON COLUMN trainers.hourly_rate IS 'Cijena po satu (informativno)';

-- Valuta
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';

-- Jezici
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{Hrvatski}';

COMMENT ON COLUMN trainers.languages IS 'Jezici koje trener govori';

-- Radno vrijeme (JSON)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true, "saturday": false, "sunday": false}';

COMMENT ON COLUMN trainers.availability IS 'Dostupnost po danima';

-- Online/In-person
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS training_type TEXT DEFAULT 'both' CHECK (training_type IN ('online', 'in_person', 'both'));

COMMENT ON COLUMN trainers.training_type IS 'Tip treninga: online, uživo, ili oboje';

-- Javni profil (da li je vidljiv u pretrazi)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

COMMENT ON COLUMN trainers.is_public IS 'Da li je profil javno vidljiv';

-- Verificiran profil
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN trainers.is_verified IS 'Da li je profil verificiran od strane admina';

-- Social linkovi
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

COMMENT ON COLUMN trainers.social_links IS 'Social media linkovi {instagram, facebook, youtube, website}';

-- Motto / Slogan
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS motto TEXT;

COMMENT ON COLUMN trainers.motto IS 'Kratki slogan ili motto trenera';

-- ============================================
-- 2. KREIRAJ TABLICU ZA RECENZIJE/TESTIMONIALS
-- ============================================

CREATE TABLE IF NOT EXISTS trainer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexi za brže pretrage
CREATE INDEX IF NOT EXISTS idx_trainer_reviews_trainer_id ON trainer_reviews(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_reviews_rating ON trainer_reviews(rating);

COMMENT ON TABLE trainer_reviews IS 'Recenzije i ocjene trenera od strane klijenata';

-- ============================================
-- 3. KREIRAJ TABLICU ZA GALERIJU SLIKA
-- ============================================

CREATE TABLE IF NOT EXISTS trainer_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  image_type TEXT DEFAULT 'general' CHECK (image_type IN ('general', 'before_after', 'certificate', 'gym')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainer_gallery_trainer_id ON trainer_gallery(trainer_id);

COMMENT ON TABLE trainer_gallery IS 'Galerija slika trenera (rezultati, certifikati, teretana)';

-- ============================================
-- 4. KREIRAJ VIEW ZA JAVNI PROFIL TRENERA
-- ============================================

CREATE OR REPLACE VIEW public_trainer_profiles AS
SELECT 
  t.id,
  t.name,
  t.avatar_url,
  t.cover_image_url,
  t.bio,
  t.motto,
  t.specializations,
  t.certifications,
  t.years_of_experience,
  t.location,
  t.hourly_rate,
  t.currency,
  t.languages,
  t.availability,
  t.training_type,
  t.social_links,
  t.is_verified,
  t.trainer_code,
  t.created_at,
  -- Agregirani podaci
  (SELECT COUNT(*) FROM clients c WHERE c.connected_trainer_id = t.id) as client_count,
  (SELECT COALESCE(AVG(rating), 0) FROM trainer_reviews tr WHERE tr.trainer_id = t.id AND tr.is_public = true) as average_rating,
  (SELECT COUNT(*) FROM trainer_reviews tr WHERE tr.trainer_id = t.id AND tr.is_public = true) as review_count
FROM trainers t
WHERE t.is_public = true;

COMMENT ON VIEW public_trainer_profiles IS 'Javno dostupni profili trenera za pretragu';

-- ============================================
-- 5. FUNKCIJA ZA DOHVAĆANJE PROFILA S RECENZIJAMA
-- ============================================

CREATE OR REPLACE FUNCTION get_trainer_profile(p_trainer_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'trainer', (
      SELECT row_to_json(t.*)
      FROM public_trainer_profiles t
      WHERE t.id = p_trainer_id
    ),
    'reviews', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'clientName', r.client_name,
          'rating', r.rating,
          'text', r.review_text,
          'isVerified', r.is_verified,
          'createdAt', r.created_at
        )
      ), '[]'::jsonb)
      FROM trainer_reviews r
      WHERE r.trainer_id = p_trainer_id AND r.is_public = true
      ORDER BY r.created_at DESC
      LIMIT 10
    ),
    'gallery', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'imageUrl', g.image_url,
          'caption', g.caption,
          'type', g.image_type
        )
      ), '[]'::jsonb)
      FROM trainer_gallery g
      WHERE g.trainer_id = p_trainer_id
      ORDER BY g.sort_order ASC
      LIMIT 20
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. UMETNI DEMO PODATKE (OPCIONALNO)
-- ============================================

-- Primjer ažuriranja postojećeg trenera s portfolio podacima
-- UPDATE trainers SET
--   bio = 'Certificirani fitness trener s 8 godina iskustva. Specijaliziran za hipertrofiju i transformaciju tijela. Moja filozofija je jednostavna: konzistentnost pobjeđuje intenzitet.',
--   motto = 'Tvoje tijelo može sve. Samo treba uvjeriti um.',
--   specializations = ARRAY['Hipertrofija', 'Transformacija tijela', 'Powerlifting', 'Prehrana'],
--   certifications = '[{"name": "ISSA CPT", "issuer": "ISSA", "year": 2016}, {"name": "Precision Nutrition L1", "issuer": "Precision Nutrition", "year": 2018}]',
--   years_of_experience = 8,
--   location = 'Zagreb, Hrvatska',
--   hourly_rate = 40.00,
--   languages = ARRAY['Hrvatski', 'Engleski'],
--   training_type = 'both',
--   social_links = '{"instagram": "@trainer_username", "youtube": "TrainerChannel"}'
-- WHERE id = 'TRAINER_ID_HERE';

-- ============================================
-- 7. RLS POLICIES (Row Level Security)
-- ============================================

-- Omogući RLS na novim tablicama
ALTER TABLE trainer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_gallery ENABLE ROW LEVEL SECURITY;

-- Svi mogu čitati javne recenzije
CREATE POLICY "Public reviews are viewable by everyone"
ON trainer_reviews FOR SELECT
USING (is_public = true);

-- Treneri mogu upravljati svojim recenzijama
CREATE POLICY "Trainers can manage their reviews"
ON trainer_reviews FOR ALL
USING (trainer_id IN (SELECT id FROM trainers WHERE id = auth.uid()));

-- Svi mogu čitati galeriju
CREATE POLICY "Gallery is viewable by everyone"
ON trainer_gallery FOR SELECT
USING (true);

-- Treneri mogu upravljati svojom galerijom
CREATE POLICY "Trainers can manage their gallery"
ON trainer_gallery FOR ALL
USING (trainer_id IN (SELECT id FROM trainers WHERE id = auth.uid()));

-- ============================================
-- GOTOVO!
-- ============================================
-- Dodana polja:
-- ✅ trainers.bio, avatar_url, cover_image_url
-- ✅ trainers.specializations, certifications
-- ✅ trainers.years_of_experience, location, hourly_rate
-- ✅ trainers.languages, availability, training_type
-- ✅ trainers.is_public, is_verified, social_links, motto
-- ✅ trainer_reviews tablica
-- ✅ trainer_gallery tablica
-- ✅ public_trainer_profiles view
-- ✅ get_trainer_profile() funkcija
-- ============================================

