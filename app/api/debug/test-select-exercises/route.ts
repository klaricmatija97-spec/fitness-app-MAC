import { NextResponse } from 'next/server';
import { selectExercises } from '@/lib/pro-generator';

export async function GET() {
  try {
    // Test sa tipičnim parametrima za "push" trening
    const vjezbe = await selectExercises({
      misicneGrupe: ['chest', 'prsa', 'shoulders', 'ramena', 'triceps'],
      razina: 'srednji',
      cilj: 'hipertrofija',
      dostupnaOprema: ['sipka', 'bucice', 'sprava', 'kabel'],
      izbjegavajVjezbe: [],
      jeDeload: false,
      volumenModifikator: 1.0,
      intenzitetModifikator: 1.0,
      tjedanBroj: 1,
      redniBrojTreninga: 1,
      mezociklusTip: 'akumulacija',
      gender: 'male',
    });

    return NextResponse.json({
      success: true,
      exercisesReturned: vjezbe.length,
      exercises: vjezbe.map(v => ({
        id: v.id,
        naziv: v.naziv,
        tipVjezbe: v.tipVjezbe,
        setovi: v.setovi,
        ponavljanja: v.ponavljanja,
      })),
    });
  } catch (error) {
    console.error('[test-select-exercises] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
