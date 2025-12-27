# Edamam-Only Service - Single Source of Truth za Makronutrijente

## Pregled

Ovaj servis (`lib/services/edamamOnlyService.ts`) osigurava da se **svi makronutrijenti računaju isključivo preko Edamam API-ja**, bez fallback-a na lokalnu bazu.

## Zahtjevi Implementacije

### 1. Single Source of Truth
- ✅ Svaki Recipe i svaki Ingredient koristi Edamam API
- ✅ Rezultat iz Edamam-a je jedina istina za kcal/P/C/F
- ✅ UI prikaz makroa dolazi iz Edamam izračuna

### 2. Normalizacija i Mapiranje Sastojaka
- ✅ Svaki ingredient ima: `name`, `quantity`, `unit`
- ✅ Konverzija pcs/serving u grame preko `servingSizeGrams` ili Edamam "measure" mehanizma
- ✅ Ako konverzija nije moguća → `NEEDS_USER_MAPPING` flag

### 3. Branded vs Generic
- ✅ Branded proizvodi (npr. "Natur bio rižini krekeri") koriste branded unos u Edamam
- ✅ Brand mapping u `BRAND_MAPPING` objektu
- ✅ Generic fallback ako branded nije dostupan

### 4. Izračun Jela
- ✅ `computeRecipeMacrosFromEdamam(recipe)` → vraća `{kcal, p, c, f}`
- ✅ Makroi jela = suma nutritivnih vrijednosti koje vrati Edamam za sve sastojke

### 5. Validacija Konzistentnosti
- ✅ `kcal_from_macros = p*4 + c*4 + f*9`
- ✅ Ako razlika > 7% → flag `DATA_INCONSISTENT`

### 6. Cache Mehanizam
- ✅ Cache za performanse
- ✅ Cache key uključuje: `ingredient name + quantity + unit + brand/upc + locale`
- ✅ Invalidacija cache-a kad se promijeni bilo koji parametar

### 7. Audit Trail
- ✅ Za svaki recept se sprema:
  - `raw Edamam response id`
  - `parsed totals`
  - `vrijeme izračuna`
  - `listu ingredient->edamam match`

### 8. Debug Panel
- ✅ `getDebugInfoForRecipe(recipe)` vraća:
  - Koje query-je si poslao
  - Koje match-eve dobio
  - Consistency check rezultate

## Korištenje

### Osnovni Primjer

```typescript
import {
  computeRecipeMacrosFromEdamam,
  convertMealDefinitionToEdamamRecipe,
  getDebugInfoForRecipe,
} from "@/lib/services/edamamOnlyService";

// Konvertiraj meal definition u Edamam format
const mealDef = {
  id: "breakfast_lose_1",
  name: "Jaja + bjelanjci + pileći dimcek",
  components: [
    { food: "Egg", grams: 100 },
    { food: "Egg white", grams: 90 },
    { food: "Smoked chicken breast", grams: 60 },
  ],
};

const edamamRecipe = convertMealDefinitionToEdamamRecipe(mealDef);

// Izračunaj makroe
const result = await computeRecipeMacrosFromEdamam(edamamRecipe);

console.log("Makroi:", result.macros);
console.log("Potrebna provjera:", result.needsReview);
console.log("Audit trail:", result.auditTrail);

// Debug informacije
const debugInfo = await getDebugInfoForRecipe(edamamRecipe);
console.log("Edamam queries:", debugInfo.edamamQueries);
```

### Integracija u Meal Plan Generator

```typescript
// U proMealPlanGenerator.ts, zamijeni:
const macros = calculateMacrosForGrams(namirnica, grams);

// S:
import { computeIngredientMacrosFromEdamam } from "@/lib/services/edamamOnlyService";

const ingredient = convertMealComponentToEdamamIngredient({
  food: "Rice crackers",
  grams: 30,
  displayName: "Rižini krekeri (Natur bio)",
});

const result = await computeIngredientMacrosFromEdamam(ingredient);
const macros = result.macros;
```

## Brand Mapping

Dodaj nove branded proizvode u `BRAND_MAPPING` objekt:

