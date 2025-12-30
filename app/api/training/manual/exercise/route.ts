/**
 * Manual Exercise API
 * ====================
 * POST   - Dodaje vježbu u sesiju
 * PATCH  - Ažurira vježbu
 * DELETE - Briše vježbu
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  dodajManualuVjezbu,
  azurirajVjezbu,
  obrisiVjezbu,
} from '@/lib/pro-generator';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateExerciseSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId mora biti validan UUID' }),
  exerciseId: z.string().min(1, { message: 'exerciseId je obavezan' }),
  nazivHr: z.string().min(1, { message: 'nazivHr je obavezan' }).max(200),
  nazivEn: z.string().max(200).optional(),
  redniBroj: z.number().int().min(1),
  setovi: z.number().int().min(1).max(20),
  ponavljanja: z.string().min(1).max(20),
  odmorSekunde: z.number().int().min(0).max(600).optional(),
  tempo: z.string().max(20).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rir: z.number().int().min(0).max(10).optional(),
  primarniMisici: z.array(z.string()).optional(),
  sekundarniMisici: z.array(z.string()).optional(),
  oprema: z.string().max(50).optional(),
  mehanika: z.enum(['compound', 'isolation']).optional(),
  napomene: z.string().max(500).optional(),
  supersetGrupa: z.number().int().min(1).optional(),
});

const UpdateExerciseSchema = z.object({
  exerciseId: z.string().uuid({ message: 'exerciseId mora biti validan UUID' }),
  nazivHr: z.string().min(1).max(200).optional(),
  nazivEn: z.string().max(200).optional(),
  redniBroj: z.number().int().min(1).optional(),
  setovi: z.number().int().min(1).max(20).optional(),
  ponavljanja: z.string().min(1).max(20).optional(),
  odmorSekunde: z.number().int().min(0).max(600).optional(),
  tempo: z.string().max(20).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  rir: z.number().int().min(0).max(10).optional().nullable(),
  napomene: z.string().max(500).optional().nullable(),
  supersetGrupa: z.number().int().min(1).optional().nullable(),
});

const DeleteExerciseSchema = z.object({
  exerciseId: z.string().uuid({ message: 'exerciseId mora biti validan UUID' }),
});

// ============================================
// POST - Dodaj vježbu
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateExerciseSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const result = await dodajManualuVjezbu(parseResult.data);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        exerciseId: result.exerciseId,
        isManual: true,
        poruka: 'Vježba dodana.',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    }, { status: 500 });
  }
}

// ============================================
// PATCH - Ažuriraj vježbu
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = UpdateExerciseSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const { exerciseId, ...updates } = parseResult.data;
    const result = await azurirajVjezbu(exerciseId, updates);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        exerciseId,
        poruka: 'Vježba ažurirana.',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    }, { status: 500 });
  }
}

// ============================================
// DELETE - Obriši vježbu
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = DeleteExerciseSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const result = await obrisiVjezbu(parseResult.data.exerciseId);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        poruka: 'Vježba obrisana.',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    }, { status: 500 });
  }
}

// ============================================
// GET - Info
// ============================================

export async function GET() {
  return NextResponse.json({
    endpoints: {
      'POST /api/training/manual/exercise': {
        opis: 'Dodaje vježbu u sesiju',
        parametri: {
          sessionId: 'UUID sesije (obavezno)',
          exerciseId: 'ID vježbe iz library-a (obavezno)',
          nazivHr: 'Hrvatski naziv vježbe',
          nazivEn: 'Engleski naziv (opcionalno)',
          redniBroj: 'Redni broj u treningu',
          setovi: 'Broj setova (1-20)',
          ponavljanja: 'Ponavljanja (npr. "8-12" ili "5")',
          odmorSekunde: 'Odmor između setova (0-600)',
          tempo: 'Tempo izvođenja (npr. "3-1-2-0")',
          rpe: 'RPE (1-10)',
          rir: 'RIR - Reps In Reserve (0-10)',
          primarniMisici: 'Array primarnih mišićnih grupa',
          sekundarniMisici: 'Array sekundarnih grupa',
          oprema: 'Potrebna oprema',
          mehanika: 'compound ili isolation',
          napomene: 'Napomene trenera',
          supersetGrupa: 'ID superset grupe (za povezane vježbe)',
        },
      },
      'PATCH /api/training/manual/exercise': {
        opis: 'Ažurira vježbu',
        parametri: {
          exerciseId: 'UUID vježbe (obavezno)',
          '...': 'Svi ostali parametri su opcionalni',
        },
      },
      'DELETE /api/training/manual/exercise': {
        opis: 'Briše vježbu iz sesije',
        parametri: {
          exerciseId: 'UUID vježbe (obavezno)',
        },
      },
    },
    primjer: {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      exerciseId: 'bench_press',
      nazivHr: 'Potisak s klupe',
      nazivEn: 'Bench Press',
      redniBroj: 1,
      setovi: 4,
      ponavljanja: '8-10',
      odmorSekunde: 120,
      tempo: '3-1-2-0',
      rpe: 8,
      primarniMisici: ['prsa'],
      sekundarniMisici: ['triceps', 'ramena'],
      oprema: 'sipka',
      mehanika: 'compound',
    },
  });
}

