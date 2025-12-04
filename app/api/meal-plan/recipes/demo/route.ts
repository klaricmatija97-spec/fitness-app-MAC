/**
 * API Route: GET /api/meal-plan/recipes/demo
 * 
 * Demo endpoint - generira plan prilagođen CILJU korisnika:
 * - BULK (gain): Više ugljikohidrata, umjereni proteini, više kalorija
 * - CUT (lose): Manje kalorija, visoki proteini, manje UH/masti
 * - MAINTAIN: Balansirano
 */

import { NextResponse } from "next/server";
import { searchRecipes, SimplifiedRecipe } from "@/lib/services/edamamRecipeService";

// ============================================
// GOAL-SPECIFIC CONFIGURATIONS
// ============================================

type GoalType = 'lose' | 'maintain' | 'gain';

interface MealSlotConfig {
  slot: string;
  percent: number;
  queries: Record<GoalType, string[]>;
}

// Različiti queryji za različite ciljeve
const MEAL_SLOTS: MealSlotConfig[] = [
  { 
    slot: "Doručak", 
    percent: 0.25,
    queries: {
      lose: ["egg whites vegetables", "omelette spinach low fat"],
      maintain: ["eggs bacon breakfast", "omelette cheese vegetables"],
      gain: ["oatmeal banana protein", "pancakes eggs breakfast carbs"],
    }
  },
  { 
    slot: "Užina 1", 
    percent: 0.10,
    queries: {
      lose: ["cottage cheese low fat", "greek yogurt protein"],
      maintain: ["greek yogurt berries", "protein snack"],
      gain: ["banana peanut butter", "oatmeal protein shake"],
    }
  },
  { 
    slot: "Ručak", 
    percent: 0.30,
    queries: {
      lose: ["grilled chicken salad lean", "fish vegetables steamed"],
      maintain: ["chicken breast rice vegetables", "salmon quinoa"],
      gain: ["chicken rice pasta", "beef steak potatoes carbs"],
    }
  },
  { 
    slot: "Užina 2", 
    percent: 0.10,
    queries: {
      lose: ["hard boiled eggs", "turkey breast slices lean"],
      maintain: ["nuts almonds protein", "cheese crackers"],
      gain: ["rice cakes peanut butter", "granola yogurt"],
    }
  },
  { 
    slot: "Večera", 
    percent: 0.25,
    queries: {
      lose: ["grilled fish vegetables", "chicken breast broccoli lean"],
      maintain: ["salmon dinner vegetables", "chicken breast potato"],
      gain: ["pasta chicken dinner", "steak rice dinner carbs"],
    }
  },
];

// Ciljani macro omjeri po cilju (% kalorija)
const MACRO_TARGETS: Record<GoalType, { protein: number; carbs: number; fat: number }> = {
  lose: { protein: 0.40, carbs: 0.30, fat: 0.30 },    // Visoki protein, niži UH
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 }, // Balansirano
  gain: { protein: 0.25, carbs: 0.50, fat: 0.25 },    // Visoki UH za bulk
};

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

// ============================================
// HELPER FUNCTIONS
// ============================================

function scoreRecipeForGoal(recipe: SimplifiedRecipe, goal: GoalType, targetCalories: number): number {
  const macroTargets = MACRO_TARGETS[goal];
  
  // Izračunaj stvarne macro omjere recepta
  const totalMacroCals = (recipe.protein * 4) + (recipe.carbs * 4) + (recipe.fat * 9);
  const actualProteinRatio = (recipe.protein * 4) / totalMacroCals;
  const actualCarbsRatio = (recipe.carbs * 4) / totalMacroCals;
  const actualFatRatio = (recipe.fat * 9) / totalMacroCals;
  
  // Score = koliko je recept blizu ciljanim omjerima
  const proteinScore = 1 - Math.abs(actualProteinRatio - macroTargets.protein);
  const carbsScore = 1 - Math.abs(actualCarbsRatio - macroTargets.carbs);
  const fatScore = 1 - Math.abs(actualFatRatio - macroTargets.fat);
  
  // Kalorijska blizina
  const calorieDiff = Math.abs(recipe.calories - targetCalories) / targetCalories;
  const calorieScore = Math.max(0, 1 - calorieDiff);
  
  // Težinski score prema cilju
  let score = 0;
  if (goal === 'lose') {
    // Za mršavljenje: prioritet protein, zatim niske kalorije
    score = proteinScore * 0.5 + calorieScore * 0.3 + carbsScore * 0.1 + fatScore * 0.1;
  } else if (goal === 'gain') {
    // Za bulk: prioritet ugljikohidrati, zatim kalorije
    score = carbsScore * 0.4 + calorieScore * 0.3 + proteinScore * 0.2 + fatScore * 0.1;
  } else {
    // Održavanje: balansirano
    score = proteinScore * 0.3 + carbsScore * 0.3 + calorieScore * 0.25 + fatScore * 0.15;
  }
  
  return score;
}

