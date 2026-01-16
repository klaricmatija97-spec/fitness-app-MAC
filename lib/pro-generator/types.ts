/**
 * PRO Training Generator - Tipovi
 * ================================
 * Svi TypeScript tipovi za PRO generator treninga
 * Usklađeno sa Supabase shemom (supabase-pro-training-schema.sql)
 */

// ============================================
// ENUMI I OSNOVNI TIPOVI
// ============================================

/** 
 * Cilj treninga - IFT Metodika (Tablica 23)
 * Izvor: M. Čakan, K. Marković, D. Perkov - Metodika fitnessa u teretani
 */
export type CiljTreninga = 
  | 'jakost'                 // Maksimalna snaga (1-5 rep, 90-100% 1RM, 3-5 min odmor)
  | 'snaga'                  // Power/Eksplozivnost (6-8 rep, 80-90% 1RM, 2-3 min odmor)
  | 'hipertrofija'           // Povećanje mišićne mase (8-12 rep, 65-80% 1RM, 60-90 sec odmor)
  | 'izdrzljivost'           // Mišićna izdržljivost (12+ rep, do 60% 1RM, 0-60 sec odmor)
  | 'rekreacija_zdravlje'    // Održavanje forme i prevencija
  // API aliasi (za kompatibilnost s frontendovim)
  | 'maksimalna_snaga'       // Alias za 'jakost'
  | 'misicna_izdrzljivost';  // Alias za 'izdrzljivost'

/** Razina korisnika */
export type RazinaKorisnika = 
  | 'pocetnik'   // < 1 godina treninga
  | 'srednji'    // 1-3 godine
  | 'napredni';  // 3+ godina

/** Tip splita */
export type TipSplita = 
  | 'full_body'         // Cijelo tijelo svaki trening
  | 'upper_lower'       // Gore/Dolje alternacija
  | 'push_pull_legs'    // Push/Pull/Legs rotacija
  | 'body_part_split'   // Izolirani dijelovi (samo napredni)
  | 'custom';           // Prilagođeni split (trener kreira)

/**
 * Custom Split - Trener kreira vlastiti split
 * Omogućava potpunu fleksibilnost u rasporedu mišićnih grupa po danima
 */
export interface CustomSplitKonfiguracija {
  naziv: string;                    // npr. "Arnold Style", "Glutei Focus"
  opis?: string;                    // Opcionalni opis
  dani: CustomSplitDan[];           // Lista dana u split-u
  ukupnoDana: number;               // Ukupan broj dana (npr. 6)
}

export interface CustomSplitDan {
  redniBroj: number;                // 1, 2, 3...
  naziv: string;                    // npr. "Prsa + Leđa", "Noge A"
  misicneGrupe: string[];           // ['prsa', 'ledja', 'triceps']
  opcionalneGrupe?: string[];       // ['trbusnjaci'] - dodatne grupe
}

/** Status programa */
export type StatusPrograma = 'draft' | 'aktivan' | 'pauziran' | 'zavrsen';

/** Tip sesije - snaga ili kardio */
export type TipSesije = 'snaga' | 'kardio' | 'kombinirana';

/** Tip kardio treninga */
export type TipKardioTreninga = 'kontinuirani' | 'intervalni' | 'hiit';

/** Tip mezociklusa - IFT faze */
export type TipMezociklusa = 
  | 'akumulacija'      // Visok volumen, umjeren intenzitet
  | 'intenzifikacija'  // Niži volumen, visok intenzitet
  | 'realizacija'      // Peak performance
  | 'deload'           // Oporavak
  // IFT specifične faze
  | 'hipertrofija'     // Fokus na mišićnu masu (8-12 rep)
  | 'jakost'           // Maksimalna snaga (1-5 rep)
  | 'snaga'            // Power/eksplozivnost (3-6 rep eksplozivno)
  | 'izdrzljivost'     // Mišićna izdržljivost (15-25 rep)
  | 'priprema'         // Priprema za natjecanje
  | 'tranzicija'       // Aktivni odmor između sezona
  | 'natjecanje';      // Natjecateljska faza

/** Tip progresije */
export type TipProgresije = 'linearna' | 'valna' | 'dvostruka';

