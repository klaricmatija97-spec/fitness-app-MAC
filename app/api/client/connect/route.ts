/**
 * Client Connect API
 * ==================
 * POST - Poveži klijenta s trenerom putem koda
 * GET  - Provjeri status povezanosti
 * DELETE - Prekini vezu s trenerom
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase';
import { requireAuth } from '@/lib/api/auth-helpers';

const supabase = createServiceClient();

const ConnectSchema = z.object({
  trainerCode: z.string()
    .min(8, 'Kod mora imati najmanje 8 znakova')
    .max(10, 'Kod može imati najviše 10 znakova')
    .regex(/^TRN-[A-Z0-9]{4}$/, 'Neispravan format koda. Očekivani format: TRN-XXXX'),
});

/**
 * POST /api/client/connect
 * Povezuje klijenta s trenerom putem trainer_code
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const clientId = auth.userId;
    const body = await request.json();

    // Validiraj input
    const parseResult = ConnectSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Neispravan kod trenera',
          details: parseResult.error.issues,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const { trainerCode } = parseResult.data;

    // Pronađi trenera po kodu
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, name, email, trainer_code, max_clients')
      .eq('trainer_code', trainerCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trener s tim kodom nije pronađen. Provjerite kod i pokušajte ponovo.',
          code: 'TRAINER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Provjeri da li klijent već ima trenera
    const { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id, trainer_id, name')
      .eq('id', clientId)
      .single();

    if (clientError && clientError.code !== 'PGRST116') {
      console.error('[client/connect] Error fetching client:', clientError);
      return NextResponse.json(
        { success: false, error: clientError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Ako klijent ne postoji u clients tablici, kreiraj ga
    if (!existingClient) {
      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          id: clientId,
          name: 'Novi klijent',
          email: `client-${clientId}@app.com`,
          trainer_id: trainer.id,
          connected_at: new Date().toISOString(),
          invite_status: 'connected',
          // Default vrijednosti
          honorific: 'other',
          age_range: 'other',
          weight_value: 70,
          weight_unit: 'kg',
          height_value: 170,
          height_unit: 'cm',
          activities: [],
          goals: [],
          diet_cleanliness: 50,
        });

      if (insertError) {
        console.error('[client/connect] Error creating client:', insertError);
        return NextResponse.json(
          { success: false, error: insertError.message, code: 'DB_ERROR' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Uspješno ste se povezali s trenerom ${trainer.name}!`,
        data: {
          trainerId: trainer.id,
          trainerName: trainer.name,
          connectedAt: new Date().toISOString(),
        },
      });
    }

    // Provjeri da li je već povezan s istim trenerom
    if (existingClient.trainer_id === trainer.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Već ste povezani s ovim trenerom.',
          code: 'ALREADY_CONNECTED',
        },
        { status: 409 }
      );
    }

    // Provjeri da li je povezan s drugim trenerom
    if (existingClient.trainer_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Već ste povezani s drugim trenerom. Prekinite vezu prije nego se povežete s novim.',
          code: 'HAS_TRAINER',
        },
        { status: 409 }
      );
    }

    // Poveži klijenta s trenerom
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        trainer_id: trainer.id,
        connected_at: new Date().toISOString(),
        invite_status: 'connected',
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('[client/connect] Error updating client:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Uspješno ste se povezali s trenerom ${trainer.name}!`,
      data: {
        trainerId: trainer.id,
        trainerName: trainer.name,
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[client/connect] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/client/connect
 * Dohvaća status povezanosti klijenta
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const clientId = auth.userId;

    // Dohvati klijenta i njegovog trenera
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id, 
        name, 
        trainer_id, 
        connected_at, 
        invite_status
      `)
      .eq('id', clientId)
      .single();

    if (clientError) {
      if (clientError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: {
            isConnected: false,
            trainer: null,
          },
        });
      }
      return NextResponse.json(
        { success: false, error: clientError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    if (!client.trainer_id) {
      return NextResponse.json({
        success: true,
        data: {
          isConnected: false,
          trainer: null,
        },
      });
    }

    // Dohvati podatke o treneru
    const { data: trainer } = await supabase
      .from('trainers')
      .select('id, name, email, specializations')
      .eq('id', client.trainer_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        isConnected: true,
        connectedAt: client.connected_at,
        trainer: trainer ? {
          id: trainer.id,
          name: trainer.name,
          email: trainer.email,
          specializations: trainer.specializations,
        } : null,
      },
    });
  } catch (error) {
    console.error('[client/connect] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/client/connect
 * Prekida vezu klijenta s trenerom
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const clientId = auth.userId;

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        trainer_id: null,
        invite_status: 'disconnected',
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('[client/connect] Error disconnecting:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Veza s trenerom je prekinuta.',
    });
  } catch (error) {
    console.error('[client/connect] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

