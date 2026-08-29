const path = require('path');
const { db } = require('../server/db/database');
const auditService = require('../server/services/auditService');
const sessionService = require('../server/services/sessionService');
const cacheService = require('../server/services/cacheService');

async function runVerification() {
  console.log('🚀 Running Enterprise Audit & Performance Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Schema & Indexes Verification
  console.log('📦 1. Database Schema & Tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  assert(tables.includes('system_audit_logs'), 'system_audit_logs table exists in SQLite');
  assert(tables.includes('auth_audit_logs'), 'auth_audit_logs table exists in SQLite');
  assert(tables.includes('user_sessions'), 'user_sessions table exists in SQLite');

  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(i => i.name);
  assert(indexes.includes('idx_sys_audit_cursor'), 'idx_sys_audit_cursor keyset pagination index exists');
  assert(indexes.includes('idx_auth_audit_cursor'), 'idx_auth_audit_cursor index exists');
  assert(indexes.includes('idx_sessions_user_active'), 'idx_sessions_user_active index exists');

  // 2. Audit Diff Engine & Non-Blocking Ingestion
  console.log('\n⚡ 2. Async Non-Blocking Ingestion & Diff Calculation:');
  const beforeState = { id: 42, first_name: 'John', monthly_salary: 50000, password_hash: '$2a$10$secret' };
  const afterState = { id: 42, first_name: 'John', monthly_salary: 65000, password_hash: '$2a$10$newsecret' };

  const diff = auditService.computeDiff(beforeState, afterState);
  assert(diff && diff.monthly_salary && diff.monthly_salary.old === 50000 && diff.monthly_salary.new === 65000, 'Calculates accurate numeric field diff');
  assert(!diff.password_hash || diff.password_hash.old === '[REDACTED]', 'Redacts sensitive password_hash from diff');

  // Log system audit event
  auditService.logSystemEvent({
    userId: 1,
    username: 'admin',
    action: 'UPDATE',
    resourceType: 'employee',
    resourceId: '42',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 PerformanceTest',
    beforeState,
    afterState
  });

  // Log auth audit event
  auditService.logAuthEvent({
    userId: 1,
    username: 'admin',
    eventType: 'LOGIN_SUCCESS',
    status: 'SUCCESS',
    ipAddress: '192.168.1.100',
    deviceFingerprint: 'mock-fp-sha256-abcdef123456',
    sessionId: 'mock-session-test-id'
  });

  // Wait for setImmediate queue tick, then trigger flush
  await new Promise(r => setImmediate(r));
  await auditService.flushQueues(true);

  const sysRow = db.prepare("SELECT * FROM system_audit_logs WHERE resource_id = '42' ORDER BY id DESC LIMIT 1").get();
  assert(sysRow && sysRow.action === 'UPDATE' && sysRow.resource_type === 'employee', 'System audit log flushed and persisted');
  assert(sysRow.diff && JSON.parse(sysRow.diff).monthly_salary.new === 65000, 'Persisted JSON diff is valid');

  const authRow = db.prepare("SELECT * FROM auth_audit_logs WHERE username = 'admin' ORDER BY id DESC LIMIT 1").get();
  assert(authRow && authRow.event_type === 'LOGIN_SUCCESS' && authRow.status === 'SUCCESS', 'Auth audit log flushed and persisted');

  // 3. Session Lifecycle & TTL Expiration
  console.log('\n🔑 3. Session Lifecycle & Device Fingerprinting:');
  const mockReq = {
    headers: {
      'x-forwarded-for': '203.0.113.195',
      'user-agent': 'TestDevice/1.0',
      'accept-language': 'en-US'
    },
    socket: {}
  };

  const fp = sessionService.generateDeviceFingerprint(mockReq);
  assert(fp && fp.length === 64, `SHA-256 Device Fingerprint generated: ${fp.substring(0, 16)}...`);

  const createdSession = sessionService.createSession(1, mockReq);
  assert(createdSession && createdSession.sessionId, 'Session created successfully');

  const validation = sessionService.validateSession(createdSession.sessionId);
  assert(validation.valid === true, 'Valid active session verified');

  sessionService.revokeSession(createdSession.sessionId);
  const revokedValidation = sessionService.validateSession(createdSession.sessionId);
  assert(revokedValidation.valid === false && revokedValidation.reason === 'SESSION_REVOKED', 'Revoked session rejected immediately');

  // 4. Cache & Anti-Stampede Protection
  console.log('\n🛡️ 4. Multi-Tier Cache, XFetch & Single-Flight Mutex:');
  let computeCount = 0;
  const mockDbFetcher = async () => {
    computeCount++;
    await new Promise(r => setTimeout(r, 20)); // Simulate 20ms SQL query
    return { data: 'heavy-computation-result', count: computeCount };
  };

  // Concurrent requests simulating high-load traffic spike (50 requests simultaneously)
  const concurrentCalls = Array.from({ length: 50 }).map(() =>
    cacheService.getOrSet('test:stampede:key', mockDbFetcher, 5000, ['test-tag'])
  );

  const results = await Promise.all(concurrentCalls);
  assert(results.length === 50, 'All 50 concurrent requests resolved');
  assert(computeCount === 1, `Single-Flight Mutex collapsed 50 concurrent requests into exactly ${computeCount} SQL execution`);

  // Test tag-based invalidation
  cacheService.invalidateByTag('test-tag');
  await cacheService.getOrSet('test:stampede:key', mockDbFetcher, 5000, ['test-tag']);
  assert(computeCount === 2, 'Tag-based cache invalidation cleanly triggered fresh fetch');

  console.log(`\n==================================================`);
  console.log(`Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
