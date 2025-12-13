/**
 * Edamam Recipe Search API Service
 * 
 * Pretražuje 2.3M+ recepata s fotografijama i nutritivnim podacima
 * Dokumentacija: https://developer.edamam.com/edamam-recipe-api
 */

// ============================================
// TYPES
// ============================================

export interface RecipeNutrients {
  ENERC_KCAL: number;  // Kalorije
  FAT: number;         // Masti
  FASAT: number;       // Zasićene masti
  CHOCDF: number;      // Ugljikohidrati
  FIBTG: number;       // Vlakna
  SUGAR: number;       // Šećeri
  PROCNT: number;      // Proteini
  NA: number;          // Natrij
}

export interface RecipeIngredient {
  text: string;
  quantity: number;
  measure: string;
  food: string;
  weight: number;
  foodCategory: string;
  image: string;
}

export interface Recipe {
  uri: string;
  label: string;
  image: string;
  images: {
    THUMBNAIL: { url: string; width: number; height: number };
    SMALL: { url: string; width: number; height: number };
    REGULAR: { url: string; width: number; height: number };
    LARGE?: { url: string; width: number; height: number };
  };
  source: string;
  url: string;
  yield: number;
  dietLabels: string[];
  healthLabels: string[];
  cautions: string[];
  ingredientLines: string[];
  ingredients: RecipeIngredient[];
  calories: number;
  totalWeight: number;
  totalTime: number;
  cuisineType: string[];
  mealType: string[];
  dishType: string[];
  totalNutrients: Record<string, { label: string; quantity: number; unit: string }>;
  totalDaily: Record<string, { label: string; quantity: number; unit: string }>;
}

export interface RecipeHit {
  recipe: Recipe;
}

export interface RecipeSearchResponse {
  from: number;
  to: number;
  count: number;
  _links: {
    next?: { href: string };
  };
  hits: RecipeHit[];
}

export interface IngredientWithGrams {
  food: string;
  grams: number;
  text: string; // Original text (e.g., "2 tablespoons olive oil")
}

export interface SimplifiedRecipe {
  id: string;
  name: string;
  image: string;
  imageLarge?: string;
  source: string;
  sourceUrl: string;
  servings: number;
  prepTime: number;
  ingredients: string[]; // Original text for display
  ingredientsWithGrams: IngredientWithGrams[]; // Detailed with grams
  totalWeight: number; // Total grams for scaling
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  dietLabels: string[];
  healthLabels: string[];
  mealType: string[];
  cuisineType: string[];
}

export interface RecipeSearchOptions {
  query: string;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Teatime';
  diet?: 'balanced' | 'high-fiber' | 'high-protein' | 'low-carb' | 'low-fat' | 'low-sodium';
  health?: string[];  // e.g., ['gluten-free', 'dairy-free', 'vegetarian']
  cuisineType?: string[];  // e.g., ['Mediterranean', 'Asian']
  calories?: { min?: number; max?: number };
  protein?: { min?: number; max?: number };
  excluded?: string[];  // Isključi namirnice
  random?: boolean;
  limit?: number;
}

// ============================================
// API CONFIGURATION
// ============================================

const EDAMAM_RECIPE_APP_ID = process.env.EDAMAM_RECIPE_APP_ID;
const EDAMAM_RECIPE_APP_KEY = process.env.EDAMAM_RECIPE_APP_KEY;
const EDAMAM_RECIPE_BASE_URL = "https://api.edamam.com/api/recipes/v2";

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractIdFromUri(uri: string): string {
  // URI format: "http://www.edamam.com/ontologies/edamam.owl#recipe_..."
  const match = uri.match(/recipe_([a-f0-9]+)/);
  return match ? match[1] : uri;
}

