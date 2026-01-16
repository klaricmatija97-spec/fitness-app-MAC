/**
 * Trainer Workout Log - Add/Update Set
 * =====================================
 * POST /api/trainer/workout-log/:logId/set
 * 
 * Dodaje ili ažurira set za vježbu u workout logu
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { logId } = await params;
    const body = await request.json();
    const { 
      exerciseLogId, 
      setNumber, 
      weight, 
      reps, 
      rir, 
      rpe, 
      isWarmup = false,
      completed = true,
      notes 
    } = body;

    if (!exerciseLogId || !setNumber) {
      return NextResponse.json(
        { success: false, error: 'exerciseLogId and setNumber are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Provjeri workout log i vlasništvo
    const { data: workoutLog, error: logError } = await supabase
      .from('workout_logs')
      .select(`
        id, 
        client_id, 
        status,
        client:clients(trainer_id)
      `)
      .eq('id', logId)
      .single();

    if (logError || !workoutLog) {
      return NextResponse.json(
        { success: false, error: 'Workout log not found' },
        { status: 404 }
      );
    }

    // Provjeri da klijent pripada treneru
    const client = workoutLog.client as any;
    if (client?.trainer_id !== auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Provjeri da je log još aktivan
    if (workoutLog.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Workout log is already completed' },
        { status: 400 }
      );
    }

    // Provjeri da exercise log postoji
    const { data: exerciseLog, error: exError } = await supabase
      .from('workout_log_exercises')
      .select('id, planned_reps_min, planned_reps_max, planned_rir')
      .eq('id', exerciseLogId)
      .eq('workout_log_id', logId)
      .single();

    if (exError || !exerciseLog) {
      return NextResponse.json(
        { success: false, error: 'Exercise log not found' },
        { status: 404 }
      );
    }

    // Provjeri postoji li već set s tim brojem
    const { data: existingSet } = await supabase
      .from('workout_log_sets')
      .select('id')
      .eq('workout_log_exercise_id', exerciseLogId)
      .eq('set_number', setNumber)
      .maybeSingle();

    let setData;

    if (existingSet) {
      // Update postojećeg seta
      const { data: updatedSet, error: updateError } = await supabase
        .from('workout_log_sets')
        .update({
          weight: weight || null,
          reps: reps || null,
          rir: rir ?? null,
          rpe: rpe ?? null,
          is_warmup: isWarmup,
          completed,
          notes: notes || null,
          planned_reps: exerciseLog.planned_reps_max,
          planned_rir: exerciseLog.planned_rir,
        })
        .eq('id', existingSet.id)
        .select()
        .single();

      if (updateError) {
        console.error('[workout-log/set] Update error:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update set' },
          { status: 500 }
        );
      }
      setData = updatedSet;
    } else {
      // Insert novog seta
      const { data: newSet, error: insertError } = await supabase
        .from('workout_log_sets')
        .insert({
          workout_log_exercise_id: exerciseLogId,
          set_number: setNumber,
          weight: weight || null,
          reps: reps || null,
          rir: rir ?? null,
          rpe: rpe ?? null,
          is_warmup: isWarmup,
          completed,
          notes: notes || null,
          planned_reps: exerciseLog.planned_reps_max,
          planned_rir: exerciseLog.planned_rir,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[workout-log/set] Insert error:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to add set' },
          { status: 500 }
        );
      }
      setData = newSet;
    }

    // Ažuriraj completed_sets na exercise logu
    const { count: completedSetsCount } = await supabase
      .from('workout_log_sets')
      .select('id', { count: 'exact', head: true })
      .eq('workout_log_exercise_id', exerciseLogId)
      .eq('completed', true);

    await supabase
      .from('workout_log_exercises')
      .update({ completed_sets: completedSetsCount || 0 })
      .eq('id', exerciseLogId);

    // Ažuriraj statistike na workout logu
    await updateWorkoutLogStats(supabase, logId);

    return NextResponse.json({
      success: true,
      data: {
        set: setData,
        exerciseCompletedSets: completedSetsCount || 0,
      },
    });
  } catch (error) {
    console.error('[trainer/workout-log/set] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper funkcija za ažuriranje statistika workout loga
async function updateWorkoutLogStats(supabase: any, logId: string) {
  // Dohvati sve exercise logove i setove
  const { data: exercises } = await supabase
    .from('workout_log_exercises')
    .select(`
      id,
      completed_sets,
      planned_sets,
      workout_log_sets (
        weight,
        reps,
        completed
      )
    `)
    .eq('workout_log_id', logId);

  if (!exercises) return;

  let totalSets = 0;
  let completedSets = 0;
  let totalVolume = 0;
  let completedExercises = 0;

  for (const ex of exercises) {
    totalSets += ex.planned_sets || 0;
    completedSets += ex.completed_sets || 0;

    // Izračunaj volumen (weight × reps za svaki set)
    for (const set of ex.workout_log_sets || []) {
      if (set.completed && set.weight && set.reps) {
        totalVolume += set.weight * set.reps;
      }
    }

    // Vježba je completed ako ima barem 1 set
    if (ex.completed_sets > 0) {
      completedExercises++;
    }
  }

  // Ažuriraj workout log
  await supabase
    .from('workout_logs')
    .update({
      total_sets: totalSets,
      completed_sets: completedSets,
      completed_exercises: completedExercises,
      total_volume: totalVolume,
      adherence_score: totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0,
    })
    .eq('id', logId);
}


