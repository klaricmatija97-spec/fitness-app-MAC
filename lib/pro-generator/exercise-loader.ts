/**
 * PRO Training Generator - Exercise Loader
 * =========================================
 * Učitavanje i obrada vježbi iz lokalne baze podataka
 * Mapiranje na IFT parametre i HR nazive
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { VjezbaLibrary, VjezbaProširena, ObrazacPokreta } from './types';
import { MISICNA_GRUPA_PRIJEVOD, OPREMA_PRIJEVOD } from './constants';

// ============================================
// CACHE ZA VJEŽBE
// ============================================

let vjezbeCache: VjezbaProširena[] | null = null;
let vjezbeMapaPoId: Map<string, VjezbaProširena> | null = null;

// ============================================
// MAPIRANJE OBRAZACA POKRETA
// ============================================

/**
 * Određuje obrazac pokreta na temelju mišićnih grupa i tipa vježbe
 */
function odrediObrazacPokreta(vjezba: VjezbaLibrary): ObrazacPokreta {
  const { primaryMuscles, force, name } = vjezba;
  const nameLower = name.toLowerCase();
  
  // Provjera po imenu
  if (nameLower.includes('bench press') || nameLower.includes('push up') || nameLower.includes('chest press')) {
    return 'horizontal_push';
  }
  if (nameLower.includes('row') && !nameLower.includes('upright')) {
    return 'horizontal_pull';
  }
  if (nameLower.includes('overhead') || nameLower.includes('military') || nameLower.includes('shoulder press')) {
    return 'vertical_push';
  }
  if (nameLower.includes('pull up') || nameLower.includes('pulldown') || nameLower.includes('chin up') || nameLower.includes('lat pull')) {
    return 'vertical_pull';
  }
  if (nameLower.includes('squat') || nameLower.includes('leg press')) {
    return 'squat';
  }
  if (nameLower.includes('deadlift') || nameLower.includes('hip thrust') || nameLower.includes('good morning') || nameLower.includes('rdl')) {
    return 'hinge';
  }
  if (nameLower.includes('lunge') || nameLower.includes('split squat') || nameLower.includes('step up')) {
    return 'lunge';
  }
  if (nameLower.includes('carry') || nameLower.includes('farmer')) {
    return 'carry';
  }
  if (nameLower.includes('twist') || nameLower.includes('rotation') || nameLower.includes('woodchop')) {
    return 'rotation';
  }
  
  // Fallback na temelju mišićnih grupa
  const primaryMuscle = primaryMuscles[0]?.toLowerCase();
  
  if (primaryMuscle === 'chest' && force === 'push') return 'horizontal_push';
  if (primaryMuscle === 'chest' && force === 'pull') return 'horizontal_pull';
  if ((primaryMuscle === 'lats' || primaryMuscle === 'middle_back') && force === 'pull') return 'horizontal_pull';
  if (primaryMuscle === 'shoulders' && force === 'push') return 'vertical_push';
  if (primaryMuscle === 'quadriceps') return 'squat';
  if (primaryMuscle === 'hamstrings' || primaryMuscle === 'glutes') return 'hinge';
  
  return 'isolation';
}

/**
 * Određuje preporučeni rep range na temelju tipa vježbe
 */
function odrediRepRange(vjezba: VjezbaLibrary): string {
  const { mechanic, category, name } = vjezba;
  const nameLower = name.toLowerCase();
  
  // Compound vježbe - niži rep range
  if (mechanic === 'compound') {
    if (nameLower.includes('deadlift') || nameLower.includes('squat')) {
      return '5-8';
    }
    return '6-10';
  }
  
  // Stretching i plyometrics
  if (category === 'stretching') return '30-60s';
  if (category === 'plyometrics') return '5-10';
  
  // Isolation - viši rep range
  return '10-15';
}

/**
 * Određuje preporučene setove tjedno
 */
function odrediSetoveTjedno(vjezba: VjezbaLibrary): { min: number; max: number } {
  const { mechanic } = vjezba;
  
  if (mechanic === 'compound') {
    return { min: 3, max: 6 };  // Compound vježbe - manje setova jer više opterećuju
  }
  return { min: 2, max: 4 };  // Isolation vježbe
}

/**
 * Prevodi mišićnu grupu na hrvatski
 */
