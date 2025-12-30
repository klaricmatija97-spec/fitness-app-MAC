/**
 * PRO Training Generator - Database Layer
 * ========================================
 * Funkcije za spremanje generiranih programa u Supabase
 * 
 * POSTOJEĆE TABLICE U SUPABASE:
 * - training_programs (glavni programi)
 * - mesocycles (mezociklusi)
 * - program_sessions (treninzi)
 * - session_exercises (vježbe)
 * - weekly_volume_tracking (praćenje volumena)
 * - generator_logs (logovi)
 */

import { createServiceClient } from '@/lib/supabase';
import type {
  TreningProgram,
  Mezociklus,
  Tjedan,
  TrenigSesija,
  VjezbaSesije,
} from './types';
import { dohvatiLogove } from './generator';

// ============================================
// SUPABASE CLIENT
// ============================================

function getSupabase() {
  return createServiceClient();
}

// ============================================
// MAPIRANJE CILJA I RAZINE NA POSTOJEĆI FORMAT
// ============================================

/**
 * Mapiranje IFT ciljeva na Supabase format
 * IFT Metodika: jakost, snaga, hipertrofija, izdrzljivost
 */
const CILJ_MAP: Record<string, string> = {
  // IFT ciljevi (novi)
  jakost: 'strength',           // Maksimalna snaga (1-5 rep)
  snaga: 'power',               // Power/Eksplozivnost (6-8 rep)
  hipertrofija: 'hypertrophy',  // Mišićna masa (8-12 rep)
  izdrzljivost: 'endurance',    // Mišićna izdržljivost (12+ rep)
  rekreacija_zdravlje: 'general_fitness',
  
  // Legacy podrška (stari nazivi)
  maksimalna_snaga: 'strength',
  misicna_izdrzljivost: 'endurance',
};

const RAZINA_MAP: Record<string, string> = {
  pocetnik: 'beginner',
  srednji: 'intermediate',
  napredni: 'advanced',
};

const SPLIT_MAP: Record<string, string> = {
  full_body: 'full_body',
  upper_lower: 'upper_lower',
  push_pull_legs: 'push_pull_legs',
  body_part_split: 'bro_split',
};

const MEZOCIKLUS_TIP_MAP: Record<string, string> = {
  akumulacija: 'volume',
  intenzifikacija: 'intensity',
  realizacija: 'peak',
  deload: 'deload',
};

// Valid session types: strength, cardio
// Mapiramo sve na 'strength' jer je glavni tip treninga
const SESSION_TYPE = 'strength';

// ============================================
// SPREMANJE PROGRAMA
// ============================================

/**
 * Sprema kompletan program u Supabase
 */
