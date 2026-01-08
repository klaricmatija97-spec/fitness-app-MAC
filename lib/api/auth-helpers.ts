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
    // Debug: provjeri da je userId validan UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jwtResult.payload.userId)) {
      console.error('[auth-helpers] JWT payload userId is not a valid UUID:', {
        userId: jwtResult.payload.userId,
        userType: jwtResult.payload.userType,
        tokenPreview: token.substring(0, 50),
      });
      // Ako userId nije validan UUID, ne vraćaj authenticated
      return {
        authenticated: false,
        user: null,
        error: 'Invalid token payload - userId is not a valid UUID',
      };
    }
    
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
  
  // Debug: loguj zašto JWT verifikacija nije uspjela
  if (!jwtResult.valid) {
    console.error('[auth-helpers] JWT verification failed:', {
      error: jwtResult.error,
      expired: jwtResult.expired,
      tokenPreview: token.substring(0, 50),
    });
  }
  
  // Fallback: Probaj dekodirati kao legacy base64 token
  // Format: base64(userId:timestamp)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestamp] = decoded.split(':');
    
    if (userId && timestamp) {
      // Validiraj da je userId validan UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('[auth-helpers] Legacy token userId is not a valid UUID:', {
          userId,
          tokenPreview: token.substring(0, 50),
        });
        // Ne vraćaj authenticated ako userId nije validan UUID
        return {
          authenticated: false,
          user: null,
          error: 'Invalid token format',
        };
      }
      
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
  } catch (error) {
    // Nije ni JWT ni legacy token
    console.error('[auth-helpers] Failed to decode as legacy token:', error);
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
  
  console.log('[requireTrainer] Auth result:', {
    authenticated: auth.authenticated,
    hasUser: !!auth.user,
    userType: auth.user?.userType,
    userId: auth.user?.userId?.substring(0, 20) + '...',
    error: auth.error,
  });
  
  if (!auth.authenticated || !auth.user) {
    console.log('[requireTrainer] Not authenticated or no user');
    return null;
  }
  
  // Legacy tokeni su bili za trenere
  if (auth.user.userType === 'trainer') {
    console.log('[requireTrainer] User is trainer, returning auth');
    return auth.user;
  }
  
  console.log('[requireTrainer] User is not trainer, userType:', auth.user.userType);
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
