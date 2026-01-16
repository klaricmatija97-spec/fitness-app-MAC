/**
 * Trainer Workout Log - Start Session
 * ====================================
 * POST /api/trainer/workout-log/start
 * 
 * Započinje novu workout log sesiju za klijenta
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    console.log('[workout-log/start] Checking auth...');
    const auth = requireTrainer(request);
    
    if (!auth) {
      console.log('[workout-log/start] Auth failed - no trainer auth');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - niste prijavljeni kao trener' },
        { status: 401 }
      );
    }
    
    console.log('[workout-log/start] Auth OK, trainer:', auth.userId);

    const body = await request.json();
    const { clientId, sessionId, programId } = body;

    if (!clientId || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'clientId and sessionId are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Provjeri da klijent postoji i pripada treneru
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, trainer_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.log('[workout-log/start] Client not found:', clientId);
      return NextResponse.json(
        { success: false, error: 'Klijent nije pronađen' },
        { status: 404 }
      );
    }

    // Provjeri vlasništvo - dopusti ako trainer_id odgovara ILI ako klijent nema trenera (za testiranje)
    if (client.trainer_id && client.trainer_id !== auth.userId) {
      console.log('[workout-log/start] Client belongs to different trainer:', client.trainer_id, 'vs', auth.userId);
      return NextResponse.json(
        { success: false, error: 'Nemate pristup ovom klijentu' },
        { status: 403 }
      );
    }
    
    console.log('[workout-log/start] Client OK:', client.name);

    // Dohvati sesiju
    const { data: session, error: sessionError } = await supabase
      .from('program_sessions')
      .select(`
        id,
        split_name,
        week_number,
        day_of_week,
        program_id
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Dohvati vježbe za sesiju (odvojeni query zbog kompleksnosti)
    const { data: sessionExercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select(`
        id,
        order_index,
        sets,
        reps_target,
        target_rir,
        tempo,
        rest_seconds,
        notes,
        exercise_name,
        exercise_name_hr,
        primary_muscles
      `)
      .eq('session_id', sessionId)
      .order('order_index');

    // Ako nema vježbi u tablici, kreiraj praznu listu
    const exercises = sessionExercises || [];
    
    if (exercises.length === 0) {
      console.log('[workout-log/start] No exercises found for session:', sessionId);
    }

    // Provjeri da nema već aktivnog workout loga za ovu sesiju
    const { data: existingLog } = await supabase
      .from('workout_logs')
      .select('id, status')
      .eq('client_id', clientId)
      .eq('session_id', sessionId)
      .in('status', ['in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLog?.status === 'in_progress') {
      // Vrati postojeći aktivni log s vježbama
      let { data: existingExercises } = await supabase
        .from('workout_log_exercises')
        .select('id, exercise_name, planned_sets, planned_reps_min, planned_reps_max, planned_rir')
        .eq('workout_log_id', existingLog.id)
        .order('created_at');
      
      // Ako nema vježbi u logu, ali ima u sesiji - dodaj ih
      console.log('[workout-log/start] Checking exercises:', { existingCount: existingExercises?.length, sessionCount: exercises.length });
      if ((!existingExercises || existingExercises.length === 0) && exercises.length > 0) {
        console.log('[workout-log/start] Existing log has no exercises, adding from session...');
        
        // Parse reps_target (format "6-8") to get min and max
        const parseRepsRange = (repsTarget: string | null): { min: number | null; max: number | null } => {
          if (!repsTarget) return { min: null, max: null };
          const parts = repsTarget.split('-').map(p => parseInt(p.trim(), 10));
          if (parts.length === 2) {
            return { min: parts[0], max: parts[1] };
          } else if (parts.length === 1 && !isNaN(parts[0])) {
            return { min: parts[0], max: parts[0] };
          }
          return { min: null, max: null };
        };
        
        const exercisesToInsert = exercises.map((ex: any) => {
          const reps = parseRepsRange(ex.reps_target);
          return {
            workout_log_id: existingLog.id,
            exercise_name: ex.exercise_name_hr || ex.exercise_name || 'Nepoznata vježba',
            exercise_name_en: ex.exercise_name,
            primary_muscles: ex.primary_muscles || [],
            planned_sets: ex.sets || 3,
            planned_reps_min: reps.min,
            planned_reps_max: reps.max,
            planned_rir: ex.target_rir,
            completed_sets: 0,
          };
        });
        
        console.log('[workout-log/start] Inserting exercises:', exercisesToInsert);
        const { error: insertError } = await supabase.from('workout_log_exercises').insert(exercisesToInsert);
        if (insertError) {
          console.error('[workout-log/start] Insert error:', insertError);
        }
        
        // Dohvati ponovno
        const { data: newExercises, error: fetchError } = await supabase
          .from('workout_log_exercises')
          .select('id, exercise_name, planned_sets, planned_reps_min, planned_reps_max, planned_rir')
          .eq('workout_log_id', existingLog.id)
          .order('created_at');
        
        console.log('[workout-log/start] After insert, fetched:', newExercises?.length, fetchError);
        existingExercises = newExercises;
      }
      
      return NextResponse.json({
        success: true,
        data: {
          workoutLogId: existingLog.id,
          clientName: client.name,
          sessionName: session.split_name,
          weekNumber: session.week_number,
          dayOfWeek: session.day_of_week,
          exercises: existingExercises || [],
          resumed: true,
          message: 'Resumed existing workout log',
        },
      });
    }

    // Kreiraj novi workout log - status: 'in_progress' dok se ne završi
    const startedAt = new Date().toISOString();
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .insert({
        client_id: clientId,
        program_id: programId || session.program_id,
        session_id: sessionId,
        week_number: session.week_number,
        started_at: startedAt,
        completed_at: startedAt, // Placeholder - ažurira se kad se trening završi
        duration_minutes: 0,
        status: 'in_progress', // Trening u tijeku - mijenja se u 'completed' kad završi
        total_exercises: exercises.length,
        completed_exercises: 0,
        total_sets: exercises.reduce((sum: number, ex: any) => sum + (ex.sets || 0), 0),
        completed_sets: 0,
        total_volume: 0,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('[workout-log/start] Error creating log:', logError);
      return NextResponse.json(
        { success: false, error: `Failed to create workout log: ${logError.message}` },
        { status: 500 }
      );
    }

    // Kreiraj workout_log_exercises za svaku vježbu
    console.log('[workout-log/start] Creating exercises for new log, count:', exercises.length);
    
    // Parse reps_target (format "6-8") to get min and max
    const parseRepsRange = (repsTarget: string | null): { min: number | null; max: number | null } => {
      if (!repsTarget) return { min: null, max: null };
      const parts = repsTarget.split('-').map(p => parseInt(p.trim(), 10));
      if (parts.length === 2) {
        return { min: parts[0], max: parts[1] };
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        return { min: parts[0], max: parts[0] };
      }
      return { min: null, max: null };
    };
    
    const exercisesToInsert = exercises.map((ex: any) => {
      const reps = parseRepsRange(ex.reps_target);
      return {
        workout_log_id: workoutLog.id,
        exercise_name: ex.exercise_name_hr || ex.exercise_name || 'Nepoznata vježba',
        exercise_name_en: ex.exercise_name,
        primary_muscles: ex.primary_muscles || [],
        planned_sets: ex.sets || 3,
        planned_reps_min: reps.min,
        planned_reps_max: reps.max,
        planned_rir: ex.target_rir,
        completed_sets: 0,
      };
    });
    console.log('[workout-log/start] Exercises to insert:', JSON.stringify(exercisesToInsert.map(e => e.exercise_name)));

    if (exercisesToInsert.length > 0) {
      const { error: exercisesError } = await supabase
        .from('workout_log_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) {
        console.error('[workout-log/start] Error creating exercises:', exercisesError);
        // Ne failaj cijeli request, log je kreiran
      } else {
        console.log('[workout-log/start] Exercises inserted successfully');
      }
    }

    // Dohvati kreirane exercise logove
    const { data: exerciseLogs } = await supabase
      .from('workout_log_exercises')
      .select('id, exercise_name, planned_sets, planned_reps_min, planned_reps_max, planned_rir')
      .eq('workout_log_id', workoutLog.id);

    return NextResponse.json({
      success: true,
      data: {
        workoutLogId: workoutLog.id,
        clientName: client.name,
        sessionName: session.split_name,
        weekNumber: session.week_number,
        dayOfWeek: session.day_of_week,
        exercises: exerciseLogs || [],
        startedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[trainer/workout-log/start] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

