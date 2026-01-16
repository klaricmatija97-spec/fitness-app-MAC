/**
 * Debug endpoint za aktivaciju programa
 * POST /api/debug/activate-programs
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceClient();
    
    // Ažuriraj sve draft programe na active
    const { data, error } = await supabase
      .from('training_programs')
      .update({ status: 'active' })
      .eq('status', 'draft')
      .select('id, name, status');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Aktivirano ${data?.length || 0} programa`,
      programs: data,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


