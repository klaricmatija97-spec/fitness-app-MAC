/**
 * Trainer Program API
 * ====================
 * GET /api/trainer/program/[programId] - Dohvati program s detaljima
 * DELETE /api/trainer/program/[programId] - Obriši program
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAccessToken } from '@/lib/auth/jwt';

// ============================================
// GET - Dohvati program
// ============================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await context.params;
    const supabase = createServiceClient();

    // Dohvati program
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select(`
        id,
        name,
        goal,
        level,
        split_type,
        duration_weeks,
        sessions_per_week,
        status,
        start_date,
        created_at,
        trainer_notes
      `)
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { success: false, error: 'Program nije pronađen' },
        { status: 404 }
      );
    }

    // Dohvati mezocikluse
    const { data: mesocycles } = await supabase
      .from('mesocycles')
      .select('*')
      .eq('program_id', programId)
      .order('order_index');

    // Dohvati sesije s vježbama
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select(`
        id,
        week_number,
        day_of_week,
        order_in_week,
        session_type,
        split_name,
        target_rpe,
        estimated_duration_minutes,
        warmup_protocol,
        cooldown_protocol,
        session_exercises (
          id,
          exercise_id,
          exercise_name,
          exercise_name_hr,
          order_index,
          sets,
          reps_target,
          tempo,
          rest_seconds,
          target_rpe,
          target_rir,
          primary_muscles,
          secondary_muscles,
          equipment,
          mechanic
        )
      `)
      .eq('program_id', programId)
      .order('week_number')
      .order('order_in_week');

    // Izračunaj trenutni tjedan
    let currentWeek = 1;
    if (program.start_date) {
      const startDate = new Date(program.start_date);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      currentWeek = Math.max(1, Math.min(program.duration_weeks, Math.floor(diffDays / 7) + 1));
    }

    // Grupiraj sesije po tjednima
    const weeks: any[] = [];
    for (let w = 1; w <= program.duration_weeks; w++) {
      const weekSessions = (sessions || []).filter(s => s.week_number === w);
      
      // Pronađi mezociklus za ovaj tjedan
      const mesocycle = (mesocycles || []).find(m => w >= m.week_start && w <= m.week_end);
      
      weeks.push({
        weekNumber: w,
        mesocycleName: mesocycle?.name || 'Tjedan ' + w,
        mesocycleFocus: mesocycle?.focus || 'general',
        volumeModifier: mesocycle?.volume_modifier || 1.0,
        intensityModifier: mesocycle?.intensity_modifier || 1.0,
        isDeload: mesocycle?.focus === 'deload',
        sessions: weekSessions.map(s => ({
          id: s.id,
          dayOfWeek: s.day_of_week,
          orderInWeek: s.order_in_week,
          name: s.split_name || s.session_type,
          type: s.session_type,
          targetRpe: s.target_rpe,
          estimatedDuration: s.estimated_duration_minutes,
          warmupProtocol: s.warmup_protocol,
          cooldownProtocol: s.cooldown_protocol,
          exercises: (s.session_exercises || []).map((e: any) => ({
            id: e.id,
            exerciseId: e.exercise_id,
            name: e.exercise_name_hr || e.exercise_name,
            nameEn: e.exercise_name,
            orderIndex: e.order_index,
            sets: e.sets,
            reps: e.reps_target,
            tempo: e.tempo,
            restSeconds: e.rest_seconds,
            targetRpe: e.target_rpe,
            targetRir: e.target_rir,
            primaryMuscles: e.primary_muscles,
            secondaryMuscles: e.secondary_muscles,
            equipment: e.equipment,
            mechanic: e.mechanic,
          })),
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: program.id,
        name: program.name,
        goal: program.goal,
        level: program.level,
        splitType: program.split_type,
        durationWeeks: program.duration_weeks,
        sessionsPerWeek: program.sessions_per_week,
        status: program.status,
        startDate: program.start_date,
        createdAt: program.created_at,
        trainerNotes: program.trainer_notes,
        currentWeek,
        weeks,
        mesocycles: mesocycles || [],
      },
    });

  } catch (error) {
    console.error('[trainer/program] error:', error);
    return NextResponse.json(
      { success: false, error: 'Greška pri dohvaćanju programa' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Obriši program
// ============================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await context.params;
    
    // Provjeri autorizaciju
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    if (!payload || payload.userType !== 'trainer') {
      return NextResponse.json(
        { success: false, error: 'Samo treneri mogu brisati programe' },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();

    // Dohvati program da provjerimo postoji li
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select('id, name, client_id, trainer_id')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { success: false, error: 'Program nije pronađen' },
        { status: 404 }
      );
    }

    // Provjeri da li trener ima pravo brisati ovaj program
    // (program mora pripadati treneru ili njegovom klijentu)
    // Za sada dopuštamo svim trenerima - možete dodati dodatnu provjeru

    console.log(`[DELETE Program] Brišem program: ${program.name} (${programId})`);

    // 1. Obriši workout_log_sets povezane s workout_log_exercises
    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('program_id', programId);

    if (workoutLogs && workoutLogs.length > 0) {
      const logIds = workoutLogs.map(l => l.id);
      
      // Dohvati workout_log_exercises
      const { data: logExercises } = await supabase
        .from('workout_log_exercises')
        .select('id')
        .in('workout_log_id', logIds);
      
      if (logExercises && logExercises.length > 0) {
        const exerciseIds = logExercises.map(e => e.id);
        
        // Obriši workout_log_sets
        await supabase
          .from('workout_log_sets')
          .delete()
          .in('workout_log_exercise_id', exerciseIds);
      }
      
      // Obriši workout_log_exercises
      await supabase
        .from('workout_log_exercises')
        .delete()
        .in('workout_log_id', logIds);
      
      // Obriši workout_logs
      await supabase
        .from('workout_logs')
        .delete()
        .eq('program_id', programId);
    }

    // 2. Obriši session_exercises
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select('id')
      .eq('program_id', programId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      
      await supabase
        .from('session_exercises')
        .delete()
        .in('session_id', sessionIds);
    }

    // 3. Obriši program_sessions
    await supabase
      .from('program_sessions')
      .delete()
      .eq('program_id', programId);

    // 4. Obriši mesocycles
    await supabase
      .from('mesocycles')
      .delete()
      .eq('program_id', programId);

    // 5. Obriši generator_logs ako postoje
    try {
      await supabase
        .from('generator_logs')
        .delete()
        .eq('program_id', programId);
    } catch (e) {
      // Tablica možda ne postoji
    }

    // 6. Obriši sam program
    const { error: deleteError } = await supabase
      .from('training_programs')
      .delete()
      .eq('id', programId);

    if (deleteError) {
      console.error('[DELETE Program] Error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Greška pri brisanju programa: ' + deleteError.message },
        { status: 500 }
      );
    }

    console.log(`[DELETE Program] Uspješno obrisan: ${program.name}`);

    return NextResponse.json({
      success: true,
      message: `Program "${program.name}" je uspješno obrisan`,
      deletedProgramId: programId,
    });

  } catch (error) {
    console.error('[DELETE Program] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Neočekivana greška' },
      { status: 500 }
    );
  }
}
