/**
 * Jednostavan test INSERT operacije
 */

require('dotenv').config({ path: './env.local' });

async function testInsert() {
  try {
    const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "").replace(/\/rest\/v1\/?$/, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    console.log('🧪 TEST INSERT OPERACIJE\n');
    console.log('URL:', url);
    console.log('Key:', key ? key.substring(0, 20) + '...' : 'NEDOSTAJE');
    console.log();

    if (!url || !key) {
      console.error('❌ Nedostaju varijable!');
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    });

    console.log('📝 Pokušavam INSERT...\n');

    const testData = {
      name: 'Test Insert',
      email: `test-insert-${Date.now()}@test.com`,
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

    const { data, error, status } = await supabase
      .from('clients')
      .insert(testData)
      .select('id')
      .single();

    if (error) {
      console.error('❌ GREŠKA:', error.message);
      console.error('Code:', error.code);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('Status:', status);
      return;
    }

    console.log('✅ INSERT USPJEŠAN!');
    console.log('✅ Client ID:', data.id);
    console.log();

    // Obriši test podatak
    await supabase.from('clients').delete().eq('id', data.id);
    console.log('✅ Test podatak obrisan');

    console.log('\n🎉 SVE RADI! Supabase je povezan i sprema podatke!');

  } catch (error) {
    console.error('❌ KRITIČNA GREŠKA:', error.message);
  }
}

testInsert();
