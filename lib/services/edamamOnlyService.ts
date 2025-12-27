/**
 * EDAMAM-ONLY SERVICE - Single Source of Truth za Makronutrijente
 * 
 * Ova implementacija osigurava da se svi makronutrijenti računaju isključivo
 * preko Edamam API-ja, bez fallback-a na lokalnu bazu.
 * 
 * ZAHTJEVI:
 * - Svaki ingredient i recipe koristi Edamam API
 * - Cache za performanse, ali s pravilnim invalidacijom
 * - Audit trail za praćenje
 * - Validacija konzistentnosti
 * - Debug panel za inspekciju
 */

import { analyzeNutrition, analyzeNutritionFromText, type SimplifiedNutrition } from "./edamamService";
import {
  validateRecipeSemanticConsistency,
  resolveCategoryFromUILabel,
  resolveCategoryFromEdamamMatch,
  generateUserFriendlyError,
  type IngredientWithSemantics,
  type SemanticValidationResult,
  SemanticCategory,
} from "./edamamSemanticValidator";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface EdamamIngredient {
  // UI Layer
  uiLabel?: string;          // Što korisnik vidi (npr. "Pršut")
  
  // Edamam Layer
  name: string;              // Tekst koji ide u Edamam (npr. "rice cakes plain")
  quantity: number;          // Količina
  unit: string;              // Jedinica (g/ml/pcs/serving)
  brand?: string;            // Brand/brend (opcionalno)
  upc?: string;              // UPC kod (opcionalno)
  servingSizeGrams?: number; // Ako je unit pcs/serving, koliko to iznosi u gramima
  locale?: string;           // Jezik/locale (default: "en")
  
  // Semantic Validation (opcionalno, popunjava se nakon Edamam poziva)
  edamamFoodId?: string;     // Edamam food ID (ako postoji)
  edamamMatch?: string;      // Što je Edamam vratio (food label)
}

export interface EdamamRecipe {
  id: string;
  name: string;
  ingredients: EdamamIngredient[];
}

export interface ComputedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Opcionalno - mikronutrijenti ako su dostupni
  fiber?: number;
  sugar?: number;
  sodium?: number;
  [key: string]: any;
}

export interface IngredientMatch {
  ingredientText: string;    // Što je poslano Edamam-u
  edamamMatch: string;       // Što je Edamam vratio
  edamamFoodId?: string;     // Edamam food ID (ako postoji)
  weight: number;            // Težina u gramima
  macros: ComputedMacros;
  uiLabel?: string;          // Original UI label (za validaciju)
  uiCategory?: SemanticCategory | null; // Semantička kategorija iz UI labela
  edamamCategory?: SemanticCategory | null; // Semantička kategorija iz Edamam matcha
  isSemanticallyConsistent?: boolean; // Da li se kategorije podudaraju
}

export interface RecipeAuditTrail {
  recipeId: string;
  recipeName: string;
  timestamp: string;
  edamamRequestId?: string;
  ingredients: IngredientMatch[];
  totals: ComputedMacros;
  consistencyCheck: {
    caloriesFromMacros: number;
    deviationPercent: number;
    isConsistent: boolean;
    flag?: "DATA_INCONSISTENT" | "NEEDS_USER_MAPPING" | "NEEDS_REVIEW";
  };
}

// ============================================
// CACHE CONFIGURATION
// ============================================

interface CacheKey {
  ingredientName: string;
  quantity: number;
  unit: string;
  brand?: string;
  upc?: string;
  locale?: string;
}

interface CacheEntry {
  macros: ComputedMacros;
  timestamp: number;
  edamamResponseId?: string;
}

// In-memory cache
const ingredientCache = new Map<string, CacheEntry>();

// Cache TTL: 24 sata (86400000 ms)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generiraj cache key od ingredient parametara
 */
function generateCacheKey(params: CacheKey): string {
  const parts = [
    params.ingredientName.toLowerCase().trim(),
    params.quantity.toString(),
    params.unit.toLowerCase(),
    params.brand || "",
    params.upc || "",
    params.locale || "en",
  ];
  return parts.join("|");
}

/**
 * Provjeri cache i vrati ako je validan
 */
function getCachedMacros(key: string): ComputedMacros | null {
  const entry = ingredientCache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    ingredientCache.delete(key);
    return null;
  }
  
  return entry.macros;
}

/**
 * Spremi u cache
 */
