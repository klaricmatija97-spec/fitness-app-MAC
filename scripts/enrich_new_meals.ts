/**
 * Script to enrich new meals with Edamam nutrition data
 * Run with: npx ts-node scripts/enrich_new_meals.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CACHE_PATH = path.join(__dirname, '..', 'lib', 'data', 'meal_nutrition_cache.json');
const MEALS_PATH = path.join(__dirname, '..', 'lib', 'data', 'meal_components.json');

// Edamam credentials from env
const EDAMAM_APP_ID = process.env.EDAMAM_NUTRITION_APP_ID || process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_NUTRITION_APP_KEY || process.env.EDAMAM_APP_KEY;

interface MealComponent {
  food: string;
  grams: number;
  displayName: string;
}

interface Meal {
  id: string;
  name: string;
  components: MealComponent[];
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface Cache {
  lastUpdated: string;
  source: string;
  totalMeals: number;
  nutritionById: Record<string, NutritionData>;
}

// Food translations for Edamam API
const FOOD_TRANSLATIONS: Record<string, string> = {
  "Egg": "egg",
  "Egg white": "egg white",
  "Chicken breast": "chicken breast",
  "Turkey breast": "turkey breast",
  "Beef": "beef",
  "Ground beef": "ground beef",
  "Ground turkey": "ground turkey",
  "Salmon": "salmon fillet",
  "Tuna": "tuna",
  "Sea bass": "sea bass",
  "Sea bream": "sea bream",
  "Hake": "hake fillet",
  "Whey": "whey protein powder",
  "Cottage cheese": "cottage cheese",
  "Greek yogurt": "greek yogurt",
  "Skyr": "skyr yogurt",
  "Tofu": "tofu",
  "Feta cheese": "feta cheese",
  "Cheese": "cheese",
  "Parmesan": "parmesan cheese",
  "Mozzarella": "mozzarella",
  
  "Oats": "oatmeal",
  "Rice": "cooked white rice",
  "Arborio rice": "arborio rice",
  "Basmati rice": "basmati rice",
  "Pasta": "cooked pasta",
  "Lasagna sheets": "lasagna pasta",
  "Gnocchi": "potato gnocchi",
  "Toast": "whole wheat toast",
  "Tortilla": "flour tortilla",
  "Potatoes": "boiled potato",
  "New potatoes": "new potato",
  "Sweet potato": "baked sweet potato",
  "Quinoa": "cooked quinoa",
  "Cornmeal": "cornmeal",
  
  "Banana": "banana",
  "Apple": "apple",
  "Blueberries": "blueberries",
  "Strawberries": "strawberries",
  "Honey": "honey",
  "Prunes": "prunes",
  
  "Broccoli": "steamed broccoli",
  "Spinach": "raw spinach",
  "Chard": "swiss chard",
  "Sauerkraut": "sauerkraut",
  "Carrot": "carrot",
  "Bell pepper": "bell pepper",
  "Tomato": "tomato",
  "Cherry tomatoes": "cherry tomatoes",
  "Tomato paste": "tomato paste",
  "Cucumber": "cucumber",
  "Zucchini": "zucchini",
  "Asparagus": "asparagus",
  "Mushrooms": "mushrooms",
  "Onion": "onion",
  "Garlic": "garlic",
  "Lettuce": "lettuce",
  "Avocado": "avocado",
  "Red cabbage": "red cabbage",
  "Eggplant": "eggplant",
  "Celery": "celery",
  "Peas": "green peas",
  "Edamame": "edamame",
  "Corn": "corn",
  "Olives": "olives",
  "Black beans": "black beans",
  "White beans": "white beans",
  
  "Olive oil": "olive oil",
  "Sesame oil": "sesame oil",
  "Butter": "butter",
  "Coconut milk": "coconut milk",
  "Heavy cream": "heavy cream",
  "Sour cream": "sour cream",
  "Milk": "whole milk",
  "Peanut butter": "peanut butter",
  "Almond butter": "almond butter",
  "Chia seeds": "chia seeds",
  "Sesame seeds": "sesame seeds",
  "Pumpkin seeds": "pumpkin seeds",
  "Pine nuts": "pine nuts",
  "Almonds": "almonds",
  "Walnuts": "walnuts",
  "Hazelnuts": "hazelnuts",
  "Dark chocolate": "dark chocolate",
  "Dried cranberries": "dried cranberries",
  
  "Hummus": "hummus",
  "Salsa": "salsa",
  "Pesto": "pesto sauce",
  "Soy sauce": "soy sauce",
  "Bechamel sauce": "bechamel sauce",
  "White wine": "white wine",
  "Red wine": "red wine",
  "Tikka masala paste": "tikka masala paste",
  "Chicken broth": "chicken broth",
  
  "Bacon": "bacon",
  "Sausage": "pork sausage",
  "Rice cakes": "rice cakes",
  "Lemon": "lemon",
  "Chives": "chives",
};

function translateFood(food: string): string {
  return FOOD_TRANSLATIONS[food] || food.toLowerCase();
}

async function fetchNutrition(ingredients: string[]): Promise<NutritionData | null> {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    console.error('Missing Edamam credentials');
    return null;
  }

  const apiUrl = `https://api.edamam.com/api/nutrition-details?app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingr: ingredients }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const nutrients = data.totalNutrients;

    return {
      calories: Math.round(nutrients.ENERC_KCAL?.quantity || 0),
      protein: Math.round((nutrients.PROCNT?.quantity || 0) * 10) / 10,
      carbs: Math.round((nutrients.CHOCDF?.quantity || 0) * 10) / 10,
      fat: Math.round((nutrients.FAT?.quantity || 0) * 10) / 10,
      fiber: Math.round((nutrients.FIBTG?.quantity || 0) * 10) / 10,
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function enrichMeal(meal: Meal): Promise<NutritionData | null> {
  const ingredients = meal.components.map(c => 
    `${c.grams}g ${translateFood(c.food)}`
  );
  
  console.log(`  Ingredients: ${ingredients.join(', ')}`);
  
  return fetchNutrition(ingredients);
}

async function main() {
  console.log('🍽️  Enriching new meals with Edamam nutrition data\n');

  // Load cache
  const cache: Cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  console.log(`📦 Cache loaded: ${cache.totalMeals} meals\n`);

  // Load meals
  const mealsData = JSON.parse(fs.readFileSync(MEALS_PATH, 'utf-8'));
  const allMeals: Meal[] = [
    ...mealsData.breakfast,
    ...mealsData.lunch,
    ...mealsData.dinner,
    ...mealsData.snack,
  ];

  console.log(`📋 Total meals in database: ${allMeals.length}\n`);

  // Find new meals (not in cache)
  const newMeals = allMeals.filter(m => !cache.nutritionById[m.id]);
  console.log(`🆕 New meals to enrich: ${newMeals.length}\n`);

  if (newMeals.length === 0) {
    console.log('✅ All meals already enriched!');
    return;
  }

  // Enrich new meals
  let successCount = 0;
  for (let i = 0; i < newMeals.length; i++) {
    const meal = newMeals[i];
    console.log(`\n[${i + 1}/${newMeals.length}] ${meal.name} (${meal.id})`);

    const nutrition = await enrichMeal(meal);
    
    if (nutrition) {
      cache.nutritionById[meal.id] = nutrition;
      successCount++;
      console.log(`  ✅ ${nutrition.calories} kcal, P:${nutrition.protein}g, C:${nutrition.carbs}g, F:${nutrition.fat}g`);
    } else {
      console.log(`  ❌ Failed to get nutrition`);
    }

    // Rate limit: 500ms between calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Update cache
  cache.lastUpdated = new Date().toISOString();
  cache.totalMeals = Object.keys(cache.nutritionById).length;

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');

  console.log(`\n\n✅ DONE!`);
  console.log(`   Enriched: ${successCount}/${newMeals.length} meals`);
  console.log(`   Total in cache: ${cache.totalMeals} meals`);
}

main().catch(console.error);

