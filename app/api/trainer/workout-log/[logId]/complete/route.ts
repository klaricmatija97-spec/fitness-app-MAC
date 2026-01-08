/**
 * Trainer Workout Log - Complete Session
 * =======================================
 * PUT /api/trainer/workout-log/:logId/complete
 * 
 * Završava workout log sesiju
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { logId } = await params;
    const body = await request.json().catch(() => ({}));
    const { trainerNotes, status = 'completed' } = body;

    const supabase = createServiceClient();

    // Provjeri workout log i vlasništvo
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .select(`
        id, 
        client_id,
        started_at,
        status,
        total_exercises,
        completed_exercises,
        total_sets,
        completed_sets,
        total_volume,
        client:clients(trainer_id, name)
      `)
      .eq('id', logId)
      .single();

    if (logError || !workoutLog) {
      return NextResponse.json(
        { success: false, error: 'Workout log not found' },
        { status: 404 }
      );
    }

    // Provjeri da klijent pripada treneru
    const client = workoutLog.client as any;
    if (client?.trainer_id !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Provjeri da log nije već završen
    if (workoutLog.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Workout log is already completed' },
        { status: 400 }
      );
    }

    // Izračunaj trajanje
    const startedAt = new Date(workoutLog.started_at);
    const completedAt = new Date();
    const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);

    // Izračunaj adherence score
    const adherenceScore = workoutLog.total_sets > 0
      ? Math.round((workoutLog.completed_sets / workoutLog.total_sets) * 100)
      : 0;

    // Odredi status (completed ili partial)
    let finalStatus = status;
    if (status === 'completed' && adherenceScore < 100) {
      finalStatus = 'partial';
    }

    // Ažuriraj workout log
    const { data: updatedLog, error: updateError } = await supabase
      .from('workout_logs')
      .update({
        completed_at: completedAt.toISOString(),
        duration_minutes: durationMinutes,
        status: finalStatus,
        adherence_score: adherenceScore,
        trainer_notes: trainerNotes || null,
      })
      .eq('id', logId)
      .select()
      .single();

    if (updateError) {
      console.error('[workout-log/complete] Update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to complete workout log' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        workoutLog: {
          id: updatedLog.id,
          clientName: client.name,
          status: updatedLog.status,
          startedAt: updatedLog.started_at,
          completedAt: updatedLog.completed_at,
          durationMinutes: updatedLog.duration_minutes,
          adherenceScore: updatedLog.adherence_score,
          totalExercises: updatedLog.total_exercises,
          completedExercises: updatedLog.completed_exercises,
          totalSets: updatedLog.total_sets,
          completedSets: updatedLog.completed_sets,
          totalVolume: updatedLog.total_volume,
        },
        summary: {
          duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`,
          adherence: `${adherenceScore}%`,
          volume: `${updatedLog.total_volume} kg`,
          exercises: `${updatedLog.completed_exercises}/${updatedLog.total_exercises}`,
          sets: `${updatedLog.completed_sets}/${updatedLog.total_sets}`,
        },
      },
    });
  } catch (error) {
    console.error('[trainer/workout-log/complete] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Dohvati detalje workout loga
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { logId } = await params;
    const supabase = createServiceClient();

    // Dohvati workout log s detaljima
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .select(`
        *,
        client:clients(id, name, trainer_id),
        session:program_sessions(id, split_name, day_of_week),
        program:training_programs(id, name)
      `)
      .eq('id', logId)
      .single();

    if (logError || !workoutLog) {
      return NextResponse.json(
        { success: false, error: 'Workout log not found' },
        { status: 404 }
      );
    }

    // Provjeri vlasništvo
    const client = workoutLog.client as any;
    if (client?.trainer_id !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Dohvati exercise logove sa setovima
    const { data: exerciseLogs } = await supabase
      .from('workout_log_exercises')
      .select(`
        *,
        sets:workout_log_sets(*)
      `)
      .eq('workout_log_id', logId)
      .order('order_in_workout');

    return NextResponse.json({
      success: true,
      data: {
        workoutLog: {
          id: workoutLog.id,
          clientId: workoutLog.client_id,
          clientName: client?.name,
          sessionName: (workoutLog.session as any)?.split_name,
          programName: (workoutLog.program as any)?.name,
          status: workoutLog.status,
          startedAt: workoutLog.started_at,
          completedAt: workoutLog.completed_at,
          durationMinutes: workoutLog.duration_minutes,
          adherenceScore: workoutLog.adherence_score,
          totalExercises: workoutLog.total_exercises,
          completedExercises: workoutLog.completed_exercises,
          totalSets: workoutLog.total_sets,
          completedSets: workoutLog.completed_sets,
          totalVolume: workoutLog.total_volume,
          trainerNotes: workoutLog.trainer_notes,
          clientNotes: workoutLog.client_notes,
        },
        exercises: (exerciseLogs || []).map((ex: any) => ({
          id: ex.id,
          name: ex.exercise_name,
          nameEn: ex.exercise_name_en,
          plannedSets: ex.planned_sets,
          plannedRepsMin: ex.planned_reps_min,
          plannedRepsMax: ex.planned_reps_max,
          plannedRir: ex.planned_rir,
          completedSets: ex.completed_sets,
          sets: (ex.sets || []).map((set: any) => ({
            id: set.id,
            setNumber: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rir: set.rir,
            rpe: set.rpe,
            isWarmup: set.is_warmup,
            completed: set.completed,
            notes: set.notes,
          })),
        })),
      },
    });
  } catch (error) {
    console.error('[trainer/workout-log/get] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

