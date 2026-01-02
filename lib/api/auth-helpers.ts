/**
 * API Authentication Helpers
 * ===========================
 * Helper funkcije za provjeru autentifikacije i dohvat user ID-a iz JWT tokena
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAccessToken, 
  extractTokenFromHeader,
  decodeToken,
  type JWTPayload,
} from '@/lib/auth/jwt';

// ============================================
// TIPOVI
// ============================================

export interface AuthUser {
  userId: string;
  userType: 'trainer' | 'client';
  username: string;
  // Backward compatibility
  clientId?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthUser | null;
  error?: string;
}

// ============================================
// HELPER FUNKCIJE
// ============================================

/**
 * Dohvaća user info iz Authorization header-a
 * Podržava JWT tokene i legacy base64 tokene (za backward compatibility)
 */
export function getUserFromRequest(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return {
      authenticated: false,
      user: null,
      error: 'Nedostaje autorizacijski token',
    };
  }
  
  // Probaj verificirati kao JWT
  const jwtResult = verifyAccessToken(token);
  
  if (jwtResult.valid && jwtResult.payload) {
    return {
      authenticated: true,
      user: {
        userId: jwtResult.payload.userId,
        userType: jwtResult.payload.userType,
        username: jwtResult.payload.username,
        clientId: jwtResult.payload.userType === 'client' ? jwtResult.payload.userId : undefined,
      },
    };
  }
  
  // Fallback: Probaj dekodirati kao legacy base64 token
  // Format: base64(userId:timestamp)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestamp] = decoded.split(':');
    
    if (userId && timestamp) {
      // Legacy token - pretpostavljamo da je trainer za backward compatibility
      // jer su klijenti koristili user_accounts s JWT-om
      return {
        authenticated: true,
        user: {
          userId,
          userType: 'trainer', // Legacy tokeni su bili za trenere
          username: '',
          clientId: undefined,
        },
      };
    }
  } catch {
    // Nije ni JWT ni legacy token
  }
  
  return {
    authenticated: false,
    user: null,
    error: jwtResult.expired ? 'Token je istekao' : 'Nevažeći token',
  };
}

/**
 * Dohvaća user ID iz Authorization header-a
 * Backward compatible verzija
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const auth = getUserFromRequest(request);
  return auth.user?.userId ?? null;
}

/**
 * Provjerava je li korisnik autentificiran
 * Vraća AuthUser ili null
 */
export function requireAuth(request: NextRequest): AuthUser | null {
  const auth = getUserFromRequest(request);
  return auth.authenticated ? auth.user : null;
}

/**
 * Provjerava je li korisnik trainer
 */
export function requireTrainer(request: NextRequest): AuthUser | null {
  const auth = getUserFromRequest(request);
  
  if (!auth.authenticated || !auth.user) {
    return null;
  }
  
  // Legacy tokeni su bili za trenere
  if (auth.user.userType === 'trainer') {
    return auth.user;
  }
  
  return null;
}

/**
 * Provjerava je li korisnik client
 */
export function requireClient(request: NextRequest): AuthUser | null {
  const auth = getUserFromRequest(request);
  
  if (!auth.authenticated || !auth.user) {
    return null;
  }
  
  if (auth.user.userType === 'client') {
    return auth.user;
  }
  
  return null;
}

/**
 * Wrapper za zaštićene API rute - vraća NextResponse error ako nije autentificiran
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, auth: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = requireAuth(request);
  
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Neautoriziran pristup' },
      { status: 401 }
    );
  }
  
  return handler(request, auth);
}

/**
 * Wrapper za trainer-only rute
 */
export async function withTrainerAuth(
  request: NextRequest,
  handler: (req: NextRequest, auth: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = requireTrainer(request);
  
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Samo treneri mogu pristupiti ovoj ruti' },
      { status: 403 }
    );
  }
  
  return handler(request, auth);
}

/**
 * Wrapper za client-only rute
 */
export async function withClientAuth(
  request: NextRequest,
  handler: (req: NextRequest, auth: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = requireClient(request);
  
  if (!auth) {
    return NextResponse.json(
      { success: false, error: 'Samo klijenti mogu pristupiti ovoj ruti' },
      { status: 403 }
    );
  }
  
  return handler(request, auth);
}