export async function spremiProgram(program: TreningProgram): Promise<{ 
  success: boolean; 
  programId?: string; 
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    // 1. Spremi glavni program u training_programs
    const dbProgram = {
      id: program.id,
      client_id: program.clientId,
      trainer_id: program.trenerId || null,
      name: program.planName,
      goal: CILJ_MAP[program.cilj] || program.cilj,
      level: RAZINA_MAP[program.razina] || program.razina,
      split_type: SPLIT_MAP[program.splitTip] || program.splitTip,
      duration_weeks: program.ukupnoTjedana,
      sessions_per_week: program.treninziTjedno,
      session_duration_minutes: 60,
      available_equipment: ['sipka', 'bucice', 'sprava', 'kabel', 'tezina_tijela'],
      status: program.status === 'draft' ? 'draft' : 'active',
      is_template: false,
      trainer_notes: program.napomeneTrenera || null,
      start_date: program.datumPocetka?.toISOString().split('T')[0] || null,
      end_date: program.datumZavrsetka?.toISOString().split('T')[0] || null,
    };
    
    const { data: programData, error: programError } = await supabase
      .from('training_programs')
      .insert(dbProgram)
      .select('id')
      .single();
    
    if (programError) {
      console.error('[Database] Greška pri spremanju programa:', programError);
      throw new Error(`Greška pri spremanju programa: ${programError.message}`);
    }
    
    const programId = programData.id;
    console.log(`[Database] Program spremljen: ${programId}`);
    
    // 2. Spremi mezocikluse i tjedne
    cumulativeWeekOffset = 0; // Reset week counter
    for (const mezociklus of program.mezociklusi) {
      await spremiMezociklus(programId, mezociklus);
    }
    
    // 3. Spremi logove generatora
    await spremiLogove(programId);
    
    return { success: true, programId };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Nepoznata greška';
    console.error('[Database] Greška:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Track cumulative weeks for proper week numbering
let cumulativeWeekOffset = 0;

/**
 * Sprema mezociklus
 */
async function spremiMezociklus(programId: string, mezociklus: Mezociklus): Promise<string> {
  const supabase = getSupabase();
  
  // Izračunaj start tjedna na temelju kumulativnog offseta
  const weekStart = cumulativeWeekOffset + 1;
  const weekEnd = weekStart + mezociklus.trajanjeTjedana - 1;
  cumulativeWeekOffset = weekEnd; // Update for next mesocycle
  
  const dbMezociklus = {
    id: mezociklus.id,
    program_id: programId,
    name: mezociklus.naziv,
    order_index: mezociklus.redniBroj,
    week_start: weekStart,
    week_end: weekEnd,
    focus: MEZOCIKLUS_TIP_MAP[mezociklus.tip] || mezociklus.tip,
    progression_type: 'linear',  // Trenutno samo linear podržan
    target_rpe_start: 6,
    target_rpe_end: 9,
    volume_modifier: 1.0,
    intensity_modifier: 1.0,
    description: mezociklus.fokusOpis,
    notes: mezociklus.napomeneTreneru || null,
  };
  
  const { data, error } = await supabase
    .from('mesocycles')
    .insert(dbMezociklus)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Greška pri spremanju mezociklusa: ${error.message}`);
  }
  
  const mezociklusId = data.id;
  
  // Spremi sesije za sve tjedne u ovom mezociklusu
  for (const tjedan of mezociklus.tjedni) {
    const globalWeekNumber = weekStart + tjedan.tjedanBroj - 1;
    await spremiSesijeZaTjedan(programId, mezociklusId, globalWeekNumber, tjedan);
  }
  
  return mezociklusId;
}

/**
 * Sprema sve sesije za jedan tjedan
 */
async function spremiSesijeZaTjedan(
  programId: string, 
  mesocycleId: string, 
  weekNumber: number, 
  tjedan: Tjedan
): Promise<void> {
  for (let i = 0; i < tjedan.treninzi.length; i++) {
    const trening = tjedan.treninzi[i];
    await spremiSesiju(programId, mesocycleId, weekNumber, i + 1, trening);
  }
}

/**
 * Sprema pojedinačnu sesiju (trening)
 */
async function spremiSesiju(
  programId: string,
  mesocycleId: string,
  weekNumber: number,
  orderInWeek: number,
  trening: TrenigSesija
): Promise<string> {
  const supabase = getSupabase();
  
  const dbSesija = {
    id: trening.id,
    program_id: programId,
    mesocycle_id: mesocycleId,
    week_number: weekNumber,
    day_of_week: trening.danUTjednu,
    order_in_week: orderInWeek,
    session_type: SESSION_TYPE,  // Sve su strength sesije
    split_name: trening.naziv,
    warmup_protocol: trening.zagrijavanje ? JSON.stringify(trening.zagrijavanje) : null,
    cooldown_protocol: trening.zavrsniDio ? JSON.stringify(trening.zavrsniDio) : null,
    target_rpe: 7,
    estimated_duration_minutes: trening.procijenjanoTrajanje,
    estimated_total_sets: trening.glavniDio.reduce((sum, v) => sum + v.setovi, 0),
    trainer_locked: trening.trenerLocked,
    trainer_notes: trening.napomene || null,
    is_rest_day: false,
  };
  
  const { data, error } = await supabase
    .from('program_sessions')
    .insert(dbSesija)
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Greška pri spremanju sesije: ${error.message}`);
  }
  
  const sesijaId = data.id;
  
  // Spremi vježbe
  if (trening.glavniDio.length > 0) {
    await spremiVjezbe(sesijaId, trening.glavniDio);
  }
  
  return sesijaId;
}

