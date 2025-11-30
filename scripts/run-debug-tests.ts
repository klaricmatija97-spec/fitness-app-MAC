/**
 * Script za pokretanje debug test scenarija
 * Pokreni s: npx tsx scripts/run-debug-tests.ts
 */

import { runTestScenarios } from "../lib/services/debugTestScenarios";

console.log("🚀 Pokretanje debug test scenarija...\n");

// Pokreni testove (jela će se automatski učitati)
runTestScenarios();

