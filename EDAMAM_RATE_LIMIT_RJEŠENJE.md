# ⚠️ Edamam Rate Limit Problem - Rješenje

## Problem

**Rate Limit**: 50 analyzed recipes per minute
**Tvoja upotreba**: 225 per minute (450% prekoračenje!)

**Uzrok**: Previše simultanih API poziva u generatoru prehrane.

---

## Rješenje: Rate Limiter

Trebamo implementirati **rate limiter** koji će kontrolirati broj poziva po minuti.

---

## Implementacija

### 1. Kreiraj Rate Limiter Utility

```typescript
// lib/utils/edamamRateLimiter.ts
class EdamamRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly maxRequestsPerMinute = 45; // 45 umjesto 50 za sigurnost
  private readonly requests: number[] = [];

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Ukloni stare zahtjeve (stariji od 1 minute)
      const oneMinuteAgo = Date.now() - 60000;
      while (this.requests.length > 0 && this.requests[0] < oneMinuteAgo) {
        this.requests.shift();
      }
      
      // Ako smo na limitu, čekaj
      if (this.requests.length >= this.maxRequestsPerMinute) {
        const oldestRequest = this.requests[0];
        const waitTime = 60000 - (Date.now() - oldestRequest);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      // Izvrši zahtjev
      const request = this.queue.shift();
      if (request) {
        this.requests.push(Date.now());
        await request();
      }
    }
    
    this.processing = false;
  }
}

export const edamamRateLimiter = new EdamamRateLimiter();
```

### 2. Ažuriraj Edamam Service

```typescript
// lib/services/edamamService.ts
import { edamamRateLimiter } from "@/lib/utils/edamamRateLimiter";

export async function analyzeNutrition(
  ingredients: IngredientInput[],
  title?: string
): Promise<SimplifiedNutrition | null> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    console.error("❌ Edamam API credentials nisu konfigurirani!");
    return null;
  }

  // Koristi rate limiter
  return edamamRateLimiter.execute(async () => {
    const ingredientLines = formatIngredients(ingredients);
    
    console.log(`🔍 Edamam analiza: ${title || "Jelo"}`);
    console.log(`   Sastojci: ${ingredientLines.join(", ")}`);

    const response = await fetch(
      `${EDAMAM_BASE_URL}?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title || "Meal",
          ingr: ingredientLines,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Edamam API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data: EdamamNutritionResponse = await response.json();
    // ... ostatak koda
  });
}
```

### 3. Ažuriraj Meal Enricher

```typescript
// lib/services/mealEnricher.ts
import { edamamRateLimiter } from "@/lib/utils/edamamRateLimiter";

export async function enrichMeal(meal: MealData): Promise<EnrichedMeal> {
  const ingredientText = componentsToEdamamFormat(meal.components);
  
  console.log(`\n📦 Obogaćujem: ${meal.name}`);
  console.log(`   Sastojci: ${ingredientText}`);
  
  // Koristi rate limiter
  const nutrition = await edamamRateLimiter.execute(async () => {
    return await analyzeNutritionFromText(ingredientText, meal.name);
  });
  
  // ... ostatak koda
}
```

---

## Alternativno Rješenje: Batch Obogaćivanje

Umjesto obogaćivanja u real-time, obogati jela **batch-om** (jednom dnevno):

```typescript
// scripts/enrichMealsBatch.ts
import { enrichMeals } from "@/lib/services/mealEnricher";
import mealComponents from "@/lib/data/meal_components.json";

async function enrichAllMeals() {
  console.log("🚀 Počinjem batch obogaćivanje svih jela...");
  
  const allMeals = [
    ...mealComponents.breakfast,
    ...mealComponents.lunch,
    ...mealComponents.dinner,
    ...mealComponents.snack,
  ];
  
  // Obogati s pauzom između (rate limiter će kontrolirati)
  const enriched = await enrichMeals(allMeals, 1000); // 1 sekunda pauza
  
  // Spremi u cache
  // ... spremi u meal_nutrition_cache.json
}

enrichAllMeals();
```

---

## Preporučena Strategija

### 1. **Koristi Cache Podatke** (Prioritet)
- Već imaš `meal_nutrition_cache.json`
- Koristi cache umjesto API poziva
- API pozivi samo za **nova jela**

### 2. **Rate Limiter** (Zaštita)
- Implementiraj rate limiter
- Maksimalno 45 poziva/min
- Queue sistem za čekanje

### 3. **Batch Obogaćivanje** (Optimizacija)
- Obogati jela **jednom dnevno** (batch)
- Spremi u cache
- Koristi cache u generatoru

### 4. **Selektivno Obogaćivanje** (Opcionalno)
- Obogati samo **glavne obroke** (breakfast, lunch, dinner)
- Preskoči snack (manje važno)

---

## Hitno Rješenje (Sada)

### 1. **Onemogući Real-time Obogaćivanje**

Ako trenutno obogaćuješ jela u real-time, **onemogući to**:

```typescript
// U proMealPlanGenerator.ts
// KOMENTIRAJ ili ukloni Edamam pozive
// const enriched = await enrichMeal(meal); // ← KOMENTIRAJ
```

### 2. **Koristi Cache Podatke**

```typescript
// Koristi postojeće cache podatke
import { getNutritionById } from "@/lib/data/nutritionLookup";

const nutrition = getNutritionById(mealId);
if (nutrition) {
  // Koristi cache podatke
} else {
  // Ako nema cache, koristi izračunate vrijednosti (USDA)
}
```

### 3. **Dodaj Rate Limiter** (Dugoročno)

Implementiraj rate limiter kako je gore opisano.

---

## Provjera Trenutnog Koda

Trebam provjeriti:
1. Gdje se poziva Edamam API u generatoru?
2. Koliko poziva se radi simultano?
3. Imaš li već cache podatke?

---

## Sljedeći Koraci

1. ✅ **Onemogući real-time obogaćivanje** (hitno)
2. ✅ **Koristi cache podatke** (hitno)
3. ✅ **Implementiraj rate limiter** (dugoročno)
4. ✅ **Batch obogaćivanje** (optimizacija)

---

## Sažetak

**Problem**: 225 poziva/min (limit: 50/min)
**Rješenje**: 
- Rate limiter (45 poziva/min)
- Cache podaci (smanji pozive)
- Batch obogaćivanje (optimizacija)

**Hitno**: Onemogući real-time obogaćivanje i koristi cache!

