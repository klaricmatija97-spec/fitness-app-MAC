# 🚀 JEDNOSTAVNO - 3 Koraka

## Korak 1: Otvori NOVI PowerShell

1. Zatvori sve PowerShell prozore
2. Pritisni `Win + X`
3. Odaberi **"Windows PowerShell"**

---

## Korak 2: Upiši OVE 3 LINIJE (jednu po jednu)

### Linija 1:
```powershell
$env:Path += ";C:\Program Files\nodejs"
```
**Pritisni Enter i sačekaj.**

### Linija 2:
```powershell
cd "C:\Users\jasmi\Documents\Česta pitanja\fitness-app"
```
**Pritisni Enter i sačekaj.**

### Linija 3:
```powershell
"C:\Program Files\nodejs\npm.cmd" run dev
```
**Pritisni Enter i sačekaj.**

---

## Korak 3: Što Trebaš Vidjeti

Nakon Linije 3, trebao bi vidjeti:

```
> fitness-app@0.1.0 dev
> next dev

  ▲ Next.js 16.0.3
  - Local:        http://localhost:3000
  - Ready in 2.3s
```

**Ako vidiš "Ready" → ✅ USPIELO JE!**

---

## Korak 4: Otvori Browser

1. Otvori Chrome, Edge ili Firefox
2. Upiši: `localhost:3000`
3. Pritisni Enter

**Trebao bi se vidjeti CORPEX aplikacija!**

---

## ✅ To je Sve!

Ako vidiš aplikaciju u browseru → **USPIELO JE!** 🎉

---

## ❌ Ako Vidiš Grešku

Pošalji mi:
1. Koja linija ne radi?
2. Koja je greška? (kopiraj cijelu poruku)

---

## 📝 Napomena

- **NE zatvaraj PowerShell** dok aplikacija radi!
- Ako zatvoriš PowerShell, aplikacija će se zaustaviti
- Da zaustaviš aplikaciju: Pritisni `Ctrl + C` u PowerShell-u

