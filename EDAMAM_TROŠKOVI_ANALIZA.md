# 💰 Edamam API - Analiza Troškova za 30 Korisnika

## Opcija C: Obogaćivanje (Enrichment)

### Što se obogaćuje:
- **Sva jela** u planu (breakfast, lunch, dinner, snack)
- **Mikronutrijenti**: vitamini, minerali, vlakna, šećeri
- **Detaljni podaci**: natrij, zasićene masti, itd.

---

## Troškovi po Planu

### Pozivi po Planu:
- **4-5 poziva** (po obroku: breakfast, lunch, dinner, snack, extraSnack)
- **Cijena po pozivu**: ~$0.01-0.05 (ovisno o volumenu)
- **Ukupno po planu**: ~$0.04-0.25

### Prosječna Cijena:
- **Optimistično**: $0.04 po planu (ako imaš volume discount)
- **Realistično**: $0.10-0.15 po planu (standardna cijena)
- **Pesimistično**: $0.25 po planu (ako nemaš discount)

---

## Scenariji za 30 Korisnika

### Scenarij 1: Dnevni Plan (1x dnevno)
**Pretpostavka**: Svaki korisnik generira **1 dnevni plan dnevno**

```
30 korisnika × 1 plan/dan × 30 dana = 900 planova/mjesec
900 planova × $0.10 = $90/mjesec
900 planova × $0.15 = $135/mjesec
```

**Mjesečni trošak: $90-135**

---

### Scenarij 2: Tjedni Plan (1x tjedno)
**Pretpostavka**: Svaki korisnik generira **1 tjedni plan tjedno**

```
30 korisnika × 1 plan/tjedan × 4 tjedna = 120 planova/mjesec
120 planova × $0.10 = $12/mjesec
120 planova × $0.15 = $18/mjesec
```

**Mjesečni trošak: $12-18**

---

### Scenarij 3: Mješovito (Realistično)
**Pretpostavka**: 
- 50% korisnika generira dnevni plan (15 korisnika)
- 50% korisnika generira tjedni plan (15 korisnika)
- Dnevni plan: 1x dnevno
- Tjedni plan: 1x tjedno

```
Dnevni planovi: 15 korisnika × 30 dana = 450 planova/mjesec
Tjedni planovi: 15 korisnika × 4 tjedna = 60 planova/mjesec
Ukupno: 510 planova/mjesec

510 planova × $0.10 = $51/mjesec
510 planova × $0.15 = $76.50/mjesec
```

**Mjesečni trošak: $51-77**

---

### Scenarij 4: Aktivni Korisnici (Najgori Slučaj)
**Pretpostavka**: Svi korisnici su aktivni i generiraju planove često
- 20 korisnika: dnevni plan (1x dnevno)
- 10 korisnika: tjedni plan (1x tjedno)
- Povremeno: regeneriraju planove (2x tjedno)

```
Dnevni: 20 × 30 dana = 600 planova/mjesec
Tjedni: 10 × 4 tjedna = 40 planova/mjesec
Regeneracije: 30 × 2 × 4 = 240 planova/mjesec
Ukupno: 880 planova/mjesec

880 planova × $0.10 = $88/mjesec
880 planova × $0.15 = $132/mjesec
```

**Mjesečni trošak: $88-132**

---

## Optimizacije za Smanjenje Troškova

### 1. **Cache Podaci** (Preporučeno)
**Štednja: 70-90%**

Ako već imaš cache podatke (`meal_nutrition_cache.json`), ne trebaš obogaćivati ista jela ponovno:

```
Bez cache: 510 planova × $0.10 = $51/mjesec
S cache: 510 planova × 10% novih × $0.10 = $5.10/mjesec
```

**Ušteda: ~$46/mjesec**

---

### 2. **Selektivno Obogaćivanje**
**Štednja: 50-70%**

Obogati samo **glavne obroke** (breakfast, lunch, dinner), preskoči snack:

```
Svi obroci: 4-5 poziva/plan = $0.10/plan
Samo glavni: 3 poziva/plan = $0.06/plan

510 planova × $0.06 = $30.60/mjesec
```

**Ušteda: ~$20-45/mjesec**

---

### 3. **Obogaćivanje samo za Premium Korisnike**
**Štednja: 80-90%**

Ako imaš 5 premium korisnika od 30:

```
Premium: 5 korisnika × 30 dana = 150 planova/mjesec
Standard: 25 korisnika × 0 = 0 planova/mjesec

150 planova × $0.10 = $15/mjesec
```

**Ušteda: ~$36-120/mjesec**

---

### 4. **Batch Obogaćivanje** (Najbolje)
**Štednja: 60-80%**

Obogati jela **jednom** i spremi u cache, koristi za sve korisnike:

```
Bez batch: 510 planova × $0.10 = $51/mjesec
S batch: 100 jedinstvenih jela × $0.10 = $10/mjesec
```