function simplifyRecipe(hit: RecipeHit): SimplifiedRecipe {
  const r = hit.recipe;
  const servings = r.yield || 1;
  
  // Izračunaj gramaže po porciji
  const ingredientsWithGrams: IngredientWithGrams[] = (r.ingredients || []).map(ing => ({
    food: ing.food,
    grams: Math.round(ing.weight / servings), // Grams per serving
    text: ing.text,
  }));
  
  const totalWeight = Math.round((r.totalWeight || 0) / servings);
  
  return {
    id: extractIdFromUri(r.uri),
    name: r.label,
    image: r.images?.REGULAR?.url || r.image,
    imageLarge: r.images?.LARGE?.url,
    source: r.source,
    sourceUrl: r.url,
    servings,
    prepTime: r.totalTime || 0,
    ingredients: r.ingredientLines,
    ingredientsWithGrams,
    totalWeight,
    // Per serving
    calories: Math.round(r.calories / servings),
    protein: Math.round((r.totalNutrients.PROCNT?.quantity || 0) / servings * 10) / 10,
    carbs: Math.round((r.totalNutrients.CHOCDF?.quantity || 0) / servings * 10) / 10,
    fat: Math.round((r.totalNutrients.FAT?.quantity || 0) / servings * 10) / 10,
    fiber: Math.round((r.totalNutrients.FIBTG?.quantity || 0) / servings * 10) / 10,
    dietLabels: r.dietLabels,
    healthLabels: r.healthLabels,
    mealType: r.mealType || [],
    cuisineType: r.cuisineType || [],
  };
}

// ============================================
// MAIN API FUNCTIONS
// ============================================

/**
 * Pretraži recepte
 */
