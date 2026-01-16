import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const programId = searchParams.get('programId') || '5d3ad960-ed96-4f4e-a092-d6fb9ed3f5fd';

  try {
    const supabase = createServiceClient();

    // Dohvati sve sesije za program
    const { data: sessions, error: sessError } = await supabase
      .from('program_sessions')
      .select('id, week_number, day_of_week, split_name')
      .eq('program_id', programId)
      .order('week_number')
      .order('day_of_week');

    if (sessError) {
      return NextResponse.json({ error: 'Sessions error', details: sessError.message });
    }

    // Za svaku sesiju dohvati vježbe
    const sessionsWithVolume = await Promise.all(
      (sessions || []).map(async (session) => {
        const { data: exercises } = await supabase
          .from('session_exercises')
          .select('exercise_name, sets, reps_target, target_rir')
          .eq('session_id', session.id)
          .order('order_index');

        const totalSets = (exercises || []).reduce((sum, ex) => sum + (ex.sets || 0), 0);

        return {
          week: session.week_number,
          day: session.day_of_week,
          split: session.split_name,
          totalSets,
          exercises: exercises?.map(e => ({
            name: e.exercise_name,
            sets: e.sets,
            reps: e.reps_target,
            rir: e.target_rir,
          })),
        };
      })
    );

    // Grupiraj po tjednu
    const weeklyVolume: Record<number, { totalSets: number; sessions: typeof sessionsWithVolume }> = {};
    for (const session of sessionsWithVolume) {
      if (!weeklyVolume[session.week]) {
        weeklyVolume[session.week] = { totalSets: 0, sessions: [] };
      }
      weeklyVolume[session.week].totalSets += session.totalSets;
      weeklyVolume[session.week].sessions.push(session);
    }

    return NextResponse.json({
      programId,
      totalWeeks: Object.keys(weeklyVolume).length,
      weeklyVolume,
      volumeProgression: Object.entries(weeklyVolume).map(([week, data]) => ({
        week: parseInt(week),
        totalSets: data.totalSets,
        sessionsCount: data.sessions.length,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: String(error) });
  }
}

