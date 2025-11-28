# 🔍 Gdje Pronaći Ispravan Supabase URL

## ❌ Problem

**Pogrešan URL (ne radi):**
```
https://supabase.com/dashboard/project/zspuauneubodthvrmzqg/settings/api-keys
```
**Ovo je URL za dashboard stranicu, ne za API!**

## ✅ Ispravan URL

**Trebali bi koristiti:**
```
https://zspuauneubodthvrmzqg.supabase.co
```
**Ovo je API endpoint URL!**

---

## 📋 Kako Pronaći Ispravan URL

### Korak 1: Otvori Supabase Settings

1. **Otvori:** https://app.supabase.com/project/zspuauneubodthvrmzqg/settings/api
2. **Provjeri sekciju "Project URL"** (NE "API URL" ili "Dashboard URL")

### Korak 2: Kopiraj Project URL

**Pronađi:** "Project URL" ili "Project URL" (ne "API URL")

**Trebali bi vidjeti:**
```
Project URL
https://zspuauneubodthvrmzqg.supabase.co
```

**NE kopiraj:**
- ❌ Dashboard URL
- ❌ Settings URL  
- ❌ API Keys stranicu URL

**Kopiraj SAMO:**
- ✅ Project URL (`https://xxxxx.supabase.co`)

---

## ✅ Provjera

**Ispravan URL:**
- ✅ Počinje s: `https://`
- ✅ Sadrži: `.supabase.co`
- ✅ Završava s: `.supabase.co` (bez `/dashboard`, `/settings`, itd.)
- ✅ Primjer: `https://zspuauneubodthvrmzqg.supabase.co`

**Pogrešan URL:**
- ❌ Sadrži: `supabase.com/dashboard`
- ❌ Sadrži: `/settings`
- ❌ Sadrži: `/api-keys`
- ❌ Primjer: `https://supabase.com/dashboard/project/...`

---

## 🔧 Popravi env.local

**Otvori:** `fitness-app/env.local`

**Provjeri da linija izgleda ovako:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
```

**NE:**
```
SUPABASE_URL=https://supabase.com/dashboard/project/...
```

---

## ✅ Nakon Popravke

**Pokreni test ponovno:**
- Dvaput klikni na `POPRAVI_SVE.bat`

**Trebao bi vidjeti:**
```
✅ Koristim URL: https://zspuauneubodthvrmzqg.supabase.co
✅ Supabase klijent kreiran
✅ USPJEŠNO!
```

