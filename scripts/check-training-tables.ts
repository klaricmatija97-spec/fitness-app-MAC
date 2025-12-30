/**
 * Skripta za provjeru PRO Training tablica u Supabase-u
 * 
 * Pokreni: npx tsx scripts/check-training-tables.ts
 */

import { createServiceClient } from "../lib/supabase";

const supabase = createServiceClient();

const TABLES_TO_CHECK = [
  // Bazne tablice
  { name: 'clients', type: 'base' },
  { name: 'client_programs', type: 'base' },
  { name: 'training_plans', type: 'base' },
  { name: 'workout_sessions', type: 'base' },
  { name: 'workout_exercises', type: 'base' },
  
  // PRO Generator tablice
  { name: 'training_mesocycles', type: 'pro' },
  { name: 'training_weeks', type: 'pro' },
  { name: 'training_sessions', type: 'pro' },
  { name: 'training_session_exercises', type: 'pro' },
  { name: 'training_overrides', type: 'pro' },
  { name: 'training_templates', type: 'pro' },
];

async function checkTables() {
  console.log('\n🔍 PROVJERA TABLICA U SUPABASE-U\n');
  console.log('=' .repeat(60));
  
  const results: { name: string; exists: boolean; count?: number; type: string }[] = [];
  
  for (const table of TABLES_TO_CHECK) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        // Tablica ne postoji ili nema pristupa
        results.push({ name: table.name, exists: false, type: table.type });
      } else {
        results.push({ name: table.name, exists: true, count: count || 0, type: table.type });
      }
    } catch (err) {
      results.push({ name: table.name, exists: false, type: table.type });
    }
  }
  
  // Prikaži rezultate
  console.log('\n📊 BAZNE TABLICE:\n');
  results
    .filter(r => r.type === 'base')
    .forEach(r => {
      const status = r.exists ? '✅' : '❌';
      const countStr = r.exists ? ` (${r.count} zapisa)` : '';
      console.log(`  ${status} ${r.name}${countStr}`);
    });
  
  console.log('\n🆕 PRO GENERATOR TABLICE:\n');
  results
    .filter(r => r.type === 'pro')
    .forEach(r => {
      const status = r.exists ? '✅' : '❌';
      const countStr = r.exists ? ` (${r.count} zapisa)` : '';
      console.log(`  ${status} ${r.name}${countStr}`);
    });
  
  // Sažetak
  const proTables = results.filter(r => r.type === 'pro');
  const proExisting = proTables.filter(r => r.exists).length;
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📋 SAŽETAK:`);
  console.log(`   - Bazne tablice: ${results.filter(r => r.type === 'base' && r.exists).length}/${results.filter(r => r.type === 'base').length}`);
  console.log(`   - PRO tablice: ${proExisting}/${proTables.length}`);
  
  if (proExisting === proTables.length) {
    console.log('\n✅ SVE PRO TABLICE POSTOJE! Generator je spreman.\n');
  } else if (proExisting > 0) {
    console.log('\n⚠️  DJELOMIČNO KREIRANE PRO TABLICE. Pokreni migraciju.\n');
  } else {
    console.log('\n❌ PRO TABLICE NE POSTOJE. Pokreni: supabase-pro-training-migration.sql\n');
  }
  
  // Provjeri novo dodane stupce u training_plans
  console.log('🔍 Provjera novih stupaca u training_plans...\n');
  
  try {
    const { data, error } = await supabase
      .from('training_plans')
      .select('cilj, razina, split_tip, ukupno_tjedana, treninzi_tjedno')
      .limit(1);
    
    if (error) {
      console.log('❌ Novi stupci u training_plans NE POSTOJE\n');
      console.log('   Pokreni migraciju za dodavanje stupaca.\n');
    } else {
      console.log('✅ Novi stupci u training_plans POSTOJE!\n');
    }
  } catch (err) {
    console.log('❌ Greška pri provjeri training_plans stupaca\n');
  }
}

checkTables().catch(console.error);

