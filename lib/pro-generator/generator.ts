/**
 * PRO Training Generator - Glavni Generator
 * ==========================================
 * Modularne funkcije za generiranje kompletnog programa
 * 
 * Funkcije:
 * - buildProgram()     - Glavna orkestracija
 * - buildMesocycles()  - Kreiranje mezociklusa
 * - buildWeeks()       - Kreiranje tjedana s progresijom
 * - buildSessions()    - Kreiranje treninga po danu
 * - selectExercises()  - Odabir vježbi prema pravilima
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  GeneratorInput,
  TreningProgram,
  Mezociklus,
  Tjedan,
  TrenigSesija,
  VjezbaSesije,
  ZagrijavanjeBlok,
  ZavrsniBlok,
  TipSplita,
  TipMezociklusa,
  ValidacijaRezultat,
  VjezbaProširena,
  VolumenTracking,
  ProgresijaTjedna,
  CustomSplitKonfiguracija,
} from './types';
import {
  GENERATOR_VERSION,
  CILJ_PARAMETRI,
  RAZINA_PARAMETRI,
  SPLIT_KONFIGURACIJE,
  MEV_PO_GRUPI,
  MAV_PO_GRUPI,
  MRV_PO_GRUPI,
  ZAGRIJAVANJE_SABLONE,
  MEZOCIKLUS_TIPOVI,
  PROGRESIJA_MODELI,
  // Pliometrija
  PLIOMETRIJSKE_VJEZBE,
  PLIOMETRIJA_PARAMETRI,
  getPliometrijskeVjezbeZaRazinu,
  // Kardio
  KARDIO_PROGRAMI,
  HIIT_PROTOKOL_IFT,
  // Custom Split
  konvertirajCustomSplitUSplitKonfiguraciju,
} from './constants';
import { filtrirajVjezbe, dohvatiVjezbeZaGrupu, pronadiAlternative } from './exercise-loader';

// ============================================
// DEBUG LOGGING
// ============================================

const DEBUG = process.env.DEBUG_TRAINING_GENERATOR === 'true';

interface LogEntry {
  tip: 'info' | 'warning' | 'error' | 'debug';
  poruka: string;
  podaci?: Record<string, unknown>;
  timestamp: Date;
}

const logEntries: LogEntry[] = [];

function log(tip: LogEntry['tip'], poruka: string, podaci?: Record<string, unknown>) {
  const entry: LogEntry = { tip, poruka, podaci, timestamp: new Date() };
  logEntries.push(entry);
  
  if (DEBUG) {
    const prefix = {
      info: '📘',
      warning: '⚠️',
      error: '❌',
      debug: '🔍',
    }[tip];
    console.log(`${prefix} [Generator] ${poruka}`, podaci || '');
  }
}

export function dohvatiLogove(): LogEntry[] {
  return [...logEntries];
}

export function ocistiLogove(): void {
  logEntries.length = 0;
}

// ============================================
// VALIDACIJA INPUTA
// ============================================

export function validirajInput(input: GeneratorInput): ValidacijaRezultat {
  const greske: string[] = [];
  const upozorenja: string[] = [];
  
  // Obavezni parametri
  if (!input.clientId) {
    greske.push('clientId je obavezan');
  }
  if (!input.cilj) {
    greske.push('cilj je obavezan');
  }
  if (!input.razina) {
    greske.push('razina je obavezna');
  }
  
  // Validacija broja treninga
  if (input.treninziTjedno < 2 || input.treninziTjedno > 6) {
    greske.push('treninziTjedno mora biti između 2 i 6');
  }
  
  // Validacija trajanja
  if (input.trajanjeTjedana < 4 || input.trajanjeTjedana > 12) {
    greske.push('trajanjeTjedana mora biti između 4 i 12');
  }
  
  // Provjeri custom split
  if (input.splitTip === 'custom') {
    if (!input.customSplit) {
      greske.push('customSplit je obavezan kada je splitTip = "custom"');
    } else {
      // Validacija custom split strukture
      if (input.customSplit.dani.length === 0) {
        greske.push('Custom split mora imati barem jedan dan');
      }
      if (input.customSplit.ukupnoDana < 2 || input.customSplit.ukupnoDana > 6) {
        greske.push('Custom split mora imati između 2 i 6 dana');
      }
      if (input.customSplit.dani.length !== input.customSplit.ukupnoDana) {
        greske.push('Broj dana u custom split-u mora odgovarati ukupnoDana');
      }
      if (input.treninziTjedno > input.customSplit.ukupnoDana) {
        greske.push('treninziTjedno ne može biti veći od ukupnoDana u custom split-u');
      }
    }
  }
  
  // Provjeri kompatibilnost split/treninzi
  if (input.splitTip && input.splitTip !== 'custom') {
    const splitConfig = SPLIT_KONFIGURACIJE[input.splitTip];
    if (splitConfig && !splitConfig.daniPoTjednu.includes(input.treninziTjedno)) {
      upozorenja.push(`Split '${input.splitTip}' nije optimalan za ${input.treninziTjedno} treninga tjedno`);
    }
  }
  
  // Provjeri razinu i split
  if (input.razina === 'pocetnik' && input.splitTip === 'body_part_split') {
    greske.push('Body part split nije dozvoljen za početnike');
  }
  
  // Provjeri volumen upozorenja
  if (input.razina === 'pocetnik' && input.treninziTjedno > 4) {
    upozorenja.push('Početnici bi trebali trenirati maksimalno 4 puta tjedno');
  }
  
  log('info', 'Validacija inputa završena', { greske, upozorenja });
  
  return {
    valjan: greske.length === 0,
    greske,
    upozorenja,
  };
}

// ============================================
// AUTOMATSKI ODABIR SPLITA
// ============================================

export function odaberiOptimalniSplit(input: GeneratorInput): TipSplita {
  const { razina, treninziTjedno, cilj } = input;
  const razinaParam = RAZINA_PARAMETRI[razina];
  
  // Filtriraj preporučene splitove po razini
  const dozvoljeniSplitovi = razinaParam.preporuceniSplitovi;
  
  // Odaberi na temelju broja treninga
  if (treninziTjedno <= 3) {
    if (dozvoljeniSplitovi.includes('full_body')) return 'full_body';
    if (dozvoljeniSplitovi.includes('push_pull_legs')) return 'push_pull_legs';
  }
  
  if (treninziTjedno === 4) {
    if (dozvoljeniSplitovi.includes('upper_lower')) return 'upper_lower';
    if (dozvoljeniSplitovi.includes('push_pull_legs')) return 'push_pull_legs';
  }
  
  if (treninziTjedno >= 5) {
    if (cilj === 'hipertrofija' && dozvoljeniSplitovi.includes('body_part_split')) {
      return 'body_part_split';
    }
    if (dozvoljeniSplitovi.includes('push_pull_legs')) return 'push_pull_legs';
    if (dozvoljeniSplitovi.includes('upper_lower')) return 'upper_lower';
  }
  
  // Default fallback
  return dozvoljeniSplitovi[0] || 'full_body';
}

// ============================================
// BUILD PROGRAM (GLAVNA FUNKCIJA)
// ============================================

export async function buildProgram(input: GeneratorInput): Promise<TreningProgram> {
  ocistiLogove();
  resetVjezbaTracker(input.clientId); // Reset tracker za novi program
  log('info', 'Početak generiranja programa', { input });
  
  // 1. Validiraj input
  const validacija = validirajInput(input);
  if (!validacija.valjan) {
    log('error', 'Validacija nije prošla', { greske: validacija.greske });
    throw new Error(`Validacija nije prošla: ${validacija.greske.join(', ')}`);
  }
  
  // 2. Odredi split ako nije zadan
  const splitTip = input.splitTip || odaberiOptimalniSplit(input);
  log('info', `Odabrani split: ${splitTip}`, { customSplit: input.customSplit ? 'DA' : 'NE' });
  
  // 3. Generiraj mezocikluse
  const mezociklusi = await buildMesocycles({
    ...input,
    splitTip,
  });
  
  // 4. Kreiraj program objekt
  const programId = uuidv4();
  // Za custom split, koristi konvertirani config
  const splitConfig = splitTip === 'custom' && input.customSplit
    ? konvertirajCustomSplitUSplitKonfiguraciju(input.customSplit)
    : SPLIT_KONFIGURACIJE[splitTip];
  
  const program: TreningProgram = {
    id: programId,
    clientId: input.clientId,
    trenerId: input.trenerId,
    planName: generirajNazivPrograma(input.cilj, splitTip, input.razina),
    cilj: input.cilj,
    razina: input.razina,
    splitTip,
    ukupnoTjedana: input.trajanjeTjedana,
    treninziTjedno: input.treninziTjedno,
    opis: generirajOpisPrograma(input, splitConfig),
    status: 'draft',
    generatorVerzija: GENERATOR_VERSION,
    validacijaRezultat: validacija,
    napomeneTrenera: input.napomeneTrenera,
    mezociklusi,
    // Povezivanje programa (za godišnji plan)
    annualProgramId: input.annualProgramId,
    previousProgramId: input.previousProgramId,
    phaseOrder: input.phaseOrder,
    totalPhases: input.totalPhases,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // 5. Validiraj generirani program
  const finalnaValidacija = validirajProgram(program);
  program.validacijaRezultat = finalnaValidacija;
  
  log('info', 'Program uspješno generiran', { 
    programId, 
    brojMezociklusa: mezociklusi.length,
    ukupnoTreninga: izracunajUkupnoTreninga(program),
  });
  
  return program;
}

// ============================================
// BUILD MESOCYCLES
// ============================================

interface BuildMesocyclesInput extends GeneratorInput {
  splitTip: TipSplita;
}

export async function buildMesocycles(input: BuildMesocyclesInput): Promise<Mezociklus[]> {
  const { trajanjeTjedana, cilj, razina } = input;
  log('debug', 'Generiranje mezociklusa', { trajanjeTjedana });
  
  const mezociklusi: Mezociklus[] = [];
  let preostaloTjedana = trajanjeTjedana;
  let redniBroj = 1;
  
  // Odredi strukturu mezociklusa ovisno o trajanju
  const struktura = odrediStrukturuMezociklusa(trajanjeTjedana, cilj);
  
  for (const { tip, tjedana } of struktura) {
    if (preostaloTjedana <= 0) break;
    
    const stvarnoTjedana = Math.min(tjedana, preostaloTjedana);
    const mezociklusConfig = MEZOCIKLUS_TIPOVI.find(m => m.tip === tip)!;
    
    // Izračunaj volumen po grupama
    const volumenPoGrupi = izracunajVolumenPoGrupi(cilj, razina, tip);
    
    // Kreiraj tjedne za ovaj mezociklus
    const tjedni = await buildWeeks({
      ...input,
      mezociklusTip: tip,
      brojTjedana: stvarnoTjedana,
      pocetniVolumen: volumenPoGrupi.pocetni,
      zavrsniVolumen: volumenPoGrupi.zavrsni,
    });
    
    const mezociklus: Mezociklus = {
      id: uuidv4(),
      programId: '', // Popunit će se u buildProgram
      redniBroj,
      naziv: generirajNazivMezociklusa(tip, redniBroj),
      tip: tip as TipMezociklusa,
      trajanjeTjedana: stvarnoTjedana,
      fokusOpis: mezociklusConfig.fokus,
      pocetniVolumenPoGrupi: volumenPoGrupi.pocetni,
      zavrsniVolumenPoGrupi: volumenPoGrupi.zavrsni,
      pocetniIntenzitetPostotak: mezociklusConfig.intenzitetRaspon.min,
      zavrsniIntenzitetPostotak: mezociklusConfig.intenzitetRaspon.max,
      tipProgresije: cilj === 'hipertrofija' ? 'linearna' : 'valna',
      tjedni,
    };
    
    mezociklusi.push(mezociklus);
    preostaloTjedana -= stvarnoTjedana;
    redniBroj++;
  }
  
  log('info', `Kreirano ${mezociklusi.length} mezociklusa`);
  return mezociklusi;
}

// ============================================
// BUILD WEEKS
// ============================================

interface BuildWeeksInput extends BuildMesocyclesInput {
  mezociklusTip: string;
  brojTjedana: number;
  pocetniVolumen: Record<string, number>;
  zavrsniVolumen: Record<string, number>;
}

async function buildWeeks(input: BuildWeeksInput): Promise<Tjedan[]> {
  const { brojTjedana, mezociklusTip, pocetniVolumen, zavrsniVolumen, razina } = input;
  const tjedni: Tjedan[] = [];
  
  // Odredi tip progresije ovisno o cilju i trajanju
  // Kraći programi (4 tjedna) koriste linearnu, duži valnatu
  const tipProgresije = brojTjedana >= 6 ? 'valna' : 'linearna';
  
  log('info', `Koristi se ${tipProgresije} progresija za ${brojTjedana} tjedana`);
  
  for (let i = 1; i <= brojTjedana; i++) {
    // Koristi IFT valovitu progresiju
    const progresija = izracunajValnuProgresiju(i, brojTjedana, tipProgresije);
    const jeDeload = progresija.tipProgresije === 'deload';
    
    const volumenMod = progresija.volumenMultiplikator;
    const intenzitetMod = progresija.intenzitetMultiplikator;
    
    // Interpoliraj bazni volumen za ovaj tjedan, pa primijeni modifikator
    const baznaProgresija = (i - 1) / Math.max(1, brojTjedana - 1);
    const volumenOvogTjedna: Record<string, number> = {};
    
    for (const grupa of Object.keys(pocetniVolumen)) {
      const pocetni = pocetniVolumen[grupa];
      const zavrsni = zavrsniVolumen[grupa];
      // Bazni volumen (linearna interpolacija) * valoviti modifikator
      const bazniVolumen = pocetni + (zavrsni - pocetni) * baznaProgresija;
      const volumenSModifikatorom = Math.round(bazniVolumen * volumenMod);
      
      // MEV/MRV validacija
      const mev = MEV_PO_GRUPI[grupa] || 4;
      const mrv = MRV_PO_GRUPI[grupa] || 20;
      volumenOvogTjedna[grupa] = validacijaVolumenaMEVMRV(volumenSModifikatorom, mev, mrv, grupa);
    }
    
    // Kreiraj treninge za ovaj tjedan
    const treninzi = await buildSessions({
      ...input,
      tjedanBroj: i,
      jeDeload,
      volumenPoGrupi: volumenOvogTjedna,
      volumenModifikator: volumenMod,
      intenzitetModifikator: intenzitetMod,
    });
    
    // Izračunaj stvarni volumen tracking nakon što su treninzi generirani
    const volumenTracking = izracunajUkupniVolumenTjedna(treninzi, razina);
    
    const tjedan: Tjedan = {
      id: uuidv4(),
      mezociklusId: '', // Popunit će se kasnije
      tjedanBroj: i,
      jeDeload,
      volumenModifikator: Math.round(volumenMod * 100) / 100,
      intenzitetModifikator: Math.round(intenzitetMod * 100) / 100,
      napomene: progresija.opisFaze,
      // NOVO: Tracking volumena po grupi
      volumenPoGrupi: volumenTracking,
      progresija,
      treninzi,
    };
    
    tjedni.push(tjedan);
    
    // Log volume tracking
    const optimalniCount = volumenTracking.filter(v => v.status === 'optimalno').length;
    const ukupniGrupe = volumenTracking.length;
    log('debug', `Tjedan ${i}: ${optimalniCount}/${ukupniGrupe} grupa u optimalnom volumenu, mod: ${volumenMod.toFixed(2)}`);
  }
  
  log('debug', `Kreirano ${tjedni.length} tjedana za mezociklus s ${tipProgresije} progresijom`);
  return tjedni;
}

// ============================================
// BUILD SESSIONS
// ============================================

interface BuildSessionsInput extends BuildWeeksInput {
  tjedanBroj: number;
  jeDeload: boolean;
  volumenPoGrupi: Record<string, number>;
  volumenModifikator: number;
  intenzitetModifikator: number;
}

async function buildSessions(input: BuildSessionsInput): Promise<TrenigSesija[]> {
  const { treninziTjedno, splitTip, jeDeload, customSplit } = input;
  
  // Ako je custom split, konvertiraj ga u SplitKonfiguracija format
  let splitConfig: typeof SPLIT_KONFIGURACIJE[TipSplita];
  if (splitTip === 'custom' && customSplit) {
    splitConfig = konvertirajCustomSplitUSplitKonfiguraciju(customSplit);
  } else {
    splitConfig = SPLIT_KONFIGURACIJE[splitTip];
  }
  
  const treninzi: TrenigSesija[] = [];
  
  // Dohvati strukturu dana za ovaj split
  const daniStruktura = odrediDaneZaTrening(splitConfig, treninziTjedno);
  
  for (let i = 0; i < treninziTjedno; i++) {
    const tipTreninga = daniStruktura[i] || 'full_body';
    const danUTjednu = odrediDanUTjednu(i, treninziTjedno);
    
    // Dohvati mišićne grupe za ovaj tip treninga
    const misicneGrupe = splitConfig.misicneGrupePoTreningu[tipTreninga] || [];
    
    // Za custom split, koristi naziv dana iz custom konfiguracije
    let nazivTreninga = tipTreninga;
    if (splitTip === 'custom' && customSplit && customSplit.dani[i]) {
      nazivTreninga = customSplit.dani[i].naziv;
    }
    
    // Odaberi vježbe
    const vjezbe = await selectExercises({
      ...input,
      tipTreninga,
      misicneGrupe,
      redniBrojTreninga: i + 1,
    });
    
    // Kreiraj zagrijavanje i završni dio
    const zagrijavanje = kreirajZagrijavanje(tipTreninga);
    const zavrsniDio = kreirajZavrsniDio(tipTreninga, misicneGrupe);
    
    const trening: TrenigSesija = {
      id: uuidv4(),
      weekId: '', // Popunit će se kasnije
      danUTjednu,
      naziv: nazivTreninga || generirajNazivTreninga(tipTreninga, i + 1),
      tipTreninga,
      procijenjanoTrajanje: izracunajTrajanje(vjezbe.length, jeDeload),
      zagrijavanje,
      glavniDio: vjezbe,
      zavrsniDio,
      trenerLocked: false,
    };
    
    treninzi.push(trening);
  }
  
  log('debug', `Kreirano ${treninzi.length} treninga za tjedan ${input.tjedanBroj}`);
  return treninzi;
}

// ============================================
// PRAĆENJE KORIŠTENIH VJEŽBI (ROTACIJA)
// ============================================

/**
 * Globalni tracker korištenih vježbi za sprječavanje ponavljanja
 * Ključ: exercise ID, Vrijednost: { weekNumber, sessionNumber, timesUsed }
 */
