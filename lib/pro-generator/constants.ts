/**
 * PRO Training Generator - Konstante
 * ===================================
 * IFT metodika konstante, parametri po cilju/razini
 * Hrvatski nazivi i prijevodi
 */

import type {
  CiljTreninga,
  RazinaKorisnika,
  TipSplita,
  CiljParametri,
  RazinaParametri,
  ObrazacPokreta,
} from './types';

// ============================================
// VERZIJA GENERATORA
// ============================================

export const GENERATOR_VERSION = '1.0.0';

// ============================================
// PARAMETRI PO CILJU TRENINGA
// ============================================

/**
 * IFT METODIKA - TABLICA 23: Komponente opterećenja prema usmjerenosti vježbanja
 * Izvor: M. Čakan, K. Marković, D. Perkov - Metodika fitnessa u teretani
 */
export const CILJ_PARAMETRI: Record<CiljTreninga, CiljParametri> = {
  // JAKOST - Maksimalna snaga (1RM fokus)
  // Tablica 23: 3-8 serija, 1-5 ponavljanja, 90-100% 1RM, 3-5 min odmor
  jakost: {
    setovi: { min: 3, max: 8 },
    ponavljanja: { min: 1, max: 5 },
    odmorSekunde: { min: 180, max: 300 },  // 3-5 minuta
    rirRaspon: { min: 0, max: 2 },
    intenzitetRaspon: { min: 90, max: 100 },  // 90-100% 1RM
    volumenPoGrupi: { min: 6, max: 12 },
    tempoPreporuka: '2/0/x/0',  // eksplozivna koncentrična faza (x)
  },
  
  // SNAGA - Power/Eksplozivnost
  // Tablica 23: 3-6 serija, 6-8 ponavljanja, 80-90% 1RM, 2-3 min odmor
  snaga: {
    setovi: { min: 3, max: 6 },
    ponavljanja: { min: 6, max: 8 },
    odmorSekunde: { min: 120, max: 180 },  // 2-3 minute
    rirRaspon: { min: 1, max: 3 },
    intenzitetRaspon: { min: 80, max: 90 },  // 80-90% 1RM
    volumenPoGrupi: { min: 8, max: 14 },
    tempoPreporuka: '2/0/x/0',  // eksplozivna koncentrična faza
  },
  
  // HIPERTROFIJA - Povećanje mišićne mase
  // Tablica 23: 3-5 serija, 8-12 ponavljanja, 65-80% 1RM, 60-90 sec odmor
  hipertrofija: {
    setovi: { min: 3, max: 5 },
    ponavljanja: { min: 8, max: 12 },
    odmorSekunde: { min: 60, max: 90 },  // 60-90 sekundi
    rirRaspon: { min: 1, max: 3 },
    intenzitetRaspon: { min: 65, max: 80 },  // 65-80% 1RM
    volumenPoGrupi: { min: 10, max: 20 },
    tempoPreporuka: '3/1/2/0',  // umjereno spori do spori tempo
  },
  
  // IZDRŽLJIVOST - Mišićna izdržljivost
  // Tablica 23: 2+ serija, 12+ ponavljanja, do 60% 1RM, 0-60 sec odmor
  izdrzljivost: {
    setovi: { min: 2, max: 4 },
    ponavljanja: { min: 12, max: 25 },
    odmorSekunde: { min: 0, max: 60 },  // 0-60 sekundi
    rirRaspon: { min: 2, max: 4 },
    intenzitetRaspon: { min: 40, max: 60 },  // do 60% 1RM
    volumenPoGrupi: { min: 8, max: 15 },
    tempoPreporuka: '2/0/2/0',  // umjereno brzi tempo
  },
  
  // REKREACIJA/ZDRAVLJE - Održavanje forme i prevencija
  rekreacija_zdravlje: {
    setovi: { min: 2, max: 3 },
    ponavljanja: { min: 10, max: 15 },
    odmorSekunde: { min: 60, max: 90 },
    rirRaspon: { min: 3, max: 5 },
    intenzitetRaspon: { min: 55, max: 70 },
    volumenPoGrupi: { min: 6, max: 12 },
    tempoPreporuka: '2/0/2/0',
  },
};

// ============================================
// PARAMETRI PO RAZINI KORISNIKA
// ============================================

export const RAZINA_PARAMETRI: Record<RazinaKorisnika, RazinaParametri> = {
  pocetnik: {
    maksBrojVjezbiPoTreningu: 6,
    maksBrojSetovaPoTreningu: 18,
    minOdmorIzmedjuSetova: 90,
    dozvoljeneTehnikeNapredne: false,
    preporuceniSplitovi: ['full_body'],
  },
  srednji: {
    maksBrojVjezbiPoTreningu: 8,
    maksBrojSetovaPoTreningu: 24,
    minOdmorIzmedjuSetova: 60,
    dozvoljeneTehnikeNapredne: false,
    preporuceniSplitovi: ['full_body', 'upper_lower', 'push_pull_legs'],
  },
  napredni: {
    maksBrojVjezbiPoTreningu: 10,
    maksBrojSetovaPoTreningu: 30,
    minOdmorIzmedjuSetova: 45,
    dozvoljeneTehnikeNapredne: true,
    preporuceniSplitovi: ['upper_lower', 'push_pull_legs', 'body_part_split'],
  },
};

// ============================================
// VOLUMEN PO MIŠIĆNOJ GRUPI (SETOVI TJEDNO)
// ============================================

/** Minimalni efektivni volumen (MEV) - minimum za napredak */
export const MEV_PO_GRUPI: Record<string, number> = {
  prsa: 8,
  ledja: 8,
  ramena: 6,
  biceps: 4,
  triceps: 4,
  cetveroglavi: 8,
  straznja_loza: 6,
  gluteusi: 6,
  listovi: 6,
  trbusnjaci: 4,
};

/** Maksimalni adaptivni volumen (MAV) - optimalni raspon */
export const MAV_PO_GRUPI: Record<string, { min: number; max: number }> = {
  prsa: { min: 12, max: 18 },
  ledja: { min: 12, max: 20 },
  ramena: { min: 10, max: 16 },
  biceps: { min: 8, max: 14 },
  triceps: { min: 8, max: 14 },
  cetveroglavi: { min: 12, max: 18 },
  straznja_loza: { min: 10, max: 16 },
  gluteusi: { min: 10, max: 16 },
  listovi: { min: 8, max: 14 },
  trbusnjaci: { min: 8, max: 14 },
};

/** Maksimalni oporavivi volumen (MRV) - gornja granica */
export const MRV_PO_GRUPI: Record<string, number> = {
  prsa: 22,
  ledja: 25,
  ramena: 20,
  biceps: 18,
  triceps: 18,
  cetveroglavi: 22,
  straznja_loza: 18,
  gluteusi: 20,
  listovi: 16,
  trbusnjaci: 18,
};

// ============================================
// SPLIT KONFIGURACIJE
// ============================================

