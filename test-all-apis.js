/**
 * Test All APIs
 * Provjerava sve API endpointe i njihovu funkcionalnost
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const ADMIN_KEY = 'corpex-admin-2024';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testEndpoint(name, method, path, body = null, headers = {}) {
  try {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const start = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - start;
    const data = await response.json().catch(() => ({ error: 'Invalid JSON' }));
    
    const status = response.ok ? '✓' : '✗';
    const color = response.ok ? 'green' : 'red';
    
    log(`${status} ${name}`, color);
    console.log(`   ${method} ${path}`);
    console.log(`   Status: ${response.status} (${duration}ms)`);
    
    if (!response.ok) {
      console.log(`   Error: ${data.message || data.error || 'Unknown error'}`);
    } else {
      if (data.ok !== undefined) {
        console.log(`   Success: ${data.ok}`);
      }
      if (data.message) {
        console.log(`   Message: ${data.message}`);
      }
    }
    
    return { ok: response.ok, status: response.status, data, duration };
  } catch (error) {
    log(`✗ ${name}`, 'red');
    console.log(`   ${method} ${path}`);
    console.log(`   Error: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

async function main() {
  log('\n🚀 Starting API Tests...\n', 'blue');
  
  // ============================================
  // 1. AUTH APIs
  // ============================================
  logSection('1. AUTH APIs');
  
  await testEndpoint('Health Check', 'GET', '/api/test');
  await testEndpoint('Login (invalid)', 'POST', '/api/auth/login', {
    username: 'test',
    password: 'test',
  });
  await testEndpoint('Register (invalid - missing fields)', 'POST', '/api/auth/register', {
    name: 'Test',
  });
  
  // ============================================
  // 2. RESEND EMAIL API
  // ============================================
  logSection('2. RESEND EMAIL API');
  
  // Provjeri environment varijable
  log('\n📧 Checking Resend API Configuration...', 'yellow');
  const resendKey = process.env.RESEND_API_KEY || 're_LAVdTSto_LkTanz66kQLWD88SgAVnCPzH';
  if (resendKey) {
    log('   ✓ RESEND_API_KEY found', 'green');
    log(`   Key: ${resendKey.substring(0, 10)}...`);
  } else {
    log('   ✗ RESEND_API_KEY not found', 'red');
  }
  
  // Test Resend API direktno
  log('\n📧 Testing Resend API directly...', 'yellow');
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
      }),
    });
    
    const resendData = await resendResponse.json();
    if (resendResponse.ok) {
      log('   ✓ Resend API working', 'green');
      console.log(`   Email ID: ${resendData.id}`);
    } else {
      log('   ✗ Resend API error', 'red');
      console.log(`   Error: ${JSON.stringify(resendData)}`);
    }
  } catch (error) {
    log('   ✗ Resend API connection failed', 'red');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test trainer invites endpoint (koristi Resend)
  await testEndpoint('Get Trainer Invites', 'GET', '/api/admin/trainer-invites?status=pending', null, {
    'x-admin-key': ADMIN_KEY,
  });
  
  // ============================================
  // 3. TRAINER APIs
  // ============================================
  logSection('3. TRAINER APIs');
  
  await testEndpoint('Get Trainer Profile', 'GET', '/api/trainer/profile', null, {
    'x-admin-key': ADMIN_KEY,
  });
  await testEndpoint('Get Trainer Clients', 'GET', '/api/trainer/clients', null, {
    'x-admin-key': ADMIN_KEY,
  });
  await testEndpoint('Get Trainer Code', 'GET', '/api/trainer/code', null, {
    'x-admin-key': ADMIN_KEY,
  });
  
  // ============================================
  // 4. CLIENT APIs
  // ============================================
  logSection('4. CLIENT APIs');
  
  await testEndpoint('Client Connect', 'POST', '/api/client/connect', {
    trainerCode: 'TRN-TEST',
  });
  
  // ============================================
  // 5. TRAINING APIs
  // ============================================
  logSection('5. TRAINING APIs');
  
  await testEndpoint('Get Training Exercises', 'GET', '/api/training/exercises');
  await testEndpoint('Generate Training Program', 'POST', '/api/training/generate', {
    clientId: '00000000-0000-0000-0000-000000000000',
    goal: 'FAT_LOSS',
  });
  
  // ============================================
  // 6. MEAL PLAN APIs
  // ============================================
  logSection('6. MEAL PLAN APIs');
  
  await testEndpoint('Generate Meal Plan', 'POST', '/api/meal-plan/generate', {
    clientId: '00000000-0000-0000-0000-000000000000',
  });
  
  // ============================================
  // 7. CALCULATIONS APIs
  // ============================================
  logSection('7. CALCULATIONS APIs');
  
  await testEndpoint('Get Calculations', 'GET', '/api/calculations/00000000-0000-0000-0000-000000000000');
  
  // ============================================
  // 8. CHAT APIs
  // ============================================
  logSection('8. CHAT APIs');
  
  await testEndpoint('Chat Usage', 'GET', '/api/chat/usage/00000000-0000-0000-0000-000000000000');
  
  // ============================================
  // 9. DEBUG APIs
  // ============================================
  logSection('9. DEBUG APIs');
  
  await testEndpoint('Check Environment', 'GET', '/api/debug/check-env');
  await testEndpoint('Check User', 'GET', '/api/debug/check-user?email=test@example.com');
  
  // ============================================
  // SUMMARY
  // ============================================
  logSection('SUMMARY');
  log('✅ API tests completed!', 'green');
  log('\nNote: Some endpoints may fail due to missing authentication or invalid data.', 'yellow');
  log('This is expected - the important thing is that endpoints respond correctly.', 'yellow');
}

main().catch(console.error);
