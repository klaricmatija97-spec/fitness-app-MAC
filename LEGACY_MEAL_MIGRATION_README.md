# Legacy Meal Migration - Edamam-Only System

## Problem

Postojeća jela u `meal_components.json` koriste legacy makronutrijente koji mogu biti netočni ili nekonzistentni. Primjer bug-a:

**"Mix orašastih plodova"**:
- UI description: almonds, walnuts, hazelnuts, dried cranberries, dark chocolate
- Stored ingredients: Bademi 40g, Orasi 40g, **Orašasti plodovi 40g (generic)**, **Jaje 110g (WRONG!)**, **Višnje 40g (mismatch)**
- Displayed macros: 427 kcal, P 22g, C 8g, F 34g (netočno!)

## Rješenje

Implementiran sustav za migraciju svih legacy jela na Edamam-only sustav s semantičkom validacijom.

## Implementacija

### 1. Recipe Model Extension

Dodani su novi field-ovi u `Recipe` interface:

```typescript
interface Recipe {
  // ... postojeći field-ovi
  version?: RecipeVersion; // 1 = legacy, 2 = edamam+semantic verified
  data_quality_status?: DataQualityStatus; // VERIFIED | NEEDS_REVIEW | INVALID_MAPPING | NEEDS_REMAP
  data_quality_errors?: string[]; // Array of error messages
  edamam_audit_trail?: any; // Full Edamam audit trail
}
```

### 2. Data Quality Service

`lib/services/recipeDataQuality.ts` pruža:

- **`validateRecipeDataQuality()`** - Validira jelo i vraća status
- **`checkHardRules()`** - Provjerava hard rules koje blokiraju jelo
- **`migrateLegacyMeal()`** - Migrira legacy jelo na version 2
- **`migrateAllMeals()`** - Batch migracija svih jela

### 3. Hard Rules (Blocking Conditions)

Jelo se automatski blokira ako:

1. **Generic ingredients** - "Orašasti plodovi", "Mixed nuts", "Dried fruit" bez specifičnog tipa
2. **UI vs Ingredients mismatch** - Description spominje namirnice koje nisu u components
3. **Invalid ingredients for meal type** - Npr. jaja u trail mix-u
4. **Category mismatch** - Višnje umjesto cranberries, itd.

### 4. Migration Script

```bash
npx tsx scripts/migrate-meals-to-edamam.ts
```

Script:
1. Učitava sva jela iz `meal_components.json`
2. Validira svako jelo s Edamam-om i semantic validatorom
3. Generira izvještaj (`migration-report.json` i `migration-summary.txt`)

### 5. SQL Migration

```sql
-- Pokreni u Supabase SQL Editor:
supabase-migration-data-quality.sql
```

Dodaje kolone:
- `version` (INTEGER, default: 1)
- `data_quality_status` (TEXT)
- `data_quality_errors` (JSONB)
- `edamam_audit_trail` (JSONB)

### 6. UI Validation Helpers

`lib/services/mealValidationHelpers.ts` pruža:

- **`areMacrosTrusted()`** - Provjeri da li su makroi verified
- **`needsRemap()`** - Provjeri da li jelo treba remap
- **`canShowMacros()`** - Provjeri da li se makroi mogu prikazati
- **`getQualityStatusMessage()`** - Generira poruku za UI banner

## Korištenje

### Validacija Jela

```typescript
import { validateRecipeDataQuality } from "@/lib/services/recipeDataQuality";

const meal = {
  id: "snack_1",
  name: "Mix orašastih plodova",
  description: "Trail mix with nuts",
  components: [
    { food: "Almonds", grams: 20, displayName: "Bademi" },
    { food: "Mixed nuts", grams: 40, displayName: "Orašasti plodovi" }, // ❌ Generic!
  ],
};

const result = await validateRecipeDataQuality(meal);

if (result.status === "INVALID_MAPPING") {
  console.error("Blocked:", result.errors);
} else if (result.status === "VERIFIED") {
  console.log("Macros:", result.edamamMacros);
}
```