export interface SplitKonfiguracija {
  naziv: string;
  opisHr: string;
  daniPoTjednu: number[];     // npr. [3, 4] = 3-4 dana
  daniStruktura: string[][];   // Raspodjela po danima
  misicneGrupePoTreningu: Record<string, string[]>;
}

export const SPLIT_KONFIGURACIJE: Record<TipSplita, SplitKonfiguracija> = {
  full_body: {
    naziv: 'Full Body',
    opisHr: 'Cijelo tijelo - svaki trening aktivira sve glavne mišićne grupe',
    daniPoTjednu: [2, 3, 4],
    daniStruktura: [
      ['full_body_a', 'full_body_b', 'full_body_c'],  // 3 dana
      ['full_body_a', 'full_body_b', 'full_body_a', 'full_body_b'],  // 4 dana
    ],
    misicneGrupePoTreningu: {
      full_body_a: ['prsa', 'ledja', 'ramena', 'cetveroglavi', 'straznja_loza', 'trbusnjaci'],
      full_body_b: ['prsa', 'ledja', 'ramena', 'gluteusi', 'listovi', 'trbusnjaci'],
      full_body_c: ['prsa', 'ledja', 'biceps', 'triceps', 'cetveroglavi', 'gluteusi'],
    },
  },
  upper_lower: {
    naziv: 'Upper/Lower',
    opisHr: 'Gornji/Donji dio tijela - alternacija između gornjeg i donjeg dijela',
    daniPoTjednu: [4, 5, 6],
    daniStruktura: [
      ['upper_a', 'lower_a', 'upper_b', 'lower_b'],  // 4 dana
      ['upper_a', 'lower_a', 'upper_b', 'lower_b', 'upper_c'],  // 5 dana
      ['upper_a', 'lower_a', 'upper_b', 'lower_b', 'upper_c', 'lower_c'],  // 6 dana
    ],
    misicneGrupePoTreningu: {
      upper_a: ['prsa', 'ledja', 'ramena', 'biceps', 'triceps'],
      upper_b: ['prsa', 'ledja', 'ramena', 'biceps', 'triceps'],
      upper_c: ['prsa', 'ledja', 'ramena', 'biceps', 'triceps'],
      lower_a: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi', 'trbusnjaci'],
      lower_b: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi', 'trbusnjaci'],
      lower_c: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi', 'trbusnjaci'],
    },
  },
  /**
   * GPN - Guranje/Povlačenje/Noge (IFT Tablica 25)
   * "3 dana GPN + kardio": Vježbe Guranja | Kardio | Vježbe Povlačenja | Odmor | Vježbe za noge
   */
  push_pull_legs: {
    naziv: 'GPN (Guranje/Povlačenje/Noge)',
    opisHr: 'IFT metoda - Guranje/Povlačenje/Noge s opcionalnim kardiom',
    daniPoTjednu: [3, 4, 5, 6],
    daniStruktura: [
      ['guranje', 'povlacenje', 'noge'],  // 3 dana
      ['guranje', 'povlacenje', 'noge', 'guranje'],  // 4 dana
      ['guranje', 'povlacenje', 'noge', 'guranje', 'povlacenje'],  // 5 dana
      ['guranje', 'povlacenje', 'noge', 'guranje', 'povlacenje', 'noge'],  // 6 dana
    ],
    misicneGrupePoTreningu: {
      guranje: ['prsa', 'ramena', 'triceps'],  // Vježbe guranja
      povlacenje: ['ledja', 'biceps', 'straznja_loza'],  // Vježbe povlačenja
      noge: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi', 'trbusnjaci'],  // Noge
    },
  },
  body_part_split: {
    naziv: 'Body Part Split',
    opisHr: 'Izolirani dijelovi - svaki dan fokus na jednu ili dvije mišićne grupe',
    daniPoTjednu: [5, 6],
    daniStruktura: [
      ['prsa_triceps', 'ledja_biceps', 'ramena', 'noge', 'arms'],  // 5 dana
      ['prsa', 'ledja', 'ramena', 'ruke', 'noge', 'weak_points'],  // 6 dana
    ],
    misicneGrupePoTreningu: {
      prsa: ['prsa'],
      prsa_triceps: ['prsa', 'triceps'],
      ledja: ['ledja'],
      ledja_biceps: ['ledja', 'biceps'],
      ramena: ['ramena'],
      ruke: ['biceps', 'triceps'],
      arms: ['biceps', 'triceps'],
      noge: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi'],
      weak_points: ['trbusnjaci', 'listovi'],  // Slabe točke
    },
  },
  // Custom split se kreira dinamički od strane trenera
  // Ne koristi statičku konfiguraciju
  custom: {
    naziv: 'Custom Split',
    opisHr: 'Prilagođeni split - trener kreira vlastiti raspored',
    daniPoTjednu: [2, 3, 4, 5, 6],
    daniStruktura: [], // Dinamički se kreira
    misicneGrupePoTreningu: {}, // Dinamički se kreira
  },
};

// ============================================
// CUSTOM SPLIT HELPER FUNKCIJE
// ============================================

/**
 * Konvertira CustomSplitKonfiguracija u SplitKonfiguracija format
 * za kompatibilnost s generatorom
 */
export function konvertirajCustomSplitUSplitKonfiguraciju(
  customSplit: import('./types').CustomSplitKonfiguracija
): SplitKonfiguracija {
  const daniStruktura: string[][] = [];
  const misicneGrupePoTreningu: Record<string, string[]> = {};
  
  // Kreiraj strukturu dana
  const daniNazivi: string[] = [];
  for (const dan of customSplit.dani) {
    const treningKey = `custom_day_${dan.redniBroj}`;
    daniNazivi.push(treningKey);
    misicneGrupePoTreningu[treningKey] = [
      ...dan.misicneGrupe,
      ...(dan.opcionalneGrupe || []),
    ];
  }
  
  // Dodaj strukturu za različite kombinacije (npr. ako ima 6 dana, može se koristiti 3, 4, 5 ili 6)
  for (let i = 2; i <= customSplit.ukupnoDana; i++) {
    if (i <= daniNazivi.length) {
      daniStruktura.push(daniNazivi.slice(0, i));
    }
  }
  
  return {
    naziv: customSplit.naziv,
    opisHr: customSplit.opis || `Prilagođeni split: ${customSplit.naziv}`,
    daniPoTjednu: Array.from({ length: customSplit.ukupnoDana - 1 }, (_, i) => i + 2),
    daniStruktura,
    misicneGrupePoTreningu,
  };
}

/**
 * Lista dostupnih mišićnih grupa za Custom Split Builder
 */