export async function searchRecipes(options: RecipeSearchOptions): Promise<SimplifiedRecipe[]> {
  if (!EDAMAM_RECIPE_APP_ID || !EDAMAM_RECIPE_APP_KEY) {
    console.error("❌ Edamam Recipe API credentials nisu konfigurirani!");
    return [];
  }

  // Import rate limiter (lazy import da izbjegnemo circular dependency)
  const { edamamRateLimiter } = await import("@/lib/utils/edamamRateLimiter");

  return edamamRateLimiter.execute(async () => {
  try {
    // Build query params
    const params = new URLSearchParams({
      type: 'public',
      app_id: EDAMAM_RECIPE_APP_ID,
      app_key: EDAMAM_RECIPE_APP_KEY,
      q: options.query,
    });

    if (options.mealType) {
      params.append('mealType', options.mealType);
    }

    if (options.diet) {
      params.append('diet', options.diet);
    }

    if (options.health) {
      options.health.forEach(h => params.append('health', h));
    }

    if (options.cuisineType) {
      options.cuisineType.forEach(c => params.append('cuisineType', c));
    }

    if (options.calories) {
      if (options.calories.min !== undefined && options.calories.max !== undefined) {
        params.append('calories', `${options.calories.min}-${options.calories.max}`);
      } else if (options.calories.max !== undefined) {
        params.append('calories', `${options.calories.max}`);
      }
    }

    if (options.excluded) {
      options.excluded.forEach(e => params.append('excluded', e));
    }

    if (options.random) {
      params.append('random', 'true');
    }

    const url = `${EDAMAM_RECIPE_BASE_URL}?${params.toString()}`;
    console.log(`🔍 Recipe Search: ${options.query}`);

    const response = await fetch(url, {
      headers: {
        'Edamam-Account-User': 'corpex-user',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Recipe API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: RecipeSearchResponse = await response.json();
    
    let recipes = data.hits.map(simplifyRecipe);
    
    // Apply protein filter if specified (API doesn't support it directly)
    if (options.protein) {
      recipes = recipes.filter(r => {
        if (options.protein!.min !== undefined && r.protein < options.protein!.min) return false;
        if (options.protein!.max !== undefined && r.protein > options.protein!.max) return false;
        return true;
      });
    }

    // Limit results
    if (options.limit) {
      recipes = recipes.slice(0, options.limit);
    }

    console.log(`✅ Pronađeno ${recipes.length} recepata`);
    return recipes;

  } catch (error) {
    console.error("❌ Recipe Search greška:", error);
    return [];
  }
  });
}

/**
 * Pretraži recepte za određeni obrok s kalorijskim ciljem
 */
export async function searchMealRecipes(
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack',
  targetCalories: number,
  options?: {
    diet?: 'high-protein' | 'low-carb' | 'low-fat' | 'balanced';
    health?: string[];
    excluded?: string[];
    limit?: number;
  }
): Promise<SimplifiedRecipe[]> {
  // Calculate calorie range (±20%)
  const calorieMin = Math.round(targetCalories * 0.8);
  const calorieMax = Math.round(targetCalories * 1.2);

  // Query based on meal type
  const queries: Record<string, string[]> = {
    Breakfast: ['eggs breakfast', 'oatmeal', 'protein breakfast', 'healthy breakfast'],
    Lunch: ['chicken lunch', 'salad protein', 'healthy lunch', 'fish lunch'],
    Dinner: ['dinner protein', 'healthy dinner', 'grilled chicken', 'salmon dinner'],
    Snack: ['protein snack', 'healthy snack', 'nuts fruit', 'yogurt'],
  };

  const queryOptions = queries[mealType];
  const randomQuery = queryOptions[Math.floor(Math.random() * queryOptions.length)];

  return searchRecipes({
    query: randomQuery,
    mealType,
    diet: options?.diet,
    health: options?.health,
    calories: { min: calorieMin, max: calorieMax },
    excluded: options?.excluded,
    random: true,
    limit: options?.limit || 5,
  });
}

/**
 * Generiraj dnevni plan s receptima
 */
export async function generateDayPlan(
  targetCalories: number,
  targetProtein: number,
  options?: {
    diet?: 'high-protein' | 'low-carb' | 'low-fat' | 'balanced';
    health?: string[];
    excluded?: string[];
  }
): Promise<{
  breakfast: SimplifiedRecipe | null;
  lunch: SimplifiedRecipe | null;
  dinner: SimplifiedRecipe | null;
  snacks: SimplifiedRecipe[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
}> {
  // Distribute calories
  const breakfastCal = Math.round(targetCalories * 0.25);  // 25%
  const lunchCal = Math.round(targetCalories * 0.35);      // 35%
  const dinnerCal = Math.round(targetCalories * 0.30);     // 30%
  const snackCal = Math.round(targetCalories * 0.10);      // 10%

  console.log(`\n🍽️ Generiram dnevni plan: ${targetCalories} kcal, ${targetProtein}g proteina`);

  const [breakfastResults, lunchResults, dinnerResults, snackResults] = await Promise.all([
    searchMealRecipes('Breakfast', breakfastCal, options),
    searchMealRecipes('Lunch', lunchCal, options),
    searchMealRecipes('Dinner', dinnerCal, options),
    searchMealRecipes('Snack', snackCal, options),
  ]);

  const breakfast = breakfastResults[0] || null;
  const lunch = lunchResults[0] || null;
  const dinner = dinnerResults[0] || null;
  const snacks = snackResults.slice(0, 2);

  // Calculate totals
  const totals = {
    calories: (breakfast?.calories || 0) + (lunch?.calories || 0) + (dinner?.calories || 0) + snacks.reduce((sum, s) => sum + s.calories, 0),
    protein: (breakfast?.protein || 0) + (lunch?.protein || 0) + (dinner?.protein || 0) + snacks.reduce((sum, s) => sum + s.protein, 0),
    carbs: (breakfast?.carbs || 0) + (lunch?.carbs || 0) + (dinner?.carbs || 0) + snacks.reduce((sum, s) => sum + s.carbs, 0),
    fat: (breakfast?.fat || 0) + (lunch?.fat || 0) + (dinner?.fat || 0) + snacks.reduce((sum, s) => sum + s.fat, 0),
  };

  console.log(`✅ Plan generiran: ${totals.calories} kcal, ${totals.protein}g proteina`);

  return { breakfast, lunch, dinner, snacks, totals };
}

/**
 * Test Recipe API konekcije
 */
export async function testRecipeApi(): Promise<boolean> {
  console.log("🧪 Testiram Recipe Search API...");
  
  const results = await searchRecipes({
    query: "chicken breast",
    mealType: "Lunch",
    diet: "high-protein",
    calories: { min: 300, max: 500 },
    limit: 1,
  });

  if (results.length > 0) {
    console.log("✅ Recipe API radi!");
    console.log(`   Pronađen recept: ${results[0].name}`);
    console.log(`   Slika: ${results[0].image}`);
    console.log(`   Kalorije: ${results[0].calories}, Proteini: ${results[0].protein}g`);
    return true;
  } else {
    console.log("❌ Recipe API nije vratio rezultate!");
    return false;
  }
}

