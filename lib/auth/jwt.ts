/**
 * JWT Authentication Utilities
 * ============================
 * Funkcije za generiranje i verifikaciju JWT tokena
 * 
 * PRODUKCIJSKA KONFIGURACIJA:
 * - Access Token: 1 godina - trener ostaje trajno prijavljen
 * - Refresh Token: 1 godina
 * 
 * Korisnik se odjavljuje samo kada eksplicitno klikne "Odjava"
 */

import jwt from 'jsonwebtoken';

// ============================================
// KONFIGURACIJA
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'fitness-app-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fitness-app-refresh-secret-change-in-production';

// Token trajanja
// PRODUKCIJA: Dugi tokeni za stabilnu sesiju
const ACCESS_TOKEN_EXPIRY = '365d';  // 1 godina - trener ostaje prijavljen
const REFRESH_TOKEN_EXPIRY = '365d'; // 1 godina

// ============================================
// TIPOVI
// ============================================

export interface JWTPayload {
  userId: string;        // client_id ili trainer_id
  userType: 'client' | 'trainer';
  username: string;
  iat?: number;          // issued at
  exp?: number;          // expiry
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;     // sekunde do isteka access tokena
}

export interface VerifyResult {
  valid: boolean;
  expired: boolean;
  payload: JWTPayload | null;
  error?: string;
}

// ============================================
// GENERIRANJE TOKENA
// ============================================

/**
 * Generira par access i refresh tokena
 */
export function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 365 * 24 * 60 * 60, // 1 godina u sekundama
  };
}

/**
 * Generira samo access token (za refresh)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// ============================================
// VERIFIKACIJA TOKENA
// ============================================

/**
 * Verificira access token
 */
export function verifyAccessToken(token: string): VerifyResult {
  try {
    // Debug: log token info
    console.log('[JWT] Verifying token, length:', token?.length, 'preview:', token?.substring(0, 30) + '...');
    
    // Provjeri da JWT_SECRET postoji
    if (!JWT_SECRET || JWT_SECRET === 'fitness-app-jwt-secret-change-in-production') {
      console.warn('[JWT] Using default JWT_SECRET - this should be changed in production');
    }
    
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('[JWT] Token verified successfully, userId:', payload.userId, 'userType:', payload.userType);
    
    // Provjeri da payload ima sve potrebne podatke
    if (!payload.userId || !payload.userType) {
      console.error('[JWT] Invalid payload structure:', payload);
      return {
        valid: false,
        expired: false,
        payload: null,
        error: 'Invalid token payload',
      };
    }
    
    return {
      valid: true,
      expired: false,
      payload,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('[JWT] Token expired');
      return {
        valid: false,
        expired: true,
        payload: null,
        error: 'Token je istekao',
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('[JWT] Invalid token:', error.message);
      return {
        valid: false,
        expired: false,
        payload: null,
        error: `Nevažeći token: ${error.message}`,
      };
    }
    console.error('[JWT] Verification error:', error);
    return {
      valid: false,
      expired: false,
      payload: null,
      error: 'Greška pri verifikaciji tokena',
    };
  }
}

/**
 * Verificira refresh token
 */
export function verifyRefreshToken(token: string): VerifyResult {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload & { type?: string };
    
    // Provjeri da je to refresh token
    if (payload.type !== 'refresh') {
      return {
        valid: false,
        expired: false,
        payload: null,
        error: 'Nevažeći refresh token',
      };
    }
    
    return {
      valid: true,
      expired: false,
      payload: {
        userId: payload.userId,
        userType: payload.userType,
        username: payload.username,
      },
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        expired: true,
        payload: null,
        error: 'Refresh token je istekao',
      };
    }
    return {
      valid: false,
      expired: false,
      payload: null,
      error: 'Nevažeći refresh token',
    };
  }
}

/**
 * Dekodira token bez verifikacije (za debug)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================
// HELPER FUNKCIJE
// ============================================

/**
 * Ekstrahira token iz Authorization headera
 * Format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Provjerava je li token blizu isteka (unutar 5 min)
 */
export function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;
  
  return payload.exp - now < fiveMinutes;
}

/**
 * Dohvaća preostalo vrijeme do isteka (sekunde)
 */
export function getTokenTimeRemaining(token: string): number {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

