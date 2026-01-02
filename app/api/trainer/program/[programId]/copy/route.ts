/**
 * Trainer Program Copy API
 * ========================
 * POST /api/trainer/program/[programId]/copy
 * 
 * Kopira postojeći program za novog klijenta
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';
import { z } from 'zod';

const supabase = createServiceClient();

const CopyProgramSchema = z.object({
  targetClientId: z.string().uuid({ message: 'targetClientId mora biti validan UUID' }),
  newName: z.string().min(1).max(255).optional(),
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
    const parseResult = CopyProgramSchema.safeParse(body);

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

    const { targetClientId, newName } = parseResult.data;
    const trainerId = auth.userId;

    // Dohvati originalni program
    const { data: originalProgram, error: programError } = await supabase
      .from('training_programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError || !originalProgram) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program nije pronađen',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Provjeri da li target klijent pripada treneru
    const { data: targetClient, error: clientError } = await supabase
      .from('clients')
      .select('id, trainer_id')
      .eq('id', targetClientId)
      .eq('trainer_id', trainerId)
      .single();

    if (clientError || !targetClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Klijent nije pronađen ili nemate pristup',
          code: 'CLIENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Kreiraj novi program (kopiju)
    const { data: newProgram, error: insertError } = await supabase
      .from('training_programs')
      .insert({
        client_id: targetClientId,
        name: newName || `${originalProgram.name} (kopija)`,
        goal: originalProgram.goal,
        level: originalProgram.level,
        split_type: originalProgram.split_type,
        duration_weeks: originalProgram.duration_weeks,
        sessions_per_week: originalProgram.sessions_per_week,
        status: 'draft', // Kopija je uvijek draft
        source: originalProgram.source || 'auto',
        exercises: originalProgram.exercises || {},
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[trainer/program/copy] Error creating copy:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Nije moguće kopirati program',
          code: 'DB_ERROR',
        },
        { status: 500 }
      );
    }

    // Kopiraj mezocikluse
    const { data: originalMesocycles, error: mesocyclesError } = await supabase
      .from('mesocycles')
      .select('*')
      .eq('program_id', programId)
      .order('order_index');

    if (mesocyclesError) {
      console.error('[trainer/program/copy] Error fetching mesocycles:', mesocyclesError);
    } else if (originalMesocycles && originalMesocycles.length > 0) {
      const newMesocycles = originalMesocycles.map((m: any) => ({
        program_id: newProgram.id,
        name: m.name,
        focus: m.focus,
        trajanje_tjedana: m.trajanje_tjedana,
        week_start: m.week_start,
        week_end: m.week_end,
        order_index: m.order_index,
        progression_type: m.progression_type,
        is_manual: m.is_manual,
      }));

      const { error: insertMesocyclesError } = await supabase
        .from('mesocycles')
        .insert(newMesocycles);

      if (insertMesocyclesError) {
        console.error('[trainer/program/copy] Error copying mesocycles:', insertMesocyclesError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        newProgramId: newProgram.id,
        message: 'Program je uspješno kopiran',
      },
    });
  } catch (error) {
    console.error('[trainer/program/copy] Unexpected error:', error);
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
