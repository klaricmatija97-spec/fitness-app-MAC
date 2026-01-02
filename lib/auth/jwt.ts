/**
 * JWT Authentication Utilities
 * ============================
 * Funkcije za generiranje i verifikaciju JWT tokena
 * 
 * Tokeni:
 * - Access Token: kratkotrajan (15 min), za API pozive
 * - Refresh Token: dugotrajan (7 dana), za obnovu access tokena
 */

import jwt from 'jsonwebtoken';

// ============================================
// KONFIGURACIJA
// ============================================

const JWT_SECRET = process.env.JWT_SECRET || 'fitness-app-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fitness-app-refresh-secret-change-in-production';

// Token trajanja
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minuta
const REFRESH_TOKEN_EXPIRY = '7d';  // 7 dana

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
    expiresIn: 15 * 60, // 15 minuta u sekundama
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
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return {
      valid: true,
      expired: false,
      payload,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        expired: true,
        payload: null,
        error: 'Token je istekao',
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        expired: false,
        payload: null,
        error: 'Nevažeći token',
      };
    }
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

