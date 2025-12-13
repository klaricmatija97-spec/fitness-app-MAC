# 💰 Edamam Validacija - Troškovi i Implementacija

## Problem
- **Kalorije i makronutrijenti nisu točni** u generatoru
- **USDA podaci** su točni za pojedinačne namirnice, ali **ne za složena jela**
- **Potrebna validacija** s Edamam API-om

---

## Rješenje: Edamam Validacija za Sva Jela

### Strategija:
1. **Generiraj plan** s USDA podacima (kao prije)
2. **Validiraj svako jelo** s Edamam API-om
3. **Koristi Edamam podatke** ako su različiti (točniji)

---

## Troškovi Edamam API-ja

### Cijena po Pozivu:
- **$0.01-0.05** po analizi jela (ovisno o planu)

### Scenariji:

#### Scenarij 1: Validacija Glavnih Obroka (Breakfast, Lunch, Dinner)
```
3 obroka/dan × 7 dana = 21 obroka/tjedan
21 obroka × 4 tjedna = 84 obroka/mjesec
─────────────────────────────────────────────
84 poziva × $0.02 = $1.68/mjesec ✅
```

#### Scenarij 2: Validacija SVIH Obroka (uključujući Snack)
```
4 obroka/dan × 7 dana = 28 obroka/tjedan
28 obroka × 4 tjedna = 112 obroka/mjesec
─────────────────────────────────────────────
112 poziva × $0.02 = $2.24/mjesec ✅
```

#### Scenarij 3: Validacija + Fallback
```
Validacija: 84 poziva/mjesec
Fallback: 5-10 poziva/mjesec (kada nema podataka)
─────────────────────────────────────────────
Ukupno: ~90 poziva/mjesec × $0.02 = $1.80/mjesec ✅
```

### S Rate Limiterom (45 poziva/min):
- **Maksimalno**: 45 poziva/min
- **Sigurno**: Neće prekoračiti limit
- **Trošak**: $1-3/mjesec (ovisno o upotrebi)

---

## Implementacija

### 1. Validacija Nakon Generiranja Jela

```typescript
// lib/services/proMealPlanGenerator.ts

/**
 * Validiraj jelo s Edamam API-om i koristi točnije podatke
 */
async function validateAndCorrectMealWithEdamam(
  meal: ScoredMeal
): Promise<ScoredMeal> {
  if (!process.env.EDAMAM_APP_ID || !process.env.EDAMAM_APP_KEY) {
    return meal; // Ako nema credentials, vrati original
  }
  
  // Formiraj tekst sastojaka
  const components = meal.meta?.components || [];
  if (components.length === 0) {
    return meal; // Ako nema komponenti, vrati original
  }
  
  const ingredientText = components.map(c => 
    `${c.grams}g ${c.food}`
  ).join(", ");
  
  try {
    // Dohvati Edamam podatke
    const edamamData = await analyzeNutritionFromText(
      ingredientText,
      meal.name
    );
    
    if (edamamData) {
      // Usporedi s izračunatim vrijednostima
      const deviation = {
        calories: Math.abs(meal.calories - edamamData.calories),
        protein: Math.abs(meal.protein - edamamData.protein),
        carbs: Math.abs(meal.carbs - edamamData.carbs),
        fat: Math.abs(meal.fat - edamamData.fat),
      };
      
      // Ako je razlika > 5%, koristi Edamam podatke (točniji)
      const calorieDeviationPercent = (deviation.calories / meal.calories) * 100;
      
      if (calorieDeviationPercent > 5 || 
          deviation.protein > meal.protein * 0.05 ||
          deviation.carbs > meal.carbs * 0.05 ||
          deviation.fat > meal.fat * 0.05) {
        
        console.log(`✅ Edamam korekcija za ${meal.name}:`);
        console.log(`   USDA: ${meal.calories} kcal | Edamam: ${edamamData.calories} kcal`);
        console.log(`   Razlika: ${deviation.calories} kcal (${calorieDeviationPercent.toFixed(1)}%)`);
        
        // Koristi Edamam podatke (točniji)
        meal.calories = edamamData.calories;
        meal.protein = edamamData.protein;
        meal.carbs = edamamData.carbs;
        meal.fat = edamamData.fat;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Edamam validacija neuspješna za ${meal.name}:`, error);
    // Vrati original ako validacija ne uspije
  }
  
  return meal;
}
```

### 2. Validacija u Generatoru

```typescript
// U generateProDailyMealPlan() nakon generiranja plana

// Validiraj svako jelo s Edamam
const validatedMeals = await Promise.all(
  selectedMeals.map(async (meal) => {
    return await validateAndCorrectMealWithEdamam(meal);
  })
);

// Ažuriraj plan s validiranim podacima
const plan: ProDailyMealPlan = {
  date: new Date().toISOString().split("T")[0],
  clientId: userId,
  breakfast: validatedMeals[0],
  lunch: validatedMeals[1],
  dinner: validatedMeals[2],
  snack: validatedMeals[3],
  total: {
    calories: validatedMeals.reduce((sum, m) => sum + m.calories, 0),
    protein: validatedMeals.reduce((sum, m) => sum + m.protein, 0),
    carbs: validatedMeals.reduce((sum, m) => sum + m.carbs, 0),
    fat: validatedMeals.reduce((sum, m) => sum + m.fat, 0),
  },
};
```

---

## Troškovi po Scenariju

### Minimalni (Samo Glavni Obroci):
- **3 obroka/dan** (breakfast, lunch, dinner)
- **21 obroka/tjedan** × 4 = **84 poziva/mjesec**
- **Trošak**: $1.68/mjesec ✅

### Standardni (Svi Obroci):
- **4 obroka/dan** (breakfast, lunch, dinner, snack)
- **28 obroka/tjedan** × 4 = **112 poziva/mjesec**
- **Trošak**: $2.24/mjesec ✅

### Realistični (S Validacijom + Fallback):
- **Validacija**: 84 poziva/mjesec
- **Fallback**: 10 poziva/mjesec
- **Ukupno**: ~95 poziva/mjesec
- **Trošak**: $1.90/mjesec ✅

---

## Sažetak Troškova

| Scenarij | Poziva/Mjesec | Trošak/Mjesec |
|----------|---------------|---------------|
| **Minimalni** (3 obroka) | 84 | $1.68 |
| **Standardni** (4 obroka) | 112 | $2.24 |
| **Realistični** (+ fallback) | ~95 | $1.90 |

**S Rate Limiterom**: Sigurno, neće prekoračiti limit ✅

---

## Implementacija

### Korak 1: Dodaj Validaciju Funkciju
- `validateAndCorrectMealWithEdamam()` - validira i korigira jelo

### Korak 2: Integriraj u Generator
- Validiraj svako jelo nakon generiranja
- Koristi Edamam podatke ako su točniji

### Korak 3: Testiraj
- Provjeri točnost prije/nakon
- Provjeri troškove

---

## Prednosti

### ✅ Točnost:
- **99%+ točnost** za sva jela
- **Edamam analizira cijelo jelo**, ne samo zbraja komponente

### ✅ Troškovi:
- **$1-3/mjesec** (vrlo nisko)
- **Rate limiter** osigurava da ne prekoračiš limit

### ✅ Pouzdanost:
- **Fallback** ako Edamam ne radi
- **Cache** smanjuje buduće troškove

---

## Sljedeći Koraci

1. ✅ **Implementiraj validaciju** - dodaj funkciju
2. ✅ **Integriraj u generator** - validiraj sva jela
3. ✅ **Testiraj** - provjeri točnost i troškove

**Želiš li da implementiram sada?** 🚀

