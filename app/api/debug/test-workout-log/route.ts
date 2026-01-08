import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Debug endpoint za testiranje workout log kreiranja bez auth
 */
export async function POST() {
  try {
    const supabase = createServiceClient();
    
    const clientId = '9e1ecaed-697f-4cb8-8648-0e0d4ec0fcd9';
    const sessionId = 'f78a8ed9-121c-4c9e-8131-70dd09d1a5d5';
    const programId = '5d3ad960-ed96-4f4e-a092-d6fb9ed3f5fd';
    const trainerId = '5ce598bc-3d74-4ca5-a2e4-e7008e06d916';
    
    // Dohvati sesiju
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .select('id, week_number, program_id')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      return NextResponse.json({ error: 'Session not found', details: sessionError.message }, { status: 404 });
    }
    
    // Dohvati vježbe
    const { data: exercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select('id, exercise_name, exercise_name_hr, sets, reps_target, target_rir, order_index, primary_muscles')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true });
    
    if (exercisesError) {
      return NextResponse.json({ error: 'Exercises error', details: exercisesError.message }, { status: 500 });
    }
    
    // Kreiraj workout log
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .insert({
        id: uuidv4(),
        client_id: clientId,
        program_id: programId,
        session_id: sessionId,
        week_number: session.week_number,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(), // Required field - placeholder
        duration_minutes: 0,
        status: 'completed',
        total_exercises: exercises?.length || 0,
        completed_exercises: 0,
        total_sets: exercises?.reduce((sum: number, ex: any) => sum + (ex.sets || 0), 0) || 0,
        completed_sets: 0,
        total_volume: 0,
      })
      .select('id')
      .single();
    
    if (logError) {
      return NextResponse.json({ 
        error: 'Failed to create workout log', 
        details: logError.message,
        code: logError.code,
        hint: logError.hint,
      }, { status: 500 });
    }
    
    // Kreiraj workout_log_exercises za svaku vježbu (minimalne required polja)
    const exercisesToInsert = (exercises || []).map((ex: any, index: number) => ({
      workout_log_id: workoutLog.id,
      exercise_name: ex.exercise_name_hr || ex.exercise_name || 'Nepoznata vježba',
      planned_sets: ex.sets || 3,
    }));

    let exInsertError = null;
    if (exercisesToInsert.length > 0) {
      const result = await supabase.from('workout_log_exercises').insert(exercisesToInsert);
      exInsertError = result.error;
    }
    
    // Dohvati kreirane exercise logove
    const { data: exerciseLogs, error: selectError } = await supabase
      .from('workout_log_exercises')
      .select('*')
      .eq('workout_log_id', workoutLog.id);
    
    return NextResponse.json({
      success: true,
      workoutLogId: workoutLog.id,
      exercises: exerciseLogs || [],
      exercisesCount: exerciseLogs?.length || 0,
      sessionExercises: exercises || [],
      sessionExercisesCount: exercises?.length || 0,
      exInsertError: exInsertError ? { message: exInsertError.message, code: exInsertError.code } : null,
    });
    
  } catch (error) {
    console.error('Test workout log error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}

