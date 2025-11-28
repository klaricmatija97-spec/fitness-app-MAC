/**
 * Helper za spremanje i učitavanje korisničkih kalkulacija
 * 
 * Kombinira localStorage (za brzinu) i Supabase (za sinkronizaciju)
 */

export type UserCalculationsLocal = {
  totalCalories: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  bmr?: number;
  tdee?: number;
  goalType?: "lose" | "maintain" | "gain";
  activityLevel?: string;
};

const LS_KEY = "userCalculations";

/**
 * Spremi korisničke kalkulacije u localStorage i Supabase
 */
export async function saveUserCalculationsLocal(calc: UserCalculationsLocal): Promise<void> {
  if (typeof window === "undefined") {
    console.warn("localStorage nije dostupan (server-side)");
    return;
  }

  try {
    console.log("📥 Spremam kalkulacije", calc);
    
    // 1. Spremi u localStorage (za brzinu)
    localStorage.setItem(LS_KEY, JSON.stringify(calc));
    console.log("✅ Spremljeno u localStorage");
    
    // Provjeri da li je stvarno spremljeno
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      console.log("✅ Provjera: Kalkulacije su u localStorage");
    } else {
      console.error("❌ Provjera: Kalkulacije NISU u localStorage nakon spremanja!");
    }

    // 2. Spremi u Supabase (za sinkronizaciju)
    try {
      const userId = localStorage.getItem("clientId") || `temp-${Date.now()}`;
      const response = await fetch("/api/user/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...calc,
        }),
      });

      if (response.ok) {
        console.log("✅ Spremljeno u Supabase");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn("⚠️ Greška pri spremanju u Supabase:", errorData.error || "Nepoznata greška");
        // Ne bacaj grešku - localStorage je spremljeno
      }
    } catch (supabaseError) {
      console.warn("⚠️ Greška pri spremanju u Supabase:", supabaseError);
      // Ne bacaj grešku - localStorage je spremljeno
    }
  } catch (error) {
    console.error("❌ Error saving calculations to localStorage:", error);
    throw new Error("Greška pri spremanju kalkulacija u localStorage");
  }
}

/**
 * Učitaj korisničke kalkulacije iz localStorage
 */
export function loadUserCalculationsLocal(): UserCalculationsLocal | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      console.log("❌ loadUserCalculationsLocal: Nema podataka u localStorage pod key-om:", LS_KEY);
      // Debug: provjeri sve key-ove koji sadrže "calculation" ili "calc"
      if (typeof window !== "undefined") {
        const allKeys = Object.keys(localStorage);
        console.log("📋 Svi localStorage key-ovi:", allKeys);
        const relevantKeys = allKeys.filter(k => 
          k.toLowerCase().includes("calculation") || 
          k.toLowerCase().includes("calc") ||
          k.toLowerCase().includes("calorie")
        );
        if (relevantKeys.length > 0) {
          console.log("📋 Relevantni key-ovi:", relevantKeys);
          relevantKeys.forEach(key => {
            console.log(`📋 ${key}:`, localStorage.getItem(key));
          });
        }
      }
      return null;
    }

    const parsed = JSON.parse(raw);
    console.log("📦 loadUserCalculationsLocal: Parsirani podaci:", parsed);
    console.log("📦 Tipovi:", {
      totalCalories: typeof parsed.totalCalories,
      proteinGrams: typeof parsed.proteinGrams,
      carbGrams: typeof parsed.carbGrams,
      fatGrams: typeof parsed.fatGrams,
    });
    
    // Provjeri da li ima sve potrebne vrijednosti
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
      console.log("✅ loadUserCalculationsLocal: Kalkulacije su valjane");
      return {
        totalCalories: parsed.totalCalories,
        proteinGrams: parsed.proteinGrams,
        carbGrams: parsed.carbGrams,
        fatGrams: parsed.fatGrams,
        bmr: parsed.bmr,
        tdee: parsed.tdee,
        goalType: parsed.goalType,
        activityLevel: parsed.activityLevel,
      };
    }

    console.log("❌ loadUserCalculationsLocal: Kalkulacije nisu valjane");
    console.log("📋 Parsirani podaci:", parsed);
    console.log("📋 Provjera:", {
      hasTotalCalories: typeof parsed.totalCalories === "number" && parsed.totalCalories > 0,
      hasProteinGrams: typeof parsed.proteinGrams === "number" && parsed.proteinGrams > 0,
      hasCarbGrams: typeof parsed.carbGrams === "number" && parsed.carbGrams > 0,
      hasFatGrams: typeof parsed.fatGrams === "number" && parsed.fatGrams > 0,
    });
    return null;
  } catch (error) {
    console.error("❌ Error loading calculations from localStorage:", error);
    return null;
  }
}

/**
 * Obriši kalkulacije iz localStorage
 */
export function clearUserCalculationsLocal(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(LS_KEY);
    console.log("✅ Kalkulacije obrisane iz localStorage");
  } catch (error) {
    console.error("❌ Error clearing calculations from localStorage:", error);
  }
}
