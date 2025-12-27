/**
 * RECIPE DATA QUALITY SERVICE
 * 
 * Validira i migrira legacy jela na Edamam-only sustav s semantičkom validacijom.
 */

import {
  computeRecipeMacrosFromEdamam,
  convertMealDefinitionToEdamamRecipe,
  type EdamamRecipe,
} from "./edamamOnlyService";
import {
  validateRecipeSemanticConsistency,
  resolveCategoryFromUILabel,
  type IngredientWithSemantics,
  SemanticCategory,
} from "./edamamSemanticValidator";
import type { RecipeVersion, DataQualityStatus } from "@/lib/db/models";

// ============================================
// TYPES
// ============================================

export interface MealDefinition {
  id: string;
  name: string;
  description?: string;
  preparationTip?: string;
  components: Array<{
    food: string;
    grams: number;
    displayName?: string;
  }>;
  tags?: string[];
  suitableFor?: string[];
}

export interface RecipeValidationResult {
  mealId: string;
  mealName: string;
  version: RecipeVersion;
  status: DataQualityStatus;
  errors: string[];
  warnings: string[];
  edamamMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  legacyMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  needsRemap: boolean;
  remapReasons: string[];
  auditTrail?: any;
}

// ============================================
// HARD RULES - BLOCKING CONDITIONS
// ============================================

/**
 * Provjeri hard rules koje automatski blokiraju jelo
 */
