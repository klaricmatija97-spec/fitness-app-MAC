/**
 * Manual Session API
 * ===================
 * POST   - Kreira novu sesiju (trening)
 * PATCH  - Ažurira sesiju
 * DELETE - Briše sesiju
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  kreirajManualnuSesiju,
  azurirajSesiju,
  obrisiSesiju,
} from '@/lib/pro-generator';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateSessionSchema = z.object({
  programId: z.string().uuid({ message: 'programId mora biti validan UUID' }),
  mesocycleId: z.string().uuid({ message: 'mesocycleId mora biti validan UUID' }),
  tjedanBroj: z.number().int().min(1),
  danUTjednu: z.number().int().min(1).max(7),
  redniBrojUTjednu: z.number().int().min(1),
  naziv: z.string().min(1, { message: 'naziv je obavezan' }).max(100),
  tipTreninga: z.string().max(50).optional(),
  procijenjanoTrajanje: z.number().int().min(15).max(180).optional(),
  zagrijavanje: z.any().optional(),
  zavrsniDio: z.any().optional(),
  napomene: z.string().max(1000).optional(),
});

const UpdateSessionSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId mora biti validan UUID' }),
  naziv: z.string().min(1).max(100).optional(),
  danUTjednu: z.number().int().min(1).max(7).optional(),
  tjedanBroj: z.number().int().min(1).optional(),
  redniBrojUTjednu: z.number().int().min(1).optional(),
  procijenjanoTrajanje: z.number().int().min(15).max(180).optional(),
  zagrijavanje: z.any().optional().nullable(),
  zavrsniDio: z.any().optional().nullable(),
  napomene: z.string().max(1000).optional().nullable(),
});

const DeleteSessionSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId mora biti validan UUID' }),
});

// ============================================
// POST - Kreiraj sesiju
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateSessionSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const result = await kreirajManualnuSesiju(parseResult.data);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        isManual: true,
        poruka: 'Sesija kreirana. Sada možete dodati vježbe.',
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
// PATCH - Ažuriraj sesiju
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = UpdateSessionSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const { sessionId, ...updates } = parseResult.data;
    const result = await azurirajSesiju(sessionId, updates);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        poruka: 'Sesija ažurirana.',
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
// DELETE - Obriši sesiju
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = DeleteSessionSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const result = await obrisiSesiju(parseResult.data.sessionId);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        poruka: 'Sesija obrisana.',
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
      'POST /api/training/manual/session': {
        opis: 'Kreira novu sesiju (trening)',
        parametri: {
          programId: 'UUID programa (obavezno)',
          mesocycleId: 'UUID mezociklusa (obavezno)',
          tjedanBroj: 'Broj tjedna (1-52)',
          danUTjednu: 'Dan u tjednu (1-7, 1=ponedjeljak)',
          redniBrojUTjednu: 'Redni broj treninga u tjednu',
          naziv: 'Naziv sesije (npr. "Push dan A")',
          tipTreninga: 'Tip (opcionalno)',
          procijenjanoTrajanje: 'Trajanje u minutama (15-180)',
          zagrijavanje: 'JSON objekt zagrijavanja (opcionalno)',
          zavrsniDio: 'JSON objekt završnog dijela (opcionalno)',
          napomene: 'Napomene (opcionalno)',
        },
      },
      'PATCH /api/training/manual/session': {
        opis: 'Ažurira sesiju',
        parametri: {
          sessionId: 'UUID sesije (obavezno)',
          '...': 'Svi ostali parametri su opcionalni',
        },
      },
      'DELETE /api/training/manual/session': {
        opis: 'Briše sesiju i sve njene vježbe',
        parametri: {
          sessionId: 'UUID sesije (obavezno)',
        },
      },
    },
    primjerZagrijavanja: {
      opceZagrijavanje: {
        tip: 'trcanje',
        trajanje: 5,
        intenzitet: 'lagan',
      },
      specificnoZagrijavanje: {
        vjezbe: ['arm_circles', 'hip_circles'],
        trajanje: 5,
      },
    },
  });
}

