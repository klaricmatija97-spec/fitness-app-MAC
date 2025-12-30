/**
 * Exercise Library API
 * ====================
 * GET /api/training/exercises
 * 
 * Dohvaća sve vježbe iz exercise library-a za manual builder
 * Vraća filtrirane vježbe prema opremi, mišićnim grupama, razini
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// ============================================
// CACHE ZA VJEŽBE
// ============================================

let exercisesCache: any[] | null = null;

async function loadExercises(): Promise<any[]> {
  if (exercisesCache) {
    return exercisesCache;
  }

  try {
    const exercisePath = path.join(process.cwd(), 'data', 'exercises', 'wrkout-database.json');
    const fileContent = await fs.readFile(exercisePath, 'utf-8');
    const exercises = JSON.parse(fileContent);
    
    // Ako je array, vrati direktno; ako je objekt s 'exercises', vrati exercises
    exercisesCache = Array.isArray(exercises) ? exercises : (exercises.exercises || []);
    return exercisesCache;
  } catch (error) {
    console.error('[Exercise API] Greška pri učitavanju vježbi:', error);
    return [];
  }
}

// ============================================
// GET - Dohvati vježbe
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Filteri
    const equipment = searchParams.get('equipment');
    const muscleGroup = searchParams.get('muscleGroup');
    const level = searchParams.get('level');
    const mechanic = searchParams.get('mechanic'); // compound, isolation
    const search = searchParams.get('search'); // Pretraga po imenu
    
    // Učitaj sve vježbe
    let exercises = await loadExercises();
    
    // Primjeni filtere
    if (equipment) {
      exercises = exercises.filter((ex: any) => 
        ex.equipment?.toLowerCase().includes(equipment.toLowerCase())
      );
    }
    
    if (muscleGroup) {
      exercises = exercises.filter((ex: any) => 
        ex.primaryMuscles?.some((m: string) => 
          m.toLowerCase().includes(muscleGroup.toLowerCase())
        ) || ex.secondaryMuscles?.some((m: string) => 
          m.toLowerCase().includes(muscleGroup.toLowerCase())
        )
      );
    }
    
    if (level) {
      exercises = exercises.filter((ex: any) => 
        ex.level?.toLowerCase() === level.toLowerCase()
      );
    }
    
    if (mechanic) {
      exercises = exercises.filter((ex: any) => 
        ex.mechanic?.toLowerCase() === mechanic.toLowerCase()
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      exercises = exercises.filter((ex: any) => 
        ex.name?.toLowerCase().includes(searchLower) ||
        ex.name_hr?.toLowerCase().includes(searchLower)
      );
    }
    
    // Limit rezultata (max 500)
    const limit = parseInt(searchParams.get('limit') || '500');
    exercises = exercises.slice(0, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        exercises,
        count: exercises.length,
        filters: {
          equipment: equipment || null,
          muscleGroup: muscleGroup || null,
          level: level || null,
          mechanic: mechanic || null,
          search: search || null,
        },
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    }, { status: 500 });
  }
}

// ============================================
// GET - Info
// ============================================

export async function POST() {
  return NextResponse.json({
    endpoint: 'GET /api/training/exercises',
    opis: 'Dohvaća vježbe iz exercise library-a za manual builder',
    parametri: {
      equipment: 'Filter po opremi (opcionalno)',
      muscleGroup: 'Filter po mišićnoj grupi (opcionalno)',
      level: 'Filter po razini: beginner, intermediate, advanced (opcionalno)',
      mechanic: 'Filter po mehanici: compound, isolation (opcionalno)',
      search: 'Pretraga po imenu vježbe (opcionalno)',
      limit: 'Maksimalan broj rezultata (default: 500)',
    },
    primjer: {
      url: '/api/training/exercises?equipment=barbell&muscleGroup=chest&level=intermediate&limit=50',
      opis: 'Dohvaća 50 vježbi za prsa s opremom barbell, razina intermediate',
    },
  });
}

