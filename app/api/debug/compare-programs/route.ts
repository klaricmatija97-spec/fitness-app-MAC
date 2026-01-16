import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Dohvati sve klijente
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .limit(5);

    const results: any[] = [];

    for (const client of clients || []) {
      // Dohvati programe za klijenta
      const { data: programs } = await supabase
        .from("training_programs")
        .select("id, name, goal, split_type")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      if (!programs || programs.length === 0) continue;

      const clientData: any = {
        clientName: client.name,
        programs: [],
      };

      for (const program of programs) {
        // Dohvati prvu sesiju za svaki program (tjedan 1)
        const { data: sessions } = await supabase
          .from("program_sessions")
          .select("id, split_name, week_number, day_of_week")
          .eq("program_id", program.id)
          .eq("week_number", 1)
          .order("day_of_week")
          .limit(1);

        const session = sessions?.[0];
        let exercises: any[] = [];

        if (session) {
          // Dohvati vježbe za prvu sesiju
          const { data: exData } = await supabase
            .from("session_exercises")
            .select("exercise_name, sets, reps_target, rir_target, tempo")
            .eq("session_id", session.id)
            .order("order_index")
            .limit(5);

          exercises = exData || [];
        }

        clientData.programs.push({
          name: program.name,
          goal: program.goal,
          splitType: program.split_type,
          firstSession: session?.split_name || "N/A",
          exercises: exercises.map((e) => ({
            name: e.exercise_name,
            sets: e.sets,
            reps: e.reps_target,
            rir: e.rir_target,
            tempo: e.tempo,
          })),
        });
      }

      if (clientData.programs.length > 0) {
        results.push(clientData);
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("[compare-programs] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
