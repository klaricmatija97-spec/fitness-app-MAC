/**
 * Load User Calculations Utility
 * 
 * Pouzdano učitavanje korisničkih kalkulacija iz različitih izvora:
 * 1. localStorage (key: "userCalculations")
 * 2. Supabase (client_calculations table)
 * 3. Ako ne postoji ni jedno → vrati user-friendly poruku
 */

import { createServiceClient } from "../supabase";

export interface UserCalculations {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  bmr?: number;
  tdee?: number;
  goalType?: "lose" | "maintain" | "gain";
  activityLevel?: string;
}

export interface LoadCalculationsResult {
  success: boolean;
  calculations?: UserCalculations;
  error?: string;
}

/**
 * Učitaj kalkulacije iz localStorage
 */
function loadFromLocalStorage(clientId: string): UserCalculations | null {
  if (typeof window === "undefined") return null; // Server-side rendering

  try {
    // Pokušaj učitati iz localStorage sa key "userCalculations"
    const stored = localStorage.getItem("userCalculations");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Provjeri da li su kalkulacije za ovog korisnika
      if (parsed.clientId === clientId && parsed.calculations) {
        const calc = parsed.calculations;
        return {
          targetCalories: calc.targetCalories || calc.target_calories,
          targetProtein: calc.macros?.protein || calc.protein_grams || calc.targetProtein,
          targetCarbs: calc.macros?.carbs || calc.carbs_grams || calc.targetCarbs,
          targetFats: calc.macros?.fats || calc.fats_grams || calc.targetFats,
          bmr: calc.bmr,
          tdee: calc.tdee,
          goalType: calc.goalType || calc.goal_type,
          activityLevel: calc.activityLevel || calc.activity_level,
        };
      }
    }

    // Pokušaj učitati iz userData (ako postoji u localStorage)
    const userDataStr = localStorage.getItem(`userData_${clientId}`);
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.calculations) {
        const calc = userData.calculations;
        return {
          targetCalories: calc.targetCalories || calc.target_calories,
          targetProtein: calc.macros?.protein || calc.protein_grams || calc.targetProtein,
          targetCarbs: calc.macros?.carbs || calc.carbs_grams || calc.targetCarbs,
          targetFats: calc.macros?.fats || calc.fats_grams || calc.targetFats,
          bmr: calc.bmr,
          tdee: calc.tdee,
          goalType: calc.goalType || calc.goal_type,
          activityLevel: calc.activityLevel || calc.activity_level,
        };
      }
    }
  } catch (error) {
    console.warn("Error loading calculations from localStorage:", error);
  }

  return null;
}

/**
 * Učitaj kalkulacije iz lokalnog JSON fajla (server-side only)
 */
async function loadFromLocalFile(clientId: string): Promise<UserCalculations | null> {
  // Provjeri da li smo na server-side
  if (typeof window !== "undefined") {
    return null; // Ne pokušavaj na client-side
  }

  try {
    // Dinamički import samo na server-side
    const { getUserData } = await import("../data/userData");
    const userData = getUserData(clientId);
    if (userData?.calculations) {
      const calc = userData.calculations;
      return {
        targetCalories: calc.targetCalories,
        targetProtein: calc.macros.protein,
        targetCarbs: calc.macros.carbs,
        targetFats: calc.macros.fats,
        bmr: calc.bmr,
        tdee: calc.tdee,
        goalType: calc.goalType,
        activityLevel: calc.activityLevel,
      };
    }
  } catch (error) {
    console.warn("Error loading calculations from local file:", error);
  }

  return null;
}

/**
 * Učitaj kalkulacije iz Supabase
 */