/** Mišićna grupa */
export type MisicnaGrupa = 
  | 'chest' | 'prsa'
  | 'back' | 'ledja'
  | 'shoulders' | 'ramena'
  | 'biceps' | 'triceps'
  | 'forearms' | 'podlaktice'
  | 'quadriceps' | 'cetveroglavi'
  | 'hamstrings' | 'straznja_loza'
  | 'glutes' | 'gluteusi'
  | 'calves' | 'listovi'
  | 'abdominals' | 'trbusnjaci'
  | 'traps' | 'trapezi'
  | 'lats' | 'siroke_misice_ledja'
  | 'lower_back' | 'donja_ledja'
  | 'adductors' | 'primicaci'
  | 'abductors' | 'odmicaci';

/** Obrazac pokreta */
export type ObrazacPokreta = 
  | 'horizontal_push'   // Bench press, push-up
  | 'horizontal_pull'   // Row varijante
  | 'vertical_push'     // OHP, ramena
  | 'vertical_pull'     // Pull-up, lat pulldown
  | 'squat'             // Čučanj varijante
  | 'hinge'             // Deadlift, RDL
  | 'lunge'             // Iskorak varijante
  | 'carry'             // Farmer walk
  | 'rotation'          // Core rotacije
  | 'isolation';        // Izolacijske vježbe

/** Tip opreme */
export type TipOpreme = 
  | 'body only' | 'tezina_tijela'
  | 'barbell' | 'sipka'
  | 'dumbbell' | 'bucice'
  | 'kettlebells' | 'girje'
  | 'cable' | 'kabel'
  | 'machine' | 'sprava'
  | 'bands' | 'gume'
  | 'medicine ball' | 'medicinka'
  | 'exercise ball' | 'lopta'
  | 'foam roll' | 'valjak'
  | 'ez_curl_bar'
  | 'other' | 'ostalo';

// ============================================
// VJEŽBA IZ LIBRARY-JA
// ============================================

/** Vježba iz exercise library-ja (wrkout-database.json) */
export interface VjezbaLibrary {
  id: string;
  name: string;
  force: 'push' | 'pull' | 'static' | null;
  level: 'beginner' | 'intermediate' | 'expert';
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: 'strength' | 'stretching' | 'plyometrics' | 'strongman' | 'powerlifting' | 'cardio' | 'olympic_weightlifting';
}

/** Proširena vježba s HR prijevodima i IFT parametrima */
export interface VjezbaProširena extends VjezbaLibrary {
  naziv_hr: string;
  oprema_hr: string;
  primarne_grupe_hr: string[];
  sekundarne_grupe_hr: string[];
  obrazac_pokreta: ObrazacPokreta;
  preporuceni_rep_range: string;
  preporuceni_setovi_tjedno: { min: number; max: number };
}

// ============================================
// INPUT ZA GENERATOR
// ============================================

/** Ulazni parametri za generiranje programa */
export interface GeneratorInput {
  // Obavezni parametri
  clientId: string;
  cilj: CiljTreninga;
  razina: RazinaKorisnika;
  treninziTjedno: number;      // 2-6
  trajanjeTjedana: number;     // 4-12
  gender: 'male' | 'female';   // Spol klijenta - bitno za odabir vježbi i programiranje
  
  // Opcionalni parametri
  trenerId?: string;
  splitTip?: TipSplita;        // Ako nije zadan, automatski se odabire
  customSplit?: CustomSplitKonfiguracija; // Za custom split tip
  dostupnaOprema?: string[];   // Filtriranje vježbi po opremi
  izbjegavajVjezbe?: string[]; // ID-evi vježbi koje treba izbjeći
  fokusiraneGrupe?: string[];  // Prioritetne mišićne grupe
  ozljede?: string[];          // Ozljede za izbjegavanje
  maksCiljanoTrajanje?: number; // Minuta po treningu
  napomeneTrenera?: string;
  
  // Odabrani dani treninga (1=Pon, 2=Uto, ..., 7=Ned)
  daniTreninga?: number[];     // Ako nije zadan, automatski se raspoređuje
  
  // Povezivanje programa (za godišnji plan)
  annualProgramId?: string;    // ID godišnjeg plana
  previousProgramId?: string;  // ID prethodnog programa u sekvenci
  phaseOrder?: number;          // Redni broj faze (1, 2, 3...)
  totalPhases?: number;         // Ukupan broj faza
}

/** Rezultat validacije inputa */
export interface ValidacijaRezultat {
  valjan: boolean;
  greske: string[];
  upozorenja: string[];
}

// ============================================
// PROGRAM STRUKTURA (OUTPUT)
// ============================================

