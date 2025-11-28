/**
 * POST /api/meal-plan/weekly
 * 
 * NOVI generator tjednog plana prehrane
 * Koristi SAMO kompozitne obroke iz meal_components.json
 * 
 * Body: { userId: string }
 */

import { NextResponse } from "next/server";
import { generateWeeklyMealPlan, saveWeeklyPlanToSupabase } from "@/lib/services/weeklyMealPlanGenerator";

export async function POST(request: Request) {
  try {
    // Dohvati userId
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");

    let userId: string;

    if (queryUserId) {
      userId = queryUserId;
    } else {
      const body = await request.json().catch(() => ({}));
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "userId je obavezan" },
        { status: 400 }
      );
    }

    console.log(`\n========================================`);
    console.log(`🚀 NOVI TJEDNI GENERATOR - START`);
    console.log(`📋 User ID: ${userId}`);
    console.log(`========================================\n`);

    // Generiraj tjedni plan
    const weeklyPlan = await generateWeeklyMealPlan(userId);

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

