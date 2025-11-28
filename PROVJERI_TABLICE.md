# ✅ Provjera Supabase Tablica

## Kako Provjeriti da li Tablice Postoje

1. **Otvori Supabase Dashboard:**
   - Idi na: https://app.supabase.com/project/zspuauneubodthvrmzqg
   - Prijavi se ako treba

2. **Otvori Table Editor:**
   - U lijevom meniju klikni "Table Editor"
   - Ili idi direktno na: https://app.supabase.com/project/zspuauneubodthvrmzqg/editor

3. **Provjeri da li postoje sljedeće tablice:**
   - ✅ `clients` - trebao bi postojati
   - ✅ `user_accounts` - trebao bi postojati
   - ✅ `client_calculations` - trebao bi postojati
   - ✅ `chat_messages` - trebao bi postojati
   - ✅ `meal_plans` - trebao bi postojati
   - ✅ `training_plans` - trebao bi postojati
   - ✅ `workout_sessions` - trebao bi postojati
   - ✅ `client_programs` - trebao bi postojati

4. **Ako tablice NE postoje:**
   - Otvori SQL Editor
   - Kopiraj sadržaj iz `supabase-schema-clean.sql`
   - Zalijepi u SQL Editor
   - Klikni "RUN"

5. **Ako tablice postoje ali su prazne:**
   - To je u redu - aplikacija će dodati podatke kada se korisnici prijave

---

## ✅ Provjera RLS Policies

1. **Za svaku tablicu, provjeri da li postoje RLS policies:**
   - U Table Editor, odaberi tablicu (npr. `clients`)
   - Idi na "Policies" tab
   - Trebao bi vidjeti policy: "Service role can manage clients"

2. **Ako policies NE postoje:**
   - Otvori SQL Editor
   - Pokreni `fix-policies-only.sql` ili `POPRAVI_SVE.sql`

---

## 🎯 Ključna Tablica: `clients`

**Ova tablica je najvažnija za intake formu!**

**Provjeri:**
- ✅ Tablica `clients` postoji
- ✅ Ima kolone: `id`, `name`, `email`, `phone`, `honorific`, `age_range`, `weight_value`, `weight_unit`, `height_value`, `height_unit`, `activities`, `goals`, `diet_cleanliness`, `notes`
- ✅ Postoji RLS policy koja omogućava service_role pristup

---

## ✅ Test Povezanosti

**Pokreni:** `TEST_FINALNI.bat` ili `TEST_FINALNI.js`

**Trebao bi vidjeti:**
- ✅ URL je ispravan
- ✅ Key je ispravan
- ✅ Konekcija radi
- ✅ SELECT query uspješan