interface VjezbaUsage {
  weekNumber: number;
  sessionNumber: number;
  timesUsed: number;
}

let koristeneVjezbeTracker: Map<string, VjezbaUsage> = new Map();
let currentProgramId: string | null = null;

/**
 * Resetira tracker za novi program
 */
export function resetVjezbaTracker(programId?: string): void {
  koristeneVjezbeTracker = new Map();
  currentProgramId = programId || null;
  log('debug', 'Tracker vježbi resetiran');
}

/**
 * Označava vježbu kao korištenu
 */
function oznaciVjezbuKaoKoristenu(vjezbaId: string, weekNumber: number, sessionNumber: number): void {
  const existing = koristeneVjezbeTracker.get(vjezbaId);
  if (existing) {
    koristeneVjezbeTracker.set(vjezbaId, {
      weekNumber,
      sessionNumber,
      timesUsed: existing.timesUsed + 1,
    });
  } else {
    koristeneVjezbeTracker.set(vjezbaId, { weekNumber, sessionNumber, timesUsed: 1 });
  }
}

/**
 * Provjerava je li vježba već korištena u ovom tjednu
 */
function jeVjezbaKoristenaUTjednu(vjezbaId: string, weekNumber: number): boolean {
  const usage = koristeneVjezbeTracker.get(vjezbaId);
  return usage !== undefined && usage.weekNumber === weekNumber;
}

/**
 * Dohvaća prioritet vježbe (manje korištene = viši prioritet)
 */
function getPrioritetVjezbe(vjezbaId: string): number {
  const usage = koristeneVjezbeTracker.get(vjezbaId);
  if (!usage) return 100; // Nekorištena vježba ima najviši prioritet
  return Math.max(0, 100 - usage.timesUsed * 20); // Svako korištenje smanjuje prioritet
}

// ============================================
// IFT METODIKA - STRUKTURA TRENINGA
// ============================================

/**
 * IFT Tablica 24 - Struktura vježbi unutar treninga
 * 
 * Redoslijed: Compound vježbe PRVO (viši intenzitet) → Isolation NA KRAJU (niži intenzitet)
 * 
 * Primjer hipertrofija (donji dio):
 * 1. Goblet čučanj     - 4x8-10, 75% - COMPOUND
 * 2. Hip thrust        - 4x8-10, 75% - COMPOUND
 * 3. Rumunjsko mrtvo   - 3x10-12, 70% - COMPOUND
 * 4. Iskorak u stranu  - 3x10-12, 70% - COMPOUND
 * 5. Nožna ekstenzija  - 3x12-15, 60% - ISOLATION (trenažer)
 * 6. Nožna fleksija    - 3x12-15, 60% - ISOLATION (trenažer)
 */

/**
 * Konfiguracija za strukturu treninga prema IFT metodici
 */
interface IFTTreningStruktura {
  // Broj vježbi po tipu
  brojCompoundVjezbi: number;
  brojIsolationVjezbi: number;
  
  // Parametri za compound vježbe (početak treninga)
  compoundIntenzitet: number;      // % 1RM
  compoundSetovi: number;
  compoundPonavljanja: { min: number; max: number };
  
  // Parametri za isolation vježbe (kraj treninga)
  isolationIntenzitet: number;     // % 1RM
  isolationSetovi: number;
  isolationPonavljanja: { min: number; max: number };
  
  // Prioritetni obrasci pokreta
  obrazciPokretaPrioritet: string[];
  
  // Dozvoljene kategorije vježbi
  preferiraneKategorije: string[];
  izbjegavajKategorije: string[];
  