export const DOSTUPNE_MISICNE_GRUPE: Array<{ key: string; naziv: string; kategorija: string }> = [
  // Gornji dio
  { key: 'prsa', naziv: 'Prsa', kategorija: 'Gornji dio' },
  { key: 'ledja', naziv: 'Leđa', kategorija: 'Gornji dio' },
  { key: 'ramena', naziv: 'Ramena', kategorija: 'Gornji dio' },
  { key: 'biceps', naziv: 'Biceps', kategorija: 'Gornji dio' },
  { key: 'triceps', naziv: 'Triceps', kategorija: 'Gornji dio' },
  { key: 'trapezi', naziv: 'Trapezi', kategorija: 'Gornji dio' },
  { key: 'podlaktice', naziv: 'Podlaktice', kategorija: 'Gornji dio' },
  
  // Donji dio
  { key: 'cetveroglavi', naziv: 'Četveroglavi', kategorija: 'Donji dio' },
  { key: 'straznja_loza', naziv: 'Stražnja loža', kategorija: 'Donji dio' },
  { key: 'gluteusi', naziv: 'Gluteusi', kategorija: 'Donji dio' },
  { key: 'listovi', naziv: 'Listovi', kategorija: 'Donji dio' },
  
  // Core
  { key: 'trbusnjaci', naziv: 'Trbušnjaci', kategorija: 'Core' },
  
  // Ostalo
  { key: 'primicaci', naziv: 'Primicači (unutrašnji but)', kategorija: 'Ostalo' },
  { key: 'odmicaci', naziv: 'Odmicači (vanjski but)', kategorija: 'Ostalo' },
];

/**
 * Preporučeni split templatei za Custom Split Builder
 */
