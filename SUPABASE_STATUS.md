# ✅ Supabase Status Provjera

## 📋 Trenutna Konfiguracija

### ✅ Environment Varijable (Lokalno)

- **Fajl:** `env.local` (u root folderu `fitness-app/`)
- **Status:** ✅ POSTOJI
- **Varijable:**
  - ✅ `SUPABASE_URL` = `https://zspuauneubodthvrmzqg.supabase.co`
  - ✅ `SUPABASE_SERVICE_ROLE_KEY` = (postavljen)

### ✅ Next.js Konfiguracija

- **Fajl:** `next.config.ts`
- **Status:** ✅ KONFIGURIRAN
- **Učitava:** `env.local` preko `dotenv`

### ✅ Supabase Klijent

- **Fajl:** `lib/supabase.ts`
- **Status:** ✅ KONFIGURIRAN
- **Funkcija:** `createServiceClient()` - koristi service role key

### ✅ Database Schema

- **Fajl:** `supabase-schema-complete.sql`
- **Status:** ✅ POSTOJI
- **Sadrži:** Sve potrebne tablice (clients, user_accounts, client_calculations, chat_messages, itd.)

---

## 🔍 Što Treba Provjeriti

### 1. Da li je Schema Pokrenut u Supabase?

**Provjeri:**
1. Otvori Supabase Dashboard: https://app.supabase.com/project/zspuauneubodthvrmzqg
2. Idi na: Table Editor
3. Provjeri da li postoje tablice:
   - `clients`
   - `user_accounts`
   - `client_calculations`
   - `chat_messages`
   - `meal_plans`
   - `training_plans`
   - `workout_sessions`
   - `client_programs`

**Ako ne postoje:**
- Otvori SQL Editor u Supabase
- Pokreni `supabase-schema-complete.sql`

### 2. Da li RLS Policies Postoje?

**Provjeri:**
1. U Supabase Dashboard, idi na: Authentication → Policies
2. Provjeri da li postoje policies za sve tablice:
   - "Service role can manage clients"
   - "Service role can manage user_accounts"
   - "Service role can manage client_calculations"
   - itd.

**Ako ne postoje:**
- Pokreni ponovno `supabase-schema-complete.sql`

### 3. Test Konekcije Lokalno

**Pokreni test skriptu:**
```bash
cd fitness-app
node test-supabase-connection.js
```

**Očekivani rezultat:**
- ✅ Sve provjere prolaze
- ✅ Konekcija uspješna
- ✅ Insert/Delete radi

### 4. Test Kroz Aplikaciju

1. Pokreni aplikaciju: `npm run dev`
2. Otvori: http://localhost:3000
3. Popuni Intake formu
4. Provjeri u Supabase Table Editor da li se podaci spremili

---

## ⚠️ Vercel (Production)

### Environment Variables

**Status:** ❓ POTREBNO PROVJERITI

**Dodaj na Vercelu:**
1. Otvori: https://vercel.com/dashboard
2. Odaberi projekt
3. Idi na: Settings → Environment Variables
4. Dodaj:
   - `SUPABASE_URL` = `https://zspuauneubodthvrmzqg.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (tvoj service role key)
5. Redeploy aplikaciju

---

## ✅ Checklist

- [ ] `env.local` postoji i sadrži ispravne varijable
- [ ] `next.config.ts` učitava `env.local`
- [ ] `lib/supabase.ts` koristi environment varijable
- [ ] `supabase-schema-complete.sql` je pokrenut u Supabase
- [ ] Sve tablice postoje u Supabase
- [ ] RLS policies su postavljene
- [ ] Test konekcije prolazi (`node test-supabase-connection.js`)
- [ ] Lokalno testiranje radi (podaci se spremaju)
- [ ] Environment variables su postavljene na Vercelu (za produkciju)

---

## 🚀 Sledeći Koraci

1. **Provjeri da li schema postoji u Supabase**
2. **Pokreni test skriptu** (`node test-supabase-connection.js`)
3. **Testiraj kroz aplikaciju lokalno**
4. **Dodaj environment variables na Vercelu**
5. **Redeploy na Vercelu i testiraj produkciju**

---

## ❓ Problemi?

Vidi detaljne upute u `SUPABASE_SETUP.md`

