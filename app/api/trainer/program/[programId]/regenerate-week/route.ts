/**
 * Trainer Program Regenerate Week API
 * ===================================
 * POST /api/trainer/program/[programId]/regenerate-week
 * 
 * Regenerira/dopunjava praznine u programu
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';
import { z } from 'zod';
import { fillProgramGaps, type HybridGeneratorInput, type CiljTreninga, type RazinaKorisnika } from '@/lib/pro-generator';

const supabase = createServiceClient();

const RegenerateWeekSchema = z.object({
  weekNumber: z.number().int().min(1).optional(), // Ako nije specificiran, regenerira cijeli program
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = requireTrainer(request);
  if (!auth) {
    return NextResponse.json({
      success: false,
      error: 'Samo treneri mogu pristupiti ovoj ruti',
      code: 'FORBIDDEN',
    }, { status: 403 });
  }

  try {
    const { programId } = await params;
    const body = await request.json();
    const parseResult = RegenerateWeekSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validacija nije prošla',
          detalji: parseResult.error.issues,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Dohvati program
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program nije pronađen',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Provjeri da li program pripada treneru (preko client_id) i dohvati gender
    let clientGender: 'male' | 'female' = 'male'; // Default
    if (program.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('trainer_id, honorific')
        .eq('id', program.client_id)
        .single();

      if (clientError || !client || client.trainer_id !== auth.userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Nemate pristup ovom programu',
            code: 'UNAUTHORIZED',
          },
          { status: 403 }
        );
      }
      
      // Konvertuj honorific u gender
      clientGender = client.honorific === 'mr' ? 'male' : 'female';
    }

    // Konstruiraj HybridGeneratorInput iz postojećeg programa
    const hybridInput: HybridGeneratorInput = {
      programId,
      clientId: program.client_id,
      cilj: (program.goal || 'hipertrofija') as CiljTreninga,
      razina: (program.level || 'srednji') as RazinaKorisnika,
      treninziTjedno: program.sessions_per_week || 3,
      trajanjeTjedana: program.duration_weeks || 4,
      gender: clientGender,
      splitTip: program.split_type || 'full_body',
      popuniSamo: 'sve',
    };

    // Koristi fill-gaps logiku
    const result = await fillProgramGaps(hybridInput);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Nije moguće regenerirati tjedan',
          code: 'GENERATION_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        programId,
        message: 'Program je uspješno dopunjen',
        dodanoMezociklusa: result.dodanoMezociklusa,
        dodanoSesija: result.dodanoSesija,
        dodanoVjezbi: result.dodanoVjezbi,
      },
    });
  } catch (error) {
    console.error('[trainer/program/regenerate-week] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
