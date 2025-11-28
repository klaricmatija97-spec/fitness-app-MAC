# 🔧 Riješi "Cannot find module" Error

## ❌ Problem

Dobivaš grešku:
```
Error: Cannot find module 'dotenv'
```

**Razlog:** Node.js ne može pronaći potrebne module (packages).

---

## ✅ Rješenje 1: Instaliraj Dependencies

### Korak 1: Otvori Terminal/PowerShell

**PowerShell:**
- Pritisni `Windows + X`
- Odaberi "Windows PowerShell"

### Korak 2: Idi u Fitness-App Folder

```bash
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
```

### Korak 3: Instaliraj Dependencies

```bash
npm install
```

**Sačekaj** dok se instalira (može potrajati 1-2 minute).

### Korak 4: Pokreni Test Ponovno

```bash
node test-supabase-connection.js
```

---

## ✅ Rješenje 2: Koristi Batch Fajl (Ažuriran)

**Ažurirao sam `TESTIRAJ_SUPABASE.bat`** da automatski instalira dependencies ako nedostaju.

**Samo pokreni:**
1. Dvaput klikni na `TESTIRAJ_SUPABASE.bat`
2. Ako nedostaju dependencies, automatski će ih instalirati
3. Zatim će pokrenuti test

---

## 🔍 Provjera: Da li su Dependencies Instalirani?

### Provjeri da li postoji `node_modules` folder:

1. **Otvori File Explorer**
2. **Idi u:** `C:\Users\jasmi\Documents\Česta pitanja\fitness-app`
3. **Provjeri da li postoji folder:** `node_modules`

**Ako NE postoji:**
- Pokreni `npm install` u terminalu
- Ili pokreni ažurirani `TESTIRAJ_SUPABASE.bat`

**Ako postoji:**
- Provjeri da li se test može pokrenuti
- Ako i dalje ima problema, možda je problem s putanjom

---

## 📋 Potrebni Dependencies

Test skripta koristi:
- `dotenv` - za učitavanje environment varijabli iz `env.local`
- `@supabase/supabase-js` - za konekciju sa Supabase

Oba su već navedena u `package.json`, samo trebaju biti instalirani.

---

## ❓ Ako i Dalje Ima Problema

### Problem: "npm is not recognized"

**Rješenje:**
- Node.js možda nije instaliran
- Instaliraj Node.js: https://nodejs.org
- Nakon instalacije, restartaj terminal

### Problem: "Cannot find module" i nakon `npm install`

**Rješenje:**
1. **Obriši `node_modules` i `package-lock.json`:**
   ```bash
   cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
   rmdir /s /q node_modules
   del package-lock.json
   ```

2. **Instaliraj ponovno:**
   ```bash
   npm install
   ```

3. **Pokreni test ponovno:**
   ```bash
   node test-supabase-connection.js
   ```

---

## ✅ Nakon Uspješne Instalacije

Trebao bi vidjeti:
- ✅ Instalaciju paketa
- ✅ Poruku "added X packages"
- ✅ Test se može pokrenuti

**Tada pokreni test ponovno!**

