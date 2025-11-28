/**
 * Client helper za spremanje i učitavanje korisničkih kalkulacija
 * 
 * Kombinira localStorage (za brzinu) i API poziv (za sinkronizaciju)
 */

import type { UserCalculationsClient } from "../types/userCalculations";

const LS_KEY = "userCalculations";

/**
 * Spremi korisničke kalkulacije (samo localStorage - bez Supabase)
 */
export async function saveUserCalculationsClient(
  userId: string,
  calc: UserCalculationsClient
): Promise<void> {
  // Spremi u localStorage
  if (typeof window !== "undefined") {
    try {
      const dataToSave = {
        userId,
        ...calc,
      };
      console.log("💾 Spremam kalkulacije u localStorage:", dataToSave);
      localStorage.setItem(LS_KEY, JSON.stringify(dataToSave));
      console.log("✅ Kalkulacije spremljene u localStorage");
      
      // Provjeri da li je stvarno spremljeno
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        console.log("✅ Provjera: Kalkulacije su u localStorage");
      } else {
        console.error("❌ Provjera: Kalkulacije NISU u localStorage nakon spremanja!");
      }
    } catch (error) {
      console.error("❌ Error saving calculations to localStorage:", error);
      throw new Error("Greška pri spremanju kalkulacija u localStorage");
    }
  } else {
    throw new Error("localStorage nije dostupan (server-side)");
  }
}

/**
 * Učitaj korisničke kalkulacije iz localStorage
 * Podržava i novi format (totalCalories, proteinGrams, etc.) i stari format (calculations object)
 */
export function loadUserCalculationsFromLocalStorage(): (UserCalculationsClient & { userId?: string }) | null {
  if (typeof window === "undefined") {
    console.log("❌ loadUserCalculationsFromLocalStorage: window nije dostupan (server-side)");
    return null;
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      console.log("❌ loadUserCalculationsFromLocalStorage: Nema podataka u localStorage");
      return null;
    }

    const parsed = JSON.parse(raw);
    console.log("📦 loadUserCalculationsFromLocalStorage: Parsirani podaci:", parsed);
    
    // Novi format: direktno u root objektu
    if (
      typeof parsed.totalCalories === "number" &&
      typeof parsed.proteinGrams === "number" &&
      typeof parsed.carbGrams === "number" &&
      typeof parsed.fatGrams === "number" &&
      parsed.totalCalories > 0 &&
      parsed.proteinGrams > 0 &&
      parsed.carbGrams > 0 &&
      parsed.fatGrams > 0
    ) {
      console.log("✅ loadUserCalculationsFromLocalStorage: Novi format pronađen");
      return parsed as UserCalculationsClient & { userId?: string };
    }

    // Stari format: u calculations objektu
    if (parsed.calculations) {
      console.log("📦 loadUserCalculationsFromLocalStorage: Stari format pronađen");
      const calc = parsed.calculations;
      const totalCal = calc.targetCalories || calc.totalCalories;
      const protein = calc.macros?.protein || calc.targetProtein || calc.proteinGrams;
      const carbs = calc.macros?.carbs || calc.targetCarbs || calc.carbGrams;
      const fats = calc.macros?.fats || calc.targetFats || calc.fatGrams;
      
      if (
        totalCal && totalCal > 0 &&
        protein && protein > 0 &&
        carbs && carbs > 0 &&
        fats && fats > 0
      ) {
        const result = {
          userId: parsed.clientId || parsed.userId,
          totalCalories: totalCal,
          proteinGrams: protein,
          carbGrams: carbs,
          fatGrams: fats,
          bmr: calc.bmr,
          tdee: calc.tdee,
          goalType: calc.goalType || calc.goal_type,
          activityLevel: calc.activityLevel || calc.activity_level,
        };
        console.log("✅ loadUserCalculationsFromLocalStorage: Stari format konvertiran:", result);
        return result;
      } else {
        console.log("❌ loadUserCalculationsFromLocalStorage: Stari format nije valjan");
      }
    }

    console.log("❌ loadUserCalculationsFromLocalStorage: Nema valjanog formata");
    return null;
  } catch (error) {
    console.error("❌ Error loading calculations from localStorage:", error);
    return null;
  }
}

/**
 * Učitaj korisničke kalkulacije iz API-ja (fallback - bez Supabase)
 * Za sada vraća null jer ne koristimo Supabase
 */
export async function loadUserCalculationsFromAPI(
  userId: string
): Promise<UserCalculationsClient | null> {
  // Supabase nije dostupan, vraćamo null
  // Kalkulacije se učitavaju samo iz localStorage
  return null;
}

/**
 * Provjeri da li korisnik ima spremljene kalkulacije
 * (samo localStorage - bez Supabase)
 */
export async function hasUserCalculations(userId: string | null): Promise<boolean> {
  if (!userId) {
    console.log("❌ hasUserCalculations: userId je null");
    return false;
  }

  // Provjeri samo localStorage (Supabase nije dostupan)
  const localCalc = loadUserCalculationsFromLocalStorage();
  
  if (!localCalc) {
    console.log("❌ hasUserCalculations: Nema kalkulacija u localStorage");
    return false;
  }

  // Provjeri da li se userId podudara (ili ako nema userId u kalkulacijama, prihvati ih)
  const calcUserId = localCalc.userId;
  if (calcUserId && calcUserId !== userId) {
    console.log(`❌ hasUserCalculations: userId se ne podudara. Traženi: ${userId}, Pronađen: ${calcUserId}`);
    return false;
  }

  // Provjeri da li su sve potrebne vrijednosti prisutne
  if (
    localCalc.totalCalories > 0 &&
    localCalc.proteinGrams > 0 &&
    localCalc.carbGrams > 0 &&
    localCalc.fatGrams > 0
  ) {
    console.log("✅ hasUserCalculations: Kalkulacije su pronađene i valjane");
    return true;
  }

  console.log("❌ hasUserCalculations: Kalkulacije postoje ali nisu valjane");
  return false;
}

