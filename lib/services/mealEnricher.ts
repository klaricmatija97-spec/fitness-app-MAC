/**
 * Meal Enricher - Obogaćuje jela s Edamam nutritivnim podacima
 * 
 * Čita jela iz meal_components.json i dohvaća točne nutritivne vrijednosti
 * od Edamam API-ja
 */

import { analyzeNutritionFromText, SimplifiedNutrition } from './edamamService';

// ============================================
// TYPES
// ============================================

interface MealComponent {
  food: string;
  grams: number;
  displayName: string;
}

interface MealData {
  id: string;
  name: string;
  description: string;
  image: string;
  preparationTip: string;
  components: MealComponent[];
  tags: string[];
  suitableFor: string[];
}

interface EnrichedMeal extends MealData {
  edamamNutrition?: SimplifiedNutrition;
  nutritionSource: 'edamam' | 'calculated' | 'unknown';
  lastUpdated: string;
}

// ============================================
// FOOD NAME TRANSLATIONS (HR -> EN)
// ============================================

const FOOD_TRANSLATIONS: Record<string, string> = {
  // Proteini
  "Egg": "egg",
  "Egg white": "egg white",
  "Chicken breast": "chicken breast",
  "Chicken thigh": "chicken thigh",
  "Turkey breast": "turkey breast",
  "Beef steak": "beef steak",
  "Beef ground": "ground beef",
  "Pork loin": "pork loin",
  "Salmon": "salmon fillet",
  "Tuna": "tuna",
  "Cod": "cod fillet",
  "Shrimp": "shrimp",
  "Whey": "whey protein powder",
  "Casein": "casein protein powder",
  "Cottage cheese": "cottage cheese",
  "Greek yogurt": "greek yogurt",
  "Skyr": "skyr yogurt",
  "Tofu": "tofu",
  
  // Ugljikohidrati
  "Oats": "oatmeal",
  "Rice": "cooked white rice",
  "Brown rice": "cooked brown rice",
  "Pasta": "cooked pasta",
  "Bread": "whole wheat bread",
  "Toast": "whole wheat toast",
  "Potato": "boiled potato",
  "Sweet potato": "baked sweet potato",
  "Banana": "banana",
  "Apple": "apple",
  "Berries": "mixed berries",
  "Orange": "orange",
  "Mango": "mango",
  "Grapes": "grapes",
  "Honey": "honey",
  
  // Povrće
  "Broccoli": "steamed broccoli",
  "Spinach": "raw spinach",
  "Kale": "kale",
  "Carrots": "carrots",
  "Peppers": "bell peppers",
  "Tomato": "tomato",
  "Cucumber": "cucumber",
  "Zucchini": "zucchini",
  "Asparagus": "asparagus",
  "Green beans": "green beans",
  "Cauliflower": "cauliflower",
  "Mushrooms": "mushrooms",
  "Onion": "onion",
  "Garlic": "garlic",
  "Lettuce": "lettuce",
  "Avocado": "avocado",
  
  // Masti
  "Olive oil": "olive oil",
  "Coconut oil": "coconut oil",
  "Butter": "butter",
  "Almonds": "almonds",
  "Walnuts": "walnuts",
  "Peanut butter": "peanut butter",
  "Almond butter": "almond butter",
  "Chia seeds": "chia seeds",
  "Flax seeds": "flax seeds",
  "Cheese": "cheddar cheese",
  "Feta": "feta cheese",
  "Mozzarella": "mozzarella cheese",
  "Parmesan": "parmesan cheese",
  
  // Mliječni proizvodi
  "Milk": "whole milk",
  "Skim milk": "skim milk",
  "Almond milk": "almond milk",
  "Cream": "heavy cream",
  
  // Mahunarke
  "Black beans": "black beans",
  "Chickpeas": "chickpeas",
  "Lentils": "cooked lentils",
  "Kidney beans": "kidney beans",
  
  // Ostalo
  "Hummus": "hummus",
  "Quinoa": "cooked quinoa",
  "Tortilla": "whole wheat tortilla",
  "Wrap": "whole wheat wrap",
  "Granola": "granola",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Pretvori komponente jela u Edamam format
 */
function componentsToEdamamFormat(components: MealComponent[]): string {
  return components.map(comp => {
    const englishName = FOOD_TRANSLATIONS[comp.food] || comp.food.toLowerCase();
    return `${comp.grams}g ${englishName}`;
  }).join(", ");
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Obogati jedno jelo s Edamam podacima
 */
export async function enrichMeal(meal: MealData): Promise<EnrichedMeal> {
  const ingredientText = componentsToEdamamFormat(meal.components);
  
  console.log(`\n📦 Obogaćujem: ${meal.name}`);
  console.log(`   Sastojci: ${ingredientText}`);
  
  const nutrition = await analyzeNutritionFromText(ingredientText, meal.name);
  
  if (nutrition) {
    return {
      ...meal,
      edamamNutrition: nutrition,
      nutritionSource: 'edamam',
      lastUpdated: new Date().toISOString(),
    };
  } else {
    console.log(`   ⚠️ Nije moguće dohvatiti Edamam podatke za: ${meal.name}`);
    return {
      ...meal,
      nutritionSource: 'unknown',
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Obogati više jela s Edamam podacima (s pauzom između poziva)
 */
export async function enrichMeals(
  meals: MealData[], 
  delayMs: number = 500
): Promise<EnrichedMeal[]> {
  const enrichedMeals: EnrichedMeal[] = [];
  
  console.log(`\n🚀 Počinjem obogaćivanje ${meals.length} jela...`);
  
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    console.log(`\n[${i + 1}/${meals.length}] ${meal.name}`);
    
    const enriched = await enrichMeal(meal);
    enrichedMeals.push(enriched);
    
    // Pauza između poziva da ne preopteretimo API
    if (i < meals.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  const successCount = enrichedMeals.filter(m => m.nutritionSource === 'edamam').length;
  console.log(`\n✅ Završeno! ${successCount}/${meals.length} jela uspješno obogaćeno.`);
  
  return enrichedMeals;
}

/**
 * Izračunaj ukupne makrose za jelo na temelju komponenti
 * (fallback ako Edamam ne radi)
 */
export function calculateMealMacros(meal: EnrichedMeal): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  if (meal.edamamNutrition) {
    return {
      calories: meal.edamamNutrition.calories,
      protein: meal.edamamNutrition.protein,
      carbs: meal.edamamNutrition.carbs,
      fat: meal.edamamNutrition.fat,
    };
  }
  
  // Fallback - vraća 0 ako nema podataka
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

