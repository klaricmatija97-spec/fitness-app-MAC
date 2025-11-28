# 📋 Kako Importirati Database u Supabase

## Korak 1: Otvori Supabase Dashboard

1. Idi na https://supabase.com
2. Prijavi se
3. Otvori svoj projekt (zspuauneubodthvrmzqg)

## Korak 2: Otvori SQL Editor

1. U lijevom meniju klikni na **SQL Editor**
2. Klikni na **New Query** (gumb u gornjem desnom kutu)

## Korak 3: Kopiraj i Pokreni SQL

1. Otvori fajl `supabase-schema-complete.sql` u editoru (Cursor ili bilo koji text editor)
2. Selektiraj SAV tekst (Ctrl+A)
3. Kopiraj (Ctrl+C)
4. Vrati se u Supabase SQL Editor
5. Zalijepi SQL (Ctrl+V)
6. Klikni **RUN** ili pritisni `Ctrl+Enter`

## Korak 4: Provjeri Rezultat

Trebao bi vidjeti:
- ✅ "Success. No rows returned" ili
- ✅ Poruku da su tabele kreirane

## Korak 5: Provjeri da li su Tabele Kreirane

1. U Supabase dashboardu, klikni na **Table Editor** (lijevo u meniju)
2. Trebao bi vidjeti ove tabele:
   - ✅ clients
   - ✅ client_programs
   - ✅ user_accounts
   - ✅ client_calculations
   - ✅ meal_plans
   - ✅ training_plans
   - ✅ workout_sessions
   - ✅ chat_messages

## Ako Vidiš Greške

### Greška: "relation already exists"
- To je OK! Tabele već postoje, možeš nastaviti.

### Greška: "permission denied"
- Provjeri da li si prijavljen kao admin u Supabase projektu

### Greška: "syntax error"
- Provjeri da li si kopirao SAV tekst iz fajla
- Provjeri da li nema dodatnih znakova

## Što Dalje?

Nakon što su tabele kreirane:
1. ✅ Database je spreman
2. ✅ Možeš testirati aplikaciju
3. ✅ Podaci će se spremati u bazu

---

**Napomena:** Ako vidiš bilo kakve greške, pošalji mi poruku s greškom i pomoći ću ti!

