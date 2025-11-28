/**
 * POST /api/meal-plan/pro/swap
 * 
 * Zamjenjuje određeni obrok u PRO planu prehrane
 * 
 * Body: { userId: string, mealType: "breakfast" | "lunch" | "dinner" | "snack" }
 */

import { NextResponse } from "next/server";
import { generateProDailyMealPlan } from "@/lib/services/proMealPlanGenerator";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string().uuid("userId mora biti validan UUID"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validatedData = requestSchema.parse(body);

    // Generiraj novi PRO plan (koristi isti generator kao /generate)
    const fullPlan = await generateProDailyMealPlan(validatedData.userId);

    // Uzmi samo meal za traženi mealType
    const swappedMeal = fullPlan[validatedData.mealType];

    if (!swappedMeal) {
      return NextResponse.json(
        {
          ok: false,
          message: `Nije pronađen meal za tip: ${validatedData.mealType}`,
        },
        { status: 404 }
      );
    }

    // Izračunaj nove total makroe sa zamijenjenim obrokom
    // (za sada vratimo samo meal, total može biti opcionalan)
    const total = fullPlan.total;

    return NextResponse.json({
      ok: true,
      mealType: validatedData.mealType,
      meal: swappedMeal,
      total: total, // Vraćamo total iz novog plana za referencu
    });
  } catch (error) {
    console.error("[meal-plan/pro/swap] error:", error);

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
            : "Greška pri zamjeni obroka",
      },
      { status: 500 }
    );
  }
}

