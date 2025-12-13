# 🎯 Savršen Generator - Optimalna Strategija

## Trenutno Stanje

### ✅ Što Radi Dobro:
- Koristi **USDA CSV podatke** (besplatno, brzo)
- Koristi **cache podatke** (`meal_nutrition_cache.json`)
- **Scoring sistem** - odabire najbolja jela
- **Personalizacija** - prilagođava se ciljevima korisnika

### ⚠️ Što Može Biti Bolje:
- **Točnost podataka** - USDA može biti manje točan za složena jela
- **Nedostajući podaci** - neke namirnice možda nemaju podatke
- **Mikronutrijenti** - nisu uključeni (samo makronutrijenti)

---

## 🎯 Savršen Generator - Optimalna Strategija

### Kombinacija: USDA + Edamam (Hybrid Approach)

**Filosofija**: Koristi najbolje od oba svijeta!

---

## Strategija: 3-Tier Sistem

### Tier 1: USDA CSV (Primarni) - 90% slučajeva
- ✅ **Brzo** - lokalni podaci
- ✅ **Besplatno** - ne troši API pozive
- ✅ **Dovoljno točno** - za većinu namirnica

**Kada se koristi:**
- Sve standardne namirnice (jaja, piletina, riža, itd.)
- Jela koja već imaju cache podatke

---

### Tier 2: Edamam Fallback - 5-10% slučajeva
- ✅ **Točniji** - za složena jela
- ✅ **Dopunski podaci** - kada USDA nema
- ✅ **Nisko trošenje** - samo kada je potrebno

**Kada se koristi:**
- Namirnice koje nemaju USDA podatke
- Složena jela s više sastojaka
- Custom namirnice koje korisnik dodaje

---

### Tier 3: Edamam Validacija - 1-2% slučajeva
- ✅ **Provjera točnosti** - za kritična jela
- ✅ **Detekcija grešaka** - logiraj razlike
- ✅ **Minimalno trošenje** - samo za glavne obroke

**Kada se koristi:**
- Validacija nakon generiranja glavnih obroka
- Samo ako je razlika > 10% (logiraj, ne blokiraj)

---

## Implementacija: Hybrid Generator

### 1. **Poboljšana Funkcija za Makronutrijente**

```typescript
// lib/services/proMealPlanGenerator.ts

/**
 * Dohvati makronutrijente za namirnicu (USDA + Edamam fallback)
 */
async function getFoodMacrosHybrid(
  food: Food
): Promise<{ calories: number; protein: number; carbs: number; fats: number }> {
  
  // TIER 1: Prvo pokušaj USDA
  if (food.usda_fdc_id) {
    const usdaData = await getFoodMacros(food.usda_fdc_id);
    if (usdaData && usdaData.calories > 0) {
      return usdaData; // ✅ USDA ima podatke
    }
  }
  
  // TIER 2: Ako USDA nema, provjeri Supabase
  if (food.calories_per_100g && food.calories_per_100g > 0) {
    return {
      calories: food.calories_per_100g,
      protein: food.protein_per_100g || 0,
      carbs: food.carbs_per_100g || 0,
      fats: food.fat_per_100g || 0,
    };
  }
  
  // TIER 3: Fallback na Edamam (samo ako je potrebno)
  if (process.env.EDAMAM_APP_ID) {
    console.log(`🔍 USDA nema podatke za ${food.name}, koristim Edamam...`);
    const edamamData = await analyzeNutritionFromText(`100g ${food.name}`);
    if (edamamData) {
      // Spremi u Supabase za buduće (cache)
      await saveFoodMacrosToSupabase(food.id, {
        calories: edamamData.calories,
        protein: edamamData.protein,
        carbs: edamamData.carbs,
        fats: edamamData.fat,
      });
      
      return {
        calories: edamamData.calories,
        protein: edamamData.protein,
        carbs: edamamData.carbs,
        fats: edamamData.fat,
      };
    }
  }
  
  // Fallback na default vrijednosti
  console.warn(`⚠️ Nema podataka za ${food.name}, koristim default vrijednosti`);
  return { calories: 0, protein: 0, carbs: 0, fats: 0 };
}
```

---

### 2. **Validacija Glavnih Obroka**

```typescript
// Nakon generiranja glavnih obroka (breakfast, lunch, dinner)
async function validateMainMealsWithEdamam(
  plan: ProDailyMealPlan
): Promise<ProDailyMealPlan> {
  if (!process.env.EDAMAM_APP_ID) {
    return plan; // Ako nema credentials, preskoči
  }
  
  // Validiraj samo glavne obroke (ne snack)
  const mainMeals = ['breakfast', 'lunch', 'dinner'] as const;
  
  for (const slot of mainMeals) {
    const meal = plan.meals[slot];
    if (!meal) continue;
    
    // Formiraj tekst sastojaka
    const components = meal.meta?.components || [];
    const ingredientText = components.map(c => 
      `${c.grams}g ${c.food}`
    ).join(", ");
    
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
      
      // Ako je razlika > 10%, logiraj (ali ne blokiraj)
      const calorieDeviationPercent = (deviation.calories / meal.calories) * 100;
      if (calorieDeviationPercent > 10) {
        console.warn(`⚠️ Razlika u kalorijama za ${meal.name}: ${deviation.calories} kcal (${calorieDeviationPercent.toFixed(1)}%)`);
        console.warn(`   USDA: ${meal.calories} kcal | Edamam: ${edamamData.calories} kcal`);
        
        // Opcionalno: Ako je razlika > 20%, koristi Edamam podatke
        if (calorieDeviationPercent > 20) {
          console.log(`   🔄 Koristim Edamam podatke (točniji)`);
          meal.calories = edamamData.calories;
          meal.protein = edamamData.protein;
          meal.carbs = edamamData.carbs;
          meal.fat = edamamData.fat;
        }
      }
      
      // Dodaj mikronutrijente (bonus)
      meal.micronutrients = {
        fiber: edamamData.fiber,
        sugar: edamamData.sugar,
        sodium: edamamData.sodium,
        vitaminC: edamamData.vitaminC,
        calcium: edamamData.calcium,
        iron: edamamData.iron,
      };
    }
  }
  
  return plan;
}
```