export function checkHardRules(meal: MealDefinition): {
  blocked: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Rule 1: Generic ingredients bez specifičnog tipa
  const genericIngredients = [
    "orašasti plodovi", // ⚠️ Generic - treba biti "Almonds", "Walnuts", itd.
    "mixed nuts", // ⚠️ Generic - treba biti specifičan tip
    "dried fruit", // ⚠️ Generic - treba biti "Dried cranberries", itd.
    "sušeno voće", // ⚠️ Generic
    // "nuts" - NE, jer može biti dio "walnuts", "hazelnuts" itd.
    // "voće" / "fruit" - NE, jer može biti dio "dried fruit" ili "mixed fruit"
  ];
  
  for (const component of meal.components) {
    const foodLower = (component.food || "").toLowerCase();
    const displayLower = (component.displayName || "").toLowerCase();
    
    // Provjeri generic ingredient
    if (
      genericIngredients.some((generic) => 
        foodLower.includes(generic) || displayLower.includes(generic)
      )
    ) {
      reasons.push(
        `Generic ingredient detected: "${component.food}" (${component.displayName || "no displayName"}). Must specify exact type (e.g., "Almonds", "Walnuts").`
      );
    }
  }
  
  // Rule 2: UI title/description vs ingredients mismatch
  const description = (meal.description || "").toLowerCase();
  const name = meal.name.toLowerCase();
  
  // Kreiramo string svih sastojaka (food + displayName) za pretragu
  const componentFoods = meal.components.map((c) => 
    (c.food || "").toLowerCase() + " " + (c.displayName || "").toLowerCase()
  ).join(" ");
  
  // Mapiranje naziva u name/description na food keys u components
  const nameToFoodMap: Record<string, string[]> = {
    // Nuts
    "bademi": ["almond", "bademi"],
    "almonds": ["almond", "bademi"],
    "orasi": ["walnut", "orasi"],
    "walnuts": ["walnut", "orasi"],
    "lješnjaci": ["hazelnut", "lješnjaci"],
    "hazelnuts": ["hazelnut", "lješnjaci"],
    
    // Voće
    "banana": ["banana", "banana"],
    "jabuka": ["apple", "jabuka"],
    "apple": ["apple", "jabuka"],
    "borovnice": ["blueberri", "borovnic"],
    "blueberries": ["blueberri", "borovnic"],
    "brusnice": ["cranberri", "brusnic"],
    "cranberries": ["cranberri", "brusnic"],
    "maline": ["raspberri", "malin"],
    "raspberries": ["raspberri", "malin"],
    "šumsko voće": ["blueberri", "raspberri", "frozen berri", "sumsko voce"],
    "frozen berries": ["blueberri", "raspberri", "frozen berri", "sumsko voce"],
    
    // Jogurt
    "grčki jogurt": ["greek yogurt", "greek yoghurt", "grcki jogurt"],
    "greek yogurt": ["greek yogurt", "greek yoghurt", "grcki jogurt"],
    "skyr": ["skyr"],
    "jogurt": ["yogurt", "yoghurt", "jogurt"],
    
    // Sir
    "zrnati sir": ["cottage cheese", "zrnati sir", "posni sir"],
    "cottage cheese": ["cottage cheese", "zrnati sir", "posni sir"],
    "posni sir": ["cottage cheese", "zrnati sir", "posni sir"],
    "gouda": ["gouda", "gouda sir"],
    "mozzarella": ["mozzarella"],
    
    // Meso
    "pileća prsa": ["chicken breast", "pileca prsa", "piletina"],
    "chicken breast": ["chicken breast", "pileca prsa", "piletina"],
    "pileći dimcek": ["smoked chicken", "pileci dimcek"],
    "smoked chicken": ["smoked chicken", "pileci dimcek"],
    "pršut": ["prosciutto", "prsut", "ham"],
    "prosciutto": ["prosciutto", "prsut", "ham"],
    "tuna": ["tuna", "tuna canned"],
    
    // Ostalo
    "rižini krekeri": ["rice cracker", "rice cake", "rizini kreker"],
    "rice crackers": ["rice cracker", "rice cake", "rizini kreker"],
    "tost": ["toast", "tost"],
    "toast": ["toast", "tost"],
    "kikiriki maslac": ["peanut butter", "kikiriki maslac"],
    "peanut butter": ["peanut butter", "kikiriki maslac"],
  };
  
  // Provjeri da li name spominje namirnice koje nisu u components
  for (const [nameToken, foodVariants] of Object.entries(nameToFoodMap)) {
    if (name.includes(nameToken)) {
      // Provjeri da li postoji barem jedan variant u components
      const hasMatch = foodVariants.some((variant) => 
        componentFoods.includes(variant)
      );
      
      if (!hasMatch) {
        reasons.push(
          `Meal name mentions "${nameToken}" but ingredients do not contain it. Expected one of: ${foodVariants.join(", ")}`
        );
      }
    }
  }
  
  // Provjeri da li description spominje jaja/meso/mliječni ali components ne sadrže
  if (
    (description.includes("eggs") || description.includes("jaja")) &&
    !componentFoods.includes("egg") && !componentFoods.includes("jaja")
  ) {
    reasons.push(
      `Description mentions eggs/jaja but ingredients do not contain eggs.`
    );
  }
  
  if (
    (description.includes("meat") || description.includes("meso")) &&
    !componentFoods.match(/\b(chicken|beef|pork|turkey|tuna|salmon|fish|piletina|junetina|svinjetina)\b/i)
  ) {
    reasons.push(
      `Description mentions meat/meso but ingredients do not contain meat.`
    );
  }
  
  // Rule 2b: Provjeri "s voćem" - mora imati barem jedno voće
  if (name.includes("s voćem") || name.includes("s vocem") || name.includes("with fruit")) {
    const fruitVariants = ["banana", "apple", "blueberri", "cranberri", "raspberri", "strawberri", "jagod", "voce", "fruit"];
    const hasFruit = fruitVariants.some((fruit) => componentFoods.includes(fruit));
    
    if (!hasFruit) {
      reasons.push(
        `Meal name mentions "s voćem/with fruit" but ingredients do not contain any fruit.`
      );
    }
  }
  
  // Rule 3: Provjeri da li components sadrže namirnice koje ne pripadaju (npr. jaja u trail mix)
  const mealType = inferMealType(meal);
  
  if (mealType === "trail-mix" || mealType === "nuts" || name.includes("orašastih plodova") || name.includes("trail mix")) {
    // Trail mix ne smije imati jaja, meso, mliječne proizvode (osim čokolade)
    // Također ne smije imati višnje (cherries) ako naziv spominje brusnice (cranberries)
    const invalidForTrailMix = [
      "egg", "jaja", "jaje",
      "chicken", "beef", "pork", "turkey", "piletina", "junetina",
      "milk", "mlijeko", "cheese", "sir", "yogurt", "jogurt",
    ];
    
    // Provjeri jaja i meso
    for (const component of meal.components) {
      const foodLower = (component.food || "").toLowerCase();
      const displayLower = (component.displayName || "").toLowerCase();
      
      if (
        invalidForTrailMix.some((invalid) => 
          foodLower.includes(invalid) || displayLower.includes(invalid)
        ) &&
        !foodLower.includes("chocolate") && !displayLower.includes("čokolada")
      ) {
        reasons.push(
          `Trail mix/nuts meal contains invalid ingredient: "${component.food}" (${component.displayName}). Trail mix should only contain nuts, dried fruit, and optionally dark chocolate.`
        );
      }
      
      // Provjeri višnje vs brusnice
      if (
        (displayLower.includes("višnje") || displayLower.includes("cherry") || foodLower.includes("cherry")) &&
        (description.includes("brusnic") || description.includes("cranberri") || name.includes("brusnic") || name.includes("cranberri"))
      ) {
        reasons.push(
          `Trail mix contains "višnje/cherries" but name/description mentions "brusnice/cranberries". These are different fruits and should not be mixed.`
        );
      }
    }
  }
  
  // Rule 4: Višnje vs cranberries mismatch
  for (const component of meal.components) {
    const displayLower = (component.displayName || "").toLowerCase();
    const foodLower = (component.food || "").toLowerCase();
    
    if (
      (description.includes("cranberries") || description.includes("brusnice")) &&
      (displayLower.includes("višnje") || displayLower.includes("cherry") || foodLower.includes("cherry"))
    ) {
      reasons.push(
        `Description mentions cranberries/brusnice but ingredient is "${component.food}" (${component.displayName}) which appears to be cherries/višnje.`
      );
    }
  }
  
  return {
    blocked: reasons.length > 0,
    reasons,
  };
}

