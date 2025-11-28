# 🎯 POČETAK - Kako Provjeriti Aplikaciju

## Korak 1: Otvori PowerShell

1. Pritisni `Win + X` (Windows tipka + X)
2. Odaberi **"Windows PowerShell"** ili **"Terminal"**

---

## Korak 2: Dodaj Node.js na PATH

U PowerShell-u upiši **JEDNU LINIJU** (kopiraj cijelu liniju):

```powershell
$env:Path += ";C:\Program Files\nodejs"
```

**Pritisni Enter.**

---

## Korak 3: Provjeri da li Node.js radi

Upiši:
```powershell
node -v
```

**Trebao bi vidjeti:** `v24.11.1` (ili neku verziju)

Ako vidiš verziju → ✅ Node.js radi!

Ako vidiš grešku → Node.js nije instaliran ili nije na PATH-u.

---

## Korak 4: Provjeri da li npm radi

Upiši:
```powershell
npm -v
```

**Trebao bi vidjeti:** `11.6.2` (ili neku verziju)

Ako vidiš verziju → ✅ npm radi!

---

## Korak 5: Idi u pravi folder

Upiši (kopiraj cijelu liniju):

```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
```

**Pritisni Enter.**

**VAŽNO:** Provjeri da si u `fitness-app` folderu, NE u `.env.local`!

Provjeri tako što upišeš:
```powershell
pwd
```

Trebao bi vidjeti: `C:\Users\jasmi\Documents\Česta pitanja\fitness-app`

---

## Korak 6: Pokreni aplikaciju

Upiši:
```powershell
npm run dev
```

**Pritisni Enter.**

---

## Korak 7: Što Trebaš Vidjeti

Nakon `npm run dev`, trebao bi vidjeti:

```
> fitness-app@0.1.0 dev
> next dev

  ▲ Next.js 16.0.3
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

**Ako vidiš "Ready" → ✅ Aplikacija radi!**

---

## Korak 8: Otvori Aplikaciju u Browseru

1. Otvori browser (Chrome, Edge, Firefox...)
2. U address bar upiši: `http://localhost:3000`
3. Pritisni Enter

**Trebao bi se vidjeti:**
- CORPEX naslov (crven)
- Tamno siva pozadina
- Rotirajuće sportske slike
- Onboarding stranica (prvi dio aplikacije)

---

## ✅ Provjera - Što Treba Raditi

1. ✅ Vidiš CORPEX naslov
2. ✅ Vidiš rotirajuće slike u pozadini
3. ✅ Možeš klikati "Dalje" i proći kroz slide-ove
4. ✅ Možeš unijeti podatke u formu
5. ✅ Možeš kliknuti "Pošalji" na kraju

---

## ❌ Ako Vidiš Greške

### Greška: "npm is not recognized"
- Vrati se na Korak 2 (dodaj Node.js na PATH)
- Ili koristi: `"C:\Program Files\nodejs\npm.cmd" run dev`

### Greška: "Cannot find path"
- Provjeri da si u `fitness-app` folderu (Korak 5)
- Provjeri da folder postoji

### Greška: "Port 3000 is already in use"
- Netko drugi već koristi port
- Zatvori drugi proces ili promijeni port

### Greška u browseru
- Provjeri browser console (F12 → Console)
- Pošalji mi grešku

---

## 📞 Javi Mi

Nakon što provjeriš, javi:
- ✅ Što radi?
- ❌ Što ne radi?
- 📸 Ako možeš, pošalji screenshot

---

## 🎯 Sljedeći Koraci (Nakon što aplikacija radi)

1. Testiraj cijeli flow (onboarding → payment → login → app)
2. Dodaj OpenAI API key za AI chat
3. Dodaj Stripe za payment
4. Poboljšanja

