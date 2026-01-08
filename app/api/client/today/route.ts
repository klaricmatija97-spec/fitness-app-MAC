/**
 * Client Today API
 * ================
 * GET /api/client/today
 * 
 * Dohvaća današnji session i progress za klijenta
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

    // Dohvati aktivni program za klijenta
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, name, status, start_date, end_date, duration_weeks')
      .eq('client_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let todaySession = null;
    let progress = null;

    if (program) {
      // Izračunaj current week
      const startDate = program.start_date ? new Date(program.start_date) : null;
      const currentWeek = startDate
        ? Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
        : 1;

      // Dohvati dan u tjednu (1 = Monday, 7 = Sunday)
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
      const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday to 7

      // Dohvati današnji session
      let session = null;
      let isNextSession = false;
      
      // Prvo pokušaj današnji trening
      const { data: todaySessionData } = await supabase
        .from('program_sessions')
        .select('id, split_name, week_number, day_of_week, estimated_duration_minutes')
        .eq('program_id', program.id)
        .eq('week_number', currentWeek)
        .eq('day_of_week', normalizedDayOfWeek)
        .limit(1)
        .maybeSingle();
      
      session = todaySessionData;
      
      // Ako nema danas, pronađi sljedeći trening
      if (!session) {
        // Pronađi sljedeći trening ovaj tjedan
        const { data: nextSessionThisWeek } = await supabase
          .from('program_sessions')
          .select('id, split_name, week_number, day_of_week, estimated_duration_minutes')
          .eq('program_id', program.id)
          .eq('week_number', currentWeek)
          .gt('day_of_week', normalizedDayOfWeek)
          .order('day_of_week', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (nextSessionThisWeek) {
          session = nextSessionThisWeek;
          isNextSession = true;
        } else {
          // Ako nema ovaj tjedan, pronađi prvi trening sljedećeg tjedna
          const { data: nextWeekSession } = await supabase
            .from('program_sessions')
            .select('id, split_name, week_number, day_of_week, estimated_duration_minutes')
            .eq('program_id', program.id)
            .eq('week_number', currentWeek + 1)
            .order('day_of_week', { ascending: true })
            .limit(1)
            .maybeSingle();
          
          if (nextWeekSession) {
            session = nextWeekSession;
            isNextSession = true;
          }
        }
      }

      if (session) {
        // Dohvati exercises count
        const { count: exercisesCount } = await supabase
          .from('session_exercises')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id);

        // Izračunaj koji je to dan
        const dayNames = ['', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
        const sessionDayName = dayNames[session.day_of_week] || '';

        // TODO: Dohvati session status iz workout_logs (pending/in_progress/completed)
        todaySession = {
          id: session.id,
          name: session.split_name || 'Trening',
          weekNumber: session.week_number,
          dayOfWeek: session.day_of_week,
          dayName: sessionDayName,
          estimatedDuration: session.estimated_duration_minutes || 60,
          exercisesCount: exercisesCount || 0,
          status: 'pending', // TODO: iz workout_logs
          startedAt: null, // TODO: iz workout_logs
          completedAt: null, // TODO: iz workout_logs
          isNextSession, // Označava je li ovo sljedeći trening (ne današnji)
        };
      }

      // Izračunaj progress
      const { count: totalSessions } = await supabase
        .from('program_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program.id);

      // TODO: Dohvati completed sessions iz workout_logs
      const completedSessions = 0;

      progress = {
        adherence: totalSessions && totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        completedSessions,
        totalSessions: totalSessions || 0,
        currentWeek,
        streak: 0, // TODO: iz workout_logs
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        program: program
          ? {
              id: program.id,
              name: program.name,
              status: program.status,
              currentWeek: program.start_date
                ? Math.floor((Date.now() - new Date(program.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
                : 1,
              totalWeeks: program.duration_weeks,
              startDate: program.start_date,
              endDate: program.end_date,
            }
          : null,
        todaySession,
        progress,
      },
    });
  } catch (error) {
    console.error('[client/today] Unexpected error:', error);
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

