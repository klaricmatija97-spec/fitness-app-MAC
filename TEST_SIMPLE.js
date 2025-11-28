/**
 * Najjednostavniji test - provjeri samo varijable
 */

const fs = require('fs');
const path = require('path');

async function testSimple() {
  console.log('🔍 PROVJERA VARIJABLI\n');
  console.log('='.repeat(50));
  console.log();

  // FORSIRAJ direktno čitanje iz env.local - ZANEMARI process.env!
  const envPath = path.join(__dirname, 'env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ env.local fajl ne postoji na:', envPath);
    process.exit(1);
  }
  
  console.log('📄 Čitam DIREKTNO iz env.local (zanemarujem process.env):');
  console.log('   Putanja:', envPath);
  console.log();
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let url = null;
  let key = null;
  
  console.log('📄 Sadržaj env.local fajla:');
  console.log('-'.repeat(50));
  lines.forEach((line, idx) => {
    if (line.trim() && !line.trim().startsWith('#')) {
      const masked = line.includes('SERVICE_ROLE_KEY') 
        ? line.substring(0, line.indexOf('=') + 1) + '***MASKED***'
        : line;
      console.log(`${idx + 1}: ${masked}`);
    }
  });
  console.log('-'.repeat(50));
  console.log();
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Ignoriraj komentare
    if (trimmed.startsWith('#')) continue;
    
    if (trimmed.startsWith('SUPABASE_URL=')) {
      url = trimmed.substring('SUPABASE_URL='.length).trim();
      // Ukloni navodnike ako postoje
      url = url.replace(/^["']|["']$/g, '');
      console.log('✅ Pronađen SUPABASE_URL:', url);
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      key = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim();
      // Ukloni navodnike ako postoje
      key = key.replace(/^["']|["']$/g, '');
      console.log('✅ Pronađen SUPABASE_SERVICE_ROLE_KEY:', key ? '(postoji)' : '(prazan)');
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
  
  // Provjeri da li je URL ispravan
  if (url.includes('/dashboard') || url.includes('supabase.com/dashboard')) {
    console.error('❌ GREŠKA: URL u env.local je dashboard URL!');
    console.error('   Trenutni URL:', url);
    console.error();
    console.error('💡 RJEŠENJE:');
    console.error('   Otvori env.local i promijeni:');
    console.error('   SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co');
    console.error();
    process.exit(1);
  }
  
  console.log('✅ URL izgleda ispravno:', url);
  console.log();

  console.log('1. SUPABASE_URL:');
  if (!url) {
    console.error('   ❌ NEDOSTAJE!');
    console.error('   Provjeri env.local fajl');
  } else {
    console.log('   ✅ Postoji:', url);
    console.log('   Duljina:', url.length, 'znakova');
    console.log('   Počinje s https://?', url.startsWith('https://'));
    console.log('   Sadrži .supabase.co?', url.includes('.supabase.co'));
  }

  console.log();

  console.log('2. SUPABASE_SERVICE_ROLE_KEY:');
  if (!key) {
    console.error('   ❌ NEDOSTAJE!');
    console.error('   Provjeri env.local fajl');
  } else {
    console.log('   ✅ Postoji');
    console.log('   Duljina:', key.length, 'znakova');
    console.log('   Počinje s:', key.substring(0, 20) + '...');
    console.log('   JWT format?', key.split('.').length === 3 ? 'Da' : 'Ne');
  }

  console.log();

  if (!url || !key) {
    console.error('❌ Nedostaju varijable! Provjeri env.local fajl.');
    process.exit(1);
  }

  // Pokušaj dekodirati JWT
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('3. JWT PAYLOAD:');
      console.log('   Role:', payload.role);
      console.log('   Ref:', payload.ref);
      console.log();
      
      if (payload.role !== 'service_role') {
        console.error('❌ Key nije SERVICE ROLE key!');
        console.error('   Role:', payload.role, '(trebao bi biti: service_role)');
        process.exit(1);
      }
      console.log('   ✅ Role je service_role - ispravno!');
    }
  } catch (e) {
    console.warn('   ⚠️  Ne mogu dekodirati JWT, ali nastavljam...');
  }

  console.log();
  console.log('='.repeat(50));
  console.log();
  console.log('📝 Pokušavam konekciju sa Supabase...');
  console.log();

  try {
    const { createClient } = require('@supabase/supabase-js');
    
    // Čistim URL - ukloni dashboard dijelove ako postoje
    let cleanUrl = url.trim().replace(/\/$/, "").replace(/\/rest\/v1\/?$/, "");
    
    // Provjeri da li je dashboard URL (sadrži /dashboard ili supabase.com/dashboard)
    if (cleanUrl.includes('/dashboard') || cleanUrl.includes('supabase.com/dashboard')) {
      console.error('❌ GREŠKA: URL je dashboard URL, ne API endpoint!');
      console.error('   Trenutni URL:', cleanUrl);
      console.error();
      console.error('💡 RJEŠENJE:');
      console.error('   Otvori Supabase Settings → API');
      console.error('   Pronađi "Project URL" (NE "Dashboard URL")');
      console.error('   Kopiraj samo: https://zspuauneubodthvrmzqg.supabase.co');
      console.error();
      console.error('   Ili provjeri env.local i promijeni:');
      console.error('   SUPABASE_URL=https://zspuauneubodthvrmzqg.supabase.co');
      process.exit(1);
    }
    
    // Provjeri da li je u ispravnom formatu
    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      console.error('❌ URL nije u ispravnom formatu!');
      console.error('   Trebao bi biti: https://xxxxx.supabase.co');
      console.error('   Trenutni:', cleanUrl);
      process.exit(1);
    }
    
    console.log('Koristim URL:', cleanUrl);
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
    console.log('📊 Pokušavam SELECT * FROM clients LIMIT 1...');
    console.log();

    const { data, error, status, statusText } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    console.log('Status:', status);
    console.log('Status Text:', statusText);
    console.log();

    if (error) {
      console.error('❌ GREŠKA:');
      console.error('   Message:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      console.log();
      
      if (status === 404) {
        console.error('💡 STATUS 404 - Resurs nije pronađen');
        console.error('   Mogući uzroci:');
        console.error('   1. Tablica "clients" ne postoji u Supabase');
        console.error('   2. URL možda nije ispravan');
        console.error('   3. Service Role Key možda nije ispravan');
        console.error();
        console.error('📋 RJEŠENJE:');
        console.error('   1. Otvori Supabase Table Editor');
        console.error('   2. Provjeri da li postoji tablica "clients"');
        console.error('   3. Ako ne postoji - pokreni supabase-schema-clean.sql');
        console.error('   4. Ako postoji - pokreni POPRAVI_SVE.sql');
      }
      
      process.exit(1);
    }

    console.log('✅ USPJEŠNO!');
    console.log('✅ Tablica "clients" postoji i dostupna');
    console.log('✅ Podaci:', data?.length || 0, 'zapisa');
    console.log();
    console.log('🎉 SVE RADI!');

  } catch (error) {
    console.error('❌ KRITIČNA GREŠKA:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSimple();
