/**
 * POST /api/workout-plan/generate
 * 
 * Generiše tjedni trening plan za klijenta i sprema ga u bazu
 * 
 * Body/Query: { userId: string (UUID) }
 */

import { NextResponse } from "next/server";
import {
  generateWorkoutPlanForClient,
  saveWorkoutPlanToSupabase,
} from "@/lib/services/workoutPlanGenerator";
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
      // Ako je u query parametrima
      userId = queryUserId;
    } else {
      // Pokušaj iz body-a
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

    // Generiši trening plan
    const workoutPlan = await generateWorkoutPlanForClient(validatedData.userId);

    // Spremi plan u bazu
    const savedPlan = await saveWorkoutPlanToSupabase(validatedData.userId, workoutPlan);

    // Vrati finalni plan
    return NextResponse.json({
      ok: true,
      message: "Trening plan je uspješno generiran i spremljen",
      plan: workoutPlan,
      savedPlanId: savedPlan.id,
    });
  } catch (error) {
    console.error("[workout-plan/generate] error:", error);

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
          error instanceof Error ? error.message : "Greška pri generiranju trening plana",
      },
      { status: 500 }
    );
  }
}