function setCachedMacros(
  key: string,
  macros: ComputedMacros,
  edamamResponseId?: string
): void {
  ingredientCache.set(key, {
    macros,
    timestamp: Date.now(),
    edamamResponseId,
  });
}

/**
 * Invalidiraj cache za ingredient
 */
export function invalidateIngredientCache(params: CacheKey): void {
  const key = generateCacheKey(params);
  ingredientCache.delete(key);
}

// ============================================
// NORMALIZACIJA I KONVERZIJA
// ============================================

/**
 * Konvertiraj ingredient u grame/ml ako je potrebno
 */
function normalizeIngredientToGrams(ingredient: EdamamIngredient): {
  name: string;
  quantityGrams: number;
  needsUserMapping: boolean;
} {
  // Ako je već u gramima ili mililitrima, vraćamo direktno
  if (ingredient.unit === "g" || ingredient.unit === "ml") {
    return {
      name: ingredient.name,
      quantityGrams: ingredient.quantity,
      needsUserMapping: false,
    };
  }

  // Ako je u komadima ili servingu, trebamo konverziju
  if (ingredient.unit === "pcs" || ingredient.unit === "piece" || ingredient.unit === "serving") {
    if (ingredient.servingSizeGrams) {
      return {
        name: ingredient.name,
        quantityGrams: ingredient.quantity * ingredient.servingSizeGrams,
        needsUserMapping: false,
      };
    }
    // Ako nema servingSizeGrams, označi da treba user mapping
    return {
      name: ingredient.name,
      quantityGrams: 0,
      needsUserMapping: true,
    };
  }

  // Za ostale jedinice, pokušajmo prepoznati
  // Npr. "cup", "tbsp", "tsp" - ovi se mogu konvertirati kroz Edamam "measure" mehanizam
  // Za sada, označimo kao needs mapping ako nije g/ml/pcs/serving
  return {
    name: ingredient.name,
    quantityGrams: 0,
    needsUserMapping: true,
  };
}

/**
 * Formiraj Edamam query string od ingredienta
 */