function prevedeMisicnuGrupu(grupa: string): string {
  const grupaLower = grupa.toLowerCase().replace(/\s+/g, '_');
  return MISICNA_GRUPA_PRIJEVOD[grupaLower] || grupaLower;
}

/**
 * Prevodi opremu na hrvatski
 */
function prevedeOpremu(oprema: string | null): string {
  if (!oprema) return 'bez_opreme';
  const opremaLower = oprema.toLowerCase();
  return OPREMA_PRIJEVOD[opremaLower] || opremaLower;
}

/**
 * Generira HR naziv vježbe (jednostavna transliteracija)
 */
function generirajHRNaziv(name: string): string {
  // Za sada vraćamo originalni naziv
  // TODO: Dodati pravu HR bazu naziva
  return name;
}

// ============================================
// GLAVNE FUNKCIJE
// ============================================

/**
 * Učitava sve vježbe iz JSON datoteke
 */
export async function ucitajVjezbe(): Promise<VjezbaProširena[]> {
  if (vjezbeCache) {
    return vjezbeCache;
  }
  
  try {
    // Putanja do JSON datoteke
    const jsonPath = path.join(process.cwd(), 'data', 'exercises', 'wrkout-database.json');
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const rawVjezbe: VjezbaLibrary[] = JSON.parse(jsonData);
    
    // Obogati svaku vježbu
    vjezbeCache = rawVjezbe.map(vjezba => ({
      ...vjezba,
      naziv_hr: generirajHRNaziv(vjezba.name),
      oprema_hr: prevedeOpremu(vjezba.equipment),
      primarne_grupe_hr: vjezba.primaryMuscles.map(prevedeMisicnuGrupu),
      sekundarne_grupe_hr: vjezba.secondaryMuscles.map(prevedeMisicnuGrupu),
      obrazac_pokreta: odrediObrazacPokreta(vjezba),
      preporuceni_rep_range: odrediRepRange(vjezba),
      preporuceni_setovi_tjedno: odrediSetoveTjedno(vjezba),
    }));
    
    // Kreiraj mapu za brzi pristup po ID-u
    vjezbeMapaPoId = new Map(vjezbeCache.map(v => [v.id, v]));
    
    console.log(`[ExerciseLoader] Učitano ${vjezbeCache.length} vježbi`);
    
    return vjezbeCache;
  } catch (error) {
    console.error('[ExerciseLoader] Greška pri učitavanju vježbi:', error);
    throw new Error('Ne mogu učitati exercise library');
  }
}

/**
 * Dohvaća vježbu po ID-u
 */
export async function dohvatiVjezbuPoId(id: string): Promise<VjezbaProširena | null> {
  if (!vjezbeMapaPoId) {
    await ucitajVjezbe();
  }
  return vjezbeMapaPoId?.get(id) || null;
}

/**
 * Filtrira vježbe po kriterijima
 */
export interface VjezbaFilteri {
  misicneGrupe?: string[];       // HR nazivi mišićnih grupa
  oprema?: string[];             // HR nazivi opreme
  razina?: ('beginner' | 'intermediate' | 'expert')[];
  tipMehanike?: ('compound' | 'isolation')[];
  kategorija?: string[];
  obrazacPokreta?: ObrazacPokreta[];
  iskljuciId?: string[];         // ID-evi za isključiti
}

