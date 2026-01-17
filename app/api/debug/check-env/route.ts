import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    // Ne prikazujemo pune vrijednosti iz sigurnosnih razloga
    SUPABASE_URL: process.env.SUPABASE_URL ? `✅ Set (${process.env.SUPABASE_URL.substring(0, 30)}...)` : '❌ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ Set (${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...)` : '❌ MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ MISSING',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? '✅ Set' : '❌ MISSING',
    
    // Public varijable
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `✅ Set` : '⚠️ Not set (optional)',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `✅ Set` : '⚠️ Not set (optional)',
    
    // Node environment
    NODE_ENV: process.env.NODE_ENV || 'unknown',
  });
}
