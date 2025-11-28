/**
 * Test samo varijabli - bez async/await
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 PROVJERA VARIJABLI\n');
console.log('='.repeat(50));
console.log();

// Provjeri da li env.local postoji
const envPath = path.join(__dirname, 'env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ env.local fajl ne postoji!');
  console.error('   Putanja:', envPath);
  process.exit(1);
}

console.log('✅ env.local postoji na:', envPath);
console.log();

// Učitaj env.local ručno
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

console.log('📄 Sadržaj env.local fajla:');
console.log('-'.repeat(50));
envContent.split('\n').forEach((line, idx) => {
  if (line.trim() && !line.trim().startsWith('#')) {
    // Maskiraj key za sigurnost
    const masked = line.includes('SERVICE_ROLE_KEY') 
      ? line.substring(0, line.indexOf('=') + 1) + '***MASKED***'
      : line;
    console.log(`${idx + 1}: ${masked}`);
  }
});
console.log('-'.repeat(50));
console.log();

let url = null;
let key = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('SUPABASE_URL=') && !trimmed.startsWith('#')) {
    url = trimmed.substring('SUPABASE_URL='.length).trim();
    // Ukloni navodnike ako postoje
    url = url.replace(/^["']|["']$/g, '');
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !trimmed.startsWith('#')) {
    key = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
    // Ukloni navodnike ako postoje
    key = key.replace(/^["']|["']$/g, '');
  }
}

  console.log('1. SUPABASE_URL:');
  if (!url) {
    console.error('   ❌ NEDOSTAJE!');
    console.error('   Provjeri env.local - treba biti: SUPABASE_URL=https://...');
  } else {
    console.log('   ✅ Postoji:', url);
    console.log('   Duljina:', url.length, 'znakova');
    
    // Provjeri da li je dashboard URL
    if (url.includes('/dashboard') || url.includes('supabase.com/dashboard')) {
      console.error('   ❌ POGREŠAN URL!');
      console.error('   To je dashboard URL, ne API endpoint!');
      console.error();
      console.error('   💡 Popravi u env.local:');
      console.error('   SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co');
      console.error();
      console.error('   Ili kopiraj iz Supabase Settings → API → Project URL');
      process.exit(1);
    }
    
    const formatOk = url.startsWith('https://') && url.includes('.supabase.co');
    console.log('   Format ispravan?', formatOk ? 'Da' : 'Ne');
    
    if (!formatOk) {
      console.error('   ❌ URL nije u ispravnom formatu!');
      console.error('   Trebao bi biti: https://xxxxx.supabase.co');
      process.exit(1);
    }
  }

console.log();

console.log('2. SUPABASE_SERVICE_ROLE_KEY:');
if (!key) {
  console.error('   ❌ NEDOSTAJE!');
  console.error('   Provjeri env.local - treba biti: SUPABASE_SERVICE_ROLE_KEY=eyJ...');
} else {
  console.log('   ✅ Postoji');
  console.log('   Duljina:', key.length, 'znakova');
  console.log('   Počinje s:', key.substring(0, 20) + '...');
  console.log('   JWT format?', key.split('.').length === 3 ? 'Da' : 'Ne');
  
  // Dekodiraj JWT
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('   Role:', payload.role);
      if (payload.role !== 'service_role') {
        console.error('   ❌ Key nije SERVICE ROLE key!');
      } else {
        console.log('   ✅ Role je service_role');
      }
    }
  } catch (e) {
    console.warn('   ⚠️  Ne mogu dekodirati JWT');
  }
}

console.log();
console.log('='.repeat(50));

if (!url || !key) {
  console.error('\n❌ Nedostaju varijable!');
  console.error('\nProvjeri env.local fajl:');
  console.error('   - Da li postoji linija: SUPABASE_URL=https://...');
  console.error('   - Da li postoji linija: SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  process.exit(1);
}

console.log('\n✅ Obje varijable postoje!');
console.log('\nSljedeći korak: Pokreni POPRAVI_SVE.bat za test konekcije');

