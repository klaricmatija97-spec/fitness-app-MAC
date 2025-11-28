# 📦 Kako Prebaciti Projekt na Drugi Laptop

## ⚠️ Trenutno stanje
Git nije instaliran na ovom laptopu. Imaš nekoliko opcija:

---

## 🎯 OPCIJA 1: Instaliraj Git i koristi GitHub (PREPORUČENO)

### Korak 1: Instaliraj Git
1. Idi na: https://git-scm.com/download/win
2. Preuzmi i instaliraj Git for Windows
3. Tijekom instalacije, prihvati sve default opcije
4. Nakon instalacije, **restartaj PowerShell/CMD**

### Korak 2: Inicijaliziraj Git u projektu
```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
git init
git add .
git commit -m "Initial commit: Fitness app"
```

### Korak 3: Kreiraj GitHub repozitorij
1. Idi na https://github.com i prijavi se (ili kreiraj račun)
2. Klikni "New repository"
3. Nazovi ga npr. "fitness-app"
4. **NE kreiraj README, .gitignore ili license** (već postoje)
5. Klikni "Create repository"

### Korak 4: Poveži lokalni repo s GitHub-om
```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
git remote add origin https://github.com/TVOJE_KORISNICKO_IME/fitness-app.git
git branch -M main
git push -u origin main
```

### Korak 5: Na drugom laptopu
```powershell
git clone https://github.com/TVOJE_KORISNICKO_IME/fitness-app.git
cd fitness-app
npm install
```

---

## 🎯 OPCIJA 2: Kopiraj direktno (bez Git-a)

### Korak 1: Pripremi projekt za kopiranje
1. **Kopiraj cijeli folder:**
   ```
   C:\Users\jasmi\Documents\Česta pitanja\fitness-app
   ```

2. **IZBRIŠI ove foldere prije kopiranja** (ne trebaju se):
   - `node_modules` (velik je, ponovno će se instalirati)
   - `.next` (build folder, ponovno će se generirati)

### Korak 2: Kopiraj na drugi laptop
- Preko USB-a
- Preko mreže (network share)
- Preko cloud storagea (OneDrive, Google Drive, Dropbox...)
- Preko email-a (zip fajl)

### Korak 3: Na drugom laptopu
```powershell
cd fitness-app
npm install
npm run dev
```

---

## 🎯 OPCIJA 3: Koristi ZIP fajl

### Korak 1: Napravi ZIP
1. Desni klik na `fitness-app` folder
2. "Send to" → "Compressed (zipped) folder"
3. Izbriši iz ZIP-a:
   - `node_modules` folder
   - `.next` folder

### Korak 2: Prebaci ZIP na drugi laptop
- USB, email, cloud storage...

### Korak 3: Na drugom laptopu
1. Raspakiraj ZIP
2. Otvori PowerShell u `fitness-app` folderu
3. Pokreni:
   ```powershell
   npm install
   npm run dev
   ```

---

## ⚠️ VAŽNO: Što MORAŠ ručno prebaciti

### 1. `env.local` fajl
Ovaj fajl **NIKAD** ne smije biti u git-u (sadrži tajne ključeve).

**Kopiraj ga ručno:**
- Sa starog laptopa: `fitness-app\env.local`
- Na novi laptop: `fitness-app\env.local`

**Ili kreiraj novi na drugom laptopu:**
```bash
# U fitness-app folderu kreiraj env.local s istim sadržajem
```

### 2. Supabase konfiguracija
Provjeri da li su u `env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Ovi podaci su isti na oba laptopa (osim ako ne koristiš različite Supabase projekte).

---

## ✅ Provjera na novom laptopu

Nakon prebacivanja, provjeri:

```powershell
cd fitness-app
npm install
npm run build
npm run dev
```

Ako sve radi, aplikacija bi trebala biti na: http://localhost:3000

---

## 🐛 Rješavanje problema

### Problem: "Cannot find module"
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Problem: "Missing .env.local"
Kreiraj `env.local` fajl s istim sadržajem kao na starom laptopu.

### Problem: "Port 3000 already in use"
```powershell
# Pronađi proces koji koristi port 3000
netstat -ano | findstr :3000
# Zatvori proces (zamijeni PID s brojem iz prethodne komande)
taskkill /PID <PID> /F
```

---

## 📝 Preporuka

**Najbolje je koristiti OPCIJU 1 (Git + GitHub)** jer:
- ✅ Lako ažuriraš kod na oba laptopa
- ✅ Imaš backup koda
- ✅ Možeš vidjeti povijest promjena
- ✅ Lako dijeliš kod s drugima

Ali ako želiš brzo prebaciti **sada**, koristi **OPCIJU 2 ili 3**.

