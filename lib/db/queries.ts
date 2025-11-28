/**
 * Helper funkcije za query-je na Supabase tablice
 * 
 * Sve funkcije koriste supabase.from().select() za dohvat podataka
 */

import { createServiceClient } from "@/lib/supabase";
import type {
  Food,
  Recipe,
  RecipeIngredient,
  RecipeIngredientWithFood,
  RecipeWithIngredients,
  WorkoutExercise,
  ExerciseFilters,
} from "./models";

const supabase = createServiceClient();

// ============================================
// FOODS - Namirnice
// ============================================

/**
 * Dohvati sve namirnice
 * @param filters - Opcioni filteri (category, tags, itd.)
 * @returns Promise<Food[]> - Lista svih namirnica
 */
export async function getFoods(filters?: {
  category?: string;
  tags?: string[];
}): Promise<Food[]> {
  try {
    let query = supabase
      .from("foods")
      .select("*")
      .order("name", { ascending: true });

    // Primjeni filtere ako postoje
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      // JSONB contains filter za tags
      query = query.contains("tags", filters.tags);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching foods:", error);
      throw error;
    }

    // Konvertuj JSONB tags u string[]
    return (data || []).map((food: any) => ({
      ...food,
      tags: Array.isArray(food.tags) ? food.tags : [],
    })) as Food[];
  } catch (error) {
    console.error("Error in getFoods:", error);
    throw error;
  }
}

/**
 * Dohvati namirnicu po ID-u
 * @param id - UUID namirnice
 * @returns Promise<Food | null>
 */
export async function getFoodById(id: string): Promise<Food | null> {
  try {
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching food by id:", error);
      throw error;
    }

    return {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
    } as Food;
  } catch (error) {
    console.error("Error in getFoodById:", error);
    throw error;
  }
}

// ============================================
// RECIPES - Recepti
// ============================================

/**
 * Dohvati sve recepte
 * @param filters - Opcioni filteri (tags, cooking_time, itd.)
 * @returns Promise<Recipe[]> - Lista svih recepata
 */
export async function getRecipes(filters?: {
  tags?: string[];
  max_cooking_time?: number;
}): Promise<Recipe[]> {
  try {
    let query = supabase
      .from("recipes")
      .select("*")
      .order("name", { ascending: true });

    // Primjeni filtere ako postoje
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }

    if (filters?.max_cooking_time) {
      query = query.lte("cooking_time_min", filters.max_cooking_time);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching recipes:", error);
      throw error;
    }

    // Konvertuj JSONB tags u string[]
    return (data || []).map((recipe: any) => ({
      ...recipe,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    })) as Recipe[];
  } catch (error) {
    console.error("Error in getRecipes:", error);
    throw error;
  }
}

/**
 * Dohvati recept po ID-u
 * @param id - UUID recepta
 * @returns Promise<Recipe | null>
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching recipe by id:", error);
      throw error;
    }

    return {
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : [],
    } as Recipe;
  } catch (error) {
    console.error("Error in getRecipeById:", error);
    throw error;
  }
}

// ============================================
// RECIPE_INGREDIENTS - Sastojci recepata
// ============================================

/**
 * Dohvati sve sastojke za određeni recept
 * @param recipeId - UUID recepta
 * @returns Promise<RecipeIngredientWithFood[]> - Lista sastojaka sa informacijama o namirnicama
 */
export async function getRecipeIngredients(
  recipeId: string
): Promise<RecipeIngredientWithFood[]> {
  try {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .select(
        `
        *,
        food:foods(*)
      `
      )
      .eq("recipe_id", recipeId)
      .order("grams", { ascending: false });

    if (error) {
      console.error("Error fetching recipe ingredients:", error);
      throw error;
    }

    // Transformiraj podatke u RecipeIngredientWithFood format
    return (data || []).map((item: any) => ({
      id: item.id,
      recipe_id: item.recipe_id,
      food_id: item.food_id,
      grams: item.grams,
      created_at: item.created_at,
      food: {
        ...item.food,
        tags: Array.isArray(item.food?.tags) ? item.food.tags : [],
      },
    })) as RecipeIngredientWithFood[];
  } catch (error) {
    console.error("Error in getRecipeIngredients:", error);
    throw error;
  }
}

/**
 * Dohvati recept sa svim sastojcima
 * @param recipeId - UUID recepta
 * @returns Promise<RecipeWithIngredients | null>
 */
export async function getRecipeWithIngredients(
  recipeId: string
): Promise<RecipeWithIngredients | null> {
  try {
    // Dohvati recept
    const recipe = await getRecipeById(recipeId);
    if (!recipe) {
      return null;
    }

    // Dohvati sastojke
    const ingredients = await getRecipeIngredients(recipeId);

    return {
      ...recipe,
      ingredients,
    };
  } catch (error) {
    console.error("Error in getRecipeWithIngredients:", error);
    throw error;
  }
}

// ============================================
// WORKOUT_EXERCISES - Vježbe
// ============================================

/**
 * Dohvati sve vježbe
 * @param filters - Opcioni filteri (muscle_group, equipment, level)
 * @returns Promise<WorkoutExercise[]> - Lista svih vježbi
 */
export async function getWorkoutExercises(
  filters?: ExerciseFilters
): Promise<WorkoutExercise[]> {
  try {
    let query = supabase
      .from("workout_exercises")
      .select("*")
      .order("name", { ascending: true });

    // Primjeni filtere ako postoje
    if (filters?.muscle_group) {
      if (Array.isArray(filters.muscle_group)) {
        query = query.in("muscle_group", filters.muscle_group);
      } else {
        query = query.eq("muscle_group", filters.muscle_group);
      }
    }

    if (filters?.equipment) {
      if (Array.isArray(filters.equipment)) {
        query = query.in("equipment", filters.equipment);
      } else {
        query = query.eq("equipment", filters.equipment);
      }
    }

    if (filters?.level) {
      if (Array.isArray(filters.level)) {
        query = query.in("level", filters.level);
      } else {
        query = query.eq("level", filters.level);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching workout exercises:", error);
      throw error;
    }

    return (data || []) as WorkoutExercise[];
  } catch (error) {
    console.error("Error in getWorkoutExercises:", error);
    throw error;
  }
}

/**
 * Dohvati vježbu po ID-u
 * @param id - UUID vježbe
 * @returns Promise<WorkoutExercise | null>
 */
export async function getWorkoutExerciseById(
  id: string
): Promise<WorkoutExercise | null> {
  try {
    const { data, error } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching workout exercise by id:", error);
      throw error;
    }

    return data as WorkoutExercise;
  } catch (error) {
    console.error("Error in getWorkoutExerciseById:", error);
    throw error;
  }
}

// ============================================
// INDEX/EXPORT
// ============================================

/**
 * Export svih helper funkcija
 */
export const dbQueries = {
  // Foods
  getFoods,
  getFoodById,

  // Recipes
  getRecipes,
  getRecipeById,
  getRecipeWithIngredients,

  // Recipe Ingredients
  getRecipeIngredients,

  // Workout Exercises
  getWorkoutExercises,
  getWorkoutExerciseById,
};
