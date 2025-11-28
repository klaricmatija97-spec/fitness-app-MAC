/**
 * Client-side helper za učitavanje kalkulacija
 * 
 * Koristi se na frontendu za provjeru kalkulacija prije poziva PRO generatora
 */

import { loadUserCalculations, type LoadCalculationsResult } from "./loadCalculations";

/**
 * Učitaj kalkulacije na client-side
 * 
 * @param clientId - UUID korisnika
 * @returns Promise<LoadCalculationsResult>
 */
export async function loadCalculationsOnClient(
  clientId: string | null
): Promise<LoadCalculationsResult> {
  if (!clientId) {
    return {
      success: false,
      error: "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
    };
  }

  // Koristi loadUserCalculations sa isServerSide = false
  return await loadUserCalculations(clientId, false);
}

/**
 * Provjeri da li korisnik ima kalkulacije prije poziva PRO generatora
 * 
 * @param clientId - UUID korisnika
 * @returns Promise<boolean> - true ako ima kalkulacije, false ako nema
 */
export async function hasCalculations(clientId: string | null): Promise<boolean> {
  if (!clientId) return false;
  
  const result = await loadCalculationsOnClient(clientId);
  return result.success && !!result.calculations;
}



