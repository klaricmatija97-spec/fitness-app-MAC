/**
 * POST /api/meal-plan/weekly
 * 
 * NOVI generator tjednog plana prehrane
 * Koristi SAMO kompozitne obroke iz meal_components.json
 * 
 * Body: { userId: string }
 */

import { NextResponse } from "next/server";
import { generateWeeklyMealPlan, generateWeeklyMealPlanWithCalculations, saveWeeklyPlanToSupabase } from "@/lib/services/weeklyMealPlanGenerator";

export async function POST(request: Request) {
  try {
    // Dohvati userId ili direktne kalkulacije
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");

    const body = await request.json().catch(() => ({}));
    
    let userId: string | undefined;
    let directCalculations: any | undefined;

    if (queryUserId) {
      userId = queryUserId;
    } else if (body.userId) {
      userId = body.userId;
    } else if (body.calculations) {
      // Direct calculations mode (no login required)
      directCalculations = body.calculations;
    }

    if (!userId && !directCalculations) {
      return NextResponse.json(
        { ok: false, message: "userId ili calculations su obavezni" },
        { status: 400 }
      );
    }

    console.log(`\n========================================`);
    console.log(`🚀 NOVI TJEDNI GENERATOR - START`);
    if (userId) {
      console.log(`📋 User ID: ${userId}`);
    } else {
      console.log(`📋 Direct calculations mode`);
      console.log(`   Calories: ${directCalculations.targetCalories}`);
      console.log(`   Macros: P:${directCalculations.targetProtein}g C:${directCalculations.targetCarbs}g F:${directCalculations.targetFat}g`);
    }
    console.log(`========================================\n`);

    // Generiraj tjedni plan
    const weeklyPlan = userId 
      ? await generateWeeklyMealPlan(userId)
      : await generateWeeklyMealPlanWithCalculations(directCalculations);

    // Pokušaj spremiti u bazu (ne baci grešku ako ne uspije)
    const saveResult = await saveWeeklyPlanToSupabase(weeklyPlan);
    if (saveResult.success) {
      console.log(`✅ Plan spremljen u bazu: ${saveResult.id}`);
    } else {
      console.warn(`⚠️ Plan nije spremljen u bazu: ${saveResult.error}`);
    }

    console.log(`\n========================================`);
    console.log(`✅ TJEDNI PLAN USPJEŠNO GENERIRAN!`);
    console.log(`========================================\n`);

    return NextResponse.json({
      ok: true,
      message: "Tjedni plan prehrane uspješno generiran",
      plan: weeklyPlan,
      savedToDatabase: saveResult.success,
      savedPlanId: saveResult.id || null,
    });

  } catch (error) {
    console.error("❌ Greška pri generiranju tjednog plana:", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri generiranju plana",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  // Podržava i GET za lakše testiranje
  return POST(request);
}

