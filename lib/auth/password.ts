/**
 * Password Utilities
 * ==================
 * Funkcije za hashiranje i verifikaciju lozinki
 * Koristi bcrypt s preporučenim postavkama
 */

import bcrypt from 'bcryptjs';

// ============================================
// KONFIGURACIJA
// ============================================

/**
 * Broj rundi za bcrypt salt generaciju
 * 10 je dobar balans između sigurnosti i performansi
 * - 10: ~100ms po hash operaciji
 * - 12: ~300ms po hash operaciji
 * - 14: ~1s po hash operaciji
 */
const SALT_ROUNDS = 10;

/**
 * Minimalna duljina lozinke
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Maksimalna duljina lozinke (bcrypt limit je 72 bajta)
 */
export const MAX_PASSWORD_LENGTH = 72;

// ============================================
// FUNKCIJE
// ============================================

/**
 * Hashira lozinku koristeći bcrypt
 * @param password - Plain text lozinka
 * @returns Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Lozinka mora imati najmanje ${MIN_PASSWORD_LENGTH} znakova`);
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Lozinka može imati najviše ${MAX_PASSWORD_LENGTH} znakova`);
  }
  
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Uspoređuje plain text lozinku s hashom
 * @param password - Plain text lozinka za provjeru
 * @param hash - Bcrypt hash iz baze
 * @returns true ako se lozinke podudaraju
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  return bcrypt.compare(password, hash);
}

/**
 * Provjerava snagu lozinke
 * @param password - Lozinka za provjeru
 * @returns Objekt s rezultatom provjere i porukama
 */
export function checkPasswordStrength(password: string): {
  isValid: boolean;
  score: number; // 0-4
  messages: string[];
} {
  const messages: string[] = [];
  let score = 0;
  
  // Minimalna duljina
  if (password.length < MIN_PASSWORD_LENGTH) {
    messages.push(`Lozinka mora imati najmanje ${MIN_PASSWORD_LENGTH} znakova`);
  } else {
    score++;
  }
  
  // Veliko slovo
  if (!/[A-Z]/.test(password)) {
    messages.push('Dodaj barem jedno veliko slovo');
  } else {
    score++;
  }
  
  // Malo slovo
  if (!/[a-z]/.test(password)) {
    messages.push('Dodaj barem jedno malo slovo');
  } else {
    score++;
  }
  
  // Broj
  if (!/[0-9]/.test(password)) {
    messages.push('Dodaj barem jedan broj');
  } else {
    score++;
  }
  
  // Specijalni znak (bonus)
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  }
  
  return {
    isValid: messages.length === 0,
    score: Math.min(score, 4),
    messages,
  };
}

/**
 * Generira nasumičnu lozinku
 * Korisno za reset password funkcionalnost
 * @param length - Duljina lozinke (default 12)
 * @returns Nasumična lozinka
 */
export function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = lowercase + uppercase + numbers + special;
  
  // Osiguraj da ima sve tipove znakova
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Popuni ostatak
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Promiješaj znakove
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

