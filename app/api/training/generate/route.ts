import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const generateSchema = z.object({
  clientId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const { clientId } = generateSchema.parse(await request.json());
    const supabase = createServiceClient();
    
    // Dohvati podatke klijenta
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ ok: false, message: "Klijent nije pronađen" }, { status: 404 });
    }

    // Generiraj osnovni plan treninga (pojednostavljena verzija)
    const exercises = generateExercisesForGoals(client.goals || [], client.activities || []);
    
    const { data: plan, error } = await supabase
      .from("training_plans")
      .insert({
        client_id: clientId,
        plan_name: "Personalizirani Plan",
        exercises: exercises,
        warmup_type: "bodyweight", // Default
        estimated_calories_burned: 300,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, ...plan });
  } catch (error) {
    console.error("[training/generate] error", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Greška" },
      { status: 400 }
    );
  }
}

function generateExercisesForGoals(goals: string[], activities: string[]): any[] {
  // Osnovni set vježbi - u produkciji bi bio sofisticiraniji
  const baseExercises = [
    { name: "Čučnjevi", sets: 3, reps: 12, rest: 60, alternative: "Čučnjevi sa vlastitim tijelom" },
    { name: "Sklekovi", sets: 3, reps: 10, rest: 45, alternative: "Sklekovi na koljenima" },
    { name: "Trbušnjaci", sets: 3, reps: 15, rest: 30, alternative: "Trbušnjaci s nogama u zraku" },
  ];

  if (goals.includes("gain-muscle") || goals.includes("power")) {
    return [
      ...baseExercises,
      { name: "Mrtvo dizanje", sets: 4, reps: 8, rest: 90, alternative: "Rumunsko mrtvo dizanje" },
      { name: "Bench press", sets: 4, reps: 8, rest: 90, alternative: "Sklekovi" },
    ];
  }

  return baseExercises;
}