  // Oprema preferencija
  preferiraSlobodneUtege: boolean;  // za compound
  preferirajTrenazere: boolean;      // za isolation
}

/**
 * IFT Metodika - Konfiguracija treninga prema cilju
 * Izvor: Tablica 23 i Tablica 24 iz IFT skripte
 */
function getIFTStruktura(cilj: string, fazaMezociklusa: string, razina: string): IFTTreningStruktura {
  
  // =============================================
  // JAKOST - IFT Tablica 23: 3-8 serija, 1-5 pon, 90-100% 1RM
  // Fokus: Compound vježbe sa slobodnim utezima
  // =============================================
  if (cilj === 'jakost' || fazaMezociklusa === 'jakost' || fazaMezociklusa === 'realizacija') {
    return {
      brojCompoundVjezbi: 4,           // Većina treninga je compound
      brojIsolationVjezbi: 1,          // Minimalno isolation
      compoundIntenzitet: 90,          // 90-100% 1RM
      compoundSetovi: 5,               // 3-8 serija
      compoundPonavljanja: { min: 1, max: 5 },
      isolationIntenzitet: 70,
      isolationSetovi: 3,
      isolationPonavljanja: { min: 6, max: 8 },
      obrazciPokretaPrioritet: ['squat', 'hinge', 'horizontal_push', 'vertical_pull', 'vertical_push'],
      preferiraneKategorije: ['strength', 'powerlifting'],
      izbjegavajKategorije: ['stretching', 'cardio', 'plyometrics'],
      preferiraSlobodneUtege: true,
      preferirajTrenazere: false,
    };
  }
  
  // =============================================
  // SNAGA/POWER - IFT Tablica 23: 3-6 serija, 6-8 pon, 80-90% 1RM
  // Fokus: Eksplozivne compound vježbe
  // =============================================
  if (cilj === 'snaga' || fazaMezociklusa === 'snaga') {
    return {
      brojCompoundVjezbi: 4,
      brojIsolationVjezbi: 1,
      compoundIntenzitet: 85,          // 80-90% 1RM
      compoundSetovi: 4,               // 3-6 serija
      compoundPonavljanja: { min: 6, max: 8 },
      isolationIntenzitet: 65,
      isolationSetovi: 3,
      isolationPonavljanja: { min: 8, max: 10 },
      obrazciPokretaPrioritet: ['squat', 'hinge', 'vertical_push', 'horizontal_push', 'vertical_pull'],
      preferiraneKategorije: ['strength', 'olympic weightlifting', 'plyometrics'],
      izbjegavajKategorije: ['stretching'],
      preferiraSlobodneUtege: true,
      preferirajTrenazere: false,
    };
  }
  
  // =============================================
  // HIPERTROFIJA - IFT Tablica 23: 3-5 serija, 8-12 pon, 65-80% 1RM
  // Izvor: Tablica 24 pokazuje 67% compound, 33% isolation
  // Struktura: Compound na početku (75%), Isolation na kraju (60%)
  // =============================================
  if (cilj === 'hipertrofija' || fazaMezociklusa === 'hipertrofija' || fazaMezociklusa === 'akumulacija') {
    // Prilagodi broj vježbi prema razini
    const brojVjezbi = razina === 'pocetnik' ? 5 : razina === 'srednji' ? 6 : 7;
    const compoundBroj = Math.ceil(brojVjezbi * 0.67);  // ~67% compound (Tablica 24)
    const isolationBroj = brojVjezbi - compoundBroj;
    
    return {
      brojCompoundVjezbi: compoundBroj,
      brojIsolationVjezbi: isolationBroj,
      compoundIntenzitet: 75,          // 65-80% 1RM, sredina
      compoundSetovi: 4,               // 3-5 serija
      compoundPonavljanja: { min: 8, max: 12 },
      isolationIntenzitet: 60,         // Niži intenzitet za isolation
      isolationSetovi: 3,
      isolationPonavljanja: { min: 12, max: 15 },
      obrazciPokretaPrioritet: ['horizontal_push', 'horizontal_pull', 'squat', 'hinge', 'vertical_push', 'vertical_pull'],
      preferiraneKategorije: ['strength'],
      izbjegavajKategorije: ['cardio', 'strongman'],
      preferiraSlobodneUtege: true,    // Compound sa slobodnim utezima
      preferirajTrenazere: true,       // Isolation na trenažerima (sigurnije)
    };
  }
  
  // =============================================
  // IZDRŽLJIVOST - IFT Tablica 23: 2+ serija, 12+ pon, do 60% 1RM
  // Fokus: Više isolation, kraći odmori
  // =============================================
  if (cilj === 'izdrzljivost' || fazaMezociklusa === 'izdrzljivost') {
    return {
      brojCompoundVjezbi: 2,           // Manje compound
      brojIsolationVjezbi: 4,          // Više isolation
      compoundIntenzitet: 60,          // Do 60% 1RM
      compoundSetovi: 3,
      compoundPonavljanja: { min: 12, max: 15 },
      isolationIntenzitet: 50,
      isolationSetovi: 2,
      isolationPonavljanja: { min: 15, max: 25 },
      obrazciPokretaPrioritet: ['horizontal_push', 'horizontal_pull', 'squat', 'isolation'],
      preferiraneKategorije: ['strength'],
      izbjegavajKategorije: ['powerlifting', 'strongman'],
      preferiraSlobodneUtege: false,
      preferirajTrenazere: true,       // Trenažeri za sigurnost kod visokih ponavljanja
    };
  }
  
  // =============================================
  // DELOAD - Smanjeni volumen i intenzitet za oporavak
  // =============================================
  if (fazaMezociklusa === 'deload' || fazaMezociklusa === 'tranzicija') {
    return {
      brojCompoundVjezbi: 2,
      brojIsolationVjezbi: 2,
      compoundIntenzitet: 55,
      compoundSetovi: 2,
      compoundPonavljanja: { min: 10, max: 12 },
      isolationIntenzitet: 45,
      isolationSetovi: 2,
      isolationPonavljanja: { min: 12, max: 15 },
      obrazciPokretaPrioritet: ['horizontal_push', 'horizontal_pull', 'squat'],
      preferiraneKategorije: ['strength'],
      izbjegavajKategorije: ['powerlifting', 'strongman', 'plyometrics'],
      preferiraSlobodneUtege: false,
      preferirajTrenazere: true,
    };
  }
  
  // =============================================
  // DEFAULT - Rekreacija/Zdravlje
  // =============================================
  return {
    brojCompoundVjezbi: 3,
    brojIsolationVjezbi: 2,
    compoundIntenzitet: 65,
    compoundSetovi: 3,
    compoundPonavljanja: { min: 10, max: 12 },
    isolationIntenzitet: 55,
    isolationSetovi: 2,
    isolationPonavljanja: { min: 12, max: 15 },
    obrazciPokretaPrioritet: ['horizontal_push', 'horizontal_pull', 'squat', 'hinge'],
    preferiraneKategorije: ['strength'],
    izbjegavajKategorije: ['strongman', 'powerlifting'],
    preferiraSlobodneUtege: true,
    preferirajTrenazere: true,
  };
}

/**
 * Izračunava progresivni intenzitet unutar treninga
 * IFT Tablica 24: Intenzitet pada kroz trening (75% → 70% → 60%)
 */
function izracunajProgresivniIntenzitet(
  pozicijaVjezbe: number, 
  ukupnoVjezbi: number, 
  bazniIntenzitet: number,
  jeIsolation: boolean
): number {
  // Compound vježbe: viši intenzitet na početku
  // Isolation vježbe: niži intenzitet
  if (jeIsolation) {
    return bazniIntenzitet - 15; // Isolation je ~15% niži
  }
  
  // Progresivno smanjenje kroz compound vježbe
  const pad = (pozicijaVjezbe / ukupnoVjezbi) * 10; // Do 10% pada
  return Math.round(bazniIntenzitet - pad);
}

// ============================================
// SELECT EXERCISES - IFT METODIKA ALGORITAM
// ============================================

interface SelectExercisesInput extends BuildSessionsInput {
  tipTreninga: string;
  misicneGrupe: string[];
  redniBrojTreninga: number;
}

/**
 * Glavni algoritam za odabir vježbi prema IFT metodici
 * 
 * IFT Struktura treninga (Tablica 24):
 * =====================================
 * 1. COMPOUND vježbe PRVO - viši intenzitet (75% 1RM), više setova (4)
 * 2. COMPOUND vježbe SREDINA - srednji intenzitet (70% 1RM), manje setova (3)
 * 3. ISOLATION vježbe NA KRAJU - niži intenzitet (60% 1RM), više ponavljanja
 * 
 * Rotacija vježbi:
 * ================
 * - Praćenje korištenih vježbi kroz tjedan (izbjegava ponavljanje)
 * - Prioritet za nekorištene vježbe
 * - Varijabilnost između tjedana
 * 
 * Oprema (IFT preporuka):
 * =======================
 * - Slobodni utezi za compound (aktiviraju sinergiste i stabilizatore)
 * - Trenažeri za isolation (sigurniji, bolji za izolaciju)
 */
