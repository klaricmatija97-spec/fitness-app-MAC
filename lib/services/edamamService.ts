/**
 * Edamam Nutrition Analysis API Service
 * 
 * Koristi Edamam API za dobivanje točnih nutritivnih vrijednosti
 * Dokumentacija: https://developer.edamam.com/edamam-nutrition-api
 */

// ============================================
// TYPES
// ============================================

export interface EdamamNutrient {
  label: string;
  quantity: number;
  unit: string;
}

export interface EdamamNutritionResponse {
  uri: string;
  calories: number;
  totalCO2Emissions: number;
  co2EmissionsClass: string;
  totalWeight: number;
  dietLabels: string[];
  healthLabels: string[];
  cautions: string[];
  totalNutrients: {
    ENERC_KCAL: EdamamNutrient; // Kalorije
    FAT: EdamamNutrient;        // Masti
    FASAT: EdamamNutrient;      // Zasićene masti
    FATRN: EdamamNutrient;      // Trans masti
    FAMS: EdamamNutrient;       // Mononezasićene
    FAPU: EdamamNutrient;       // Polinezasićene
    CHOCDF: EdamamNutrient;     // Ugljikohidrati
    "CHOCDF.net": EdamamNutrient; // Neto ugljikohidrati
    FIBTG: EdamamNutrient;      // Vlakna
    SUGAR: EdamamNutrient;      // Šećeri
    PROCNT: EdamamNutrient;     // Proteini
    CHOLE: EdamamNutrient;      // Kolesterol
    NA: EdamamNutrient;         // Natrij
    CA: EdamamNutrient;         // Kalcij
    MG: EdamamNutrient;         // Magnezij
    K: EdamamNutrient;          // Kalij
    FE: EdamamNutrient;         // Željezo
    ZN: EdamamNutrient;         // Cink
    P: EdamamNutrient;          // Fosfor
    VITA_RAE: EdamamNutrient;   // Vitamin A
    VITC: EdamamNutrient;       // Vitamin C
    THIA: EdamamNutrient;       // Vitamin B1
    RIBF: EdamamNutrient;       // Vitamin B2
    NIA: EdamamNutrient;        // Vitamin B3
    VITB6A: EdamamNutrient;     // Vitamin B6
    FOLDFE: EdamamNutrient;     // Folat
    VITB12: EdamamNutrient;     // Vitamin B12
    VITD: EdamamNutrient;       // Vitamin D
    TOCPHA: EdamamNutrient;     // Vitamin E
    VITK1: EdamamNutrient;      // Vitamin K
    WATER: EdamamNutrient;      // Voda
    [key: string]: EdamamNutrient;
  };
  totalDaily: {
    [key: string]: EdamamNutrient;
  };
  ingredients: Array<{
    text: string;
    parsed: Array<{
      quantity: number;
      measure: string;
      food: string;
      foodId: string;
      weight: number;
      nutrients: {
        ENERC_KCAL: EdamamNutrient;
        PROCNT: EdamamNutrient;
        FAT: EdamamNutrient;
        CHOCDF: EdamamNutrient;
        FIBTG: EdamamNutrient;
      };
    }>;
  }>;
}

export interface SimplifiedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
  // Mikronutrijenti
  vitaminA: number;
  vitaminC: number;
  vitaminD: number;
  vitaminB12: number;
  calcium: number;
  iron: number;
  potassium: number;
  magnesium: number;
}

export interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
}

// ============================================
// API CONFIGURATION
// ============================================

const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;
const EDAMAM_BASE_URL = "https://api.edamam.com/api/nutrition-details";

// ============================================
// HELPER FUNCTIONS
// ============================================

function getValueSafe(nutrient: EdamamNutrient | undefined): number {
  return nutrient?.quantity ?? 0;
}

/**
 * Formatira sastojke u format koji Edamam očekuje
 */
