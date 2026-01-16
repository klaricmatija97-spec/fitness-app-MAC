/**
 * Debug endpoint za provjeru sesija programa
 * GET /api/debug/sessions?programId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const programId = request.nextUrl.searchParams.get('programId');
    
    // Dohvati program s detaljima
    const { data: program } = await supabase
      .from('training_programs')
      .select('id, client_id, name, status, start_date, end_date, duration_weeks')
      .eq('id', programId || '5d3ad960-ed96-4f4e-a092-d6fb9ed3f5fd')
      .single();
    
    // Dohvati sesije programa
    const { data: sessions } = await supabase
      .from('program_sessions')
      .select('id, program_id, week_number, day_of_week, split_name, order_in_week')
      .eq('program_id', programId || '5d3ad960-ed96-4f4e-a092-d6fb9ed3f5fd')
      .order('week_number')
      .order('day_of_week')
      .limit(20);
    
    // Izračunaj današnji dan
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    
    // Izračunaj current week
    let currentWeek = 1;
    if (program?.start_date) {
      const startDate = new Date(program.start_date);
      currentWeek = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    }
    
    return NextResponse.json({
      program,
      sessions: sessions || [],
      today: {
        date: today.toISOString(),
        dayOfWeek: normalizedDayOfWeek,
        dayName: ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'][dayOfWeek],
        calculatedWeek: currentWeek,
      },
      matchingSession: sessions?.find(s => 
        s.week_number === currentWeek && s.day_of_week === normalizedDayOfWeek
      ) || null,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


