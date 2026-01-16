import { NextResponse } from "next/server";
import { buildProgram, spremiProgram } from "@/lib/pro-generator";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Dohvati bilo kojeg klijenta
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .limit(1);

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: false, error: "Nema klijenata u bazi" });
    }

    const clientId = clients[0].id;
    console.log(`[test-save] Koristi se klijent: ${clients[0].name} (${clientId})`);

    // Generiraj program
    const input = {
      clientId,
      cilj: "hipertrofija" as const,
      razina: "srednji" as const,
      treninziTjedno: 3,
      trajanjeTjedana: 4,
      gender: "male" as const,
    };

    console.log("[test-save] Generiram program...");
    const program = await buildProgram(input);

    // Broji vježbe prije spremanja
    let vjezbiPrijeSpremanja = 0;
    for (const mezo of program.mezociklusi) {
      for (const tjedan of mezo.tjedni) {
        for (const trening of tjedan.treninzi) {
          vjezbiPrijeSpremanja += trening.glavniDio.length;
        }
      }
    }

    console.log(`[test-save] Program ima ${vjezbiPrijeSpremanja} vježbi, spremam...`);

    // Spremi program
    const saveResult = await spremiProgram(program);

    if (!saveResult.success) {
      return NextResponse.json({
        success: false,
        error: saveResult.error,
        vjezbiPrijeSpremanja,
      });
    }

    // Provjeri koliko vježbi je spremljeno
    const { data: sessions } = await supabase
      .from("program_sessions")
      .select("id")
      .eq("program_id", saveResult.programId);

    const sessionIds = (sessions || []).map(s => s.id);

    const { count: vjezbiNakonSpremanja } = await supabase
      .from("session_exercises")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds.length > 0 ? sessionIds : [""]);

    return NextResponse.json({
      success: true,
      programId: saveResult.programId,
      vjezbiPrijeSpremanja,
      vjezbiNakonSpremanja: vjezbiNakonSpremanja || 0,
      brojSesija: sessionIds.length,
      problem: vjezbiNakonSpremanja === 0 ? "VJEŽBE SE NE SPREMAJU!" : null,
    });
  } catch (error) {
    console.error("[test-save] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
