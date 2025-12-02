/**
 * Script za preuzimanje vježbi iz wrkout/exercises.json GitHub repozitorija
 * Licenca: MIT - slobodno za korištenje
 * Izvor: https://github.com/wrkout/exercises.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface WrkoutExercise {
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
}

interface ProcessedExercise {
  id: string;
  name: string;
  nameHr?: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
}

const GITHUB_API = 'https://api.github.com/repos/wrkout/exercises.json/contents/exercises';
const RAW_BASE = 'https://raw.githubusercontent.com/wrkout/exercises.json/master/exercises';

async function fetchExerciseList(): Promise<string[]> {
  console.log('📋 Dohvaćam popis vježbi...');
  const response = await fetch(GITHUB_API);
  const data = await response.json();
  return data.map((item: { name: string }) => item.name);
}

async function fetchExercise(exerciseName: string): Promise<WrkoutExercise | null> {
  try {
    const url = `${RAW_BASE}/${encodeURIComponent(exerciseName)}/exercise.json`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`❌ Greška za ${exerciseName}:`, error);
    return null;
  }
}

function createId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

async function main() {
  console.log('🏋️ Wrkout Exercise Database Downloader');
  console.log('📜 Licenca: MIT (slobodno za korištenje)');
  console.log('🔗 Izvor: https://github.com/wrkout/exercises.json\n');

  // Dohvati popis svih vježbi
  const exerciseNames = await fetchExerciseList();
  console.log(`✅ Pronađeno ${exerciseNames.length} vježbi\n`);

  // Preuzmi svaku vježbu
  const exercises: ProcessedExercise[] = [];
  let processed = 0;

  for (const name of exerciseNames) {
    const exercise = await fetchExercise(name);
    if (exercise) {
      exercises.push({
        id: createId(exercise.name),
        ...exercise
      });
    }
    processed++;
    if (processed % 50 === 0) {
      console.log(`⏳ Obrađeno ${processed}/${exerciseNames.length}...`);
    }
  }

  console.log(`\n✅ Uspješno preuzeto ${exercises.length} vježbi`);

  // Spremi u JSON datoteku
  const outputDir = path.join(process.cwd(), 'data', 'exercises');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'wrkout-database.json');
  fs.writeFileSync(outputPath, JSON.stringify(exercises, null, 2));
  console.log(`💾 Spremljeno u: ${outputPath}`);

  // Statistika
  const categories = new Set(exercises.map(e => e.category));
  const muscles = new Set(exercises.flatMap(e => e.primaryMuscles));
  const equipment = new Set(exercises.filter(e => e.equipment).map(e => e.equipment));

  console.log('\n📊 Statistika:');
  console.log(`   Kategorija: ${categories.size} (${[...categories].join(', ')})`);
  console.log(`   Mišićnih grupa: ${muscles.size}`);
  console.log(`   Tipova opreme: ${equipment.size}`);
}

main().catch(console.error);

