/**
 * EDAMAM REMAP FLOW
 * 
 * Omogućava korisniku da eksplicitno odabere ispravan Edamam match
 * kada semantička validacija ne uspije.
 */

import { SemanticCategory, type IngredientWithSemantics } from "./edamamSemanticValidator";

// ============================================
// TYPES
// ============================================

export interface EdamamSuggestion {
  foodId: string;
  label: string;
  category: SemanticCategory;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface RemapRequest {
  ingredientIndex: number;
  originalIngredient: IngredientWithSemantics;
  suggestedMatches: EdamamSuggestion[];
}

export interface RemapResult {
  ingredientIndex: number;
  originalIngredient: IngredientWithSemantics;
  selectedSuggestion: EdamamSuggestion;
  suggestedMatches?: EdamamSuggestion[];
  remappedIngredient?: IngredientWithSemantics;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generiraj predložene Edamam match-eve na temelju UI labela
 * (Mock implementacija - u stvarnosti bi trebao koristiti Edamam Food Database API)
 */
export function generateEdamamSuggestions(
  uiLabel: string,
  quantity: number,
  unit: string
): EdamamSuggestion[] {
  // Ovo je mock - u stvarnosti bi trebao pozvati Edamam Food Database API
  // i pretraživati po nazivu
  
  const suggestions: EdamamSuggestion[] = [];
  
  const normalized = uiLabel.toLowerCase().trim();
  
  // Prosciutto / Pršut
  if (normalized.includes("pršut") || normalized.includes("prosciutto")) {
    suggestions.push({
      foodId: "food_abc123_prosciutto",
      label: "prosciutto",
      category: SemanticCategory.PROSCIUTTO_CURED_PORK,
      nutrients: {
        calories: 270, // Per 100g
        protein: 26,
        carbs: 1,
        fat: 17,
      },
    });
  }
  
  // Pileća šunka
  if (normalized.includes("pileća šunka") || normalized.includes("chicken ham")) {
    suggestions.push({
      foodId: "food_def456_chicken_ham",
      label: "chicken ham",
      category: SemanticCategory.POULTRY_HAM,
      nutrients: {
        calories: 145, // Per 100g
        protein: 18,
        carbs: 3,
        fat: 6,
      },
    });
  }
  
  // Salama
  if (normalized.includes("salama") || normalized.includes("salami")) {
    suggestions.push({
      foodId: "food_ghi789_salami",
      label: "salami",
      category: SemanticCategory.SALAMI_SAUSAGE,
      nutrients: {
        calories: 336, // Per 100g
        protein: 22,
        carbs: 2,
        fat: 26,
      },
    });
  }
  
  return suggestions;
}

/**
 * Kreiraj remap request za ingredient
 */
export function createRemapRequest(
  ingredient: IngredientWithSemantics,
  ingredientIndex: number
): RemapRequest {
  const suggestions = generateEdamamSuggestions(
    ingredient.uiLabel,
    ingredient.quantity,
    ingredient.unit
  );
  
  return {
    ingredientIndex,
    originalIngredient: ingredient,
    suggestedMatches: suggestions,
  };
}

/**
 * Primijeni remap rezultat na ingredient
 */
export function applyRemap(remapResult: RemapResult): IngredientWithSemantics {
  const { originalIngredient, selectedSuggestion } = remapResult;
  
  return {
    ...originalIngredient,
    edamamFoodId: selectedSuggestion.foodId,
    edamamMatch: selectedSuggestion.label,
    edamamResolvedCategory: selectedSuggestion.category,
    // Osiguraj da se semanticCategory podudara s edamamResolvedCategory
    semanticCategory: selectedSuggestion.category,
  };
}