```typescript
const BRAND_MAPPING: Record<string, { edamamName: string; brand?: string }> = {
  "Rice crackers": { 
    edamamName: "rice cakes plain", 
    brand: "Natur bio" 
  },
  // Dodaj nove...
};
```

## Cache Invalidacija

Ako trebaš invalidirati cache za ingredient:

```typescript
import { invalidateIngredientCache } from "@/lib/services/edamamOnlyService";

invalidateIngredientCache({
  ingredientName: "rice cakes plain",
  quantity: 30,
  unit: "g",
  brand: "Natur bio",
});
```

## Testiranje

### Mock Edamam API

Za testiranje bez stvarnih API poziva, kreiraj mock:

```typescript
jest.mock("@/lib/services/edamamService", () => ({
  analyzeNutritionFromText: jest.fn().mockResolvedValue({
    calories: 100,
    protein: 10,
    carbs: 5,
    fat: 3,
  }),
}));
```

### Test Primjer

```typescript
import { computeRecipeMacrosFromEdamam } from "@/lib/services/edamamOnlyService";

test("tuna + rice crackers daje realne makroe", async () => {
  const recipe = {
    id: "test_1",
    name: "Tuna s rižinim krekerima",
    ingredients: [
      { name: "tuna canned in water", quantity: 100, unit: "g", brand: "Eva Podravka" },
      { name: "rice cakes plain", quantity: 30, unit: "g", brand: "Natur bio" },
    ],
  };

  const result = await computeRecipeMacrosFromEdamam(recipe);
  
  expect(result.macros.calories).toBeGreaterThan(100);
  expect(result.macros.protein).toBeGreaterThan(15);
  expect(result.auditTrail.consistencyCheck.isConsistent).toBe(true);
});
```

## Rješavanje Problema

### "tuna + rice crackers" ima krive makroe

1. Provjeri audit trail: `getDebugInfoForRecipe(recipe)`
2. Provjeri da li su branded proizvodi pravilno mapirani
3. Provjeri Edamam query-je - možda koristi krivi naziv
4. Ako je `needsUserMapping = true`, trebaš dodati `servingSizeGrams` ili poboljšati mapiranje

### Cache ne invalidira se

Cache key mora biti identičan. Provjeri:
- `ingredientName` (lowercase, trimmed)
- `quantity` (točan broj)
- `unit` (lowercase)
- `brand` (ako postoji)
- `locale` (default "en")

### DATA_INCONSISTENT flag

Ako dobiješ `DATA_INCONSISTENT`:
- To znači da `kcal_from_macros` odstupaju > 7% od `calories`
- **NE mijenjaj vrijednosti ručno** - samo logiraj i označi
- Mogući uzroci: Edamam parsiranje, netočne vrijednosti u bazi Edamam-a

## Integracija u Postojeći Kod

Za potpunu integraciju, trebaš:

1. ✅ **Ukloniti fallback logiku** na lokalnu bazu u `proMealPlanGenerator.ts`
2. ✅ **Zamijeniti** sve pozive `calculateMacrosForGrams` s `computeIngredientMacrosFromEdamam`
3. ✅ **Dodati** `convertMealDefinitionToEdamamRecipe` prije poziva `computeRecipeMacrosFromEdamam`
4. ⏳ **Dodati** debug panel u UI (mobilna aplikacija)
5. ⏳ **Dodati** testove s mock Edamam API-om

## Napredno

### Offline Mode

Za offline mode, dodaj flag:

```typescript
const OFFLINE_MODE = process.env.OFFLINE_MODE === 'true';

if (OFFLINE_MODE) {
  // Koristi lokalnu bazu kao fallback
  // Ali to bi trebalo biti eksplicitno označeno
}
```

### Batch Processing

Za brže izračune, možemo implementirati batch pozive Edamam API-ja (ako API podržava).

## Status Implementacije

- ✅ Osnovna struktura servisa
- ✅ Cache mehanizam
- ✅ Audit trail
- ✅ Validacija konzistentnosti
- ✅ Brand mapping
- ✅ Debug panel funkcije
- ⏳ Integracija u proMealPlanGenerator.ts
- ⏳ UI Debug panel
- ⏳ Testovi s mock Edamam API-om

