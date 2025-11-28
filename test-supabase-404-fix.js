/**
 * Test za Status 404 Error
 * Provjerava URL, key i pristup tablicama
 */

require('dotenv').config({ path: './env.local' });

async function test404Fix() {
  try {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 PROVJERA ZA STATUS 404 ERROR\n');
    console.log('='.repeat(60));
    console.log();

    // Provjeri URL format
    console.log('1️⃣  PROVJERA SUPABASE_URL');
    console.log('-'.repeat(60));
    console.log('URL:', url);
    
    if (!url) {
      console.error('❌ SUPABASE_URL nije postavljen!');
      return;
    }

    // Provjeri da li URL ima pravi format
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      console.error('❌ SUPABASE_URL nije u ispravnom formatu!');
      console.log('   Trebao bi biti: https://xxxxx.supabase.co');
      return;
    }

    // Provjeri da li URL završava s /rest/v1 (ne treba, ali provjerimo)
    if (url.endsWith('/rest/v1') || url.endsWith('/rest/v1/')) {
      console.warn('⚠️  URL završava s /rest/v1 - to nije potrebno');
      console.log('   Koristi samo: https://xxxxx.supabase.co');
    }

    console.log('✅ URL format ispravan');
    console.log();

    // Provjeri Service Role Key
    console.log('2️⃣  PROVJERA SERVICE ROLE KEY');
    console.log('-'.repeat(60));
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY nije postavljen!');
      return;
    }

    console.log('Key duljina:', serviceRoleKey.length, 'znakova');
    console.log('Key počinje s:', serviceRoleKey.substring(0, 20) + '...');
    
    // Provjeri da li je JWT format
    const parts = serviceRoleKey.split('.');
    if (parts.length !== 3) {
      console.error('❌ Service Role Key nije u JWT formatu!');
      console.log('   Trebao bi imati 3 dijela odvojena točkom');
      return;
    }

    // Dekodiraj JWT header da provjerimo role
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      console.log('JWT Header:', header);
      console.log('JWT Role:', payload.role);
      
      if (payload.role !== 'service_role') {
        console.error('❌ Key nije SERVICE ROLE key!');
        console.error('   Role:', payload.role);
        console.error('   Trebao bi biti: service_role');
        console.log();
        console.log('💡 Rješenje:');
        console.log('   1. Otvori Supabase: https://app.supabase.com/project/zspuauneubodthvrmzqg');
        console.log('   2. Idi na: Settings → API');
        console.log('   3. Pronađi "service_role" key (NIKADA anon key!)');
        console.log('   4. Kopiraj i zalijepi u env.local');
        return;
      }
      
      console.log('✅ Key je SERVICE ROLE key');
    } catch (e) {
      console.warn('⚠️  Ne mogu dekodirati JWT, ali nastavljam...');
    }
    
    console.log();

    // Testiraj konekciju
    console.log('3️⃣  TESTIRANJE KONEKCIJE');
    console.log('-'.repeat(60));
    
    const { createClient } = require('@supabase/supabase-js');
    
    // Kreiraj klijent s eksplicitnim opcijama
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'apikey': serviceRoleKey,
        },
      },
    });

    console.log('✅ Supabase klijent kreiran');
    console.log('   Schema: public');
    console.log('   Auth: persistSession=false');
    console.log();

    // Pokušaj pristupiti tablici
    console.log('4️⃣  PRISTUP TABLICI "clients"');
    console.log('-'.repeat(60));
    
    console.log('Pokušavam SELECT * FROM clients LIMIT 1...');
    
    const { data, error, status, statusText, count } = await supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .limit(1);

    console.log('Status:', status);
    console.log('Status Text:', statusText);
    console.log('Count:', count);
    
    if (error) {
      console.error('❌ GREŠKA:', error.message);
      console.error('❌ Code:', error.code);
      console.error('❌ Details:', error.details);
      console.error('❌ Hint:', error.hint);
      console.log();
      
      if (status === 404) {
        console.log('💡 STATUS 404 ANALIZA:');
        console.log('   → Supabase REST API ne može pronaći resurs');
        console.log('   → Mogući uzroci:');
        console.log('     1. Tablica "clients" ne postoji u public schema');
        console.log('     2. URL možda nije ispravan');
        console.log('     3. Service Role Key možda nije ispravan');
        console.log();
        console.log('📋 PROVJERA:');
        console.log('   1. Otvori Supabase Table Editor');
        console.log('   2. Provjeri da li postoji tablica "clients"');
        console.log('   3. Provjeri da li je u "public" schema');
        console.log('   4. Provjeri Settings → API za ispravan URL i key');
      } else if (error.message.includes('permission') || error.message.includes('policy')) {
        console.log('💡 RLS POLICY PROBLEM:');
        console.log('   → Pokreni fix-policies-only.sql u Supabase SQL Editor');
      }
      
      return;
    }

    console.log('✅ Pristup uspješan!');
    console.log('✅ Tablica "clients" postoji i dostupna');
    console.log('✅ Podaci:', data?.length || 0, 'zapisa');
    console.log();

    // Testiraj insert
    console.log('5️⃣  TESTIRANJE INSERT');
    console.log('-'.repeat(60));
    
    const testClient = {
      name: 'Test 404 Fix',
      email: `test404-${Date.now()}@example.com`,
      phone: '123456789',
      honorific: 'Mr',
      age_range: '25-30',
      weight_value: 75,
      weight_unit: 'kg',
      height_value: 180,
      height_unit: 'cm',
      activities: ['strength'],
      goals: ['lose_weight'],
      diet_cleanliness: 70,
    };

    const { data: insertData, error: insertError } = await supabase
      .from('clients')
      .insert(testClient)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Insert greška:', insertError.message);
      return;
    }

    console.log('✅ Insert uspješan!');
    console.log('✅ Client ID:', insertData.id);
    
    // Obriši
    await supabase.from('clients').delete().eq('id', insertData.id);
    console.log('✅ Test podatak obrisan');
    console.log();

    console.log('='.repeat(60));
    console.log('🎉 SVE RADI!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ KRITIČNA GREŠKA:', error.message);
    console.error('Stack:', error.stack);
  }
}

test404Fix();

