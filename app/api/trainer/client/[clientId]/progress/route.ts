/**
 * Trainer Client Progress API
 * ===========================
 * Vraća detaljne podatke o napretku klijenta za grafikone i analitiku
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withTrainerAuth } from '@/lib/auth/middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProgressData {
  summary: {
    totalWorkouts: number;
    totalVolume: number;
    avgAdherence: number;
    currentStreak: number;
    longestStreak: number;
    personalBests: number;
    avgSessionDuration: number;
    missedWorkouts: number;
  };
  weeklyData: {
    week: number;
    weekLabel: string;
    volume: number;
    adherence: number;
    workoutsCompleted: number;
    workoutsPlanned: number;
  }[];
  exerciseProgress: {
    exerciseId: string;
    exerciseName: string;
    data: {
      date: string;
      weight: number;
      reps: number;
      volume: number;
      sets: number;
    }[];
    personalBest: {
      weight: number;
      reps: number;
      volume: number;
      date: string;
    } | null;
    improvement: number;
  }[];
  muscleGroupVolume: {
    group: string;
    volume: number;
    percentage: number;
    workouts: number;
  }[];
  adherenceTrend: {
    date: string;
    adherence: number;
    workoutsCompleted: number;
    workoutsPlanned: number;
  }[];
  volumeTrend: {
    date: string;
    volume: number;
    workouts: number;
  }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  return withTrainerAuth(request, async (trainerId) => {
    try {
      const { clientId } = await params;
      const searchParams = request.nextUrl.searchParams;
      const period = searchParams.get('period') || '12w'; // 4w, 8w, 12w, all
      const programId = searchParams.get('programId');

      // Provjeri da trener ima pristup ovom klijentu
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, trainer_id')
        .eq('id', clientId)
        .eq('trainer_id', trainerId)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { success: false, error: 'Client not found or access denied', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      // Izračunaj datum range
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case '4w':
          startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
          break;
        case '8w':
          startDate = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
          break;
        case '12w':
          startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Dohvati workout logs
      let logsQuery = supabase
        .from('workout_logs')
        .select(`
          id,
          started_at,
          completed_at,
          duration_minutes,
          status,
          adherence_score,
          total_volume,
          completed_exercises,
          total_exercises,
          completed_sets,
          total_sets,
          program_id,
          session:program_sessions(split_name, day_of_week)
        `)
        .eq('client_id', clientId)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: true });

      if (programId) {
        logsQuery = logsQuery.eq('program_id', programId);
      }

      const { data: workoutLogs, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('[progress] Error fetching workout logs:', logsError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch workout logs', code: 'QUERY_ERROR' },
          { status: 500 }
        );
      }

      const logs = workoutLogs || [];

      // Dohvati exercise data za PR-ove
      const logIds = logs.map(log => log.id);
      let exerciseData: any[] = [];
      
      if (logIds.length > 0) {
        const { data: exercises } = await supabase
          .from('workout_log_exercises')
          .select(`
            id,
            exercise_id,
            exercise_name,
            workout_log_id,
            total_volume,
            sets:workout_log_sets(
              weight_kg,
              reps,
              set_number
            )
          `)
          .in('workout_log_id', logIds)
          .order('workout_log_id', { ascending: true });

        exerciseData = exercises || [];
      }

      // Izračunaj summary
      const completedLogs = logs.filter(log => log.status === 'completed');
      const totalWorkouts = completedLogs.length;
      const totalVolume = completedLogs.reduce((sum, log) => sum + (log.total_volume || 0), 0);
      const avgAdherence = completedLogs.length > 0
        ? completedLogs.reduce((sum, log) => sum + (log.adherence_score || 0), 0) / completedLogs.length
        : 0;
      const avgSessionDuration = completedLogs.length > 0
        ? completedLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / completedLogs.length
        : 0;

      // Izračunaj streak
      const sortedLogs = [...logs].sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
      
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const log of sortedLogs) {
        const logDate = new Date(log.started_at);
        logDate.setHours(0, 0, 0, 0);
        
        if (log.status === 'completed') {
          if (currentStreak === 0 && logDate.getTime() === today.getTime()) {
            currentStreak = 1;
          } else if (currentStreak > 0) {
            const daysDiff = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === currentStreak) {
              currentStreak++;
            }
          }
          
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      // Dohvati total planned sessions za missed workouts
      let totalPlannedSessions = 0;
      if (programId) {
        const { count } = await supabase
          .from('program_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('program_id', programId);
        totalPlannedSessions = count || 0;
      }
      const missedWorkouts = totalPlannedSessions - totalWorkouts;

      // Grupiraj po tjednima
      const weeklyDataMap = new Map<number, {
        volume: number;
        adherence: number[];
        workoutsCompleted: number;
        workoutsPlanned: number;
      }>();

      logs.forEach(log => {
        const logDate = new Date(log.started_at);
        const weekStart = getWeekStart(logDate);
        const weekNumber = getWeekNumber(weekStart, startDate);

        if (!weeklyDataMap.has(weekNumber)) {
          weeklyDataMap.set(weekNumber, {
            volume: 0,
            adherence: [],
            workoutsCompleted: 0,
            workoutsPlanned: 0,
          });
        }

        const weekData = weeklyDataMap.get(weekNumber)!;
        if (log.status === 'completed') {
          weekData.volume += log.total_volume || 0;
          weekData.adherence.push(log.adherence_score || 0);
          weekData.workoutsCompleted++;
        }
        weekData.workoutsPlanned++;
      });

      const weeklyData = Array.from(weeklyDataMap.entries())
        .map(([weekNumber, data]) => ({
          week: weekNumber,
          weekLabel: `Tjedan ${weekNumber}`,
          volume: data.volume,
          adherence: data.adherence.length > 0
            ? data.adherence.reduce((a, b) => a + b, 0) / data.adherence.length
            : 0,
          workoutsCompleted: data.workoutsCompleted,
          workoutsPlanned: data.workoutsPlanned,
        }))
        .sort((a, b) => a.week - b.week);

      // Exercise progress i PR-ovi
      const exerciseProgressMap = new Map<string, {
        exerciseId: string;
        exerciseName: string;
        data: any[];
        personalBest: any | null;
      }>();

      exerciseData.forEach(ex => {
        const exerciseName = ex.exercise_name || 'Unknown';
        const exerciseId = ex.exercise_id || ex.exercise_name;

        if (!exerciseProgressMap.has(exerciseId)) {
          exerciseProgressMap.set(exerciseId, {
            exerciseId,
            exerciseName,
            data: [],
            personalBest: null,
          });
        }

        const exercise = exerciseProgressMap.get(exerciseId)!;
        const log = logs.find(l => l.id === ex.workout_log_id);
        if (!log) return;

        const sets = ex.sets || [];
        const maxWeight = Math.max(...sets.map((s: any) => s.weight_kg || 0), 0);
        const totalReps = sets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
        const volume = ex.total_volume || 0;

        exercise.data.push({
          date: log.started_at,
          weight: maxWeight,
          reps: totalReps,
          volume: volume,
          sets: sets.length,
        });

        // Update personal best
        if (!exercise.personalBest || volume > exercise.personalBest.volume) {
          exercise.personalBest = {
            weight: maxWeight,
            reps: totalReps,
            volume: volume,
            date: log.started_at,
          };
        }
      });

      const exerciseProgress = Array.from(exerciseProgressMap.values())
        .map(ex => {
          const sortedData = [...ex.data].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          const firstVolume = sortedData[0]?.volume || 0;
          const lastVolume = sortedData[sortedData.length - 1]?.volume || 0;
          const improvement = firstVolume > 0
            ? ((lastVolume - firstVolume) / firstVolume) * 100
            : 0;

          return {
            ...ex,
            data: sortedData,
            improvement: Math.round(improvement * 10) / 10,
          };
        })
        .filter(ex => ex.data.length > 0)
        .sort((a, b) => (b.personalBest?.volume || 0) - (a.personalBest?.volume || 0))
        .slice(0, 10); // Top 10 exercises

      const personalBests = exerciseProgress.filter(ex => ex.personalBest !== null).length;

      // Muscle group volume (simplified - trebalo bi mapirati vježbe na mišićne grupe)
      const muscleGroupVolume: { [key: string]: number } = {};
      exerciseData.forEach(ex => {
        // TODO: Map exercise to muscle groups
        // Za sada koristimo generic "All" grupu
        const group = 'Sve grupe';
        muscleGroupVolume[group] = (muscleGroupVolume[group] || 0) + (ex.total_volume || 0);
      });

      const totalMuscleVolume = Object.values(muscleGroupVolume).reduce((a, b) => a + b, 0);
      const muscleGroupVolumeArray = Object.entries(muscleGroupVolume).map(([group, volume]) => ({
        group,
        volume,
        percentage: totalMuscleVolume > 0 ? (volume / totalMuscleVolume) * 100 : 0,
        workouts: exerciseData.length,
      }));

      // Adherence trend (daily)
      const adherenceTrendMap = new Map<string, {
        adherence: number[];
        workoutsCompleted: number;
        workoutsPlanned: number;
      }>();

      logs.forEach(log => {
        const date = new Date(log.started_at).toISOString().split('T')[0];
        if (!adherenceTrendMap.has(date)) {
          adherenceTrendMap.set(date, {
            adherence: [],
            workoutsCompleted: 0,
            workoutsPlanned: 0,
          });
        }

        const dayData = adherenceTrendMap.get(date)!;
        if (log.status === 'completed') {
          dayData.adherence.push(log.adherence_score || 0);
          dayData.workoutsCompleted++;
        }
        dayData.workoutsPlanned++;
      });

      const adherenceTrend = Array.from(adherenceTrendMap.entries())
        .map(([date, data]) => ({
          date,
          adherence: data.adherence.length > 0
            ? data.adherence.reduce((a, b) => a + b, 0) / data.adherence.length
            : 0,
          workoutsCompleted: data.workoutsCompleted,
          workoutsPlanned: data.workoutsPlanned,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Volume trend (daily)
      const volumeTrendMap = new Map<string, { volume: number; workouts: number }>();

      completedLogs.forEach(log => {
        const date = new Date(log.started_at).toISOString().split('T')[0];
        if (!volumeTrendMap.has(date)) {
          volumeTrendMap.set(date, { volume: 0, workouts: 0 });
        }

        const dayData = volumeTrendMap.get(date)!;
        dayData.volume += log.total_volume || 0;
        dayData.workouts++;
      });

      const volumeTrend = Array.from(volumeTrendMap.entries())
        .map(([date, data]) => ({
          date,
          volume: data.volume,
          workouts: data.workouts,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const progressData: ProgressData = {
        summary: {
          totalWorkouts,
          totalVolume: Math.round(totalVolume),
          avgAdherence: Math.round(avgAdherence * 10) / 10,
          currentStreak,
          longestStreak,
          personalBests,
          avgSessionDuration: Math.round(avgSessionDuration),
          missedWorkouts: Math.max(0, missedWorkouts),
        },
        weeklyData,
        exerciseProgress,
        muscleGroupVolume: muscleGroupVolumeArray,
        adherenceTrend,
        volumeTrend,
      };

      return NextResponse.json({
        success: true,
        data: progressData,
      });
    } catch (error) {
      console.error('[progress] Unexpected error:', error);
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

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

function getWeekNumber(weekStart: Date, programStart: Date): number {
  const diffTime = weekStart.getTime() - programStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

