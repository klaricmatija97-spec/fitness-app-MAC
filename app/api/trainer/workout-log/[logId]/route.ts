/**
 * Workout Log API - DELETE
 * ========================
 * DELETE /api/trainer/workout-log/[logId] - Obriši workout log
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyAccessToken } from '@/lib/auth/jwt';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { logId } = await params;
    
    // Verify auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const verifyResult = verifyAccessToken(token);
    
    if (!verifyResult.valid || !verifyResult.payload) {
      console.error('[DELETE workout-log] Token invalid:', verifyResult.error);
      return NextResponse.json({ success: false, error: verifyResult.error || 'Invalid token' }, { status: 401 });
    }
    
    if (verifyResult.payload.userType !== 'trainer') {
      return NextResponse.json({ success: false, error: 'Samo treneri mogu brisati workout logs' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // Prvo obriši workout_log_sets (child of workout_log_exercises)
    const { data: exercises } = await supabase
      .from('workout_log_exercises')
      .select('id')
      .eq('workout_log_id', logId);

    if (exercises && exercises.length > 0) {
      const exerciseIds = exercises.map(e => e.id);
      await supabase
        .from('workout_log_sets')
        .delete()
        .in('workout_log_exercise_id', exerciseIds);
    }

    // Obriši workout_log_exercises
    await supabase
      .from('workout_log_exercises')
      .delete()
      .eq('workout_log_id', logId);

    // Obriši workout_log
    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', logId);

    if (error) {
      console.error('[DELETE workout-log] Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Workout log obrisan' });

  } catch (error) {
    console.error('[DELETE workout-log] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
