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
  generateWeeklyProMealPlanWithCalculations,
  saveWeeklyProMealPlanToSupabase,
} from "@/lib/services/proMealPlanGenerator";
import { loadUserCalculations } from "@/lib/utils/loadCalculations";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string().uuid("userId mora biti validan UUID").optional(),
  calculations: z.object({
    targetCalories: z.number().positive(),
    targetProtein: z.number().positive(),
    targetCarbs: z.number().positive(),
    targetFat: z.number().positive(),
    goalType: z.enum(["lose", "maintain", "gain"]),
    bmr: z.number().optional(),
    tdee: z.number().optional(),
    preferences: z.object({
      allergies: z.string().optional(),
      foodPreferences: z.string().optional(),
      avoidIngredients: z.string().optional(),
      trainingFrequency: z.string().optional(),
    }).optional(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Provjeri da li su poslane direktne kalkulacije
    if (body.calculations) {
      // Unauthenticated mode - use direct calculations
      console.log(`[meal-plan/pro/weekly] Generiranje plana s direktnim kalkulacijama`);
      
      const validatedData = requestSchema.parse({ calculations: body.calculations });
      
      let weeklyPlan;
      try {
        weeklyPlan = await generateWeeklyProMealPlanWithCalculations(validatedData.calculations!);
        console.log(`[meal-plan/pro/weekly] Plan uspješno generiran`);
      } catch (genError) {
        console.error(`[meal-plan/pro/weekly] Greška pri generiranju plana:`, genError);
        throw genError;
      }

      // Vrati finalni plan (bez spremanja u bazu za guest korisnike)
      return NextResponse.json({
        ok: true,
        message: "PRO tjedni plan prehrane je uspješno generiran",
        plan: weeklyPlan,
        weeklyAverage: weeklyPlan.weeklyAverage,
      });
    }

    // Authenticated mode - use userId
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");
    let userId: string;

    if (queryUserId) {
      userId = queryUserId;
    } else {
      userId = body.userId;
    }

    // Validiraj userId
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "userId je obavezan (query parametar ili body) ili pošaljite calculations",
        },
        { status: 400 }
      );
    }

    const validatedData = requestSchema.parse({ userId });

    console.log(`[meal-plan/pro/weekly] Generiranje plana za korisnika: ${validatedData.userId}`);

    // Provjeri da li korisnik ima kalkulacije prije generiranja
    const calculationsResult = await loadUserCalculations(validatedData.userId!, true);
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

      weeklyPlan = await generateWeeklyProMealPlan(validatedData.userId!, {
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
      savedPlan = await saveWeeklyProMealPlanToSupabase(validatedData.userId!, weeklyPlan);
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

