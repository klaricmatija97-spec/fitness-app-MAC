/**
 * TypeScript Modeli za Supabase Tablice
 * 
 * Interface-i i type-ovi za foods, recipes, recipe_ingredients i workout_exercises tablice
 */

// ============================================
// FOODS - Namirnice
// ============================================

export interface Food {
  id: string; // UUID
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string;
  tags: string[]; // JSONB array pretvoren u string[]
  allergens: string | null;
  usda_fdc_id: number | null; // Novi field - USDA FDC ID
  is_usda: boolean; // Novi field - označava da li je iz USDA baze
  default_serving_size_g: number; // Novi field - zadana veličina porcije u gramima
  mealSlot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'extraSnack'; // Novi field - slot obroka
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type FoodCategory = 
  | "povrće"
  | "voće"
  | "meso"
  | "morski plodovi"
  | "mliječni proizvodi"
  | "jaja"
  | "žitarice"
  | "orašasti plodovi"
  | "sjemenke"
  | "ulja"
  | "začini"
  | "ostalo";

export type FoodInsert = Omit<Food, "id" | "created_at" | "updated_at">;
export type FoodUpdate = Partial<Omit<Food, "id" | "created_at" | "updated_at">>;

// ============================================
// RECIPES - Recepti
// ============================================

export type RecipeVersion = 1 | 2; // 1 = legacy, 2 = edamam+semantic verified
export type DataQualityStatus = 
  | "VERIFIED"           // Edamam verified + semantic consistent
  | "NEEDS_REVIEW"       // Needs manual review
  | "INVALID_MAPPING"    // Semantic mismatch detected
  | "NEEDS_REMAP";       // Ingredients need remapping

export interface Recipe {
  id: string; // UUID
  name: string;
  description: string | null;
  tags: string[]; // JSONB array pretvoren u string[]
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  cooking_time_min: number | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null; // Novi field
  cuisine: string | null; // Novi field
  prep_time_minutes: number | null; // Novi field
  difficulty: string | null; // Novi field
  goal_tags: string[]; // Novi field - JSONB array pretvoren u string[]
  diet_tags: string[]; // Novi field - JSONB array pretvoren u string[]
  health_score: number | null; // Novi field (0-100)
  // Data Quality Fields
  version?: RecipeVersion; // 1 = legacy, 2 = edamam+semantic verified (default: 1 for legacy)
  data_quality_status?: DataQualityStatus; // Status validacije (default: null for legacy)
  data_quality_errors?: string[]; // Array of error messages (JSONB)
  edamam_audit_trail?: any; // Full Edamam audit trail (JSONB)
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type RecipeTag = 
  | "doručak"
  | "ručak"
  | "večera"
  | "užina"
  | "gluten-free"
  | "vegetarian"
  | "vegan"
  | "high-protein"
  | "low-carb"
  | "quick"
  | "meal-prep"
  | "ostalo";

export type RecipeInsert = Omit<Recipe, "id" | "created_at" | "updated_at">;
export type RecipeUpdate = Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>;

// ============================================
// RECIPE_INGREDIENTS - Sastojci recepata
// ============================================

export interface RecipeIngredient {
  id: string; // UUID
  recipe_id: string; // UUID - FK → recipes(id)
  food_id: string; // UUID - FK → foods(id)
  grams: number;
  created_at: string; // ISO timestamp
}

// Extended interface sa informacijama o namirnici
export interface RecipeIngredientWithFood extends RecipeIngredient {
  food: Food;
}

export type RecipeIngredientInsert = Omit<RecipeIngredient, "id" | "created_at">;
export type RecipeIngredientUpdate = Partial<Omit<RecipeIngredient, "id" | "created_at">>;

// ============================================
// WORKOUT_EXERCISES - Vježbe
// ============================================

export interface WorkoutExercise {
  id: string; // UUID
  name: string;
  muscle_group: string;
  equipment: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  instructions: string | null;
  video_url: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type MuscleGroup = 
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "biceps"
  | "triceps"
  | "legs"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "abs"
  | "cardio"
  | "full-body";

export type Equipment = 
  | "bodyweight"
  | "dumbbells"
  | "barbell"
  | "kettlebell"
  | "cable"
  | "machine"
  | "resistance-bands"
  | "medicine-ball"
  | "trx"
  | "none"
  | "other";

export type ExerciseLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type WorkoutExerciseInsert = Omit<WorkoutExercise, "id" | "created_at" | "updated_at">;
export type WorkoutExerciseUpdate = Partial<Omit<WorkoutExercise, "id" | "created_at" | "updated_at">>;

// ============================================
// HELPER TYPES
// ============================================

// Recipe sa sastojcima
export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredientWithFood[];
}

// Workout exercise sa filterima
export interface ExerciseFilters {
  muscle_group?: MuscleGroup | MuscleGroup[];
  equipment?: Equipment | Equipment[];
  level?: ExerciseLevel | ExerciseLevel[];
}

// ============================================
// PRO MEAL PLAN GENERATOR - Tipovi
// ============================================

/**
 * MealSlot - Definiše slot za obrok (doručak, ručak, večera, snack)
 */
export interface MealSlot {
  id: string; // "breakfast", "lunch", "dinner", "snack"
  name: string; // "Doručak", "Ručak", "Večera", "Užina"
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

/**
 * MealCandidate - Kandidat za obrok (recept ili namirnica)
 */
export interface MealCandidate {
  id: string; // recipe_id ili food_id
  type: "recipe" | "food";
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meta: {
    recipe?: Recipe; // Ako je type === "recipe"
    food?: Food; // Ako je type === "food"
    quantity?: number; // Količina (grami za food, portion size za recipe)
    cuisine?: string | null;
    prepTime?: number | null;
    difficulty?: string | null;
    healthScore?: number | null;
    tags?: string[];
    goalTags?: string[];
    dietTags?: string[];
  };
}

/**
 * ScoredMeal - MealCandidate sa score-om
 */
export interface ScoredMeal extends MealCandidate {
  score: number; // Ukupni score (viša vrijednost = bolje)
  scoreBreakdown: {
    calorieMatch: number; // 0-1, koliko se kalorije poklapaju
    macroMatch: number; // 0-1, koliko se makronutrijenti poklapaju
    healthBonus: number; // 0-1, bonus za health score
    varietyPenalty: number; // 0-1, penalty za ponavljanje istih sastojaka
    total: number; // Ukupni score
  };
}
