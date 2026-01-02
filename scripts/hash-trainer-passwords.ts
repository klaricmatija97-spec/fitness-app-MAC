/**
 * Hash Trainer Passwords Script
 * =============================
 * Skripta za hashiranje plain-text lozinki postojećih trenera
 * 
 * UPUTE:
 * 1. Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env
 * 2. Pokreni: npx tsx scripts/hash-trainer-passwords.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SALT_ROUNDS = 10;

// Default lozinka za trenere bez lozinke
const DEFAULT_PASSWORD = 'ChangeMe123!';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔐 Hashiranje lozinki trenera...\n');

  // Dohvati sve trenere
  const { data: trainers, error: fetchError } = await supabase
    .from('trainers')
    .select('id, email, name, password_hash');

  if (fetchError) {
    console.error('❌ Greška pri dohvaćanju trenera:', fetchError);
    process.exit(1);
  }

  if (!trainers || trainers.length === 0) {
    console.log('ℹ️  Nema trenera u bazi');
    return;
  }

  console.log(`📋 Pronađeno ${trainers.length} trenera\n`);

  let updated = 0;
  let alreadyHashed = 0;
  let errors = 0;

  for (const trainer of trainers) {
    const { id, email, name, password_hash } = trainer;

    // Provjeri je li lozinka već hashirana (bcrypt hash počinje s $2)
    if (password_hash && password_hash.startsWith('$2')) {
      console.log(`✅ ${email} - već ima hashiranu lozinku`);
      alreadyHashed++;
      continue;
    }

    // Ako nema lozinku ili ima plain-text, hashiraj
    const passwordToHash = password_hash || DEFAULT_PASSWORD;
    
    try {
      const hashedPassword = await bcrypt.hash(passwordToHash, SALT_ROUNDS);

      const { error: updateError } = await supabase
        .from('trainers')
        .update({ password_hash: hashedPassword })
        .eq('id', id);

      if (updateError) {
        console.error(`❌ ${email} - greška pri ažuriranju:`, updateError);
        errors++;
      } else {
        if (password_hash) {
          console.log(`🔄 ${email} - plain-text lozinka hashirana`);
        } else {
          console.log(`🆕 ${email} - postavljena default lozinka (${DEFAULT_PASSWORD})`);
        }
        updated++;
      }
    } catch (hashError) {
      console.error(`❌ ${email} - greška pri hashiranju:`, hashError);
      errors++;
    }
  }

  console.log('\n========================================');
  console.log('📊 REZULTATI:');
  console.log(`   ✅ Već hashirano: ${alreadyHashed}`);
  console.log(`   🔄 Ažurirano: ${updated}`);
  console.log(`   ❌ Greške: ${errors}`);
  console.log('========================================\n');

  if (updated > 0) {
    console.log('⚠️  VAŽNO: Obavijestite trenere da promijene lozinku ako im je postavljena default!');
  }
}

main().catch(console.error);

