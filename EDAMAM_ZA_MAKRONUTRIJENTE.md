# 🥗 Edamam API za Makronutrijente - Opcije

## ✅ DA, Edamam API Vraća Makronutrijente!

Edamam Nutrition Analysis API vraća **sve makronutrijente** koje trebaš:

### Što Edamam Vraća:

```typescript
{
  calories: number,      // ENERC_KCAL
  protein: number,       // PROCNT (g)
  carbs: number,         // CHOCDF (g)
  fat: number,           // FAT (g)
  fiber: number,         // FIBTG (g)
  sugar: number,         // SUGAR (g)
  sodium: number,        // NA (mg)
  saturatedFat: number,  // FASAT (g)
  // + mikronutrijenti (vitamini, minerali)
}
```

---

## Kako Se Može Koristiti u Generatoru

### Opcija 1: Fallback za Nedostajuće Podatke (Preporučeno)

Koristi Edamam **samo kada USDA nema podatke**:

```typescript
// U getRelevantFoods() ili getFoodMacros()
async function getFoodMacrosWithEdamamFallback(
  foodName: string,
  fdcId?: number
): Promise<{ calories: number; protein: number; carbs: number; fats: number } | null> {
  
  // 1. Prvo pokušaj USDA
  if (fdcId) {
    const usdaData = await getFoodMacros(fdcId);
    if (usdaData) {
      return usdaData; // ✅ USDA ima podatke
    }
  }
  
  // 2. Ako USDA nema, koristi Edamam
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

**Prednosti:**
- ✅ Koristi besplatne USDA podatke prvo
- ✅ Edamam samo kada je potrebno
- ✅ Nisko trošenje API poziva

---

### Opcija 2: Validacija Podataka

Koristi Edamam za **provjeru točnosti** USDA podataka:

```typescript
// U buildCompositeMealForSlot() nakon generiranja jela
async function validateMealMacrosWithEdamam(
  meal: ScoredMeal
): Promise<ScoredMeal> {
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
    // Usporedi s izračunatim vrijednostima
    const deviation = {
      calories: Math.abs(meal.calories - edamamData.calories),
      protein: Math.abs(meal.protein - edamamData.protein),
      carbs: Math.abs(meal.carbs - edamamData.carbs),
      fat: Math.abs(meal.fat - edamamData.fat),
    };
    
    // Ako je razlika > 10%, logiraj upozorenje
    if (deviation.calories > meal.calories * 0.1) {
      console.warn(`⚠️ Razlika u kalorijama: ${deviation.calories} kcal`);
    }
    
    // Opcionalno: Ažuriraj s Edamam podacima ako su različiti
    // meal.calories = edamamData.calories;
  }
  
  return meal;
}
```

**Prednosti:**
- ✅ Provjerava točnost podataka
- ✅ Detektira greške u izračunima
- ✅ Može koristiti Edamam podatke ako su točniji

---

### Opcija 3: Obogaćivanje s Mikronutrijentima

Koristi Edamam za **detaljne mikronutrijente**:

```typescript
// U generateProDailyMealPlan() nakon generiranja plana
async function enrichPlanWithMicronutrients(
  plan: ProDailyMealPlan
): Promise<ProDailyMealPlan> {
  if (!process.env.EDAMAM_APP_ID) {
    return plan;
  }
  
  // Obogati svako jelo s mikronutrijentima
  for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const meal = plan.meals[slot];
    if (meal) {
      const components = meal.meta?.components || [];
      const ingredientText = components.map(c => 
        `${c.grams}g ${c.food}`
      ).join(", ");
      
      const edamamData = await analyzeNutritionFromText(
        ingredientText,
        meal.name
      );
      
      if (edamamData) {
        // Dodaj mikronutrijente
        meal.micronutrients = {
          fiber: edamamData.fiber,
          sugar: edamamData.sugar,
          sodium: edamamData.sodium,
          vitaminA: edamamData.vitaminA,
          vitaminC: edamamData.vitaminC,
          vitaminD: edamamData.vitaminD,
          calcium: edamamData.calcium,
          iron: edamamData.iron,
          potassium: edamamData.potassium,
          magnesium: edamamData.magnesium,
        };
      }
    }
  }
  
  return plan;
}
```

**Prednosti:**
- ✅ Detaljni mikronutrijenti
- ✅ Bolji user experience
- ✅ Kompletniji podaci

---

## Implementacija u Generatoru

### Gdje Dodati:

**1. U `getRelevantFoods()` funkciji** (fallback):

```typescript
// lib/services/proMealPlanGenerator.ts
async function getRelevantFoods(...) {
  // ... postojeći kod ...
  
  // Ako namirnica nema podatke, pokušaj Edamam
  for (const food of foods) {
    if (!food.calories_per_100g || food.calories_per_100g <= 0) {
      if (process.env.EDAMAM_APP_ID) {
        const edamamData = await analyzeNutritionFromText(`100g ${food.name}`);
        if (edamamData) {
          food.calories_per_100g = edamamData.calories;
          food.protein_per_100g = edamamData.protein;
          food.carbs_per_100g = edamamData.carbs;
          food.fat_per_100g = edamamData.fat;
        }
      }
    }
  }
  
  return foods;
}
```

**2. U `buildCompositeMealForSlot()` funkciji** (validacija):

```typescript
// Nakon generiranja composite jela
const composite = buildCompositeMealForSlot(...);

