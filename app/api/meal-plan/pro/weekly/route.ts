/**
 * POST /api/meal-plan/pro/weekly
 * 
 * Generiše PRO tjedni plan prehrane (7 dana) sa raznolikošću i user preferences
 * 
 * Body: { userId: string (UUID) }
 */

import { NextResponse } from "next/server";
import {
  generateWeeklyProMealPlan,
  saveWeeklyProMealPlanToSupabase,
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

    console.log(`[meal-plan/pro/weekly] Generiranje plana za korisnika: ${validatedData.userId}`);

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

    const calc = calculationsResult.calculations;

    // Generiši PRO tjedni plan prehrane sa opcijama
    let weeklyPlan;
    try {
      // Default 5 obroka dnevno
      const mealsPerDay = 5;

      weeklyPlan = await generateWeeklyProMealPlan(validatedData.userId, {
        mealsPerDay,
        targetCalories: calc.targetCalories,
        targetProtein: calc.targetProtein,
        targetCarbs: calc.targetCarbs,
        targetFat: calc.targetFats,
      });
      console.log(`[meal-plan/pro/weekly] Plan uspješno generiran`);
    } catch (genError) {
      console.error(`[meal-plan/pro/weekly] Greška pri generiranju plana:`, genError);
      throw genError;
    }

    // Spremi plan u bazu (opcionalno - ne bacaj grešku ako ne uspije)
    let savedPlan;
    try {
      savedPlan = await saveWeeklyProMealPlanToSupabase(validatedData.userId, weeklyPlan);
      console.log(`[meal-plan/pro/weekly] Plan spremljen u bazu: ${savedPlan.id}`);
    } catch (saveError) {
      console.warn(`[meal-plan/pro/weekly] Greška pri spremanju u bazu (plan je generiran):`, saveError);
      // Nastavi bez spremanja u bazu
      savedPlan = { id: null };
    }

    // Vrati finalni plan
    return NextResponse.json({
      ok: true,
      message: "PRO tjedni plan prehrane je uspješno generiran i spremljen",
      plan: weeklyPlan,
      savedPlanId: savedPlan.id,
      weeklyAverage: weeklyPlan.weeklyAverage,
    });
  } catch (error) {
    console.error("[meal-plan/pro/weekly] error:", error);

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
            : "Greška pri generiranju PRO tjednog plana prehrane",
      },
      { status: 500 }
    );
  }
}