function formatIngredients(ingredients: IngredientInput[]): string[] {
  return ingredients.map(ing => `${ing.quantity} ${ing.unit} ${ing.name}`);
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Analiziraj nutritivne vrijednosti za listu sastojaka
 * 
 * @param ingredients - Lista sastojaka s količinama
 * @param title - Naziv jela (opcionalno)
 * @returns Nutritivne vrijednosti
 */
export async function analyzeNutrition(
  ingredients: IngredientInput[],
  title?: string
): Promise<SimplifiedNutrition | null> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    console.error("❌ Edamam API credentials nisu konfigurirani!");
    return null;
  }

  // Import rate limiter i cost controller (lazy import da izbjegnemo circular dependency)
  const { edamamRateLimiter } = await import("@/lib/utils/edamamRateLimiter");
  const { edamamCostController } = await import("@/lib/utils/edamamCostController");

  // Provjeri da li možemo napraviti poziv bez prekoračenja troškova
  const costCheck = edamamCostController.canMakeRequest();
  if (!costCheck.allowed) {
    console.warn(`⚠️ Edamam poziv blokiran: ${costCheck.reason}`);
    console.warn(`   Trenutni trošak: ${costCheck.currentCost.toFixed(2)}€`);
    return null; // Vrati null umjesto bacanja greške
  }

  return edamamRateLimiter.execute(async () => {
  try {
    const ingredientLines = formatIngredients(ingredients);
    
    console.log(`🔍 Edamam analiza: ${title || "Jelo"}`);
    console.log(`   Sastojci: ${ingredientLines.join(", ")}`);

    const response = await fetch(
      `${EDAMAM_BASE_URL}?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title || "Meal",
          ingr: ingredientLines,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Edamam API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data: EdamamNutritionResponse = await response.json();

    const nutrition: SimplifiedNutrition = {
      calories: Math.round(getValueSafe(data.totalNutrients.ENERC_KCAL)),
      protein: Math.round(getValueSafe(data.totalNutrients.PROCNT) * 10) / 10,
      carbs: Math.round(getValueSafe(data.totalNutrients.CHOCDF) * 10) / 10,
      fat: Math.round(getValueSafe(data.totalNutrients.FAT) * 10) / 10,
      fiber: Math.round(getValueSafe(data.totalNutrients.FIBTG) * 10) / 10,
      sugar: Math.round(getValueSafe(data.totalNutrients.SUGAR) * 10) / 10,
      sodium: Math.round(getValueSafe(data.totalNutrients.NA)),
      saturatedFat: Math.round(getValueSafe(data.totalNutrients.FASAT) * 10) / 10,
      // Mikronutrijenti
      vitaminA: Math.round(getValueSafe(data.totalNutrients.VITA_RAE)),
      vitaminC: Math.round(getValueSafe(data.totalNutrients.VITC)),
      vitaminD: Math.round(getValueSafe(data.totalNutrients.VITD) * 10) / 10,
      vitaminB12: Math.round(getValueSafe(data.totalNutrients.VITB12) * 10) / 10,
      calcium: Math.round(getValueSafe(data.totalNutrients.CA)),
      iron: Math.round(getValueSafe(data.totalNutrients.FE) * 10) / 10,
      potassium: Math.round(getValueSafe(data.totalNutrients.K)),
      magnesium: Math.round(getValueSafe(data.totalNutrients.MG)),
    };

    console.log(`✅ Edamam rezultat: ${nutrition.calories} kcal, P: ${nutrition.protein}g, C: ${nutrition.carbs}g, F: ${nutrition.fat}g`);

    // Registriraj poziv i ažuriraj troškove
    edamamCostController.recordRequest();
    
    // Logiraj trenutni status svakih 100 poziva
    const status = edamamCostController.getStatus();
    if (status.totalRequests % 100 === 0) {
      console.log(`📊 Edamam status: ${status.totalRequests} poziva, ${status.currentCost.toFixed(2)}€/${status.maxMonthlyCost}€`);
    }

    return nutrition;

  } catch (error) {
    console.error("❌ Edamam API greška:", error);
    return null;
  }
  });
}

/**
 * Analiziraj nutritivne vrijednosti iz teksta sastojaka
 * 
 * @param ingredientText - Tekst sastojaka (svaki u novom redu ili odvojen zarezom)
 * @param title - Naziv jela
 * @returns Nutritivne vrijednosti
 */
export async function analyzeNutritionFromText(
  ingredientText: string,
  title?: string
): Promise<SimplifiedNutrition | null> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    console.error("❌ Edamam API credentials nisu konfigurirani!");
    return null;
  }

  // Import rate limiter i cost controller (lazy import da izbjegnemo circular dependency)
  const { edamamRateLimiter } = await import("@/lib/utils/edamamRateLimiter");
  const { edamamCostController } = await import("@/lib/utils/edamamCostController");

  // Provjeri da li možemo napraviti poziv bez prekoračenja troškova
  const costCheck = edamamCostController.canMakeRequest();
  if (!costCheck.allowed) {
    console.warn(`⚠️ Edamam poziv blokiran: ${costCheck.reason}`);
    console.warn(`   Trenutni trošak: ${costCheck.currentCost.toFixed(2)}€`);
    return null; // Vrati null umjesto bacanja greške
  }

  return edamamRateLimiter.execute(async () => {
  try {
    // Parsiraj tekst u linije
    const lines = ingredientText
      .split(/[\n,]/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    console.log(`🔍 Edamam analiza (tekst): ${title || "Jelo"}`);
    console.log(`   Sastojci: ${lines.length} stavki`);

    const response = await fetch(
      `${EDAMAM_BASE_URL}?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title || "Meal",
          ingr: lines,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Edamam API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data: EdamamNutritionResponse = await response.json();

    const nutrition: SimplifiedNutrition = {
      calories: Math.round(getValueSafe(data.totalNutrients.ENERC_KCAL)),
      protein: Math.round(getValueSafe(data.totalNutrients.PROCNT) * 10) / 10,
      carbs: Math.round(getValueSafe(data.totalNutrients.CHOCDF) * 10) / 10,
      fat: Math.round(getValueSafe(data.totalNutrients.FAT) * 10) / 10,
      fiber: Math.round(getValueSafe(data.totalNutrients.FIBTG) * 10) / 10,
      sugar: Math.round(getValueSafe(data.totalNutrients.SUGAR) * 10) / 10,
      sodium: Math.round(getValueSafe(data.totalNutrients.NA)),
      saturatedFat: Math.round(getValueSafe(data.totalNutrients.FASAT) * 10) / 10,
      vitaminA: Math.round(getValueSafe(data.totalNutrients.VITA_RAE)),
      vitaminC: Math.round(getValueSafe(data.totalNutrients.VITC)),
      vitaminD: Math.round(getValueSafe(data.totalNutrients.VITD) * 10) / 10,
      vitaminB12: Math.round(getValueSafe(data.totalNutrients.VITB12) * 10) / 10,
      calcium: Math.round(getValueSafe(data.totalNutrients.CA)),
      iron: Math.round(getValueSafe(data.totalNutrients.FE) * 10) / 10,
      potassium: Math.round(getValueSafe(data.totalNutrients.K)),
      magnesium: Math.round(getValueSafe(data.totalNutrients.MG)),
    };

    console.log(`✅ Edamam rezultat: ${nutrition.calories} kcal, P: ${nutrition.protein}g, C: ${nutrition.carbs}g, F: ${nutrition.fat}g`);

    // Registriraj poziv i ažuriraj troškove
    edamamCostController.recordRequest();
    
    // Logiraj trenutni status svakih 100 poziva
    const status = edamamCostController.getStatus();
    if (status.totalRequests % 100 === 0) {
      console.log(`📊 Edamam status: ${status.totalRequests} poziva, ${status.currentCost.toFixed(2)}€/${status.maxMonthlyCost}€`);
    }

    return nutrition;

  } catch (error) {
    console.error("❌ Edamam API greška:", error);
    return null;
  }
  });
}

/**
 * Testiraj Edamam API konekciju
 */
export async function testEdamamConnection(): Promise<boolean> {
  console.log("🧪 Testiram Edamam API...");
  
  const result = await analyzeNutritionFromText(
    "100g chicken breast, 150g rice, 100g broccoli",
    "Test Meal"
  );

  if (result) {
    console.log("✅ Edamam API radi!");
    console.log(`   Test rezultat: ${result.calories} kcal`);
    return true;
  } else {
    console.log("❌ Edamam API ne radi!");
    return false;
  }
}

