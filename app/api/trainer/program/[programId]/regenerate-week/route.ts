/**
 * Trainer Program Regenerate Week API
 * ===================================
 * POST /api/trainer/program/[programId]/regenerate-week
 * 
 * Regenerira sljedeći tjedan programa za klijenta
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';
import { z } from 'zod';
import { generirajHibridniProgram } from '@/lib/pro-generator';

const supabase = createServiceClient();

const RegenerateWeekSchema = z.object({
  weekNumber: z.number().int().min(1).optional(), // Ako nije specificiran, regenerira sljedeći tjedan
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  return requireTrainer(request, async (req, auth) => {
    try {
      const { programId } = await params;
      const body = await req.json();
      const parseResult = RegenerateWeekSchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validacija nije prošla',
            detalji: parseResult.error.issues,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        );
      }

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
            error: 'Program nije pronađen',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      }

      // Provjeri da li program pripada treneru (preko client_id)
      if (program.client_id) {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('trainer_id')
          .eq('id', program.client_id)
          .single();

        if (clientError || !client || client.trainer_id !== auth.userId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Nemate pristup ovom programu',
              code: 'UNAUTHORIZED',
            },
            { status: 403 }
          );
        }
      }

      // Koristi fill-gaps logiku za regeneriranje tjedna
      // Ovo će popuniti prazne sesije za specificirani tjedan
      const result = await generirajHibridniProgram({
        programId,
        popuniSamo: true, // Popuni samo prazne dijelove
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Nije moguće regenerirati tjedan',
            code: 'GENERATION_ERROR',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          programId,
          message: 'Tjedan je uspješno regeneriran',
          regeneratedSessions: result.data?.regeneratedSessions || 0,
        },
      });
    } catch (error) {
      console.error('[trainer/program/regenerate-week] Unexpected error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 'SERVER_ERROR',
        },
        { status: 500 }
      );
    }
  });
}