export async function selectExercises(input: SelectExercisesInput): Promise<VjezbaSesije[]> {
  const { 
    misicneGrupe, 
    razina, 
    cilj, 
    dostupnaOprema, 
    izbjegavajVjezbe,
    jeDeload,
    volumenModifikator,
    intenzitetModifikator,
    tjedanBroj,
    redniBrojTreninga,
    mezociklusTip,
  } = input;
  
  // Dohvati IFT strukturu za ovaj cilj/fazu
  const iftStruktura = getIFTStruktura(cilj, mezociklusTip, razina);
  const ciljParam = CILJ_PARAMETRI[cilj];
  const libraryLevel = mapRazinuNaLevel(razina);
  
  // Deload smanjuje broj vježbi
  const targetCompound = jeDeload ? 2 : iftStruktura.brojCompoundVjezbi;
  const targetIsolation = jeDeload ? 1 : iftStruktura.brojIsolationVjezbi;
  const ukupnoVjezbiTarget = targetCompound + targetIsolation;
  
  log('debug', `IFT Struktura za ${cilj}/${mezociklusTip}:`, {
    targetCompound,
    targetIsolation,
    compoundIntenzitet: iftStruktura.compoundIntenzitet,
    isolationIntenzitet: iftStruktura.isolationIntenzitet,
  });
  
  // =============================================
  // FAZA 1: Prikupi sve kandidate po mišićnim grupama
  // =============================================
  const sviCompoundKandidati: VjezbaProširena[] = [];
  const sviIsolationKandidati: VjezbaProširena[] = [];
  
  for (const grupa of misicneGrupe) {
    const kandidati = await dohvatiVjezbeZaGrupu(grupa, {
      oprema: dostupnaOprema,
      razina: libraryLevel,
      maksVjezbi: 25, // Veći pool za bolju rotaciju
      prioritetCompound: true,
    });
    
    // Filtriraj
    const filtrirani = kandidati.filter(v => {
      if (izbjegavajVjezbe?.includes(v.id)) return false;
      if (iftStruktura.izbjegavajKategorije.includes(v.category)) return false;
      return true;
    });
    
    // Razdvoji compound i isolation
    for (const v of filtrirani) {
      if (v.mechanic === 'compound') {
        if (!sviCompoundKandidati.some(x => x.id === v.id)) {
          sviCompoundKandidati.push(v);
        }
      } else {
        if (!sviIsolationKandidati.some(x => x.id === v.id)) {
          sviIsolationKandidati.push(v);
        }
      }
    }
  }
  
  // =============================================
  // FAZA 2: Sortiraj kandidate prema IFT prioritetima
  // =============================================
  
  const sortirajPoIFTPrioritetu = (vjezbe: VjezbaProširena[]): VjezbaProširena[] => {
    return [...vjezbe].sort((a, b) => {
      // 1. Prioritet: Nekorištene vježbe u ovom tjednu (smanjen utjecaj)
      const koristenaA = jeVjezbaKoristenaUTjednu(a.id, tjedanBroj) ? 0 : 30;
      const koristenaB = jeVjezbaKoristenaUTjednu(b.id, tjedanBroj) ? 0 : 30;
      
      // 2. Prioritet: Manje korištene vježbe ukupno (smanjen utjecaj)
      const frekvencijaA = getPrioritetVjezbe(a.id);
      const frekvencijaB = getPrioritetVjezbe(b.id);
      
      // 3. Prioritet: Obrazac pokreta prema fazi (POJAČAN - najvažniji za fazu)
      const obrazacIdxA = iftStruktura.obrazciPokretaPrioritet.indexOf(a.obrazac_pokreta);
      const obrazacIdxB = iftStruktura.obrazciPokretaPrioritet.indexOf(b.obrazac_pokreta);
      // Prvi obrazac = 30 bodova, drugi = 25, treći = 20, itd.
      const obrazacPrioritetA = obrazacIdxA >= 0 ? (30 - obrazacIdxA * 5) : -10; // Penaliziraj ako nije u prioritetima
      const obrazacPrioritetB = obrazacIdxB >= 0 ? (30 - obrazacIdxB * 5) : -10;
      
      // 4. Prioritet: Preferirane kategorije (POJAČAN)
      const kategorijaBonusA = iftStruktura.preferiraneKategorije.includes(a.category) ? 25 : 0;
      const kategorijaBonusB = iftStruktura.preferiraneKategorije.includes(b.category) ? 25 : 0;
      
      // 5. Prioritet: Oprema (slobodni utezi vs trenažeri) (POJAČAN)
      let opremaBonusA = 0;
      let opremaBonusB = 0;
      if (iftStruktura.preferiraSlobodneUtege) {
        opremaBonusA = ['sipka', 'bucice', 'girje'].includes(a.oprema_hr) ? 15 : 0;
        opremaBonusB = ['sipka', 'bucice', 'girje'].includes(b.oprema_hr) ? 15 : 0;
      } else if (iftStruktura.preferirajTrenazere) {
        // Za izdržljivost/deload - preferiraj trenažere
        opremaBonusA = ['trenazer', 'kabel', 'masina'].some(op => a.oprema_hr?.includes(op)) ? 15 : 0;
        opremaBonusB = ['trenazer', 'kabel', 'masina'].some(op => b.oprema_hr?.includes(op)) ? 15 : 0;
      }
      
      // 6. BONUS: Powerlifting vježbe za jakost (dodatni prioritet)
      let powerliftingBonusA = 0;
      let powerliftingBonusB = 0;
      if (cilj === 'jakost' || mezociklusTip === 'jakost') {
        // Big 3 i powerlifting varijante
        const powerliftingVjezbe = ['squat', 'bench press', 'deadlift', 'overhead press'];
        const jePowerliftingA = powerliftingVjezbe.some(pv => 
          a.name.toLowerCase().includes(pv.toLowerCase()) || 
          a.name_hr?.toLowerCase().includes(pv.toLowerCase())
        );
        const jePowerliftingB = powerliftingVjezbe.some(pv => 
          b.name.toLowerCase().includes(pv.toLowerCase()) || 
          b.name_hr?.toLowerCase().includes(pv.toLowerCase())
        );
        powerliftingBonusA = jePowerliftingA ? 20 : 0;
        powerliftingBonusB = jePowerliftingB ? 20 : 0;
      }
      
      const scoreA = koristenaA + frekvencijaA + obrazacPrioritetA + kategorijaBonusA + opremaBonusA + powerliftingBonusA;
      const scoreB = koristenaB + frekvencijaB + obrazacPrioritetB + kategorijaBonusB + opremaBonusB + powerliftingBonusB;
      
      return scoreB - scoreA;
    });
  };
  
  const sortiraniCompound = sortirajPoIFTPrioritetu(sviCompoundKandidati);
  const sortiraniIsolation = sortirajPoIFTPrioritetu(sviIsolationKandidati);
  
  // =============================================
  // VALIDACIJA: Provjeri da ima dovoljno kandidata
  // =============================================
  
  if (sortiraniCompound.length < targetCompound) {
    log('warning', `Nedovoljno compound vježbi: traženo ${targetCompound}, dostupno ${sortiraniCompound.length}`, {
      misicneGrupe,
      dostupnaOprema,
    });
  }
  
  if (sortiraniIsolation.length < targetIsolation) {
    log('warning', `Nedovoljno isolation vježbi: traženo ${targetIsolation}, dostupno ${sortiraniIsolation.length}`, {
      misicneGrupe,
      dostupnaOprema,
    });
  }
  
  // =============================================
  // FAZA 3: Odaberi vježbe s ponderiranom nasumičnošću
  // =============================================
  
  const vjezbe: VjezbaSesije[] = [];
  const odabraniIdevi = new Set<string>();
  let redniBroj = 1;
  
  /**
   * Odabir s ponderiranom nasumičnošću
   * Top kandidati imaju veću šansu, ali nije deterministički
   */
  const odaberiSPonderom = (kandidati: VjezbaProširena[], brojZaOdabir: number): VjezbaProširena[] => {
    const odabrani: VjezbaProširena[] = [];
    const dostupni = kandidati.filter(k => !odabraniIdevi.has(k.id));
    
    // Ako nema dovoljno kandidata, uzmi sve dostupne
    const stvarniBrojZaOdabir = Math.min(brojZaOdabir, dostupni.length);
    
    if (stvarniBrojZaOdabir < brojZaOdabir) {
      log('warning', `Nedovoljno kandidata: traženo ${brojZaOdabir}, dostupno ${dostupni.length}`, {
        tip: kandidati[0]?.mechanic || 'unknown',
      });
    }
    
    for (let i = 0; i < stvarniBrojZaOdabir && dostupni.length > 0; i++) {
      // Uzmi top 5 kandidata za ponderiranu selekciju
      const topN = Math.min(5, dostupni.length);
      const topKandidati = dostupni.slice(0, topN);
      
      // Ponderi: 40%, 25%, 18%, 10%, 7%
      const weights = [0.40, 0.25, 0.18, 0.10, 0.07];
      const totalWeight = weights.slice(0, topN).reduce((a, b) => a + b, 0);
      
      let random = Math.random() * totalWeight;
      let odabranaVjezba: VjezbaProširena | null = null;
      
      for (let j = 0; j < topN; j++) {
        random -= weights[j];
        if (random <= 0) {
          odabranaVjezba = topKandidati[j];
          break;
        }
      }
      
      if (!odabranaVjezba) odabranaVjezba = topKandidati[0];
      
      odabrani.push(odabranaVjezba);
      odabraniIdevi.add(odabranaVjezba.id);
      
      // Ukloni iz dostupnih
      const idx = dostupni.indexOf(odabranaVjezba);
      if (idx > -1) dostupni.splice(idx, 1);
    }
    
    return odabrani;
  };
  
  // =============================================
  // FAZA 4: Kreiraj vježbe s IFT parametrima
  // =============================================
  
  // COMPOUND VJEŽBE - početak treninga, viši intenzitet
  const odabraneCompound = odaberiSPonderom(sortiraniCompound, targetCompound);
  
  for (let i = 0; i < odabraneCompound.length; i++) {
    const vjezba = odabraneCompound[i];
    
    // Progresivni intenzitet: pada kroz trening (Tablica 24: 75% → 70%)
    const intenzitetProgresija = izracunajProgresivniIntenzitet(
      i, 
      odabraneCompound.length, 
      iftStruktura.compoundIntenzitet,
      false
    );
    
    // Setovi: prva polovina ima više setova
    const setovi = i < odabraneCompound.length / 2 
      ? iftStruktura.compoundSetovi 
      : iftStruktura.compoundSetovi - 1;
    
    vjezbe.push(kreirajVjezbuSesijeIFT(
      vjezba,
      redniBroj++,
      {
        setovi: jeDeload ? 2 : Math.max(2, setovi),
        ponavljanja: iftStruktura.compoundPonavljanja,
        intenzitet: jeDeload ? intenzitetProgresija - 20 : intenzitetProgresija,
        odmorSekunde: ciljParam.odmorSekunde,
        tempo: ciljParam.tempoPreporuka,
        rir: ciljParam.rirRaspon,
      },
      volumenModifikator,
      intenzitetModifikator,
    ));
    
    oznaciVjezbuKaoKoristenu(vjezba.id, tjedanBroj, redniBrojTreninga);
  }
  
  // ISOLATION VJEŽBE - kraj treninga, niži intenzitet
  const odabraneIsolation = odaberiSPonderom(sortiraniIsolation, targetIsolation);
  
  for (let i = 0; i < odabraneIsolation.length; i++) {
    const vjezba = odabraneIsolation[i];
    
    vjezbe.push(kreirajVjezbuSesijeIFT(
      vjezba,
      redniBroj++,
      {
        setovi: jeDeload ? 2 : iftStruktura.isolationSetovi,
        ponavljanja: iftStruktura.isolationPonavljanja,
        intenzitet: jeDeload ? iftStruktura.isolationIntenzitet - 15 : iftStruktura.isolationIntenzitet,
        odmorSekunde: { min: ciljParam.odmorSekunde.min, max: Math.min(90, ciljParam.odmorSekunde.max) },
        tempo: ciljParam.tempoPreporuka,
        rir: { min: ciljParam.rirRaspon.min + 1, max: ciljParam.rirRaspon.max + 1 },
      },
      volumenModifikator,
      intenzitetModifikator,
    ));
    
    oznaciVjezbuKaoKoristenu(vjezba.id, tjedanBroj, redniBrojTreninga);
  }
  
  log('info', `IFT Odabrano ${vjezbe.length} vježbi: ${odabraneCompound.length} compound + ${odabraneIsolation.length} isolation`);
  
  return vjezbe;
}

/**
 * Kreira vježbu sesije s IFT parametrima
 */