/** Glavni program */
export interface TreningProgram {
  id: string;
  clientId: string;
  trenerId?: string;
  
  // Konfiguracija
  planName: string;
  cilj: CiljTreninga;
  razina: RazinaKorisnika;
  splitTip: TipSplita;
  ukupnoTjedana: number;
  treninziTjedno: number;
  
  // Meta
  opis: string;
  status: StatusPrograma;
  datumPocetka?: Date;
  datumZavrsetka?: Date;
  generatorVerzija: string;
  validacijaRezultat?: ValidacijaRezultat;
  napomeneTrenera?: string;
  
  // Struktura
  mezociklusi: Mezociklus[];
  
  // Povezivanje programa (za godišnji plan)
  annualProgramId?: string;        // ID godišnjeg plana
  previousProgramId?: string;      // ID prethodnog programa u sekvenci
  nextProgramId?: string;          // ID sljedećeg programa u sekvenci
  phaseOrder?: number;              // Redni broj faze (1, 2, 3...)
  totalPhases?: number;             // Ukupan broj faza
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Mezociklus (faza programa) */
export interface Mezociklus {
  id: string;
  programId: string;
  redniBroj: number;
  naziv: string;
  tip: TipMezociklusa;
  trajanjeTjedana: number;
  fokusOpis: string;
  
  // Volumen kontrola po mišićnoj grupi (setovi tjedno)
  pocetniVolumenPoGrupi: Record<string, number>;
  zavrsniVolumenPoGrupi: Record<string, number>;
  
  // Intenzitet (% 1RM ili RPE)
  pocetniIntenzitetPostotak: number;
  zavrsniIntenzitetPostotak: number;
  
  // Progresija
  tipProgresije: TipProgresije;
  
  // Meta
  napomeneTreneru?: string;
  
  // Struktura
  tjedni: Tjedan[];
}

/** 
 * Tracking volumena po mišićnoj grupi - IFT Metodika
 * MEV = Minimalni Efektivni Volumen
 * MAV = Maksimalni Adaptivni Volumen (optimalni raspon)
 * MRV = Maksimalni Oporavivi Volumen (gornja granica)
 */
export interface VolumenTracking {
  misicnaGrupa: string;
  planirano: number;          // Planirani setovi
  ostvareno: number;          // Stvarni setovi (nakon treninga)
  mev: number;                // Minimum za napredak
  mavMin: number;             // Donja granica optimalnog
  mavMax: number;             // Gornja granica optimalnog
  mrv: number;                // Maksimum za oporavak
  status: 'ispod_mev' | 'u_mev' | 'optimalno' | 'blizu_mrv' | 'preko_mrv';
}

/**
 * Tip progresije - IFT valovita vs linearna
 * Valovita: oscilira volumen/intenzitet kroz tjedne
 * Linearna: konstantni porast
 */
export interface ProgresijaTjedna {
  tjedanBroj: number;
  tipProgresije: 'linearna' | 'valna' | 'deload';
  volumenMultiplikator: number;     // 0.6 - 1.15
  intenzitetMultiplikator: number;  // 0.7 - 1.10
  opisFaze: string;                 // "Akumulacija", "Intenzifikacija", "Deload"
}

/** Tjedan unutar mezociklusa */
export interface Tjedan {
  id: string;
  mezociklusId: string;
  tjedanBroj: number;
  jeDeload: boolean;
  volumenModifikator: number;      // 1.0 = 100%, 0.6 = 60% za deload
  intenzitetModifikator: number;
  napomene?: string;
  
  // NOVO: Tracking volumena po grupi
  volumenPoGrupi?: VolumenTracking[];
  progresija?: ProgresijaTjedna;
  
  // Struktura
  treninzi: TrenigSesija[];
}

/** Pojedinačni trening */
export interface TrenigSesija {
  id: string;
  weekId: string;
  danUTjednu: number;              // 1-7 (pon-ned)
  naziv: string;                   // npr. "Push dan A"
  tipTreninga: string;             // npr. "push", "pull", "legs", "full_body"
  procijenjanoTrajanje: number;    // minuta
  
  // Struktura treninga
  zagrijavanje: ZagrijavanjeBlok;
  glavniDio: VjezbaSesije[];
  zavrsniDio: ZavrsniBlok;
  
