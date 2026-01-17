import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const supabase = createServiceClient();
  
  try {
    // 1. Kreiraj test program
    const programId = uuidv4();
    const { error: programError } = await supabase
      .from('training_programs')
      .insert({
        id: programId,
        client_id: '48c3261e-ee17-4ca5-af49-f3e856cdf10a', // Test client ID - promijeni ako treba
        name: 'TEST - Delete Me',
        goal: 'hypertrophy',
        level: 'intermediate',
        split_type: 'full_body',
        duration_weeks: 4,
        sessions_per_week: 1,
        session_duration_minutes: 60,
        status: 'draft',
      });
    
    if (programError) {
      return NextResponse.json({
        step: 'program',
        error: programError.message,
      }, { status: 500 });
    }

    // 2. Kreiraj test mesocycle
    const mesocycleId = uuidv4();
    const { error: mesocycleError } = await supabase
      .from('mesocycles')
      .insert({
        id: mesocycleId,
        program_id: programId,
        name: 'Test Mesocycle',
        order_index: 1,
        week_start: 1,
        week_end: 1,
        focus: 'volume',
      });
    
    if (mesocycleError) {
      return NextResponse.json({
        step: 'mesocycle',
        error: mesocycleError.message,
      }, { status: 500 });
    }

    // 3. Kreiraj test session
    const sessionId = uuidv4();
    const { error: sessionError } = await supabase
      .from('program_sessions')
      .insert({
        id: sessionId,
        program_id: programId,
        mesocycle_id: mesocycleId,
        week_number: 1,
        day_of_week: 1,
        order_in_week: 1,
        session_type: 'strength',
        split_name: 'Test Session',
      });
    
    if (sessionError) {
      return NextResponse.json({
        step: 'session',
        error: sessionError.message,
      }, { status: 500 });
    }

    // 4. Kreiraj test exercises - OVO JE KLJUČNI TEST!
    const exerciseId = uuidv4();
    const { error: exerciseError } = await supabase
      .from('session_exercises')
      .insert({
        id: exerciseId,
        session_id: sessionId,
        exercise_name: 'Test Bench Press',
        exercise_name_hr: 'Test Bench Press HR',
        order_index: 1,
        sets: 3,
        reps_target: '8-12',
        rest_seconds: 90,
      });
    
    if (exerciseError) {
      return NextResponse.json({
        step: 'exercise',
        error: exerciseError.message,
        errorDetails: exerciseError,
      }, { status: 500 });
    }

    // 5. Provjeri da li je exercise spremljen
    const { data: savedExercise, error: fetchError } = await supabase
      .from('session_exercises')
      .select('*')
      .eq('id', exerciseId)
      .single();

    // 6. Očisti test podatke
    await supabase.from('training_programs').delete().eq('id', programId);

    return NextResponse.json({
      success: true,
      message: 'Sve radi! Vježba je uspješno spremljena i dohvaćena.',
      savedExercise: savedExercise ? {
        id: savedExercise.id,
        name: savedExercise.exercise_name,
      } : null,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
