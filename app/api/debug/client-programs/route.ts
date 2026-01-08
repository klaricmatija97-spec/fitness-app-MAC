import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();
  const clientId = '9e1ecaed-697f-4cb8-8648-0e0d4ec0fcd9';
  
  const { data: allPrograms } = await supabase
    .from('training_programs')
    .select('id, name, status, start_date, end_date, duration_weeks, goal, created_at')
    .eq('client_id', clientId)
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    clientId,
    allPrograms: (allPrograms || []).map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      goal: p.goal,
      startDate: p.start_date,
      durationWeeks: p.duration_weeks,
    })),
  });
}

