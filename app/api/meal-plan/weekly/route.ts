/**
 * POST /api/meal-plan/weekly
 * 
 * LOKALNI generator tjednog plana prehrane
 * Koristi SAMO lokalne podatke (meal_components.json + foods-database.ts)
 * NE koristi Supabase
 * 
 * Body: { calculations: { targetCalories, targetProtein, targetCarbs, targetFat, goalType } }
 */

import { NextResponse } from "next/server";
import { generateWeeklyMealPlanLocal } from "@/lib/services/localMealPlanGenerator";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // LOKALNI GENERATOR - calculations su obavezni
    if (!body.calculations) {
      return NextResponse.json(
        { 
          ok: false, 
          message: "calculations objekt je obavezan",
          example: {
            calculations: {
              targetCalories: 2000,
              targetProtein: 150,
              targetCarbs: 200,
              targetFat: 67,
              goalType: "maintain"
            }
          }
        },
        { status: 400 }
      );
    }

    const { calculations, preferences } = body;

    console.log(`\n========================================`);
    console.log(`🚀 LOKALNI TJEDNI GENERATOR - START`);
    console.log(`   Calories: ${calculations.targetCalories}`);
    console.log(`   Macros: P:${calculations.targetProtein}g C:${calculations.targetCarbs}g F:${calculations.targetFat}g`);
    console.log(`   Goal: ${calculations.goalType}`);
    console.log(`========================================\n`);

    // Generiraj tjedni plan lokalno
    const weeklyPlan = await generateWeeklyMealPlanLocal(
      {
        targetCalories: Number(calculations.targetCalories),
        targetProtein: Number(calculations.targetProtein),
        targetCarbs: Number(calculations.targetCarbs),
        targetFat: Number(calculations.targetFat),
        goalType: calculations.goalType,
        bmr: calculations.bmr ? Number(calculations.bmr) : undefined,
        tdee: calculations.tdee ? Number(calculations.tdee) : undefined,
      },
      preferences
    );

    console.log(`\n========================================`);
    console.log(`✅ TJEDNI PLAN USPJEŠNO GENERIRAN (lokalno)!`);
    console.log(`========================================\n`);

    return NextResponse.json({
      ok: true,
      message: "Tjedni plan prehrane uspješno generiran (lokalno)",
      plan: weeklyPlan,
      weeklyAverage: weeklyPlan.weeklyAverage,
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
  return NextResponse.json(
    { 
      ok: false, 
      message: "Koristi POST metodu s calculations objektom",
      example: {
        calculations: {
          targetCalories: 2000,
          targetProtein: 150,
          targetCarbs: 200,
          targetFat: 67,
          goalType: "maintain"
        }
      }
    },
    { status: 400 }
  );
}
