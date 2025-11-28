# 🧪 Kako Testirati Supabase Konekciju

## ✅ Najjednostavniji Način

### Opcija 1: Batch Fajl (PREPORUČENO)

1. **Pronađi fajl:** `fitness-app/TESTIRAJ_SUPABASE.bat`
2. **Dvaput klikni** na njega
3. **Sačekaj** rezultate

Test će ti pokazati:
- ✅ Da li su environment varijable postavljene
- ✅ Da li konekcija sa Supabase radi
- ✅ Da li tablice postoje
- ✅ Da li možeš insertati/brisati podatke

---

## 💻 Opcija 2: Terminal/PowerShell

### Korak 1: Otvori Terminal

**PowerShell:**
- Pritisni `Windows + X`
- Odaberi "Windows PowerShell" ili "Terminal"

**Command Prompt:**
- Pritisni `Windows + R`
- Upiši `cmd` i pritisni Enter

### Korak 2: Idi u Fitness-App Folder

```bash
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
```

### Korak 3: Pokreni Test

```bash
node test-supabase-connection.js
```

---

## 📋 Što će Test Provjeriti?

1. **Environment Varijable**
   - Da li `SUPABASE_URL` postoji
   - Da li `SUPABASE_SERVICE_ROLE_KEY` postoji

2. **Konekcija**
   - Da li se može povezati sa Supabase
   - Da li tablica `clients` postoji

3. **Operacije**
   - Dohvaćanje podataka (SELECT)
   - Dodavanje podataka (INSERT)
   - Brisanje podataka (DELETE)

---

## ✅ Očekivani Rezultat

Ako sve radi, trebao bi vidjeti:

```
🔍 Provjera Environment Varijabli...

✅ SUPABASE_URL: https://zspuauneubodthvrmzqg.supabase.co
✅ SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIs...

🔗 Testiranje Supabase konekcije...

📊 Testiranje dohvaćanja podataka...
✅ Konekcija uspješna!
✅ Tablica "clients" postoji i dostupna
✅ RLS policies su postavljene ispravno

📝 Testiranje insert operacije...
✅ Insert uspješan!
✅ Client ID: [neki-uuid]

🧹 Čišćenje test podataka...
✅ Test podatak obrisan

🎉 SVE JE U REDU!
✅ Supabase je uspješno povezan i radi!
```

---

## ❌ Ako Dobiješ Grešku

### Greška: "SUPABASE_URL nije postavljen"

**Rješenje:**
- Provjeri da li `env.local` postoji u `fitness-app/` folderu
- Provjeri da li sadrži `SUPABASE_URL=...`

### Greška: "relation does not exist" ili "table does not exist"

**Rješenje:**
- Tablice možda nisu kreirane u Supabase
- Pokreni `supabase-schema-clean.sql` u Supabase SQL Editoru

### Greška: "new row violates row-level security policy"

**Rješenje:**
- RLS policies možda nisu postavljene
- Pokreni `fix-policies-only.sql` u Supabase SQL Editoru

### Greška: "Cannot find module 'dotenv'"

**Rješenje:**
```bash
cd fitness-app
npm install
```

---

## 🎯 Nakon Uspješnog Testa

Ako test prođe uspješno:

1. ✅ Supabase je povezan
2. ✅ Tablice su kreirane
3. ✅ Policies su postavljene
4. ✅ Možeš testirati kroz aplikaciju

**Sljedeći korak:** Pokreni aplikaciju i testiraj Intake formu!

---

## 💡 Savjet

**Test možeš pokrenuti bilo kada** da provjeriš da li Supabase još uvijek radi. Korisno je nakon:
- Promjena u Supabase
- Deploya na Vercel
- Promjena environment varijabli
- Problema s aplikacijom

