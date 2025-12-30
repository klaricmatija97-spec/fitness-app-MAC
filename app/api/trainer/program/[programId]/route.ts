/**
 * Trainer Program API
 * ===================
 * GET /api/trainer/program/:programId
 * 
 * Dohvaća program details za trainera (flat structure)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Provjeri autentifikaciju
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const { programId } = await params;
    const supabase = createServiceClient();

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
          error: 'Program not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // TODO: Provjeri da trainer ima pristup ovom programu
    // Za MVP, pretpostavljamo da svaki trainer ima pristup

    // Dohvati client info
    let clientName = null;
    if (program.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', program.client_id)
        .single();
      clientName = client?.name || null;
    }

    // Dohvati mesocycles
    const { data: mesocycles } = await supabase
      .from('mesocycles')
      .select('id, name, focus as type, week_start, week_end, order_index, is_manual')
      .eq('program_id', programId)
      .order('order_index');

    // Dohvati sessions
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select('id, mesocycle_id, week_number, day_of_week, split_name as name, is_manual')
      .eq('program_id', programId)
      .order('week_number')
      .order('day_of_week');

    // Izračunaj exercises count po sesiji
    const sessionsWithCount = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count } = await supabase
          .from('session_exercises')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id);

        return {
          ...session,
          exercisesCount: count || 0,
        };
      })
    );

    // Dohvati exercises (flat structure)
    const { data: exercises } = await supabase
      .from('session_exercises')
      .select(
        'id, session_id, exercise_id as exerciseId, exercise_name as name, exercise_name_hr as nameHr, order_index as orderIndex, sets, reps_target as repsTarget, tempo, rest_seconds as restSeconds, target_rpe as targetRPE, target_rir as targetRIR, is_locked as isLocked, is_manual as isManual'
      )
      .in(
        'session_id',
        (sessions || []).map((s) => s.id)
      )
      .order('session_id')
      .order('order_index');

    return NextResponse.json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          status: program.status,
          goal: program.goal,
          level: program.level,
          splitType: program.split_type,
          durationWeeks: program.duration_weeks,
          sessionsPerWeek: program.sessions_per_week,
          startDate: program.start_date,
          endDate: program.end_date,
          clientId: program.client_id,
          clientName,
        },
        mesocycles: mesocycles || [],
        sessions: sessionsWithCount,
        exercises: exercises || [],
      },
    });
  } catch (error) {
    console.error('[trainer/program] Unexpected error:', error);
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

