/**
 * Fill Program Gaps API
 * =====================
 * POST /api/training/fill-gaps
 * 
 * Hybrid generator - popunjava prazne dijelove postojećeg programa
 * NIKAD ne prepisuje manual input
 * 
 * Automatski dohvaća config iz programa - potreban je samo programId!
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase';

// ============================================
// VALIDATION SCHEMA
// ============================================

const FillGapsSchema = z.object({
  programId: z.string().uuid({ message: 'programId mora biti validan UUID' }),
  popuniSamo: z.enum(['mezocikluse', 'sesije', 'vjezbe', 'sve']).optional(),
});

// ============================================
// POST - Popuni praznine u programu
// ============================================

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  
  try {
    const body = await request.json();
    const parseResult = FillGapsSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validacija nije prošla',
        detalji: parseResult.error.issues,
      }, { status: 400 });
    }
    
    const { programId, popuniSamo } = parseResult.data;
    
    // 1. Dohvati program iz baze
    const { data: programData, error: programError } = await supabase
      .from('training_programs')
      .select('*')
      .eq('id', programId)
      .single();
    
    if (programError || !programData) {
      return NextResponse.json({
        success: false,
        error: `Program ${programId} ne postoji`,
      }, { status: 404 });
    }
    
    // 2. Dohvati postojeće mezocikluse
    const { data: existingMesocycles, error: mesocyclesError } = await supabase
      .from('mesocycles')
      .select('*, program_sessions(*)')
      .eq('program_id', programId)
      .order('order_index');
    
    if (mesocyclesError) {
      return NextResponse.json({
        success: false,
        error: `Greška pri dohvatu mezociklusa: ${mesocyclesError.message}`,
      }, { status: 500 });
    }
    
    // 3. Analiziraj praznine
    const ukupnoTjedana = programData.duration_weeks;
    const treninziTjedno = programData.sessions_per_week;
    
    let dodanoMezociklusa = 0;
    let dodanoSesija = 0;
    let dodanoVjezbi = 0;
    
    // Pronađi koje tjedne pokrivaju postojeći mezociklusi
    const pokrivenTjedni = new Set<number>();
    for (const m of existingMesocycles || []) {
      for (let t = m.week_start; t <= m.week_end; t++) {
        pokrivenTjedni.add(t);
      }
    }
    
    // Koji tjedni fale?
    const faleTjedni: number[] = [];
    for (let t = 1; t <= ukupnoTjedana; t++) {
      if (!pokrivenTjedni.has(t)) {
        faleTjedni.push(t);
      }
    }
    
    // 4. Ako fale mezociklusi, kreiraj ih
    if ((popuniSamo === 'mezocikluse' || popuniSamo === 'sve' || !popuniSamo) && faleTjedni.length > 0) {
      // Grupiraj uzastopne tjedne u mezocikluse
      const grupe: number[][] = [];
      let trenutnaGrupa: number[] = [];
      
      for (let i = 0; i < faleTjedni.length; i++) {
        if (trenutnaGrupa.length === 0) {
          trenutnaGrupa.push(faleTjedni[i]);
        } else if (faleTjedni[i] === trenutnaGrupa[trenutnaGrupa.length - 1] + 1) {
          trenutnaGrupa.push(faleTjedni[i]);
        } else {
          grupe.push([...trenutnaGrupa]);
          trenutnaGrupa = [faleTjedni[i]];
        }
      }
      if (trenutnaGrupa.length > 0) {
        grupe.push(trenutnaGrupa);
      }
      
      // Kreiraj mezociklus za svaku grupu
      const postojeciBroj = existingMesocycles?.length || 0;
      for (let i = 0; i < grupe.length; i++) {
        const grupa = grupe[i];
        const weekStart = Math.min(...grupa);
        const weekEnd = Math.max(...grupa);
        
        const mesocycleId = crypto.randomUUID();
        const { error } = await supabase
          .from('mesocycles')
          .insert({
            id: mesocycleId,
            program_id: programId,
            name: `Auto-Mezociklus ${postojeciBroj + i + 1}`,
            order_index: postojeciBroj + i + 1,
            week_start: weekStart,
            week_end: weekEnd,
            focus: 'volume', // Default
            progression_type: 'linear',
            target_rpe_start: 6,
            target_rpe_end: 8,
            volume_modifier: 1.0,
            intensity_modifier: 1.0,
            description: `Automatski generirani mezociklus za tjedne ${weekStart}-${weekEnd}`,
          });
        
        if (!error) {
          dodanoMezociklusa++;
        }
      }
    }
    
    // 5. Popuni sesije ako fale
    if (popuniSamo === 'sesije' || popuniSamo === 'sve' || !popuniSamo) {
      // Dohvati sve mezocikluse (uključujući novo kreirane)
      const { data: allMesocycles } = await supabase
        .from('mesocycles')
        .select('*')
        .eq('program_id', programId)
        .order('order_index');
      
      for (const m of allMesocycles || []) {
        // Provjeri koje sesije već postoje
        const { data: existingSessions } = await supabase
          .from('program_sessions')
          .select('week_number, order_in_week')
          .eq('mesocycle_id', m.id);
        
        const postojeceSesije = new Set(
          (existingSessions || []).map(s => `${s.week_number}-${s.order_in_week}`)
        );
        
        // Kreiraj sesije koje fale
        for (let tjedan = m.week_start; tjedan <= m.week_end; tjedan++) {
          for (let dan = 1; dan <= treninziTjedno; dan++) {
            const kljuc = `${tjedan}-${dan}`;
            if (!postojeceSesije.has(kljuc)) {
              const sessionId = crypto.randomUUID();
              const { error } = await supabase
                .from('program_sessions')
                .insert({
                  id: sessionId,
                  program_id: programId,
                  mesocycle_id: m.id,
                  week_number: tjedan,
                  day_of_week: dan,
                  order_in_week: dan,
                  session_type: 'strength',
                  split_name: `Auto-Trening ${dan}`,
                  warmup_protocol: 'Standardno zagrijavanje 5-10 min',
                  cooldown_protocol: 'Istezanje 5-10 min',
                  target_rpe: 7,
                  estimated_duration_minutes: programData.session_duration_minutes || 60,
                  estimated_total_sets: 0,
                  trainer_locked: false,
                });
              
              if (!error) {
                dodanoSesija++;
              }
            }
          }
        }
      }
    }
    
    // 6. Popuni vježbe ako fale
    if (popuniSamo === 'vjezbe' || popuniSamo === 'sve' || !popuniSamo) {
      // Dohvati sve sesije bez vježbi
      const { data: sessionsWithoutExercises } = await supabase
        .from('program_sessions')
        .select(`
          id,
          session_exercises(id)
        `)
        .eq('program_id', programId);
      
      const prazeSesije = (sessionsWithoutExercises || [])
        .filter(s => !s.session_exercises || s.session_exercises.length === 0);
      
      if (prazeSesije.length > 0) {
        // Učitaj exercise library
        const fs = await import('fs');
        const path = await import('path');
        const exercisePath = path.join(process.cwd(), 'data', 'exercises', 'wrkout-database.json');
        const exerciseData = JSON.parse(fs.readFileSync(exercisePath, 'utf-8'));
        const exercises = Array.isArray(exerciseData) ? exerciseData : (exerciseData.exercises || []);
        
        // Dodaj osnovne vježbe za svaku praznu sesiju
        for (const sesija of prazeSesije) {
          // Odaberi 6-8 vježbi
          const brojVjezbi = Math.min(8, exercises.length);
          const odabraneVjezbe = exercises
            .sort(() => Math.random() - 0.5)
            .slice(0, brojVjezbi);
          
          for (let i = 0; i < odabraneVjezbe.length; i++) {
            const v = odabraneVjezbe[i];
            const { error } = await supabase
              .from('session_exercises')
              .insert({
                id: crypto.randomUUID(),
                session_id: sesija.id,
                exercise_id: v.id,
                exercise_name: v.name,
                exercise_name_hr: v.name_hr || v.name,
                order_index: i + 1,
                sets: 3,
                reps_target: '8-12',
                tempo: '2-0-1-0',
                rest_seconds: 90,
                target_rpe: 7,
                target_rir: 2,
                primary_muscles: v.primaryMuscles || [],
                secondary_muscles: v.secondaryMuscles || [],
                equipment: v.equipment || null,
                mechanic: v.mechanic || null,
              });
            
            if (!error) {
              dodanoVjezbi++;
            } else {
              console.error('[fill-gaps] Greška pri dodavanju vježbe:', error.message);
            }
          }
        }
      }
    }
    
    // 7. Ažuriraj source na 'hybrid' ako smo nešto dodali
    if (dodanoMezociklusa > 0 || dodanoSesija > 0 || dodanoVjezbi > 0) {
      // Pokušaj ažurirati source ako stupac postoji
      await supabase
        .from('training_programs')
        .update({ source: 'hybrid' } as any)
        .eq('id', programId);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        dodanoMezociklusa,
        dodanoSesija,
        dodanoVjezbi,
        poruka: `Popunjeno: ${dodanoMezociklusa} mezociklusa, ${dodanoSesija} sesija, ${dodanoVjezbi} vježbi`,
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Nepoznata greška',
    }, { status: 500 });
  }
}

// ============================================
// GET - Info
// ============================================

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/training/fill-gaps',
    opis: 'Hybrid generator - popunjava prazne dijelove postojećeg programa bez prepisivanja manualnih komponenti',
    napomena: 'NIKAD ne prepisuje is_manual=true komponente',
    parametri: {
      programId: 'UUID postojećeg programa (obavezno)',
      popuniSamo: 'mezocikluse | sesije | vjezbe | sve (default: sve)',
    },
    automatski_dohvat: 'Svi ostali parametri (cilj, razina, trajanje...) dohvaćaju se iz postojećeg programa',
    workflow: {
      korak1: 'Trener kreira prazan program (POST /api/training/manual/program)',
      korak2: 'Trener dodaje neke mezocikluse ručno (POST /api/training/manual/mesocycle)',
      korak3: 'Trener poziva fill-gaps da popuni ostatak automatski',
      rezultat: 'Program postaje HYBRID - kombinacija manual + auto',
    },
  });
}