function kreirajVjezbuSesijeIFT(
  vjezba: VjezbaProširena,
  redniBroj: number,
  params: {
    setovi: number;
    ponavljanja: { min: number; max: number };
    intenzitet: number;
    odmorSekunde: { min: number; max: number };
    tempo: string;
    rir: { min: number; max: number };
  },
  volumenMod: number,
  intenzitetMod: number,
): VjezbaSesije {
  // ============================================
  // VALIDACIJA I NORMALIZACIJA PARAMETARA
  // ============================================
  
  // 1. Ponavljanja - provjeri da min <= max
  const ponavljanjaMin = Math.max(1, Math.min(params.ponavljanja.min, params.ponavljanja.max));
  const ponavljanjaMax = Math.max(ponavljanjaMin, params.ponavljanja.max);
  const ponavljanjaStr = `${ponavljanjaMin}-${ponavljanjaMax}`;
  
  // 2. RIR - validiraj raspon 0-5
  const rirSrednja = Math.round((params.rir.min + params.rir.max) / 2);
  const rirValidiran = Math.min(5, Math.max(0, rirSrednja));
  
  // 3. Odmor - validiraj da nije negativan i da je razuman (max 600 sekundi = 10 min)
  const odmorSrednja = Math.round((params.odmorSekunde.min + params.odmorSekunde.max) / 2);
  const odmorValidiran = Math.min(600, Math.max(0, odmorSrednja));
  
  // 4. Setovi - validiraj da nije 0 ili negativan, min 1 set
  const setoviSModifikatorom = params.setovi * volumenMod;
  const setoviValidirani = Math.max(1, Math.round(setoviSModifikatorom));
  
  // 5. Postotak 1RM - validiraj raspon 0-120% (120% za neke napredne tehnike)
  const postotak1RMSModifikatorom = params.intenzitet * intenzitetMod;
  const postotak1RMValidiran = Math.min(120, Math.max(0, Math.round(postotak1RMSModifikatorom)));
  
  // 6. Log upozorenja za ekstremne vrijednosti (za debugging)
  if (DEBUG) {
    if (setoviValidirani !== Math.round(setoviSModifikatorom)) {
      log('warning', `Setovi prilagođeni: ${Math.round(setoviSModifikatorom)} → ${setoviValidirani}`, {
        vjezba: vjezba.naziv_hr,
        volumenMod,
        originalSetovi: params.setovi,
      });
    }
    if (postotak1RMValidiran !== Math.round(postotak1RMSModifikatorom)) {
      log('warning', `Postotak 1RM prilagođen: ${Math.round(postotak1RMSModifikatorom)}% → ${postotak1RMValidiran}%`, {
        vjezba: vjezba.naziv_hr,
        intenzitetMod,
        originalIntenzitet: params.intenzitet,
      });
    }
    if (odmorValidiran !== odmorSrednja) {
      log('warning', `Odmor prilagođen: ${odmorSrednja}s → ${odmorValidiran}s`, {
        vjezba: vjezba.naziv_hr,
      });
    }
  }
  
  // Validacija obaveznih podataka vježbe
  if (!vjezba.id) {
    log('error', 'Vježba nema ID', { vjezba });
    throw new Error('Vježba mora imati ID');
  }
  
  if (!vjezba.naziv_hr && !vjezba.name) {
    log('error', 'Vježba nema naziv', { vjezbaId: vjezba.id });
    throw new Error(`Vježba ${vjezba.id} mora imati naziv (hr ili en)`);
  }
  
  return {
    id: uuidv4(),
    sessionId: '',
    redniBroj,
    exerciseLibraryId: vjezba.id,
    naziv: vjezba.naziv_hr || vjezba.name || 'Nepoznata vježba',
    nazivEn: vjezba.name || vjezba.naziv_hr || 'Unknown exercise',
    setovi: setoviValidirani,
    ponavljanja: ponavljanjaStr,
    odmorSekunde: odmorValidiran,
    tempo: params.tempo || '2/0/2/0', // Default tempo ako nije zadan
    rir: rirValidiran,
    postotak1RM: postotak1RMValidiran,
    tipVjezbe: (vjezba.mechanic as 'compound' | 'isolation') || 'isolation',
    obrazacPokreta: vjezba.obrazac_pokreta || 'unknown',
    primarneGrupe: vjezba.primarne_grupe_hr || [],
    sekundarneGrupe: vjezba.sekundarne_grupe_hr || [],
    oprema: vjezba.oprema_hr || 'Nepoznata oprema',
    alternativneVjezbe: [],
    jeSuperser: false,
    trenerOverride: false,
  };
}

// ============================================
// HELPER FUNKCIJE
// ============================================

/**
 * Generira naziv programa prema IFT metodici
 */
function generirajNazivPrograma(cilj: string, split: TipSplita, razina: string): string {
  const ciljNazivi: Record<string, string> = {
    // IFT ciljevi (Tablica 23)
    jakost: 'Jakost',
    snaga: 'Snaga/Power',
    hipertrofija: 'Hipertrofija',
    izdrzljivost: 'Izdržljivost',
    rekreacija_zdravlje: 'Rekreacija',
    // Legacy podrška
    maksimalna_snaga: 'Maksimalna snaga',
    misicna_izdrzljivost: 'Mišićna izdržljivost',
  };
  const splitNazivi = SPLIT_KONFIGURACIJE[split].naziv;
  return `${ciljNazivi[cilj] || cilj} - ${splitNazivi}`;
}

function generirajOpisPrograma(input: GeneratorInput, splitConfig: typeof SPLIT_KONFIGURACIJE[TipSplita]): string {
  return `Program za ${input.cilj.replace('_', ' ')} prilagođen ${input.razina} razini. ` +
         `Trajanje: ${input.trajanjeTjedana} tjedana, ${input.treninziTjedno} treninga tjedno. ` +
         `${splitConfig.opisHr}`;
}

/**
 * Generira naziv mezociklusa prema IFT fazama
 */
function generirajNazivMezociklusa(tip: string, redniBroj: number): string {
  const tipNazivi: Record<string, string> = {
    // Klasična periodizacija
    akumulacija: 'Faza akumulacije',
    intenzifikacija: 'Faza intenzifikacije',
    realizacija: 'Faza realizacije',
    deload: 'Deload faza',
    // IFT specifične faze
    hipertrofija: 'Faza hipertrofije',
    jakost: 'Faza jakosti',
    snaga: 'Faza snage/power',
    izdrzljivost: 'Faza izdržljivosti',
    priprema: 'Faza pripreme',
    tranzicija: 'Faza tranzicije',
    natjecanje: 'Natjecateljska faza',
  };
  return `${tipNazivi[tip] || tip} #${redniBroj}`;
}

/**
 * Generira naziv treninga prema IFT metodici
 * Uključuje GPN (Guranje/Povlačenje/Noge) split
 */
function generirajNazivTreninga(tipTreninga: string, redniBroj: number): string {
  const tipNazivi: Record<string, string> = {
    // Full Body
    full_body_a: 'Cijelo tijelo A',
    full_body_b: 'Cijelo tijelo B',
    full_body_c: 'Cijelo tijelo C',
    // Upper/Lower
    upper_a: 'Gornji dio A',
    upper_b: 'Gornji dio B',
    upper_c: 'Gornji dio C',
    lower_a: 'Donji dio A',
    lower_b: 'Donji dio B',
    lower_c: 'Donji dio C',
    // GPN Split (IFT Tablica 25)
    guranje: 'Vježbe Guranja',    // Prsa, ramena, triceps
    povlacenje: 'Vježbe Povlačenja',  // Leđa, biceps
    noge: 'Vježbe za noge',
    // Legacy PPL
    push: 'Push dan',
    pull: 'Pull dan',
    legs: 'Legs dan',
    // Body Part Split
    prsa: 'Prsa',
    prsa_triceps: 'Prsa + Triceps',
    ledja: 'Leđa',
    ledja_biceps: 'Leđa + Biceps',
    ramena: 'Ramena',
    ruke: 'Ruke',
    arms: 'Ruke',
    weak_points: 'Slabe točke',
    // Kardio
    kardio: 'Kardio vježbanje',
  };
  return tipNazivi[tipTreninga] || `Trening ${redniBroj}`;
}

function odrediStrukturuMezociklusa(tjedana: number, cilj: string): { tip: string; tjedana: number }[] {
  // Jednostavna struktura ovisno o trajanju
  if (tjedana <= 4) {
    return [{ tip: 'akumulacija', tjedana }];
  }
  if (tjedana <= 6) {
    return [
      { tip: 'akumulacija', tjedana: tjedana - 1 },
      { tip: 'deload', tjedana: 1 },
    ];
  }
  if (tjedana <= 8) {
    return [
      { tip: 'akumulacija', tjedana: 4 },
      { tip: 'intenzifikacija', tjedana: tjedana - 5 },
      { tip: 'deload', tjedana: 1 },
    ];
  }
  // 9+ tjedana
  return [
    { tip: 'akumulacija', tjedana: 4 },
    { tip: 'intenzifikacija', tjedana: 3 },
    { tip: 'realizacija', tjedana: tjedana - 8 },
    { tip: 'deload', tjedana: 1 },
  ];
}

function izracunajVolumenPoGrupi(
  cilj: string, 
  razina: string, 
  tipMezociklusa: string
): { pocetni: Record<string, number>; zavrsni: Record<string, number> } {
  const mezociklusConfig = MEZOCIKLUS_TIPOVI.find(m => m.tip === tipMezociklusa)!;
  
  const pocetni: Record<string, number> = {};
  const zavrsni: Record<string, number> = {};
  
  for (const [grupa, mav] of Object.entries(MAV_PO_GRUPI)) {
    const mev = MEV_PO_GRUPI[grupa] || 4;
    const mrv = MRV_PO_GRUPI[grupa] || 20;
    
    // Prilagodi volumen ovisno o razini
    const razinaMultiplier = razina === 'pocetnik' ? 0.7 : razina === 'srednji' ? 0.85 : 1.0;
    
    // Pocetni volumen = donja granica MAV * modifikator mezociklusa
    let pocetniRaw = Math.round(mav.min * razinaMultiplier * mezociklusConfig.volumenModifikator);
    
    // Zavrsni volumen = gornja granica MAV * modifikator mezociklusa
    let zavrsniRaw = Math.round(mav.max * razinaMultiplier * mezociklusConfig.volumenModifikator * 0.9);
    
    // MEV/MRV validacija - osiguraj da je volumen u sigurnim granicama
    pocetni[grupa] = validacijaVolumenaMEVMRV(pocetniRaw, mev, mrv, grupa);
    zavrsni[grupa] = validacijaVolumenaMEVMRV(zavrsniRaw, mev, mrv, grupa);
  }
  
  return { pocetni, zavrsni };
}

// ============================================
// MEV/MRV VALIDACIJA - IFT Metodika
// ============================================

/**
 * Validira volumen i osigurava da ostane unutar MEV-MRV granica
 * MEV = Minimalni Efektivni Volumen (ispod ovoga nema napretka)
 * MRV = Maksimalni Oporavivi Volumen (iznad ovoga prevelik umor)
 */
function validacijaVolumenaMEVMRV(
  volumen: number,
  mev: number,
  mrv: number,
  grupa: string
): number {
  if (volumen < mev) {
    log('warn', `Volumen za ${grupa} (${volumen}) ispod MEV (${mev}), povećano na MEV`);
    return mev;
  }
  if (volumen > mrv) {
    log('warn', `Volumen za ${grupa} (${volumen}) iznad MRV (${mrv}), smanjeno na MRV`);
    return mrv;
  }
  return volumen;
}

/**
 * Kreira VolumenTracking objekt za praćenje volumena po mišićnoj grupi
 */
