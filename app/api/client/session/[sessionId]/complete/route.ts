/**
 * Client Session Complete API
 * ===========================
 * POST /api/client/session/:sessionId/complete
 * 
 * Završava workout session i sprema execution data u workout_logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireClient } from '@/lib/api/auth-helpers';
import { z } from 'zod';

const CompleteSessionSchema = z.object({
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().uuid(),
      exerciseName: z.string().optional(),
      exerciseNameEn: z.string().optional(),
      exerciseType: z.enum(['compound', 'isolation']).optional(),
      primaryMuscles: z.array(z.string()).optional(),
      completedSets: z.array(
        z.object({
          setNumber: z.number().int().min(1),
          reps: z.number().int().min(0),
          load: z.number().min(0).optional(),
          rir: z.number().int().min(0).max(10).optional(),
          rpe: z.number().min(1).max(10).optional(),
          isWarmup: z.boolean().optional(),
          notes: z.string().optional(),
        })
      ),
      painReported: z.boolean().optional(),
      difficultyReported: z.boolean().optional(),
      difficultyLevel: z.number().int().min(1).max(10).optional(),
      notes: z.string().optional(),
      substituted: z.boolean().optional(),
      substitutionReason: z.string().optional(),
    })
  ),
  clientNotes: z.string().optional(),
});

export async function POST(
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
    const body = await request.json();
    const parseResult = CompleteSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Provjeri da session pripada programu klijenta
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .select(`
        id,
        program_id,
        week_id,
        split_name,
        day_of_week
      `)
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

    // Provjeri da program pripada klijentu
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select(`
        id,
        client_id,
        status,
        mesocycle_id:mesocycles(id)
      `)
      .eq('id', session.program_id)
      .eq('client_id', userId)
      .eq('status', 'active')
      .single();

    if (programError || !program) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Dohvati week info za mesocycle_id
    const { data: week } = await supabase
      .from('program_weeks')
      .select('mesocycle_id')
      .eq('id', session.week_id)
      .single();

    const startedAt = new Date(parseResult.data.startedAt);
    const completedAt = new Date(parseResult.data.completedAt);
    const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000 / 60);

    // Izračunaj statistike
    const exercises = parseResult.data.exercises;
    const totalExercises = exercises.length;
    const completedExercises = exercises.filter(
      (ex) => ex.completedSets && ex.completedSets.length > 0
    ).length;

    let totalSets = 0;
    let completedSets = 0;
    let totalVolume = 0;

    exercises.forEach((ex) => {
      totalSets += ex.completedSets.length;
      ex.completedSets.forEach((set) => {
        if (set.reps > 0) {
          completedSets++;
          const weight = set.load || 0;
          totalVolume += set.reps * weight;
        }
      });
    });

    // Izračunaj adherence score
    const adherenceScore = totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100 * 100) / 100
      : 0;

    // Status: completed, partial, ili skipped
    let status: 'completed' | 'partial' | 'skipped' = 'completed';
    if (completedExercises === 0) {
      status = 'skipped';
    } else if (completedExercises < totalExercises) {
      status = 'partial';
    }

    // 1. Kreiraj workout_log
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .insert({
        client_id: userId,
        program_id: session.program_id,
        session_id: sessionId,
        week_id: session.week_id,
        mesocycle_id: week?.mesocycle_id || null,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_minutes: durationMinutes,
        status,
        adherence_score: adherenceScore,
        total_exercises: totalExercises,
        completed_exercises: completedExercises,
        total_sets: totalSets,
        completed_sets: completedSets,
        total_volume: totalVolume,
        client_notes: parseResult.data.clientNotes || null,
      })
      .select('id')
      .single();

    if (logError || !workoutLog) {
      console.error('[workout_logs] Error creating log:', logError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save workout log',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // 2. Kreiraj workout_log_exercises i workout_log_sets
    for (const exercise of exercises) {
      // Dohvati planirane podatke iz session_exercises
      const { data: sessionExercise } = await supabase
        .from('session_exercises')
        .select('sets, reps_min, reps_max, weight_kg, target_rir')
        .eq('id', exercise.exerciseId)
        .single();

      const { data: exerciseLog, error: exerciseLogError } = await supabase
        .from('workout_log_exercises')
        .insert({
          workout_log_id: workoutLog.id,
          exercise_id: exercise.exerciseId,
          exercise_name: exercise.exerciseName || 'Unknown',
          exercise_name_en: exercise.exerciseNameEn || null,
          exercise_type: exercise.exerciseType || null,
          primary_muscles: exercise.primaryMuscles || [],
          planned_sets: sessionExercise?.sets || null,
          planned_reps_min: sessionExercise?.reps_min || null,
          planned_reps_max: sessionExercise?.reps_max || null,
          planned_weight: sessionExercise?.weight_kg || null,
          planned_rir: sessionExercise?.target_rir || null,
          completed_sets: exercise.completedSets.length,
          substituted: exercise.substituted || false,
          substitution_reason: exercise.substitutionReason || null,
          client_notes: exercise.notes || null,
          pain_reported: exercise.painReported || false,
          difficulty_reported: exercise.difficultyReported || false,
          difficulty_level: exercise.difficultyLevel || null,
        })
        .select('id')
        .single();

      if (exerciseLogError || !exerciseLog) {
        console.error('[workout_log_exercises] Error:', exerciseLogError);
        continue; // Nastavi s drugim vježbama
      }

      // 3. Kreiraj workout_log_sets
      for (const set of exercise.completedSets) {
        await supabase
          .from('workout_log_sets')
          .insert({
            workout_log_exercise_id: exerciseLog.id,
            set_number: set.setNumber,
            is_warmup: set.isWarmup || false,
            planned_reps: sessionExercise?.reps_min || null,
            planned_weight: sessionExercise?.weight_kg || null,
            planned_rir: sessionExercise?.target_rir || null,
            completed: set.reps > 0,
            reps: set.reps,
            weight: set.load || null,
            rir: set.rir || null,
            rpe: set.rpe || null,
            notes: set.notes || null,
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        workoutLogId: workoutLog.id,
        sessionId,
        completedAt: completedAt.toISOString(),
        durationMinutes,
        exercisesCompleted: completedExercises,
        totalExercises,
        adherenceScore,
        status,
        totalSets,
        completedSets,
        totalVolume,
      },
    });
  } catch (error) {
    console.error('[client/session/complete] Unexpected error:', error);
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
