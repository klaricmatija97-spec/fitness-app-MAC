import { NextResponse } from 'next/server';
import { buildProgram } from '@/lib/pro-generator';

export async function GET() {
  try {
    // Test full program generation
    const program = await buildProgram({
      clientId: 'test-client-id',
      trenerId: 'test-trainer-id',
      cilj: 'hipertrofija',
      razina: 'srednji',
      treninziTjedno: 3,
      trajanjeTjedana: 4,
      dostupnaOprema: ['sipka', 'bucice', 'sprava', 'kabel'],
      gender: 'male',
    });

    // Analiziraj strukturu
    let ukupnoVjezbi = 0;
    const analiza: any[] = [];
    
    for (const mez of program.mezociklusi) {
      for (const tjedan of mez.tjedni) {
        for (const trening of tjedan.treninzi) {
          ukupnoVjezbi += trening.glavniDio.length;
          analiza.push({
            mezociklus: mez.naziv,
            tjedan: tjedan.tjedanBroj,
            trening: trening.naziv,
            brojVjezbi: trening.glavniDio.length,
            vjezbe: trening.glavniDio.slice(0, 3).map(v => v.naziv),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      programId: program.id,
      programName: program.planName,
      ukupnoMezociklusa: program.mezociklusi.length,
      ukupnoVjezbi,
      analiza: analiza.slice(0, 10), // Prvih 10 za pregled
      PROBLEM: ukupnoVjezbi === 0 ? 'VJEŽBE SE NE GENERIRAJU!' : null,
    });
  } catch (error) {
    console.error('[test-full-generate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
