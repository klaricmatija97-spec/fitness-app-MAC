/**
 * Trainer Program Publish API
 * ===========================
 * POST /api/trainer/program/:programId/publish
 * 
 * Publish draft program to client (draft → active)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';
import { z } from 'zod';

const PublishSchema = z.object({
  clientId: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    // Provjeri autentifikaciju
    const auth = requireTrainer(request);
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

    const { programId } = await params;
    const body = await request.json();
    const parseResult = PublishSchema.safeParse(body);

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

    // Dohvati program
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select('*')
      .eq('id', programId)
      .single();

    if (programError || !program) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Provjeri da je program u draft statusu
    if (program.status !== 'draft') {
      return NextResponse.json(
        {
          success: false,
          error: 'Program is not in draft status',
          code: 'VALIDATION_ERROR',
          details: [
            {
              field: 'status',
              message: 'Only draft programs can be published',
            },
          ],
        },
        { status: 400 }
      );
    }

    // Validacija: program mora imati barem 1 mezociklus
    const { count: mesocyclesCount } = await supabase
      .from('mesocycles')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', programId);

    if (!mesocyclesCount || mesocyclesCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program validation failed',
          code: 'VALIDATION_ERROR',
          details: [
            {
              field: 'mesocycles',
              message: 'Program must have at least 1 mesocycle',
            },
          ],
        },
        { status: 400 }
      );
    }

    // Validacija: program mora imati barem 1 sesiju
    const { count: sessionsCount } = await supabase
      .from('program_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', programId);

    if (!sessionsCount || sessionsCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program validation failed',
          code: 'VALIDATION_ERROR',
          details: [
            {
              field: 'sessions',
              message: 'Program must have at least 1 session',
            },
          ],
        },
        { status: 400 }
      );
    }

    // Ako je clientId proslijeđen, ažuriraj program
    const clientId = parseResult.data.clientId || program.client_id;
    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program validation failed',
          code: 'VALIDATION_ERROR',
          details: [
            {
              field: 'clientId',
              message: 'Program must be assigned to a client',
            },
          ],
        },
        { status: 400 }
      );
    }

    // Ažuriraj program status: draft → active
    const { error: updateError } = await supabase
      .from('training_programs')
      .update({
        status: 'active',
        client_id: clientId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId);

    if (updateError) {
      console.error('[trainer/program/publish] Error updating program:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          code: 'SERVER_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        programId,
        status: 'active',
        publishedAt: new Date().toISOString(),
        clientId,
      },
    });
  } catch (error) {
    console.error('[trainer/program/publish] Unexpected error:', error);
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

