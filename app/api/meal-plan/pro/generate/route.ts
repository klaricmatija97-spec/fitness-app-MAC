/**
 * POST /api/meal-plan/pro/generate
 * 
 * Generiše PRO dnevni plan prehrane sa scoring sistemom i sprema ga u bazu
 * 
 * Body/Query: { userId: string (UUID) }
 */

import { NextResponse } from "next/server";
import {
  generateProDailyMealPlan,
  saveProMealPlanToSupabase,
} from "@/lib/services/proMealPlanGenerator";
import { loadUserCalculations } from "@/lib/utils/loadCalculations";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string().uuid("userId mora biti validan UUID"),
});

export async function POST(request: Request) {
  try {
    // Dohvati userId iz body-a ili query parametara
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");

    let userId: string;

    if (queryUserId) {
      userId = queryUserId;
    } else {
      const body = await request.json().catch(() => ({}));
      userId = body.userId;
    }

    // Validiraj userId
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "userId je obavezan (query parametar ili body)",
        },
        { status: 400 }
      );
    }

    const validatedData = requestSchema.parse({ userId });

    // Provjeri da li korisnik ima kalkulacije prije generiranja
    const calculationsResult = await loadUserCalculations(validatedData.userId, true);
    if (!calculationsResult.success || !calculationsResult.calculations) {
      return NextResponse.json(
        {
          ok: false,
          message: calculationsResult.error || "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
        },
        { status: 400 }
      );
    }

    // Generiši PRO plan prehrane
    const mealPlan = await generateProDailyMealPlan(validatedData.userId);

    // Spremi plan u bazu
    const savedPlan = await saveProMealPlanToSupabase(validatedData.userId, mealPlan);

    // Vrati finalni plan sa detaljnim podacima
    return NextResponse.json({
      ok: true,
      message: "PRO plan prehrane je uspješno generiran i spremljen",
      plan: mealPlan,
      savedPlanId: savedPlan.id,
      deviation: mealPlan.total.deviation,
      // Dodatni summary za frontend
      summary: {
        totalDeviation: mealPlan.total.deviation.total,
        calories: {
          actual: mealPlan.total.calories,
          target: mealPlan.total.deviation.calories,
          deviation: mealPlan.total.deviation.calories,
        },
        macros: {
          protein: {
            actual: mealPlan.total.protein,
            deviation: mealPlan.total.deviation.protein,
          },
          carbs: {
            actual: mealPlan.total.carbs,
            deviation: mealPlan.total.deviation.carbs,
          },
          fat: {
            actual: mealPlan.total.fat,
            deviation: mealPlan.total.deviation.fat,
          },
        },
        meals: [
          { type: "breakfast", name: mealPlan.breakfast.name, score: mealPlan.breakfast.score },
          { type: "lunch", name: mealPlan.lunch.name, score: mealPlan.lunch.score },
          { type: "dinner", name: mealPlan.dinner.name, score: mealPlan.dinner.score },
          { type: "snack", name: mealPlan.snack.name, score: mealPlan.snack.score },
        ],
      },
    });
  } catch (error) {
    console.error("[meal-plan/pro/generate] error:", error);

    // Ako je validacijska greška
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Neispravni podaci",
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    // Opća greška
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Greška pri generiranju PRO plana prehrane",
      },
      { status: 500 }
    );
  }
}

