/**
 * Manual Program API
 * ==================
 * POST /api/training/manual/program - Kreira prazan program za ručno popunjavanje
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { kreirajManualniProgram, dohvatiUnifiedProgramView } from '@/lib/pro-generator';

// ============================================
// VALIDATION SCHEMA
// ============================================

const ManualProgramSchema = z.object({
  clientId: z.string().uuid({ message: 'clientId mora biti validan UUID' }),
  trenerId: z.string().uuid().optional(),
  naziv: z.string().min(1, { message: 'naziv je obavezan' }).max(100),
  cilj: z.string().min(1),
  razina: z.string().min(1),
  splitTip: z.string().min(1),
  trajanjeTjedana: z.number().int().min(1).max(52),
  treninziTjedno: z.number().int().min(1).max(7),
  napomene: z.string().max(1000).optional(),
});

// ============================================
// POST - Kreiraj prazan program
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ManualProgramSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const result = await kreirajManualniProgram(parseResult.data);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        programId: result.programId,
        source: 'manual',
        poruka: 'Program kreiran. Sada možete dodati mezocikluse, tjedne i treninge.',
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
    endpoint: 'POST /api/training/manual/program',
    opis: 'Kreira prazan program za ručno popunjavanje',
    parametri: {
      clientId: 'UUID klijenta (obavezno)',
      trenerId: 'UUID trenera (opcionalno)',
      naziv: 'Naziv programa',
      cilj: 'Cilj (hypertrophy, strength, endurance, general_fitness)',
      razina: 'Razina (beginner, intermediate, advanced)',
      splitTip: 'Split tip (full_body, upper_lower, push_pull_legs, bro_split)',
      trajanjeTjedana: 'Trajanje u tjednima (1-52)',
      treninziTjedno: 'Broj treninga tjedno (1-7)',
      napomene: 'Napomene trenera (opcionalno)',
    },
  });
}