function kreirajVolumenTracking(
  grupa: string,
  planirano: number,
  razina: string
): VolumenTracking {
  const mev = MEV_PO_GRUPI[grupa] || 4;
  const mav = MAV_PO_GRUPI[grupa] || { min: 8, max: 14 };
  const mrv = MRV_PO_GRUPI[grupa] || 20;
  
  // Prilagodi za razinu
  const razinaMultiplier = razina === 'pocetnik' ? 0.7 : razina === 'srednji' ? 0.85 : 1.0;
  const adjustedMev = Math.round(mev * razinaMultiplier);
  const adjustedMavMin = Math.round(mav.min * razinaMultiplier);
  const adjustedMavMax = Math.round(mav.max * razinaMultiplier);
  const adjustedMrv = Math.round(mrv * razinaMultiplier);
  
  // Odredi status
  let status: VolumenTracking['status'];
  if (planirano < adjustedMev) {
    status = 'ispod_mev';
  } else if (planirano <= adjustedMavMin) {
    status = 'u_mev';
  } else if (planirano <= adjustedMavMax) {
    status = 'optimalno';
  } else if (planirano <= adjustedMrv) {
    status = 'blizu_mrv';
  } else {
    status = 'preko_mrv';
  }
  
  return {
    misicnaGrupa: grupa,
    planirano,
    ostvareno: 0, // Popunjava se nakon treninga
    mev: adjustedMev,
    mavMin: adjustedMavMin,
    mavMax: adjustedMavMax,
    mrv: adjustedMrv,
    status,
  };
}

// ============================================
// VALOVITA PROGRESIJA - IFT Metodika
// ============================================

/**
 * IFT Valovita progresija (Wave Loading)
 * Umjesto konstantnog porasta, oscilira volumen i intenzitet:
 * - Tjedan 1: Bazni (1.0)
 * - Tjedan 2: Povećan (1.05-1.10)
 * - Tjedan 3: Smanjen (0.90-0.95) - mini-deload
 * - Tjedan 4: Peak (1.10-1.15)
 * - Tjedan 5+: Deload (0.60)
 */
function izracunajValnuProgresiju(
  tjedanBroj: number,
  ukupnoTjedana: number,
  tipProgresije: 'linearna' | 'valna' = 'valna'
): ProgresijaTjedna {
  const jeZadnjiTjedan = tjedanBroj === ukupnoTjedana && ukupnoTjedana >= 4;
  const jeDeload = jeZadnjiTjedan;
  
  if (jeDeload) {
    return {
      tjedanBroj,
      tipProgresije: 'deload',
      volumenMultiplikator: 0.60,
      intenzitetMultiplikator: 0.70,
      opisFaze: 'Deload - oporavak',
    };
  }
  
  if (tipProgresije === 'linearna') {
    // Linearna progresija (originalna logika)
    const progresija = (tjedanBroj - 1) / Math.max(1, ukupnoTjedana - 1);
    return {
      tjedanBroj,
      tipProgresije: 'linearna',
      volumenMultiplikator: 1.0 + (progresija * 0.10),
      intenzitetMultiplikator: 1.0 + (progresija * 0.05),
      opisFaze: `Tjedan ${tjedanBroj} - progresija`,
    };
  }
  
  // VALOVITA PROGRESIJA (IFT preporučena)
  // Koristi 4-tjedni val pattern koji se ponavlja
  const pozicijaUValu = ((tjedanBroj - 1) % 4) + 1;
  
  switch (pozicijaUValu) {
    case 1: // Bazni tjedan
      return {
        tjedanBroj,
        tipProgresije: 'valna',
        volumenMultiplikator: 1.00,
        intenzitetMultiplikator: 1.00,
        opisFaze: 'Akumulacija - bazni volumen',
      };
    case 2: // Povećan
      return {
        tjedanBroj,
        tipProgresije: 'valna',
        volumenMultiplikator: 1.08,
        intenzitetMultiplikator: 1.03,
        opisFaze: 'Akumulacija - povećan volumen',
      };
    case 3: // Mini-deload (smanjenje)
      return {
        tjedanBroj,
        tipProgresije: 'valna',
        volumenMultiplikator: 0.92,
        intenzitetMultiplikator: 1.05,
        opisFaze: 'Intenzifikacija - smanjen volumen, veći intenzitet',
      };
    case 4: // Peak
      return {
        tjedanBroj,
        tipProgresije: 'valna',
        volumenMultiplikator: 1.12,
        intenzitetMultiplikator: 1.07,
        opisFaze: 'Realizacija - peak',
      };
    default:
      return {
        tjedanBroj,
        tipProgresije: 'valna',
        volumenMultiplikator: 1.00,
        intenzitetMultiplikator: 1.00,
        opisFaze: 'Bazni',
      };
  }
}

/**
 * Izračunava ukupni volumen po mišićnoj grupi za tjedan
 * na temelju svih vježbi u svim treninzima tog tjedna
 */
function izracunajUkupniVolumenTjedna(
  treninzi: TrenigSesija[],
  razina: string
): VolumenTracking[] {
  const volumenPoGrupi: Record<string, number> = {};
  
  // Iteriraj kroz sve treninge i vježbe
  for (const trening of treninzi) {
    for (const vjezba of trening.glavniDio) {
      // Primarne grupe dobivaju puni volumen
      if (vjezba.primarneGrupe) {
        for (const grupa of vjezba.primarneGrupe) {
          const normGrupa = normalizacijaMisicneGrupe(grupa);
          volumenPoGrupi[normGrupa] = (volumenPoGrupi[normGrupa] || 0) + vjezba.setovi;
        }
      }
      // Sekundarne grupe dobivaju 50% volumena (stimulacija, ali ne puni stres)
      if (vjezba.sekundarneGrupe) {
        for (const grupa of vjezba.sekundarneGrupe) {
          const normGrupa = normalizacijaMisicneGrupe(grupa);
          volumenPoGrupi[normGrupa] = (volumenPoGrupi[normGrupa] || 0) + Math.round(vjezba.setovi * 0.5);
        }
      }
    }
  }
  
  // Kreiraj tracking objekte
  const tracking: VolumenTracking[] = [];
  for (const [grupa, setovi] of Object.entries(volumenPoGrupi)) {
    tracking.push(kreirajVolumenTracking(grupa, setovi, razina));
  }
  
  return tracking;
}

/**
 * Normalizira nazive mišićnih grupa (hr/en) na standardni format
 */
function normalizacijaMisicneGrupe(grupa: string): string {
  const mapiranje: Record<string, string> = {
    'chest': 'prsa',
    'back': 'ledja',
    'shoulders': 'ramena',
    'quadriceps': 'cetveroglavi',
    'hamstrings': 'straznja_loza',
    'glutes': 'gluteusi',
    'calves': 'listovi',
    'abdominals': 'trbusnjaci',
    'core': 'trbusnjaci',
    'abs': 'trbusnjaci',
  };
  const lower = grupa.toLowerCase().trim();
  return mapiranje[lower] || lower;
}

function odrediDaneZaTrening(splitConfig: typeof SPLIT_KONFIGURACIJE[TipSplita], treninziTjedno: number): string[] {
  // Pronađi odgovarajuću strukturu za broj treninga
  for (const struktura of splitConfig.daniStruktura) {
    if (struktura.length === treninziTjedno) {
      return struktura;
    }
  }
  // Fallback - uzmi prvu i prilagodi
  const prva = splitConfig.daniStruktura[0];
  if (treninziTjedno < prva.length) {
    return prva.slice(0, treninziTjedno);
  }
  // Ponovi strukturu
  const result: string[] = [];
  while (result.length < treninziTjedno) {
    result.push(...prva);
  }
  return result.slice(0, treninziTjedno);
}

function odrediDanUTjednu(indeks: number, ukupnoTreninga: number): number {
  // Rasporedi treninge ravnomjerno kroz tjedan
  const razmak = 7 / ukupnoTreninga;
  return Math.min(7, Math.floor(1 + indeks * razmak));
}

function mapRazinuNaLevel(razina: string): ('beginner' | 'intermediate' | 'expert')[] {
  switch (razina) {
    case 'pocetnik':
      return ['beginner'];
    case 'srednji':
      return ['beginner', 'intermediate'];
    case 'napredni':
      return ['beginner', 'intermediate', 'expert'];
    default:
      return ['beginner', 'intermediate'];
  }
}

// Legacy interface za backward kompatibilnost
interface FazaOdabirParametri {
  prioritetCompound: number;
  prioritetIsolation: number;
  preferiraneKategorije: string[];
  izbjegavajKategorije: string[];
  maksBrojVjezbiPoGrupi: number;
  obrazciPokretaPrioritet: string[];
}

/**
 * @deprecated Koristi novu IFT-based selectExercises funkciju
 * Napredni odabir vježbe s rotacijom i prioritizacijom prema fazi
 */
function odaberiVjezbuNapredni(
  kandidati: VjezbaProširena[], 
  vecOdabrane: VjezbaSesije[], 
  tjedanBroj: number,
  fazaParams: FazaOdabirParametri
): VjezbaProširena | null {
  // Izbjegni duplikate u ovoj sesiji
  const odabraniIdevi = new Set(vecOdabrane.map(v => v.exerciseLibraryId));
  let dostupne = kandidati.filter(k => !odabraniIdevi.has(k.id));
  
  if (dostupne.length === 0) return null;
  
  // Sortiraj po prioritetu (nekorištene prvo, preferirane kategorije)
  dostupne.sort((a, b) => {
    const prioritetA = getPrioritetVjezbe(a.id);
    const prioritetB = getPrioritetVjezbe(b.id);
    
    // Bonus za preferirane kategorije
    const katBonusA = fazaParams.preferiraneKategorije.includes(a.category) ? 10 : 0;
    const katBonusB = fazaParams.preferiraneKategorije.includes(b.category) ? 10 : 0;
    
    return (prioritetB + katBonusB) - (prioritetA + katBonusA);
  });
  
  // Odaberi s ponderiranom nasumičnošću (top 3 imaju najveću šansu)
  const topKandidati = dostupne.slice(0, Math.min(3, dostupne.length));
  const weights = topKandidati.map((_, i) => Math.pow(0.6, i)); // 60%, 36%, 22%...
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < topKandidati.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return topKandidati[i];
    }
  }
  
  return topKandidati[0] || dostupne[0];
}

/**
 * @deprecated Koristi odaberiVjezbuNapredni umjesto ove funkcije
 */
function odaberiVjezbu(kandidati: VjezbaProširena[], vecOdabrane: VjezbaSesije[]): VjezbaProširena | null {
  // Izbjegni duplikate
  const odabraniIdevi = new Set(vecOdabrane.map(v => v.exerciseLibraryId));
  const dostupne = kandidati.filter(k => !odabraniIdevi.has(k.id));
  
  if (dostupne.length === 0) return null;
  
  // Odaberi nasumično s težinom prema razini
  return dostupne[Math.floor(Math.random() * dostupne.length)];
}

