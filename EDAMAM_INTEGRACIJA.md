# 🔧 Edamam API - Integracija u Generator Prehrane

## Trenutno Stanje

### ❌ Problem:
- **Edamam API je plaćen**, ali se **NE koristi** u generatoru
- Generator koristi samo **USDA CSV podatke** (besplatno)
- Edamam se koristi samo za **obogaćivanje jela** (mealEnricher), ali to se ne poziva u generatoru

### ✅ Rješenje:
Integrirati Edamam API u generator za:
1. **Validaciju podataka** - provjera točnosti makronutrijenata
2. **Obogaćivanje jela** - detaljni mikronutrijenti
3. **Fallback** - ako USDA nema podatke, koristi Edamam

---

## Korak 1: Dodaj Credentials u env.local

Dodaj svoje Edamam credentials u `env.local`:

```bash
# Edamam Nutrition Analysis API
EDAMAM_APP_ID=tvoj_app_id_ovdje
EDAMAM_APP_KEY=tvoj_app_key_ovdje

# Edamam Recipe Search API (opcionalno)
EDAMAM_RECIPE_APP_ID=tvoj_recipe_app_id_ovdje
EDAMAM_RECIPE_APP_KEY=tvoj_recipe_app_key_ovdje
```

---

## Korak 2: Testiraj Konekciju

### Test Nutrition API:
```bash
curl http://localhost:3000/api/nutrition/test
```

### Test Recipe API:
```bash
curl http://localhost:3000/api/recipes/test
```

Ako vidiš `"success": true` → API radi! ✅

---

## Korak 3: Gdje Se Treba Koristiti Edamam?

### 1. **Validacija Makronutrijenata** (Prioritet)

Kada generator kreira jelo, može koristiti Edamam za provjeru točnosti:

```typescript
// U buildCompositeMealForSlot() funkciji
const mealComponents = [...]; // Sastojci jela

// Validiraj s Edamam API-om
const edamamNutrition = await analyzeNutritionFromText(
  formatMealComponents(mealComponents),
  mealName
);

if (edamamNutrition) {
  // Koristi Edamam podatke ako su dostupni
  // Ili usporedi s izračunatim vrijednostima
}
```

### 2. **Obogaćivanje Jela** (Opcionalno)

Za detaljne mikronutrijente (vitamini, minerali):

```typescript
// Nakon generiranja plana
const enrichedMeal = await enrichMeal(meal);
```

### 3. **Fallback za Nedostajuće Podatke**

Ako USDA nema podatke za namirnicu:

```typescript
// U getRelevantFoods() funkciji
if (!food.calories_per_100g) {
  // Pokušaj dohvatiti s Edamam API-om
  const edamamData = await analyzeNutritionFromText(
    `100g ${food.name}`
  );
  
  if (edamamData) {
    food.calories_per_100g = edamamData.calories;
    food.protein_per_100g = edamamData.protein;
    // ...
  }
}
```

---

## Korak 4: Implementacija (Opcije)

### Opcija A: Validacija Prije Spremanja (Preporučeno)

Dodaj validaciju nakon generiranja plana:

```typescript
// U generateProDailyMealPlan()
async function validateMealWithEdamam(meal: ScoredMeal): Promise<ScoredMeal> {
  if (!process.env.EDAMAM_APP_ID) {
    return meal; // Ako nema credentials, vrati original
  }
  
  const components = meal.meta?.components || [];
  const ingredientText = components.map(c => 
    `${c.grams}g ${c.food}`
  ).join(", ");
  
  const edamamData = await analyzeNutritionFromText(
    ingredientText,
    meal.name
  );
  
  if (edamamData) {
    // Ažuriraj s Edamam podacima ako su različiti
    const deviation = Math.abs(meal.calories - edamamData.calories);
    if (deviation > 50) { // Ako je razlika > 50 kalorija
      console.warn(`⚠️ Razlika u kalorijama: ${deviation} kcal`);
      // Možeš ažurirati ili samo logirati
    }
  }
  
  return meal;
}
```

