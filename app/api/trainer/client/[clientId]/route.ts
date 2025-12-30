/**
 * Trainer Client Detail API
 * =========================
 * GET /api/trainer/client/:clientId
 * 
 * Dohvaća client detail s adherence i flagged exercises
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    // Provjeri autentifikaciju
    const auth = requireTrainer(request);
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

    const { clientId } = await params;
    const supabase = createServiceClient();

    // Dohvati client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Dohvati aktivan program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, name, status, start_date, end_date, duration_weeks')
      .eq('client_id', clientId)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let adherence = null;
    let recentSessions = [];
    let flaggedExercises = [];

    if (program) {
      // Dohvati total sessions count
      const { count: totalSessions } = await supabase
        .from('program_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program.id);

      // TODO: Dohvati completed sessions iz workout_logs kada se implementira
      // Za sada, pretpostavljamo 0 completed
      const completedSessions = 0;
      adherence = totalSessions && totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      // TODO: Dohvati recent sessions iz workout_logs
      recentSessions = [];

      // TODO: Dohvati flagged exercises iz workout_logs (pain/difficulty reports)
      flaggedExercises = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone || null,
          avatar: null, // TODO: dodati avatar_url stupac
        },
        program: program
          ? {
              id: program.id,
              name: program.name,
              status: program.status,
              startDate: program.start_date,
              endDate: program.end_date,
              currentWeek: program.start_date
                ? Math.floor(
                    (Date.now() - new Date(program.start_date).getTime()) /
                      (7 * 24 * 60 * 60 * 1000)
                  ) + 1
                : 1,
              totalWeeks: program.duration_weeks,
            }
          : null,
        adherence: program
          ? {
              percentage: adherence || 0,
              completedSessions: 0, // TODO: iz workout_logs
              totalSessions:
                (await supabase
                  .from('program_sessions')
                  .select('id', { count: 'exact', head: true })
                  .eq('program_id', program.id)).count || 0,
              lastSessionDate: null, // TODO: iz workout_logs
              streak: 0, // TODO: iz workout_logs
            }
          : {
              percentage: 0,
              completedSessions: 0,
              totalSessions: 0,
              lastSessionDate: null,
              streak: 0,
            },
        flaggedExercises,
        recentSessions,
      },
    });
  } catch (error) {
    console.error('[trainer/client] Unexpected error:', error);
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

