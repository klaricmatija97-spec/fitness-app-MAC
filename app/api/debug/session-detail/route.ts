/**
 * Debug endpoint za provjeru detalja sesije
 * GET /api/debug/session-detail?sessionId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const sessionId = request.nextUrl.searchParams.get('sessionId') || 'f78a8ed9-121c-4c9e-8131-70dd09d1a5d5';
    
    // Dohvati sesiju
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    // Dohvati session_exercises
    const { data: exercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select('*')
      .eq('session_id', sessionId);
    
    // Dohvati s join
    const { data: sessionWithExercises, error: joinError } = await supabase
      .from('program_sessions')
      .select(`
        id,
        split_name,
        session_exercises (
          id,
          exercise_order,
          sets,
          reps_min,
          reps_max,
          exercise_id
        )
      `)
      .eq('id', sessionId)
      .single();
    
    return NextResponse.json({
      session,
      sessionError: sessionError?.message,
      exercises,
      exercisesCount: exercises?.length || 0,
      exercisesError: exercisesError?.message,
      sessionWithExercises,
      joinError: joinError?.message,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


