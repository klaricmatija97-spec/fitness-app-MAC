# 🔧 Kako Pokrenuti Schema u Supabase - Korak po Korak

## ❌ Problem: Syntax Error

Ako dobivaš grešku:
```
Error: Failed to run sql query: ERROR: 42601: syntax error at or near "Fitness"
```

**Razlog:** Supabase SQL Editor ne prihvaća komentare na vrhu fajla ili određeni format.

---

## ✅ Rješenje: Koristi Čist SQL

### Korak 1: Otvori Čist SQL Fajl

1. **Otvori fajl:** `fitness-app/supabase-schema-clean.sql`
2. **Kopiraj SAV sadržaj** (bez komentara, samo SQL kod)

### Korak 2: Pokreni u Supabase

1. **Otvori Supabase SQL Editor:**
   - Idi na: https://app.supabase.com/project/zspuauneubodthvrmzqg/sql
   - Ili: Dashboard → SQL Editor → New Query

2. **Zalijepi SQL kod:**
   - Ukloni sve što je u editoru
   - Zalijepi kopirani kod iz `supabase-schema-clean.sql`

3. **Klikni "RUN"** ili pritisni `Ctrl+Enter`

### Korak 3: Provjeri Rezultat

**Ako je uspješno:**
- Vidiš poruku: "Success. No rows returned" ili slično
- Nema grešaka

**Provjeri tablice:**
1. Idi na: Table Editor (lijevo u meniju)
2. Trebao bi vidjeti sve tablice:
   - ✅ `clients`
   - ✅ `user_accounts`
   - ✅ `client_calculations`
   - ✅ `chat_messages`
   - ✅ `meal_plans`
   - ✅ `training_plans`
   - ✅ `workout_sessions`
   - ✅ `client_programs`

---

## 🎯 Alternativno: Korak po Korak

Ako i dalje imaš problema, pokreni SQL komande jedna po jedna:

### 1. Kreiraj Tablice (kopiraj i pokreni jednu po jednu)

**Tablica 1: clients**
```sql
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  honorific TEXT NOT NULL,
  age_range TEXT NOT NULL,
  weight_value NUMERIC NOT NULL,
  weight_unit TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lb')),
  height_value NUMERIC NOT NULL,
  height_unit TEXT NOT NULL CHECK (height_unit IN ('cm', 'in')),
  activities TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  diet_cleanliness INTEGER NOT NULL CHECK (diet_cleanliness >= 0 AND diet_cleanliness <= 100),
  other_activities TEXT,
  other_goals TEXT,
  notes TEXT,
  has_paid BOOLEAN DEFAULT FALSE,
  payment_date TIMESTAMPTZ,
  subscription_active BOOLEAN DEFAULT FALSE,
  username TEXT UNIQUE,
  temp_password TEXT,
  password_changed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tablica 2: user_accounts**
```sql
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  UNIQUE(client_id)
);
```

**Tablica 3: client_calculations**
```sql
CREATE TABLE IF NOT EXISTS client_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  bmr NUMERIC NOT NULL,
  tdee NUMERIC NOT NULL,
  target_calories NUMERIC NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('lose', 'maintain', 'gain')),
  protein_grams NUMERIC NOT NULL,
  carbs_grams NUMERIC NOT NULL,
  fats_grams NUMERIC NOT NULL,
  activity_level TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);
```

**Tablica 4: chat_messages**
```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Ostale tablice:** Vidi u `supabase-schema-clean.sql`

### 2. Omogući RLS (Row Level Security)

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

### 3. Kreiraj Policies

```sql
CREATE POLICY "Service role can manage clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage user_accounts"
  ON user_accounts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage client_calculations"
  ON client_calculations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage chat_messages"
  ON chat_messages FOR ALL
  USING (auth.role() = 'service_role');
```

---

## ✅ Provjera

Nakon što pokreneš schema:

1. **Idi na Table Editor**
2. **Provjeri da li postoje sve tablice**
3. **Testiraj konekciju:**
   ```bash
   cd fitness-app
   node test-supabase-connection.js
   ```

---

## ❓ Ako i Dalje Ima Problema

1. **Provjeri da li koristiš ispravan SQL Editor:**
   - Trebao bi biti: SQL Editor u Supabase Dashboardu
   - NE koristi Query Editor ako postoji (koristi SQL Editor)

2. **Provjeri format:**
   - Ne smije biti komentara na vrhu
   - Ne smije biti dodatnih znakova
   - Svaka SQL komanda mora završavati s `;`

3. **Provjeri permissions:**
   - Trebao bi imati pristup kao admin/service role
   - Provjeri u Supabase Settings → API

4. **Kontaktiraj me:**
   - Pošalji screenshot greške
   - Reci koji fajl koristiš
   - Reci koji koraci si uradio

