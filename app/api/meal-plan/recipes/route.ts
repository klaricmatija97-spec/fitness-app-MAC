/**
 * API Route: POST /api/meal-plan/recipes
 * 
 * Generira tjedni plan prehrane koristeći Edamam Recipe Search API
 * Vraća prave recepte s fotografijama i preciznim nutritivnim vrijednostima
 * 
 * Body: { userId: string }
 */

import { NextResponse } from "next/server";
import { generateWeeklyRecipePlan, saveRecipePlanToDatabase } from "@/lib/services/recipeMealPlanGenerator";

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
    console.log(`🚀 RECIPE MEAL PLAN GENERATOR - START`);
    console.log(`📋 User ID: ${userId}`);
    console.log(`========================================\n`);

    // Generiraj tjedni plan s receptima
    const weeklyPlan = await generateWeeklyRecipePlan(userId);

    // Pokušaj spremiti u bazu
    const saveResult = await saveRecipePlanToDatabase(weeklyPlan);
    if (saveResult.success) {
      console.log(`✅ Plan spremljen u bazu: ${saveResult.id}`);
    } else {
      console.warn(`⚠️ Plan nije spremljen u bazu: ${saveResult.error}`);
    }

    console.log(`\n========================================`);
    console.log(`✅ RECIPE PLAN USPJEŠNO GENERIRAN!`);
    console.log(`   Recepata: ${weeklyPlan.days.reduce((sum, d) => sum + d.meals.length, 0)}`);
    console.log(`   Prosjek: ${weeklyPlan.weeklyAverages.calories} kcal`);
    console.log(`========================================\n`);

    return NextResponse.json({
      ok: true,
      message: "Tjedni plan s receptima uspješno generiran",
      plan: weeklyPlan,
      savedToDatabase: saveResult.success,
      savedPlanId: saveResult.id || null,
    });

  } catch (error) {
    console.error("❌ Greška pri generiranju recipe plana:", error);

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

