/**
 * Debug endpoint za postavljanje start_date na programe
 * POST /api/debug/fix-dates
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceClient();
    
    // Pronađi početak ovog tjedna (ponedjeljak)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const startDateStr = monday.toISOString().split('T')[0];
    
    // Ažuriraj sve programe bez start_date
    const { data, error } = await supabase
      .from('training_programs')
      .update({ start_date: startDateStr })
      .is('start_date', null)
      .select('id, name, start_date');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Ažurirano ${data?.length || 0} programa s start_date: ${startDateStr}`,
      programs: data,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

