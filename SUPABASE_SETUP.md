# 🔗 Supabase Povezivanje - Kompletni Vodič

## ✅ Provjera Statusa

### 1. Environment Varijable

**Lokalno (Development):**
- ✅ Fajl `env.local` postoji u root folderu `fitness-app/`
- ✅ Sadrži `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `next.config.ts` učitava varijable iz `env.local`

**Vercel (Production):**
- ⚠️ **Trebaju se dodati Environment Variables na Vercelu!**
- Idi na: Vercel Dashboard → Tvoj Projekt → Settings → Environment Variables
- Dodaj:
  - `SUPABASE_URL` = `https://zspuauneubodthvrmzqg.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` = (tvoj service role key)

---

## 📋 Korak 1: Provjeri Supabase Podatke

1. **Otvori Supabase Dashboard:** https://app.supabase.com
2. **Prijavi se** i odaberi projekt: `zspuauneubodthvrmzqg`
3. **Idi na Settings → API:**
   - Provjeri **Project URL** (trebao bi biti `https://zspuauneubodthvrmzqg.supabase.co`)
   - Provjeri **Service Role Key** (taj koji koristiš u `env.local`)

---

## 📋 Korak 2: Pokreni Database Schema

1. **Otvori Supabase SQL Editor:** https://app.supabase.com/project/zspuauneubodthvrmzqg/sql
2. **Klikni** "New Query"
3. **Otvori fajl:** `fitness-app/supabase-schema-complete.sql`
4. **Kopiraj SAV sadržaj** i zalijepi u SQL Editor
5. **Klikni** "RUN" ili pritisni `Ctrl+Enter`

**Provjeri da li su sve tablice kreirane:**
- Idi na: Table Editor (lijevo u meniju)
- Trebao bi vidjeti tablice:
  - ✅ `clients`
  - ✅ `user_accounts`
  - ✅ `client_calculations`
  - ✅ `chat_messages`
  - ✅ `meal_plans`
  - ✅ `training_plans`
  - ✅ `workout_sessions`
  - ✅ `client_programs`

---

## 📋 Korak 3: Provjeri Row Level Security (RLS)

1. **Za svaku tablicu**, provjeri da li je RLS omogućen:
   - Idi na: Authentication → Policies
   - Ili na: Table Editor → odaberi tablicu → Settings → RLS
   - Provjeri da postoji policy: "Service role can manage [table_name]"

**Ako nema policies:**
- Vrati se u SQL Editor i pokreni ponovno `supabase-schema-complete.sql`
- Ili kreiraj policies ručno (vidi u schema fajlu)

---

## 📋 Korak 4: Test Konekcije Lokalno

### Opcija A: Preko Aplikacije

1. **Pokreni aplikaciju:**
   ```bash
   cd fitness-app
   npm run dev
   ```

2. **Otvori:** http://localhost:3000

3. **Testiraj Intake Formu:**
   - Popuni formu
   - Klikni "Pošalji"
   - Provjeri u Supabase Table Editor da li se podaci spremili u `clients` tablicu

### Opcija B: Preko API Route

1. **Otvoru:** http://localhost:3000/api/intake

2. **Pošalji POST request** (možeš koristiti Postman ili curl):
   ```bash
   curl -X POST http://localhost:3000/api/intake \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Korisnik",
       "email": "test@example.com",
       "phone": "123456789",
       "honorific": "Mr",
       "ageRange": "25-30",
       "weight": {"value": 75, "unit": "kg"},
       "height": {"value": 180, "unit": "cm"},
       "activities": ["strength"],
       "goals": ["lose_weight"],
       "dietCleanliness": 70
     }'
   ```

3. **Provjeri odgovor:**
   - Trebao bi dobiti `{ok: true, clientId: "..."}`
   - Provjeri u Supabase da li se podatak spremio

---

## 📋 Korak 5: Postavi Environment Variables na Vercelu

**VAŽNO:** Za produkciju, trebaš dodati environment variables na Vercelu!

1. **Otvori Vercel Dashboard:** https://vercel.com
2. **Odaberi svoj projekt**
3. **Idi na:** Settings → Environment Variables
4. **Dodaj:**
   - Key: `SUPABASE_URL`
     - Value: `https://zspuauneubodthvrmzqg.supabase.co`
     - Environment: Production, Preview, Development (označi sve)
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: (tvoj service role key iz Supabase)
     - Environment: Production, Preview, Development (označi sve)

5. **Redeploy aplikaciju:**
   - Idi na Deployments
   - Klikni "..." na posljednjem deploymentu
   - Odaberi "Redeploy"

---

## 🔍 Provjera Problema

### Problem: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

**Rješenje:**
1. Provjeri da li `env.local` postoji u `fitness-app/` folderu
2. Provjeri da li varijable nisu prazne (nema praznih linija ili komentara ispred)
3. Restartaj dev server (`npm run dev`)

### Problem: "relation does not exist" ili "table does not exist"

**Rješenje:**
1. Pokreni `supabase-schema-complete.sql` u Supabase SQL Editor
2. Provjeri da li su sve tablice kreirane u Table Editor

### Problem: "new row violates row-level security policy"

**Rješenje:**
1. Provjeri da li koristiš **Service Role Key** (ne anon key!)
2. Provjeri da li su RLS policies kreirane i da dozvoljavaju `service_role`
3. Pokreni ponovno SQL schema

### Problem: "Connection timeout" ili "Network error"

**Rješenje:**
1. Provjeri da li je Supabase projekt aktivan (ne pauziran)
2. Provjeri da li je `SUPABASE_URL` ispravan
3. Provjeri internet konekciju

---

## ✅ Provjera Lista

- [ ] `env.local` postoji sa `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `supabase-schema-complete.sql` je pokrenut u Supabase
- [ ] Sve tablice su kreirane u Supabase
- [ ] RLS policies su postavljene za sve tablice
- [ ] Lokalno testiranje radi (podaci se spremaju u Supabase)
- [ ] Environment variables su postavljene na Vercelu
- [ ] Vercel deployment radi s Supabase

---

## 📚 Dodatne Informacije

### Kako Pronaći Supabase Podatke

1. **Project URL:**
   - Otvori: https://app.supabase.com
   - Odaberi projekt
   - Idi na: Settings → API
   - Kopiraj "Project URL"

2. **Service Role Key:**
   - Na istoj stranici (Settings → API)
   - Pronađi "Project API keys"
   - Kopiraj "service_role" key (NIKADA ne dijelj anon key!)
   - ⚠️ **VAŽNO:** Service Role Key omogućava full pristup bazi - nikada ga ne commitaj u Git!

### Tablice i Njihova Namjena

- **`clients`** - Podaci iz intake forme
- **`user_accounts`** - Login podaci (username, password)
- **`client_calculations`** - BMR, TDEE, makrosi
- **`meal_plans`** - Planovi prehrane
- **`training_plans`** - Planovi treninga
- **`workout_sessions`** - Završeni treninzi
- **`chat_messages`** - AI chat poruke
- **`client_programs`** - Poveznica klijenta s planovima

---

## 🚀 Gotovo!

Ako sve gore navedene provjere prolaze, Supabase je uspješno povezan! 

**Sljedeći koraci:**
- Testiraj sve API rute lokalno
- Deployaj na Vercel i dodaj environment variables
- Testiraj produkcijski deployment

---

## ❓ Potreban Help?

Ako imaš problema:
1. Provjeri Supabase logs: Dashboard → Logs
2. Provjeri Vercel logs: Dashboard → Deployments → View Logs
3. Provjeri browser console za greške
4. Provjeri da li su sve tablice i policies postavljene

