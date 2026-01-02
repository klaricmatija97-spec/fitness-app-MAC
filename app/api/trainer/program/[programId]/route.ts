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
        current_week,
        created_at,
        updated_at,
        annual_program_id,
        previous_program_id,
        next_program_id,
        phase_order,
        total_phases
      `)
      .eq('id', programId)
      .single();
    
    if (programError || !program) {
      return NextResponse.json({
        success: false,
        error: 'Program nije pronađen',
      }, { status: 404 });
    }
    
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
        day_number,
        name,
        focus,
        notes,
        session_exercises (
          id,
          exercise_name,
          exercise_id,
          sets,
          reps_min,
          reps_max,
          rest_seconds,
          rir,
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
      .order('day_number', { ascending: true });
    
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
        name: session.name,
        dayNumber: session.day_number,
        focus: session.focus,
        notes: session.notes,
        exercises: (session.session_exercises || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((ex: any) => ({
            id: ex.id,
            name: ex.exercise_name,
            nameEn: ex.exercise_name,
            sets: ex.sets,
            repsMin: ex.reps_min,
            repsMax: ex.reps_max,
            restSeconds: ex.rest_seconds,
            rir: ex.rir,
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
    
    // 5. Formatiraj odgovor u format koji TrainerProgramBuilderScreen očekuje
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
      currentWeek: program.current_week || 1,
      createdAt: program.created_at,
      updatedAt: program.updated_at,
      // Linking info
      annualProgramId: program.annual_program_id,
      previousProgramId: program.previous_program_id,
      nextProgramId: program.next_program_id,
      phaseOrder: program.phase_order,
      totalPhases: program.total_phases,
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
