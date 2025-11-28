# 🚀 Kako Pokrenuti Aplikaciju

## Problem: "npm is not recognized"

Node.js je instaliran, ali nije na PATH-u. Evo kako to popraviti:

## Rješenje: Korak po Korak

### Korak 1: Otvori PowerShell

1. Pritisni `Win + X`
2. Odaberi "Windows PowerShell" ili "Terminal"

### Korak 2: Dodaj Node.js na PATH (u ovom sessionu)

U PowerShell-u upiši:
```powershell
$env:Path += ";C:\Program Files\nodejs"
```

Pritisni Enter.

### Korak 3: Provjeri da li radi

Upiši:
```powershell
node -v
```

Trebao bi vidjeti: `v24.11.1` (ili neku verziju)

Zatim upiši:
```powershell
npm -v
```

Trebao bi vidjeti: `11.6.2` (ili neku verziju)

### Korak 4: Navigiraj u pravi folder

Upiši:
```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
```

Pritisni Enter.

**VAŽNO:** Provjeri da si u `fitness-app` folderu, NE u `.env.local` folderu!

### Korak 5: Pokreni aplikaciju

Upiši:
```powershell
npm run dev
```

Pritisni Enter.

---

## Što Trebaš Vidjeti

Nakon `npm run dev`, trebao bi vidjeti:

```
> fitness-app@0.1.0 dev
> next dev

  ▲ Next.js 16.0.3
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

---

## Otvori Aplikaciju

1. Otvori browser (Chrome, Edge, Firefox...)
2. Upiši u address bar: `http://localhost:3000`
3. Pritisni Enter
4. Trebao bi se vidjeti onboarding (prvi dio aplikacije)

---

## Ako I Dalje Ne Radi

### Opcija A: Koristi puni put do npm

U PowerShell-u upiši:
```powershell
"C:\Program Files\nodejs\npm.cmd" run dev
```

### Opcija B: Restartaj PowerShell

1. Zatvori PowerShell
2. Otvori novi PowerShell
3. Pokušaj ponovno

### Opcija C: Dodaj Node.js trajno na PATH

1. Pritisni `Win + R`
2. Upiši: `sysdm.cpl`
3. Klikni "Environment Variables"
4. U "System variables" odaberi "Path"
5. Klikni "Edit"
6. Klikni "New"
7. Upiši: `C:\Program Files\nodejs`
8. Klikni "OK" na svim prozorima
9. Restartaj PowerShell

---

## Troubleshooting

**Greška: "Cannot find path"**
- Provjeri da li folder `fitness-app` postoji
- Provjeri da si u pravom folderu

**Greška: "npm is not recognized"**
- Dodaj Node.js na PATH (korak 2)
- Ili koristi puni put (Opcija A)

**Greška: "Port 3000 is already in use"**
- Netko drugi već koristi port
- Zatvori drugi proces ili promijeni port

---

## Javi Mi

Nakon što pokreneš, javi:
- ✅ Vidiš li "Ready" poruku?
- ✅ Otvara li se aplikacija u browseru?
- ❌ Ako vidiš grešku, pošalji mi poruku s greškom!

