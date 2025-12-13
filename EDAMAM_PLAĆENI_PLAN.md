# 💳 Edamam API - Plaćeni Plan (20 EUR)

## Što Znači Plaćeni Plan?

Ako si platio **20 EUR** za Edamam API, to znači da imaš **plaćeni plan** umjesto besplatnog.

---

## Razlika: Besplatni vs Plaćeni Plan

### Besplatni Plan:
- ✅ **5,000 poziva/mjesec** (Nutrition Analysis API)
- ✅ **10,000 poziva/mjesec** (Recipe Search API)
- ✅ **Rate limiting**: Ograničen broj poziva po minuti
- ❌ **Nema prioritetne podrške**

### Plaćeni Plan (20 EUR):
- ✅ **Više poziva** ili **neograničeno** (ovisno o paketu)
- ✅ **Viši rate limit** (više poziva po minuti)
- ✅ **Prioritetna podrška**
- ✅ **Volume discount** (niža cijena po pozivu)
- ✅ **Dedicated support**

---

## Edamam Pricing Struktura (2024)

### Opcija 1: Pay-as-you-go
- **$0.01-0.05 po pozivu** (ovisno o volumenu)
- **20 EUR ≈ $22** = ~440-2,200 poziva (ovisno o cijeni)

### Opcija 2: Mjesečni paket
- **20 EUR/mjesec** = određeni broj poziva
- Obično: **10,000-50,000 poziva/mjesec** (ovisno o paketu)

### Opcija 3: Prepaid krediti
- **20 EUR** = krediti koji se troše po pozivu
- **$0.02 po pozivu** = ~1,100 poziva

---

## Provjeri Svoj Plan

### Kako Provjeriti:
1. **Prijavi se** na https://developer.edamam.com
2. **Dashboard** → **Applications**
3. **Klikni na svoju aplikaciju**
4. **Pregledaj**:
   - **Plan Type**: Free / Paid / Enterprise
   - **Monthly Quota**: Koliko poziva imaš
   - **Usage**: Koliko si potrošio
   - **Remaining**: Koliko ti preostaje

---

## Izračun za 30 Korisnika

### Scenarij 1: 20 EUR = 10,000 poziva/mjesec
```
510 planova/mjesec × 4.5 poziva = 2,295 poziva/mjesec
─────────────────────────────────────────────
Preostaje: 10,000 - 2,295 = 7,705 poziva/mjesec ✅
```

**Zaključak**: Dovoljno za **~2,200 planova/mjesec** (4x više nego trebaš)

---

### Scenarij 2: 20 EUR = Pay-as-you-go
```
510 planova/mjesec × 4.5 poziva = 2,295 poziva/mjesec
2,295 poziva × $0.02 = $45.90/mjesec
─────────────────────────────────────────────
Trošak: ~$46/mjesec (≈ 42 EUR/mjesec)
```

**Zaključak**: Trebat će ti **~42 EUR/mjesec** (više nego što si platio)

---

### Scenarij 3: 20 EUR = Prepaid krediti
```
20 EUR = ~1,100 poziva (ako je $0.02/poziv)
510 planova × 4.5 poziva = 2,295 poziva/mjesec
─────────────────────────────────────────────
Nedostaje: 2,295 - 1,100 = 1,195 poziva/mjesec
```

**Zaključak**: **Nedovoljno** - trebat će ti još ~22 EUR/mjesec

---

## Najvjerojatniji Scenarij

### 20 EUR = Mjesečni Paket (10,000-50,000 poziva)

Ako si platio **20 EUR/mjesec**, vjerojatno imaš:
- ✅ **10,000-20,000 poziva/mjesec**
- ✅ **Dovoljno za 30 korisnika** (trebaš ~2,300 poziva)
- ✅ **Preostaje ti ~7,700-17,700 poziva** (možeš rasti)

---

## Prednosti Plaćenog Plana

### 1. **Viši Rate Limit**
- Besplatni: ~10 poziva/min
- Plaćeni: ~100+ poziva/min
- **Brže generiranje planova**

### 2. **Prioritetna Podrška**
- Brži odgovori na probleme
- Dedicirana email podrška

### 3. **Volume Discount**
- Niža cijena po pozivu
- Bolji deal za veće količine

### 4. **Bez Ograničenja**
- Ne moraš brinuti o prekoračenju
- Možeš rasti bez problema

---

## Preporuka za 30 Korisnika

### Ako Imaš 10,000+ Poziva/mjesec:
✅ **Koristi Opciju C (Obogaćivanje) bez brige!**

```
Tvoj limit: 10,000 poziva/mjesec
Tvoja potreba: 2,295 poziva/mjesec
─────────────────────────────────────────────
Preostaje: 7,705 poziva/mjesec
```

**Možeš obogaćivati sva jela za sve korisnike!**

---

## Optimizacije (Iako Nisu Potrebne)

Iako imaš dovoljno poziva, možeš optimizirati za:
1. **Brže generiranje** (manje API poziva = brže)
2. **Buduće skaliranje** (ako rasteš na 100+ korisnika)
3. **Cache podaci** (ne troši pozive za ista jela)

---

## Provjeri Svoj Dashboard

### Koraci:
1. Otvori: https://developer.edamam.com
2. **Dashboard** → **Applications**
3. **Klikni na svoju aplikaciju**
4. **Provjeri**:
   - **Plan**: Free / Paid / Enterprise?
   - **Monthly Quota**: Koliko poziva?
   - **Current Usage**: Koliko si potrošio?
   - **Remaining**: Koliko preostaje?

---

## Sažetak

### Ako si platio 20 EUR:
- ✅ **Vjerojatno imaš 10,000+ poziva/mjesec**
- ✅ **Dovoljno za 30 korisnika** (trebaš ~2,300 poziva)
- ✅ **Možeš koristiti Opciju C bez brige**
- ✅ **Preostaje ti ~7,700 poziva** (možeš rasti)

### Preporuka:
**Koristi Opciju C (Obogaćivanje) - imaš dovoljno poziva!** ✅

---

## Sljedeći Koraci

1. **Provjeri dashboard** - koliko poziva imaš?
2. **Dodaj credentials** u `env.local`
3. **Testiraj konekciju** (`/api/nutrition/test`)
4. **Implementiraj Opciju C** - obogaćivanje jela
5. **Monitoriraj usage** - prati koliko trošiš

---

## Pitanja za Provjeru

1. **Koliko poziva imaš u mjesecu?** (provjeri dashboard)
2. **Je li to jednokratna uplata ili mjesečni paket?**
3. **Imaš li rate limiting?** (koliko poziva/min)
4. **Želiš li da implementiram Opciju C?**

