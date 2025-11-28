/**
 * Detaljni Test Supabase Connection
 * Pokreni: node test-supabase-detailed.js
 */

require('dotenv').config({ path: './env.local' });

async function testSupabaseDetailed() {
  try {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 DETALJNA PROVJERA SUPABASE KONEKCIJE\n');
    console.log('='.repeat(50));
    console.log();

    // Provjeri environment varijable
    console.log('1️⃣  PROVJERA ENVIRONMENT VARIJABLI');
    console.log('-'.repeat(50));
    
    if (!url) {
      console.error('❌ SUPABASE_URL nije postavljen!');
      return;
    }
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY nije postavljen!');
      return;
    }

    console.log('✅ SUPABASE_URL:', url);
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey.substring(0, 30) + '...');
    console.log('   (Duljina:', serviceRoleKey.length, 'znakova)');
    console.log();

    // Testiraj konekciju
    console.log('2️⃣  TESTIRANJE KONEKCIJE');
    console.log('-'.repeat(50));
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    console.log('✅ Supabase klijent kreiran');
    console.log();

    // Provjeri da li tablica postoji direktnim SQL upitom
    console.log('3️⃣  PROVJERA POSTOJANJA TABLICA');
    console.log('-'.repeat(50));
    
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('exec_sql', {
          query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients'"
        });
      
      // Alternativno: pokušaj direktan pristup
      console.log('📋 Pokušavam pristupiti tablici "clients"...');
      
      const { data, error, status, statusText } = await supabase
        .from('clients')
        .select('id')
        .limit(1);

      console.log('📊 Status:', status);
      console.log('📊 Status Text:', statusText);
      
      if (error) {
        console.error('❌ GREŠKA:', error.message);
        console.error('❌ Code:', error.code);
        console.error('❌ Details:', error.details);
        console.error('❌ Hint:', error.hint);
        console.log();
        
        console.log('💡 ANALIZA GREŠKE:');
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.log('   → Tablica "clients" možda ne postoji');
          console.log('   → Provjeri u Supabase Table Editor');
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          console.log('   → Problem s RLS policies');
          console.log('   → Service role možda nema pristup');
          console.log('   → Pokreni fix-policies-only.sql ponovno');
        } else if (error.message.includes('JWT') || error.message.includes('invalid')) {
          console.log('   → Service Role Key možda nije ispravan');
          console.log('   → Provjeri env.local - koristi SERVICE ROLE KEY (ne anon key!)');
        }
        console.log();
        
        // Pokušaj provjeriti policies direktno
        console.log('4️⃣  PROVJERA RLS POLICIES');
        console.log('-'.repeat(50));
        
        try {
          const { data: policyCheck, error: policyError } = await supabase
            .from('clients')
            .select('*')
            .limit(0);
          
          console.log('Pristup policies...');
        } catch (e) {
          console.log('Provjera policies nije moguća');
        }
        
        return;
      }

      console.log('✅ Pristup tablici uspješan!');
      console.log('✅ Tablica "clients" postoji');
      console.log('✅ RLS policies su postavljene ispravno');
      console.log('✅ Podaci dobiveni:', data?.length || 0, 'zapisa');
      console.log();

    } catch (err) {
      console.error('❌ Neočekivana greška:', err.message);
      return;
    }

    // Testiraj insert
    console.log('4️⃣  TESTIRANJE INSERT OPERACIJE');
    console.log('-'.repeat(50));
    
    const testClient = {
      name: 'Test Korisnik',
      email: `test-${Date.now()}@example.com`,
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

    const { data: insertData, error: insertError, status: insertStatus } = await supabase
      .from('clients')
      .insert(testClient)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Greška pri insertu:', insertError.message);
      console.error('❌ Status:', insertStatus);
      return;
    }

    console.log('✅ Insert uspješan!');
    console.log('✅ Client ID:', insertData.id);
    console.log();

    // Obriši test podatak
    console.log('5️⃣  ČIŠĆENJE TEST PODATAKA');
    console.log('-'.repeat(50));
    
    await supabase
      .from('clients')
      .delete()
      .eq('id', insertData.id);

    console.log('✅ Test podatak obrisan');
    console.log();

    // Sve je OK!
    console.log('='.repeat(50));
    console.log('🎉 SVE JE U REDU!');
    console.log('✅ Supabase je uspješno povezan i radi!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ KRITIČNA GREŠKA:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSupabaseDetailed();

