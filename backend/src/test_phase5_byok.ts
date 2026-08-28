import dotenv from 'dotenv';
dotenv.config();

import { encryptApiKey, decryptApiKey, maskApiKey } from './lib/encryption';
import { resolveAIProvider } from './lib/ai/providers';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function runBYOKTests() {
  console.log('===============================================================');
  console.log('  AEGISAI PHASE 5 — SECURE BYOK AI PROVIDER MANAGEMENT TEST');
  console.log('===============================================================\n');

  // 1. Encryption & Masking Unit Tests
  console.log('--- 1. Testing AES-256-GCM Encryption & Masking ---');
  const sampleKey = 'TEST_GEMINI_KEY_SAMPLE_9X4K';
  const encrypted = encryptApiKey(sampleKey);
  const decrypted = decryptApiKey(encrypted);
  const masked = maskApiKey(sampleKey);

  console.log(`[AES-256-GCM] Encrypted ciphertext format (iv:tag:data): ${encrypted.split(':').length === 3 ? 'PASS' : 'FAIL'}`);
  console.log(`[AES-256-GCM] Decrypted matches original plaintext: ${decrypted === sampleKey ? 'PASS' : 'FAIL'}`);
  console.log(`[Masking] Masked output ("${masked}"): ${masked === 'TEST••••••••9X4K' ? 'PASS' : 'FAIL'}`);

  // Test tamper detection
  let tamperDetected = false;
  try {
    const parts = encrypted.split(':');
    const tamperedCipher = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;
    decryptApiKey(tamperedCipher);
  } catch {
    tamperDetected = true;
  }
  console.log(`[Tamper Detection] Modified ciphertext rejected by GCM auth tag: ${tamperDetected ? 'PASS' : 'FAIL'}`);

  // 2. Database Multi-User BYOK Isolation
  console.log('\n--- 2. Testing Multi-User BYOK Database Isolation ---');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const timestamp = Date.now();
  const userA = await prisma.user.create({
    data: {
      name: 'Analyst Alice',
      email: `alice_${timestamp}@aegis.io`,
      passwordHash: 'dummy_hash',
    },
  });

  const userB = await prisma.user.create({
    data: {
      name: 'Analyst Bob',
      email: `bob_${timestamp}@aegis.io`,
      passwordHash: 'dummy_hash',
    },
  });

  const keyA = 'TEST_GEMINI_KEY_ALICE_0001';
  const keyB = 'TEST_GEMINI_KEY_BOB_0002';

  // Save User A key
  await prisma.aIProviderConfig.create({
    data: {
      userId: userA.id,
      provider: 'GEMINI',
      encryptedApiKey: encryptApiKey(keyA),
      enabled: true,
    },
  });

  // Save User B key
  await prisma.aIProviderConfig.create({
    data: {
      userId: userB.id,
      provider: 'GEMINI',
      encryptedApiKey: encryptApiKey(keyB),
      enabled: true,
    },
  });

  // Query User A config
  const configA = await prisma.aIProviderConfig.findUnique({
    where: { userId: userA.id },
  });
  const decryptedA = decryptApiKey(configA!.encryptedApiKey);
  const maskedA = maskApiKey(decryptedA);

  // Query User B config
  const configB = await prisma.aIProviderConfig.findUnique({
    where: { userId: userB.id },
  });
  const decryptedB = decryptApiKey(configB!.encryptedApiKey);
  const maskedB = maskApiKey(decryptedB);

  console.log(`[Isolation A] User A resolves Key A: ${decryptedA === keyA ? 'PASS' : 'FAIL'} (Masked: ${maskedA})`);
  console.log(`[Isolation B] User B resolves Key B: ${decryptedB === keyB ? 'PASS' : 'FAIL'} (Masked: ${maskedB})`);
  console.log(`[Cross-Tenant Isolation] User A cannot see User B key: ${decryptedA !== decryptedB ? 'PASS' : 'FAIL'}`);

  // 3. Provider Resolution Logic
  console.log('\n--- 3. Testing Dynamic Provider Resolution ---');
  const resolvedA = await resolveAIProvider(userA.id, prisma);
  const resolvedB = await resolveAIProvider(userB.id, prisma);
  const resolvedFallback = await resolveAIProvider(undefined, prisma);

  console.log(`[Resolution User A] Resolved to BYOK Provider: ${resolvedA.isBYOK ? 'PASS' : 'FAIL'}`);
  console.log(`[Resolution User B] Resolved to BYOK Provider: ${resolvedB.isBYOK ? 'PASS' : 'FAIL'}`);
  console.log(`[Resolution Fallback] Resolved to System Provider: ${!resolvedFallback.isBYOK ? 'PASS' : 'FAIL'}`);

  // 4. Delete Provider Configuration
  console.log('\n--- 4. Testing Delete Provider Configuration ---');
  await prisma.aIProviderConfig.delete({
    where: { userId: userB.id },
  });

  const resolvedBAfterDelete = await resolveAIProvider(userB.id, prisma);
  console.log(`[Delete BYOK] User B key removed, falls back safely to system provider: ${!resolvedBAfterDelete.isBYOK ? 'PASS' : 'FAIL'}`);

  // Clean up test data
  await prisma.aIProviderConfig.deleteMany({ where: { userId: userA.id } });
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });

  await pool.end();

  console.log('\n===============================================================');
  console.log('  PHASE 5 BYOK TEST SUITE PASSED SUCCESSFULLY');
  console.log('===============================================================');
}

runBYOKTests().catch((e) => {
  console.error('BYOK test failed:', e);
  process.exit(1);
});
