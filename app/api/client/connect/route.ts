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
  // Intake podaci (opcionalno, šalju se ako klijent nije prethodno registriran)
  intakeData: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    honorific: z.string().optional(),
    age: z.number().optional(),
    weight: z.object({
      value: z.number(),
      unit: z.string(),
    }).optional(),
    height: z.object({
      value: z.number(),
      unit: z.string(),
    }).optional(),
    goal: z.string().optional(),
    activities: z.array(z.string()).optional(),
    trainingFrequency: z.string().optional(),
    healthConditions: z.string().optional(),
    foodPreferences: z.string().optional(),
    avoidIngredients: z.string().optional(),
    allergies: z.string().optional(),
  }).optional(),
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

    const { trainerCode, intakeData } = parseResult.data;

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

    // Ako klijent ne postoji u clients tablici, kreiraj ga s intake podacima
    // VAŽNO: Klijent se kreira SAMO kada korisnik ručno unese kod trenera (POST request)
    // NIKADA se ne kreira automatski bez koda!
    if (!existingClient) {
      // Provjeri da li klijent ima user_accounts (registriran je)
      // Ako nema user_accounts, to znači da je to mock client_id i ne smije se kreirati s trenerom
      const { data: userAccount } = await supabase
        .from('user_accounts')
        .select('client_id')
        .eq('client_id', clientId)
        .single();
      
      if (!userAccount) {
        // Klijent nije registriran - ne kreiraj ga automatski s trenerom!
        // Korisnik se mora prvo registrirati, a zatim ručno povezati s trenerom unosom koda
        return NextResponse.json(
          {
            success: false,
            error: 'Morate se prvo registrirati prije nego se povežete s trenerom. Molimo registrirajte se i pokušajte ponovno.',
            code: 'NOT_REGISTERED',
          },
          { status: 400 }
        );
      }
      
      // Mapiraj goal iz mobilne forme na backend format
      const mapGoal = (goal?: string): string[] => {
        if (!goal) return [];
        const goalMap: Record<string, string> = {
          'FAT_LOSS': 'lose-fat',
          'RECOMPOSITION': 'recomp',
          'MUSCLE_GAIN': 'gain-muscle',
          'ENDURANCE': 'endurance',
        };
        const mapped = goalMap[goal];
        return mapped ? [mapped] : [];
      };

      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          id: clientId,
          name: intakeData?.name || 'Novi klijent',
          email: intakeData?.email || `client-${clientId}@app.com`,
          trainer_id: trainer.id, // Samo kada korisnik ručno unese kod!
          connected_at: new Date().toISOString(),
          invite_status: 'connected',
          // Podaci iz intake forme
          honorific: intakeData?.honorific || 'other',
          age_range: intakeData?.age ? `${intakeData.age}` : 'other', // Spremamo točnu dob kao string
          weight_value: intakeData?.weight?.value || 70,
          weight_unit: intakeData?.weight?.unit || 'kg',
          height_value: intakeData?.height?.value || 170,
          height_unit: intakeData?.height?.unit || 'cm',
          activities: intakeData?.activities || [],
          goals: mapGoal(intakeData?.goal),
          training_frequency: intakeData?.trainingFrequency ? parseInt(intakeData.trainingFrequency) : null,
          injuries: intakeData?.healthConditions || null,
          allergies: (() => {
            // Kombiniraj sve food preferencije
            const parts: string[] = [];
            if (intakeData?.allergies?.trim()) {
              parts.push(`alergije: ${intakeData.allergies.trim()}`);
            }
            if (intakeData?.avoidIngredients?.trim()) {
              parts.push(`ne želim: ${intakeData.avoidIngredients.trim()}`);
            }
            if (intakeData?.foodPreferences?.trim()) {
              parts.push(`preferiram: ${intakeData.foodPreferences.trim()}`);
            }
            return parts.length > 0 ? parts.join(". ") : null;
          })(),
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

    // Poveži klijenta s trenerom I ažuriraj intake podatke ako su poslani
    const updateData: Record<string, any> = {
      trainer_id: trainer.id,
      connected_at: new Date().toISOString(),
      invite_status: 'connected',
    };

    // Ako imamo intake podatke, ažuriraj ih
    if (intakeData) {
      // NIKAD ne prepisuj ime ako klijent već ima pravo ime (koje nije "Novi klijent" ili prazno)
      // Samo postavi ime ako:
      // 1. intakeData ima ime I (klijent nema ime ILI ima "Novi klijent")
      if (intakeData.name && intakeData.name.trim()) {
        // Samo ažuriraj ako postojeće ime ne postoji ili je "Novi klijent"
        if (!existingClient.name || existingClient.name === 'Novi klijent' || existingClient.name.trim() === '') {
        updateData.name = intakeData.name.trim();
        }
        // Inače ZADRŽI postojeće ime - ne prepisuj ga!
      }
      // Ako intakeData.name nije poslan, NE DIRAJ postojeće ime
      if (intakeData.email) updateData.email = intakeData.email;
      if (intakeData.honorific) updateData.honorific = intakeData.honorific;
      if (intakeData.age) updateData.age_range = `${intakeData.age}`;
      if (intakeData.weight?.value) {
        updateData.weight_value = intakeData.weight.value;
        updateData.weight_unit = intakeData.weight.unit || 'kg';
      }
      if (intakeData.height?.value) {
        updateData.height_value = intakeData.height.value;
        updateData.height_unit = intakeData.height.unit || 'cm';
      }
      if (intakeData.activities?.length) updateData.activities = intakeData.activities;
      if (intakeData.goal) {
        const mapGoalUpdate = (goal: string): string[] => {
          const goalMap: Record<string, string> = {
            'FAT_LOSS': 'lose-fat',
            'RECOMPOSITION': 'recomp',
            'MUSCLE_GAIN': 'gain-muscle',
            'ENDURANCE': 'endurance',
          };
          const mapped = goalMap[goal];
          return mapped ? [mapped] : [];
        };
        updateData.goals = mapGoalUpdate(intakeData.goal);
      }
      if (intakeData.trainingFrequency) {
        updateData.training_frequency = parseInt(intakeData.trainingFrequency);
      }
      if (intakeData.healthConditions) updateData.injuries = intakeData.healthConditions;
      
      // Kombiniraj food preferencije
      const foodParts: string[] = [];
      if (intakeData.allergies?.trim()) {
        foodParts.push(`alergije: ${intakeData.allergies.trim()}`);
      }
      if (intakeData.avoidIngredients?.trim()) {
        foodParts.push(`ne želim: ${intakeData.avoidIngredients.trim()}`);
      }
      if (intakeData.foodPreferences?.trim()) {
        foodParts.push(`preferiram: ${intakeData.foodPreferences.trim()}`);
      }
      if (foodParts.length > 0) {
        updateData.allergies = foodParts.join(". ");
      }
    }

    console.log('[client/connect] Updating client with data:', {
      clientId,
      trainerId: trainer.id,
      trainerName: trainer.name,
      updateDataKeys: Object.keys(updateData),
    });

    const { error: updateError, data: updatedClient } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select('id, name, trainer_id, connected_at')
      .single();

    if (updateError) {
      console.error('[client/connect] Error updating client:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message, code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    console.log('[client/connect] Client updated successfully:', {
      clientId: updatedClient?.id,
      name: updatedClient?.name,
      trainer_id: updatedClient?.trainer_id,
      connected_at: updatedClient?.connected_at,
    });

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

