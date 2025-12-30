/**
 * MEAL VALIDATION HELPERS
 * 
 * Helper funkcije za provjeru da li su makroi "trusted" i za prikaz statusa u UI-u.
 */

import type { RecipeVersion, DataQualityStatus } from "@/lib/db/models";

// ============================================
// TYPES
// ============================================

export interface MealWithQuality {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  version?: RecipeVersion;
  data_quality_status?: DataQualityStatus;
  data_quality_errors?: string[];
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Provjeri da li su makroi "trusted" (version 2 + VERIFIED)
 */
export function areMacrosTrusted(meal: MealWithQuality): boolean {
  // Ako nema version ili status, smatraj legacy (not trusted)
  if (!meal.version || meal.version === 1) {
    return false;
  }
  
  // Ako je version 2, provjeri status
  if (meal.version === 2) {
    return meal.data_quality_status === "VERIFIED";
  }
  
  return false;
}

/**
 * Provjeri da li jelo treba remap
 */
export function needsRemap(meal: MealWithQuality): boolean {
  if (!meal.data_quality_status) {
    return false;
  }
  
  return meal.data_quality_status === "NEEDS_REMAP" || 
         meal.data_quality_status === "INVALID_MAPPING";
}

/**
 * Provjeri da li jelo treba review
 */
export function needsReview(meal: MealWithQuality): boolean {
  return meal.data_quality_status === "NEEDS_REVIEW";
}

/**
 * Generiraj poruku statusa za UI
 */
export function getQualityStatusMessage(meal: MealWithQuality): {
  message: string;
  severity: "info" | "warning" | "error";
  showBanner: boolean;
} {
  // Legacy (version 1 ili nema version)
  if (!meal.version || meal.version === 1) {
    return {
      message: "Ovo jelo koristi stare makronutrijente. Re-verify s Edamam-om za točne vrijednosti.",
      severity: "warning",
      showBanner: true,
    };
  }
  
  // Version 2 s različitim statusima
  switch (meal.data_quality_status) {
    case "VERIFIED":
      return {
        message: "Makronutrijenti su verificirani preko Edamam-a.",
        severity: "info",
        showBanner: false,
      };
      
    case "NEEDS_REVIEW":
      return {
        message: "Jelo zahtijeva ručnu provjeru. Makronutrijenti mogu biti netočni.",
        severity: "warning",
        showBanner: true,
      };
      
    case "INVALID_MAPPING":
      return {
        message: "Detektirano nekonzistentno mapiranje sastojaka. Makronutrijenti su blokirani dok se ne popravi.",
        severity: "error",
        showBanner: true,
      };
      
    case "NEEDS_REMAP":
      return {
        message: "Jelo zahtijeva remap sastojaka. Makronutrijenti mogu biti netočni.",
        severity: "warning",
        showBanner: true,
      };
      
    default:
      return {
        message: "Status kvalitete podataka nije poznat.",
        severity: "warning",
        showBanner: true,
      };
  }
}

/**
 * Provjeri da li jelo može prikazati makroe
 */
export function canShowMacros(meal: MealWithQuality): boolean {
  // Ako je INVALID_MAPPING, ne prikazuj makroe
  if (meal.data_quality_status === "INVALID_MAPPING") {
    return false;
  }
  
  // Inače, prikaži (ali s banner-om ako nije VERIFIED)
  return true;
}

/**
 * Provjeri da li jelo ima greške
 */
export function hasErrors(meal: MealWithQuality): boolean {
  return (meal.data_quality_errors && meal.data_quality_errors.length > 0) ||
         meal.data_quality_status === "INVALID_MAPPING";
}















