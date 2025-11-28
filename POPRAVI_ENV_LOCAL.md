# 🔧 Popravi env.local Format

## ✅ Ispravan Format env.local Fajla

**Otvori:** `fitness-app/env.local`

**Ispravan sadržaj:**
```
# Supabase Configuration
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHVhdW5ldWJvZHRodnJtenFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ4MTk4MiwiZXhwIjoyMDc5MDU3OTgyfQ.zAlBJK9S07C5PGWNZGiQ0H4qbEPZ6SYw6yuU-kLvVcc
```

---

## 📋 Provjera

### 1. Provjeri Format URL-a

**URL treba biti:**
- ✅ Počinje s: `https://`
- ✅ Završava s: `.supabase.co`
- ❌ NE smije završavati s: `/rest/v1`
- ❌ NE smije završavati s: `/` (osim ako nije dio domena)

### 2. Provjeri Format Key-a

**Key treba biti:**
- ✅ JWT token format (3 dijela odvojena točkom)
- ✅ Dugačak (preko 100 znakova)
- ✅ Počinje s: `eyJhbG...`

---

## 🔍 Ako Test I Dalje Javljuje Problem

### Opcija 1: Provjeri Ručno

**Pokreni:** `PROVJERI_URL.bat`
- To će pokazati točan sadržaj env.local fajla

### Opcija 2: Provjeri u Supabase

1. **Otvori:** https://app.supabase.com/project/zspuauneubodthvrmzqg/settings/api
2. **Kopiraj:**
   - Project URL (bez /rest/v1 na kraju)
   - Service Role Key (ne anon key!)
3. **Zalijepi u env.local**

---

## ❓ Mogući Problemi

**Problem 1: Praznine**
- Provjeri da nema praznina prije ili poslije `=`
- `SUPABASE_URL=https://...` (NE `SUPABASE_URL = https://...`)

**Problem 2: Navodnici**
- NE koristi navodnike
- `SUPABASE_URL=https://...` (NE `SUPABASE_URL="https://..."`)

**Problem 3: Komentari na Liniji**
- Ne stavljaj komentare na istu liniju
- `SUPABASE_URL=https://...` (NE `SUPABASE_URL=https://... # moj url`)

---

## ✅ Nakon Popravke

**Pokreni test ponovno:**
- Dvaput klikni na `TESTIRAJ_SUPABASE_CMD.bat`

**Trebao bi vidjeti:**
```
✅ URL format ispravan
✅ Key je SERVICE ROLE key
✅ Konekcija uspješna!
```

