/**
 * CrickyWorld Tournament API Diagnostic
 * Run: node diagnose.js
 * This will test every possible failure point for tournament creation.
 */

const http = require('http');

const BASE = 'http://localhost:5000';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== CrickyWorld Tournament API Diagnostic ===\n');

  // 1. Check server is up
  try {
    const r = await request('GET', '/');
    console.log('✅ Server is running:', r.body);
  } catch (e) {
    console.log('❌ FATAL: Server not reachable. Is it running on port 5000?');
    console.log('   Error:', e.message);
    process.exit(1);
  }

  // 2. GET /api/tournaments - check route exists
  console.log('\n--- Test 1: GET /api/tournaments ---');
  try {
    const r = await request('GET', '/api/tournaments');
    if (r.status === 404) {
      console.log('❌ FAIL: Route /api/tournaments not found (404).');
      console.log('   FIX: Add tournament routes to server.js');
    } else if (r.status === 200) {
      console.log('✅ GET /api/tournaments works. Count:', Array.isArray(r.body) ? r.body.length : 'N/A');
    } else {
      console.log('⚠️  Unexpected status:', r.status, r.body);
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }

  // 3. POST minimal tournament
  console.log('\n--- Test 2: POST minimal tournament (no teams) ---');
  try {
    const r = await request('POST', '/api/tournaments', { name: 'Test', overs: 20 });
    if (r.status === 201) {
      console.log('✅ Created minimal tournament. ID:', r.body._id);
    } else {
      console.log('❌ FAIL status', r.status, ':', r.body);
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }

  // 4. POST with spaces in name — THE KEY TEST
  console.log('\n--- Test 3: POST "Tri Nation Series" (spaces in name) ---');
  try {
    const r = await request('POST', '/api/tournaments', {
      name: 'Tri Nation Series',
      overs: 20,
      format: 'round-robin',
      teams: ['India', 'Australia', 'England'],
    });
    if (r.status === 201) {
      console.log('✅ "Tri Nation Series" created successfully!');
      console.log('   ID:', r.body._id);
      console.log('   Name:', r.body.name);
      console.log('   Teams:', r.body.teams);
      console.log('   Fixtures count:', r.body.fixtures?.length);

      // 5. GET by ID
      console.log('\n--- Test 4: GET tournament by _id ---');
      const r2 = await request('GET', `/api/tournaments/${r.body._id}`);
      if (r2.status === 200) {
        console.log('✅ GET by ID works');
      } else {
        console.log('❌ GET by ID failed:', r2.status, r2.body);
      }

      // 6. Cleanup
      await request('DELETE', `/api/tournaments/${r.body._id}`);
      console.log('   (test tournament deleted)');
    } else {
      console.log('❌ FAIL status', r.status);
      console.log('   Response:', JSON.stringify(r.body, null, 2));
      console.log('\n   POSSIBLE CAUSES:');
      if (r.status === 404) console.log('   → Route not registered in server.js');
      if (r.status === 400) console.log('   → Validation error in route or Mongoose schema');
      if (r.status === 500) console.log('   → MongoDB error or missing model');
    }
  } catch (e) {
    console.log('❌ Network/parse error:', e.message);
  }

  // 7. Check if frontend might be sending different field names
  console.log('\n--- Test 5: POST with alternative field names (frontend may use these) ---');
  const variants = [
    { tournamentName: 'Tri Nation Series', overs: 20 },
    { title: 'Tri Nation Series', overs: 20 },
    { name: 'Tri Nation Series', totalOvers: 20 },
    { name: 'Tri Nation Series', overs: '20' }, // string overs
  ];
  for (const body of variants) {
    try {
      const r = await request('POST', '/api/tournaments', body);
      if (r.status === 201) {
        console.log(`✅ Works with fields: ${JSON.stringify(Object.keys(body))}`);
        await request('DELETE', `/api/tournaments/${r.body._id}`);
      } else {
        console.log(`⚠️  Fields ${JSON.stringify(Object.keys(body))} → status ${r.status}: ${r.body?.message || r.body}`);
      }
    } catch (e) {
      console.log(`❌ Error with ${JSON.stringify(Object.keys(body))}: ${e.message}`);
    }
  }

  console.log('\n=== Diagnostic complete ===');
  console.log('\nIf all backend tests pass but frontend still fails:');
  console.log('→ The bug is in the FRONTEND component (field names, validation, URL routing)');
  console.log('→ Share your frontend tournament component code for the exact fix');
}

run().catch(console.error);