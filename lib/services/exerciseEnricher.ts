/**
 * Exercise Enricher - Obogaćuje vježbe podacima iz wrkout baze
 * 
 * Mapira naše vježbe na wrkout bazu i dodaje:
 * - Detaljne upute za izvođenje
 * - Sekundarne mišiće
 * - Razinu težine
 * - Tip pokreta (push/pull)
 */

import { 
  getAllExercises, 
  Exercise, 
  searchExercises,
  MUSCLE_TRANSLATIONS,
  EQUIPMENT_TRANSLATIONS,
  LEVEL_TRANSLATIONS
} from '../data/exercises-database';

// ============================================
// MAPIRANJE NAŠIH VJEŽBI NA WRKOUT BAZU
// ============================================

/**
 * Mapiranje imena naših vježbi na imena u wrkout bazi
 */
const EXERCISE_NAME_MAP: Record<string, string> = {
  // Prsa
  "Bench press": "Barbell Bench Press - Medium Grip",
  "Incline dumbbell press": "Incline Dumbbell Press",
  "Incline barbell press": "Barbell Incline Bench Press - Medium Grip",
  "Dumbbell bench press": "Dumbbell Bench Press",
  "Cable chest fly": "Cable Crossover",
  "Machine chest press": "Machine Bench Press",
  
  // Ramena
  "Overhead shoulder press": "Standing Military Press",
  "Shoulder press": "Dumbbell Shoulder Press",
  "Lateral raises": "Side Lateral Raise",
  "Front raises": "Front Dumbbell Raise",
  "Face pull": "Face Pull",
  
  // Leđa
  "Lat pulldown": "Wide-Grip Lat Pulldown",
  "Seated cable row": "Seated Cable Rows",
  "T-bar row": "T-Bar Row",
  "Pull-ups": "Pullups",
  "Barbell row": "Bent Over Barbell Row",
  "Dumbbell row": "One-Arm Dumbbell Row",
  "Reverse fly": "Seated Bent-Over Rear Delt Raise",
  "Shrugs": "Barbell Shrug",
  
  // Noge
  "Back squat": "Barbell Squat",
  "Front squat": "Front Barbell Squat",
  "Leg press": "Leg Press",
  "Romanian deadlift": "Romanian Deadlift",
  "Hack squat": "Hack Squat",
  "Leg extension": "Leg Extensions",
  "Leg curl": "Lying Leg Curls",
  "Hip thrust": "Barbell Hip Thrust",
  "Bulgarian split squat": "Single Leg Push-off",
  "Walking lunges": "Barbell Walking Lunge",
  "Calf raises": "Standing Calf Raises",
  "Goblet squat": "Goblet Squat",
  "Sumo deadlift": "Sumo Deadlift",
  
  // Ruke - Triceps
  "Triceps pushdown": "Triceps Pushdown",
  "Triceps rope pushdown": "Triceps Pushdown - Rope Attachment",
  "Overhead triceps extension": "Standing Overhead Barbell Triceps Extension",
  "Dips": "Dips - Triceps Version",
  
  // Ruke - Biceps
  "Barbell curls": "Barbell Curl",
  "Dumbbell curls": "Dumbbell Bicep Curl",
  "Hammer curls": "Hammer Curls",
  "Preacher curl": "Preacher Curl",
  "Cable curl": "Cable Hammer Curls - Rope Attachment",
  "Biceps curls": "Dumbbell Bicep Curl",
  
  // Core
  "Plank": "Plank",
  "Side plank": "Side Bridge",
  "Hanging leg raises": "Hanging Leg Raise",
  "Cable crunch": "Cable Crunch",
  
  // Gluteus
  "Cable glute kickbacks": "Glute Kickback",
  "Hip abductions": "Thigh Abductor",
  "Reverse lunges": "Dumbbell Rear Lunge",
  "Glute bridge": "Butt Lift (Bridge)",
  "Step-ups": "Barbell Step Ups",
};

// ============================================
// ENRICHMENT FUNCTIONS
// ============================================

export interface EnrichedExercise {
  name: string;
  nameHr: string;
  equipment: string;
  isPrimary: boolean;
  // Iz wrkout baze
  instructions?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  level?: string;
  force?: string;
  mechanic?: string;
  category?: string;
}

/**
 * Pronađi vježbu u wrkout bazi po imenu
 */
