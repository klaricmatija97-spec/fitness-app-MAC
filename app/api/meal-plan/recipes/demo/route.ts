/**
 * API Route: GET /api/meal-plan/recipes/demo
 * 
 * Demo endpoint - generira plan s demo podacima i SKALIRA recepte prema ciljevima
 */

import { NextResponse } from "next/server";
import { searchRecipes, SimplifiedRecipe } from "@/lib/services/edamamRecipeService";

// Meal slot configuration - FITNESS FOCUSED
// diet: undefined za fleksibilnije rezultate, filtriramo po protein ratio
const MEAL_SLOTS = [
  { slot: "Doručak", queries: ["eggs bacon breakfast", "omelette vegetables cheese"], percent: 0.25 },
  { slot: "Užina 1", queries: ["cottage cheese", "greek yogurt protein"], percent: 0.10 },
  { slot: "Ručak", queries: ["chicken breast vegetables", "grilled chicken rice"], percent: 0.30 },
  { slot: "Užina 2", queries: ["hard boiled eggs", "turkey slices"], percent: 0.10 },
  { slot: "Večera", queries: ["salmon dinner", "chicken breast dinner"], percent: 0.25 },
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

    // Izračunaj ciljane proteine po obroku (proporcionalno kalorijama)
    const targetProteinPerMeal = targets.protein;

    for (const mealSlot of MEAL_SLOTS) {
      const targetCalories = Math.round(targets.calories * mealSlot.percent);
      const targetProtein = Math.round(targetProteinPerMeal * mealSlot.percent);
      
      console.log(`\n🍽️ ${mealSlot.slot}: tražim recept za ~${targetCalories} kcal, ~${targetProtein}g proteina...`);

      // Probaj oba querya
      let recipes: SimplifiedRecipe[] = [];
      for (const query of mealSlot.queries) {
        const results = await searchRecipes({
          query,
          random: true,
          limit: 15,
        });
        recipes = [...recipes, ...results];
        if (recipes.length >= 10) break; // Dosta recepata
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Ukloni duplikate
      const uniqueRecipes = recipes.filter((r, i, arr) => 
        arr.findIndex(x => x.id === r.id) === i
      );

      console.log(`   Pronađeno ${uniqueRecipes.length} recepata`);

      if (uniqueRecipes.length > 0) {
        // PRIORITIZIRAJ recepte s visokim proteinima!
        // Sortiraj po omjeru proteina (g proteina po 100 kalorija)
        const sortedByProtein = [...uniqueRecipes].sort((a, b) => {
          const ratioA = (a.protein / a.calories) * 100;
          const ratioB = (b.protein / b.calories) * 100;
          return ratioB - ratioA; // Viši protein ratio = bolje
        });

        // Uzmi top 5 po proteinima, pa od njih biraj najbliži kalorijama
        const topProteinRecipes = sortedByProtein.slice(0, 8);
        
        const minCal = targetCalories * 0.4;
        const maxCal = targetCalories * 2.5;
        
        let bestRecipe = topProteinRecipes[0];
        let bestScore = 0;
        
        for (const recipe of topProteinRecipes) {
          if (recipe.calories >= minCal && recipe.calories <= maxCal) {
            // Score = protein ratio * closeness to target calories
            const proteinRatio = (recipe.protein / recipe.calories) * 100;
            const calorieDiff = 1 - Math.abs(recipe.calories - targetCalories) / targetCalories;
            const score = proteinRatio * 0.7 + calorieDiff * 30; // Protein je prioritet
            
            if (score > bestScore) {
              bestScore = score;
              bestRecipe = recipe;
            }
          }
        }

        // Skaliraj recept prema ciljanim kalorijama
        const scaleFactor = targetCalories / bestRecipe.calories;
        
        // Ograniči skaliranje na 0.4x - 3x (fitness obroci su često manji pa treba više skalirati)
        const clampedScale = Math.max(0.4, Math.min(3, scaleFactor));
        
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
        // Skalirane gramaže sastojaka
        ingredientsWithGrams: (m.recipe.ingredientsWithGrams || []).map(ing => ({
          food: ing.food,
          grams: Math.round(ing.grams * m.scaleFactor),
          text: ing.text,
        })),
        totalWeight: Math.round((m.recipe.totalWeight || 0) * m.scaleFactor),
        ingredients: m.recipe.ingredients.slice(0, 8),
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
