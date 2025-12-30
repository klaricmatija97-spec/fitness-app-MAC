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

export const CILJ_PARAMETRI: Record<CiljTreninga, CiljParametri> = {
  hipertrofija: {
    setovi: { min: 3, max: 4 },
    ponavljanja: { min: 8, max: 12 },
    odmorSekunde: { min: 60, max: 120 },
    rirRaspon: { min: 1, max: 3 },
    intenzitetRaspon: { min: 65, max: 80 },
    volumenPoGrupi: { min: 10, max: 20 },  // setovi tjedno
    tempoPreporuka: '3-0-2-0',
  },
  maksimalna_snaga: {
    setovi: { min: 4, max: 6 },
    ponavljanja: { min: 1, max: 5 },
    odmorSekunde: { min: 180, max: 300 },
    rirRaspon: { min: 0, max: 2 },
    intenzitetRaspon: { min: 85, max: 100 },
    volumenPoGrupi: { min: 6, max: 12 },
    tempoPreporuka: '2-1-X-0',  // X = eksplozivno
  },
  misicna_izdrzljivost: {
    setovi: { min: 2, max: 3 },
    ponavljanja: { min: 15, max: 25 },
    odmorSekunde: { min: 30, max: 60 },
    rirRaspon: { min: 2, max: 4 },
    intenzitetRaspon: { min: 50, max: 65 },
    volumenPoGrupi: { min: 8, max: 15 },
    tempoPreporuka: '2-0-2-0',
  },
  rekreacija_zdravlje: {
    setovi: { min: 2, max: 3 },
    ponavljanja: { min: 10, max: 15 },
    odmorSekunde: { min: 60, max: 90 },
    rirRaspon: { min: 3, max: 5 },
    intenzitetRaspon: { min: 55, max: 70 },
    volumenPoGrupi: { min: 6, max: 12 },
    tempoPreporuka: '2-0-2-0',
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
  push_pull_legs: {
    naziv: 'Push/Pull/Legs',
    opisHr: 'Guranje/Povlačenje/Noge - klasična PPL rotacija',
    daniPoTjednu: [3, 4, 5, 6],
    daniStruktura: [
      ['push', 'pull', 'legs'],  // 3 dana
      ['push', 'pull', 'legs', 'push'],  // 4 dana
      ['push', 'pull', 'legs', 'push', 'pull'],  // 5 dana
      ['push', 'pull', 'legs', 'push', 'pull', 'legs'],  // 6 dana
    ],
    misicneGrupePoTreningu: {
      push: ['prsa', 'ramena', 'triceps'],
      pull: ['ledja', 'biceps', 'straznja_loza'],
      legs: ['cetveroglavi', 'straznja_loza', 'gluteusi', 'listovi', 'trbusnjaci'],
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
};

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

export const FAZE_DISPLAY: FazaDisplay[] = [
  { tip: 'hipertrofija', naziv: 'Hipertrofija', nazivKratki: 'HIP', boja: '#8B5CF6', ikona: '💪', opis: 'Povećanje mišićne mase' },
  { tip: 'jakost', naziv: 'Jakost', nazivKratki: 'JAK', boja: '#EF4444', ikona: '🏋️', opis: 'Maksimalna snaga' },
  { tip: 'snaga', naziv: 'Snaga/Power', nazivKratki: 'PWR', boja: '#F97316', ikona: '⚡', opis: 'Eksplozivnost' },
  { tip: 'izdrzljivost', naziv: 'Izdržljivost', nazivKratki: 'IZD', boja: '#22C55E', ikona: '🔄', opis: 'Mišićna izdržljivost' },
  { tip: 'akumulacija', naziv: 'Akumulacija', nazivKratki: 'AKU', boja: '#3B82F6', ikona: '📈', opis: 'Izgradnja volumena' },
  { tip: 'intenzifikacija', naziv: 'Intenzifikacija', nazivKratki: 'INT', boja: '#FBBF24', ikona: '🔥', opis: 'Povećanje intenziteta' },
  { tip: 'realizacija', naziv: 'Realizacija', nazivKratki: 'REA', boja: '#EC4899', ikona: '🎯', opis: 'Peak performance' },
  { tip: 'deload', naziv: 'Deload', nazivKratki: 'DEL', boja: '#6B7280', ikona: '😴', opis: 'Oporavak' },
  { tip: 'priprema', naziv: 'Priprema', nazivKratki: 'PRI', boja: '#14B8A6', ikona: '🎪', opis: 'Priprema za natjecanje' },
  { tip: 'tranzicija', naziv: 'Tranzicija', nazivKratki: 'TRA', boja: '#94A3B8', ikona: '🌊', opis: 'Aktivni odmor' },
  { tip: 'natjecanje', naziv: 'Natjecanje', nazivKratki: 'NAT', boja: '#FFD700', ikona: '🏆', opis: 'Natjecateljska faza' },
];

export function getFazaDisplay(tip: string): FazaDisplay {
  return FAZE_DISPLAY.find(f => f.tip === tip) || FAZE_DISPLAY[0];
}

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
};

