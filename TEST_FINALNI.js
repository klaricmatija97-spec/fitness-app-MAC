/**
 * FINALNI TEST - ZANEMARI process.env, ČITAJ IZ FAJLA!
 */

const fs = require('fs');
const path = require('path');

async function testFinalni() {
  console.log('🔍 FINALNI TEST - DIREKTNO IZ ENV.LOCAL\n');
  console.log('='.repeat(60));
  console.log();
  
  // FORSIRAJ direktno čitanje - ZANEMARI process.env potpuno!
  const envPath = path.join(__dirname, 'env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ env.local fajl ne postoji na:', envPath);
    process.exit(1);
  }
  
  console.log('📄 Čitam DIREKTNO iz env.local fajla:');
  console.log('   Putanja:', envPath);
  console.log();
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 Cijeli sadržaj env.local:');
  console.log('-'.repeat(60));
  console.log(envContent);
  console.log('-'.repeat(60));
  console.log();
  
  // Provjeri da li URL sadrži dashboard u fajlu
  if (envContent.includes('/dashboard') || envContent.includes('supabase.com/dashboard')) {
    console.error('❌ ❌ ❌ GREŠKA: URL u env.local fajlu JE dashboard URL!');
    console.error('   Ovo je problem - URL u fajlu je pogrešan!');
    console.error();
    console.error('💡 RJEŠENJE:');
    console.error('   1. Otvori: fitness-app/env.local');
    console.error('   2. Pronađi liniju: SUPABASE_URL=...');
    console.error('   3. Zamijeni CIJELU liniju:');
    console.error('      SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co');
    console.error('   4. Sačuvaj fajl (Ctrl+S)');
    console.error('   5. Pokreni test ponovno');
    console.error();
    process.exit(1);
  }
  
  const lines = envContent.split('\n');
  let url = null;
  let key = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Ignoriraj prazne linije i komentare
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.startsWith('SUPABASE_URL=')) {
      url = trimmed.substring('SUPABASE_URL='.length).trim();
      // Ukloni navodnike ako postoje
      url = url.replace(/^["']|["']$/g, '');
      console.log('✅ Pronađen SUPABASE_URL:', url);
      
      // PROVJERI DIREKTNO U OVOJ LINIJI
      if (url.includes('/dashboard') || url.includes('supabase.com/dashboard')) {
        console.error('❌ ❌ ❌ URL u ovoj liniji JE dashboard URL!');
        console.error('   Linija:', trimmed);
        console.error('   URL:', url);
        console.error();
        console.error('💡 POPRAVI OVU LINIJU U env.local:');
        console.error('   SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co');
        process.exit(1);
      }
    }
    
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      key = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
      // Ukloni navodnike ako postoje
      key = key.replace(/^["']|["']$/g, '');
      console.log('✅ Pronađen SUPABASE_SERVICE_ROLE_KEY:', key ? '(postoji, duljina: ' + key.length + ')' : '(prazan)');
    }
  }
  
  console.log();
  
  if (!url) {
    console.error('❌ SUPABASE_URL nije pronađen u env.local!');
    process.exit(1);
  }
  
  if (!key) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY nije pronađen u env.local!');
    process.exit(1);
  }
  
  // Provjeri da li je URL dashboard URL
  if (url.includes('/dashboard') || url.includes('supabase.com/dashboard')) {
    console.error('❌ GREŠKA: URL u env.local JE dashboard URL!');
    console.error('   Trenutni URL:', url);
    console.error();
    console.error('💡 RJEŠENJE:');
    console.error('   1. Otvori: fitness-app/env.local');
    console.error('   2. Pronađi liniju: SUPABASE_URL=...');
    console.error('   3. Promijeni na: SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co');
    console.error('   4. Sačuvaj fajl');
    console.error();
    process.exit(1);
  }
  
  // Provjeri format
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    console.error('❌ URL nije u ispravnom formatu!');
    console.error('   Trenutni URL:', url);
    console.error('   Trebao bi biti: https://xxxxx.supabase.co');
    process.exit(1);
  }
  
  console.log('✅ URL je ispravan:', url);
  console.log();
  
  // Test konekcije
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const cleanUrl = url.trim().replace(/\/$/, "").replace(/\/rest\/v1\/?$/, "");
    
    console.log('📝 Pokušavam konekciju sa Supabase...');
    console.log('   Koristim URL:', cleanUrl);
    console.log();
    
    const supabase = createClient(cleanUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
      global: {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      },
    });
    
    console.log('✅ Supabase klijent kreiran');
    console.log();
    
    console.log('📝 Pokušavam SELECT * FROM clients LIMIT 1...');
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ GREŠKA:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      process.exit(1);
    }
    
    console.log('✅ USPJEŠNO! Konekcija radi!');
    console.log('   Podaci:', data ? '(pronađeni)' : '(nema podataka, ali tablica postoji)');
    console.log();
    
  } catch (error) {
    console.error('❌ GREŠKA pri konekciji:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testFinalni();