export async function filtrirajVjezbe(filteri: VjezbaFilteri): Promise<VjezbaProširena[]> {
  const sveVjezbe = await ucitajVjezbe();
  
  return sveVjezbe.filter(vjezba => {
    // Filter po mišićnim grupama
    if (filteri.misicneGrupe && filteri.misicneGrupe.length > 0) {
      const imaGrupu = filteri.misicneGrupe.some(
        grupa => vjezba.primarne_grupe_hr.includes(grupa) || vjezba.sekundarne_grupe_hr.includes(grupa)
      );
      if (!imaGrupu) return false;
    }
    
    // Filter po opremi
    if (filteri.oprema && filteri.oprema.length > 0) {
      if (!filteri.oprema.includes(vjezba.oprema_hr)) return false;
    }
    
    // Filter po razini
    if (filteri.razina && filteri.razina.length > 0) {
      if (!filteri.razina.includes(vjezba.level)) return false;
    }
    
    // Filter po tipu mehanike
    if (filteri.tipMehanike && filteri.tipMehanike.length > 0) {
      if (vjezba.mechanic && !filteri.tipMehanike.includes(vjezba.mechanic)) return false;
    }
    
    // Filter po kategoriji
    if (filteri.kategorija && filteri.kategorija.length > 0) {
      if (!filteri.kategorija.includes(vjezba.category)) return false;
    }
    
    // Filter po obrascu pokreta
    if (filteri.obrazacPokreta && filteri.obrazacPokreta.length > 0) {
      if (!filteri.obrazacPokreta.includes(vjezba.obrazac_pokreta)) return false;
    }
    
    // Isključi određene ID-eve
    if (filteri.iskljuciId && filteri.iskljuciId.includes(vjezba.id)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Dohvaća vježbe za određenu mišićnu grupu, sortirane po prioritetu (compound prvo)
 */
export async function dohvatiVjezbeZaGrupu(
  grupa: string,
  opcije?: {
    oprema?: string[];
    razina?: ('beginner' | 'intermediate' | 'expert')[];
    maksVjezbi?: number;
    prioritetCompound?: boolean;
  }
): Promise<VjezbaProširena[]> {
  const filtrirane = await filtrirajVjezbe({
    misicneGrupe: [grupa],
    oprema: opcije?.oprema,
    razina: opcije?.razina,
    kategorija: ['strength'],  // Samo strength vježbe za glavni dio
  });
  
  // Sortiraj: compound prvo ako je prioritet
  if (opcije?.prioritetCompound !== false) {
    filtrirane.sort((a, b) => {
      if (a.mechanic === 'compound' && b.mechanic !== 'compound') return -1;
      if (a.mechanic !== 'compound' && b.mechanic === 'compound') return 1;
      return 0;
    });
  }
  
  // Ograniči broj
  if (opcije?.maksVjezbi) {
    return filtrirane.slice(0, opcije.maksVjezbi);
  }
  
  return filtrirane;
}

/**
 * Pronalazi alternative za vježbu (slična mišićna grupa i obrazac pokreta)
 */
export async function pronadiAlternative(
  vjezbaId: string,
  maksAlternativa: number = 3
): Promise<VjezbaProširena[]> {
  const vjezba = await dohvatiVjezbuPoId(vjezbaId);
  if (!vjezba) return [];
  
  const alternative = await filtrirajVjezbe({
    misicneGrupe: vjezba.primarne_grupe_hr,
    obrazacPokreta: [vjezba.obrazac_pokreta],
    iskljuciId: [vjezbaId],
  });
  
  return alternative.slice(0, maksAlternativa);
}

/**
 * Statistike učitanih vježbi
 */
export async function dohvatiStatistikeVjezbi(): Promise<{
  ukupno: number;
  poRazini: Record<string, number>;
  poKategoriji: Record<string, number>;
  poMehanici: Record<string, number>;
  poMisicnojGrupi: Record<string, number>;
}> {
  const vjezbe = await ucitajVjezbe();
  
  const poRazini: Record<string, number> = {};
  const poKategoriji: Record<string, number> = {};
  const poMehanici: Record<string, number> = {};
  const poMisicnojGrupi: Record<string, number> = {};
  
  for (const v of vjezbe) {
    // Po razini
    poRazini[v.level] = (poRazini[v.level] || 0) + 1;
    
    // Po kategoriji
    poKategoriji[v.category] = (poKategoriji[v.category] || 0) + 1;
    
    // Po mehanici
    const mech = v.mechanic || 'other';
    poMehanici[mech] = (poMehanici[mech] || 0) + 1;
    
    // Po mišićnoj grupi (primarne)
    for (const grupa of v.primarne_grupe_hr) {
      poMisicnojGrupi[grupa] = (poMisicnojGrupi[grupa] || 0) + 1;
    }
  }
  
  return {
    ukupno: vjezbe.length,
    poRazini,
    poKategoriji,
    poMehanici,
    poMisicnojGrupi,
  };
}

// ============================================
// EXPORT
// ============================================

export default {
  ucitajVjezbe,
  dohvatiVjezbuPoId,
  filtrirajVjezbe,
  dohvatiVjezbeZaGrupu,
  pronadiAlternative,
  dohvatiStatistikeVjezbi,
};

