/**
 * Client Progress API
 * ===================
 * GET /api/client/progress
 * 
 * Dohvaća progress data za charts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireClient } from '@/lib/api/auth-helpers';

export async function GET(request: NextRequest) {
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
    const supabase = createServiceClient();

    // Dohvati aktivni program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, name, start_date, end_date, duration_weeks')
      .eq('client_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!program) {
      return NextResponse.json({
        success: true,
        data: {
          program: null,
          adherence: null,
          volume: null,
          recentSessions: [],
        },
      });
    }

    // Dohvati sve sesije
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select('id, week_number, split_name')
      .eq('program_id', program.id)
      .order('week_number')
      .order('day_of_week');

    // Grupiraj po tjednima za adherence
    const sessionsByWeek = new Map<number, { completed: number; total: number }>();
    (sessions || []).forEach((s) => {
      const week = s.week_number;
      if (!sessionsByWeek.has(week)) {
        sessionsByWeek.set(week, { completed: 0, total: 0 });
      }
      const weekData = sessionsByWeek.get(week)!;
      weekData.total++;
      // TODO: Provjeri da li je session completed iz workout_logs
    });

    const adherenceByWeek = Array.from(sessionsByWeek.entries()).map(([weekNumber, data]) => ({
      weekNumber,
      completed: data.completed,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));

    const totalSessions = sessions?.length || 0;
    // TODO: Dohvati completed sessions iz workout_logs
    const completedSessions = 0;

    // Grupiraj po tjednima za volume
    // TODO: Dohvati volume iz workout_logs
    const volumeByWeek = Array.from(sessionsByWeek.keys()).map((weekNumber) => ({
      weekNumber,
      totalSets: 0, // TODO: iz workout_logs
      totalReps: 0, // TODO: iz workout_logs
    }));

    // TODO: Dohvati recent sessions iz workout_logs
    const recentSessions: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        program: {
          id: program.id,
          name: program.name,
          startDate: program.start_date,
          endDate: program.end_date,
          currentWeek: program.start_date
            ? Math.floor((Date.now() - new Date(program.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
            : 1,
          totalWeeks: program.duration_weeks,
        },
        adherence: {
          percentage: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
          completedSessions,
          totalSessions,
          byWeek: adherenceByWeek,
        },
        volume: {
          totalSets: 0, // TODO: iz workout_logs
          totalReps: 0, // TODO: iz workout_logs
          byWeek: volumeByWeek,
        },
        recentSessions,
      },
    });
  } catch (error) {
    console.error('[client/progress] Unexpected error:', error);
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

