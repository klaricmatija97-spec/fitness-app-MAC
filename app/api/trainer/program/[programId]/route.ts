/**
 * GET /api/trainer/program/[programId]
 * 
 * Dohvaća kompletan program s tjednima, sesijama i vježbama
 * Za prikaz u TrainerProgramBuilderScreen (view mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;
  
  try {
    const supabase = createServiceClient();
    
    // 1. Dohvati osnovne podatke o programu
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select(`
        id,
        name,
        client_id,
        trainer_id,
        goal,
        level,
        duration_weeks,
        split_type,
        status,
        start_date,
        created_at,
        updated_at
      `)
      .eq('id', programId)
      .single();
    
    if (programError) {
      console.error('[Program API] Error fetching program:', programError);
      return NextResponse.json({
        success: false,
        error: `Program greška: ${programError.message}`,
      }, { status: 500 });
    }
    
    if (!program) {
      console.log('[Program API] Program not found:', programId);
      return NextResponse.json({
        success: false,
        error: 'Program nije pronađen',
      }, { status: 404 });
    }
    
    console.log('[Program API] Program found:', program.name);
    
    // 2. Dohvati mezocikluse
    const { data: mesocycles, error: mesocyclesError } = await supabase
      .from('mesocycles')
      .select('*')
      .eq('program_id', programId)
      .order('week_number', { ascending: true });
    
    // 3. Dohvati sesije s vježbama
    const { data: sessions, error: sessionsError } = await supabase
      .from('program_sessions')
      .select(`
        id,
        program_id,
        week_number,
        day_of_week,
        split_name,
        session_type,
        target_rpe,
        estimated_duration_minutes,
        trainer_notes,
        session_exercises (
          id,
          exercise_name,
          exercise_name_hr,
          exercise_id,
          sets,
          reps_target,
          rest_seconds,
          target_rir,
          tempo,
          notes,
          order_index,
          equipment,
          primary_muscles,
          secondary_muscles
        )
      `)
      .eq('program_id', programId)
      .order('week_number', { ascending: true })
      .order('day_of_week', { ascending: true });
    
    console.log('[Program API] Sessions found:', sessions?.length || 0);
    
    if (sessionsError) {
      console.error('[Program API] Error fetching sessions:', sessionsError);
    }
    
    // 4. Grupiraj sesije po tjednima
    const weeks: any[] = [];
    const sessionsByWeek = new Map<number, any[]>();
    
    (sessions || []).forEach((session: any) => {
      const weekNum = session.week_number;
      if (!sessionsByWeek.has(weekNum)) {
        sessionsByWeek.set(weekNum, []);
      }
      sessionsByWeek.get(weekNum)!.push({
        id: session.id,
        name: session.split_name || session.session_type || 'Trening',
        dayNumber: session.day_of_week,
        focus: session.session_type,
        notes: session.trainer_notes,
        targetRpe: session.target_rpe,
        estimatedDuration: session.estimated_duration_minutes,
        exercises: (session.session_exercises || [])
          .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          .map((ex: any) => ({
            id: ex.id,
            name: ex.exercise_name_hr || ex.exercise_name || 'Vježba',
            nameEn: ex.exercise_name,
            sets: ex.sets,
            repsMin: null,
            repsMax: ex.reps_target,
            restSeconds: ex.rest_seconds,
            rir: ex.target_rir,
            tempo: ex.tempo,
            equipment: ex.equipment,
            primaryMuscles: ex.primary_muscles || [],
            secondaryMuscles: ex.secondary_muscles || [],
            isLocked: false,
          })),
      });
    });
    
    // Kreiraj weeks array
    for (let weekNum = 1; weekNum <= (program.duration_weeks || 4); weekNum++) {
      const weekSessions = sessionsByWeek.get(weekNum) || [];
      const mesocycle = (mesocycles || []).find((m: any) => m.week_number === weekNum);
      
      weeks.push({
        weekNumber: weekNum,
        mesocycleType: mesocycle?.type || 'accumulation',
        volumeModifier: mesocycle?.volume_modifier || 1.0,
        intensityModifier: mesocycle?.intensity_modifier || 1.0,
        sessions: weekSessions,
      });
    }
    
    // 5. Izračunaj trenutni tjedan iz start_date
    let currentWeek = 1;
    if (program.start_date) {
      const startDate = new Date(program.start_date);
      const now = new Date();
      currentWeek = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
    }
    
    // 6. Formatiraj odgovor u format koji TrainerProgramBuilderScreen očekuje
    const formattedProgram = {
      id: program.id,
      name: program.name,
      clientId: program.client_id,
      trainerId: program.trainer_id,
      goal: program.goal,
      level: program.level,
      durationWeeks: program.duration_weeks,
      splitType: program.split_type,
      status: program.status,
      currentWeek: currentWeek,
      startDate: program.start_date,
      createdAt: program.created_at,
      updatedAt: program.updated_at,
      // Program data
      weeks: weeks,
      mesocycles: mesocycles || [],
    };
    
    return NextResponse.json({
      success: true,
      data: formattedProgram,
    });
    
  } catch (error) {
    console.error('[Program API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Greška pri dohvaćanju programa',
    }, { status: 500 });
  }
}
