/**
 * API Authentication Helpers
 * ===========================
 * Helper funkcije za provjeru autentifikacije i dohvat user ID-a iz tokena
 */

import { NextRequest } from 'next/server';

export interface AuthUser {
  userId: string;
  role?: 'trainer' | 'client';
}

/**
 * Dohvaća user ID iz Authorization header-a
 * Format: Bearer <base64_encoded_userId:timestamp>
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove "Bearer "
  
  try {
    // Decode base64 token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    return userId || null;
  } catch (error) {
    return null;
  }
}

/**
 * Provjerava je li korisnik autentificiran
 */
export function requireAuth(request: NextRequest): { userId: string } | null {
  const userId = getUserIdFromRequest(request);
  
  if (!userId) {
    return null;
  }
  
  return { userId };
}

/**
 * Provjerava je li korisnik trainer
 * TODO: U produkciji provjeriti role iz baze/tokena
 */
export function requireTrainer(request: NextRequest): { userId: string } | null {
  const auth = requireAuth(request);
  if (!auth) return null;
  
  // TODO: Provjeri role iz baze
  // Za MVP, pretpostavljamo da svaki authenticated user može biti trainer
  return auth;
}

/**
 * Provjerava je li korisnik client
 * TODO: U produkciji provjeriti role iz baze/tokena
 */
export function requireClient(request: NextRequest): { userId: string } | null {
  const auth = requireAuth(request);
  if (!auth) return null;
  
  // TODO: Provjeri role iz baze
  // Za MVP, pretpostavljamo da svaki authenticated user može biti client
  return auth;
}

