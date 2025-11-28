# Kako postaviti projekt na GitHub

## Što znači `http://localhost:3000/app?preview=true`?

- **`/app`** = Glavna aplikacija (slide sustav s login, intro, kalkulatorima, planovima)
- **`?preview=true`** = Preview mode - omogućuje pristup bez stvarnog login-a/plaćanja za testiranje

## Koraci za postavljanje na GitHub:

### 1. Kreiraj GitHub repozitorij
1. Idi na https://github.com i prijavi se
2. Klikni **"New repository"** (zeleni gumb gore desno)
3. Ime repozitorija: `fitness-app` ili `corpex-fitness`
4. Opis: "CORPEX Fitness App - Kalkulator kalorija, makrosi, planovi prehrane i treninga"
5. Ostavi **Public** ili odaberi **Private**
6. **NE** dodavaj README, .gitignore ili license (već ih imamo)
7. Klikni **"Create repository"**

### 2. Inicijaliziraj Git u projektu

Otvori PowerShell ili Command Prompt u folderu `fitness-app` i pokreni:

```bash
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"

# Inicijaliziraj git
git init

# Dodaj sve datoteke
git add .

# Napravi prvi commit
git commit -m "Initial commit - CORPEX Fitness App"

# Dodaj GitHub remote (ZAMIJENI TvojeKorisnickoIme i ime-repozitorija)
git remote add origin https://github.com/TvojeKorisnickoIme/ime-repozitorija.git

# Push na GitHub
git branch -M main
git push -u origin main
```

### 3. Ako već imaš GitHub račun, kreiraj batch file za automatsko postavljanje

Datoteka `POSTAVI_NA_GITHUB.bat` će biti kreirana s uputama.

## Važno:

⚠️ **Nikada ne pushaj `env.local` na GitHub!** Sadrži tvoje Supabase ključeve.

✅ **Već je dodano u `.gitignore`** - `env.local` neće biti uploadan.

## Što će biti na GitHubu:

✅ Sav kod aplikacije  
✅ Konfiguracijske datoteke (package.json, tsconfig.json, itd.)  
✅ Dokumentacija (.md datoteke)  
❌ `node_modules` (ignorira se)  
❌ `env.local` (ignorira se - ne pushaj ključeve!)

## Nakon postavljanja:

1. Ažuriraj `README.md` sa opisom projekta
2. Dodaj link na live verziju ako je deployana
3. Možeš dodati screenshotove u README