/**
 * Infer meal type iz name/description
 */
function inferMealType(meal: MealDefinition): string {
  const text = (meal.name + " " + (meal.description || "")).toLowerCase();
  
  if (text.includes("trail mix") || text.includes("orašastih plodova") || text.includes("mix")) {
    return "trail-mix";
  }
  if (text.includes("nuts") || text.includes("orašasti")) {
    return "nuts";
  }
  if (text.includes("smoothie") || text.includes("shake")) {
    return "smoothie";
  }
  
  return "unknown";
}

// ============================================
// VALIDATION FUNCTION
// ============================================

/**
 * Validira jelo i vraća status kvalitete podataka
 */
export async function validateRecipeDataQuality(
  meal: MealDefinition
): Promise<RecipeValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const remapReasons: string[] = [];
  
  // 1. Provjeri hard rules
  const hardRules = checkHardRules(meal);
  if (hardRules.blocked) {
    errors.push(...hardRules.reasons);
    return {
      mealId: meal.id,
      mealName: meal.name,
      version: 1,
      status: "INVALID_MAPPING",
      errors,
      warnings,
      needsRemap: true,
      remapReasons: hardRules.reasons,
    };
  }
  
  // 2. Konvertiraj u EdamamRecipe format
  const edamamRecipe = convertMealDefinitionToEdamamRecipe(meal);
  
  // 3. Izračunaj makroe preko Edamam-a
  let edamamResult;
  try {
    edamamResult = await computeRecipeMacrosFromEdamam(edamamRecipe);
  } catch (error: any) {
    errors.push(`Edamam API error: ${error.message}`);
    return {
      mealId: meal.id,
      mealName: meal.name,
      version: 1,
      status: "NEEDS_REVIEW",
      errors,
      warnings,
      needsRemap: true,
      remapReasons: ["Edamam API failed"],
    };
  }
  
  // 4. Provjeri semantic validation
  if (edamamResult.validationError) {
    errors.push(edamamResult.validationError);
    remapReasons.push("Semantic validation failed");
  }
  
  if (edamamResult.semanticValidation && !edamamResult.semanticValidation.isValid) {
    errors.push(...edamamResult.semanticValidation.errors.map((e) => e.mismatchReason));
    remapReasons.push("Semantic mismatch detected");
  }
  
  // 5. Provjeri consistency check
  if (edamamResult.auditTrail?.consistencyCheck?.flag) {
    warnings.push(`Consistency check flag: ${edamamResult.auditTrail.consistencyCheck.flag}`);
  }
  
  // 6. Odredi status
  let status: DataQualityStatus = "VERIFIED";
  if (errors.length > 0) {
    status = "INVALID_MAPPING";
  } else if (edamamResult.needsReview) {
    status = "NEEDS_REVIEW";
  } else if (remapReasons.length > 0) {
    status = "NEEDS_REMAP";
  }
  
  return {
    mealId: meal.id,
    mealName: meal.name,
    version: 2,
    status,
    errors,
    warnings,
    edamamMacros: edamamResult.macros,
    needsRemap: status !== "VERIFIED",
    remapReasons,
    auditTrail: edamamResult.auditTrail,
  };
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Migriraj legacy jelo na version 2
 */
export async function migrateLegacyMeal(
  meal: MealDefinition
): Promise<RecipeValidationResult> {
  return validateRecipeDataQuality(meal);
}

/**
 * Batch migracija svih jela
 */
export async function migrateAllMeals(
  meals: MealDefinition[]
): Promise<{
  total: number;
  verified: number;
  needsRemap: number;
  invalidMapping: number;
  needsReview: number;
  results: RecipeValidationResult[];
}> {
  const results: RecipeValidationResult[] = [];
  let verified = 0;
  let needsRemap = 0;
  let invalidMapping = 0;
  let needsReview = 0;
  
  for (const meal of meals) {
    const result = await migrateLegacyMeal(meal);
    results.push(result);
    
    if (result.status === "VERIFIED") verified++;
    else if (result.status === "NEEDS_REMAP") needsRemap++;
    else if (result.status === "INVALID_MAPPING") invalidMapping++;
    else if (result.status === "NEEDS_REVIEW") needsReview++;
    
    // Rate limiting - čekaj 100ms između poziva
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  
  return {
    total: meals.length,
    verified,
    needsRemap,
    invalidMapping,
    needsReview,
    results,
  };
}

