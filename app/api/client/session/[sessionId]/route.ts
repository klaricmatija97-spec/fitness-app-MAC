/**
 * Client Session API
 * ==================
 * GET /api/client/session/:sessionId
 * 
 * Dohvaća session details za workout execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireClient } from '@/lib/api/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Provjeri autentifikaciju
    const auth = requireClient(request);
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

    const { userId } = auth;
    const { sessionId } = await params;
    const supabase = createServiceClient();

    // Dohvati session
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .select('id, split_name, week_number, day_of_week, estimated_duration_minutes, program_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Provjeri da session pripada programu klijenta
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, client_id, status')
      .eq('id', session.program_id)
      .eq('client_id', userId)
      .eq('status', 'active')
      .single();

    if (!program) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Dohvati exercises
    const { data: exercises } = await supabase
      .from('session_exercises')
      .select(
        'id, exercise_id as exerciseId, exercise_name as name, exercise_name_hr as nameHr, order_index as orderIndex, sets, reps_target as repsTarget, tempo, rest_seconds as restSeconds, target_rpe as targetRPE, target_rir as targetRIR, primary_muscles as primaryMuscles, secondary_muscles as secondaryMuscles, equipment'
      )
      .eq('session_id', sessionId)
      .order('order_index');

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          name: session.split_name || 'Trening',
          weekNumber: session.week_number,
          dayOfWeek: session.day_of_week,
          estimatedDuration: session.estimated_duration_minutes || 60,
          exercises: (exercises || []).map((ex) => ({
            id: ex.id,
            exerciseId: ex.exerciseId,
            name: ex.name,
            nameHr: ex.nameHr || ex.name,
            orderIndex: ex.orderIndex,
            sets: ex.sets,
            repsTarget: ex.repsTarget,
            tempo: ex.tempo || null,
            restSeconds: ex.restSeconds,
            targetRPE: ex.targetRPE || null,
            targetRIR: ex.targetRIR || null,
            primaryMuscles: ex.primaryMuscles || [],
            secondaryMuscles: ex.secondaryMuscles || [],
            equipment: ex.equipment || null,
          })),
        },
      },
    });
  } catch (error) {
    console.error('[client/session] Unexpected error:', error);
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

