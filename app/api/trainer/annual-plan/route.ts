import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

const supabase = createServiceClient();

const CreateAnnualPlanSchema = z.object({
  clientId: z.string().uuid({ message: 'clientId mora biti validan UUID' }),
  year: z.number().int().min(2020).max(2100),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate mora biti u formatu YYYY-MM-DD' }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate mora biti u formatu YYYY-MM-DD' }),
});

/**
 * POST /api/trainer/annual-plan
 * Kreira novi godišnji plan za klijenta
 */
export async function POST(request: NextRequest) {
  return requireTrainer(request, async (req, auth) => {
    try {
      const body = await req.json();
      const parseResult = CreateAnnualPlanSchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Validacija nije prošla',
          detalji: parseResult.error.issues,
          code: 'VALIDATION_ERROR',
        }, { status: 400 });
      }

      const { clientId, year, name, description, startDate, endDate } = parseResult.data;
      const trainerId = auth.userId;

      // Provjeri da li klijent pripada treneru
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .single();

      if (clientError || !client) {
        return NextResponse.json({
          success: false,
          error: 'Klijent nije pronađen ili nemate pristup',
          code: 'CLIENT_NOT_FOUND',
        }, { status: 404 });
      }

      // Provjeri da li već postoji godišnji plan za ovu godinu
      const { data: existingPlan, error: existingError } = await supabase
        .from('annual_programs')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', year)
        .maybeSingle();

      if (existingPlan) {
        return NextResponse.json({
          success: false,
          error: 'Godišnji plan za ovu godinu već postoji',
          code: 'ALREADY_EXISTS',
          data: { annualProgramId: existingPlan.id },
        }, { status: 409 });
      }

      // Kreiraj novi godišnji plan
      const { data: annualProgram, error: insertError } = await supabase
        .from('annual_programs')
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          year,
          name,
          description: description || null,
          start_date: startDate,
          end_date: endDate,
          status: 'draft',
        })
        .select('id, name, year, start_date, end_date, status')
        .single();

      if (insertError) {
        console.error('[trainer/annual-plan] Error creating annual plan:', insertError);
        return NextResponse.json({
          success: false,
          error: insertError.message,
          code: 'DB_ERROR',
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: annualProgram.id,
          name: annualProgram.name,
          year: annualProgram.year,
          startDate: annualProgram.start_date,
          endDate: annualProgram.end_date,
          status: annualProgram.status,
          mesocycles: [],
        },
      });
    } catch (error) {
      console.error('[trainer/annual-plan] Unexpected error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR',
      }, { status: 500 });
    }
  });
}

/**
 * GET /api/trainer/annual-plan?clientId=...&year=...
 * Dohvaća godišnji plan za klijenta i godinu
 */
export async function GET(request: NextRequest) {
  return requireTrainer(request, async (req, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const clientId = searchParams.get('clientId');
      const yearParam = searchParams.get('year');

      if (!clientId || !yearParam) {
        return NextResponse.json({
          success: false,
          error: 'clientId i year su obavezni parametri',
          code: 'MISSING_PARAMS',
        }, { status: 400 });
      }

      const year = parseInt(yearParam, 10);
      if (isNaN(year)) {
        return NextResponse.json({
          success: false,
          error: 'year mora biti validan broj',
          code: 'INVALID_YEAR',
        }, { status: 400 });
      }

      const trainerId = auth.userId;

      // Provjeri da li klijent pripada treneru
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .single();

      if (clientError || !client) {
        return NextResponse.json({
          success: false,
          error: 'Klijent nije pronađen ili nemate pristup',
          code: 'CLIENT_NOT_FOUND',
        }, { status: 404 });
      }

      // Dohvati godišnji plan
      const { data: annualProgram, error: planError } = await supabase
        .from('annual_programs')
        .select('id, name, description, year, start_date, end_date, status, notes')
        .eq('client_id', clientId)
        .eq('year', year)
        .maybeSingle();

      if (planError) {
        console.error('[trainer/annual-plan] Error fetching annual plan:', planError);
        return NextResponse.json({
          success: false,
          error: planError.message,
          code: 'DB_ERROR',
        }, { status: 500 });
      }

      if (!annualProgram) {
        return NextResponse.json({
          success: false,
          error: 'Godišnji plan nije pronađen',
          code: 'NOT_FOUND',
        }, { status: 404 });
      }

      // Dohvati mezocikluse povezane s ovim godišnjim planom
      const { data: mesocycleLinks, error: mesocycleError } = await supabase
        .from('annual_plan_mesocycles')
        .select('id, training_program_id, order_index, planned_start_date, planned_end_date, status, notes')
        .eq('annual_program_id', annualProgram.id)
        .order('order_index');

      if (mesocycleError) {
        console.error('[trainer/annual-plan] Error fetching mesocycles:', mesocycleError);
        // Nastavi bez mezociklusa ako je greška
      }

      // Dohvati detalje mezociklusa iz training_programs i mesocycles
      const mesocycles: any[] = [];
      if (mesocycleLinks && mesocycleLinks.length > 0) {
        for (const link of mesocycleLinks) {
          // Dohvati training_program
          const { data: trainingProgram, error: tpError } = await supabase
            .from('training_programs')
            .select('id, name, duration_weeks, goal, level, split_type')
            .eq('id', link.training_program_id)
            .single();

          if (tpError || !trainingProgram) continue;

          // Dohvati mezocikluse iz ovog programa
          const { data: mesocyclesData, error: mError } = await supabase
            .from('mesocycles')
            .select('id, name, focus, week_start, week_end, order_index')
            .eq('program_id', link.training_program_id)
            .order('order_index');

          if (mError || !mesocyclesData || mesocyclesData.length === 0) continue;

          // Za svaki mezociklus u programu, kreiraj entry
          for (const meso of mesocyclesData) {
            const durationWeeks = (meso.week_end || 0) - (meso.week_start || 0) + 1;
            mesocycles.push({
              id: meso.id,
              trainingProgramId: link.training_program_id,
              name: meso.name || `${trainingProgram.name} - Mezociklus ${meso.order_index}`,
              type: meso.focus, // volume, intensity, peak, deload
              startWeek: meso.week_start || 1,
              durationWeeks: durationWeeks || trainingProgram.duration_weeks || 4,
              status: link.status || 'planned',
              orderIndex: link.order_index,
              plannedStartDate: link.planned_start_date,
              plannedEndDate: link.planned_end_date,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: annualProgram.id,
          name: annualProgram.name,
          description: annualProgram.description,
          year: annualProgram.year,
          startDate: annualProgram.start_date,
          endDate: annualProgram.end_date,
          status: annualProgram.status,
          notes: annualProgram.notes,
          mesocycles,
        },
      });
    } catch (error) {
      console.error('[trainer/annual-plan] Unexpected error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SERVER_ERROR',
      }, { status: 500 });
    }
  });
}

