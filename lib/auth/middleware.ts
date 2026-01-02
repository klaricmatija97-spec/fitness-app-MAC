/**
 * Auth Middleware
 * ===============
 * Middleware funkcije za zaštitu API ruta
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyAccessToken, 
  extractTokenFromHeader,
  type JWTPayload,
  type VerifyResult,
} from './jwt';

// ============================================
// TIPOVI
// ============================================

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export interface AuthResult {
  authenticated: boolean;
  user: JWTPayload | null;
  error?: string;
  statusCode?: number;
}

// ============================================
// MIDDLEWARE FUNKCIJE
// ============================================

/**
 * Verificira JWT token iz Authorization headera
 * Vraća AuthResult objekt
 */
export function authenticateRequest(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return {
      authenticated: false,
      user: null,
      error: 'Nedostaje autorizacijski token',
      statusCode: 401,
    };
  }
  
  const result = verifyAccessToken(token);
  
  if (!result.valid) {
    return {
      authenticated: false,
      user: null,
      error: result.expired ? 'Token je istekao' : 'Nevažeći token',
      statusCode: result.expired ? 401 : 403,
    };
  }
  
  return {
    authenticated: true,
    user: result.payload,
  };
}

/**
 * Vraća error response za neautenticirane zahtjeve
 */
export function unauthorizedResponse(message: string = 'Neautoriziran pristup', statusCode: number = 401): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: statusCode }
  );
}

/**
 * Vraća error response za zabranjene zahtjeve
 */
export function forbiddenResponse(message: string = 'Pristup odbijen'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'FORBIDDEN',
    },
    { status: 403 }
  );
}

// ============================================
// HELPER FUNKCIJE ZA ROUTE HANDLERE
// ============================================

/**
 * Wrapper za zaštićene API rute
 * Automatski verificira token i dodaje user u request
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse<T>>
): Promise<NextResponse<T | { success: false; error: string }>> {
  const auth = authenticateRequest(request);
  
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse(auth.error, auth.statusCode) as NextResponse<{ success: false; error: string }>;
  }
  
  return handler(request, auth.user);
}

/**
 * Wrapper za rute koje zahtijevaju trainer pristup
 */
export async function withTrainerAuth<T>(
  request: NextRequest,
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse<T>>
): Promise<NextResponse<T | { success: false; error: string }>> {
  const auth = authenticateRequest(request);
  
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse(auth.error, auth.statusCode) as NextResponse<{ success: false; error: string }>;
  }
  
  if (auth.user.userType !== 'trainer') {
    return forbiddenResponse('Samo treneri mogu pristupiti ovoj ruti') as NextResponse<{ success: false; error: string }>;
  }
  
  return handler(request, auth.user);
}

/**
 * Wrapper za rute koje zahtijevaju client pristup
 */
export async function withClientAuth<T>(
  request: NextRequest,
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse<T>>
): Promise<NextResponse<T | { success: false; error: string }>> {
  const auth = authenticateRequest(request);
  
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse(auth.error, auth.statusCode) as NextResponse<{ success: false; error: string }>;
  }
  
  if (auth.user.userType !== 'client') {
    return forbiddenResponse('Samo klijenti mogu pristupiti ovoj ruti') as NextResponse<{ success: false; error: string }>;
  }
  
  return handler(request, auth.user);
}

/**
 * Ekstrahira user ID iz autentificiranog zahtjeva
 * Koristi se za provjeru pristupa resursima
 */
export function getUserIdFromAuth(request: NextRequest): string | null {
  const auth = authenticateRequest(request);
  return auth.user?.userId ?? null;
}

/**
 * Provjerava može li korisnik pristupiti resursu drugog korisnika
 * Treneri mogu pristupiti resursima svojih klijenata
 */
export function canAccessResource(
  authUser: JWTPayload,
  resourceOwnerId: string,
  trainerClientIds?: string[]
): boolean {
  // Korisnik može pristupiti svojim resursima
  if (authUser.userId === resourceOwnerId) {
    return true;
  }
  
  // Trener može pristupiti resursima svojih klijenata
  if (authUser.userType === 'trainer' && trainerClientIds) {
    return trainerClientIds.includes(resourceOwnerId);
  }
  
  return false;
}

