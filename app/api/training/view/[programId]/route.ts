/**
 * Unified Program View API
 * ========================
 * GET /api/training/view/[programId]
 * 
 * Dohvaća kompletan pregled programa s auto + manual komponentama
 */

import { NextRequest, NextResponse } from 'next/server';
import { dohvatiUnifiedProgramView } from '@/lib/pro-generator';

// ============================================
// GET - Dohvati unified view
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const { programId } = await params;
    
    if (!programId) {
      return NextResponse.json({
        success: false,
        error: 'programId je obavezan',
      }, { status: 400 });
    }
    
    const view = await dohvatiUnifiedProgramView(programId);
    
    if (!view) {
      return NextResponse.json({
        success: false,
        error: 'Program nije pronađen',
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: view,
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    }, { status: 500 });
  }
}

