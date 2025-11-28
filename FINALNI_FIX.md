# 🔧 FINALNI FIX - Popravi Supabase URL

## ❌ Problem Na Slici

**Vidim:** SUPABASE_URL je dashboard URL!
```
https://supabase.com/dashboard/project/zspuauneubodthvrmzqg/settings/api-keys
```

**To NE RADI!** To je stranica za postavke, ne API endpoint!

---

## ✅ Rješenje: Popravi URL

### Korak 1: Otvori env.local

**Otvori fajl:** `fitness-app/env.local`

### Korak 2: Promijeni SUPABASE_URL

**Pronađi liniju:**
```
SUPABASE_URL=https://supabase.com/dashboard/project/zspuauneubodthvrmzqg/settings/api-keys
```

**ILI ako već ima nešto drugo, provjeri da li sadrži `/dashboard`**

**Promijeni na:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
```

### Korak 3: Provjeri Format

**Provjeri da linija izgleda ovako:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
```

**NE smije sadržavati:**
- ❌ `/dashboard`
- ❌ `/settings`
- ❌ `/api-keys`
- ❌ `supabase.com/dashboard`

**Mora sadržavati:**
- ✅ `https://`
- ✅ `.supabase.co`
- ✅ Završava s `.supabase.co`

### Korak 4: Sačuvaj i Test

1. **Sačuvaj** `env.local` fajl
2. **Pokreni test ponovno:** `POPRAVI_SVE.bat`

---

## 📋 Gdje Pronaći Ispravan URL

### Opcija 1: U Supabase Dashboardu

1. **Otvori:** https://app.supabase.com/project/zspuauneubodthvrmzqg/settings/api
2. **Pronađi sekciju:** "Project URL" (lijevo gore, NE "API URL")
3. **Kopiraj:** `https://zspuauneubodthvrmzqg.supabase.co`

### Opcija 2: Iz URL-a

**Ako vidiš:** `https://supabase.com/dashboard/project/zspuauneubodthvrmzqg/...`

**Izmijeni na:** `https://zspuauneubodthvrmzqg.supabase.co`

---

## ✅ Provjera Nakon Popravke

**Pokreni test ponovno:**
- Dvaput klikni na `POPRAVI_SVE.bat`

**Trebao bi vidjeti:**
```
✅ Postoji: https://zspuauneubodthvrmzqg.supabase.co
✅ Format ispravan? Da
✅ Koristim URL: https://zspuauneubodthvrmzqg.supabase.co
✅ USPJEŠNO!
```

---

## 🚨 Ako I Dalje Ne Radi

**Provjeri:**
1. Da li je `env.local` sačuvan (možda si zaboravio sačuvati)
2. Da li URL ne sadrži `/dashboard` ili `/settings`
3. Da li test pokazuje ispravan URL

**Ako test i dalje pokazuje pogrešan URL:**
- Možda imaš više `env.local` fajlova
- Provjeri da li je `env.local` u `fitness-app/` folderu
- Provjeri da li test čita iz ispravnog fajla

