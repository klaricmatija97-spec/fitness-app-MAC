import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * Debug endpoint za pregled workout logova
 */
export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Dohvati najnovije workout logove
    const { data: logs, error: logsError } = await supabase
      .from('workout_logs')
      .select('id, client_id, session_id, status, started_at, total_exercises')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }
    
    // Za svaki log dohvati vježbe
    const logsWithExercises = await Promise.all((logs || []).map(async (log) => {
      const { data: exercises } = await supabase
        .from('workout_log_exercises')
        .select('id, exercise_name, planned_sets')
        .eq('workout_log_id', log.id);
      
      return {
        ...log,
        exercises: exercises || [],
        exercisesCount: exercises?.length || 0,
      };
    }));
    
    return NextResponse.json({
      logs: logsWithExercises,
      totalLogs: logs?.length || 0,
    });
    
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

