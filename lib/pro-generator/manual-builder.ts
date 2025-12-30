/**
 * PRO Training Generator - Manual Builder
 * ========================================
 * Funkcije za ručno kreiranje mezociklusa, tjedana i treninga
 * 
 * TIPOVI IZVORA:
 * - auto:   Potpuno automatski generirano
 * - manual: Potpuno ručno kreirano od trenera
 * - hybrid: Kombinacija auto + manual dijelova
 */

import { createServiceClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// TIPOVI ZA MANUAL BUILDER
// ============================================

export type ProgramSource = 'auto' | 'manual' | 'hybrid';

/** Input za ručno kreiranje programa (prazna ljuska) */
export interface ManualProgramInput {
  clientId: string;
  trenerId?: string;
  naziv: string;
  cilj: string;
  razina: string;
  splitTip: string;
  trajanjeTjedana: number;
  treninziTjedno: number;
  napomene?: string;
}

/** Input za ručno kreiranje mezociklusa */
export interface ManualMezociklusInput {
  programId: string;
  naziv: string;
  tip: 'volume' | 'intensity' | 'peak' | 'deload';
  tjedanOd: number;
  tjedanDo: number;
  fokusOpis?: string | null;
  napomene?: string | null;
  redniBroj?: number;
}

/** Input za ručno kreiranje tjedna */
export interface ManualTjedanInput {
  programId: string;
  mesocycleId: string;
  tjedanBroj: number;
  jeDeload?: boolean;
  volumenModifikator?: number;
  intenzitetModifikator?: number;
  napomene?: string;
}

/** Input za ručno kreiranje sesije (treninga) */
export interface ManualSesijaInput {
  programId: string;
  mesocycleId: string;
  tjedanBroj: number;
  danUTjednu: number;
  redniBrojUTjednu: number;
  naziv: string;
  tipTreninga?: string;
  procijenjanoTrajanje?: number;
  zagrijavanje?: unknown | null;
  zavrsniDio?: unknown | null;
  napomene?: string | null;
}

/** Input za ručno dodavanje vježbe */
export interface ManualVjezbaInput {
  sessionId: string;
  exerciseId: string;
  nazivHr: string;
  nazivEn?: string;
  redniBroj: number;
  setovi: number;
  ponavljanja: string;
  odmorSekunde?: number;
  tempo?: string | null;
  rpe?: number | null;
  rir?: number | null;
  primarniMisici?: string[];
  sekundarniMisici?: string[];
  oprema?: string;
  mehanika?: 'compound' | 'isolation';
  napomene?: string | null;
  supersetGrupa?: number | null;
}

// ============================================
// HELPER FUNKCIJE
// ============================================

function getSupabase() {
  return createServiceClient();
}

/**
 * Ažurira source programa na 'hybrid' ako ima kombinaciju auto i manual
 */
async function updateProgramSourceIfNeeded(programId: string): Promise<void> {
  const supabase = getSupabase();
  
  // Dohvati program
  const { data: program } = await supabase
    .from('training_programs')
    .select('source')
    .eq('id', programId)
    .single();
  
  if (!program) return;
  
  // Ako je već hybrid, nema potrebe za promjenom
  if (program.source === 'hybrid') return;
  
  // Provjeri ima li manual komponenti
  const { data: manualMeso } = await supabase
    .from('mesocycles')
    .select('id')
    .eq('program_id', programId)
    .eq('is_manual', true)
    .limit(1);
  
  const { data: manualSessions } = await supabase
    .from('program_sessions')
    .select('id')
    .eq('program_id', programId)
    .eq('is_manual', true)
    .limit(1);
  
  const hasManual = (manualMeso?.length || 0) > 0 || (manualSessions?.length || 0) > 0;
  
  // Provjeri ima li auto komponenti
  const { data: autoMeso } = await supabase
    .from('mesocycles')
    .select('id')
    .eq('program_id', programId)
    .eq('is_manual', false)
    .limit(1);
  
  const hasAuto = (autoMeso?.length || 0) > 0;
  
  // Odredi novi source
  let newSource: ProgramSource = program.source;
  if (hasManual && hasAuto) {
    newSource = 'hybrid';
  } else if (hasManual && !hasAuto) {
    newSource = 'manual';
  }
  
  if (newSource !== program.source) {
    await supabase
      .from('training_programs')
      .update({ source: newSource })
      .eq('id', programId);
  }
}

// ============================================
// MANUAL PROGRAM (PRAZNA LJUSKA)
// ============================================

/**
 * Kreira prazan program koji će trener ručno popuniti
 */
export async function kreirajManualniProgram(input: ManualProgramInput): Promise<{
  success: boolean;
  programId?: string;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    const programId = uuidv4();
    
    // Prvo probaj s source stupcem, ako ne postoji - bez njega
    let insertData: Record<string, unknown> = {
      id: programId,
      client_id: input.clientId,
      trainer_id: input.trenerId || null,
      name: input.naziv,
      goal: input.cilj,
      level: input.razina,
      split_type: input.splitTip,
      duration_weeks: input.trajanjeTjedana,
      sessions_per_week: input.treninziTjedno,
      session_duration_minutes: 60,
      available_equipment: [],
      status: 'draft',
      is_template: false,
      trainer_notes: input.napomene || null,
    };
    
    // Dodaj source stupac (migracija je napravljena)
    const { error } = await supabase
      .from('training_programs')
      .insert({ ...insertData, source: 'manual' });
    
    if (error) throw new Error(error.message);
    
    return { success: true, programId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

// ============================================
// MANUAL MEZOCIKLUS
// ============================================

/**
 * Ručno kreira mezociklus
 */
export async function kreirajManualniMezociklus(input: ManualMezociklusInput): Promise<{
  success: boolean;
  mesocycleId?: string;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    const mesocycleId = uuidv4();
    
    // Odredi redni broj ako nije zadan
    let orderIndex = input.redniBroj;
    if (!orderIndex) {
      const { data: existing } = await supabase
        .from('mesocycles')
        .select('order_index')
        .eq('program_id', input.programId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      orderIndex = (existing?.[0]?.order_index || 0) + 1;
    }
    
    // Osnovni podaci (migracija je napravljena - is_manual i manual_order su dostupni)
    const { error } = await supabase
      .from('mesocycles')
      .insert({
        id: mesocycleId,
        program_id: input.programId,
        name: input.naziv,
        order_index: orderIndex,
        week_start: input.tjedanOd,
        week_end: input.tjedanDo,
        focus: input.tip,
        progression_type: 'linear',
        target_rpe_start: 6,
        target_rpe_end: 9,
        volume_modifier: 1.0,
        intensity_modifier: 1.0,
        description: input.fokusOpis || null,
        notes: input.napomene || null,
        is_manual: true,
        manual_order: orderIndex,
      });
    
    if (error) throw new Error(error.message);
    
    // Ažuriraj source programa
    await updateProgramSourceIfNeeded(input.programId);
    
    return { success: true, mesocycleId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Ažurira postojeći mezociklus
 */
export async function azurirajMezociklus(
  mesocycleId: string, 
  updates: Partial<ManualMezociklusInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.naziv) dbUpdates.name = updates.naziv;
    if (updates.tip) dbUpdates.focus = updates.tip;
    if (updates.tjedanOd) dbUpdates.week_start = updates.tjedanOd;
    if (updates.tjedanDo) dbUpdates.week_end = updates.tjedanDo;
    if (updates.fokusOpis !== undefined) dbUpdates.description = updates.fokusOpis;
    if (updates.napomene !== undefined) dbUpdates.notes = updates.napomene;
    if (updates.redniBroj) {
      dbUpdates.order_index = updates.redniBroj;
      dbUpdates.manual_order = updates.redniBroj;
    }
    
    const { error } = await supabase
      .from('mesocycles')
      .update(dbUpdates)
      .eq('id', mesocycleId);
    
    if (error) throw new Error(error.message);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Briše mezociklus
 */
export async function obrisiMezociklus(mesocycleId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    // Dohvati program_id prije brisanja
    const { data: meso } = await supabase
      .from('mesocycles')
      .select('program_id')
      .eq('id', mesocycleId)
      .single();
    
    const programId = meso?.program_id;
    
    const { error } = await supabase
      .from('mesocycles')
      .delete()
      .eq('id', mesocycleId);
    
    if (error) throw new Error(error.message);
    
    // Ažuriraj source programa
    if (programId) {
      await updateProgramSourceIfNeeded(programId);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

// ============================================
// MANUAL SESIJA (TRENING)
// ============================================

/**
 * Ručno kreira sesiju (trening)
 */
export async function kreirajManualnuSesiju(input: ManualSesijaInput): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    const sessionId = uuidv4();
    
    // Osnovni podaci (migracija je napravljena - is_manual i manual_order su dostupni)
    const { error } = await supabase
      .from('program_sessions')
      .insert({
        id: sessionId,
        program_id: input.programId,
        mesocycle_id: input.mesocycleId,
        week_number: input.tjedanBroj,
        day_of_week: input.danUTjednu,
        order_in_week: input.redniBrojUTjednu,
        session_type: 'strength',
        split_name: input.naziv,
        warmup_protocol: input.zagrijavanje ? JSON.stringify(input.zagrijavanje) : null,
        cooldown_protocol: input.zavrsniDio ? JSON.stringify(input.zavrsniDio) : null,
        target_rpe: 7,
        estimated_duration_minutes: input.procijenjanoTrajanje || 60,
        estimated_total_sets: 0,
        trainer_locked: false,
        trainer_notes: input.napomene || null,
        is_rest_day: false,
        is_manual: true,
        manual_order: input.redniBrojUTjednu,
      });
    
    if (error) throw new Error(error.message);
    
    // Ažuriraj source programa
    await updateProgramSourceIfNeeded(input.programId);
    
    return { success: true, sessionId };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Ažurira postojeću sesiju
 */
export async function azurirajSesiju(
  sessionId: string, 
  updates: Partial<ManualSesijaInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.naziv) dbUpdates.split_name = updates.naziv;
    if (updates.danUTjednu) dbUpdates.day_of_week = updates.danUTjednu;
    if (updates.tjedanBroj) dbUpdates.week_number = updates.tjedanBroj;
    if (updates.redniBrojUTjednu) {
      dbUpdates.order_in_week = updates.redniBrojUTjednu;
      dbUpdates.manual_order = updates.redniBrojUTjednu;
    }
    if (updates.procijenjanoTrajanje) dbUpdates.estimated_duration_minutes = updates.procijenjanoTrajanje;
    if (updates.zagrijavanje !== undefined) dbUpdates.warmup_protocol = updates.zagrijavanje ? JSON.stringify(updates.zagrijavanje) : null;
    if (updates.zavrsniDio !== undefined) dbUpdates.cooldown_protocol = updates.zavrsniDio ? JSON.stringify(updates.zavrsniDio) : null;
    if (updates.napomene !== undefined) dbUpdates.trainer_notes = updates.napomene;
    
    const { error } = await supabase
      .from('program_sessions')
      .update(dbUpdates)
      .eq('id', sessionId);
    
    if (error) throw new Error(error.message);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Briše sesiju
 */
export async function obrisiSesiju(sessionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    // Dohvati program_id prije brisanja
    const { data: session } = await supabase
      .from('program_sessions')
      .select('program_id')
      .eq('id', sessionId)
      .single();
    
    const programId = session?.program_id;
    
    const { error } = await supabase
      .from('program_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) throw new Error(error.message);
    
    // Ažuriraj source programa
    if (programId) {
      await updateProgramSourceIfNeeded(programId);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

// ============================================
// MANUAL VJEŽBA
// ============================================

/**
 * Ručno dodaje vježbu u sesiju
 */
export async function dodajManualuVjezbu(input: ManualVjezbaInput): Promise<{
  success: boolean;
  exerciseId?: string;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    const id = uuidv4();
    
    // Osnovni podaci (migracija je napravljena - is_manual i manual_order su dostupni)
    const { error } = await supabase
      .from('session_exercises')
      .insert({
        id,
        session_id: input.sessionId,
        exercise_id: input.exerciseId,
        exercise_name: input.nazivEn || input.nazivHr,
        exercise_name_hr: input.nazivHr,
        order_index: input.redniBroj,
        superset_group: input.supersetGrupa || null,
        sets: input.setovi,
        reps_target: input.ponavljanja,
        tempo: input.tempo || null,
        rest_seconds: input.odmorSekunde || 90,
        target_rpe: input.rpe || null,
        target_rir: input.rir || null,
        load_prescription: null,
        primary_muscles: input.primarniMisici || [],
        secondary_muscles: input.sekundarniMisici || [],
        equipment: input.oprema || null,
        mechanic: input.mehanika || 'compound',
        instructions: null,
        coaching_cues: null,
        notes: input.napomene || null,
        is_locked: false,
        is_trainer_override: false,
        is_manual: true,
        manual_order: input.redniBroj,
      });
    
    if (error) throw new Error(error.message);
    
    // Ažuriraj estimated_total_sets u sesiji
    await updateSessionTotalSets(input.sessionId);
    
    return { success: true, exerciseId: id };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Ažurira vježbu
 */
export async function azurirajVjezbu(
  exerciseId: string, 
  updates: Partial<ManualVjezbaInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.nazivHr) dbUpdates.exercise_name_hr = updates.nazivHr;
    if (updates.nazivEn) dbUpdates.exercise_name = updates.nazivEn;
    if (updates.redniBroj) {
      dbUpdates.order_index = updates.redniBroj;
      dbUpdates.manual_order = updates.redniBroj;
    }
    if (updates.setovi) dbUpdates.sets = updates.setovi;
    if (updates.ponavljanja) dbUpdates.reps_target = updates.ponavljanja;
    if (updates.odmorSekunde) dbUpdates.rest_seconds = updates.odmorSekunde;
    if (updates.tempo !== undefined) dbUpdates.tempo = updates.tempo;
    if (updates.rpe !== undefined) dbUpdates.target_rpe = updates.rpe;
    if (updates.rir !== undefined) dbUpdates.target_rir = updates.rir;
    if (updates.napomene !== undefined) dbUpdates.notes = updates.napomene;
    if (updates.supersetGrupa !== undefined) dbUpdates.superset_group = updates.supersetGrupa;
    
    const { error } = await supabase
      .from('session_exercises')
      .update(dbUpdates)
      .eq('id', exerciseId);
    
    if (error) throw new Error(error.message);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Briše vježbu
 */
export async function obrisiVjezbu(exerciseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  
  try {
    // Dohvati session_id prije brisanja
    const { data: exercise } = await supabase
      .from('session_exercises')
      .select('session_id')
      .eq('id', exerciseId)
      .single();
    
    const sessionId = exercise?.session_id;
    
    const { error } = await supabase
      .from('session_exercises')
      .delete()
      .eq('id', exerciseId);
    
    if (error) throw new Error(error.message);
    
    // Ažuriraj total sets u sesiji
    if (sessionId) {
      await updateSessionTotalSets(sessionId);
    }
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Nepoznata greška' 
    };
  }
}

/**
 * Ažurira ukupan broj setova u sesiji
 */
async function updateSessionTotalSets(sessionId: string): Promise<void> {
  const supabase = getSupabase();
  
  const { data } = await supabase
    .from('session_exercises')
    .select('sets')
    .eq('session_id', sessionId);
  
  const totalSets = data?.reduce((sum, e) => sum + (e.sets || 0), 0) || 0;
  
  await supabase
    .from('program_sessions')
    .update({ estimated_total_sets: totalSets })
    .eq('id', sessionId);
}

// ============================================
// UNIFIED PROGRAM VIEW
// ============================================

export interface UnifiedProgramView {
  program: {
    id: string;
    naziv: string;
    cilj: string;
    razina: string;
    splitTip: string;
    trajanjeTjedana: number;
    treninziTjedno: number;
    source: ProgramSource;
    status: string;
    clientId: string;
    trenerId?: string;
  };
  statistike: {
    ukupnoMezociklusa: number;
    manualnihMezociklusa: number;
    ukupnoSesija: number;
    manualnihSesija: number;
    ukupnoVjezbi: number;
    manualnihVjezbi: number;
  };
  mezociklusi: {
    id: string;
    naziv: string;
    tip: string;
    tjedanOd: number;
    tjedanDo: number;
    isManual: boolean;
    sesije: {
      id: string;
      tjedanBroj: number;
      danUTjednu: number;
      naziv: string;
      isManual: boolean;
      brojVjezbi: number;
    }[];
  }[];
}

/**
 * Dohvaća unified view programa (auto + manual zajedno)
 */
export async function dohvatiUnifiedProgramView(programId: string): Promise<UnifiedProgramView | null> {
  const supabase = getSupabase();
  
  // Dohvati program
  const { data: program, error: programError } = await supabase
    .from('training_programs')
    .select('*')
    .eq('id', programId)
    .single();
  
  if (programError || !program) {
    console.error('[ManualBuilder] Program nije pronađen:', programError);
    return null;
  }
  
  // Dohvati mezocikluse
  const { data: mezociklusi } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('program_id', programId)
    .order('order_index');
  
  // Dohvati sesije
  const { data: sesije } = await supabase
    .from('program_sessions')
    .select('*')
    .eq('program_id', programId)
    .order('week_number')
    .order('order_in_week');
  
  // Dohvati broj vježbi po sesiji
  const sessionIds = sesije?.map(s => s.id) || [];
  const { data: vjezbe } = await supabase
    .from('session_exercises')
    .select('id, session_id')
    .in('session_id', sessionIds.length > 0 ? sessionIds : ['']);
  
  // Grupiraj vježbe po sesiji
  const vjezbePoSesiji = new Map<string, { total: number; manual: number }>();
  for (const v of vjezbe || []) {
    const current = vjezbePoSesiji.get(v.session_id) || { total: 0, manual: 0 };
    current.total++;
    // is_manual može ne postojati, tada tretiramo kao false
    vjezbePoSesiji.set(v.session_id, current);
  }
  
  // Izračunaj statistike (is_manual stupac može ne postojati)
  const manualMezo = mezociklusi?.filter(m => m.is_manual === true).length || 0;
  const manualSesije = sesije?.filter(s => s.is_manual === true).length || 0;
  const ukupnoVjezbi = vjezbe?.length || 0;
  const manualnihVjezbi = 0; // Bez migracije ne možemo znati
  
  // Grupiraj sesije po mezociklusu
  const sesijePoMezo = new Map<string, typeof sesije>();
  for (const s of sesije || []) {
    const list = sesijePoMezo.get(s.mesocycle_id) || [];
    list.push(s);
    sesijePoMezo.set(s.mesocycle_id, list);
  }
  
  return {
    program: {
      id: program.id,
      naziv: program.name,
      cilj: program.goal,
      razina: program.level,
      splitTip: program.split_type,
      trajanjeTjedana: program.duration_weeks,
      treninziTjedno: program.sessions_per_week,
      source: program.source || 'auto',
      status: program.status,
      clientId: program.client_id,
      trenerId: program.trainer_id,
    },
    statistike: {
      ukupnoMezociklusa: mezociklusi?.length || 0,
      manualnihMezociklusa: manualMezo,
      ukupnoSesija: sesije?.length || 0,
      manualnihSesija: manualSesije,
      ukupnoVjezbi,
      manualnihVjezbi,
    },
    mezociklusi: (mezociklusi || []).map(m => ({
      id: m.id,
      naziv: m.name,
      tip: m.focus,
      tjedanOd: m.week_start,
      tjedanDo: m.week_end,
      isManual: m.is_manual || false,
      sesije: (sesijePoMezo.get(m.id) || []).map(s => ({
        id: s.id,
        tjedanBroj: s.week_number,
        danUTjednu: s.day_of_week,
        naziv: s.split_name,
        isManual: s.is_manual || false,
        brojVjezbi: vjezbePoSesiji.get(s.id)?.total || 0,
      })),
    })),
  };
}

// ============================================
// EXPORT
// ============================================

export default {
  kreirajManualniProgram,
  kreirajManualniMezociklus,
  azurirajMezociklus,
  obrisiMezociklus,
  kreirajManualnuSesiju,
  azurirajSesiju,
  obrisiSesiju,
  dodajManualuVjezbu,
  azurirajVjezbu,
  obrisiVjezbu,
  dohvatiUnifiedProgramView,
};

