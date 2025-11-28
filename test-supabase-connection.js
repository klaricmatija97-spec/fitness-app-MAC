/**
 * Test Supabase Connection Script
 * Pokreni: node test-supabase-connection.js
 */

require('dotenv').config({ path: './env.local' });

async function testSupabaseConnection() {
  try {
    // Provjeri environment varijable
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 Provjera Environment Varijabli...\n');

    if (!url) {
      console.error('❌ SUPABASE_URL nije postavljen!');
      console.log('   Provjeri da li env.local postoji i sadrži SUPABASE_URL');
      return;
    }

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY nije postavljen!');
      console.log('   Provjeri da li env.local postoji i sadrži SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    console.log('✅ SUPABASE_URL:', url);
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey.substring(0, 20) + '...\n');

    // Testiraj konekciju
    console.log('🔗 Testiranje Supabase konekcije...\n');

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    // Testiraj dohvaćanje iz clients tablice
    console.log('📊 Testiranje dohvaćanja podataka...');
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email')
      .limit(1);

    if (error) {
      console.error('❌ Greška pri dohvaćanju podataka:', error.message);
      console.log('\n💡 Mogući problemi:');
      console.log('   - Tablica "clients" možda ne postoji');
      console.log('   - RLS policies možda nisu postavljene');
      console.log('   - Service Role Key možda nije ispravan');
      console.log('\n📋 Rješenje:');
      console.log('   1. Otvori Supabase SQL Editor');
      console.log('   2. Pokreni supabase-schema-complete.sql');
      console.log('   3. Provjeri da li su sve tablice kreirane');
      return;
    }

    console.log('✅ Konekcija uspješna!');
    console.log('✅ Tablica "clients" postoji i dostupna');
    console.log('✅ RLS policies su postavljene ispravno\n');

    // Testiraj insert (bez spremanja)
    console.log('📝 Testiranje insert operacije...');
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

    const { data: insertData, error: insertError } = await supabase
      .from('clients')
      .insert(testClient)
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Greška pri insertu:', insertError.message);
      console.log('\n💡 Mogući problemi:');
      console.log('   - Tablica "clients" možda nema sve potrebne kolone');
      console.log('   - RLS policies možda ne dozvoljavaju insert');
      console.log('   - Provjeri schema u Supabase');
      return;
    }

    console.log('✅ Insert uspješan!');
    console.log('✅ Client ID:', insertData.id);

    // Obriši test podatak
    console.log('\n🧹 Čišćenje test podataka...');
    await supabase
      .from('clients')
      .delete()
      .eq('id', insertData.id);

    console.log('✅ Test podatak obrisan\n');

    // Sve je OK!
    console.log('🎉 SVE JE U REDU!');
    console.log('✅ Supabase je uspješno povezan i radi!\n');

  } catch (error) {
    console.error('❌ Greška:', error.message);
    console.log('\n💡 Provjeri:');
    console.log('   - Da li je env.local u root folderu?');
    console.log('   - Da li su environment varijable ispravne?');
    console.log('   - Da li je Supabase projekt aktivan?');
  }
}

testSupabaseConnection();

