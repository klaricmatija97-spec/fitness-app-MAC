/**
 * API Route: GET /api/meal-plan/recipes/demo
 * 
 * Demo endpoint - generira plan s demo podacima i SKALIRA recepte prema ciljevima
 */

import { NextResponse } from "next/server";
import { searchRecipes, SimplifiedRecipe } from "@/lib/services/edamamRecipeService";

// Meal slot configuration with calorie percentages
const MEAL_SLOTS = [
  { slot: "Doručak", query: "eggs omelette protein", percent: 0.25 },
  { slot: "Užina 1", query: "protein bar snack", percent: 0.10 },
  { slot: "Ručak", query: "chicken breast rice vegetables", percent: 0.30 },
  { slot: "Užina 2", query: "greek yogurt fruit", percent: 0.10 },
  { slot: "Večera", query: "salmon fish dinner", percent: 0.25 },
];

interface ScaledMeal {
  slot: string;
  recipe: SimplifiedRecipe;
  scaleFactor: number;
  scaled: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export async function GET() {
  try {
    console.log("🚀 Demo Recipe Plan Generator with SCALING...");

    // Demo targets (realistični za osobu koja gradi mišiće)
    const targets = {
      calories: 2200,
      protein: 165,
      carbs: 220,
      fat: 73,
    };

    const meals: ScaledMeal[] = [];

    for (const mealSlot of MEAL_SLOTS) {
      const targetCalories = Math.round(targets.calories * mealSlot.percent);
      
      console.log(`\n🍽️ ${mealSlot.slot}: tražim recept za ~${targetCalories} kcal...`);

      const recipes = await searchRecipes({
        query: mealSlot.query,
        random: true,
        limit: 15,
      });

      console.log(`   Pronađeno ${recipes.length} recepata`);

      if (recipes.length > 0) {
        // Filtriraj recepte koji su u razumnom rasponu (50-200% ciljanih kalorija)
        // da skaliranje bude realistično (0.5x - 2x porcija)
        const minCal = targetCalories * 0.5;
        const maxCal = targetCalories * 2;
        
        let bestRecipe = recipes[0];
        let bestDiff = Math.abs(recipes[0].calories - targetCalories);
        
        for (const recipe of recipes) {
          if (recipe.calories >= minCal && recipe.calories <= maxCal) {
            const diff = Math.abs(recipe.calories - targetCalories);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestRecipe = recipe;
            }
          }
        }

        // Skaliraj recept prema ciljanim kalorijama
        const scaleFactor = targetCalories / bestRecipe.calories;
        
        // Ograniči skaliranje na 0.5x - 2x za realistične porcije
        const clampedScale = Math.max(0.5, Math.min(2, scaleFactor));
        
        const scaled = {
          calories: Math.round(bestRecipe.calories * clampedScale),
          protein: Math.round(bestRecipe.protein * clampedScale * 10) / 10,
          carbs: Math.round(bestRecipe.carbs * clampedScale * 10) / 10,
          fat: Math.round(bestRecipe.fat * clampedScale * 10) / 10,
        };

        meals.push({
          slot: mealSlot.slot,
          recipe: bestRecipe,
          scaleFactor: clampedScale,
          scaled,
        });

        console.log(`   ✅ ${bestRecipe.name}`);
        console.log(`      Original: ${bestRecipe.calories} kcal | Skalirano (${clampedScale.toFixed(2)}x): ${scaled.calories} kcal`);
      }

      // Pauza između API poziva
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Izračunaj skalirane totale
    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.scaled.calories,
        protein: acc.protein + m.scaled.protein,
        carbs: acc.carbs + m.scaled.carbs,
        fat: acc.fat + m.scaled.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Izračunaj točnost
    const accuracy = {
      caloriesPercent: Math.round((totals.calories / targets.calories) * 100),
      proteinPercent: Math.round((totals.protein / targets.protein) * 100),
      carbsPercent: Math.round((totals.carbs / targets.carbs) * 100),
      fatPercent: Math.round((totals.fat / targets.fat) * 100),
    };

    console.log(`\n📊 REZULTATI:`);
    console.log(`   Ciljevi: ${targets.calories} kcal, ${targets.protein}g P, ${targets.carbs}g C, ${targets.fat}g F`);
    console.log(`   Ostvareno: ${totals.calories} kcal, ${totals.protein}g P, ${totals.carbs}g C, ${totals.fat}g F`);
    console.log(`   Točnost: ${accuracy.caloriesPercent}% kcal, ${accuracy.proteinPercent}% P`);

    return NextResponse.json({
      success: true,
      message: "Demo dnevni plan s receptima (SKALIRANO)",
      targets,
      totals,
      accuracy,
      meals: meals.map(m => ({
        slot: m.slot,
        name: m.recipe.name,
        image: m.recipe.image,
        originalCalories: m.recipe.calories,
        scaleFactor: Math.round(m.scaleFactor * 100) / 100,
        calories: m.scaled.calories,
        protein: m.scaled.protein,
        carbs: m.scaled.carbs,
        fat: m.scaled.fat,
        portionNote: m.scaleFactor > 1.1 ? `${Math.round(m.scaleFactor * 100)}% porcije` : 
                     m.scaleFactor < 0.9 ? `${Math.round(m.scaleFactor * 100)}% porcije` : 
                     "Standardna porcija",
        ingredients: m.recipe.ingredients.slice(0, 5),
        source: m.recipe.source,
      })),
    });

  } catch (error) {
    console.error("Demo error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