  // Meta
  napomene?: string;
  trenerLocked: boolean;
}

/** Zagrijavanje */
export interface ZagrijavanjeBlok {
  opceZagrijavanje: {
    tip: 'trcanje' | 'bicikl' | 'veslo' | 'skipping';
    trajanje: number;  // minuta
    intenzitet: 'lagan' | 'umjeren';
  };
  specificnoZagrijavanje: {
    vjezbe: string[];  // npr. ["arm_circles", "hip_circles"]
    trajanje: number;
  };
}

/** Završni dio */
export interface ZavrsniBlok {
  core?: {
    vjezbe: VjezbaSesije[];
    trajanje: number;
  };
  kondicija?: {
    tip: string;
    trajanje: number;
    intenzitet: string;
  };
  istezanje?: {
    vjezbe: string[];
    trajanje: number;
  };
}

/**
 * Kardio sesija - IFT Metodika (Tablica 26)
 * Programiranje kardiorespiratornog vježbanja
 */
export interface KardioSesija {
  id: string;
  weekId: string;
  danUTjednu: number;
  naziv: string;
  tipKardio: TipKardioTreninga;
  
  // Parametri treninga
  trajanje: number;  // minuta
  intenzitetSF: { min: number; max: number };  // % max SF
  tempo?: string;  // npr. "10 km/h umjereni"
  
  // Za intervalne treninge
  intervalRada?: number;  // sekundi
  intervalOdmora?: number;  // sekundi
  brojIntervala?: number;
  brojSerija?: number;  // za HIIT
  odmorIzmeduSerija?: number;  // sekundi
  
  // HIIT specifično
  hiitVjezbe?: string[];  // lista vježbi za HIIT
  
  // Meta
  oprema?: string;  // bicikl, traka, veslo, bez opreme
  napomene?: string;
}

/**
 * Kombinirana sesija - snaga + kardio
 */
export interface KombiranaSesija extends TrenigSesija {
  kardioBlok?: KardioSesija;
}

/**
 * Pliometrijska sesija - IFT Metodika
 * Za razvoj eksplozivne snage u fazi SNAGA/POWER
 */
export interface PliometrijskaSesija {
  id: string;
  weekId: string;
  danUTjednu: number;
  naziv: string;
  
  // Parametri
  ukupniKontakti: number;  // ukupni broj kontakata (skokova) u treningu
  vjezbe: PliometrijskaVjezbaSesije[];
  
  // Meta
  napomene?: string;
  razina: 'pocetnik' | 'srednji' | 'napredni';
}

/**
 * Pojedinačna pliometrijska vježba u sesiji
 */
export interface PliometrijskaVjezbaSesije {
  id: string;
  vjezbaId: string;
  naziv: string;
  nazivHr: string;
  serije: number;
  ponavljanja: number;
  odmorSekunde: number;
  tip: 'skok' | 'bacanje' | 'odraz' | 'reaktivna';
  misicneGrupe: string[];
  napomene?: string;
}

/**
 * Tip treninga u tjednom planu
 */
export type TipTreningaDan = 'snaga' | 'kardio' | 'pliometrija' | 'kombinacija' | 'odmor';

/** Pojedinačna vježba u sesiji */
export interface VjezbaSesije {
  id: string;
  sessionId: string;
  redniBroj: number;
  
  // Referenca na library
  exerciseLibraryId: string;
  naziv: string;
  nazivEn: string;
  
  // Propisani parametri
  setovi: number;
  ponavljanja: string;            // npr. "8-12" ili "5"
  odmorSekunde: number;
  tempo?: string;                 // npr. "3-1-2-0" (spuštanje-pauza-dizanje-pauza)
  rir?: number;                   // Reps In Reserve (0-5)
  rpe?: number;                   // Rate of Perceived Exertion (5-10)
  postotak1RM?: number;           // % od 1RM
  
  // Meta
  tipVjezbe: 'compound' | 'isolation';
  obrazacPokreta: ObrazacPokreta;
  primarneGrupe: string[];
  sekundarneGrupe: string[];
  oprema: string;
  
  // Zamjene
  alternativneVjezbe: string[];   // ID-evi alternativa
  napomene?: string;
  
  // Superset
  jeSuperser: boolean;
  superserPartnerId?: string;
  