function formatIngredientForEdamam(ingredient: EdamamIngredient): string {
  const normalized = normalizeIngredientToGrams(ingredient);
  
  if (normalized.needsUserMapping) {
    // Ako nema gramaže, koristi originalni format i Edamam će pokušati parsirati
    return `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
  }

  // Ako imamo brand, dodaj prije naziva
  let nameWithBrand = normalized.name;
  if (ingredient.brand) {
    nameWithBrand = `${ingredient.brand} ${normalized.name}`;
  }

  // Formatiraj kao "X g ingredient_name"
  // Edamam preferira format: "30 g Natur bio rice cakes plain"
  return `${normalized.quantityGrams} g ${nameWithBrand}`;
}

// ============================================
// GLAVNE FUNKCIJE
// ============================================

/**
 * Izračunaj makronutrijente za jedan ingredient preko Edamam-a
 */
export async function computeIngredientMacrosFromEdamam(
  ingredient: EdamamIngredient
): Promise<{
  macros: ComputedMacros;
  match: IngredientMatch;
  needsUserMapping: boolean;
}> {
  // Provjeri cache
  const cacheKey = generateCacheKey({
    ingredientName: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    brand: ingredient.brand,
    upc: ingredient.upc,
    locale: ingredient.locale,
  });

  const cached = getCachedMacros(cacheKey);
  if (cached) {
    return {
      macros: cached,
      match: {
        ingredientText: formatIngredientForEdamam(ingredient),
        edamamMatch: "cached",
        weight: cached.calories, // Placeholder
        macros: cached,
      },
      needsUserMapping: false,
    };
  }

  // Normaliziraj ingredient
  const normalized = normalizeIngredientToGrams(ingredient);
  
  if (normalized.needsUserMapping) {
    return {
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      match: {
        ingredientText: formatIngredientForEdamam(ingredient),
        edamamMatch: "NEEDS_USER_MAPPING",
        weight: 0,
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
      needsUserMapping: true,
    };
  }

  // Formiraj query za Edamam
  const ingredientText = formatIngredientForEdamam(ingredient);

  // Pozovi Edamam API
  const edamamResult = await analyzeNutritionFromText(ingredientText, ingredient.name);

  if (!edamamResult) {
    // Ako Edamam ne može parsirati, označi kao NEEDS_REVIEW
    const uiCategory = ingredient.uiLabel ? resolveCategoryFromUILabel(ingredient.uiLabel) : null;
    return {
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      match: {
        ingredientText,
        edamamMatch: "NEEDS_REVIEW - Edamam API failed",
        weight: 0,
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        uiLabel: ingredient.uiLabel,
        uiCategory,
        edamamCategory: null,
        isSemanticallyConsistent: false,
      },
      needsUserMapping: true,
    };
  }

  const macros: ComputedMacros = {
    calories: edamamResult.calories,
    protein: edamamResult.protein,
    carbs: edamamResult.carbs,
    fat: edamamResult.fat,
    fiber: edamamResult.fiber,
    sugar: edamamResult.sugar,
    sodium: edamamResult.sodium,
  };

  // Resolviraj semantičke kategorije za validaciju
  const uiCategory = ingredient.uiLabel ? resolveCategoryFromUILabel(ingredient.uiLabel) : null;
  const edamamCategory = ingredient.edamamMatch 
    ? resolveCategoryFromEdamamMatch(ingredient.edamamMatch)
    : resolveCategoryFromEdamamMatch(ingredientText); // Fallback na ingredientText
  
  const isSemanticallyConsistent = uiCategory !== null && 
                                   edamamCategory !== null && 
                                   uiCategory === edamamCategory &&
                                   uiCategory !== SemanticCategory.UNKNOWN;

  // Spremi u cache
  setCachedMacros(cacheKey, macros);

  return {
    macros,
    match: {
      ingredientText,
      edamamMatch: ingredient.edamamMatch || ingredientText, // Koristi explicit match ako postoji, inače ingredientText
      edamamFoodId: ingredient.edamamFoodId,
      weight: normalized.quantityGrams,
      macros,
      uiLabel: ingredient.uiLabel,
      uiCategory,
      edamamCategory,
      isSemanticallyConsistent,
    },
    needsUserMapping: false,
  };
}

/**
 * Izračunaj makronutrijente za cijeli recept preko Edamam-a
 * Sada uključuje semantičku validaciju!
 */
export async function computeRecipeMacrosFromEdamam(
  recipe: EdamamRecipe,
  options?: {
    skipSemanticValidation?: boolean; // Ako true, preskoči validaciju (za legacy kod)
  }
): Promise<{
  macros: ComputedMacros;
  auditTrail: RecipeAuditTrail;
  needsReview: boolean;
  semanticValidation?: SemanticValidationResult;
  validationError?: string;
}> {
  const ingredientMatches: IngredientMatch[] = [];
  let totalMacros: ComputedMacros = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  let needsUserMapping = false;

  // Izračunaj makroe za svaki ingredient
  for (const ingredient of recipe.ingredients) {
    const result = await computeIngredientMacrosFromEdamam(ingredient);
    
    ingredientMatches.push(result.match);
    
    if (result.needsUserMapping) {
      needsUserMapping = true;
    } else {
      // Dodaj makroe ingredienta na total
      totalMacros.calories += result.macros.calories;
      totalMacros.protein += result.macros.protein;
      totalMacros.carbs += result.macros.carbs;
      totalMacros.fat += result.macros.fat;
      
      // Dodaj opcionalne mikronutrijente ako postoje
      if (result.macros.fiber !== undefined) {
        totalMacros.fiber = (totalMacros.fiber || 0) + result.macros.fiber;
      }
      if (result.macros.sugar !== undefined) {
        totalMacros.sugar = (totalMacros.sugar || 0) + result.macros.sugar;
      }
      if (result.macros.sodium !== undefined) {
        totalMacros.sodium = (totalMacros.sodium || 0) + result.macros.sodium;
      }
    }
  }
  
  // SEMANTIČKA VALIDACIJA - provjeri konzistentnost UI labela i Edamam matcha
  let semanticValidation: SemanticValidationResult | undefined;
  let validationError: string | undefined;
  
  if (!options?.skipSemanticValidation) {
    // Konvertiraj IngredientMatch u IngredientWithSemantics format
    const ingredientsForValidation: IngredientWithSemantics[] = recipe.ingredients.map((ing, idx) => {
      const match = ingredientMatches[idx];
      const uiCategory = match?.uiCategory || resolveCategoryFromUILabel(ing.uiLabel || ing.name);
      const edamamCategory = match?.edamamCategory || 
        (match?.edamamMatch ? resolveCategoryFromEdamamMatch(match.edamamMatch) : null);
      
      return {
        uiLabel: ing.uiLabel || ing.name,
        canonicalKey: ing.name,
        semanticCategory: uiCategory || undefined, // Convert null to undefined
        edamamQuery: formatIngredientForEdamam(ing),
        edamamFoodId: match?.edamamFoodId,
        edamamMatch: match?.edamamMatch,
        edamamResolvedCategory: edamamCategory || undefined, // Convert null to undefined
        quantity: ing.quantity,
        unit: ing.unit,
        brand: ing.brand,
        upc: ing.upc,
      };
    });
    
    semanticValidation = validateRecipeSemanticConsistency(ingredientsForValidation);
    
    if (!semanticValidation.isValid) {
      // BLOCKIRAJ ako nema semantičku konzistentnost
      const errorMsg = generateUserFriendlyError(semanticValidation);
      validationError = errorMsg || undefined; // Convert null to undefined
      console.error("❌ SEMANTIC VALIDATION FAILED:");
      console.error(validationError);
      console.error("Audit trail:", semanticValidation.audit);
      
      // Ne vraćaj makroe ako je validacija neuspješna
      return {
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        auditTrail: {
          recipeId: recipe.id,
          recipeName: recipe.name,
          timestamp: new Date().toISOString(),
          ingredients: ingredientMatches,
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          consistencyCheck: {
            caloriesFromMacros: 0,
            deviationPercent: 0,
            isConsistent: false,
            flag: "NEEDS_REVIEW",
          },
        },
        needsReview: true,
        semanticValidation,
        validationError,
      };
    }
  }

  // Validacija konzistentnosti: kcal_from_macros = p*4 + c*4 + f*9
  const caloriesFromMacros = Math.round(
    totalMacros.protein * 4 + totalMacros.carbs * 4 + totalMacros.fat * 9
  );
  const deviation = Math.abs(totalMacros.calories - caloriesFromMacros);
  const deviationPercent =
    totalMacros.calories > 0
      ? (deviation / totalMacros.calories) * 100
      : 0;
  const isConsistent = deviationPercent <= 7;

  // Audit trail
  const auditTrail: RecipeAuditTrail = {
    recipeId: recipe.id,
    recipeName: recipe.name,
    timestamp: new Date().toISOString(),
    ingredients: ingredientMatches,
    totals: totalMacros,
    consistencyCheck: {
      caloriesFromMacros,
      deviationPercent,
      isConsistent,
      flag: needsUserMapping
        ? "NEEDS_USER_MAPPING"
        : !isConsistent
        ? "DATA_INCONSISTENT"
        : undefined,
    },
  };

  // Ako ima problema, označi kao NEEDS_REVIEW
  const needsReview = needsUserMapping || !isConsistent;

  return {
    macros: totalMacros,
    auditTrail,
    needsReview,
    semanticValidation,
    validationError,
  };
}

// ============================================
// ADAPTER FUNCTIONS - Konverzija iz meal_components.json formata
// ============================================

/**
 * Mapiranje branded proizvoda na Edamam-compatible nazive
 */
/**
 * Mapiranje branded proizvoda na Edamam-compatible nazive
 * Format: "food_key" -> { edamamName: "naziv za edamam", brand: "brend naziv" }
 */
const BRAND_MAPPING: Record<string, { edamamName: string; brand?: string }> = {
  // Rižini krekeri
  "Rice crackers": { edamamName: "rice cakes plain", brand: "Natur bio" },
  "rice_crackers": { edamamName: "rice cakes plain", brand: "Natur bio" },
  
  // Pileći dimcek
  "Smoked chicken breast": { edamamName: "smoked chicken breast", brand: "Cekin" },
  "smoked_chicken_breast": { edamamName: "smoked chicken breast", brand: "Cekin" },
  
  // Tuna
  "Tuna canned": { edamamName: "tuna canned in water", brand: "Eva Podravka" },
  "Tuna": { edamamName: "tuna canned in water", brand: "Eva Podravka" },
  "tuna_canned": { edamamName: "tuna canned in water", brand: "Eva Podravka" },
  
  // Ham - ovisno o displayName, koristi se Prosciutto ili Poultry ham
  // Ovo se razlučuje u convertMealComponentToEdamamIngredient na temelju displayName
  // "Ham" se ne mapira direktno - koristi se displayName za odredivanje
  
  // Dodaj nove branded proizvode ovdje...
};

/**
 * Konvertiraj meal component iz meal_components.json u EdamamIngredient
 */
export function convertMealComponentToEdamamIngredient(
  component: {
    food: string;
    grams: number;
    displayName?: string;
  }
): EdamamIngredient {
  const foodKey = component.food;
  const mapping = BRAND_MAPPING[foodKey];
  
  // UI label je ono što korisnik vidi - koristi displayName ako postoji, inače food
  const uiLabel = component.displayName || component.food;
  
  let name: string;
  let brand: string | undefined;
  
  if (mapping) {
    name = mapping.edamamName;
    brand = mapping.brand;
  } else if (foodKey === "Ham" || foodKey === "ham") {
    // KRITIČNO: "Ham" može biti Prosciutto ILI Poultry ham
    // Razluči na temelju displayName za semantičku konzistentnost
    const displayLower = (component.displayName || "").toLowerCase();
    
    if (displayLower.includes("pršut") || displayLower.includes("prsut") || displayLower.includes("prosciutto")) {
      // Prosciutto / Pršut
      name = "prosciutto";
    } else if (displayLower.includes("pileća šunka") || displayLower.includes("pileca sunka") || displayLower.includes("chicken ham")) {
      // Pileća šunka
      name = "chicken ham";
    } else {
      // Fallback - koristi generic "ham" ali će validacija blokirati ako nije konzistentan
      name = "ham";
      console.warn(`⚠️ "Ham" s displayName "${component.displayName}" - nije jasno Prosciutto ili Poultry ham`);
    }
  } else {
    // Konvertiraj hrvatski naziv u engleski za Edamam
    // Ovo je osnovni fallback - možemo poboljšati kasnije
    name = foodKey.toLowerCase().replace(/\s+/g, " ");
    // Pokušaj prepoznati brand iz displayName
    if (component.displayName) {
      const displayLower = component.displayName.toLowerCase();
      if (displayLower.includes("cekin")) brand = "Cekin";
      if (displayLower.includes("eva")) brand = "Eva Podravka";
      if (displayLower.includes("natur bio")) brand = "Natur bio";
    }
  }
  
  return {
    uiLabel, // Dodaj UI label za semantičku validaciju
    name,
    quantity: component.grams,
    unit: "g",
    brand,
  };
}

/**
 * Konvertiraj meal definition iz meal_components.json u EdamamRecipe
 */
export function convertMealDefinitionToEdamamRecipe(
  mealDef: {
    id: string;
    name: string;
    components: Array<{
      food: string;
      grams: number;
      displayName?: string;
    }>;
  }
): EdamamRecipe {
  return {
    id: mealDef.id,
    name: mealDef.name,
    ingredients: mealDef.components.map(convertMealComponentToEdamamIngredient),
  };
}

// ============================================
// DEBUG PANEL
// ============================================

export interface DebugInfo {
  recipeId: string;
  recipeName: string;
  edamamQueries: Array<{
    ingredient: string;
    queryText: string;
    response: ComputedMacros | null;
    cached: boolean;
  }>;
  totals: ComputedMacros;
  consistencyCheck: RecipeAuditTrail["consistencyCheck"];
  auditTrail: RecipeAuditTrail;
}

/**
 * Generiraj debug informacije za recept
 */
export async function getDebugInfoForRecipe(
  recipe: EdamamRecipe
): Promise<DebugInfo> {
  const queries: DebugInfo["edamamQueries"] = [];
  const result = await computeRecipeMacrosFromEdamam(recipe);

  // Rebuild ingredients from recipe for cache check
  for (const ingredient of recipe.ingredients) {
    const normalized = normalizeIngredientToGrams(ingredient);
    const cacheKey = generateCacheKey({
      ingredientName: ingredient.name,
      quantity: normalized.quantityGrams || ingredient.quantity,
      unit: ingredient.unit,
      brand: ingredient.brand,
      upc: ingredient.upc,
      locale: ingredient.locale,
    });
    const cached = getCachedMacros(cacheKey) !== null;

    const match = result.auditTrail.ingredients.find(
      m => m.ingredientText.includes(ingredient.name)
    );

    queries.push({
      ingredient: ingredient.name,
      queryText: match?.ingredientText || formatIngredientForEdamam(ingredient),
      response: match?.macros || null,
      cached,
    });
  }

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    edamamQueries: queries,
    totals: result.macros,
    consistencyCheck: result.auditTrail.consistencyCheck,
    auditTrail: result.auditTrail,
  };
}