/**
 * Sprema vježbe za sesiju
 */
async function spremiVjezbe(sessionId: string, vjezbe: VjezbaSesije[]): Promise<void> {
  const supabase = getSupabase();
  
  const dbVjezbe = vjezbe.map((v, index) => ({
    id: v.id,
    session_id: sessionId,
    exercise_id: v.exerciseLibraryId,
    exercise_name: v.nazivEn || v.naziv,
    exercise_name_hr: v.naziv,
    order_index: index + 1,
    superset_group: v.jeSuperser ? 1 : null,
    sets: v.setovi,
    reps_target: v.ponavljanja,
    tempo: v.tempo || null,
    rest_seconds: v.odmorSekunde,
    target_rpe: v.rpe || null,
    target_rir: v.rir || null,
    load_prescription: v.postotak1RM ? `${v.postotak1RM}% 1RM` : null,
    primary_muscles: v.primarneGrupe,
    secondary_muscles: v.sekundarneGrupe,
    equipment: v.oprema,
    mechanic: v.tipVjezbe,
    instructions: null,
    coaching_cues: null,
    notes: v.napomene || null,
    is_locked: false,
    is_trainer_override: v.trenerOverride,
    original_exercise_id: v.originalnaVjezbaId || null,
    override_reason: null,
  }));
  
  const { error } = await supabase
    .from('session_exercises')
    .insert(dbVjezbe);
  
  if (error) {
    throw new Error(`Greška pri spremanju vježbi: ${error.message}`);
  }
}

/**
 * Sprema logove generatora
 */
async function spremiLogove(programId: string): Promise<void> {
  const supabase = getSupabase();
  const logovi = dohvatiLogove();
  
  if (logovi.length === 0) return;
  
  try {
    const dbLogovi = logovi.map(log => ({
      program_id: programId,
      log_type: log.tip,
      message: log.poruka,
      metadata: log.podaci || {},
      created_at: log.timestamp.toISOString(),
    }));
    
    await supabase
      .from('generator_logs')
      .insert(dbLogovi);
  } catch (error) {
    console.log('[Database] generator_logs spremanje preskočeno');
  }
}

// ============================================
// DOHVAĆANJE PROGRAMA
// ============================================

/**
 * Dohvaća program s mezociklusima i sesijama
 */
export async function dohvatiProgram(programId: string): Promise<TreningProgram | null> {
  const supabase = getSupabase();
  
  // Dohvati program
  const { data: program, error: programError } = await supabase
    .from('training_programs')
    .select('*')
    .eq('id', programId)
    .single();
  
  if (programError || !program) {
    console.error('[Database] Greška pri dohvaćanju programa:', programError);
    return null;
  }
  
  // Dohvati mezocikluse
  const { data: mezociklusi, error: mezociklusiError } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('program_id', programId)
    .order('order_index');
  
  if (mezociklusiError) {
    console.error('[Database] Greška pri dohvaćanju mezociklusa:', mezociklusiError);
    return null;
  }
  
  // Dohvati sesije
  const { data: sesije, error: sesijeError } = await supabase
    .from('program_sessions')
    .select('*, session_exercises(*)')
    .eq('program_id', programId)
    .order('week_number')
    .order('order_in_week');
  
  if (sesijeError) {
    console.error('[Database] Greška pri dohvaćanju sesija:', sesijeError);
    return null;
  }
  
  // Transformiraj u aplikacijski format
  return transformToAppFormat(program, mezociklusi || [], sesije || []);
}