if (composite && process.env.EDAMAM_APP_ID) {
  // Validiraj s Edamam
  const validated = await validateMealMacrosWithEdamam(composite);
  return validated;
}

return composite;
```

---

## Troškovi

### Fallback (Opcija 1):
- **Varijabilno** - samo kada USDA nema podatke
- **~$0.01-0.05** po nedostajućoj namirnici
- **Očekivano**: 5-20 poziva/mjesec (za 30 korisnika)
- **Trošak**: $0.05-1.00/mjesec ✅

### Validacija (Opcija 2):
- **~1-4 poziva** po generiranom planu
- **~$0.01-0.20** po planu
- **510 planova/mjesec** = $5-102/mjesec
- **S rate limiterom**: $5-20/mjesec ✅

### Obogaćivanje (Opcija 3):
- **~4-5 poziva** po planu (sva jela)
- **~$0.04-0.25** po planu
- **510 planova/mjesec** = $20-128/mjesec
- **S cache-om**: $5-15/mjesec ✅

---

## Preporučena Strategija

### Kombinacija Opcija 1 + 2:

1. **Fallback** (Opcija 1) - kada USDA nema podatke
2. **Validacija** (Opcija 2) - samo za glavne obroke (breakfast, lunch, dinner)
3. **Cache rezultate** - ne validiraj ista jela ponovno

**Očekivani trošak: $5-25/mjesec** (s rate limiterom i cache-om)

---

## Implementacija

### Korak 1: Dodaj Fallback Funkciju

```typescript
// lib/services/proMealPlanGenerator.ts
import { analyzeNutritionFromText } from "@/lib/services/edamamService";

async function getFoodMacrosWithEdamamFallback(
  foodName: string,
  fdcId?: number
): Promise<{ calories: number; protein: number; carbs: number; fats: number } | null> {
  // 1. Prvo USDA
  if (fdcId) {
    const usdaData = await getFoodMacros(fdcId);
    if (usdaData) return usdaData;
  }
  
  // 2. Fallback na Edamam
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

### Korak 2: Koristi u Generatoru

```typescript
// U getRelevantFoods() ili createMealCandidateFromFood()
if (!food.calories_per_100g) {
  const edamamMacros = await getFoodMacrosWithEdamamFallback(
    food.name,
    food.usda_fdc_id
  );
  
  if (edamamMacros) {
    food.calories_per_100g = edamamMacros.calories;
    food.protein_per_100g = edamamMacros.protein;
    food.carbs_per_100g = edamamMacros.carbs;
    food.fat_per_100g = edamamMacros.fats;
  }
}
```

---

## Sažetak

### ✅ Edamam API Vraća:
- **Kalorije** (ENERC_KCAL)
- **Proteini** (PROCNT)
- **Ugljikohidrati** (CHOCDF)
- **Masti** (FAT)
- **Vlakna** (FIBTG)
- **Šećeri** (SUGAR)
- **+ Mikronutrijenti**

### ✅ Može Se Koristiti Za:
1. **Fallback** - kada USDA nema podatke
2. **Validacija** - provjera točnosti
3. **Obogaćivanje** - detaljni mikronutrijenti

### ✅ Preporuka:
**Kombinacija Fallback + Validacija** = $5-25/mjesec (s rate limiterom)

---

## Pitanja

1. **Želiš li fallback?** (kada USDA nema podatke)
2. **Želiš li validaciju?** (provjera točnosti)
3. **Želiš li obogaćivanje?** (mikronutrijenti)

**Mogu implementirati bilo koju opciju!** 🚀

