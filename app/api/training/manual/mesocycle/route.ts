/**
 * Manual Mesocycle API
 * ====================
 * POST   - Kreira novi mezociklus
 * PATCH  - Ažurira mezociklus
 * DELETE - Briše mezociklus
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  kreirajManualniMezociklus,
  azurirajMezociklus,
  obrisiMezociklus,
} from '@/lib/pro-generator';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateMesocycleSchema = z.object({
  programId: z.string().uuid({ message: 'programId mora biti validan UUID' }),
  naziv: z.string().min(1, { message: 'naziv je obavezan' }).max(100),
  tip: z.enum(['volume', 'intensity', 'peak', 'deload'], {
    message: 'tip mora biti: volume, intensity, peak ili deload',
  }),
  tjedanOd: z.number().int().min(1),
  tjedanDo: z.number().int().min(1),
  fokusOpis: z.string().max(500).optional(),
  napomene: z.string().max(1000).optional(),
  redniBroj: z.number().int().min(1).optional(),
});

const UpdateMesocycleSchema = z.object({
  mesocycleId: z.string().uuid({ message: 'mesocycleId mora biti validan UUID' }),
  naziv: z.string().min(1).max(100).optional(),
  tip: z.enum(['volume', 'intensity', 'peak', 'deload']).optional(),
  tjedanOd: z.number().int().min(1).optional(),
  tjedanDo: z.number().int().min(1).optional(),
  fokusOpis: z.string().max(500).optional().nullable(),
  napomene: z.string().max(1000).optional().nullable(),
  redniBroj: z.number().int().min(1).optional(),
});

const DeleteMesocycleSchema = z.object({
  mesocycleId: z.string().uuid({ message: 'mesocycleId mora biti validan UUID' }),
});

// ============================================
// POST - Kreiraj mezociklus
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateMesocycleSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    // Provjeri da je tjedanDo >= tjedanOd
    if (parseResult.data.tjedanDo < parseResult.data.tjedanOd) {
      return NextResponse.json({
        success: false,
        error: 'tjedanDo mora biti veći ili jednak tjedanOd',
      }, { status: 400 });
    }
    
    const result = await kreirajManualniMezociklus(parseResult.data);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        mesocycleId: result.mesocycleId,
        isManual: true,
        poruka: 'Mezociklus kreiran. Sada možete dodati sesije.',
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
// PATCH - Ažuriraj mezociklus
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = UpdateMesocycleSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const { mesocycleId, ...updates } = parseResult.data;
    const result = await azurirajMezociklus(mesocycleId, updates);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        mesocycleId,
        poruka: 'Mezociklus ažuriran.',
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
// DELETE - Obriši mezociklus
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = DeleteMesocycleSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const result = await obrisiMezociklus(parseResult.data.mesocycleId);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        poruka: 'Mezociklus obrisan.',
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
      'POST /api/training/manual/mesocycle': {
        opis: 'Kreira novi mezociklus',
        parametri: {
          programId: 'UUID programa (obavezno)',
          naziv: 'Naziv mezociklusa',
          tip: 'Tip: volume, intensity, peak, deload',
          tjedanOd: 'Prvi tjedan mezociklusa',
          tjedanDo: 'Zadnji tjedan mezociklusa',
          fokusOpis: 'Opis fokusa (opcionalno)',
          napomene: 'Napomene (opcionalno)',
          redniBroj: 'Redni broj (opcionalno, auto-increment)',
        },
      },
      'PATCH /api/training/manual/mesocycle': {
        opis: 'Ažurira mezociklus',
        parametri: {
          mesocycleId: 'UUID mezociklusa (obavezno)',
          '...': 'Svi ostali parametri su opcionalni',
        },
      },
      'DELETE /api/training/manual/mesocycle': {
        opis: 'Briše mezociklus i sve njegove sesije',
        parametri: {
          mesocycleId: 'UUID mezociklusa (obavezno)',
        },
      },
    },
    tipovi: {
      volume: 'Akumulacija - visok volumen, umjeren intenzitet',
      intensity: 'Intenzifikacija - niži volumen, visok intenzitet',
      peak: 'Realizacija - peak performance',
      deload: 'Deload - oporavak, smanjeni volumen i intenzitet',
    },
  });
}

