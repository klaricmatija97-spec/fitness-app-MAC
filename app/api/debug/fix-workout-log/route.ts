import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workoutLogId = searchParams.get('workoutLogId') || 'deffb33b-7141-4f81-8baf-aa96ad052b26';
  const sessionId = searchParams.get('sessionId') || '47982e5a-1a51-4081-888f-24b6c4e14631';

  try {
    const supabase = createServiceClient();

    // 1. Dohvati vježbe iz sesije
    const { data: sessionExercises, error: sessError } = await supabase
      .from('session_exercises')
      .select('id, exercise_name, exercise_name_hr, sets, reps_target, target_rir, primary_muscles')
      .eq('session_id', sessionId)
      .order('order_index');

    if (sessError) {
      return NextResponse.json({ error: 'Session exercises error', details: sessError.message });
    }

    // 2. Provjeri koliko vježbi već ima u logu
    const { data: existingExercises, error: existError } = await supabase
      .from('workout_log_exercises')
      .select('id, exercise_name')
      .eq('workout_log_id', workoutLogId);

    if (existError) {
      return NextResponse.json({ error: 'Existing exercises error', details: existError.message });
    }

    // 3. Ako već ima vježbi, ne radi ništa
    if (existingExercises && existingExercises.length > 0) {
      return NextResponse.json({
        message: 'Exercises already exist',
        existingCount: existingExercises.length,
        exercises: existingExercises,
      });
    }

    // 4. Insertaj vježbe
    // Parse reps_target (format "6-8") to get min and max
    const parseRepsRange = (repsTarget: string | null): { min: number | null; max: number | null } => {
      if (!repsTarget) return { min: null, max: null };
      const parts = repsTarget.split('-').map(p => parseInt(p.trim(), 10));
      if (parts.length === 2) {
        return { min: parts[0], max: parts[1] };
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        return { min: parts[0], max: parts[0] };
      }
      return { min: null, max: null };
    };

    const exercisesToInsert = (sessionExercises || []).map((ex: any) => {
      const reps = parseRepsRange(ex.reps_target);
      return {
        workout_log_id: workoutLogId,
        exercise_name: ex.exercise_name_hr || ex.exercise_name || 'Nepoznata vježba',
        exercise_name_en: ex.exercise_name,
        primary_muscles: ex.primary_muscles || [],
        planned_sets: ex.sets || 3,
        planned_reps_min: reps.min,
        planned_reps_max: reps.max,
        planned_rir: ex.target_rir,
        completed_sets: 0,
      };
    });

    if (exercisesToInsert.length === 0) {
      return NextResponse.json({
        error: 'No exercises found in session',
        sessionId,
        sessionExercisesRaw: sessionExercises,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('workout_log_exercises')
      .insert(exercisesToInsert)
      .select();

    if (insertError) {
      return NextResponse.json({
        error: 'Insert failed',
        details: insertError.message,
        code: insertError.code,
        exercisesToInsert,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Exercises inserted successfully',
      count: inserted?.length,
      exercises: inserted,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: String(error) });
  }
}

