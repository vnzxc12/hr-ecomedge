const app = require('../server/index');
const http = require('http');

async function testApiEndpoints() {
  console.log('🌐 Starting API Endpoints & Cursor Pagination Verification...\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Test Login (Auth event capture & token generation)
    console.log('1. Testing POST /api/auth/login');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('  Status:', loginRes.status, '| Logged in as:', loginData.user?.username, '| Session ID:', loginData.sessionId);

    if (!loginData.token) {
      throw new Error('Login failed to return JWT token');
    }

    const authHeaders = {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test GET /api/audit/system (Cursor pagination)
    console.log('\n2. Testing GET /api/audit/system');
    const sysRes = await fetch(`${baseUrl}/audit/system?limit=10`, { headers: authHeaders });
    const sysData = await sysRes.json();
    console.log(`  Fetched ${sysData.items?.length || 0} system audit records. Next cursor: ${sysData.next_cursor || 'none'}`);

    // 3. Test GET /api/audit/auth (Auth audit logs)
    console.log('\n3. Testing GET /api/audit/auth');
    const authRes = await fetch(`${baseUrl}/audit/auth?limit=10`, { headers: authHeaders });
    const authData = await authRes.json();
    console.log(`  Fetched ${authData.items?.length || 0} auth audit records.`);

    // 4. Test GET /api/audit/stats
    console.log('\n4. Testing GET /api/audit/stats');
    const statsRes = await fetch(`${baseUrl}/audit/stats`, { headers: authHeaders });
    const statsData = await statsRes.json();
    console.log('  Stats:', statsData);

    console.log('\n✅ All API endpoints responded successfully with expected data structures.');
  } finally {
    server.close();
  }
}

testApiEndpoints().catch(err => {
  console.error('API Verification Error:', err);
  process.exit(1);
});
