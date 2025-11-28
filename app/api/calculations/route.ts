import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateUserCalculations } from "@/lib/data/userData";

const calculationsSchema = z.object({
  clientId: z.string().uuid(),
  bmr: z.number(),
  tdee: z.number(),
  targetCalories: z.number(),
  goalType: z.enum(["lose", "maintain", "gain"]),
  macros: z.object({
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
  }),
  activityLevel: z.string(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = calculationsSchema.parse(json);

    // Spremi lokalno (prioritet)
    try {
      updateUserCalculations(data.clientId, {
        bmr: data.bmr,
        tdee: data.tdee,
        targetCalories: data.targetCalories,
        goalType: data.goalType,
        macros: data.macros,
        activityLevel: data.activityLevel,
      });
      console.log(`✅ Kalkulacije spremljene lokalno za korisnika ${data.clientId}`);
    } catch (localError) {
      console.warn("Greška pri spremanju lokalno:", localError);
    }

    // Spremi u Supabase (fallback/sinkronizacija)
    try {
      const supabase = createServiceClient();
      const { error } = await supabase
        .from("client_calculations")
        .upsert({
          client_id: data.clientId,
          bmr: data.bmr,
          tdee: data.tdee,
          target_calories: data.targetCalories,
          goal_type: data.goalType,
          protein_grams: data.macros.protein,
          carbs_grams: data.macros.carbs,
          fats_grams: data.macros.fats,
          activity_level: data.activityLevel,
        }, {
          onConflict: "client_id",
        });

      if (error) {
        console.warn("Greška pri spremanju u Supabase (lokalno je spremljeno):", error);
      }
    } catch (supabaseError) {
      console.warn("Greška pri spremanju u Supabase (lokalno je spremljeno):", supabaseError);
    }

    return NextResponse.json({
      ok: true,
      message: "Izračuni su spremljeni",
    });
  } catch (error) {
    console.error("[calculations] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri spremanju",
      },
      { status: 400 }
    );
  }
}

