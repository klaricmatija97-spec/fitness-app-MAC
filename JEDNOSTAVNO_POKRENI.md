# 🚀 JEDNOSTAVNO POKRETANJE - Korak po Korak

## ✅ Opcija 1: Batch fajl (NAJJEDNOSTAVNIJE)

**Dvaput klikni na:** `RUN.bat`

Skripta će:
1. Zatvoriti sve procese
2. Instalirati dependencies ako treba
3. Očistiti cache
4. Osloboditi port 3000
5. Pokrenuti aplikaciju
6. Automatski otvoriti browser nakon 35 sekundi

**Što trebaš vidjeti:**
- U crnom prozoru: "Ready" ili "Local: http://localhost:3000"
- Browser će se automatski otvoriti nakon 35 sekundi
- Ako se ne otvori, ručno otvori: `http://localhost:3000`

---

## ✅ Opcija 2: Ručno u Command Prompt

1. **Otvori Command Prompt (CMD):**
   - Pritisni `Win + R`
   - Upiši: `cmd`
   - Pritisni Enter

2. **Navigiraj u folder:**
   ```cmd
   cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
   ```

3. **Zatvori sve procese:**
   ```cmd
   taskkill /F /IM node.exe
   ```

4. **Pokreni aplikaciju:**
   ```cmd
   npm run dev
   ```

5. **Sačekaj 30 sekundi** dok ne vidiš "Ready"

6. **Otvori browser:**
   - Otvori Chrome/Edge/Firefox
   - Upiši: `http://localhost:3000`
   - Pritisni Enter

---

## ✅ Opcija 3: Ručno u PowerShell

1. **Otvori PowerShell:**
   - Pritisni `Win + X`
   - Odaberi "Windows PowerShell"

2. **Dodaj Node.js na PATH (ako treba):**
   ```powershell
   $env:Path += ";C:\Program Files\nodejs"
   ```

3. **Navigiraj u folder:**
   ```powershell
   cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
   ```

4. **Zatvori sve procese:**
   ```powershell
   taskkill /F /IM node.exe
   ```

5. **Pokreni aplikaciju:**
   ```powershell
   npm run dev
   ```

6. **Sačekaj 30 sekundi** dok ne vidiš "Ready"

7. **Otvori browser:**
   - Otvori Chrome/Edge/Firefox
   - Upiši: `http://localhost:3000`
   - Pritisni Enter

---

## ✅ Što trebaš vidjeti u browseru

- ✅ CORPEX naslov
- ✅ Onboarding stranica (prvi dio aplikacije)
- ✅ Forma za unos podataka

---

## ❌ Ako i dalje ne radi

**Javi mi:**
1. Što točno piše u prozoru gdje se pokreće aplikacija?
   - Vidiš li "Ready"?
   - Vidiš li grešku? (Kopiraj cijelu poruku)
   - Ne vidiš ništa?
   
2. Što se događa kad otvoriš `http://localhost:3000` u browseru?
   - Vidiš grešku?
   - Ne vidiš ništa?
   - Browser ne otvara stranicu?

---

## 🆘 Hitna pomoć

Ako **NIŠTA** ne radi:

1. **Restartaj računalo** (ponekad pomogne)
2. **Zatvori sve Node.js procese:**
   - Otvori Task Manager (`Ctrl + Shift + Esc`)
   - Pronađi sve "node.exe" procese
   - Desni klik → "End Task"
3. **Pokreni `RUN.bat` ponovno**

---

## ✅ Najbrže rješenje

**Pokreni `RUN.bat` i:**
- Sačekaj 35 sekundi
- Browser će se automatski otvoriti
- Ako se ne otvori, ručno otvori: `http://localhost:3000`

