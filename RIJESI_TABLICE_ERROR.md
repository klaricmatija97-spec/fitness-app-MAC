# 🔧 Riješi "Tablice Nisu Kreirane" Error

## ❌ Problem

**Test javlja:** Tablice nisu kreirane  
**Ali:** Tablice SU kreirane u Supabase SQL Editoru

**Razlog:** Vjerojatno problem s:
1. RLS (Row Level Security) policies nisu postavljene
2. Service Role Key ne može pristupiti tablicama
3. Test koristi pogrešne credentials

---

## ✅ Rješenje 1: Provjeri da li RLS Policies Postoje

### Korak 1: Provjeri Policies u Supabase

1. **Otvori Supabase:** https://app.supabase.com/project/zspuauneubodthvrmzqg
2. **Idi na:** Authentication → Policies
3. **Provjeri da li postoje policies** za sve tablice:
   - `clients`
   - `user_accounts`
   - `client_calculations`
   - `chat_messages`
   - itd.

**Ako NE postoje policies:**
- Pokreni `fix-policies-only.sql` u Supabase SQL Editoru

**Ako postoje policies:**
- Provjeri da li dozvoljavaju `service_role`

---

## ✅ Rješenje 2: Pokreni Provjeru Tablica

### Korak 1: Otvori SQL Query za Provjeru

Kreirao sam fajl: `provjeri-tablice.sql`

1. **Otvori:** `fitness-app/provjeri-tablice.sql`
2. **Kopiraj sadržaj**
3. **Idi u Supabase SQL Editor:** https://app.supabase.com/project/zspuauneubodthvrmzqg/sql
4. **Zalijepi i pokreni**

**Ovo će pokazati:**
- Koje tablice postoje
- Da li je RLS omogućen
- Koje policies postoje

---

## ✅ Rješenje 3: Popravi Policies (Najvjerojatnije Rješenje)

### Korak 1: Pokreni Fix Policies

1. **Otvori:** `fitness-app/fix-policies-only.sql`
2. **Kopiraj SAV sadržaj**
3. **Idi u Supabase SQL Editor**
4. **Zalijepi i pokreni**

**Ovo će:**
- Obrisati postojeće policies (ako postoje)
- Kreirati nove policies za sve tablice
- Omogućiti service_role pristup

---

## ✅ Rješenje 4: Provjeri Service Role Key

### Provjeri da li env.local koristi ispravan key

1. **Otvori:** `fitness-app/env.local`
2. **Provjeri da li koristi SERVICE ROLE KEY** (ne anon key!)
3. **Service Role Key** počinje s `eyJhbGci...` i dosta je dug

**Gdje pronaći Service Role Key:**
1. Otvori Supabase: https://app.supabase.com/project/zspuauneubodthvrmzqg
2. Idi na: Settings → API
3. Pronađi: "Project API keys"
4. Kopiraj "service_role" key (NIKADA anon key!)

---

## 🔍 Debug: Provjeri Što Test Radi

Test skripta pokušava:
1. Dohvatiti podatke iz tablice `clients`
2. Ako ne uspije, javlja grešku

**Ako dobivaš grešku "relation does not exist":**
- Tablice možda nisu kreirane u public schema
- Provjeri u Supabase Table Editor

**Ako dobivaš grešku "new row violates row-level security":**
- RLS policies nisu postavljene
- Pokreni `fix-policies-only.sql`

**Ako dobivaš grešku "permission denied":**
- Service Role Key nije ispravan
- Provjeri env.local

---

## ✅ Test Nakon Popravke

Nakon što pokreneš `fix-policies-only.sql`:

1. **Pokreni test ponovno:**
   ```bash
   # Dvaput klikni na TESTIRAJ_SUPABASE_CMD.bat
   # ILI u Command Prompt:
   cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
   node test-supabase-connection.js
   ```

2. **Trebao bi vidjeti:**
   ```
   ✅ Konekcija uspješna!
   ✅ Tablica "clients" postoji i dostupna
   ✅ RLS policies su postavljene ispravno
   ```

---

## 📋 Korak po Korak - Najvjerojatnije Rješenje

### 1. Provjeri Policies u Supabase
- Otvori: https://app.supabase.com/project/zspuauneubodthvrmzqg
- Idi na: Authentication → Policies
- Provjeri da li postoje policies

### 2. Ako Ne Postoje Policies
- Otvori: `fix-policies-only.sql`
- Kopiraj sadržaj
- Pokreni u Supabase SQL Editor

### 3. Pokreni Test Ponovno
- Dvaput klikni na `TESTIRAJ_SUPABASE_CMD.bat`

---

## ❓ Ako i Dalje Ne Radi

**Pošalji mi:**
1. Tačnu grešku koju vidiš u testu
2. Screenshot Supabase Policies stranice
3. Da li vidiš tablice u Supabase Table Editor?

