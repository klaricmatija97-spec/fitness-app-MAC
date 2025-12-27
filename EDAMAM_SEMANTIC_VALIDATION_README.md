# Edamam Semantic Validation - Sprječavanje UI↔Ingredient↔Edamam Mismatch-a

## Problem

UI prikazuje jedan naziv sastojka (npr. "Pršut"), ali se u Edamam šalje nešto drugo (npr. "chicken ham"), što rezultira krivim makronutrijentima i zavaravajućim UI-em.

## Rješenje

Semantička validacija osigurava da UI label i Edamam match pripadaju **istoj semantičkoj kategoriji**. Ako ne pripadaju, sistem **blokira** spremanje i izračun makroa.

## Implementacija

### 1. Ingredient Model

Ingredient model sada odvaja tri sloja:

```typescript
interface IngredientWithSemantics {
  // UI Layer - što korisnik vidi
  uiLabel: string; // "Pršut"
  
  // Internal Layer - semantička kategorija
  semanticCategory?: SemanticCategory; // PROSCIUTTO_CURED_PORK
  
  // Edamam Layer - što se šalje i vraća iz Edamam-a
  edamamQuery?: string; // "50 g prosciutto"
  edamamMatch?: string; // "prosciutto" (što je Edamam vratio)
  edamamResolvedCategory?: SemanticCategory; // PROSCIUTTO_CURED_PORK
}
```

### 2. Semantičke Kategorije

Definirane su semantičke kategorije za kritične proizvode:

- `PROSCIUTTO_CURED_PORK` - Pršut, prosciutto, dry-cured ham
- `POULTRY_HAM` - Pileća šunka, turkey ham
- `SALAMI_SAUSAGE` - Salama, sausage, cured sausage
- `CHICKEN_BREAST` - Pileća prsa
- `SMOKED_CHICKEN` - Pileći dimcek
- `TUNA_CANNED` - Tuna u konzervi
- ... i više

### 3. Validacija

`validateRecipeSemanticConsistency()` provjerava:

```typescript
const result = validateRecipeSemanticConsistency(ingredients);

if (!result.isValid) {
  // BLOCKIRAJ spremanje i izračun makroa
  const errorMessage = generateUserFriendlyError(result);
  // Prikaži korisniku grešku i remap opciju
}
```

### 4. Blokiranje

Ako validacija ne uspije, `computeRecipeMacrosFromEdamam()` vraća:

```typescript
{
  macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, // Null makroi
  needsReview: true,
  semanticValidation: { isValid: false, errors: [...] },
  validationError: "UI says 'Pršut' but mapped as 'chicken ham'..."
}
```

**Nema silent fallback-a** - ako nema konzistentnosti, makroi se ne računaju.

### 5. Remap Flow

Ako validacija ne uspije, korisnik može:

1. Vidjeti predložene Edamam match-eve
2. Eksplicitno odabrati ispravan match
3. Spremiti `edamamFoodId` i `edamamMatch` za buduće pozive

```typescript
import { createRemapRequest, applyRemap } from "./edamamRemapFlow";

const remapRequest = createRemapRequest(ingredient, ingredientIndex);
// Prikaži korisniku remapRequest.suggestedMatches

// Nakon što korisnik odabere:
const remapResult = {
  ingredientIndex,
  selectedSuggestion: userSelectedSuggestion,
  remappedIngredient: ingredient,
};

const remapped = applyRemap(remapResult);
// Sada ingredient ima ispravne edamamFoodId i edamamMatch
```

## Korištenje

### Osnovni Primjer

```typescript
import {
  computeRecipeMacrosFromEdamam,
  convertMealDefinitionToEdamamRecipe,
} from "@/lib/services/edamamOnlyService";

const mealDef = {
  id: "lunch_1",
  name: "Jaja + pršut + tost",
  components: [
    { food: "Egg", grams: 100, displayName: "Jaja" },
    { food: "Ham", grams: 50, displayName: "Pršut" }, // ⚠️ Ovo je problematično!
    { food: "Toast", grams: 60 },
  ],
};

const edamamRecipe = convertMealDefinitionToEdamamRecipe(mealDef);
const result = await computeRecipeMacrosFromEdamam(edamamRecipe);

if (result.validationError) {
  // BLOCKIRANO - prikaži grešku korisniku
  console.error(result.validationError);
  // Prikaži remap flow
} else {
  // OK - makroi su točni
  console.log(result.macros);
}
```

### Popravljanje Problema

Ako imaš jelo gdje `displayName` kaže "Pršut" ali `food` je "Ham" (što može mapirati "chicken ham"):

```typescript
// PRIJE (problematično):
{
  food: "Ham",
  displayName: "Pršut", // ❌ UI kaže pršut, ali food može mapirati chicken ham
}

// NAKON (ispravno):
{
  food: "Prosciutto", // ✅ Eksplicitno prosciutto
  displayName: "Pršut",
}

// ILI koristi remap flow da eksplicitno odabereš "prosciutto" iz Edamam-a
```

## Unit Testovi

