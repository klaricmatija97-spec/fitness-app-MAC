/**
 * Debug endpoint za provjeru programa u bazi
 * GET /api/debug/programs
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // Dohvati sve programe
    const { data: programs, error: programsError } = await supabase
      .from('training_programs')
      .select('id, client_id, trainer_id, name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (programsError) {
      return NextResponse.json({ error: programsError.message }, { status: 500 });
    }
    
    // Dohvati sve klijente
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, trainer_id')
      .limit(10);
    
    return NextResponse.json({
      programs: programs || [],
      clients: clients || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


