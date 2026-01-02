/**
 * Trainer Client Workout Logs API
 * ===============================
 * GET /api/trainer/client/:clientId/workout-logs
 * 
 * Dohvaća workout logs za određenog klijenta
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { clientId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Query parametri
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const programId = searchParams.get('programId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status'); // 'completed' | 'partial' | 'skipped'

    const supabase = createServiceClient();

    // Provjeri da klijent pripada treneru
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, trainer_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    if (client.trainer_id !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Dohvati workout logs
    let query = supabase
      .from('workout_logs')
      .select(`
        id,
        session_id,
        started_at,
        completed_at,
        duration_minutes,
        status,
        adherence_score,
        total_exercises,
        completed_exercises,
        total_sets,
        completed_sets,
        total_volume,
        client_notes,
        trainer_notes,
        created_at,
        program_id,
        session_id,
        program:training_programs(
          id,
          name,
          goal,
          status
        ),
        session:program_sessions(
          id,
          split_name,
          day_of_week
        )
      `)
      .eq('client_id', clientId)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filteri
    if (programId) {
      query = query.eq('program_id', programId);
    }
    if (startDate) {
      query = query.gte('started_at', startDate);
    }
    if (endDate) {
      query = query.lte('started_at', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('[workout-logs] Error:', logsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch workout logs' },
        { status: 500 }
      );
    }

    // Dohvati ukupan broj za paginaciju
    let countQuery = supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (programId) countQuery = countQuery.eq('program_id', programId);
    if (startDate) countQuery = countQuery.gte('started_at', startDate);
    if (endDate) countQuery = countQuery.lte('started_at', endDate);
    if (status) countQuery = countQuery.eq('status', status);

    const { count } = await countQuery;

    // Izračunaj statistike
    const { data: stats } = await supabase
      .from('workout_logs')
      .select('adherence_score, status, total_volume')
      .eq('client_id', clientId);

    const statsData = {
      totalSessions: count || 0,
      completedSessions: stats?.filter(s => s.status === 'completed').length || 0,
      partialSessions: stats?.filter(s => s.status === 'partial').length || 0,
      skippedSessions: stats?.filter(s => s.status === 'skipped').length || 0,
      averageAdherence: stats && stats.length > 0
        ? Math.round((stats.reduce((sum, s) => sum + (s.adherence_score || 0), 0) / stats.length) * 100) / 100
        : 0,
      totalVolume: stats?.reduce((sum, s) => sum + (parseFloat(s.total_volume?.toString() || '0') || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
        stats: statsData,
      },
    });
  } catch (error) {
    console.error('[trainer/client/workout-logs] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

