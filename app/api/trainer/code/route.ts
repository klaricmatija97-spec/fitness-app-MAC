/**
 * Trainer Code API
 * =================
 * GET  - Dohvati kod trenera
 * POST - Generiraj novi kod (ako trener nema)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

const supabase = createServiceClient();

/**
 * GET /api/trainer/code
 * Dohvaća trainer_code za trenutnog trenera
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const trainerId = auth.userId;

    // Dohvati trenera iz trainers tablice
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, name, email, trainer_code')
      .eq('id', trainerId)
      .single();

    if (trainerError) {
      // Ako trener ne postoji u trainers tablici, kreiraj ga
      if (trainerError.code === 'PGRST116') {
        // Generiraj novi kod
        const newCode = generateTrainerCode();
        
        const { data: newTrainer, error: insertError } = await supabase
          .from('trainers')
          .insert({
            id: trainerId,
            name: 'Trener',
            email: `trainer-${trainerId}@app.com`,
            trainer_code: newCode,
          })
          .select('id, name, email, trainer_code')
          .single();

        if (insertError) {
          console.error('[trainer/code] Error creating trainer:', insertError);
          return NextResponse.json(
            { success: false, error: insertError.message, code: 'DB_ERROR' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            trainerId: newTrainer.id,
            trainerCode: newTrainer.trainer_code,
            name: newTrainer.name,
          },
          message: 'Novi kod generiran',
        });
      }

      console.error('[trainer/code] Error fetching trainer:', trainerError);
      return NextResponse.json(
        { success: false, error: trainerError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        trainerId: trainer.id,
        trainerCode: trainer.trainer_code,
        name: trainer.name,
      },
    });
  } catch (error) {
    console.error('[trainer/code] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trainer/code
 * Regenerira trainer_code (ako trener želi novi kod)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const trainerId = auth.userId;
    const newCode = generateTrainerCode();

    const { data: trainer, error: updateError } = await supabase
      .from('trainers')
      .update({ trainer_code: newCode, updated_at: new Date().toISOString() })
      .eq('id', trainerId)
      .select('id, trainer_code')
      .single();

    if (updateError) {
      console.error('[trainer/code] Error updating code:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        trainerId: trainer.id,
        trainerCode: trainer.trainer_code,
      },
      message: 'Novi kod generiran',
    });
  } catch (error) {
    console.error('[trainer/code] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Generira jedinstveni trainer kod
 * Format: TRN-XXXX (4 random alfanumerička znaka)
 */
function generateTrainerCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bez sličnih znakova (0/O, 1/I/L)
  let code = 'TRN-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

