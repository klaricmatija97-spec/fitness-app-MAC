import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

const supabase = createServiceClient();

const UpdateAnnualPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  notes: z.string().optional().nullable(),
  mesocycles: z.array(z.object({
    id: z.string().uuid().optional(),
    trainingProgramId: z.string().uuid(),
    orderIndex: z.number().int().min(1),
    plannedStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    plannedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    status: z.enum(['planned', 'active', 'completed', 'skipped']).optional(),
  })).optional(),
});

/**
 * PATCH /api/trainer/annual-plan/[annualProgramId]
 * Ažurira godišnji plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { annualProgramId: string } }
) {
  return requireTrainer(request, async (req, auth) => {
    try {
      const { annualProgramId } = params;
      const body = await req.json();
      const parseResult = UpdateAnnualPlanSchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Validacija nije prošla',
          detalji: parseResult.error.issues,
          code: 'VALIDATION_ERROR',
        }, { status: 400 });
      }

      const trainerId = auth.clientId;
      const updateData = parseResult.data;

      // Provjeri da li godišnji plan postoji i pripada treneru
      const { data: annualProgram, error: planError } = await supabase
        .from('annual_programs')
        .select('id, trainer_id')
        .eq('id', annualProgramId)
        .eq('trainer_id', trainerId)
        .single();

      if (planError || !annualProgram) {
        return NextResponse.json({
          success: false,
          error: 'Godišnji plan nije pronađen ili nemate pristup',
          code: 'NOT_FOUND',
        }, { status: 404 });
      }

      // Ažuriraj osnovne podatke
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.name !== undefined) updates.name = updateData.name;
      if (updateData.description !== undefined) updates.description = updateData.description;
      if (updateData.status !== undefined) updates.status = updateData.status;
      if (updateData.notes !== undefined) updates.notes = updateData.notes;

      if (Object.keys(updates).length > 1) { // Više od samo updated_at
        const { error: updateError } = await supabase
          .from('annual_programs')
          .update(updates)
          .eq('id', annualProgramId);

        if (updateError) {
          console.error('[trainer/annual-plan] Error updating annual plan:', updateError);
          return NextResponse.json({
            success: false,
            error: updateError.message,
            code: 'DB_ERROR',
          }, { status: 500 });
        }
      }

      // Ažuriraj mezocikluse ako su poslani
      if (updateData.mesocycles && updateData.mesocycles.length > 0) {
        // Obriši postojeće veze (opcionalno - ovisno o logici)
        // Za sada samo ažuriramo postojeće ili dodajemo nove

        for (const meso of updateData.mesocycles) {
          if (meso.id) {
            // Ažuriraj postojeći
            const { error: updateMesoError } = await supabase
              .from('annual_plan_mesocycles')
              .update({
                order_index: meso.orderIndex,
                planned_start_date: meso.plannedStartDate || null,
                planned_end_date: meso.plannedEndDate || null,
                status: meso.status || 'planned',
                updated_at: new Date().toISOString(),
              })
              .eq('id', meso.id)
              .eq('annual_program_id', annualProgramId);

            if (updateMesoError) {
              console.error('[trainer/annual-plan] Error updating mesocycle link:', updateMesoError);
            }
          } else {
            // Dodaj novi
            const { error: insertMesoError } = await supabase
              .from('annual_plan_mesocycles')
              .insert({
                annual_program_id: annualProgramId,
                training_program_id: meso.trainingProgramId,
                order_index: meso.orderIndex,
                planned_start_date: meso.plannedStartDate || null,
                planned_end_date: meso.plannedEndDate || null,
                status: meso.status || 'planned',
              });

            if (insertMesoError) {
              console.error('[trainer/annual-plan] Error inserting mesocycle link:', insertMesoError);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          annualProgramId,
          message: 'Godišnji plan je ažuriran',
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
 * DELETE /api/trainer/annual-plan/[annualProgramId]
 * Briše godišnji plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { annualProgramId: string } }
) {
  return requireTrainer(request, async (req, auth) => {
    try {
      const { annualProgramId } = params;
      const trainerId = auth.clientId;

      // Provjeri da li godišnji plan postoji i pripada treneru
      const { data: annualProgram, error: planError } = await supabase
        .from('annual_programs')
        .select('id, trainer_id')
        .eq('id', annualProgramId)
        .eq('trainer_id', trainerId)
        .single();

      if (planError || !annualProgram) {
        return NextResponse.json({
          success: false,
          error: 'Godišnji plan nije pronađen ili nemate pristup',
          code: 'NOT_FOUND',
        }, { status: 404 });
      }

      // Obriši (CASCADE će obrisati i povezane mezocikluse)
      const { error: deleteError } = await supabase
        .from('annual_programs')
        .delete()
        .eq('id', annualProgramId);

      if (deleteError) {
        console.error('[trainer/annual-plan] Error deleting annual plan:', deleteError);
        return NextResponse.json({
          success: false,
          error: deleteError.message,
          code: 'DB_ERROR',
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          annualProgramId,
          message: 'Godišnji plan je obrisan',
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

