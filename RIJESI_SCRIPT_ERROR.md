# 🔧 Riješi "Running scripts is disabled" Error

## ❌ Problem

Dobivaš grešku:
```
running scripts is disabled on this system
```

**Razlog:** Windows PowerShell ima execution policy koji blokira pokretanje skripti.

---

## ✅ Rješenje 1: Koristi CMD (Batch) Umjesto PowerShell (NAJLAKŠE)

### Korak 1: Koristi Batch Fajl

**Kreirao sam novi fajl:** `TESTIRAJ_SUPABASE_CMD.bat`

1. **Pronađi fajl:** `fitness-app/TESTIRAJ_SUPABASE_CMD.bat`
2. **Dvaput klikni** na njega
3. **Trebao bi raditi bez problema!**

---

## ✅ Rješenje 2: Omogući PowerShell Execution Policy

**Ako želiš koristiti PowerShell:**

### Korak 1: Otvori PowerShell kao Administrator

1. **Pritisni:** `Windows + X`
2. **Odaberi:** "Windows PowerShell (Admin)" ili "Terminal (Admin)"
3. **Klikni "Yes"** kada Windows traži dozvolu

### Korak 2: Promijeni Execution Policy

**Za trenutnu sesiju (preporučeno):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

**Ili za korisnika (trajno):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Korak 3: Pokreni Test

```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
npm install
node test-supabase-connection.js
```

---

## ✅ Rješenje 3: Koristi Command Prompt (CMD)

**Command Prompt ne koristi execution policy:**

1. **Pritisni:** `Windows + R`
2. **Upiši:** `cmd` i pritisni Enter
3. **Idi u folder:**
   ```cmd
   cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
   ```
4. **Instaliraj dependencies:**
   ```cmd
   npm install
   ```
5. **Pokreni test:**
   ```cmd
   node test-supabase-connection.js
   ```

---

## 🎯 Preporuka

**NAJLAKŠE:** Koristi `TESTIRAJ_SUPABASE_CMD.bat` fajl - to je batch fajl koji radi u CMD-u bez execution policy problema.

**Ili** koristi Command Prompt (CMD) umjesto PowerShell.

---

## 📋 Što Koristi Što?

- **`.bat` fajlovi** → Rade u CMD-u (bez execution policy)
- **`.ps1` fajlovi** → Rade u PowerShell-u (treba execution policy)
- **`.js` fajlovi** → Rade u Node.js-u (bez execution policy za Node.js, ali npm može imati problema)

---

## ✅ Provjera

Nakon što pokreneš test, trebao bi vidjeti:
```
✅ SUPABASE_URL: postavljen
✅ SUPABASE_SERVICE_ROLE_KEY: postavljen
✅ Konekcija uspješna!
🎉 SVE JE U REDU!
```

---

## ❓ Ako i Dalje Ima Problema

**Problem:** Batch fajl se ne pokreće
- Probaj desni klik → "Run as administrator"

**Problem:** npm ne radi
- Provjeri da li je Node.js instaliran: `node --version`
- Provjeri da li je npm instaliran: `npm --version`

**Problem:** Node.js ne postoji
- Instaliraj Node.js: https://nodejs.org
- Restartaj terminal nakon instalacije