function kreirajVjezbuSesije(
  vjezba: VjezbaProširena,
  redniBroj: number,
  ciljParam: typeof CILJ_PARAMETRI[keyof typeof CILJ_PARAMETRI],
  jeDeload: boolean,
  volumenMod: number,
  intenzitetMod: number,
): VjezbaSesije {
  // Izračunaj setove i ponavljanja
  const baseSetovi = Math.round((ciljParam.setovi.min + ciljParam.setovi.max) / 2);
  const setovi = jeDeload ? Math.max(2, Math.floor(baseSetovi * 0.5)) : Math.round(baseSetovi * volumenMod);
  
  const minReps = ciljParam.ponavljanja.min;
  const maxReps = ciljParam.ponavljanja.max;
  const ponavljanja = `${minReps}-${maxReps}`;
  
  // Izračunaj RIR/RPE ovisno o intenzitetu
  const baseRir = Math.round((ciljParam.rirRaspon.min + ciljParam.rirRaspon.max) / 2);
  const rir = jeDeload ? baseRir + 2 : baseRir;
  
  // Izračunaj odmor
  const odmor = Math.round((ciljParam.odmorSekunde.min + ciljParam.odmorSekunde.max) / 2);
  
  return {
    id: uuidv4(),
    sessionId: '', // Popunit će se kasnije
    redniBroj,
    exerciseLibraryId: vjezba.id,
    naziv: vjezba.naziv_hr,
    nazivEn: vjezba.name,
    setovi,
    ponavljanja,
    odmorSekunde: odmor,
    tempo: ciljParam.tempoPreporuka,
    rir: Math.min(5, Math.max(0, rir)),
    tipVjezbe: (vjezba.mechanic as 'compound' | 'isolation') || 'isolation',
    obrazacPokreta: vjezba.obrazac_pokreta,
    primarneGrupe: vjezba.primarne_grupe_hr,
    sekundarneGrupe: vjezba.sekundarne_grupe_hr,
    oprema: vjezba.oprema_hr,
    alternativneVjezbe: [],  // Popunit će se naknadno ako treba
    jeSuperser: false,
    trenerOverride: false,
  };
}

function kreirajZagrijavanje(tipTreninga: string): ZagrijavanjeBlok {
  const jeGornji = tipTreninga.includes('upper') || tipTreninga.includes('push') || 
                   tipTreninga.includes('prsa') || tipTreninga.includes('ledja') || 
                   tipTreninga.includes('ramena') || tipTreninga.includes('ruke');
  const jeDonji = tipTreninga.includes('lower') || tipTreninga.includes('legs') || 
                  tipTreninga.includes('noge');
  
  let specificneVjezbe: string[];
  if (jeGornji) {
    specificneVjezbe = ZAGRIJAVANJE_SABLONE.specificno.gornji_dio;
  } else if (jeDonji) {
    specificneVjezbe = ZAGRIJAVANJE_SABLONE.specificno.donji_dio;
  } else {
    specificneVjezbe = ZAGRIJAVANJE_SABLONE.specificno.full_body;
  }
  
  return {
    opceZagrijavanje: {
      tip: 'trcanje',
      trajanje: 5,
      intenzitet: 'lagan',
    },
    specificnoZagrijavanje: {
      vjezbe: specificneVjezbe,
      trajanje: 5,
    },
  };
}

function kreirajZavrsniDio(tipTreninga: string, misicneGrupe: string[]): ZavrsniBlok {
  return {
    core: misicneGrupe.includes('trbusnjaci') ? undefined : {
      vjezbe: [], // Dodaj core vježbe ako nisu u glavnom dijelu
      trajanje: 5,
    },
    istezanje: {
      vjezbe: ['static_stretch_major_muscles'],
      trajanje: 5,
    },
  };
}

function izracunajTrajanje(brojVjezbi: number, jeDeload: boolean): number {
  // Zagrijavanje: 10 min
  // Po vježbi: ~5-7 min
  // Završni dio: 5-10 min
  const baseMinuta = 10 + (brojVjezbi * 6) + 8;
  return jeDeload ? Math.round(baseMinuta * 0.7) : baseMinuta;
}

function izracunajUkupnoTreninga(program: TreningProgram): number {
  let ukupno = 0;
  for (const mezociklus of program.mezociklusi) {
    for (const tjedan of mezociklus.tjedni) {
      ukupno += tjedan.treninzi.length;
    }
  }
  return ukupno;
}

function validirajProgram(program: TreningProgram): ValidacijaRezultat {
  const greske: string[] = [];
  const upozorenja: string[] = [];
  
  // Provjeri ima li program vježbe
  let ukupnoVjezbi = 0;
  for (const mezociklus of program.mezociklusi) {
    for (const tjedan of mezociklus.tjedni) {
      for (const trening of tjedan.treninzi) {
        ukupnoVjezbi += trening.glavniDio.length;
        
        if (trening.glavniDio.length === 0) {
          greske.push(`Trening "${trening.naziv}" nema vježbi`);
        }
      }
    }
  }
  
  if (ukupnoVjezbi === 0) {
    greske.push('Program nema nijednu vježbu');
  }
  
  // Provjeri mezocikluse
  if (program.mezociklusi.length === 0) {
    greske.push('Program nema mezociklusa');
  }
  
  return {
    valjan: greske.length === 0,
    greske,
    upozorenja,
  };
}

// ============================================
// HYBRID GENERATOR - POPUNJAVANJE PRAZNINA
// ============================================

import { createServiceClient } from '@/lib/supabase';

export interface HybridGeneratorInput extends GeneratorInput {
  programId: string;  // ID postojećeg programa
  popuniSamo?: 'mezocikluse' | 'sesije' | 'vjezbe' | 'sve';
}

/**
 * Hybrid generator - popunjava prazne dijelove postojećeg programa
 * NIKAD ne prepisuje manual input
 */
export async function fillProgramGaps(input: HybridGeneratorInput): Promise<{
  success: boolean;
  dodanoMezociklusa: number;
  dodanoSesija: number;
  dodanoVjezbi: number;
  error?: string;
}> {
  const supabase = createServiceClient();
  ocistiLogove();
  resetVjezbaTracker(input.programId); // Reset tracker za hybrid generator
  log('info', 'Pokrećem hybrid generator', { programId: input.programId });
  
  let dodanoMezociklusa = 0;
  let dodanoSesija = 0;
  let dodanoVjezbi = 0;
  
  try {
    // 1. Dohvati postojeći program
    const { data: program, error: programError } = await supabase
      .from('training_programs')
      .select('*')
      .eq('id', input.programId)
      .single();
    
    if (programError || !program) {
      return { success: false, dodanoMezociklusa: 0, dodanoSesija: 0, dodanoVjezbi: 0, error: 'Program nije pronađen' };
    }
    
    // 2. Dohvati postojeće mezocikluse
    const { data: postojeciMezo } = await supabase
      .from('mesocycles')
      .select('*')
      .eq('program_id', input.programId)
      .order('order_index');
    
    const pokriveniTjedni = new Set<number>();
    for (const m of postojeciMezo || []) {
      for (let w = m.week_start; w <= m.week_end; w++) {
        pokriveniTjedni.add(w);
      }
    }
    
    // 3. Provjeri koji tjedni nedostaju
    const nedostajuTjedni: number[] = [];
    for (let w = 1; w <= program.duration_weeks; w++) {
      if (!pokriveniTjedni.has(w)) {
        nedostajuTjedni.push(w);
      }
    }
    
    log('info', `Pronađeno ${nedostajuTjedni.length} tjedana bez mezociklusa`);
    
    // 4. Generiraj mezocikluse za nepokrivene tjedne (ako treba)
    if (nedostajuTjedni.length > 0 && (input.popuniSamo === 'mezocikluse' || input.popuniSamo === 'sve' || !input.popuniSamo)) {
      // Grupiraj uzastopne tjedne
      const grupe = grupirajUzastopneTjedne(nedostajuTjedni);
      
      for (const grupa of grupe) {
        const weekStart = Math.min(...grupa);
        const weekEnd = Math.max(...grupa);
        const trajanje = weekEnd - weekStart + 1;
        
        // Odredi tip mezociklusa
        const tip = odrediTipMezociklusa(weekStart, program.duration_weeks);
        
        // Kreiraj mezociklus
        const nextOrder = (postojeciMezo?.length || 0) + dodanoMezociklusa + 1;
        
        // Osnovni podaci (bez is_manual koji možda ne postoji)
        const mezoData = {
          program_id: input.programId,
          name: generirajNazivMezociklusa(tip, nextOrder),
          order_index: nextOrder,
          week_start: weekStart,
          week_end: weekEnd,
          focus: tip,
          progression_type: 'linear',
          target_rpe_start: 6,
          target_rpe_end: 9,
        };
        
        // Migracija je napravljena - is_manual je dostupan
        const { error: insertError } = await supabase
          .from('mesocycles')
          .insert({ ...mezoData, is_manual: false });
        
        if (!insertError) {
          dodanoMezociklusa++;
          log('info', `Kreiran mezociklus za tjedne ${weekStart}-${weekEnd}`);
        } else {
          log('error', `Greška pri kreiranju mezociklusa: ${insertError.message}`);
        }
      }
    }
    
    // 5. Dohvati sve mezocikluse (uključujući nove)
    const { data: sviMezo } = await supabase
      .from('mesocycles')
      .select('*')
      .eq('program_id', input.programId)
      .order('week_start');
    
    // 6. Dohvati postojeće sesije
    const { data: postojeceSesije } = await supabase
      .from('program_sessions')
      .select('*')
      .eq('program_id', input.programId);
    
    const postojeceSesijeKey = new Set(
      (postojeceSesije || []).map(s => `${s.week_number}-${s.order_in_week}`)
    );
    
    // 7. Generiraj sesije za tjedne bez sesija (ako treba)
    if (input.popuniSamo === 'sesije' || input.popuniSamo === 'sve' || !input.popuniSamo) {
      for (const mezo of sviMezo || []) {
        for (let week = mezo.week_start; week <= mezo.week_end; week++) {
          // Provjeri koliko sesija treba za ovaj tjedan
          for (let order = 1; order <= program.sessions_per_week; order++) {
            const key = `${week}-${order}`;
            if (!postojeceSesijeKey.has(key)) {
              // Generiraj sesiju
              const splitConfig = SPLIT_KONFIGURACIJE[program.split_type as TipSplita] || SPLIT_KONFIGURACIJE.full_body;
              const daniStruktura = odrediDaneZaTrening(splitConfig, program.sessions_per_week);
              const tipTreninga = daniStruktura[order - 1] || 'full_body';
              
              // Osnovni podaci (bez is_manual koji možda ne postoji)
              const sessionData = {
                program_id: input.programId,
                mesocycle_id: mezo.id,
                week_number: week,
                day_of_week: odrediDanUTjednu(order - 1, program.sessions_per_week),
                order_in_week: order,
                session_type: 'strength',
                split_name: generirajNazivTreninga(tipTreninga, order),
                target_rpe: 7,
                estimated_duration_minutes: 60,
                estimated_total_sets: 0,
              };
              
              // Migracija je napravljena - is_manual je dostupan
              const { error: sessionError } = await supabase
                .from('program_sessions')
                .insert({ ...sessionData, is_manual: false });
              
              if (!sessionError) {
                dodanoSesija++;
              }
            }
          }
        }
      }
      log('info', `Dodano ${dodanoSesija} sesija`);
    }
    
    // 8. Generiraj vježbe za sesije bez vježbi (ako treba)
    if (input.popuniSamo === 'vjezbe' || input.popuniSamo === 'sve' || !input.popuniSamo) {
      // Dohvati sve sesije
      // Dohvati sve sesije (is_manual filter možda ne postoji)
      const { data: sveSesije } = await supabase
        .from('program_sessions')
        .select('id, split_name, session_type, mesocycle_id')
        .eq('program_id', input.programId);
      
      for (const sesija of sveSesije || []) {
        // Provjeri ima li sesija vježbe
        const { data: vjezbe } = await supabase
          .from('session_exercises')
          .select('id')
          .eq('session_id', sesija.id)
          .limit(1);
        
        if (!vjezbe || vjezbe.length === 0) {
          // Generiraj vježbe za ovu sesiju
          const splitConfig = SPLIT_KONFIGURACIJE[program.split_type as TipSplita] || SPLIT_KONFIGURACIJE.full_body;
          const tipTreninga = sesija.split_name || sesija.session_type || 'full_body';
          const misicneGrupe = splitConfig.misicneGrupePoTreningu[tipTreninga] || ['prsa', 'ledja'];
          
          // Odaberi vježbe koristeći postojeću logiku
          const vjezbeZaSesiju = await selectExercises({
            ...input,
            splitTip: program.split_type as TipSplita,
            tipTreninga,
            misicneGrupe,
            redniBrojTreninga: 1,
            mezociklusTip: 'akumulacija',
            brojTjedana: 4,
            pocetniVolumen: {},
            zavrsniVolumen: {},
            tjedanBroj: 1,
            jeDeload: false,
            volumenPoGrupi: {},
            volumenModifikator: 1.0,
            intenzitetModifikator: 1.0,
          });
          
          // Spremi vježbe
          for (let i = 0; i < vjezbeZaSesiju.length; i++) {
            const v = vjezbeZaSesiju[i];
            
            // Osnovni podaci (bez is_manual koji možda ne postoji)
            const exerciseData = {
              session_id: sesija.id,
              exercise_id: v.exerciseLibraryId,
              exercise_name: v.nazivEn || v.naziv,
              exercise_name_hr: v.naziv,
              order_index: i + 1,
              sets: v.setovi,
              reps_target: v.ponavljanja,
              tempo: v.tempo,
              rest_seconds: v.odmorSekunde,
              target_rpe: v.rpe,
              target_rir: v.rir,
              primary_muscles: v.primarneGrupe,
              secondary_muscles: v.sekundarneGrupe,
              equipment: v.oprema,
              mechanic: v.tipVjezbe,
            };
            
            // Migracija je napravljena - is_manual je dostupan
            const { error: exerciseError } = await supabase
              .from('session_exercises')
              .insert({ ...exerciseData, is_manual: false });
            
            if (!exerciseError) {
              dodanoVjezbi++;
            }
          }
        }
      }
      log('info', `Dodano ${dodanoVjezbi} vježbi`);
    }
    
    // 9. Ažuriraj source programa na hybrid ako je potrebno
    if (dodanoMezociklusa > 0 || dodanoSesija > 0 || dodanoVjezbi > 0) {
      const { data: manualCheck } = await supabase
        .from('mesocycles')
        .select('id')
        .eq('program_id', input.programId)
        .eq('is_manual', true)
        .limit(1);
      
      const hasManual = (manualCheck?.length || 0) > 0;
      
      await supabase
        .from('training_programs')
        .update({ source: hasManual ? 'hybrid' : 'auto' })
        .eq('id', input.programId);
    }
    
    return {
      success: true,
      dodanoMezociklusa,
      dodanoSesija,
      dodanoVjezbi,
    };
    
  } catch (error) {
    log('error', 'Greška u hybrid generatoru', { error: String(error) });
    return {
      success: false,
      dodanoMezociklusa,
      dodanoSesija,
      dodanoVjezbi,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    };
  }
}