**Ušteda: ~$41/mjesec**

---

## Preporučena Strategija za 30 Korisnika

### Faza 1: Početak (Nisko trošenje)
```
✅ Cache postojeća jela (meal_nutrition_cache.json)
✅ Obogati samo NOVA jela (koja nisu u cache-u)
✅ Selektivno: samo glavni obroci (breakfast, lunch, dinner)
```

**Očekivani trošak: $5-15/mjesec**

---

### Faza 2: Rast (Srednje trošenje)
```
✅ Obogati sva jela, ali koristi cache
✅ Batch obogaćivanje za nova jela
✅ Obogaćivanje samo za aktivne korisnike
```

**Očekivani trošak: $20-40/mjesec**

---

### Faza 3: Skaliranje (Visoko trošenje)
```
✅ Obogati sva jela za sve korisnike
✅ Real-time obogaćivanje
✅ Premium features
```

**Očekivani trošak: $50-135/mjesec**

---

## Usporedba Opcija

### Opcija A: Validacija
- **Pozivi**: 1-2 po planu (samo glavni obroci)
- **Cijena**: ~$0.02-0.05 po planu
- **30 korisnika**: $6-22/mjesec
- **Prednost**: Nisko trošenje, provjera točnosti

### Opcija B: Fallback
- **Pozivi**: Varijabilno (samo kada USDA nema podatke)
- **Cijena**: ~$0.01-0.03 po nedostajućoj namirnici
- **30 korisnika**: $3-15/mjesec (ovisno o nedostajućim podacima)
- **Prednost**: Ekonomski, samo kada je potrebno

### Opcija C: Obogaćivanje
- **Pozivi**: 4-5 po planu (sva jela)
- **Cijena**: ~$0.04-0.25 po planu
- **30 korisnika**: $12-135/mjesec (ovisno o aktivnosti)
- **Prednost**: Detaljni podaci, mikronutrijenti

---

## Preporuka za 30 Korisnika

### 🎯 Optimalna Strategija:

**Kombinacija Opcija B + C (s Cache-om):**

1. **Fallback** (Opcija B) - kada USDA nema podatke
2. **Obogaćivanje s Cache-om** (Opcija C) - samo nova jela
3. **Selektivno** - samo glavni obroci

**Očekivani trošak: $10-25/mjesec**

---

## Kalkulator Troškova

### Unesi svoje podatke:

```javascript
const korisnika = 30;
const planovaPoKorisnikuDnevno = 1; // ili 0.14 za tjedni plan
const cijenaPoPozivu = 0.02; // $0.01-0.05
const pozivaPoPlanu = 4; // 3-5

const planovaMjesecno = korisnika * planovaPoKorisnikuDnevno * 30;
const pozivaMjesecno = planovaMjesecno * pozivaPoPlanu;
const trošakMjesecno = pozivaMjesecno * cijenaPoPozivu;

console.log(`Planova/mjesec: ${planovaMjesecno}`);
console.log(`Poziva/mjesec: ${pozivaMjesecno}`);
console.log(`Trošak/mjesec: $${trošakMjesecno.toFixed(2)}`);
```

---

## Edamam Pricing (2024)

### Besplatni Plan:
- **5,000 poziva/mjesec** (Nutrition API)
- **10,000 poziva/mjesec** (Recipe API)
- **Dovoljno za**: ~1,000-1,250 planova/mjesec (s 4-5 poziva)

### Plaćeni Plan:
- **$0.01-0.05 po pozivu** (ovisno o volumenu)
- **Volume discount**: >10,000 poziva/mjesec = niža cijena
- **Preporuka**: Ako imaš >1,000 poziva/mjesec, razmotri plaćeni plan

---

## Sažetak za 30 Korisnika

### Realistični Scenarij (Mješovito):
- **510 planova/mjesec**
- **2,040-2,550 poziva/mjesec** (4-5 poziva/plan)
- **Trošak: $51-77/mjesec** (bez optimizacija)
- **Trošak: $10-25/mjesec** (s optimizacijama)

### Optimizacije:
- ✅ **Cache podaci**: -70-90% troškova
- ✅ **Selektivno obogaćivanje**: -50-70% troškova
- ✅ **Batch obogaćivanje**: -60-80% troškova

### Preporuka:
**Kombinacija B + C s Cache-om = $10-25/mjesec** ✅

---

## Pitanja za Odluku

1. **Koliko često korisnici generiraju planove?**
   - Dnevno? Tjedno? Mjesečno?

2. **Imaš li već cache podatke?**
   - `meal_nutrition_cache.json` - ako da, ušteda 70-90%

3. **Trebaju li svi korisnici detaljne mikronutrijente?**
   - Ili samo premium korisnici?

4. **Koliko si spreman platiti mjesečno?**
   - $10-25 (s optimizacijama) ✅
   - $50-80 (bez optimizacija)
   - $100+ (bez ograničenja)

