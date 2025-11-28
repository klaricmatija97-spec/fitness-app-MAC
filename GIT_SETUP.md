# Git Setup i Prebacivanje na Drugi Laptop

## ✅ Što je napravljeno

1. Git repozitorij je inicijaliziran
2. Svi fajlovi su dodani u git (osim onih u .gitignore)
3. Napravljen je prvi commit

## 📋 Sljedeći koraci za prebacivanje na drugi laptop

### Opcija 1: Preko GitHub/GitLab (preporučeno)

1. **Kreiraj novi repozitorij na GitHub/GitLab:**
   - Idi na https://github.com ili https://gitlab.com
   - Klikni "New repository"
   - Nazovi ga npr. "fitness-app"
   - **NE kreiraj README, .gitignore ili license** (već postoje)

2. **Poveži lokalni repo s remote:**
   ```bash
   cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
   git remote add origin https://github.com/TVOJE_KORISNICKO_IME/fitness-app.git
   git branch -M main
   git push -u origin main
   ```

3. **Na drugom laptopu:**
   ```bash
   git clone https://github.com/TVOJE_KORISNICKO_IME/fitness-app.git
   cd fitness-app
   npm install
   ```

### Opcija 2: Preko USB-a ili mreže

1. **Kreiraj bare repository (bez working directory):**
   ```bash
   cd "C:\Users\jasmi\Documents\Česta pitanja"
   git clone --bare fitness-app fitness-app.git
   ```

2. **Kopiraj `fitness-app.git` folder na USB ili preko mreže**

3. **Na drugom laptopu:**
   ```bash
   git clone fitness-app.git fitness-app
   cd fitness-app
   npm install
   ```

### Opcija 3: Direktno kopiranje + git pull

1. **Kopiraj cijeli `fitness-app` folder na drugi laptop** (preko USB, mreže, cloud storagea...)

2. **Na drugom laptopu:**
   ```bash
   cd fitness-app
   git status  # provjeri da li je git repo ispravan
   ```

## ⚠️ Važno prije prebacivanja

### 1. Provjeri .env.local
Fajl `env.local` je u .gitignore i **NEĆE** biti prebačen. Trebaš ga ručno kopirati:

```bash
# Na novom laptopu kreiraj env.local s istim sadržajem
# Ili kopiraj env.local sa starog laptopa
```

### 2. Provjeri node_modules
`node_modules` se ne prebacuje (u .gitignore). Na novom laptopu pokreni:
```bash
npm install
```

### 3. Supabase konfiguracija
Provjeri da li su Supabase URL i API keys u `env.local` ispravni za novi laptop.

## 🔄 Ažuriranje koda na drugom laptopu

Ako koristiš GitHub/GitLab:
```bash
git pull origin main
npm install  # ako su dodani novi paketi
```

Ako koristiš direktno kopiranje:
```bash
# Kopiraj novi kod preko USB/mreže
# Ili koristi git pull ako imaš remote
```

## 📝 Provjera da li je sve u redu

Na novom laptopu pokreni:
```bash
cd fitness-app
npm install
npm run build
npm run dev
```

Ako sve radi, aplikacija bi trebala biti dostupna na http://localhost:3000

## 🐛 Rješavanje problema

### Problem: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Missing .env.local"
Kreiraj `env.local` fajl s istim sadržajem kao na starom laptopu.

### Problem: Git konflikti
```bash
git status  # vidi što je problem
git reset --hard HEAD  # vrati na zadnji commit (OPREZ: briše lokalne promjene)
```

