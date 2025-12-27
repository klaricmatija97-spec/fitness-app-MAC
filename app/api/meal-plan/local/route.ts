/**
 * POST /api/meal-plan/local
 * 
 * LOKALNI generator tjednog plana prehrane
 * NE koristi Supabase - sve podatke prima kroz request body
 * 
 * Body: {
 *   calculations: {
 *     targetCalories: number,
 *     targetProtein: number,
 *     targetCarbs: number,
 *     targetFat: number,
 *     goalType: "lose" | "maintain" | "gain"
 *   },
 *   preferences?: {
 *     allergies?: string,
 *     avoidIngredients?: string,
 *     foodPreferences?: string
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { generateWeeklyMealPlanLocal } from "@/lib/services/localMealPlanGenerator";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Validacija
    if (!body.calculations) {
      return NextResponse.json(
        { ok: false, message: "calculations objekt je obavezan" },
        { status: 400 }
      );
    }

    const { calculations, preferences } = body;

    // Validacija kalkulacija
    const required = ['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat', 'goalType'];
    for (const field of required) {
      if (calculations[field] === undefined || calculations[field] === null) {
        return NextResponse.json(
          { ok: false, message: `Polje calculations.${field} je obavezno` },
          { status: 400 }
        );
      }
    }

    // Validacija goal type
    if (!['lose', 'maintain', 'gain'].includes(calculations.goalType)) {
      return NextResponse.json(
        { ok: false, message: "goalType mora biti 'lose', 'maintain' ili 'gain'" },
        { status: 400 }
      );
    }

    console.log(`\n========================================`);
    console.log(`🚀 LOCAL MEAL PLAN API - START`);
    console.log(`📊 Calories: ${calculations.targetCalories}`);
    console.log(`📊 Macros: P:${calculations.targetProtein}g C:${calculations.targetCarbs}g F:${calculations.targetFat}g`);
    console.log(`🎯 Goal: ${calculations.goalType}`);
    console.log(`========================================\n`);

    // Generiraj plan
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
    console.log(`✅ TJEDNI PLAN USPJEŠNO GENERIRAN!`);
    console.log(`========================================\n`);

    return NextResponse.json({
      ok: true,
      message: "Tjedni plan prehrane uspješno generiran (lokalno)",
      plan: weeklyPlan,
      weeklyAverage: weeklyPlan.weeklyAverage,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error("❌ Greška pri generiranju lokalnog plana:", error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri generiranju plana",
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : undefined)
          : undefined,
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
        },
        preferences: {
          allergies: "optional",
          avoidIngredients: "optional",
          foodPreferences: "optional"
        }
      }
    },
    { status: 400 }
  );
}

