/**
 * PRO Training Generator API
 * ==========================
 * POST /api/training/generate
 * 
 * Generira kompletan program treninga prema IFT metodici
 * Sprema u Supabase tablice:
 * - training_plans
 * - training_mesocycles
 * - training_weeks
 * - training_sessions
 * - training_session_exercises
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildProgram,
  spremiProgram,
  dohvatiLogove,
  type GeneratorInput,
} from '@/lib/pro-generator';

// ============================================
// VALIDACIJA SCHEMA
// ============================================

const GeneratorInputSchema = z.object({
  // Obavezni parametri
  clientId: z.string().uuid({ message: 'clientId mora biti validan UUID' }),
  cilj: z.enum(['hipertrofija', 'maksimalna_snaga', 'misicna_izdrzljivost', 'rekreacija_zdravlje'], {
    message: 'cilj mora biti: hipertrofija, maksimalna_snaga, misicna_izdrzljivost ili rekreacija_zdravlje',
  }),
  razina: z.enum(['pocetnik', 'srednji', 'napredni'], {
    message: 'razina mora biti: pocetnik, srednji ili napredni',
  }),
  treninziTjedno: z.number().int().min(2, { message: 'treninziTjedno mora biti najmanje 2' }).max(6, { message: 'treninziTjedno mora biti najviše 6' }),
  trajanjeTjedana: z.number().int().min(4, { message: 'trajanjeTjedana mora biti najmanje 4' }).max(12, { message: 'trajanjeTjedana mora biti najviše 12' }),
  
  // Opcionalni parametri
  trenerId: z.string().uuid().optional(),
  splitTip: z.enum(['full_body', 'upper_lower', 'push_pull_legs', 'body_part_split']).optional(),
  dostupnaOprema: z.array(z.string()).optional(),
  izbjegavajVjezbe: z.array(z.string()).optional(),
  fokusiraneGrupe: z.array(z.string()).optional(),
  ozljede: z.array(z.string()).optional(),
  maksCiljanoTrajanje: z.number().int().min(30).max(120).optional(),
  napomeneTrenera: z.string().max(1000).optional(),
});

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Parsiraj i validiraj body
    const body = await request.json();
    
    const parseResult = GeneratorInputSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(e => ({
        polje: e.path.join('.'),
        poruka: e.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: 'Validacija nije prošla',
          detalji: errors,
        },
        { status: 400 }
      );
    }
    
    const input: GeneratorInput = parseResult.data;
    
    console.log(`[API] Generiram program za klijenta ${input.clientId}`, {
      cilj: input.cilj,
      razina: input.razina,
      treninziTjedno: input.treninziTjedno,
      trajanjeTjedana: input.trajanjeTjedana,
    });
    
    // 2. Generiraj program
    const program = await buildProgram(input);
    
    // 3. Spremi u bazu
    const saveResult = await spremiProgram(program);
    
    if (!saveResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Greška pri spremanju programa',
          detalji: saveResult.error,
        },
        { status: 500 }
      );
    }
    
    // 4. Dohvati logove (za debug)
    const logovi = process.env.DEBUG_TRAINING_GENERATOR === 'true' ? dohvatiLogove() : [];
    
    const endTime = Date.now();
    const trajanje = endTime - startTime;
    
    console.log(`[API] Program uspješno generiran i spremljen`, {
      programId: saveResult.programId,
      trajanje: `${trajanje}ms`,
      brojMezociklusa: program.mezociklusi.length,
      ukupnoTreninga: program.mezociklusi.reduce((sum, m) => 
        sum + m.tjedni.reduce((tSum, t) => tSum + t.treninzi.length, 0), 0
      ),
    });
    
    // 5. Vrati odgovor
    return NextResponse.json({
      success: true,
      data: {
        programId: saveResult.programId,
        naziv: program.planName,
        cilj: program.cilj,
        razina: program.razina,
        splitTip: program.splitTip,
        ukupnoTjedana: program.ukupnoTjedana,
        treninziTjedno: program.treninziTjedno,
        brojMezociklusa: program.mezociklusi.length,
        validacija: program.validacijaRezultat,
        generatorVerzija: program.generatorVerzija,
      },
      meta: {
        trajanje: `${trajanje}ms`,
        logovi: logovi.length > 0 ? logovi : undefined,
      },
    });
    
  } catch (error) {
    console.error('[API] Greška:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Nepoznata greška';
    
    return NextResponse.json(
      {
        success: false,
        error: 'Interna greška servera',
        detalji: errorMessage,
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET HANDLER - Info o endpointu
// ============================================

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/training/generate',
    opis: 'PRO Training Generator - Generira kompletan program treninga prema IFT metodici',
    verzija: '1.0.0',
    parametri: {
      obavezni: {
        clientId: 'UUID - ID klijenta za kojeg se generira program',
        cilj: 'enum - hipertrofija | maksimalna_snaga | misicna_izdrzljivost | rekreacija_zdravlje',
        razina: 'enum - pocetnik | srednji | napredni',
        treninziTjedno: 'number - 2-6 treninga tjedno',
        trajanjeTjedana: 'number - 4-12 tjedana',
      },
      opcionalni: {
        trenerId: 'UUID - ID trenera koji kreira program',
        splitTip: 'enum - full_body | upper_lower | push_pull_legs | body_part_split',
        dostupnaOprema: 'string[] - Lista dostupne opreme',
        izbjegavajVjezbe: 'string[] - ID-evi vježbi za izbjegavanje',
        fokusiraneGrupe: 'string[] - Prioritetne mišićne grupe',
        ozljede: 'string[] - Ozljede za izbjegavanje',
        maksCiljanoTrajanje: 'number - Max minuta po treningu (30-120)',
        napomeneTrenera: 'string - Napomene trenera (max 1000 znakova)',
      },
    },
    primjer: {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      cilj: 'hipertrofija',
      razina: 'srednji',
      treninziTjedno: 4,
      trajanjeTjedana: 8,
      splitTip: 'upper_lower',
      napomeneTrenera: 'Fokus na snagu',
    },
  });
}
