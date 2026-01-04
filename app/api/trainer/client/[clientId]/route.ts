/**
 * Trainer Client Detail API
 * =========================
 * GET /api/trainer/client/:clientId
 * 
 * Dohvaća KOMPLETNI client detail s svim podacima:
 * - Osobni podaci
 * - Tjelesne mjere
 * - Ciljevi i aktivnosti
 * - Trening preferencije
 * - Prehrana i alergije
 * - Kalkulator rezultati
 * - Program i adherence
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { requireTrainer } from '@/lib/api/auth-helpers';

// Helper funkcije za formatiranje labels
const goalLabels: Record<string, string> = {
  // Nove vrijednosti iz IntakeFlowScreen
  'FAT_LOSS': '🔥 Skinuti masno tkivo',
  'RECOMPOSITION': '⚖️ Rekompozicija',
  'MUSCLE_GAIN': '💪 Dobiti mišićnu masu',
  'ENDURANCE': '🏃 Izdržljivost',
  // Legacy vrijednosti
  'recomp': 'Rekompozicija',
  'lose-fat': 'Skinuti masno tkivo',
  'gain-muscle': 'Dobiti mišićnu masu',
  'power': 'Postati snažniji',
  'endurance': 'Izdržljivost',
  'speed': 'Brzina i eksplozivnost',
  'learn-gym': 'Naučiti trenirati',
  'other': 'Ostalo',
};

const activityLabels: Record<string, string> = {
  'gym': '🏋️ Teretana',
  'running': '🏃 Trčanje',
  'cycling': '🚴 Biciklizam',
  'swimming': '🏊 Plivanje',
  'football': '⚽ Nogomet',
  'basketball': '🏀 Košarka',
  'tennis': '🎾 Tenis',
  'boxing': '🥊 Boks',
  'yoga': '🧘 Yoga',
  'hiking': '🥾 Planinarenje',
  'crossfit': '💪 CrossFit',
  'martial-arts': '🥋 Borilački sportovi',
  'dancing': '💃 Ples',
  'climbing': '🧗 Penjanje',
  'skiing': '⛷️ Skijanje',
  'volleyball': '🏐 Odbojka',
  'padel': '🏸 Padel',
  'rowing': '🚣 Veslanje',
  'weight-training': '🏋️ Trening s tegovima',
  'lifting-weights': '🏋️ Dizanje utega',
  'other': 'Ostalo',
};

const equipmentLabels: Record<string, string> = {
  'dumbbells': 'Bučice',
  'barbell-weights': 'Šipka/utezi',
  'resistance-bands': 'Elastične trake',
  'machines': 'Mašine/sprave',
  'none': 'Bez opreme',
};

const experienceLabels: Record<string, string> = {
  'beginner': 'Početnik',
  'intermediate': 'Srednji',
  'advanced': 'Napredni',
};

const locationLabels: Record<string, string> = {
  'gym': 'Teretana',
  'home': 'Kuća',
  'outdoor': 'Vani',
};

const dietTypeLabels: Record<string, string> = {
  'none': 'Bez posebnog režima',
  'vegetarian': 'Vegetarijanac',
  'vegan': 'Vegan',
  'halal': 'Halal',
  'gluten-free': 'Bezglutenska',
  'low-carb': 'Low-carb',
  'other': 'Drugo',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
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

    const { clientId } = await params;
    const supabase = createServiceClient();

    // Dohvati SVE podatke klijenta
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id, name, email, phone, created_at,
        honorific, age_range,
        weight_value, weight_unit, height_value, height_unit,
        goals, activities, other_goals, other_activities,
        training_frequency, training_duration, training_location,
        equipment, experience,
        diet_cleanliness, meal_frequency, allergies,
        injuries, notes
      `)
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Dohvati aktivan program
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, name, status, start_date, end_date, duration_weeks')
      .eq('client_id', clientId)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let adherence: number | null = null;
    let recentSessions: any[] = [];
    let flaggedExercises: any[] = [];

    if (program) {
      // Dohvati total sessions count
      const { count: totalSessions } = await supabase
        .from('program_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program.id);

      // Dohvati completed sessions iz workout_logs
      const { count: completedSessionsCount } = await supabase
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program.id)
        .eq('status', 'completed');

      const completedSessions = completedSessionsCount || 0;
      adherence = totalSessions && totalSessions > 0 
        ? Math.round((completedSessions / totalSessions) * 100) 
        : 0;

      // Dohvati recent sessions iz workout_logs
      const { data: recentLogs } = await supabase
        .from('workout_logs')
        .select(`
          id,
          started_at,
          completed_at,
          status,
          adherence_score,
          session:program_sessions(split_name, day_of_week)
        `)
        .eq('program_id', program.id)
        .order('started_at', { ascending: false })
        .limit(5);

      recentSessions = (recentLogs || []).map(log => ({
        id: log.id,
        date: log.started_at,
        status: log.status,
        adherence: log.adherence_score,
        sessionName: (log.session as any)?.split_name || 'Unknown',
      }));

      // Dohvati flagged exercises iz workout_logs (pain/difficulty reports)
      // Prvo dohvati workout_logs za ovaj program
      const { data: programLogs } = await supabase
        .from('workout_logs')
        .select('id, started_at')
        .eq('program_id', program.id)
        .order('started_at', { ascending: false })
        .limit(50); // Dohvati zadnjih 50 logova

      const logIds = programLogs?.map(log => log.id) || [];
      const logsMap = new Map(programLogs?.map(log => [log.id, log.started_at]) || []);

      if (logIds.length > 0) {
        const { data: flaggedExercisesData } = await supabase
          .from('workout_log_exercises')
          .select(`
            id,
            exercise_name,
            pain_reported,
            difficulty_reported,
            difficulty_level,
            client_notes,
            workout_log_id
          `)
          .in('workout_log_id', logIds)
          .or('pain_reported.eq.true,difficulty_reported.eq.true')
          .limit(10);

        flaggedExercises = (flaggedExercisesData || []).map(ex => {
          let reason = '';
          if (ex.pain_reported) reason += 'Bol';
          if (ex.difficulty_reported) {
            if (reason) reason += ' + ';
            reason += `Teškoća (${ex.difficulty_level || 'N/A'}/10)`;
          }
          
          return {
            id: ex.id,
            exerciseName: ex.exercise_name,
            painReported: ex.pain_reported,
            difficultyReported: ex.difficulty_reported,
            difficultyLevel: ex.difficulty_level,
            notes: ex.client_notes,
            reason: reason || 'Problem pri izvođenju',
            date: logsMap.get(ex.workout_log_id),
          };
        });
      }
    }

    // Izračunaj BMI ako imamo podatke
    let bmi = null;
    if (client.weight_value && client.height_value) {
      const weightKg = client.weight_unit === 'lb' 
        ? client.weight_value * 0.453592 
        : client.weight_value;
      const heightM = client.height_unit === 'in' 
        ? client.height_value * 0.0254 
        : client.height_value / 100;
      bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    }

    // Dohvati kalkulator rezultate (ako postoje)
    const { data: calculations } = await supabase
      .from('calculations')
      .select('target_calories, target_protein, target_carbs, target_fats, bmr, tdee, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Formatiraj goals i activities s labels
    const formattedGoals = (client.goals || []).map((g: string) => ({
      value: g,
      label: goalLabels[g] || g,
    }));

    const formattedActivities = (client.activities || []).map((a: string) => ({
      value: a,
      label: activityLabels[a] || a,
    }));

    const formattedEquipment = (client.equipment || []).map((e: string) => ({
      value: e,
      label: equipmentLabels[e] || e,
    }));

    return NextResponse.json({
      success: true,
      data: {
        client: {
          // Osnovni podaci
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone || null,
          createdAt: client.created_at,
          
          // Osobni podaci
          gender: client.honorific === 'mr' ? 'male' : client.honorific === 'mrs' || client.honorific === 'ms' ? 'female' : 'other',
          ageRange: client.age_range,
          
          // Tjelesne mjere
          weight: client.weight_value ? {
            value: client.weight_value,
            unit: client.weight_unit || 'kg',
          } : null,
          height: client.height_value ? {
            value: client.height_value,
            unit: client.height_unit || 'cm',
          } : null,
          bmi,
          
          // Ciljevi i aktivnosti
          goals: formattedGoals,
          activities: formattedActivities,
          otherGoals: client.other_goals || null,
          otherActivities: client.other_activities || null,
          
          // Trening preferencije
          training: {
            frequency: client.training_frequency || null,
            frequencyLabel: client.training_frequency ? `${client.training_frequency}x tjedno` : null,
            duration: client.training_duration || null,
            durationLabel: client.training_duration ? `${client.training_duration} min` : null,
            location: client.training_location || null,
            locationLabel: client.training_location ? locationLabels[client.training_location] : null,
            equipment: formattedEquipment,
            experience: client.experience || null,
            experienceLabel: client.experience ? experienceLabels[client.experience] : null,
          },
          
          // Prehrana
          nutrition: {
            dietCleanliness: client.diet_cleanliness || null,
            mealFrequency: client.meal_frequency || null,
            allergies: client.allergies || null,
          },
          
          // Zdravlje
          injuries: client.injuries || null,
          notes: client.notes || null,
        },
        
        // Kalkulator rezultati
        calculations: calculations ? {
          targetCalories: calculations.target_calories,
          targetProtein: calculations.target_protein,
          targetCarbs: calculations.target_carbs,
          targetFats: calculations.target_fats,
          bmr: calculations.bmr,
          tdee: calculations.tdee,
          calculatedAt: calculations.created_at,
        } : null,
        
        // Program info
        program: program
          ? {
              id: program.id,
              name: program.name,
              status: program.status,
              startDate: program.start_date,
              endDate: program.end_date,
              currentWeek: program.start_date
                ? Math.floor(
                    (Date.now() - new Date(program.start_date).getTime()) /
                      (7 * 24 * 60 * 60 * 1000)
                  ) + 1
                : 1,
              totalWeeks: program.duration_weeks,
            }
          : null,
          
        // Adherence
        adherence: program
          ? {
              percentage: adherence || 0,
              completedSessions: 0,
              totalSessions:
                (await supabase
                  .from('program_sessions')
                  .select('id', { count: 'exact', head: true })
                  .eq('program_id', program.id)).count || 0,
              lastSessionDate: null,
              streak: 0,
            }
          : null,
          
        flaggedExercises,
        recentSessions,
      },
    });
  } catch (error) {
    console.error('[trainer/client] Unexpected error:', error);
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

