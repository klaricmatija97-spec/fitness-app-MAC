/**
 * API Route: POST /api/nutrition/enrich
 * 
 * Obogaćuje jela iz meal_components.json s Edamam nutritivnim podacima
 * 
 * Query params:
 * - limit: broj jela za obraditi (default: 5)
 * - offset: od kojeg jela početi (default: 0)
 * - type: tip obroka (breakfast, lunch, dinner, snack) ili 'all'
 */

import { NextRequest, NextResponse } from "next/server";
import { enrichMeal } from "@/lib/services/mealEnricher";
import mealComponentsData from "@/lib/data/meal_components.json";

// Tip za meal komponente
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

interface MealComponentsJson {
  goalNotes: Record<string, string>;
  breakfast: MealData[];
  lunch: MealData[];
  dinner: MealData[];
  snack: MealData[];
}

// Type assertion - meal_components.json ne mora imati image property
const mealData = mealComponentsData as unknown as MealComponentsJson;

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type") || "all";

    console.log(`\n🔄 Enriching meals: type=${type}, limit=${limit}, offset=${offset}`);

    // Dohvati jela za obogaćivanje
    let meals: MealData[] = [];
    
    if (type === "all") {
      meals = [
        ...mealData.breakfast,
        ...mealData.lunch,
        ...mealData.dinner,
        ...mealData.snack,
      ];
    } else if (type === "breakfast") {
      meals = mealData.breakfast;
    } else if (type === "lunch") {
      meals = mealData.lunch;
    } else if (type === "dinner") {
      meals = mealData.dinner;
    } else if (type === "snack") {
      meals = mealData.snack;
    }

    const totalMeals = meals.length;
    const mealsToProcess = meals.slice(offset, offset + limit);

    console.log(`   Total meals: ${totalMeals}, Processing: ${mealsToProcess.length}`);

    // Obogati svako jelo
    // Rate limiter će kontrolirati pauze automatski
    const enrichedMeals = [];
    for (const meal of mealsToProcess) {
      try {
        const enriched = await enrichMeal(meal);
        enrichedMeals.push({
          id: enriched.id,
          name: enriched.name,
          nutrition: enriched.edamamNutrition,
          source: enriched.nutritionSource,
        });
      } catch (error) {
        console.error(`Error enriching ${meal.name}:`, error);
        enrichedMeals.push({
          id: meal.id,
          name: meal.name,
          nutrition: null,
          source: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = enrichedMeals.filter(m => m.source === 'edamam').length;

    return NextResponse.json({
      success: true,
      message: `Obogaćeno ${successCount}/${mealsToProcess.length} jela`,
      stats: {
        totalMeals,
        processed: mealsToProcess.length,
        offset,
        limit,
        nextOffset: offset + limit < totalMeals ? offset + limit : null,
      },
      meals: enrichedMeals,
    });

  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json({
      success: false,
      message: "Greška pri obogaćivanju jela",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET za dohvat statistike
export async function GET() {
  const stats = {
    breakfast: mealData.breakfast.length,
    lunch: mealData.lunch.length,
    dinner: mealData.dinner.length,
    snack: mealData.snack.length,
    total: mealData.breakfast.length + mealData.lunch.length + mealData.dinner.length + mealData.snack.length,
  };

  return NextResponse.json({
    success: true,
    message: "Statistika jela",
    stats,
    usage: {
      enrich5: "POST /api/nutrition/enrich?limit=5&offset=0",
      enrichBreakfast: "POST /api/nutrition/enrich?type=breakfast&limit=10",
      enrichAll: "POST /api/nutrition/enrich?type=all&limit=200",
    },
  });
}