/**
 * Dohvaća sve programe za klijenta
 */
export async function dohvatiProgrameZaKlijenta(clientId: string): Promise<{
  id: string;
  planName: string;
  cilj: string;
  razina: string;
  status: string;
  createdAt: string;
}[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('training_programs')
    .select('id, name, goal, level, status, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[Database] Greška pri dohvaćanju programa:', error);
    return [];
  }
  
  return (data || []).map(p => ({
    id: p.id,
    planName: p.name,
    cilj: p.goal || 'nepoznato',
    razina: p.level || 'nepoznato',
    status: p.status || 'draft',
    createdAt: p.created_at,
  }));
}

/**
 * Ažurira status programa
 */
export async function azurirajStatusPrograma(
  programId: string, 
  status: 'draft' | 'aktivan' | 'pauziran' | 'zavrsen'
): Promise<boolean> {
  const supabase = getSupabase();
  
  const statusMap: Record<string, string> = {
    draft: 'draft',
    aktivan: 'active',
    pauziran: 'paused',
    zavrsen: 'completed',
  };
  
  const { error } = await supabase
    .from('training_programs')
    .update({ status: statusMap[status] || status })
    .eq('id', programId);
  
  if (error) {
    console.error('[Database] Greška pri ažuriranju statusa:', error);
    return false;
  }
  
  return true;
}

/**
 * Briše program
 */
export async function obrisiProgram(programId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('training_programs')
    .delete()
    .eq('id', programId);
  
  if (error) {
    console.error('[Database] Greška pri brisanju programa:', error);
    return false;
  }
  
  return true;
}

// ============================================
// HELPER FUNKCIJE
// ============================================

function transformToAppFormat(
  program: any, 
  mezociklusi: any[], 
  sesije: any[]
): TreningProgram {
  // Grupiranje sesija po mezociklusu i tjednu
  const sesijePoMezociklusu = new Map<string, Map<number, any[]>>();
  
  for (const sesija of sesije) {
    if (!sesijePoMezociklusu.has(sesija.mesocycle_id)) {
      sesijePoMezociklusu.set(sesija.mesocycle_id, new Map());
    }
    const tjedniMap = sesijePoMezociklusu.get(sesija.mesocycle_id)!;
    if (!tjedniMap.has(sesija.week_number)) {
      tjedniMap.set(sesija.week_number, []);
    }
    tjedniMap.get(sesija.week_number)!.push(sesija);
  }
  
  // Reverse mapiranje
  const reverseGoalMap: Record<string, any> = Object.fromEntries(
    Object.entries(CILJ_MAP).map(([k, v]) => [v, k])
  );
  const reverseLevelMap: Record<string, any> = Object.fromEntries(
    Object.entries(RAZINA_MAP).map(([k, v]) => [v, k])
  );
  const reverseSplitMap: Record<string, any> = Object.fromEntries(
    Object.entries(SPLIT_MAP).map(([k, v]) => [v, k])
  );
  
  return {
    id: program.id,
    clientId: program.client_id,
    trenerId: program.trainer_id,
    planName: program.name,
    cilj: reverseGoalMap[program.goal] || program.goal,
    razina: reverseLevelMap[program.level] || program.level,
    splitTip: reverseSplitMap[program.split_type] || program.split_type,
    ukupnoTjedana: program.duration_weeks,
    treninziTjedno: program.sessions_per_week,
    opis: program.trainer_notes || '',
    status: program.status === 'active' ? 'aktivan' : program.status,
    datumPocetka: program.start_date ? new Date(program.start_date) : undefined,
    datumZavrsetka: program.end_date ? new Date(program.end_date) : undefined,
    generatorVerzija: '1.0.0',
    napomeneTrenera: program.trainer_notes,
    mezociklusi: mezociklusi.map(m => transformMezociklus(m, sesijePoMezociklusu.get(m.id))),
    createdAt: new Date(program.created_at),
    updatedAt: new Date(program.updated_at),
  };
}

