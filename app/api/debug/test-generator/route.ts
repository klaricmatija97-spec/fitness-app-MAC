import { NextResponse } from "next/server";
import { buildProgram } from "@/lib/pro-generator/generator";

export async function GET() {
  try {
    // Test sa minimalnim parametrima
    const input = {
      clientId: "00000000-0000-0000-0000-000000000000", // Dummy UUID
      cilj: "hipertrofija" as const,
      razina: "srednji" as const,
      treninziTjedno: 3,
      trajanjeTjedana: 4,
      gender: "male" as const,
    };

    console.log("[test-generator] Pokrećem buildProgram...");
    const program = await buildProgram(input);

    // Provjeri da li ima vježbi
    let ukupnoVjezbi = 0;
    let treninziInfo: any[] = [];

    for (const mezo of program.mezociklusi) {
      for (const tjedan of mezo.tjedni) {
        for (const trening of tjedan.treninzi) {
          ukupnoVjezbi += trening.glavniDio.length;
          if (treninziInfo.length < 3) {
            treninziInfo.push({
              naziv: trening.naziv,
              brojVjezbi: trening.glavniDio.length,
              vjezbe: trening.glavniDio.slice(0, 3).map(v => ({
                naziv: v.naziv,
                setovi: v.setovi,
                ponavljanja: v.ponavljanja,
              })),
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      programNaziv: program.planName,
      cilj: program.cilj,
      ukupnoMezociklusa: program.mezociklusi.length,
      ukupnoTjedana: program.ukupnoTjedana,
      ukupnoVjezbi,
      primjerTreninzi: treninziInfo,
    });
  } catch (error) {
    console.error("[test-generator] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
