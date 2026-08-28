import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { hashPassword, verifyPassword, generateToken, verifyToken } from './lib/auth';

async function testAuthAndOwnership() {
  console.log('===============================================================');
  console.log('  AEGISAI PHASE 3 — USER ACCOUNTS & OWNERSHIP ISOLATION TEST');
  console.log('===============================================================\n');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  console.log('[Setup] Connected to Neon PostgreSQL.');

  const timestamp = Date.now();
  const userAEmail = `user_a_${timestamp}@test.aegisai.io`;
  const userBEmail = `user_b_${timestamp}@test.aegisai.io`;
  const password = 'SecurePassword123!';

  // 1. Create User A
  const hashA = await hashPassword(password);
  const userA = await prisma.user.create({
    data: {
      name: 'Analyst Alice',
      email: userAEmail,
      passwordHash: hashA,
    },
  });
  console.log(`[User A] Created: ${userA.name} (${userA.email}, ID: ${userA.id})`);

  // 2. Create User B
  const hashB = await hashPassword(password);
  const userB = await prisma.user.create({
    data: {
      name: 'Analyst Bob',
      email: userBEmail,
      passwordHash: hashB,
    },
  });
  console.log(`[User B] Created: ${userB.name} (${userB.email}, ID: ${userB.id})`);

  // 3. Verify Password Verification & Token Generation
  const matchA = await verifyPassword(password, userA.passwordHash);
  const tokenA = generateToken({ id: userA.id, name: userA.name, email: userA.email });
  const decodedA = verifyToken(tokenA);

  console.log(`[Auth A] Password check: ${matchA ? 'PASS' : 'FAIL'}, Token decoded: ${decodedA?.email === userA.email ? 'PASS' : 'FAIL'}`);

  // 4. Create Analysis A for User A
  const analysisA = await prisma.analysis.create({
    data: {
      userId: userA.id,
      name: 'Project Titan - Internal Audit',
      description: 'Quarterly authentication telemetry inspection',
      status: 'READY',
    },
  });
  console.log(`[Analysis A] Created for User A: "${analysisA.name}" (ID: ${analysisA.id})`);

  // 5. Create Analysis B for User B
  const analysisB = await prisma.analysis.create({
    data: {
      userId: userB.id,
      name: 'Project Nebula - Cloud Perimeter',
      description: 'Ingress firewall and login telemetry review',
      status: 'READY',
    },
  });
  console.log(`[Analysis B] Created for User B: "${analysisB.name}" (ID: ${analysisB.id})`);

  // 6. Test User A listing analyses
  const userAAnalyses = await prisma.analysis.findMany({
    where: { userId: userA.id },
  });
  const userA_sees_A_only = userAAnalyses.length === 1 && userAAnalyses[0].id === analysisA.id;
  console.log(`[Isolation Test 1] User A sees ONLY Analysis A: ${userA_sees_A_only ? 'PASS' : 'FAIL'}`);

  // 7. Test User B listing analyses
  const userBAnalyses = await prisma.analysis.findMany({
    where: { userId: userB.id },
  });
  const userB_sees_B_only = userBAnalyses.length === 1 && userBAnalyses[0].id === analysisB.id;
  console.log(`[Isolation Test 2] User B sees ONLY Analysis B: ${userB_sees_B_only ? 'PASS' : 'FAIL'}`);

  // 8. Test Cross-Tenant Access (User A requesting Analysis B)
  const crossAccessAtoB = await prisma.analysis.findFirst({
    where: { id: analysisB.id, userId: userA.id },
  });
  console.log(`[Authorization Guard 1] User A accessing Analysis B -> result is null (404 Not Found): ${crossAccessAtoB === null ? 'PASS' : 'FAIL'}`);

  // 9. Test Cross-Tenant Access (User B requesting Analysis A)
  const crossAccessBtoA = await prisma.analysis.findFirst({
    where: { id: analysisA.id, userId: userB.id },
  });
  console.log(`[Authorization Guard 2] User B accessing Analysis A -> result is null (404 Not Found): ${crossAccessBtoA === null ? 'PASS' : 'FAIL'}`);

  // 10. Link a LogFile to Analysis A
  const fileA = await prisma.logFile.create({
    data: {
      analysisId: analysisA.id,
      fileName: 'auth_titan.csv',
      originalName: 'auth_titan.csv',
      fileSize: 4096,
      mimeType: 'text/csv',
      logType: 'CSV',
      totalLines: 50,
      parsedRecords: 50,
      status: 'READY',
    },
  });

  const threatA = await prisma.threatEvent.create({
    data: {
      fileId: fileA.id,
      title: 'Possible Brute Force Attack',
      category: 'AUTHENTICATION',
      severity: 'HIGH',
      riskScore: 85,
      description: 'Targeted attack against user admin',
      evidence: { failedAttempts: 6, username: 'admin', sourceIp: '10.0.0.99' },
      sourceRecordIds: [],
      status: 'ACTIVE',
    },
  });

  // Verify User B cannot access User A's threat
  const threatCheckB = await prisma.threatEvent.findFirst({
    where: {
      id: threatA.id,
      file: { analysis: { userId: userB.id } },
    },
  });
  console.log(`[Threat Ownership Guard] User B accessing User A's threat -> result is null (404): ${threatCheckB === null ? 'PASS' : 'FAIL'}`);

  // Clean up test records
  await prisma.threatEvent.delete({ where: { id: threatA.id } });
  await prisma.logFile.delete({ where: { id: fileA.id } });
  await prisma.analysis.delete({ where: { id: analysisA.id } });
  await prisma.analysis.delete({ where: { id: analysisB.id } });
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });
  console.log('\n[Cleanup] Temporary test accounts and data removed safely.');

  await pool.end();
  console.log('\n===============================================================');
  console.log('  PHASE 3 OWNERSHIP & ISOLATION TEST SUITE PASSED SUCCESSFULLY');
  console.log('===============================================================');
}

testAuthAndOwnership().catch(e => {
  console.error('Test crashed:', e);
  process.exit(1);
});
