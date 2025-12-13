# 🔍 Gdje Se Koristi Edamam API u Aplikaciji

## ⚠️ VAŽNO: Edamam se NE koristi u glavnom generatoru!

### Glavni Generator (`proMealPlanGenerator.ts`):
- ❌ **NE koristi Edamam API**
- ✅ Koristi **USDA CSV podatke** (besplatno)
- ✅ Koristi **Supabase foods** tablicu
- ✅ Koristi **meal_components.json** s cache podacima

---

## Gdje Se Edamam API Koristi

### 1. **Obogaćivanje Jela** (`/api/nutrition/enrich`)
**Lokacija**: `app/api/nutrition/enrich/route.ts`

**Što radi:**
- Obogaćuje jela iz `meal_components.json` s Edamam nutritivnim podacima
- Koristi se **ručno** ili **batch-om** (ne automatski u generatoru)
- Sprema rezultate u cache (`meal_nutrition_cache.json`)

**Kada se koristi:**
- ✅ Kada želiš **obogatiti nova jela** s detaljnim mikronutrijentima
- ✅ **Ručno** - pozovi endpoint `/api/nutrition/enrich`
- ✅ **Batch** - jednom dnevno/tjedno za sva jela

**Kod:**
```typescript
// app/api/nutrition/enrich/route.ts
const enriched = await enrichMeal(meal); // Koristi Edamam
```

---

### 2. **Pretraživanje Recepata** (`/api/meal-plan/recipes`)
**Lokacija**: `app/api/meal-plan/recipes/route.ts`

**Što radi:**
- Pretražuje **2.3M+ recepata** s fotografijama
- Koristi **Edamam Recipe Search API**
- Generira plan prehrane s receptima

**Kada se koristi:**
- ✅ Kada korisnik želi plan s **receptima s fotografijama**
- ✅ **Opcionalno** - nije glavni generator
- ✅ Koristi se u `recipeMealPlanGenerator.ts`

**Kod:**
```typescript
// lib/services/recipeMealPlanGenerator.ts
const recipes = await searchRecipes({...}); // Koristi Edamam
```

---

### 3. **Test Endpointi**
**Lokacije**: 
- `/api/nutrition/test` - testira Nutrition API
- `/api/recipes/test` - testira Recipe Search API

**Što radi:**
- Testira konekciju s Edamam API-om
- Provjerava credentials

---

## Što Se Koristi u Glavnom Generatoru

### `proMealPlanGenerator.ts` koristi:

1. **USDA CSV podatke** (`lib/data/csvLoader.ts`)
   ```typescript
   foodsWithMacros = await getAllFoodsWithMacros(1000);
   ```

2. **Supabase foods** tablicu
   ```typescript
   const { data } = await supabase.from("foods").select("*");
   ```

3. **meal_components.json** s cache podacima
   ```typescript
   const definitions = MEAL_COMPONENTS[slotKey];
   ```

4. **nutritionLookup.ts** (cache podaci)
   ```typescript
   const nutrition = getNutritionById(mealId); // Iz cache-a
   ```

**❌ NE koristi Edamam API direktno!**

---

## Zašto Se Edamam NE Koristi u Generatoru?

### Razlozi:

1. **Brže** - USDA CSV podaci su lokalni (brže učitavanje)
2. **Besplatno** - Ne troši API pozive
3. **Cache podaci** - Već obogaćeni jela su u cache-u
4. **Pouzdanije** - Ne ovisi o vanjskom API-ju

---

## Kada Bi Se Edamam Koristio u Generatoru?

### Opcije (ako želiš):

1. **Validacija** - Provjeri točnost podataka nakon generiranja
2. **Fallback** - Koristi Edamam ako USDA nema podatke
3. **Obogaćivanje** - Dodaj mikronutrijente u real-time

**Ali trenutno se NE koristi!**

---

## Gdje Se Edamam Koristi (Sažetak)

| Lokacija | Funkcija | Kada Se Koristi |
|----------|----------|-----------------|
| `/api/nutrition/enrich` | Obogaćivanje jela | Ručno/batch |
| `/api/meal-plan/recipes` | Pretraživanje recepata | Opcionalno |
| `mealEnricher.ts` | Obogaćivanje jela | Kada se pozove enrich endpoint |
| `edamamRecipeService.ts` | Recipe Search | Kada se koristi recipe generator |
| `proMealPlanGenerator.ts` | ❌ **NE koristi** | - |

---

## Problem s Rate Limitom

### Uzrok:
- **225 poziva/min** - previše!
- **Vjerojatno se poziva** u `/api/nutrition/enrich` endpointu
- **Batch obogaćivanje** - obogaćuješ više jela odjednom

### Rješenje:
- ✅ **Rate limiter** implementiran
- ✅ **Maksimalno 45 poziva/min**
- ✅ **Queue sistem** - čeka ako je limit dosegnut

---

## Preporuka

### Za Generator:
- ✅ **Koristi cache podatke** (`meal_nutrition_cache.json`)
- ✅ **Koristi USDA CSV** podatke
- ❌ **NE koristi Edamam** u real-time generiranju

### Za Obogaćivanje:
- ✅ **Batch obogaćivanje** - jednom dnevno/tjedno
- ✅ **Koristi rate limiter** - spriječi prekoračenje
- ✅ **Cache rezultate** - ne obogaćuj ista jela ponovno

---

## Sažetak

### ❌ Edamam se NE koristi u glavnom generatoru:
- `proMealPlanGenerator.ts` koristi USDA CSV i cache podatke
- Ne poziva Edamam API direktno

### ✅ Edamam se koristi za:
1. **Obogaćivanje jela** (`/api/nutrition/enrich`) - ručno/batch
2. **Pretraživanje recepata** (`/api/meal-plan/recipes`) - opcionalno

### ⚠️ Problem:
- Rate limit prekoračen (225/min) - vjerojatno iz batch obogaćivanja
- Rješenje: Rate limiter (sada implementiran)

---

## Pitanja

1. **Koristiš li `/api/nutrition/enrich` endpoint?** (batch obogaćivanje)
2. **Koristiš li `/api/meal-plan/recipes`?** (recipe generator)
3. **Želiš li da Edamam koristi u generatoru?** (validacija/fallback)

