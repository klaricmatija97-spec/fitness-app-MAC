import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const completeSchema = z.object({
  clientId: z.string().uuid(),
  trainingPlanId: z.string().uuid(),
  exercisesCompleted: z.array(z.number()),
  caloriesBurned: z.number().optional(),
  durationMinutes: z.number().optional(),
  watchData: z.any().optional(),
});

export async function POST(request: Request) {
  try {
    const data = completeSchema.parse(await request.json());
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from("workout_sessions")
      .insert({
        client_id: data.clientId,
        training_plan_id: data.trainingPlanId,
        date: new Date().toISOString().split("T")[0],
        exercises_completed: data.exercisesCompleted,
        calories_burned: data.caloriesBurned || null,
        duration_minutes: data.durationMinutes || null,
        watch_data: data.watchData || null,
        completed: true,
      });

    if (error) throw error;

    return NextResponse.json({ ok: true, message: "Trening je spremljen" });
  } catch (error) {
    console.error("[workout/complete] error", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Greška" },
      { status: 400 }
    );
  }
}

