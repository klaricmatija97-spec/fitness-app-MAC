# 🔧 Popravi Supabase URL Format

## ❌ Problem

**Greška:** "SUPABASE_URL nije u ispravnom formatu"

## ✅ Ispravan Format

**URL treba biti:**
```
https://zspuauneubodthvrmzqg.supabase.co
```

**NE smije imati:**
- ❌ `/rest/v1` na kraju
- ❌ `/` na kraju
- ❌ Praznine
- ❌ Dodatne putanje

---

## 🔍 Provjera Trenutnog URL-a

**Otvori:** `fitness-app/env.local`

**Provjeri da li URL izgleda ovako:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
```

**Ako ne, popravi na gornji format.**

---

## 📋 Korak po Korak

### 1. Provjeri u Supabase Settings

1. **Otvori:** https://app.supabase.com/project/zspuauneubodthvrmzqg/settings/api
2. **Pronađi:** "Project URL" ili "Project URL"
3. **Kopiraj URL** - trebao bi biti: `https://zspuauneubodthvrmzqg.supabase.co`

### 2. Ažuriraj env.local

1. **Otvori:** `fitness-app/env.local`
2. **Pronađi liniju:** `SUPABASE_URL=...`
3. **Promijeni na:**
   ```
   SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
   ```
4. **Sačuvaj fajl**

### 3. Test Ponovno

**Pokreni test ponovno:**
- Dvaput klikni na `TESTIRAJ_SUPABASE_CMD.bat`

---

## ❓ Primjeri Pogrešnih Formata

**Pogrešno:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co/rest/v1
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co/
SUPABASE_URL=zspuauneubodthvrmzqg.supabase.co
SUPABASE_URL=http://zspuauneubodthvrmzqg.supabase.co
```

**Ispravno:**
```
SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co
```

---

## ✅ Provjera

Nakon popravke, test treba pokazati:
- ✅ URL format ispravan
- ✅ Konekcija uspješna

