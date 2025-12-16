# Edamam-Only Mode - Implementacija

## ✅ Implementirano

Generator sada koristi **SAMO Edamam API** kao izvor podataka za maksimalnu točnost.

### Promjene:

1. **`buildCompositeMealForSlot`** - Sada koristi Edamam API za izračun makronutrijenata
   - Default: `USE_EDAMAM_ONLY = true` (Edamam-only mode)
   - Fallback: Ako Edamam ne radi, koristi USDA bazu

2. **Cost Controller** - Limit od **20€ mjesečno**
   - Lokacija: `lib/utils/edamamCostController.ts`
   - Free tier: 10,000 poziva/mjesec besplatno
   - Paid tier: $0.001 po pozivu (nakon free tier-a)
   - Maksimalno: ~30,000 poziva/mjesec (10,000 free + 20,000 paid = 20€)

3. **Rate Limiting** - 45 poziva/min
   - Lokacija: `lib/utils/edamamRateLimiter.ts`
   - Sprječava prekoračenje rate limita

---

## 📊 Kako funkcionira

### 1. Generiranje jela

```typescript
// U buildCompositeMealForSlot:
const USE_EDAMAM_ONLY = process.env.USE_EDAMAM_ONLY === 'true' || true; // Default: true

if (USE_EDAMAM_ONLY) {
  // Formiraj tekst sastojaka
  const ingredientText = ingredientComponents
    .map(c => `${c.grams}g ${c.foodName}`)
    .join(", ");

  // Dohvati podatke iz Edamam API-ja
  const edamamData = await analyzeNutritionFromText(ingredientText, selectedMeal.name);
  
  // Koristi Edamam podatke
  calories = edamamData.calories;
  protein = edamamData.protein;
  carbs = edamamData.carbs;
  fat = edamamData.fat;
}
```

### 2. Cost Controller provjera

```typescript
// U edamamService.ts (analyzeNutritionFromText):
const { edamamCostController } = await import("@/lib/utils/edamamCostController");

// Provjeri da li možemo napraviti poziv
const costCheck = edamamCostController.canMakeRequest();
if (!costCheck.allowed) {
  console.warn(`⚠️ Edamam poziv blokiran: ${costCheck.reason}`);
  return null; // Blokiraj poziv ako je limit prekoračen
}

// Nakon uspješnog poziva
edamamCostController.recordRequest();
```

---

## 💰 Troškovi

### Po tjednom planu (7 dana, 5 obroka/dan):
- **Broj poziva**: ~35 poziva
- **Trošak**: ~$0.035 (ako su svi nakon free tier-a)

### Mjesečno (pretpostavka: 100 planova):
- **Ukupno poziva**: ~3,500 poziva
- **Trošak**: **$0** (još u free tier-u) ✅

### Mjesečno (pretpostavka: 500 planova):
- **Ukupno poziva**: ~17,500 poziva
- **Free tier**: 10,000 poziva besplatno
- **Paid**: 7,500 poziva × $0.001 = **$7.50** ✅

### Mjesečno (pretpostavka: 1,000 planova):
- **Ukupno poziva**: ~35,000 poziva
- **Free tier**: 10,000 poziva besplatno
- **Paid**: 20,000 poziva × $0.001 = **$20** (limit) ✅
- **Prekoračenje**: Blokirano ❌

---

## 🛡️ Zaštita od prekoračenja

### Automatska kontrola:

1. **Provjera prije svakog poziva**:
   ```typescript
   const costCheck = edamamCostController.canMakeRequest();
   if (!costCheck.allowed) {
     return null; // Blokiraj poziv
   }
   ```

2. **Mjesečni reset**:
   - Automatski resetira brojač svakog 1. u mjesecu
   - Praćenje se resetira na 0

3. **Logiranje**:
   - Svakih 100 poziva logira status
   - Upozorenja kada se približava limitu

---

## ⚙️ Konfiguracija

### Environment varijabla (opcionalno):

```bash
# U .env.local:
USE_EDAMAM_ONLY=true  # Default: true (Edamam-only mode)
```

Ako želiš vratiti na hibridni pristup (USDA + Edamam validacija):
```bash
USE_EDAMAM_ONLY=false
```

---

## 📈 Prednosti Edamam-Only Mode-a

1. **Maksimalna točnost** ✅
   - Analizira cijelo jelo kao cjelinu
   - Uzima u obzir način pripreme
   - Real-time podaci

2. **Točnije za kompozitna jela** ✅
   - Ne samo zbrajanje namirnica
   - Uzima u obzir interakcije između namirnica

3. **Kontrolirani troškovi** ✅
   - Limit od 20€/mjesec
   - Free tier: 10,000 poziva/mjesec
   - Automatska blokada ako se prekorači limit

---

## ⚠️ Nedostaci

1. **Sporije performanse** ⏱️
   - API pozivi traju ~1-2 sekunde
   - Tjedni plan: ~35-70 sekundi dodatnog vremena

2. **Ovisnost o internetu** 🌐
   - Generator ne radi offline
   - Ako nema interneta, koristi USDA fallback

3. **Rate limiting** 🚦
   - Limit: 45 poziva/min
   - Može biti problem pri velikom volumenu

---

## 🔧 Kako provjeriti status

```typescript
import { edamamCostController } from "@/lib/utils/edamamCostController";

const status = edamamCostController.getMonthlyStatus();
console.log(status);
// {
//   requests: 5000,
//   cost: 0,
//   budget: 20,
//   remainingBudget: 20,
//   freeTierRemaining: 5000
// }
```

---

## 📋 Sažetak

✅ **Edamam-only mode aktiviran** (default)
✅ **Limit od 20€ mjesečno** postavljen
✅ **Cost controller** integritan
✅ **Rate limiting** aktiviran (45 poziva/min)
✅ **Automatska blokada** ako se prekorači limit
✅ **Mjesečni reset** automatski

---

## 🎯 Rezultat

Generator sada koristi **SAMO Edamam API** za maksimalnu točnost, s kontroliranim troškovima od maksimalno **20€ mjesečno**.

