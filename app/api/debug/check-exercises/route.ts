import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    
    // Dohvati zadnji program ako nije specificiran
    let targetProgramId = programId;
    if (!targetProgramId) {
      const { data: latestProgram } = await supabase
        .from('training_programs')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      targetProgramId = latestProgram?.id;
    }
    
    if (!targetProgramId) {
      return NextResponse.json({ error: 'Nema programa' }, { status: 404 });
    }
    
    // Dohvati program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, name, goal, created_at')
      .eq('id', targetProgramId)
      .single();
    
    // Dohvati sve sesije za program
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select('id, split_name, week_number, day_of_week')
      .eq('program_id', targetProgramId)
      .order('week_number')
      .order('day_of_week');
    
    // Dohvati sve vježbe za sve sesije
    const sessionIds = sessions?.map(s => s.id) || [];
    const { data: exercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select('id, session_id, exercise_name, exercise_name_hr, order_index')
      .in('session_id', sessionIds.length > 0 ? sessionIds : ['none']);
    
    // Grupiraj vježbe po sesiji
    const exercisesBySession: Record<string, any[]> = {};
    for (const ex of exercises || []) {
      if (!exercisesBySession[ex.session_id]) {
        exercisesBySession[ex.session_id] = [];
      }
      exercisesBySession[ex.session_id].push(ex);
    }
    
    // Sastavi izvještaj
    const sessionsWithExercises = sessions?.map(s => ({
      ...s,
      exerciseCount: exercisesBySession[s.id]?.length || 0,
      exercises: exercisesBySession[s.id] || [],
    }));
    
    const totalExercises = exercises?.length || 0;
    const sessionsWithoutExercises = sessionsWithExercises?.filter(s => s.exerciseCount === 0) || [];
    
    return NextResponse.json({
      program,
      summary: {
        totalSessions: sessions?.length || 0,
        totalExercises,
        sessionsWithoutExercises: sessionsWithoutExercises.length,
      },
      sessions: sessionsWithExercises,
      exercisesError: exercisesError?.message,
    });
    
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