// ============================================
// MAIN HANDLER
// ============================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalParam = searchParams.get('goal') as GoalType | null;
    const goal: GoalType = goalParam && ['lose', 'maintain', 'gain'].includes(goalParam) 
      ? goalParam 
      : 'maintain';

    console.log(`\n🚀 Recipe Plan Generator - CILJ: ${goal.toUpperCase()}`);

    // Demo targets prilagođeni cilju
    const baseCalories = goal === 'lose' ? 1800 : goal === 'gain' ? 2800 : 2200;
    const macroRatios = MACRO_TARGETS[goal];
    
    const targets = {
      calories: baseCalories,
      protein: Math.round((baseCalories * macroRatios.protein) / 4), // g proteina
      carbs: Math.round((baseCalories * macroRatios.carbs) / 4),     // g UH
      fat: Math.round((baseCalories * macroRatios.fat) / 9),         // g masti
      goal,
    };

    console.log(`📊 Ciljevi: ${targets.calories} kcal | P: ${targets.protein}g | C: ${targets.carbs}g | F: ${targets.fat}g`);

    const meals: ScaledMeal[] = [];

    for (const mealSlot of MEAL_SLOTS) {
      const targetCalories = Math.round(targets.calories * mealSlot.percent);
      const queries = mealSlot.queries[goal];
      
      console.log(`\n🍽️ ${mealSlot.slot}: tražim recepte za ${goal}...`);

      // Pretraži s oba querya
      let recipes: SimplifiedRecipe[] = [];
      for (const query of queries) {
        const results = await searchRecipes({
          query,
          random: true,
          limit: 12,
        });
        recipes = [...recipes, ...results];
        if (recipes.length >= 15) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Ukloni duplikate
      const uniqueRecipes = recipes.filter((r, i, arr) => 
        arr.findIndex(x => x.id === r.id) === i
      );

      console.log(`   Pronađeno ${uniqueRecipes.length} recepata`);

      if (uniqueRecipes.length > 0) {
        // SCORE svaki recept prema cilju
        const scoredRecipes = uniqueRecipes.map(recipe => ({
          recipe,
          score: scoreRecipeForGoal(recipe, goal, targetCalories),
        }));
        
        // Sortiraj po score-u (najbolji prvi)
        scoredRecipes.sort((a, b) => b.score - a.score);
        
        // Uzmi najbolji
        const bestRecipe = scoredRecipes[0].recipe;
        
        // Skaliraj prema ciljanim kalorijama
        const scaleFactor = targetCalories / bestRecipe.calories;
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

        console.log(`   ✅ ${bestRecipe.name} (score: ${scoredRecipes[0].score.toFixed(2)})`);
        console.log(`      ${scaled.calories} kcal | P: ${scaled.protein}g | C: ${scaled.carbs}g | F: ${scaled.fat}g`);
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Izračunaj totale
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

    // Preporuke prema cilju
    const recommendations: string[] = [];
    if (goal === 'lose') {
      recommendations.push("Fokusiraj se na proteine za očuvanje mišića");
      recommendations.push("Pij puno vode između obroka");
      recommendations.push("Izbjegavaj prerađenu hranu i skrivene kalorije");
    } else if (goal === 'gain') {
      recommendations.push("Jedi dovoljno ugljikohidrata za energiju na treningu");
      recommendations.push("Uzmi kreatin (3-5g dnevno) ako nemaš kontraindikacija");
      recommendations.push("Proteinski shake nakon treninga");
    } else {
      recommendations.push("Održavaj balans između proteina, UH i masti");
      recommendations.push("Slušaj svoje tijelo i prilagođavaj unos");
    }

    console.log(`\n📊 REZULTATI za ${goal.toUpperCase()}:`);
    console.log(`   Ciljevi: ${targets.calories} kcal | P: ${targets.protein}g | C: ${targets.carbs}g | F: ${targets.fat}g`);
    console.log(`   Ostvareno: ${totals.calories} kcal | P: ${totals.protein}g | C: ${totals.carbs}g | F: ${totals.fat}g`);
    console.log(`   Točnost: Kcal ${accuracy.caloriesPercent}% | P ${accuracy.proteinPercent}% | C ${accuracy.carbsPercent}% | F ${accuracy.fatPercent}%`);

    return NextResponse.json({
      success: true,
      message: `Plan prehrane za ${goal === 'lose' ? 'MRŠAVLJENJE' : goal === 'gain' ? 'BULK' : 'ODRŽAVANJE'}`,
      goal,
      targets,
      totals,
      accuracy,
      recommendations,
      meals: meals.map(m => ({
        slot: m.slot,
        name: m.recipe.name,
        image: m.recipe.image,
        scaleFactor: Math.round(m.scaleFactor * 100) / 100,
        calories: m.scaled.calories,
        protein: m.scaled.protein,
        carbs: m.scaled.carbs,
        fat: m.scaled.fat,
        portionNote: m.scaleFactor > 1.1 ? `${Math.round(m.scaleFactor * 100)}% porcije` : 
                     m.scaleFactor < 0.9 ? `${Math.round(m.scaleFactor * 100)}% porcije` : 
                     "Standardna porcija",
        ingredientsWithGrams: (m.recipe.ingredientsWithGrams || []).map(ing => ({
          food: ing.food,
          grams: Math.round(ing.grams * m.scaleFactor),
        })),
        totalWeight: Math.round((m.recipe.totalWeight || 0) * m.scaleFactor),
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