```typescript
// Test 1: UI "Pršut" + match "chicken ham" => BLOCKED
it("blocks 'Pršut' mapped as 'chicken ham'", () => {
  const result = validateRecipeSemanticConsistency([
    {
      uiLabel: "Pršut",
      semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
      edamamMatch: "chicken ham",
      edamamResolvedCategory: SemanticCategory.POULTRY_HAM,
      quantity: 50,
      unit: "g",
    },
  ]);
  
  expect(result.isValid).toBe(false);
});

// Test 2: UI "Pršut" + match "prosciutto" => OK
it("allows 'Pršut' mapped as 'prosciutto'", () => {
  const result = validateRecipeSemanticConsistency([
    {
      uiLabel: "Pršut",
      semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
      edamamMatch: "prosciutto",
      edamamResolvedCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
      quantity: 50,
      unit: "g",
    },
  ]);
  
  expect(result.isValid).toBe(true);
});
```

## Audit Trail

Svaki ingredient ima audit log:

```typescript
{
  uiLabel: "Pršut",
  edamamQuery: "50 g prosciutto",
  edamamFoodId: "food_abc123",
  edamamMatch: "prosciutto",
  uiCategory: "PROSCIUTTO_CURED_PORK",
  edamamCategory: "PROSCIUTTO_CURED_PORK",
  isConsistent: true,
  mismatchReason: undefined,
}
```

Ako nije konzistentan:

```typescript
{
  uiLabel: "Pršut",
  edamamMatch: "chicken ham",
  uiCategory: "PROSCIUTTO_CURED_PORK",
  edamamCategory: "POULTRY_HAM",
  isConsistent: false,
  mismatchReason: "UI says 'Pršut' (PROSCIUTTO_CURED_PORK) but Edamam matched 'chicken ham' (POULTRY_HAM)",
}
```

## Debug Panel

```typescript
import { getDebugInfoForRecipe } from "@/lib/services/edamamOnlyService";

const debugInfo = await getDebugInfoForRecipe(recipe);

console.log("Edamam queries:", debugInfo.edamamQueries);
// [
//   {
//     ingredient: "Pršut",
//     queryText: "50 g prosciutto",
//     response: { calories: 135, protein: 13, ... },
//     cached: false,
//   },
// ]

console.log("Semantic validation:", debugInfo.semanticValidation);
// {
//   isValid: true,
//   errors: [],
//   audit: [...],
// }
```

## Dodavanje Novih Kategorija

### 1. Dodaj kategoriju u enum

```typescript
export enum SemanticCategory {
  // ... postojeće
  NEW_CATEGORY = "NEW_CATEGORY",
}
```

### 2. Dodaj synonyme u UI_LABEL_TO_CATEGORY

```typescript
const UI_LABEL_TO_CATEGORY: Record<string, SemanticCategory> = {
  // ... postojeće
  "novi naziv": SemanticCategory.NEW_CATEGORY,
};
```

### 3. Dodaj Edamam match-eve u EDAMAM_MATCH_TO_CATEGORY

```typescript
const EDAMAM_MATCH_TO_CATEGORY: Record<string, SemanticCategory> = {
  // ... postojeće
  "edamam match name": SemanticCategory.NEW_CATEGORY,
};
```

## Integracija u Postojeći Kod

### Opcija 1: Aktiviraj validaciju (preporučeno)

```typescript
// U proMealPlanGenerator.ts, koristi:
const result = await computeRecipeMacrosFromEdamam(edamamRecipe);
// Validacija je automatski aktivna

if (result.validationError) {
  // Handle error - prikaži korisniku ili logiraj
  throw new Error(result.validationError);
}
```

### Opcija 2: Preskoči validaciju (legacy kod)

```typescript
const result = await computeRecipeMacrosFromEdamam(edamamRecipe, {
  skipSemanticValidation: true, // ⚠️ Samo za legacy kod!
});
```

## Rješavanje Problema

### Problem: "UI says 'Pršut' but mapped as 'chicken ham'"

**Uzrok:** U `meal_components.json`, `food` ključ je "Ham" koji mapira na "chicken ham", ali `displayName` je "Pršut".

**Rješenje:**
1. Promijeni `food` iz "Ham" u "Prosciutto" (ako postoji u bazi)
2. ILI koristi remap flow da eksplicitno odabereš "prosciutto"
3. ILI dodaj novi entry u `meal_components.json` s `food: "Prosciutto"`

### Problem: "Category unresolved"

**Uzrok:** UI label ili Edamam match nisu u synonym map-ovima.

**Rješenje:**
1. Dodaj synonyme u `UI_LABEL_TO_CATEGORY` i `EDAMAM_MATCH_TO_CATEGORY`
2. ILI eksplicitno postavi `semanticCategory` i `edamamResolvedCategory` u ingredient objektu

## Status

- ✅ Ingredient model s odvojenim slojevima
- ✅ Semantičke kategorije
- ✅ Validacija konzistentnosti
- ✅ Blokiranje nekonzistentnih mapiranja
- ✅ Audit trail
- ✅ Remap flow (osnovna struktura)
- ✅ Unit testovi
- ✅ Debug panel
- ⏳ UI integracija (prikaz grešaka i remap flow-a)