### UI Prikaz

```typescript
import { areMacrosTrusted, getQualityStatusMessage, canShowMacros } from "@/lib/services/mealValidationHelpers";

function MealCard({ meal }) {
  const trusted = areMacrosTrusted(meal);
  const statusMessage = getQualityStatusMessage(meal);
  const canShow = canShowMacros(meal);
  
  return (
    <div>
      {statusMessage.showBanner && (
        <div className={`banner ${statusMessage.severity}`}>
          {statusMessage.message}
          {!trusted && (
            <button onClick={() => reVerifyMeal(meal.id)}>
              Re-verify with Edamam
            </button>
          )}
        </div>
      )}
      
      {canShow ? (
        <div>
          <p>{meal.calories} kcal</p>
          <p>P: {meal.protein}g</p>
          {!trusted && <span className="warning">⚠️ Not verified</span>}
        </div>
      ) : (
        <div>Makronutrijenti su blokirani zbog nekonzistentnog mapiranja.</div>
      )}
    </div>
  );
}
```

## Testovi

```typescript
// lib/services/__tests__/recipeDataQuality.test.ts

describe("Bug Example: Mix orašastih plodova", () => {
  it("should BLOCK meal with generic 'Orašasti plodovi' ingredient", async () => {
    const buggyMeal = {
      id: "snack_test_bug",
      name: "Mix orašastih plodova",
      description: "Trail mix with nuts",
      components: [
        { food: "Mixed nuts", grams: 40, displayName: "Orašasti plodovi" }, // ❌
        { food: "Egg", grams: 110, displayName: "Jaje" }, // ❌
        { food: "Cherries", grams: 40, displayName: "Višnje" }, // ❌
      ],
    };
    
    const result = await validateRecipeDataQuality(buggyMeal);
    
    expect(result.status).toBe("INVALID_MAPPING");
    expect(result.needsRemap).toBe(true);
  });
});
```

## Migration Report Format

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "total": 200,
    "verified": 150,
    "needsRemap": 30,
    "invalidMapping": 15,
    "needsReview": 5,
    "verifiedPercent": "75.00"
  },
  "results": [
    {
      "mealId": "snack_1",
      "mealName": "Mix orašastih plodova",
      "version": 2,
      "status": "INVALID_MAPPING",
      "errors": [
        "Generic ingredient detected: 'Mixed nuts' (Orašasti plodovi)...",
        "Trail mix contains invalid ingredient: 'Egg' (Jaje)..."
      ],
      "needsRemap": true,
      "remapReasons": ["Generic ingredient", "Invalid ingredient for meal type"]
    }
  ],
  "invalidMeals": [...],
  "needsRemapMeals": [...]
}
```

## Status Workflow

```
Legacy (version 1)
  ↓
[Run Migration]
  ↓
┌─────────────────┬──────────────────┬─────────────────┐
│  VERIFIED       │  NEEDS_REMAP     │  INVALID_MAPPING│
│  ✅ Show macros │  ⚠️ Show macros   │  ❌ Hide macros  │
│  No banner      │  Banner + action  │  Banner + error  │
└─────────────────┴──────────────────┴─────────────────┘
```

## Next Steps

1. **Pokreni SQL migraciju** u Supabase
2. **Pokreni migration script** za sva jela
3. **Review migration report** i popravi jela koja trebaju remap
4. **Integriraj UI validaciju** u meal rendering komponente
5. **Dodaj "Re-verify" button** u UI za legacy jela

## Troubleshooting

### Problem: "Edamam API error"

**Rješenje:** Provjeri da li su Edamam API ključevi postavljeni u environment varijablama.

### Problem: "Too many API calls"

**Rješenje:** Migration script ima rate limiting (100ms između poziva). Možeš povećati delay ako je potrebno.

### Problem: "Generic ingredient detected"

**Rješenje:** Zamijeni generic ingredient (npr. "Orašasti plodovi") s specifičnim tipom (npr. "Almonds", "Walnuts", "Hazelnuts").















