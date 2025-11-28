# 🔄 Restart Aplikacije - Nakon Popravka Greške

## ✅ Što je popravljeno
- Uklonjen problematičan dinamički import OpenAI paketa
- Chat API sada koristi jednostavne fallback odgovore

## 🚀 Kako restartati aplikaciju

### Korak 1: Zatvori sve Node.js procese
1. Otvori PowerShell
2. Upiši:
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Korak 2: Navigiraj u folder
```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
```

### Korak 3: Pokreni aplikaciju
```powershell
"C:\Program Files\nodejs\npm.cmd" run dev
```

### Korak 4: Otvori browser
1. Otvori Chrome/Edge/Firefox
2. Upiši: `http://localhost:3000`
3. Pritisni Enter

---

## ✅ Trebao bi vidjeti
- CORPEX aplikaciju bez grešaka
- Rotirajuće sportske slike u pozadini
- Onboarding stranicu

---

## ❌ Ako i dalje vidiš grešku
Pošalji mi:
1. Koja je točna greška? (kopiraj cijelu poruku)
2. U kojem prozoru se pojavljuje? (browser ili terminal)