function transformMezociklus(m: any, tjedniMap?: Map<number, any[]>): Mezociklus {
  const reverseTipMap: Record<string, any> = Object.fromEntries(
    Object.entries(MEZOCIKLUS_TIP_MAP).map(([k, v]) => [v, k])
  );
  
  const tjedni: Tjedan[] = [];
  if (tjedniMap) {
    for (const [weekNum, sesije] of Array.from(tjedniMap.entries()).sort((a, b) => a[0] - b[0])) {
      tjedni.push({
        id: `week-${m.id}-${weekNum}`,
        mezociklusId: m.id,
        tjedanBroj: weekNum - m.week_start + 1,
        jeDeload: m.focus === 'deload',
        volumenModifikator: m.volume_modifier || 1.0,
        intenzitetModifikator: m.intensity_modifier || 1.0,
        treninzi: sesije.map(transformSesija),
      });
    }
  }
  
  return {
    id: m.id,
    programId: m.program_id,
    redniBroj: m.order_index,
    naziv: m.name,
    tip: reverseTipMap[m.focus] || m.focus,
    trajanjeTjedana: m.week_end - m.week_start + 1,
    fokusOpis: m.description || '',
    pocetniVolumenPoGrupi: {},
    zavrsniVolumenPoGrupi: {},
    pocetniIntenzitetPostotak: 70,
    zavrsniIntenzitetPostotak: 85,
    tipProgresije: m.progression_type === 'linear' ? 'linearna' : 'valna',
    napomeneTreneru: m.notes,
    tjedni,
  };
}

function transformSesija(s: any): TrenigSesija {
  return {
    id: s.id,
    weekId: '',
    danUTjednu: s.day_of_week,
    naziv: s.split_name || s.session_type,
    tipTreninga: s.session_type,
    procijenjanoTrajanje: s.estimated_duration_minutes,
    zagrijavanje: s.warmup_protocol ? JSON.parse(s.warmup_protocol) : { opceZagrijavanje: { tip: 'trcanje', trajanje: 5, intenzitet: 'lagan' }, specificnoZagrijavanje: { vjezbe: [], trajanje: 5 } },
    glavniDio: (s.session_exercises || []).map(transformVjezba),
    zavrsniDio: s.cooldown_protocol ? JSON.parse(s.cooldown_protocol) : {},
    napomene: s.trainer_notes,
    trenerLocked: s.trainer_locked,
  };
}

function transformVjezba(v: any): VjezbaSesije {
  return {
    id: v.id,
    sessionId: v.session_id,
    redniBroj: v.order_index,
    exerciseLibraryId: v.exercise_id,
    naziv: v.exercise_name_hr || v.exercise_name,
    nazivEn: v.exercise_name,
    setovi: v.sets,
    ponavljanja: v.reps_target,
    odmorSekunde: v.rest_seconds,
    tempo: v.tempo,
    rir: v.target_rir,
    rpe: v.target_rpe,
    tipVjezbe: v.mechanic || 'isolation',
    obrazacPokreta: 'isolation',
    primarneGrupe: v.primary_muscles || [],
    sekundarneGrupe: v.secondary_muscles || [],
    oprema: v.equipment || '',
    alternativneVjezbe: [],
    napomene: v.notes,
    jeSuperser: !!v.superset_group,
    trenerOverride: v.is_trainer_override,
    originalnaVjezbaId: v.original_exercise_id,
  };
}

// ============================================
// EXPORT
// ============================================

export default {
  spremiProgram,
  dohvatiProgram,
  dohvatiProgrameZaKlijenta,
  azurirajStatusPrograma,
  obrisiProgram,
};