export const SPLIT_TEMPLATEI: Array<{
  naziv: string;
  opis: string;
  dani: Array<{ naziv: string; misicneGrupe: string[] }>;
}> = [
  {
    naziv: 'Arnold Split',
    opis: '6 dana - Prsa/Leđa, Ramena/Ruke, Noge (2x tjedno)',
    dani: [
      { naziv: 'Prsa + Leđa', misicneGrupe: ['prsa', 'ledja'] },
      { naziv: 'Ramena + Ruke', misicneGrupe: ['ramena', 'biceps', 'triceps'] },
      { naziv: 'Noge', misicneGrupe: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi'] },
      { naziv: 'Prsa + Leđa', misicneGrupe: ['prsa', 'ledja'] },
      { naziv: 'Ramena + Ruke', misicneGrupe: ['ramena', 'biceps', 'triceps'] },
      { naziv: 'Noge', misicneGrupe: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi'] },
    ],
  },
  {
    naziv: 'PHUL (Power/Hypertrophy Upper/Lower)',
    opis: '4 dana - Power Upper, Power Lower, Hypertrophy Upper, Hypertrophy Lower',
    dani: [
      { naziv: 'Power Upper', misicneGrupe: ['prsa', 'ledja', 'ramena', 'biceps', 'triceps'] },
      { naziv: 'Power Lower', misicneGrupe: ['cetveroglavi', 'straznja_loza', 'gluteusi'] },
      { naziv: 'Hypertrophy Upper', misicneGrupe: ['prsa', 'ledja', 'ramena', 'biceps', 'triceps'] },
      { naziv: 'Hypertrophy Lower', misicneGrupe: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi'] },
    ],
  },
  {
    naziv: 'Glutei Specializacija',
    opis: '5 dana - Fokus na gluteuse i donji dio tijela',
    dani: [
      { naziv: 'Glutei + Noge A', misicneGrupe: ['gluteusi', 'cetveroglavi', 'straznja_loza'] },
      { naziv: 'Gornji dio', misicneGrupe: ['prsa', 'ledja', 'ramena'] },
      { naziv: 'Glutei + Noge B', misicneGrupe: ['gluteusi', 'listovi', 'trbusnjaci'] },
      { naziv: 'Ruke + Core', misicneGrupe: ['biceps', 'triceps', 'trbusnjaci'] },
      { naziv: 'Full Body Glutei', misicneGrupe: ['gluteusi', 'cetveroglavi', 'straznja_loza', 'prsa', 'ledja'] },
    ],
  },
];

// ============================================
// MAPIRANJE OBRAZACA POKRETA
// ============================================

export const OBRAZAC_POKRETA_VJEZBE: Record<ObrazacPokreta, string[]> = {
  horizontal_push: ['bench_press', 'dumbbell_bench_press', 'push_up', 'chest_press'],
  horizontal_pull: ['barbell_row', 'dumbbell_row', 'cable_row', 'seated_row'],
  vertical_push: ['overhead_press', 'military_press', 'arnold_press', 'dumbbell_shoulder_press'],
  vertical_pull: ['pull_up', 'lat_pulldown', 'chin_up'],
  squat: ['squat', 'front_squat', 'goblet_squat', 'leg_press'],
  hinge: ['deadlift', 'romanian_deadlift', 'good_morning', 'hip_thrust'],
  lunge: ['lunge', 'bulgarian_split_squat', 'step_up', 'walking_lunge'],
  carry: ['farmer_walk', 'suitcase_carry'],
  rotation: ['russian_twist', 'cable_woodchop', 'pallof_press'],
  isolation: [],  // Sve ostale izolacijske vježbe
};

// ============================================
// MAPIRANJE MIŠIĆNIH GRUPA (EN -> HR)
// ============================================

export const MISICNA_GRUPA_PRIJEVOD: Record<string, string> = {
  // Engleski -> Hrvatski
  chest: 'prsa',
  back: 'ledja',
  shoulders: 'ramena',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'podlaktice',
  quadriceps: 'cetveroglavi',
  hamstrings: 'straznja_loza',
  glutes: 'gluteusi',
  calves: 'listovi',
  abdominals: 'trbusnjaci',
  traps: 'trapezi',
  lats: 'siroke_ledja',
  lower_back: 'donja_ledja',
  adductors: 'primicaci',
  abductors: 'odmicaci',
  middle_back: 'srednja_ledja',
  neck: 'vrat',
};

export const MISICNA_GRUPA_DISPLAY: Record<string, string> = {
  prsa: 'Prsa',
  ledja: 'Leđa',
  ramena: 'Ramena',
  biceps: 'Biceps',
  triceps: 'Triceps',
  podlaktice: 'Podlaktice',
  cetveroglavi: 'Četveroglavi',
  straznja_loza: 'Stražnja loža',
  gluteusi: 'Gluteusi',
  listovi: 'Listovi',
  trbusnjaci: 'Trbušnjaci',
  trapezi: 'Trapezi',
  siroke_ledja: 'Široke leđa',
  donja_ledja: 'Donja leđa',
};

// ============================================
// MAPIRANJE OPREME (EN -> HR)
// ============================================

export const OPREMA_PRIJEVOD: Record<string, string> = {
  'body only': 'tezina_tijela',
  'bodyweight': 'tezina_tijela',
  'barbell': 'sipka',
  'dumbbell': 'bucice',
  'kettlebells': 'girje',
  'cable': 'kabel',
  'machine': 'sprava',
  'bands': 'gume',
  'medicine ball': 'medicinka',
  'exercise ball': 'lopta',
  'foam roll': 'valjak',
  'e-z curl bar': 'ez_sipka',
  'other': 'ostalo',
  'none': 'bez_opreme',
};

export const OPREMA_DISPLAY: Record<string, string> = {
  tezina_tijela: 'Težina tijela',
  sipka: 'Olimpijska šipka',
  bucice: 'Bučice',
  girje: 'Girje (kettlebell)',
  kabel: 'Kabel sprava',
  sprava: 'Sprava',
  gume: 'Elastične gume',
  medicinka: 'Medicinska lopta',
  lopta: 'Lopta za vježbanje',
  valjak: 'Foam roller',
  ez_sipka: 'EZ šipka',
  ostalo: 'Ostala oprema',
  bez_opreme: 'Bez opreme',
};

// ============================================
// TEMPO NOTACIJA - IFT METODIKA
// ============================================

/**
 * Tempo izvedbe vježbe: ekscentrična/pauza dolje/koncentrična/pauza gore
 * Primjer: 3/1/2/0 = 3 sec spuštanje, 1 sec pauza, 2 sec dizanje, 0 pauza gore
 * X = eksplozivno (maksimalna brzina)
 * 
 * IFT preporuke po cilju:
 * - Jakost: 2/0/x/0 ili 1/0/x/0 (eksplozivna koncentrična faza)
 * - Snaga: 2/0/x/0 (eksplozivna koncentrična faza)
 * - Hipertrofija: 3/1/2/0 ili 2/1/2/0 ili 4/0/2/0 (umjereno spori do spori)
 * - Izdržljivost: 2/0/2/0 ili 2/0/1/0 (umjereno brzi)
 */
export const TEMPO_PO_CILJU: Record<string, string[]> = {
  jakost: ['2/0/x/0', '1/0/x/0'],
  snaga: ['2/0/x/0'],
  hipertrofija: ['3/1/2/0', '2/1/2/0', '4/0/2/0'],
  izdrzljivost: ['2/0/2/0', '2/0/1/0'],
  rekreacija_zdravlje: ['2/0/2/0'],
};

// ============================================
// KARDIORESPIRATORNI TRENING - IFT METODIKA
// ============================================

/**
 * Programiranje kardiorespiratornog vježbanja u fitnesu
 * Izvor: IFT skripta - poglavlje 14.6
 */
export interface KardioProgram {
  tip: 'kontinuirani' | 'intervalni' | 'hiit';
  naziv: string;
  opis: string;
  trajanje: { min: number; max: number };  // minuta
  intenzitetSF: { min: number; max: number };  // % maksimalne srčane frekvencije
  tempo?: string;
  intervalRada?: number;  // sekundi
  intervalOdmora?: number;  // sekundi
  brojIntervala?: number;
}

export const KARDIO_PROGRAMI: KardioProgram[] = [
  // Kontinuirana metoda
  {
    tip: 'kontinuirani',
    naziv: 'Lagano trčanje',
    opis: 'Kontinuirano trčanje umjerenim tempom',
    trajanje: { min: 20, max: 40 },
    intenzitetSF: { min: 60, max: 70 },
    tempo: '10 km/h umjereni tempo',
  },
  {
    tip: 'kontinuirani',
    naziv: 'Vožnja bicikla',
    opis: 'Kontinuirana vožnja sobnog bicikla',
    trajanje: { min: 20, max: 45 },
    intenzitetSF: { min: 60, max: 75 },
  },
  {
    tip: 'kontinuirani',
    naziv: 'Veslački ergometar',
    opis: 'Kontinuirano veslanje na ergometru',
    trajanje: { min: 15, max: 30 },
    intenzitetSF: { min: 65, max: 75 },
  },
  {
    tip: 'kontinuirani',
    naziv: 'Eliptični trenažer',
    opis: 'Rad na eliptičnom trenažeru',
    trajanje: { min: 20, max: 40 },
    intenzitetSF: { min: 60, max: 75 },
  },
  
  // Intervalna metoda
  {
    tip: 'intervalni',
    naziv: 'Intervalno trčanje',
    opis: '5 dionica po 1 minutu brzog trčanja s odmorom',
    trajanje: { min: 15, max: 25 },
    intenzitetSF: { min: 80, max: 90 },
    tempo: '15-18 km/h brzi',
    intervalRada: 60,
    intervalOdmora: 90,
    brojIntervala: 5,
  },
  {
    tip: 'intervalni',
    naziv: 'Intervalni bicikl',
    opis: 'Sprint intervali na biciklu',
    trajanje: { min: 15, max: 25 },
    intenzitetSF: { min: 80, max: 90 },
    intervalRada: 30,
    intervalOdmora: 60,
    brojIntervala: 8,
  },
  
  // HIIT - Visoko intenzivni intervalni trening
  {
    tip: 'hiit',
    naziv: 'HIIT s vlastitim tijelom',
    opis: '3 serije po 8 intervala vježbi - 40 sec rad, 20 sec odmor',
    trajanje: { min: 20, max: 30 },
    intenzitetSF: { min: 80, max: 90 },
    tempo: 'Maksimalno brzi tempo izvođenja',
    intervalRada: 40,
    intervalOdmora: 20,
    brojIntervala: 8,  // po seriji
  },
];

/**
 * HIIT vježbe s vlastitim tijelom za kardio blok
 */
export const HIIT_VJEZBE = [
  'burpees',
  'mountain_climbers',
  'jump_squats',
  'high_knees',
  'jumping_jacks',
  'plank_jacks',
  'squat_thrusts',
  'skater_jumps',
  'tuck_jumps',
  'box_jumps',
  'jump_lunges',
  'star_jumps',
];

// ============================================
// PLIOMETRIJA - IFT METODIKA
// ============================================

/**
 * Pliometrijske vježbe za razvoj eksplozivne snage
 * Koriste se u fazi SNAGA/POWER
 * 
 * Karakteristike:
 * - Kratki kontakti s podlogom
 * - Eksplozivna koncentrična faza
 * - Puni odmor između serija (2-3 min)
 * - 3-6 serija, 5-10 ponavljanja
 */
export interface PliometrijskaVjezba {
  id: string;
  naziv: string;
  nazivHr: string;
  razina: 'pocetnik' | 'srednji' | 'napredni';
  misicneGrupe: string[];
  tip: 'skok' | 'bacanje' | 'odraz' | 'reaktivna';
  opis: string;
}

export const PLIOMETRIJSKE_VJEZBE: PliometrijskaVjezba[] = [
  // Skokovi - donji dio tijela
  { id: 'box_jump', naziv: 'Box Jump', nazivHr: 'Skok na kutiju', razina: 'srednji', misicneGrupe: ['cetveroglavi', 'gluteusi', 'listovi'], tip: 'skok', opis: 'Eksplozivni skok na povišenu platformu' },
  { id: 'depth_jump', naziv: 'Depth Jump', nazivHr: 'Skok u dubinu', razina: 'napredni', misicneGrupe: ['cetveroglavi', 'gluteusi', 'listovi'], tip: 'reaktivna', opis: 'Pad s kutije i eksplozivni odskok' },
  { id: 'broad_jump', naziv: 'Broad Jump', nazivHr: 'Skok u dalj', razina: 'srednji', misicneGrupe: ['cetveroglavi', 'gluteusi'], tip: 'skok', opis: 'Horizontalni skok s mjesta' },
  { id: 'jump_squat', naziv: 'Jump Squat', nazivHr: 'Čučanj sa skokom', razina: 'pocetnik', misicneGrupe: ['cetveroglavi', 'gluteusi'], tip: 'skok', opis: 'Čučanj s eksplozivnim skokom' },
  { id: 'tuck_jump', naziv: 'Tuck Jump', nazivHr: 'Skok s podizanjem koljena', razina: 'srednji', misicneGrupe: ['cetveroglavi', 'trbusnjaci'], tip: 'skok', opis: 'Skok s privlačenjem koljena prema prsima' },
  { id: 'split_jump', naziv: 'Split Jump', nazivHr: 'Iskorak sa skokom', razina: 'srednji', misicneGrupe: ['cetveroglavi', 'gluteusi'], tip: 'skok', opis: 'Izmjenični iskoraci sa skokom' },
  { id: 'single_leg_hop', naziv: 'Single Leg Hop', nazivHr: 'Jednonožni skok', razina: 'napredni', misicneGrupe: ['cetveroglavi', 'gluteusi', 'listovi'], tip: 'skok', opis: 'Skokovi na jednoj nozi' },
  { id: 'lateral_bound', naziv: 'Lateral Bound', nazivHr: 'Bočni odskok', razina: 'srednji', misicneGrupe: ['gluteusi', 'primicaci', 'odmicaci'], tip: 'odraz', opis: 'Bočni skokovi s noge na nogu' },
  
  // Bacanja - gornji dio tijela  
  { id: 'medicine_ball_chest_pass', naziv: 'Medicine Ball Chest Pass', nazivHr: 'Dodavanje medicinke od prsa', razina: 'pocetnik', misicneGrupe: ['prsa', 'ramena', 'triceps'], tip: 'bacanje', opis: 'Eksplozivno dodavanje medicinke od prsa' },
  { id: 'medicine_ball_slam', naziv: 'Medicine Ball Slam', nazivHr: 'Udarac medicinkom o pod', razina: 'pocetnik', misicneGrupe: ['trbusnjaci', 'ledja', 'ramena'], tip: 'bacanje', opis: 'Podizanje i snažno bacanje medicinke o pod' },
  { id: 'medicine_ball_rotational_throw', naziv: 'Rotational Throw', nazivHr: 'Rotacijsko bacanje', razina: 'srednji', misicneGrupe: ['trbusnjaci', 'kosi_trbusni'], tip: 'bacanje', opis: 'Rotacijsko bacanje medicinke u zid' },
  { id: 'overhead_throw', naziv: 'Overhead Throw', nazivHr: 'Bacanje iznad glave', razina: 'srednji', misicneGrupe: ['ramena', 'triceps', 'trbusnjaci'], tip: 'bacanje', opis: 'Bacanje medicinke iznad glave unatrag' },
  
  // Odrazi - reaktivna snaga
  { id: 'ankle_hops', naziv: 'Ankle Hops', nazivHr: 'Skočni odrazi', razina: 'pocetnik', misicneGrupe: ['listovi'], tip: 'reaktivna', opis: 'Brzi odrazi sa skočnim zglobom' },
  { id: 'hurdle_hops', naziv: 'Hurdle Hops', nazivHr: 'Preskakanje prepreka', razina: 'srednji', misicneGrupe: ['cetveroglavi', 'gluteusi', 'listovi'], tip: 'reaktivna', opis: 'Kontinuirani skokovi preko prepreka' },
  { id: 'drop_push_up', naziv: 'Drop Push-Up', nazivHr: 'Pliometrijski sklekovi', razina: 'napredni', misicneGrupe: ['prsa', 'triceps', 'ramena'], tip: 'reaktivna', opis: 'Sklekovi s eksplozivnim odrazom od poda' },
  { id: 'clap_push_up', naziv: 'Clap Push-Up', nazivHr: 'Sklekovi s pljeskom', razina: 'napredni', misicneGrupe: ['prsa', 'triceps'], tip: 'reaktivna', opis: 'Eksplozivni sklekovi s pljeskom' },
];

/**
 * Parametri pliometrijskog treninga prema IFT metodici
 */
export const PLIOMETRIJA_PARAMETRI = {
  pocetnik: {
    serije: { min: 2, max: 3 },
    ponavljanja: { min: 5, max: 8 },
    odmorSekunde: { min: 90, max: 120 },
    ukupniKontakti: { min: 40, max: 60 },  // po treningu
    dozvoljeneVjezbe: ['jump_squat', 'medicine_ball_chest_pass', 'medicine_ball_slam', 'ankle_hops'],
  },
  srednji: {
    serije: { min: 3, max: 4 },
    ponavljanja: { min: 6, max: 10 },
    odmorSekunde: { min: 120, max: 180 },
    ukupniKontakti: { min: 60, max: 100 },
    dozvoljeneVjezbe: ['box_jump', 'broad_jump', 'tuck_jump', 'split_jump', 'lateral_bound', 'medicine_ball_rotational_throw', 'hurdle_hops'],
  },
  napredni: {
    serije: { min: 4, max: 6 },
    ponavljanja: { min: 5, max: 10 },
    odmorSekunde: { min: 150, max: 180 },
    ukupniKontakti: { min: 80, max: 140 },
    dozvoljeneVjezbe: ['depth_jump', 'single_leg_hop', 'drop_push_up', 'clap_push_up'],
  },
};

// ============================================
// KARDIO SADRŽAJI - IFT METODIKA
// ============================================

/**
 * Kardiorespiratorni sadržaji iz IFT skripte
 */
export const KARDIO_SADRZAJI = {
  // Strojevi/oprema
  trcanje: {
    naziv: 'Trčanje',
    opis: 'Na traci ili vanjski teren',
    kontinuirano: { tempo: '10 km/h', intenzitetSF: { min: 60, max: 70 } },
    intervalno: { tempo: '15-18 km/h', intenzitetSF: { min: 80, max: 90 } },
  },
  bicikl: {
    naziv: 'Vožnja bicikla',
    opis: 'Sobni bicikl ili spinning',
    kontinuirano: { tempo: 'umjereni otpor', intenzitetSF: { min: 60, max: 70 } },
    intervalno: { tempo: 'visoki otpor', intenzitetSF: { min: 80, max: 90 } },
  },
  veslo: {
    naziv: 'Veslački ergometar',
    opis: 'Rowing machine',
    kontinuirano: { tempo: '20-24 zaveslaja/min', intenzitetSF: { min: 60, max: 75 } },
    intervalno: { tempo: '26-30 zaveslaja/min', intenzitetSF: { min: 80, max: 90 } },
  },
  elipticni: {
    naziv: 'Eliptični trenažer',
    opis: 'Cross trainer',
    kontinuirano: { tempo: 'umjereni otpor', intenzitetSF: { min: 60, max: 70 } },
    intervalno: { tempo: 'visoki otpor', intenzitetSF: { min: 80, max: 85 } },
  },
  steper: {
    naziv: 'Steper',
    opis: 'Step machine',
    kontinuirano: { tempo: 'umjereni tempo', intenzitetSF: { min: 60, max: 70 } },
    intervalno: { tempo: 'brzi tempo', intenzitetSF: { min: 75, max: 85 } },
  },
  
  // Vježbe s vlastitim tijelom
  vlastito_tijelo: {
    naziv: 'Vježbe s vlastitim tijelom',
    opis: 'Bodyweight cardio circuit',
    vjezbe: [
      'jumping_jacks', 'burpees', 'mountain_climbers', 'high_knees',
      'butt_kicks', 'squat_jumps', 'star_jumps', 'skater_hops',
    ],
  },
  
  // Grupni oblici
  grupni: {
    naziv: 'Grupni oblici vježbanja',
    opis: 'Aerobik, dance fitness, spinning grupni',
    primjeri: ['aerobik', 'zumba', 'spinning', 'body pump', 'kickbox aerobik'],
  },
};

/**
 * Metode kardiorespiratornog treninga
 */
export const KARDIO_METODE = {
  kontinuirana: {
    naziv: 'Kontinuirana metoda',
    opis: 'Jednoliko opterećenje kroz duže vrijeme',
    trajanje: { min: 20, max: 60 },
    intenzitetSF: { min: 60, max: 75 },
    primjer: 'Lagano trčanje 25 minuta na 60-70% max SF',
  },
  intervalna: {
    naziv: 'Intervalna metoda',
    opis: 'Izmjena rada i odmora',
    trajanje: { min: 15, max: 30 },
    intenzitetSF: { min: 80, max: 90 },
    primjer: '5 dionica x 1 min brzo trčanje, 90 sec odmor',
  },
  hiit: {
    naziv: 'HIIT',
    opis: 'Visoko intenzivni intervalni trening',
    trajanje: { min: 15, max: 25 },
    intenzitetSF: { min: 80, max: 95 },
    primjer: '3 serije x 8 intervala (40s rad / 20s odmor), 2 min odmor između serija',
  },
  fartlek: {
    naziv: 'Fartlek',
    opis: 'Igra brzinama - nestrukturirana promjena tempa',
    trajanje: { min: 20, max: 40 },
    intenzitetSF: { min: 60, max: 85 },
    primjer: 'Trčanje s naizmjeničnim ubrzanjima i usporavanjima',
  },
};

/**
 * Primjer HIIT protokola iz IFT skripte
 */
export const HIIT_PROTOKOL_IFT = {
  naziv: 'HIIT s vlastitim tijelom',
  struktura: {
    serije: 3,
    intervalaPoSeriji: 8,
    intervalRada: 40,  // sekundi
    intervalOdmora: 20,  // sekundi
    odmorIzmeduSerija: 120,  // sekundi (2 minute)
  },
  intenzitet: '80-90% max SF',
  tempo: 'Maksimalno brzi tempo izvođenja vježbi',
  primjerVjezbi: [
    'Burpees',
    'Mountain Climbers',
    'Jump Squats',
    'High Knees',
    'Plank Jacks',
    'Skater Jumps',
    'Tuck Jumps',
    'Star Jumps',
  ],
};

// ============================================
// ZAGRIJAVANJE ŠABLONE
// ============================================

export const ZAGRIJAVANJE_SABLONE = {
  opce: {
    trcanje: { naziv: 'Lagano trčanje', trajanje: 5, intenzitet: 'lagan' },
    bicikl: { naziv: 'Sobni bicikl', trajanje: 5, intenzitet: 'lagan' },
    veslo: { naziv: 'Veslo (rower)', trajanje: 5, intenzitet: 'umjeren' },
    skipping: { naziv: 'Skipping/Preskakanje', trajanje: 3, intenzitet: 'umjeren' },
  },
  specificno: {
    gornji_dio: [
      'arm_circles',
      'shoulder_rotations',
      'band_pull_apart',
      'light_push_ups',
    ],
    donji_dio: [
      'hip_circles',
      'leg_swings',
      'bodyweight_squats',
      'glute_bridges',
    ],
    full_body: [
      'jumping_jacks',
      'arm_circles',
      'hip_circles',
      'bodyweight_squats',
      'light_lunges',
    ],
  },
};

// ============================================
// MEZOCIKLUS KONFIGURACIJE
// ============================================

export interface MezociklusKonfiguracija {
  tip: string;
  trajanjeTjedana: { min: number; max: number };
  volumenModifikator: number;         // Množitelj volumena
  intenzitetRaspon: { min: number; max: number };
  fokus: string;
}

export const MEZOCIKLUS_TIPOVI: MezociklusKonfiguracija[] = [
  // Klasična periodizacija
  {
    tip: 'akumulacija',
    trajanjeTjedana: { min: 3, max: 6 },
    volumenModifikator: 1.0,
    intenzitetRaspon: { min: 65, max: 75 },
    fokus: 'Povećanje volumena, izgradnja kapaciteta',
  },
  {
    tip: 'intenzifikacija',
    trajanjeTjedana: { min: 2, max: 4 },
    volumenModifikator: 0.85,
    intenzitetRaspon: { min: 75, max: 90 },
    fokus: 'Povećanje intenziteta, smanjenje volumena',
  },
  {
    tip: 'realizacija',
    trajanjeTjedana: { min: 1, max: 2 },
    volumenModifikator: 0.7,
    intenzitetRaspon: { min: 90, max: 100 },
    fokus: 'Peak performance, testiranje maksimuma',
  },
  {
    tip: 'deload',
    trajanjeTjedana: { min: 1, max: 1 },
    volumenModifikator: 0.5,
    intenzitetRaspon: { min: 50, max: 65 },
    fokus: 'Oporavak, smanjeni volumen i intenzitet',
  },
  // IFT specifične faze
  {
    tip: 'hipertrofija',
    trajanjeTjedana: { min: 4, max: 8 },
    volumenModifikator: 1.0,
    intenzitetRaspon: { min: 65, max: 80 },
    fokus: 'Povećanje mišićne mase, 8-12 ponavljanja',
  },
  {
    tip: 'jakost',
    trajanjeTjedana: { min: 3, max: 6 },
    volumenModifikator: 0.75,
    intenzitetRaspon: { min: 85, max: 100 },
    fokus: 'Maksimalna snaga, 1-5 ponavljanja, duži odmori',
  },
  {
    tip: 'snaga',
    trajanjeTjedana: { min: 3, max: 5 },
    volumenModifikator: 0.7,
    intenzitetRaspon: { min: 75, max: 90 },
    fokus: 'Power/eksplozivnost, 3-6 rep eksplozivno',
  },
  {
    tip: 'izdrzljivost',
    trajanjeTjedana: { min: 3, max: 6 },
    volumenModifikator: 1.1,
    intenzitetRaspon: { min: 50, max: 65 },
    fokus: 'Mišićna izdržljivost, 15-25 ponavljanja, kraći odmori',
  },
  {
    tip: 'priprema',
    trajanjeTjedana: { min: 2, max: 4 },
    volumenModifikator: 0.8,
    intenzitetRaspon: { min: 70, max: 85 },
    fokus: 'Priprema za natjecanje, specifični pokreti',
  },
  {
    tip: 'tranzicija',
    trajanjeTjedana: { min: 1, max: 3 },
    volumenModifikator: 0.4,
    intenzitetRaspon: { min: 40, max: 60 },
    fokus: 'Aktivni odmor, oporavak između sezona',
  },
  {
    tip: 'natjecanje',
    trajanjeTjedana: { min: 1, max: 2 },
    volumenModifikator: 0.5,
    intenzitetRaspon: { min: 95, max: 105 },
    fokus: 'Natjecateljska faza, održavanje forme',
  },
];

// ============================================
// IFT FAZE - BOJE I PRIKAZ
// ============================================

export interface FazaDisplay {
  tip: string;
  naziv: string;
  nazivKratki: string;
  boja: string;
  ikona: string;
  opis: string;
}

/**
 * IFT faze - crno-bijeli prikaz za UI
 */
export const FAZE_DISPLAY: FazaDisplay[] = [
  { tip: 'hipertrofija', naziv: 'Hipertrofija', nazivKratki: 'HIP', boja: '#FFFFFF', ikona: 'H', opis: 'Povećanje mišićne mase (8-12 rep)' },
  { tip: 'jakost', naziv: 'Jakost', nazivKratki: 'JAK', boja: '#A1A1AA', ikona: 'J', opis: 'Maksimalna snaga (1-5 rep)' },
  { tip: 'snaga', naziv: 'Snaga/Power', nazivKratki: 'PWR', boja: '#D4D4D8', ikona: 'P', opis: 'Eksplozivnost (6-8 rep)' },
  { tip: 'izdrzljivost', naziv: 'Izdržljivost', nazivKratki: 'IZD', boja: '#71717A', ikona: 'I', opis: 'Mišićna izdržljivost (12+ rep)' },
  { tip: 'akumulacija', naziv: 'Akumulacija', nazivKratki: 'AKU', boja: '#FFFFFF', ikona: 'A', opis: 'Izgradnja volumena' },
  { tip: 'intenzifikacija', naziv: 'Intenzifikacija', nazivKratki: 'INT', boja: '#D4D4D8', ikona: 'N', opis: 'Povećanje intenziteta' },
  { tip: 'realizacija', naziv: 'Realizacija', nazivKratki: 'REA', boja: '#A1A1AA', ikona: 'R', opis: 'Peak performance' },
  { tip: 'deload', naziv: 'Deload', nazivKratki: 'DEL', boja: '#52525B', ikona: 'D', opis: 'Oporavak' },
  { tip: 'priprema', naziv: 'Priprema', nazivKratki: 'PRI', boja: '#71717A', ikona: 'PR', opis: 'Priprema za natjecanje' },
  { tip: 'tranzicija', naziv: 'Tranzicija', nazivKratki: 'TRA', boja: '#3F3F46', ikona: 'T', opis: 'Aktivni odmor' },
  { tip: 'natjecanje', naziv: 'Natjecanje', nazivKratki: 'NAT', boja: '#FFFFFF', ikona: 'N', opis: 'Natjecateljska faza' },
];

export function getFazaDisplay(tip: string): FazaDisplay {
  return FAZE_DISPLAY.find(f => f.tip === tip) || FAZE_DISPLAY[0];
}

// ============================================
// TJEDNI PLANOVI - IFT TABLICA 25
// ============================================

/**
 * Primjeri tjednog plana vježbanja (IFT Tablica 25)
 * Uključuje kombinaciju treninga s utezima i kardiorespiratornog vježbanja
 */
export interface TjedniPlan {
  naziv: string;
  opis: string;
  frekvencija: number;  // dana tjedno
  struktura: {
    dan: number;
    tip: 'snaga' | 'kardio' | 'odmor';
    naziv: string;
  }[];
  preporucenZa: string[];  // ciljevi
}

export const TJEDNI_PLANOVI: TjedniPlan[] = [
  // Plan 1: 2 dana vježbanja + kardio
  {
    naziv: '2 dana + kardio',
    opis: 'Idealno za početnike - 2 treninga cijelog tijela + 1 kardio',
    frekvencija: 3,
    struktura: [
      { dan: 1, tip: 'snaga', naziv: 'Cijelo tijelo A' },
      { dan: 2, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 3, tip: 'snaga', naziv: 'Cijelo tijelo B' },
      { dan: 4, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 5, tip: 'kardio', naziv: 'Kardio vježbanje' },
      { dan: 6, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 7, tip: 'odmor', naziv: 'Dan odmora' },
    ],
    preporucenZa: ['rekreacija_zdravlje', 'izdrzljivost'],
  },
  
  // Plan 2: 3 dana GPN + kardio
  {
    naziv: 'GPN + kardio',
    opis: 'Guranje/Povlačenje/Noge s dodatnim kardiom',
    frekvencija: 4,
    struktura: [
      { dan: 1, tip: 'snaga', naziv: 'Vježbe Guranja' },
      { dan: 2, tip: 'kardio', naziv: 'Kardio vježbanje' },
      { dan: 3, tip: 'snaga', naziv: 'Vježbe Povlačenja' },
      { dan: 4, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 5, tip: 'snaga', naziv: 'Vježbe za noge' },
      { dan: 6, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 7, tip: 'odmor', naziv: 'Dan odmora' },
    ],
    preporucenZa: ['hipertrofija', 'snaga'],
  },
  
  // Plan 3: 4 dana Upper/Lower + kardio za izdržljivost
  {
    naziv: 'Upper/Lower + kardio',
    opis: 'Gornji/Donji dio tijela za izdržljivost s dodatnim kardiom',
    frekvencija: 5,
    struktura: [
      { dan: 1, tip: 'snaga', naziv: 'Donji dio tijela A' },
      { dan: 2, tip: 'snaga', naziv: 'Gornji dio tijela A' },
      { dan: 3, tip: 'kardio', naziv: 'Kardio vježbanje' },
      { dan: 4, tip: 'snaga', naziv: 'Donji dio tijela B' },
      { dan: 5, tip: 'snaga', naziv: 'Gornji dio tijela B' },
      { dan: 6, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 7, tip: 'odmor', naziv: 'Dan odmora' },
    ],
    preporucenZa: ['izdrzljivost', 'hipertrofija'],
  },
  
  // Plan 4: 5 dana intenzivni
  {
    naziv: 'Intenzivni 5 dana',
    opis: 'Za napredne - 5 dana treninga s utezima',
    frekvencija: 5,
    struktura: [
      { dan: 1, tip: 'snaga', naziv: 'Guranje (prsa, ramena, triceps)' },
      { dan: 2, tip: 'snaga', naziv: 'Povlačenje (leđa, biceps)' },
      { dan: 3, tip: 'snaga', naziv: 'Noge' },
      { dan: 4, tip: 'snaga', naziv: 'Guranje B' },
      { dan: 5, tip: 'snaga', naziv: 'Povlačenje B' },
      { dan: 6, tip: 'odmor', naziv: 'Dan odmora' },
      { dan: 7, tip: 'odmor', naziv: 'Dan odmora' },
    ],
    preporucenZa: ['jakost', 'hipertrofija'],
  },
  
  // Plan 5: 6 dana PPL x2
  {
    naziv: 'PPL x2',
    opis: 'Push/Pull/Legs dva puta tjedno - maksimalna frekvencija',
    frekvencija: 6,
    struktura: [
      { dan: 1, tip: 'snaga', naziv: 'Guranje A' },
      { dan: 2, tip: 'snaga', naziv: 'Povlačenje A' },
      { dan: 3, tip: 'snaga', naziv: 'Noge A' },
      { dan: 4, tip: 'snaga', naziv: 'Guranje B' },
      { dan: 5, tip: 'snaga', naziv: 'Povlačenje B' },
      { dan: 6, tip: 'snaga', naziv: 'Noge B' },
      { dan: 7, tip: 'odmor', naziv: 'Dan odmora' },
    ],
    preporucenZa: ['hipertrofija', 'jakost'],
  },
];

// ============================================
// PRIMJERI PROGRAMA - IFT TABLICA 24
// ============================================

/**
 * Primjer programiranja sata vježbanja u fazi hipertrofije
 * Izvor: IFT Tablica 24 - Donji dio tijela za početnike
 */
export const PRIMJER_HIPERTROFIJA_NOGE = [
  { vjezba: 'Goblet čučanj', serije: 4, ponavljanja: '8-10', intenzitet: 75, tempo: '3/1/2/0', odmor: 90 },
  { vjezba: 'Hip thrust', serije: 4, ponavljanja: '8-10', intenzitet: 75, tempo: '2/1/2/2', odmor: 90 },
  { vjezba: 'Rumunjsko mrtvo dizanje', serije: 3, ponavljanja: '10-12', intenzitet: 70, tempo: '2/1/2/0', odmor: 75 },
  { vjezba: 'Iskorak u stranu', serije: 3, ponavljanja: '10-12', intenzitet: 70, tempo: '2/1/2/0', odmor: 75 },
  { vjezba: 'Nožna ekstenzija', serije: 3, ponavljanja: '12-15', intenzitet: 60, tempo: '2/1/2/0', odmor: 60 },
  { vjezba: 'Nožna fleksija', serije: 3, ponavljanja: '12-15', intenzitet: 60, tempo: '2/1/2/0', odmor: 60 },
];

// ============================================
// PROGRESIJA MODELI
// ============================================

export const PROGRESIJA_MODELI = {
  linearna: {
    naziv: 'Linearna progresija',
    opis: 'Postupno povećanje volumena/intenziteta svaki tjedan',
    modifikatori: [1.0, 1.05, 1.10, 1.15],  // Po tjednu
  },
  valna: {
    naziv: 'Valna progresija',
    opis: 'Varijacija u volumenu/intenzitetu kroz tjedne',
    modifikatori: [1.0, 1.10, 0.95, 1.15],  // Po tjednu
  },
  dvostruka: {
    naziv: 'Dvostruka progresija',
    opis: 'Prvo ponavljanja, zatim opterećenje',
    ponavljanjaProgresija: [8, 10, 12, 8],  // Reset i povećaj težinu
    opterecenjeProgresija: [1.0, 1.0, 1.0, 1.05],
  },
};

// ============================================
// EXPORT
// ============================================

// ============================================
// HELPER FUNKCIJE ZA PLIOMETRIJU
// ============================================

/**
 * Dohvaća pliometrijske vježbe prema razini korisnika
 */
export function getPliometrijskeVjezbeZaRazinu(razina: 'pocetnik' | 'srednji' | 'napredni'): PliometrijskaVjezba[] {
  const parametri = PLIOMETRIJA_PARAMETRI[razina];
  const dozvoljeneId = parametri.dozvoljeneVjezbe;
  
  // Uključi vježbe dozvoljene za razinu i sve niže razine
  const sveDozvoljenjeId = new Set<string>();
  
  if (razina === 'napredni') {
    PLIOMETRIJA_PARAMETRI.pocetnik.dozvoljeneVjezbe.forEach(id => sveDozvoljenjeId.add(id));
    PLIOMETRIJA_PARAMETRI.srednji.dozvoljeneVjezbe.forEach(id => sveDozvoljenjeId.add(id));
    PLIOMETRIJA_PARAMETRI.napredni.dozvoljeneVjezbe.forEach(id => sveDozvoljenjeId.add(id));
  } else if (razina === 'srednji') {
    PLIOMETRIJA_PARAMETRI.pocetnik.dozvoljeneVjezbe.forEach(id => sveDozvoljenjeId.add(id));
    PLIOMETRIJA_PARAMETRI.srednji.dozvoljeneVjezbe.forEach(id => sveDozvoljenjeId.add(id));
  } else {
    PLIOMETRIJA_PARAMETRI.pocetnik.dozvoljeneVjezbe.forEach(id => sveDozvoljenjeId.add(id));
  }
  
  return PLIOMETRIJSKE_VJEZBE.filter(v => sveDozvoljenjeId.has(v.id));
}

/**
 * Dohvaća kardio program prema tipu i trajanju
 */
export function getKardioProgram(tip: 'kontinuirani' | 'intervalni' | 'hiit', trajanje?: number): KardioProgram | undefined {
  const programi = KARDIO_PROGRAMI.filter(p => p.tip === tip);
  if (trajanje) {
    return programi.find(p => trajanje >= p.trajanje.min && trajanje <= p.trajanje.max);
  }
  return programi[0];
}

export default {
  GENERATOR_VERSION,
  CILJ_PARAMETRI,
  RAZINA_PARAMETRI,
  MEV_PO_GRUPI,
  MAV_PO_GRUPI,
  MRV_PO_GRUPI,
  SPLIT_KONFIGURACIJE,
  MISICNA_GRUPA_PRIJEVOD,
  MISICNA_GRUPA_DISPLAY,
  OPREMA_PRIJEVOD,
  OPREMA_DISPLAY,
  ZAGRIJAVANJE_SABLONE,
  MEZOCIKLUS_TIPOVI,
  PROGRESIJA_MODELI,
  // IFT dodaci
  TEMPO_PO_CILJU,
  KARDIO_PROGRAMI,
  HIIT_VJEZBE,
  TJEDNI_PLANOVI,
  PRIMJER_HIPERTROFIJA_NOGE,
  FAZE_DISPLAY,
  getFazaDisplay,
  // Pliometrija
  PLIOMETRIJSKE_VJEZBE,
  PLIOMETRIJA_PARAMETRI,
  getPliometrijskeVjezbeZaRazinu,
  // Kardio
  KARDIO_SADRZAJI,
  KARDIO_METODE,
  HIIT_PROTOKOL_IFT,
  getKardioProgram,
};