async function loadFromSupabase(clientId: string): Promise<UserCalculations | null> {
  try {
    // createServiceClient koristi process.env koji je dostupan samo na server-side
    // Na client-side, koristimo API endpoint umjesto direktnog pristupa
    if (typeof window !== "undefined") {
      // Client-side: koristi API endpoint
      try {
        const response = await fetch(`/api/calculations/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.bmr) {
            return {
              targetCalories: parseFloat(data.target_calories || data.targetCalories) || 0,
              targetProtein: parseFloat(data.protein_grams || data.macros?.protein) || 0,
              targetCarbs: parseFloat(data.carbs_grams || data.macros?.carbs) || 0,
              targetFats: parseFloat(data.fats_grams || data.macros?.fats) || 0,
              bmr: parseFloat(data.bmr),
              tdee: parseFloat(data.tdee),
              goalType: data.goal_type || data.goalType,
              activityLevel: data.activity_level || data.activityLevel,
            };
          }
        }
      } catch (apiError) {
        console.warn("Error loading calculations from API:", apiError);
      }
      return null;
    }

    // Server-side: koristi direktan Supabase pristup
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Nema zapisa
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return {
      targetCalories: parseFloat(data.target_calories) || 0,
      targetProtein: parseFloat(data.protein_grams) || 0,
      targetCarbs: parseFloat(data.carbs_grams) || 0,
      targetFats: parseFloat(data.fats_grams) || 0,
      bmr: parseFloat(data.bmr),
      tdee: parseFloat(data.tdee),
      goalType: data.goal_type as "lose" | "maintain" | "gain",
      activityLevel: data.activity_level,
    };
  } catch (error) {
    console.warn("Error loading calculations from Supabase:", error);
    return null;
  }
}

/**
 * Validiraj kalkulacije - provjeri da li su sve potrebne vrijednosti prisutne
 */
function validateCalculations(calc: UserCalculations | null): boolean {
  if (!calc) return false;

  return (
    typeof calc.targetCalories === "number" &&
    calc.targetCalories > 0 &&
    typeof calc.targetProtein === "number" &&
    calc.targetProtein > 0 &&
    typeof calc.targetCarbs === "number" &&
    calc.targetCarbs > 0 &&
    typeof calc.targetFats === "number" &&
    calc.targetFats > 0
  );
}

/**
 * Glavna funkcija za učitavanje kalkulacija
 * 
 * @param clientId - UUID korisnika
 * @param isServerSide - Da li se poziva sa servera (true) ili klijenta (false)
 * @returns LoadCalculationsResult sa kalkulacijama ili porukom o grešci
 */
export async function loadUserCalculations(
  clientId: string,
  isServerSide: boolean = false
): Promise<LoadCalculationsResult> {
  if (!clientId) {
    return {
      success: false,
      error: "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
    };
  }

  let calculations: UserCalculations | null = null;

  // 1. Pokušaj učitati iz localStorage (samo client-side)
  if (!isServerSide) {
    calculations = loadFromLocalStorage(clientId);
    if (validateCalculations(calculations)) {
      console.log("✅ Kalkulacije učitane iz localStorage");
      return { success: true, calculations: calculations ?? undefined };
    }
  }

  // 2. Pokušaj učitati iz lokalnog JSON fajla (samo server-side)
  if (isServerSide && typeof window === "undefined") {
    calculations = await loadFromLocalFile(clientId);
    if (validateCalculations(calculations)) {
      console.log("✅ Kalkulacije učitane iz lokalnog fajla");
      return { success: true, calculations: calculations ?? undefined };
    }
  }

  // 3. Pokušaj učitati iz Supabase
  calculations = await loadFromSupabase(clientId);
  if (!calculations) {
    // Ako nema kalkulacija, vrati grešku
    return {
      success: false,
      error: "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
    };
  }
  
  if (!validateCalculations(calculations)) {
    // Ako kalkulacije nisu valjane, vrati grešku
    return {
      success: false,
      error: "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
    };
  }
  
  // Sigurno nastavi - calculations je sada garantovano UserCalculations (ne null)
  console.log("✅ Kalkulacije učitane iz Supabase");
  
  // Spremi u localStorage za buduću upotrebu (samo client-side)
  if (!isServerSide && typeof window !== "undefined") {
    try {
      localStorage.setItem(
        "userCalculations",
        JSON.stringify({
          clientId,
          calculations: {
            targetCalories: calculations.targetCalories,
            targetProtein: calculations.targetProtein,
            targetCarbs: calculations.targetCarbs,
            targetFats: calculations.targetFats,
            bmr: calculations.bmr,
            tdee: calculations.tdee,
            goalType: calculations.goalType,
            activityLevel: calculations.activityLevel,
          },
        })
      );
    } catch (error) {
      console.warn("Error saving calculations to localStorage:", error);
    }
  }
  
  return { success: true, calculations };

  // 4. Ako ništa ne postoji, vrati poruku
  return {
    success: false,
    error: "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
  };
}

