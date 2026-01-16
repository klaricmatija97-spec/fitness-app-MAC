import { NextResponse } from 'next/server';
import exerciseDatabase from '../../../../data/exercises/wrkout-database.json';

export async function GET() {
  try {
    const exercises = exerciseDatabase as any[];
    
    return NextResponse.json({
      success: true,
      totalExercises: exercises?.length || 0,
      isArray: Array.isArray(exercises),
      first3: exercises?.slice(0, 3).map((e: any) => ({
        id: e.id,
        name: e.name,
        primaryMuscles: e.primaryMuscles,
      })) || [],
      importWorked: exercises && exercises.length > 0,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      importFailed: true,
    }, { status: 500 });
  }
}
