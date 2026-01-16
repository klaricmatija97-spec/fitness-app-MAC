import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();
  
  const sessionId = 'f78a8ed9-121c-4c9e-8131-70dd09d1a5d5';
  
  const { data, error } = await supabase
    .from('session_exercises')
    .select('*')
    .eq('session_id', sessionId);
  
  return NextResponse.json({ 
    sessionId,
    count: data?.length || 0, 
    exercises: data,
    error: error?.message 
  });
}


