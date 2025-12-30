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
} from './types';
import {
  GENERATOR_VERSION,
  CILJ_PARAMETRI,
  RAZINA_PARAMETRI,
  SPLIT_KONFIGURACIJE,
  MEV_PO_GRUPI,
  MAV_PO_GRUPI,
  ZAGRIJAVANJE_SABLONE,
  MEZOCIKLUS_TIPOVI,
  PROGRESIJA_MODELI,
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
  
  // Provjeri kompatibilnost split/treninzi
  if (input.splitTip) {
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
  log('info', 'Početak generiranja programa', { input });
  
  // 1. Validiraj input
  const validacija = validirajInput(input);
  if (!validacija.valjan) {
    log('error', 'Validacija nije prošla', { greske: validacija.greske });
    throw new Error(`Validacija nije prošla: ${validacija.greske.join(', ')}`);
  }
  
  // 2. Odredi split ako nije zadan
  const splitTip = input.splitTip || odaberiOptimalniSplit(input);
  log('info', `Odabrani split: ${splitTip}`);
  
  // 3. Generiraj mezocikluse
  const mezociklusi = await buildMesocycles({
    ...input,
    splitTip,
  });
  
  // 4. Kreiraj program objekt
  const programId = uuidv4();
  const splitConfig = SPLIT_KONFIGURACIJE[splitTip];
  
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
  const { brojTjedana, mezociklusTip, pocetniVolumen, zavrsniVolumen } = input;
  const tjedni: Tjedan[] = [];
  
  // Odredi je li zadnji tjedan deload (ako nije već deload mezociklus)
  const zadnjiJeDeload = mezociklusTip !== 'deload' && brojTjedana >= 4;
  
  for (let i = 1; i <= brojTjedana; i++) {
    const jeDeload = zadnjiJeDeload && i === brojTjedana;
    
    // Izračunaj modifikatore za ovaj tjedan (linearna progresija)
    const progresija = (i - 1) / Math.max(1, brojTjedana - 1);
    const volumenMod = jeDeload ? 0.6 : 1.0 + (progresija * 0.1);
    const intenzitetMod = jeDeload ? 0.7 : 1.0 + (progresija * 0.05);
    
    // Interpoliraj volumen za ovaj tjedan
    const volumenOvogTjedna: Record<string, number> = {};
    for (const grupa of Object.keys(pocetniVolumen)) {
      const pocetni = pocetniVolumen[grupa];
      const zavrsni = zavrsniVolumen[grupa];
      volumenOvogTjedna[grupa] = Math.round(pocetni + (zavrsni - pocetni) * progresija);
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
    
    const tjedan: Tjedan = {
      id: uuidv4(),
      mezociklusId: '', // Popunit će se kasnije
      tjedanBroj: i,
      jeDeload,
      volumenModifikator: Math.round(volumenMod * 100) / 100,
      intenzitetModifikator: Math.round(intenzitetMod * 100) / 100,
      napomene: jeDeload ? 'Deload tjedan - smanjen volumen i intenzitet za oporavak' : undefined,
      treninzi,
    };
    
    tjedni.push(tjedan);
  }
  
  log('debug', `Kreirano ${tjedni.length} tjedana za mezociklus`);
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
  const { treninziTjedno, splitTip, jeDeload } = input;
  const splitConfig = SPLIT_KONFIGURACIJE[splitTip];
  const treninzi: TrenigSesija[] = [];
  
  // Dohvati strukturu dana za ovaj split
  const daniStruktura = odrediDaneZaTrening(splitConfig, treninziTjedno);
  
  for (let i = 0; i < treninziTjedno; i++) {
    const tipTreninga = daniStruktura[i] || 'full_body';
    const danUTjednu = odrediDanUTjednu(i, treninziTjedno);
    
    // Dohvati mišićne grupe za ovaj tip treninga
    const misicneGrupe = splitConfig.misicneGrupePoTreningu[tipTreninga] || [];
    
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
      naziv: generirajNazivTreninga(tipTreninga, i + 1),
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
// SELECT EXERCISES
// ============================================

interface SelectExercisesInput extends BuildSessionsInput {
  tipTreninga: string;
  misicneGrupe: string[];
  redniBrojTreninga: number;
}

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
  } = input;
  
  const razinaParam = RAZINA_PARAMETRI[razina];
  const ciljParam = CILJ_PARAMETRI[cilj];
  const vjezbe: VjezbaSesije[] = [];
  
  // Mapiranje razine na library level
  const libraryLevel = mapRazinuNaLevel(razina);
  
  // Broj vježbi po mišićnoj grupi (prilagođen za deload)
  const vjezbiPoGrupi = jeDeload ? 1 : Math.ceil(razinaParam.maksBrojVjezbiPoTreningu / misicneGrupe.length);
  
  let redniBroj = 1;
  
  for (const grupa of misicneGrupe) {
    // Dohvati vježbe za ovu grupu
    const kandidati = await dohvatiVjezbeZaGrupu(grupa, {
      oprema: dostupnaOprema,
      razina: libraryLevel,
      maksVjezbi: 10,
      prioritetCompound: true,
    });
    
    // Filtriraj izbjegavane vježbe
    const filtrirani = izbjegavajVjezbe 
      ? kandidati.filter(v => !izbjegavajVjezbe.includes(v.id))
      : kandidati;
    
    // Odaberi vježbe (compound prvo, zatim isolation)
    const compoundVjezbe = filtrirani.filter(v => v.mechanic === 'compound');
    const isolationVjezbe = filtrirani.filter(v => v.mechanic === 'isolation');
    
    // Odaberi compound vježbu (ako postoji)
    if (compoundVjezbe.length > 0 && redniBroj <= razinaParam.maksBrojVjezbiPoTreningu) {
      const odabranaVjezba = odaberiVjezbu(compoundVjezbe, vjezbe);
      if (odabranaVjezba) {
        vjezbe.push(kreirajVjezbuSesije(
          odabranaVjezba, 
          redniBroj++, 
          ciljParam,
          jeDeload,
          volumenModifikator,
          intenzitetModifikator,
        ));
      }
    }
    
    // Dodaj isolation vježbe ako ima mjesta
    const preostaloMjesta = Math.min(vjezbiPoGrupi - 1, razinaParam.maksBrojVjezbiPoTreningu - vjezbe.length);
    for (let i = 0; i < preostaloMjesta && i < isolationVjezbe.length; i++) {
      const odabranaVjezba = odaberiVjezbu(isolationVjezbe.slice(i), vjezbe);
      if (odabranaVjezba) {
        vjezbe.push(kreirajVjezbuSesije(
          odabranaVjezba,
          redniBroj++,
          ciljParam,
          jeDeload,
          volumenModifikator,
          intenzitetModifikator,
        ));
      }
    }
  }
  
  // Sortiraj: compound vježbe prvo
  vjezbe.sort((a, b) => {
    if (a.tipVjezbe === 'compound' && b.tipVjezbe !== 'compound') return -1;
    if (a.tipVjezbe !== 'compound' && b.tipVjezbe === 'compound') return 1;
    return a.redniBroj - b.redniBroj;
  });
  
  // Ponovno dodijeli redne brojeve
  vjezbe.forEach((v, i) => { v.redniBroj = i + 1; });
  
  log('debug', `Odabrano ${vjezbe.length} vježbi za trening`);
  return vjezbe;
}

// ============================================
// HELPER FUNKCIJE
// ============================================

function generirajNazivPrograma(cilj: string, split: TipSplita, razina: string): string {
  const ciljNazivi: Record<string, string> = {
    hipertrofija: 'Hipertrofija',
    maksimalna_snaga: 'Maksimalna snaga',
    misicna_izdrzljivost: 'Mišićna izdržljivost',
    rekreacija_zdravlje: 'Rekreacija',
  };
  const splitNazivi = SPLIT_KONFIGURACIJE[split].naziv;
  return `${ciljNazivi[cilj]} - ${splitNazivi}`;
}

function generirajOpisPrograma(input: GeneratorInput, splitConfig: typeof SPLIT_KONFIGURACIJE[TipSplita]): string {
  return `Program za ${input.cilj.replace('_', ' ')} prilagođen ${input.razina} razini. ` +
         `Trajanje: ${input.trajanjeTjedana} tjedana, ${input.treninziTjedno} treninga tjedno. ` +
         `${splitConfig.opisHr}`;
}

function generirajNazivMezociklusa(tip: string, redniBroj: number): string {
  const tipNazivi: Record<string, string> = {
    akumulacija: 'Faza akumulacije',
    intenzifikacija: 'Faza intenzifikacije',
    realizacija: 'Faza realizacije',
    deload: 'Deload faza',
  };
  return `${tipNazivi[tip] || tip} #${redniBroj}`;
}

function generirajNazivTreninga(tipTreninga: string, redniBroj: number): string {
  const tipNazivi: Record<string, string> = {
    full_body_a: 'Full Body A',
    full_body_b: 'Full Body B',
    full_body_c: 'Full Body C',
    upper_a: 'Gornji dio A',
    upper_b: 'Gornji dio B',
    upper_c: 'Gornji dio C',
    lower_a: 'Donji dio A',
    lower_b: 'Donji dio B',
    lower_c: 'Donji dio C',
    push: 'Push dan',
    pull: 'Pull dan',
    legs: 'Legs dan',
    prsa: 'Prsa',
    prsa_triceps: 'Prsa + Triceps',
    ledja: 'Leđa',
    ledja_biceps: 'Leđa + Biceps',
    ramena: 'Ramena',
    ruke: 'Ruke',
    arms: 'Ruke',
    noge: 'Noge',
    weak_points: 'Slabe točke',
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
  const ciljParam = CILJ_PARAMETRI[cilj as keyof typeof CILJ_PARAMETRI];
  const mezociklusConfig = MEZOCIKLUS_TIPOVI.find(m => m.tip === tipMezociklusa)!;
  
  const pocetni: Record<string, number> = {};
  const zavrsni: Record<string, number> = {};
  
  for (const [grupa, mav] of Object.entries(MAV_PO_GRUPI)) {
    // Prilagodi volumen ovisno o razini
    const razinaMultiplier = razina === 'pocetnik' ? 0.7 : razina === 'srednji' ? 0.85 : 1.0;
    
    // Pocetni volumen = donja granica MAV * modifikator mezociklusa
    pocetni[grupa] = Math.round(mav.min * razinaMultiplier * mezociklusConfig.volumenModifikator);
    
    // Zavrsni volumen = gornja granica MAV * modifikator mezociklusa (s progresijom)
    zavrsni[grupa] = Math.round(mav.max * razinaMultiplier * mezociklusConfig.volumenModifikator * 0.9);
  }
  
  return { pocetni, zavrsni };
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
// DEFAULT EXPORT
// ============================================

export default buildProgram;