  // Trener override
  trenerOverride: boolean;
  originalnaVjezbaId?: string;
}

// ============================================
// PARAMETRI PO CILJU I RAZINI
// ============================================

/** Parametri treninga ovisno o cilju */
export interface CiljParametri {
  setovi: { min: number; max: number };
  ponavljanja: { min: number; max: number };
  odmorSekunde: { min: number; max: number };
  rirRaspon: { min: number; max: number };
  intenzitetRaspon: { min: number; max: number };  // % 1RM
  volumenPoGrupi: { min: number; max: number };    // setovi tjedno
  tempoPreporuka?: string;
}

/** Parametri po razini korisnika */
export interface RazinaParametri {
  maksBrojVjezbiPoTreningu: number;
  maksBrojSetovaPoTreningu: number;
  minOdmorIzmedjuSetova: number;
  dozvoljeneTehnikeNapredne: boolean;
  preporuceniSplitovi: TipSplita[];
}

// ============================================
// LOGGING
// ============================================

/** Log entry za generator_logs tablicu */
export interface GeneratorLog {
  id: string;
  programId: string;
  tip: 'info' | 'warning' | 'error' | 'debug';
  poruka: string;
  podaci?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// SUPABASE MODELI (za insert/select)
// ============================================

/** Supabase training_plans row */
export interface DBTrainingPlan {
  id?: string;
  client_id: string;
  trener_id?: string;
  plan_name: string;
  cilj: CiljTreninga;
  razina: RazinaKorisnika;
  split_tip: TipSplita;
  ukupno_tjedana: number;
  treninzi_tjedno: number;
  opis?: string;
  status: StatusPrograma;
  datum_pocetka?: string;
  datum_zavrsetka?: string;
  je_template: boolean;
  template_id?: string;
  validacija_rezultat?: ValidacijaRezultat;
  napomene_trenera?: string;
  generator_verzija: string;
  exercises?: unknown; // Legacy JSONB polje
  warmup_type?: string;
  estimated_calories_burned?: number;
  created_at?: string;
  updated_at?: string;
}

/** Supabase training_mesocycles row */
export interface DBMezociklus {
  id?: string;
  program_id: string;
  redni_broj: number;
  naziv: string;
  tip: TipMezociklusa;
  trajanje_tjedana: number;
  fokus_opis?: string;
  pocetni_volumen_po_grupi?: Record<string, number>;
  zavrsni_volumen_po_grupi?: Record<string, number>;
  pocetni_intenzitet_postotak: number;
  zavrsni_intenzitet_postotak: number;
  tip_progresije: TipProgresije;
  napomene_treneru?: string;
  created_at?: string;
  updated_at?: string;
}

/** Supabase training_weeks row */
export interface DBTjedan {
  id?: string;
  mesocycle_id: string;
  tjedan_broj: number;
  je_deload: boolean;
  volumen_modifikator: number;
  intenzitet_modifikator: number;
  napomene?: string;
  created_at?: string;
  updated_at?: string;
}

/** Supabase training_sessions row */
export interface DBSesija {
  id?: string;
  week_id: string;
  dan_u_tjednu: number;
  naziv: string;
  tip_treninga?: string;
  procijenjeno_trajanje_min: number;
  zagrijavanje?: ZagrijavanjeBlok;
  zavrsni_dio?: ZavrsniBlok;
  napomene?: string;
  trener_locked: boolean;
  stvarno_trajanje_min?: number;
  izvrseno_na?: string;
  created_at?: string;
  updated_at?: string;
}

/** Supabase training_session_exercises row */
export interface DBVjezbaSesije {
  id?: string;
  session_id: string;
  redni_broj: number;
  exercise_library_id: string;
  naziv: string;
  naziv_en?: string;
  setovi: number;
  ponavljanja: string;
  odmor_sekunde: number;
  tempo?: string;
  rir?: number;
  rpe?: number;
  postotak_1rm?: number;
  tip_vjezbe?: 'compound' | 'isolation';
  obrazac_pokreta?: string;
  primarne_grupe?: string[];
  sekundarne_grupe?: string[];
  oprema?: string;
  alternativne_vjezbe?: string[];
  napomene?: string;
  je_superser: boolean;
  superser_partner_id?: string;
  trener_override: boolean;
  originalna_vjezba_id?: string;
  stvarni_setovi?: number;
  stvarna_ponavljanja?: string;
  koristeno_opterecenje?: string;
  napomene_izvrsenja?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// EXPORT SVE
// ============================================

export type {
  CiljTreninga as ProgramGoal,
  RazinaKorisnika as UserLevel,
  TipSplita as SplitType,
};

