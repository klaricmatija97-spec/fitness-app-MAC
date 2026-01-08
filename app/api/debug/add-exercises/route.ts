import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Debug endpoint za dodavanje vježbi u sve prazne sesije
 */
export async function POST() {
  try {
    const supabase = createServiceClient();
    
    // Dohvati sve programe za klijenta 9e1ecaed
    const clientId = '9e1ecaed-697f-4cb8-8648-0e0d4ec0fcd9';
    
    const { data: programs } = await supabase
      .from('training_programs')
      .select('id')
      .eq('client_id', clientId);
    
    const programIds = programs?.map(p => p.id) || [];
    console.log('Programs to fill:', programIds);
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('program_sessions')
      .select('id, split_name, session_type, program_id')
      .in('program_id', programIds);
    
    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }
    
    const results: any[] = [];
    
    for (const session of sessions || []) {
      // Odredi vježbe na temelju split_name
      const splitName = session.split_name || session.session_type || 'full_body';
      const exercises = getExercisesForSplit(splitName);
      
      // Obriši postojeće vježbe
      await supabase
        .from('session_exercises')
        .delete()
        .eq('session_id', session.id);
      
      // Dodaj nove vježbe
      const exercisesToInsert = exercises.map((ex, index) => ({
        id: uuidv4(),
        session_id: session.id,
        exercise_id: uuidv4(), // Placeholder - nije povezano s library
        exercise_name: ex.nameEn,
        exercise_name_hr: ex.name,
        order_index: index + 1,
        sets: ex.sets,
        reps_target: ex.reps,
        rest_seconds: ex.rest,
        target_rir: ex.rir,
        primary_muscles: ex.muscles,
        equipment: ex.equipment,
      }));
      
      const { error: insertError } = await supabase
        .from('session_exercises')
        .insert(exercisesToInsert);
      
      if (insertError) {
        results.push({ sessionId: session.id, splitName, status: 'error', error: insertError.message });
      } else {
        results.push({ sessionId: session.id, splitName, status: 'added', count: exercises.length });
      }
    }
    
    return NextResponse.json({
      success: true,
      programIds,
      processed: results.length,
      results,
    });
    
  } catch (error) {
    console.error('Add exercises error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Definicije vježbi po split tipu
function getExercisesForSplit(splitName: string) {
  const exercises: Record<string, any[]> = {
    'prsa_triceps': [
      { name: 'Bench Press', nameEn: 'Bench Press', sets: 4, reps: '8-10', rest: 120, rir: 2, muscles: ['prsa'], equipment: 'barbell' },
      { name: 'Incline Dumbbell Press', nameEn: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 90, rir: 2, muscles: ['prsa'], equipment: 'dumbbell' },
      { name: 'Cable Flyes', nameEn: 'Cable Flyes', sets: 3, reps: '12-15', rest: 60, rir: 1, muscles: ['prsa'], equipment: 'cable' },
      { name: 'Tricep Pushdown', nameEn: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: 60, rir: 1, muscles: ['triceps'], equipment: 'cable' },
      { name: 'Skull Crushers', nameEn: 'Skull Crushers', sets: 3, reps: '10-12', rest: 60, rir: 2, muscles: ['triceps'], equipment: 'ez_bar' },
    ],
    'ledja_biceps': [
      { name: 'Lat Pulldown', nameEn: 'Lat Pulldown', sets: 4, reps: '8-10', rest: 120, rir: 2, muscles: ['leđa'], equipment: 'cable' },
      { name: 'Barbell Row', nameEn: 'Barbell Row', sets: 4, reps: '8-10', rest: 120, rir: 2, muscles: ['leđa'], equipment: 'barbell' },
      { name: 'Seated Cable Row', nameEn: 'Seated Cable Row', sets: 3, reps: '10-12', rest: 90, rir: 2, muscles: ['leđa'], equipment: 'cable' },
      { name: 'Barbell Curl', nameEn: 'Barbell Curl', sets: 3, reps: '10-12', rest: 60, rir: 2, muscles: ['biceps'], equipment: 'barbell' },
      { name: 'Hammer Curl', nameEn: 'Hammer Curl', sets: 3, reps: '12-15', rest: 60, rir: 1, muscles: ['biceps'], equipment: 'dumbbell' },
    ],
    'ramena': [
      { name: 'Overhead Press', nameEn: 'Overhead Press', sets: 4, reps: '8-10', rest: 120, rir: 2, muscles: ['ramena'], equipment: 'barbell' },
      { name: 'Lateral Raise', nameEn: 'Lateral Raise', sets: 4, reps: '12-15', rest: 60, rir: 1, muscles: ['ramena'], equipment: 'dumbbell' },
      { name: 'Face Pull', nameEn: 'Face Pull', sets: 3, reps: '15-20', rest: 60, rir: 1, muscles: ['ramena'], equipment: 'cable' },
      { name: 'Rear Delt Fly', nameEn: 'Rear Delt Fly', sets: 3, reps: '12-15', rest: 60, rir: 1, muscles: ['ramena'], equipment: 'dumbbell' },
    ],
    'noge': [
      { name: 'Squat', nameEn: 'Squat', sets: 4, reps: '6-8', rest: 180, rir: 2, muscles: ['noge'], equipment: 'barbell' },
      { name: 'Romanian Deadlift', nameEn: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: 120, rir: 2, muscles: ['noge'], equipment: 'barbell' },
      { name: 'Leg Press', nameEn: 'Leg Press', sets: 3, reps: '10-12', rest: 120, rir: 2, muscles: ['noge'], equipment: 'machine' },
      { name: 'Leg Curl', nameEn: 'Leg Curl', sets: 3, reps: '12-15', rest: 60, rir: 1, muscles: ['noge'], equipment: 'machine' },
      { name: 'Calf Raise', nameEn: 'Calf Raise', sets: 4, reps: '15-20', rest: 60, rir: 1, muscles: ['noge'], equipment: 'machine' },
    ],
    'ruke': [
      { name: 'Close Grip Bench Press', nameEn: 'Close Grip Bench Press', sets: 3, reps: '8-10', rest: 90, rir: 2, muscles: ['triceps'], equipment: 'barbell' },
      { name: 'Tricep Dips', nameEn: 'Tricep Dips', sets: 3, reps: '10-12', rest: 90, rir: 2, muscles: ['triceps'], equipment: 'bodyweight' },
      { name: 'Preacher Curl', nameEn: 'Preacher Curl', sets: 3, reps: '10-12', rest: 60, rir: 2, muscles: ['biceps'], equipment: 'ez_bar' },
      { name: 'Incline Dumbbell Curl', nameEn: 'Incline Dumbbell Curl', sets: 3, reps: '12-15', rest: 60, rir: 1, muscles: ['biceps'], equipment: 'dumbbell' },
    ],
  };
  
  // Fallback
  return exercises[splitName] || [
    { name: 'Squat', nameEn: 'Squat', sets: 3, reps: '10', rest: 90, rir: 2, muscles: ['noge'], equipment: 'barbell' },
    { name: 'Bench Press', nameEn: 'Bench Press', sets: 3, reps: '10', rest: 90, rir: 2, muscles: ['prsa'], equipment: 'barbell' },
    { name: 'Row', nameEn: 'Row', sets: 3, reps: '10', rest: 90, rir: 2, muscles: ['leđa'], equipment: 'barbell' },
  ];
}

