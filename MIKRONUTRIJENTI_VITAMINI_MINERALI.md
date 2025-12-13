# 🥗 Mikronutrijenti (Vitamini i Minerali) - Status

## ❌ Trenutno: NE Prikazuje Se

### Što Generator Trenutno Vraća:
- ✅ **Kalorije** (kcal)
- ✅ **Proteini** (g)
- ✅ **Ugljikohidrati** (g)
- ✅ **Masti** (g)
- ❌ **Vitamini** - NE prikazuje se
- ❌ **Minerali** - NE prikazuje se
- ❌ **Vlakna** - NE prikazuje se
- ❌ **Natrij** - NE prikazuje se

### Što Frontend Prikazuje:
- ✅ **Kalorije** (kcal)
- ✅ **Proteini** (P: Xg)
- ✅ **Ugljikohidrati** (U: Xg)
- ✅ **Masti** (M: Xg)
- ❌ **Vitamini** - NE prikazuje se
- ❌ **Minerali** - NE prikazuje se

---

## ✅ Edamam API Vraća Mikronutrijente

### Što Edamam Vraća:
```typescript
{
  // Makronutrijenti
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  
  // Mikronutrijenti (Edamam vraća, ali ne koristimo)
  fiber: number,        // Vlakna
  sugar: number,       // Šećeri
  sodium: number,      // Natrij
  saturatedFat: number, // Zasićene masti
  
  // Vitamini
  vitaminA: number,    // Vitamin A
  vitaminC: number,    // Vitamin C
  vitaminD: number,    // Vitamin D
  vitaminB12: number,  // Vitamin B12
  
  // Minerali
  calcium: number,      // Kalcij
  iron: number,        // Željezo
  potassium: number,    // Kalij
  magnesium: number,    // Magnezij
}
```

---

## Zašto Se Ne Prikazuje?

### Trenutna Implementacija:
1. **Generator vraća samo makronutrijente** - `MealCandidate` ima samo `calories, protein, carbs, fat`
2. **Frontend prikazuje samo makronutrijente** - nema UI za mikronutrijente
3. **Edamam fallback** - koristi se samo za makronutrijente (fallback)

---

## Kako Dodati Mikronutrijente?

### Opcija 1: Dodati u Generator (Preporučeno)

**1. Proširiti `MealCandidate` interface:**
```typescript
export interface MealCandidate {
  // ... postojeći makronutrijenti
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  
  // Dodati mikronutrijente (opcionalno)
  micronutrients?: {
    fiber: number;
    sugar: number;
    sodium: number;
    vitaminA: number;
    vitaminC: number;
    vitaminD: number;
    vitaminB12: number;
    calcium: number;
    iron: number;
    potassium: number;
    magnesium: number;
  };
}
```

**2. Dodati u `createMealCandidateFromFood()`:**
```typescript
// Nakon Edamam fallback-a
if (edamamMacros && edamamData) {
  // Dodaj mikronutrijente
  mealCandidate.micronutrients = {
    fiber: edamamData.fiber,
    sugar: edamamData.sugar,
    sodium: edamamData.sodium,
    vitaminA: edamamData.vitaminA,
    vitaminC: edamamData.vitaminC,
    vitaminD: edamamData.vitaminD,
    vitaminB12: edamamData.vitaminB12,
    calcium: edamamData.calcium,
    iron: edamamData.iron,
    potassium: edamamData.potassium,
    magnesium: edamamData.magnesium,
  };
}
```

**3. Dodati u Frontend:**
```tsx
{meal.micronutrients && (
  <div className="text-xs text-gray-500">
    <div>Vlakna: {meal.micronutrients.fiber}g</div>
    <div>Vitamin C: {meal.micronutrients.vitaminC}mg</div>
    <div>Kalcij: {meal.micronutrients.calcium}mg</div>
    {/* ... */}
  </div>
)}
```

---

### Opcija 2: Dodati Validaciju s Mikronutrijentima

**Koristi Edamam za validaciju glavnih obroka i dodaj mikronutrijente:**

```typescript
// Nakon generiranja plana
async function enrichPlanWithMicronutrients(
  plan: ProDailyMealPlan
): Promise<ProDailyMealPlan> {
  // Validiraj glavne obroke i dodaj mikronutrijente
  for (const slot of ['breakfast', 'lunch', 'dinner']) {
    const meal = plan.meals[slot];
    if (meal && meal.meta?.components) {
      const ingredientText = meal.meta.components.map(c => 
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
          vitaminB12: edamamData.vitaminB12,
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

---

## Troškovi

### Opcija 1 (Fallback s Mikronutrijentima):
- **Trošak**: $0.05-1.00/mjesec (samo kada nema podataka)
- **Kada se koristi**: Samo za namirnice bez podataka

### Opcija 2 (Validacija s Mikronutrijentima):
- **Trošak**: $1-5/mjesec (samo glavni obroci)
- **Kada se koristi**: Nakon generiranja plana (validacija)

---

## Preporuka

### Kombinacija:
1. **Fallback s Mikronutrijentima** - kada nema podataka, dodaj mikronutrijente
2. **Validacija s Mikronutrijentima** - za glavne obroke, dodaj mikronutrijente
3. **Frontend UI** - prikaži mikronutrijente u expandable sekciji

**Trošak**: $1-6/mjesec (s rate limiterom)

---

## Sažetak

### ❌ Trenutno:
- **NE prikazuje se** - samo makronutrijenti
- **Edamam vraća** - ali ne koristimo mikronutrijente

### ✅ Može Se Dodati:
- **Mikronutrijenti u generatoru** - proširiti `MealCandidate`
- **Mikronutrijenti u frontendu** - dodati UI za prikaz
- **Validacija s mikronutrijentima** - za glavne obroke

### 💰 Trošak:
- **$1-6/mjesec** (s rate limiterom)

---

## Pitanje

**Želiš li da dodam mikronutrijente?**

1. ✅ **Da** - dodaj u generator i frontend
2. ❌ **Ne** - ostavi samo makronutrijente

**Mogu implementirati bilo koju opciju!** 🚀

