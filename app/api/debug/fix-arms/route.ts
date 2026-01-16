import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST() {
  const supabase = createServiceClient();
  
  // Ažuriraj sve sesije sa split_name "arms" na "ruke"
  const { data, error } = await supabase
    .from('program_sessions')
    .update({ split_name: 'ruke' })
    .eq('split_name', 'arms')
    .select('id, split_name');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ 
    success: true, 
    updated: data?.length || 0,
    message: 'Promijenjeno "arms" u "ruke"'
  });
}