/**
 * Grupira uzastopne tjedne u grupe
 */
function grupirajUzastopneTjedne(tjedni: number[]): number[][] {
  if (tjedni.length === 0) return [];
  
  const sorted = [...tjedni].sort((a, b) => a - b);
  const grupe: number[][] = [[sorted[0]]];
  
  for (let i = 1; i < sorted.length; i++) {
    const currentGroup = grupe[grupe.length - 1];
    const lastInGroup = currentGroup[currentGroup.length - 1];
    
    if (sorted[i] === lastInGroup + 1) {
      currentGroup.push(sorted[i]);
    } else {
      grupe.push([sorted[i]]);
    }
  }
  
  return grupe;
}

/**
 * Određuje tip mezociklusa na temelju pozicije u programu
 */
function odrediTipMezociklusa(weekStart: number, ukupnoTjedana: number): string {
  const postotak = weekStart / ukupnoTjedana;
  
  if (weekStart === ukupnoTjedana) return 'deload';
  if (postotak < 0.5) return 'volume';
  if (postotak < 0.8) return 'intensity';
  return 'peak';
}

// ============================================
// PLIOMETRIJA GENERIRANJE - IFT METODIKA
// ============================================

import type { PliometrijskaSesija, PliometrijskaVjezbaSesije, KardioSesija } from './types';

/**
 * Generira pliometrijsku sesiju za fazu SNAGA/POWER
 * Koristi se prije glavnog treninga snage
 */
export function generirajPliometrijskuSesiju(
  razina: 'pocetnik' | 'srednji' | 'napredni',
  weekId: string,
  danUTjednu: number,
): PliometrijskaSesija {
  const parametri = PLIOMETRIJA_PARAMETRI[razina];
  const dostupneVjezbe = getPliometrijskeVjezbeZaRazinu(razina);
  
  // Odaberi 3-4 vježbe ovisno o razini
  const brojVjezbi = razina === 'pocetnik' ? 3 : razina === 'srednji' ? 4 : 5;
  const odabraneVjezbe: PliometrijskaVjezbaSesije[] = [];
  
  let ukupniKontakti = 0;
  const maxKontakti = (parametri.ukupniKontakti.min + parametri.ukupniKontakti.max) / 2;
  
  // Miješaj vježbe i odaberi
  const shuffled = [...dostupneVjezbe].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(brojVjezbi, shuffled.length); i++) {
    const vjezba = shuffled[i];
    const serije = Math.round((parametri.serije.min + parametri.serije.max) / 2);
    const ponavljanja = Math.round((parametri.ponavljanja.min + parametri.ponavljanja.max) / 2);
    const odmor = Math.round((parametri.odmorSekunde.min + parametri.odmorSekunde.max) / 2);
    
    // Provjeri da ne prelazimo maksimum kontakata
    const kontaktiVjezbe = serije * ponavljanja;
    if (ukupniKontakti + kontaktiVjezbe > maxKontakti * 1.2) break;
    
    ukupniKontakti += kontaktiVjezbe;
    
    odabraneVjezbe.push({
      id: uuidv4(),
      vjezbaId: vjezba.id,
      naziv: vjezba.naziv,
      nazivHr: vjezba.nazivHr,
      serije,
      ponavljanja,
      odmorSekunde: odmor,
      tip: vjezba.tip,
      misicneGrupe: vjezba.misicneGrupe,
      napomene: vjezba.opis,
    });
  }
  
  return {
    id: uuidv4(),
    weekId,
    danUTjednu,
    naziv: `Pliometrija - ${razina}`,
    ukupniKontakti,
    vjezbe: odabraneVjezbe,
    razina,
    napomene: `Ukupno ${ukupniKontakti} kontakata. Odmor ${parametri.odmorSekunde.min}-${parametri.odmorSekunde.max} sec između serija.`,
  };
}

// ============================================
// KARDIO GENERIRANJE - IFT METODIKA
// ============================================

/**
 * Generira kardio sesiju prema IFT metodici
 */
export function generirajKardioSesiju(
  tip: 'kontinuirani' | 'intervalni' | 'hiit',
  weekId: string,
  danUTjednu: number,
  trajanje?: number,
): KardioSesija {
  if (tip === 'hiit') {
    // HIIT protokol iz IFT skripte
    const protokol = HIIT_PROTOKOL_IFT;
    return {
      id: uuidv4(),
      weekId,
      danUTjednu,
      naziv: protokol.naziv,
      tipKardio: 'hiit',
      trajanje: 25,  // približno trajanje
      intenzitetSF: { min: 80, max: 90 },
      tempo: protokol.tempo,
      intervalRada: protokol.struktura.intervalRada,
      intervalOdmora: protokol.struktura.intervalOdmora,
      brojIntervala: protokol.struktura.intervalaPoSeriji,
      brojSerija: protokol.struktura.serije,
      odmorIzmeduSerija: protokol.struktura.odmorIzmeduSerija,
      hiitVjezbe: protokol.primjerVjezbi,
      oprema: 'bez opreme',
      napomene: `${protokol.struktura.serije} serije x ${protokol.struktura.intervalaPoSeriji} intervala (${protokol.struktura.intervalRada}s rad / ${protokol.struktura.intervalOdmora}s odmor)`,
    };
  }
  
  // Kontinuirani ili intervalni
  const program = KARDIO_PROGRAMI.find(p => p.tip === tip);
  if (!program) {
    // Fallback na lagano trčanje
    return {
      id: uuidv4(),
      weekId,
      danUTjednu,
      naziv: 'Lagano trčanje',
      tipKardio: 'kontinuirani',
      trajanje: trajanje || 25,
      intenzitetSF: { min: 60, max: 70 },
      tempo: '10 km/h umjereni tempo',
      oprema: 'traka ili vanjski',
    };
  }
  
  return {
    id: uuidv4(),
    weekId,
    danUTjednu,
    naziv: program.naziv,
    tipKardio: program.tip,
    trajanje: trajanje || Math.round((program.trajanje.min + program.trajanje.max) / 2),
    intenzitetSF: program.intenzitetSF,
    tempo: program.tempo,
    intervalRada: program.intervalRada,
    intervalOdmora: program.intervalOdmora,
    brojIntervala: program.brojIntervala,
    napomene: program.opis,
  };
}

/**
 * Određuje treba li dodati pliometriju u trening na temelju cilja i faze
 */
export function trebaDodatiPliometriju(cilj: string, fazaMezociklusa: string): boolean {
  // Pliometrija se koristi u fazama snage/power
  const pliometrijskeFaze = ['snaga', 'jakost', 'realizacija', 'natjecanje', 'priprema'];
  const pliometrijskiCiljevi = ['snaga', 'jakost'];
  
  return pliometrijskeFaze.includes(fazaMezociklusa) || pliometrijskiCiljevi.includes(cilj);
}

/**
 * Određuje treba li dodati kardio na temelju cilja i tjednog plana
 */
export function trebaDodatiKardio(cilj: string, treninziTjedno: number): boolean {
  // Kardio se preporuča za izdržljivost i rekreaciju
  const kardioPreporukaZaCilj = ['izdrzljivost', 'rekreacija_zdravlje'].includes(cilj);
  
  // Također ako ima dovoljno dana odmora (manje od 5 treninga)
  const imaProstora = treninziTjedno <= 4;
  
  return kardioPreporukaZaCilj || imaProstora;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default buildProgram;

