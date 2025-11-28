/**
 * API ruta za spremanje i dohvat korisničkih kalkulacija
 * 
 * POST - spremi kalkulacije
 * GET - dohvati kalkulacije
 */

import { NextResponse } from "next/server";
import { saveUserCalculations, getUserCalculations } from "@/lib/server/userCalculations";
import { validateUserCalculations, type UserCalculations } from "@/lib/types/userCalculations";
import { z } from "zod";

const calculationsSchema = z.object({
  totalCalories: z.number().positive(),
  proteinGrams: z.number().positive(),
  carbGrams: z.number().positive(),
  fatGrams: z.number().positive(),
  bmr: z.number().optional(),
  tdee: z.number().optional(),
  goalType: z.enum(["lose", "maintain", "gain"]).optional(),
  activityLevel: z.string().optional(),
});

/**
 * POST - Spremi korisničke kalkulacije
 */
export async function POST(request: Request) {
  try {
    // Dohvati userId iz body-a ili query parametara
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");

    let userId: string;
    let body: any;

    if (queryUserId) {
      userId = queryUserId;
      body = await request.json().catch(() => ({}));
    } else {
      body = await request.json();
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId je obavezan",
        },
        { status: 400 }
      );
    }

    // Validiraj kalkulacije
    const calcData = calculationsSchema.parse({
      totalCalories: body.totalCalories,
      proteinGrams: body.proteinGrams,
      carbGrams: body.carbGrams,
      fatGrams: body.fatGrams,
      bmr: body.bmr,
      tdee: body.tdee,
      goalType: body.goalType,
      activityLevel: body.activityLevel,
    });

    // Spremi u Supabase
    await saveUserCalculations(userId, calcData);

    return NextResponse.json({
      success: true,
      message: "Kalkulacije su spremljene",
    });
  } catch (error) {
    console.error("[user/calculations POST] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Neispravni podaci",
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Greška pri spremanju kalkulacija",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Dohvati korisničke kalkulacije
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId je obavezan",
        },
        { status: 400 }
      );
    }

    const calculations = await getUserCalculations(userId);

    if (!calculations) {
      return NextResponse.json(
        {
          success: false,
          error: "No calculations",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCalories: calculations.totalCalories,
        proteinGrams: calculations.proteinGrams,
        carbGrams: calculations.carbGrams,
        fatGrams: calculations.fatGrams,
        bmr: calculations.bmr,
        tdee: calculations.tdee,
        goalType: calculations.goalType,
        activityLevel: calculations.activityLevel,
      },
    });
  } catch (error) {
    console.error("[user/calculations GET] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Greška pri dohvatu kalkulacija",
      },
      { status: 500 }
    );
  }
}

