/**
 * DEBUG ENDPOINT - Test JWT token decoding
 * GET /api/auth/debug-token
 * Header: Authorization: Bearer <token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, requireTrainer } from '@/lib/api/auth-helpers';
import { extractTokenFromHeader, decodeToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json({
        error: 'No token provided',
        authHeader: authHeader ? 'present' : 'missing',
      }, { status: 400 });
    }
    
    // Dekodiraj token bez verifikacije (samo za debug)
    const decoded = decodeToken(token);
    
    // Probaj getUserFromRequest
    const authResult = getUserFromRequest(request);
    
    // Probaj requireTrainer
    const trainerAuth = requireTrainer(request);
    
    return NextResponse.json({
      tokenPreview: token.substring(0, 50) + '...',
      tokenLength: token.length,
      decoded: decoded ? {
        userId: decoded.userId,
        userType: decoded.userType,
        username: decoded.username,
      } : null,
      authResult: authResult.authenticated ? {
        userId: authResult.user?.userId,
        userType: authResult.user?.userType,
        username: authResult.user?.username,
      } : {
        authenticated: false,
        error: authResult.error,
      },
      trainerAuth: trainerAuth ? {
        userId: trainerAuth.userId,
        userType: trainerAuth.userType,
        username: trainerAuth.username,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

