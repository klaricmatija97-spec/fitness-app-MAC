/**
 * Client Session Complete API
 * ===========================
 * POST /api/client/session/:sessionId/complete
 * 
 * Završava workout session i sprema execution data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireClient } from '@/lib/api/auth-helpers';
import { z } from 'zod';

const CompleteSessionSchema = z.object({
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  exercises: z.array(
    z.object({
      exerciseId: z.string().uuid(),
      completedSets: z.array(
        z.object({
          setNumber: z.number().int().min(1),
          reps: z.number().int().min(0),
          load: z.number().min(0).optional(),
          rir: z.number().int().min(0).max(10).optional(),
          rpe: z.number().min(1).max(10).optional(),
        })
      ),
      painReported: z.boolean().optional(),
      difficultyReported: z.boolean().optional(),
      notes: z.string().optional(),
      substituted: z.boolean().optional(),
    })
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Provjeri autentifikaciju
    const auth = requireClient(request);
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

    const { userId } = auth;
    const { sessionId } = await params;
    const body = await request.json();
    const parseResult = CompleteSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Provjeri da session pripada programu klijenta
    const { data: session } = await supabase
      .from('program_sessions')
      .select('id, program_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const { data: program } = await supabase
      .from('training_programs')
      .select('id, client_id, status')
      .eq('id', session.program_id)
      .eq('client_id', userId)
      .eq('status', 'active')
      .single();

    if (!program) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // TODO: Spremi workout log u workout_logs tablicu kada se implementira
    // Za sada, samo vraćamo success

    const startedAt = new Date(parseResult.data.startedAt);
    const completedAt = new Date(parseResult.data.completedAt);
    const duration = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000 / 60); // minutes

    const exercisesCompleted = parseResult.data.exercises.filter(
      (ex) => ex.completedSets && ex.completedSets.length > 0
    ).length;

    const totalExercises = parseResult.data.exercises.length;

    // TODO: Izračunaj adherence
    const adherence = 85; // Placeholder

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        completedAt: parseResult.data.completedAt,
        duration,
        exercisesCompleted,
        totalExercises,
        adherence,
      },
    });
  } catch (error) {
    console.error('[client/session/complete] Unexpected error:', error);
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