### Opcija B: Obogaćivanje Nakon Generiranja

Dodaj opciju za obogaćivanje cijelog plana:

```typescript
// U generateProDailyMealPlan()
if (options?.enrichWithEdamam) {
  // Obogati sva jela s Edamam podacima
  for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const meal = plan.meals[slot];
    if (meal) {
      const enriched = await enrichMeal(meal);
      plan.meals[slot] = enriched;
    }
  }
}
```

### Opcija C: Fallback za Nedostajuće Podatke

Koristi Edamam kada USDA nema podatke:

```typescript
// U getRelevantFoods()
async function getFoodMacrosWithEdamam(foodName: string): Promise<FoodMacros | null> {
  // Prvo pokušaj USDA
  const usdaData = await getFoodMacros(fdcId);
  if (usdaData) return usdaData;
  
  // Ako nema USDA, koristi Edamam
  if (process.env.EDAMAM_APP_ID) {
    const edamamData = await analyzeNutritionFromText(`100g ${foodName}`);
    if (edamamData) {
      return {
        calories: edamamData.calories,
        protein: edamamData.protein,
        carbs: edamamData.carbs,
        fats: edamamData.fat,
      };
    }
  }
  
  return null;
}
```

---

## Preporučena Strategija

### Faza 1: Validacija (Nisko trošenje API poziva)
- Validiraj samo **kritična jela** (glavni obroci)
- Koristi **cache** za već validirana jela
- Logiraj razlike za analizu

### Faza 2: Fallback (Srednje trošenje)
- Koristi Edamam samo kada **USDA nema podatke**
- Cache rezultate

### Faza 3: Obogaćivanje (Visoko trošenje)
- Obogati jela s **mikronutrijentima** (opcionalno)
- Koristi samo za **premium korisnike** ili na zahtjev

---

## Troškovi

### Validacija (Opcija A):
- **~1-4 poziva** po generiranom planu (po obroku)
- **~$0.01-0.20** po planu
- **Preporučeno** za početak

### Fallback (Opcija C):
- **Varijabilno** - samo kada USDA nema podatke
- **~$0.01-0.05** po nedostajućoj namirnici
- **Ekonomski** - koristi samo kada je potrebno

### Obogaćivanje (Opcija B):
- **~4-5 poziva** po planu (sva jela)
- **~$0.04-0.25** po planu
- **Skuplje**, ali detaljnije podatke

---

## Testiranje

### 1. Provjeri Credentials:
```bash
# U terminalu
echo $EDAMAM_APP_ID
echo $EDAMAM_APP_KEY
```

### 2. Test API:
```bash
curl http://localhost:3000/api/nutrition/test
```

### 3. Test u Generatoru:
Dodaj log u generator:
```typescript
console.log("Edamam credentials:", {
  hasAppId: !!process.env.EDAMAM_APP_ID,
  hasAppKey: !!process.env.EDAMAM_APP_KEY,
});
```

---

## Sljedeći Koraci

1. ✅ **Dodaj credentials u env.local** (već dodano)
2. ⏳ **Testiraj konekciju** (`/api/nutrition/test`)
3. ⏳ **Odaberi strategiju** (Validacija/Fallback/Obogaćivanje)
4. ⏳ **Implementiraj u generator**
5. ⏳ **Testiraj s realnim podacima**
6. ⏳ **Monitoriraj troškove**

---

## Napomene

- **Rate Limiting**: Edamam ima rate limiting - dodaj pauze između poziva
- **Cache**: Cache rezultate da ne trošiš API pozive
- **Error Handling**: Ako Edamam ne radi, koristi USDA fallback
- **Monitoring**: Prati troškove i usage u Edamam dashboardu

---

## Pitanja za Odluku

1. **Želiš li validaciju?** (provjera točnosti podataka)
2. **Želiš li fallback?** (kada USDA nema podatke)
3. **Želiš li obogaćivanje?** (mikronutrijenti)
4. **Koliko si spreman platiti?** (po generiranom planu)