---

### 3. **Cache Edamam Rezultata**

```typescript
// Spremi Edamam rezultate u Supabase za buduće
async function saveFoodMacrosToSupabase(
  foodId: string,
  macros: { calories: number; protein: number; carbs: number; fats: number }
): Promise<void> {
  try {
    await supabase
      .from("foods")
      .update({
        calories_per_100g: macros.calories,
        protein_per_100g: macros.protein,
        carbs_per_100g: macros.carbs,
        fat_per_100g: macros.fats,
        edamam_enriched: true, // Flag da je obogaćeno s Edamam
        edamam_enriched_at: new Date().toISOString(),
      })
      .eq("id", foodId);
  } catch (error) {
    console.error("Error saving Edamam data to Supabase:", error);
  }
}
```

---

## Optimalna Strategija za Savršen Generator

### 🎯 Preporučena Kombinacija:

1. **USDA CSV** (90% slučajeva)
   - Brzo, besplatno, dovoljno točno
   - Koristi za sve standardne namirnice

2. **Edamam Fallback** (5-10% slučajeva)
   - Kada USDA nema podatke
   - Cache rezultate u Supabase
   - Trošak: ~$0.05-1.00/mjesec

3. **Edamam Validacija** (1-2% slučajeva)
   - Samo glavni obroci (breakfast, lunch, dinner)
   - Samo ako je razlika > 20% (koristi Edamam podatke)
   - Trošak: ~$1-5/mjesec

4. **Cache Podaci** (Prioritet)
   - Koristi `meal_nutrition_cache.json` za jela
   - Spremi Edamam rezultate u Supabase
   - Ne troši API pozive ponovno

---

## Prednosti Ove Strategije

### ✅ Točnost:
- **USDA** za standardne namirnice (dovoljno točno)
- **Edamam** za složena jela (točniji)
- **Validacija** detektira greške

### ✅ Brzina:
- **USDA CSV** - lokalni podaci (brzo)
- **Cache** - ne čeka API pozive
- **Edamam** - samo kada je potrebno

### ✅ Troškovi:
- **$1-6/mjesec** (s rate limiterom)
- **Minimalno trošenje** - samo kada je potrebno
- **Cache** - smanjuje buduće troškove

### ✅ Pouzdanost:
- **Fallback** - ako USDA nema, koristi Edamam
- **Validacija** - provjerava točnost
- **Cache** - offline mode ako API ne radi

---

## Implementacija

### Korak 1: Dodaj Hybrid Funkciju
```typescript
// lib/services/proMealPlanGenerator.ts
async function getFoodMacrosHybrid(food: Food) { ... }
```

### Korak 2: Koristi u Generatoru
```typescript
// U createMealCandidateFromFood()
const macros = await getFoodMacrosHybrid(food);
```

### Korak 3: Validacija Nakon Generiranja
```typescript
// U generateProDailyMealPlan()
const validatedPlan = await validateMainMealsWithEdamam(plan);
```

---

## Rezultat: Savršen Generator

### Što Dobivaš:

1. **✅ Točni podaci**
   - USDA za standardne namirnice
   - Edamam za složena jela
   - Validacija provjerava točnost

2. **✅ Brz generiranje**
   - USDA CSV - lokalni podaci
   - Cache - ne čeka API
   - Edamam - samo kada je potrebno

3. **✅ Niski troškovi**
   - $1-6/mjesec (s rate limiterom)
   - Cache smanjuje buduće troškove

4. **✅ Detaljni podaci**
   - Makronutrijenti (kalorije, proteini, carbs, masti)
   - Mikronutrijenti (vitamini, minerali)
   - Vlakna, šećeri, natrij

5. **✅ Pouzdanost**
   - Fallback ako USDA nema podatke
   - Validacija detektira greške
   - Cache za offline mode

---

## Sažetak

### 🎯 Savršen Generator = Hybrid Approach

**90% USDA** (brzo, besplatno) + **10% Edamam** (točniji, kada je potrebno)

**Trošak**: $1-6/mjesec ✅
**Točnost**: Najbolja moguća ✅
**Brzina**: Brzo (USDA + cache) ✅
**Pouzdanost**: Visoka (fallback + validacija) ✅

---

## Sljedeći Koraci

1. ✅ **Implementiraj hybrid funkciju** - USDA + Edamam fallback
2. ✅ **Dodaj validaciju** - provjeri glavne obroke
3. ✅ **Cache rezultate** - spremi u Supabase
4. ✅ **Testiraj** - provjeri točnost i troškove

**Želiš li da implementiram ovu strategiju?** 🚀