function findWrkoutExercise(exerciseName: string): Exercise | undefined {
  const allExercises = getAllExercises();
  
  // Prvo pokušaj direktno mapiranje
  const mappedName = EXERCISE_NAME_MAP[exerciseName];
  if (mappedName) {
    const found = allExercises.find(e => 
      e.name.toLowerCase() === mappedName.toLowerCase()
    );
    if (found) return found;
  }
  
  // Zatim pokušaj fuzzy search
  const searchTerm = exerciseName.toLowerCase().replace(/[-_]/g, ' ');
  return allExercises.find(e => 
    e.name.toLowerCase().includes(searchTerm) ||
    searchTerm.includes(e.name.toLowerCase().split(' ')[0])
  );
}

/**
 * Obogati jednu vježbu s podacima iz wrkout baze
 * Upute se automatski prevode na hrvatski
 */
export function enrichExercise(exercise: {
  name: string;
  nameHr: string;
  equipment?: string;
  isPrimary: boolean;
}): EnrichedExercise {
  const wrkoutExercise = findWrkoutExercise(exercise.name);
  
  if (wrkoutExercise) {
    return {
      ...exercise,
      equipment: exercise.equipment || wrkoutExercise.equipment || 'body only',
      instructions: wrkoutExercise.instructions.map(translateToHrvatski),
      primaryMuscles: wrkoutExercise.primaryMuscles.map(m => MUSCLE_TRANSLATIONS[m] || m),
      secondaryMuscles: wrkoutExercise.secondaryMuscles.map(m => MUSCLE_TRANSLATIONS[m] || m),
      level: wrkoutExercise.level,
      force: wrkoutExercise.force || undefined,
      mechanic: wrkoutExercise.mechanic || undefined,
      category: wrkoutExercise.category,
    };
  }
  
  return {
    ...exercise,
    equipment: exercise.equipment || 'body only',
  };
}

/**
 * Obogati niz vježbi
 */
export function enrichExercises(exercises: Array<{
  name: string;
  nameHr: string;
  equipment?: string;
  isPrimary: boolean;
}>): EnrichedExercise[] {
  return exercises.map(enrichExercise);
}

/**
 * Dohvati dodatne vježbe iz wrkout baze za određenu mišićnu grupu
 */
export function getAdditionalExercisesFromWrkout(
  muscle: string,
  count: number = 5,
  excludeNames: string[] = []
): Array<{
  name: string;
  nameHr: string;
  equipment: string;
  isPrimary: boolean;
  instructions: string[];
}> {
  // Mapiraj naše nazive mišića na wrkout nazive
  const muscleMap: Record<string, string> = {
    'chest': 'chest',
    'prsa': 'chest',
    'shoulders': 'shoulders',
    'ramena': 'shoulders',
    'back': 'lats',
    'leđa': 'lats',
    'legs': 'quadriceps',
    'noge': 'quadriceps',
    'triceps': 'triceps',
    'biceps': 'biceps',
    'core': 'abdominals',
    'trbušnjaci': 'abdominals',
    'glutes': 'glutes',
    'gluteus': 'glutes',
  };
  
  const wrkoutMuscle = muscleMap[muscle.toLowerCase()] || muscle;
  
  const exercises = searchExercises({
    muscle: wrkoutMuscle as any,
    category: 'strength',
  });
  
  // Filtriraj već korištene
  const filtered = exercises.filter(e => 
    !excludeNames.some(name => 
      e.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(e.name.toLowerCase().split(' ')[0])
    )
  );
  
  // Sortiraj po razini (beginner prvo)
  const sorted = filtered.sort((a, b) => {
    const levelOrder = { beginner: 0, intermediate: 1, expert: 2 };
    return (levelOrder[a.level] || 1) - (levelOrder[b.level] || 1);
  });
  
  return sorted.slice(0, count).map(e => ({
    name: e.name,
    nameHr: e.name, // TODO: dodati hrvatske prijevode
    equipment: e.equipment || 'body only',
    isPrimary: e.mechanic === 'compound',
    instructions: e.instructions,
  }));
}

/**
 * Statistika mapiranja
 */
export function getEnrichmentStats(): {
  totalMapped: number;
  totalInMap: number;
  mappedExercises: string[];
  unmappedExercises: string[];
} {
  const allExercises = getAllExercises();
  const mapped: string[] = [];
  const unmapped: string[] = [];
  
  for (const [ourName, wrkoutName] of Object.entries(EXERCISE_NAME_MAP)) {
    const found = allExercises.find(e => 
      e.name.toLowerCase() === wrkoutName.toLowerCase()
    );
    if (found) {
      mapped.push(ourName);
    } else {
      unmapped.push(ourName);
    }
  }
  
  return {
    totalMapped: mapped.length,
    totalInMap: Object.keys(EXERCISE_NAME_MAP).length,
    mappedExercises: mapped,
    unmappedExercises: unmapped,
  };
}

