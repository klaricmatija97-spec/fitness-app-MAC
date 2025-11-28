# ✅ Najlakši Način - Popravi Supabase URL

## 🔍 Problem

**Na slici vidi se:** SUPABASE_URL je dashboard URL, ne API endpoint!

**Pogrešan URL:**
```
https://supabase.com/dashboard/project/zspuauneubodthvrmzqg/settings/api-keys
```

**Ispravan URL (trebao bi biti):**
```
https://zspuauneubodthvrmzqg.supabase.co
```

---

## ✅ Rješenje: Popravi env.local

### Korak 1: Otvori env.local

1. **Otvori:** `fitness-app/env.local`
2. **Pronađi liniju:** `SUPABASE_URL=...`

### Korak 2: Promijeni URL

**Zamijeni:**
```
SUPABASE_URL=https://supabase.com/dashboard/project/zspuauneubodthvrmzqg/settings/api-keys
```

**S:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
```

**Ili provjeri u Supabase:**
1. Otvori: https://app.supabase.com/project/zspuauneubodthvrmzqg/settings/api
2. Pronađi "Project URL" (NE "API URL" ili "Dashboard URL")
3. Kopiraj samo: `https://zspuauneubodthvrmzqg.supabase.co`

### Korak 3: Sačuvaj fajl

**Sačuvaj `env.local`** nakon promjene.

### Korak 4: Test Ponovno

**Pokreni test ponovno:**
- Dvaput klikni na `POPRAVI_SVE.bat`

---

## ✅ Provjera

**Nakon popravke, test bi trebao pokazati:**

```
✅ Postoji: https://zspuauneubodthvrmzqg.supabase.co
✅ Sadrži .supabase.co? true
✅ Koristim URL: https://zspuauneubodthvrmzqg.supabase.co
✅ USPJEŠNO!
```

---

## 📋 Ispravan Format env.local

**Otvori `fitness-app/env.local` i provjeri da izgleda ovako:**

```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Provjeri:**
- ✅ URL završava s `.supabase.co` (bez `/dashboard` ili `/settings`)
- ✅ Nema `/dashboard` u URL-u
- ✅ Nema `/settings` u URL-u
- ✅ Nema `/api-keys` u URL-u