// ============================================
// PRIJEVOD INSTRUKCIJA NA HRVATSKI
// ============================================

/**
 * Kompletni rječnik za prijevod fitness instrukcija
 * Sortirano po duljini (dulje fraze prvo) za pravilno zamjenjivanje
 */
const FITNESS_DICTIONARY: [string, string][] = [
  // Dulje fraze prvo
  ['This will be your starting position', 'Ovo je tvoj početni položaj'],
  ['Return to the starting position', 'Vrati se u početni položaj'],
  ['Repeat for the recommended amount of repetitions', 'Ponovi preporučeni broj ponavljanja'],
  ['Repeat the movement for the prescribed amount of repetitions', 'Ponovi pokret za zadani broj ponavljanja'],
  ['starting position', 'početni položaj'],
  ['shoulder width apart', 'u širini ramena'],
  ['shoulder-width apart', 'u širini ramena'],
  ['shoulder width', 'širina ramena'],
  ['hip width', 'širina kukova'],
  ['at a 90 degree angle', 'pod kutom od 90 stupnjeva'],
  ['90-degree angle', 'kut od 90 stupnjeva'],
  ['90 degree angle', 'kut od 90 stupnjeva'],
  ['breathe out', 'izdahni'],
  ['breathe in', 'udahni'],
  ['as you breathe out', 'dok izdišeš'],
  ['as you breathe in', 'dok udišeš'],
  ['upper arms', 'nadlaktice'],
  ['lower back', 'donji dio leđa'],
  ['upper back', 'gornji dio leđa'],
  ['middle back', 'srednji dio leđa'],
  ['lower body', 'donji dio tijela'],
  ['upper body', 'gornji dio tijela'],
  ['full extension', 'puna ekstenzija'],
  ['full contraction', 'puna kontrakcija'],
  ['controlled manner', 'kontrolirano'],
  ['controlled motion', 'kontroliran pokret'],
  ['slow and controlled', 'polako i kontrolirano'],
  ['maintain a straight back', 'drži leđa ravno'],
  ['keep your back straight', 'drži leđa ravno'],
  ['keep your core tight', 'drži trup čvrsto'],
  ['engage your core', 'aktiviraj trup'],
  ['squeeze at the top', 'stisni na vrhu'],
  ['pause at the top', 'pauziraj na vrhu'],
  ['at the top of the movement', 'na vrhu pokreta'],
  ['at the bottom of the movement', 'na dnu pokreta'],
  ['range of motion', 'opseg pokreta'],
  ['full range of motion', 'puni opseg pokreta'],
  ['without locking', 'bez zaključavanja'],
  ['lock your arms', 'zaključaj ruke'],
  ['arms locked', 'ruke zaključane'],
  ['locked out', 'zaključano'],
  ['body weight', 'vlastita težina'],
  ['your own body weight', 'vlastita težina tijela'],
  
  // Glagoli i akcije
  ['Lie back', 'Lezi na leđa'],
  ['Lie down', 'Lezi'],
  ['Lie flat', 'Lezi ravno'],
  ['Lie on your back', 'Lezi na leđa'],
  ['Lie face down', 'Lezi na trbuh'],
  ['Stand up', 'Ustani'],
  ['Stand with', 'Stani s'],
  ['Sit down', 'Sjedi'],
  ['Sit on', 'Sjedi na'],
  ['Kneel down', 'Klekni'],
  ['Kneel on', 'Klekni na'],
  ['Bend your knees', 'Savij koljena'],
  ['Bend your elbows', 'Savij laktove'],
  ['Bend at the waist', 'Savij se u struku'],
  ['Bend at the hips', 'Savij se u kukovima'],
  ['Extend your arms', 'Ispruži ruke'],
  ['Extend your legs', 'Ispruži noge'],
  ['Fully extend', 'Potpuno ispruži'],
  ['Lower the weight', 'Spusti uteg'],
  ['Lower the bar', 'Spusti šipku'],
  ['Lower yourself', 'Spusti se'],
  ['Raise the weight', 'Podigni uteg'],
  ['Raise your arms', 'Podigni ruke'],
  ['Raise your legs', 'Podigni noge'],
  ['Lift the weight', 'Podigni uteg'],
  ['Lift the bar', 'Podigni šipku'],
  ['Push the weight', 'Gurni uteg'],
  ['Push up', 'Gurni gore'],
  ['Push through', 'Gurni kroz'],
  ['Pull the weight', 'Povuci uteg'],
  ['Pull towards', 'Povuci prema'],
  ['Pull back', 'Povuci natrag'],
  ['Squeeze the muscle', 'Stisni mišić'],
  ['Squeeze your glutes', 'Stisni gluteuse'],
  ['Contract the muscle', 'Kontrahiraj mišić'],
  ['Hold the position', 'Drži položaj'],
  ['Hold for a second', 'Drži sekundu'],
  ['Hold at the top', 'Drži na vrhu'],
  ['Pause briefly', 'Kratko pauziraj'],
  ['Pause for a second', 'Pauziraj sekundu'],
  ['After a brief pause', 'Nakon kratke pauze'],
  ['Return slowly', 'Polako se vrati'],
  ['Slowly return', 'Polako se vrati'],
  ['Slowly lower', 'Polako spusti'],
  ['Slowly raise', 'Polako podigni'],
  ['Repeat the movement', 'Ponovi pokret'],
  ['Repeat for', 'Ponovi za'],
  ['Focus on', 'Fokusiraj se na'],
  ['Make sure', 'Pobrini se'],
  ['Be sure to', 'Obavezno'],
  ['Keep your', 'Drži svoj/svoju'],
  ['Maintain', 'Održavaj'],
  ['Avoid', 'Izbjegavaj'],
  ['Do not', 'Nemoj'],
  ["Don't", 'Nemoj'],
  
  // Imenice - dijelovi tijela
  ['forearms', 'podlaktice'],
  ['upper arms', 'nadlaktice'],
  ['biceps', 'biceps'],
  ['triceps', 'triceps'],
  ['shoulders', 'ramena'],
  ['shoulder', 'rame'],
  ['chest', 'prsa'],
  ['pectorals', 'prsni mišići'],
  ['back', 'leđa'],
  ['lats', 'latissimus'],
  ['trapezius', 'trapezius'],
  ['traps', 'trapezius'],
  ['core', 'trup'],
  ['abs', 'trbušnjaci'],
  ['abdominals', 'trbušnjaci'],
  ['obliques', 'kosi trbušni'],
  ['glutes', 'gluteusi'],
  ['gluteus', 'gluteus'],
  ['hamstrings', 'stražnja loža'],
  ['quadriceps', 'kvadriceps'],
  ['quads', 'kvadriceps'],
  ['calves', 'listovi'],
  ['thighs', 'bedra'],
  ['hips', 'kukovi'],
  ['hip', 'kuk'],
  ['waist', 'struk'],
  ['torso', 'trup'],
  ['spine', 'kralježnica'],
  ['neck', 'vrat'],
  ['head', 'glava'],
  ['elbows', 'laktovi'],
  ['elbow', 'lakat'],
  ['wrists', 'zapešća'],
  ['wrist', 'zapešće'],
  ['knees', 'koljena'],
  ['knee', 'koljeno'],
  ['ankles', 'gležnjevi'],
  ['ankle', 'gležanj'],
  ['feet', 'stopala'],
  ['foot', 'stopalo'],
  ['toes', 'prsti nogu'],
  ['heels', 'pete'],
  ['heel', 'peta'],
  ['hands', 'šake'],
  ['hand', 'šaka'],
  ['fingers', 'prsti'],
  ['palms', 'dlanovi'],
  ['palm', 'dlan'],
  ['arms', 'ruke'],
  ['arm', 'ruka'],
  ['legs', 'noge'],
  ['leg', 'noga'],
  
  // Imenice - oprema
  ['barbell', 'šipka'],
  ['dumbbell', 'bučica'],
  ['dumbbells', 'bučice'],
  ['kettlebell', 'kettlebell'],
  ['cable', 'kabel'],
  ['cables', 'kablovi'],
  ['machine', 'sprava'],
  ['bench', 'klupa'],
  ['flat bench', 'ravna klupa'],
  ['incline bench', 'kosa klupa'],
  ['decline bench', 'obrnuto kosa klupa'],
  ['rack', 'stalak'],
  ['bar', 'šipka'],
  ['weight', 'uteg'],
  ['weights', 'utezi'],
  ['plate', 'ploča'],
  ['plates', 'ploče'],
  ['resistance', 'otpor'],
  ['handle', 'ručka'],
  ['handles', 'ručke'],
  ['attachment', 'nastavak'],
  ['rope', 'uže'],
  ['pulley', 'kolotur'],
  ['pad', 'jastučić'],
  ['pads', 'jastučići'],
  ['floor', 'pod'],
  ['mat', 'prostirka'],
  
  // Pridjevi i prilozi
  ['straight', 'ravno'],
  ['bent', 'savijeno'],
  ['locked', 'zaključano'],
  ['fully', 'potpuno'],
  ['slightly', 'blago'],
  ['slowly', 'polako'],
  ['quickly', 'brzo'],
  ['controlled', 'kontrolirano'],
  ['explosive', 'eksplozivno'],
  ['smooth', 'glatko'],
  ['steady', 'stabilno'],
  ['tight', 'čvrsto'],
  ['relaxed', 'opušteno'],
  ['parallel', 'paralelno'],
  ['perpendicular', 'okomito'],
  ['horizontal', 'horizontalno'],
  ['vertical', 'vertikalno'],
  ['forward', 'naprijed'],
  ['backward', 'natrag'],
  ['upward', 'prema gore'],
  ['downward', 'prema dolje'],
  ['inward', 'prema unutra'],
  ['outward', 'prema van'],
  ['wide', 'široko'],
  ['narrow', 'usko'],
  ['overhand', 'nadlaktični hvat'],
  ['underhand', 'podlaktični hvat'],
  ['neutral', 'neutralni hvat'],
  ['pronated', 'pronirani hvat'],
  ['supinated', 'supinirani hvat'],
  
  // Ostalo
  ['grip', 'hvat'],
  ['position', 'položaj'],
  ['movement', 'pokret'],
  ['motion', 'pokret'],
  ['exercise', 'vježba'],
  ['set', 'serija'],
  ['sets', 'serije'],
  ['rep', 'ponavljanje'],
  ['reps', 'ponavljanja'],
  ['repetition', 'ponavljanje'],
  ['repetitions', 'ponavljanja'],
  ['contraction', 'kontrakcija'],
  ['extension', 'ekstenzija'],
  ['flexion', 'fleksija'],
  ['rotation', 'rotacija'],
  ['squeeze', 'stiskanje'],
  ['stretch', 'istezanje'],
  ['tension', 'napetost'],
  ['resistance', 'otpor'],
  ['peak', 'vrhunac'],
  ['starting', 'početni'],
  ['ending', 'završni'],
  ['Tip:', 'Savjet:'],
  ['Caution:', 'Oprez:'],
  ['Note:', 'Napomena:'],
  ['Variation:', 'Varijacija:'],
  // Dodatne fraze
  ['using a', 'koristeći'],
  ['using your', 'koristeći svoje'],
  ['until the', 'dok'],
  ['from the', 'iz'],
  ['to the', 'do'],
  ['in the', 'u'],
  ['on the', 'na'],
  ['at the', 'na'],
  ['with your', 'sa svojim'],
  ['of the', ''],
  ['and then', 'i zatim'],
  ['as you', 'dok'],
  ['you are', 'si'],
  ['should take', 'treba trajati'],
  ['about twice', 'otprilike dvostruko'],
  ['as long as', 'koliko i'],
  ['touches your', 'dodirne tvoja'],
  ['begin coming', 'počni se spuštati'],
  ['coming down', 'spuštanje'],
  ['start coming', 'počni se'],
  ['place the', 'vrati'],
  ['done', 'gotov'],
  ['When you', 'Kada'],
  ['that creates', 'koji stvara'],
  ['between the', 'između'],
  ['muscles', 'mišiće'],
  ['middle', 'sredinu'],
  ['long', 'dugo'],
  ['again', 'ponovno'],
  ['Ideally', 'Idealno'],
  ['pushing', 'guranja'],
  ['lowering', 'spuštanje'],
  ['raising', 'podizanje'],
  ['contracted', 'kontrahiranom'],
  ['over you', 'iznad tebe'],
  ['Using', 'Koristeći'],
  ['width', 'širine'],
  ['medium', 'srednje'],
  ['flat', 'ravnu'],
];

/**
 * Prevedi engleski tekst na hrvatski koristeći rječnik
 */
export function translateToHrvatski(text: string): string {
  let translated = text;
  
  // Primijeni prijevode - samo cijele riječi/fraze (s word boundaries)
  for (const [eng, hr] of FITNESS_DICTIONARY) {
    // Preskoči prazne stringove i kratke riječi koje mogu uzrokovati probleme
    if (!eng || eng.length < 2) continue;
    
    // Escape special regex characters
    const escaped = eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Koristi word boundaries samo za riječi, ne za fraze s razmakom
    const regex = eng.includes(' ') 
      ? new RegExp(escaped, 'gi')
      : new RegExp(`\\b${escaped}\\b`, 'gi');
    
    translated = translated.replace(regex, hr);
  }
  
  // Očisti višestruke razmake
  translated = translated.replace(/\s+/g, ' ').trim();
  
  // Prvo slovo veliko
  if (translated.length > 0) {
    translated = translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  
  return translated;
}

/**
 * Prevedi niz instrukcija
 */
export function translateInstructions(instructions: string[]): string[] {
  return instructions.map(translateToHrvatski);
}

