import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function verify() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log('=== Neon PostgreSQL LogFile Records ===');
  const files = await prisma.logFile.findMany({
    orderBy: { uploadedAt: 'asc' },
    include: { analysis: true },
  });

  for (const f of files) {
    console.log(`- ID: ${f.id} | Original: ${f.originalName} | Stored: ${f.fileName} | Size: ${f.fileSize} bytes | Lines: ${f.totalLines} | Records: ${f.parsedRecords} | Uploaded: ${f.uploadedAt.toISOString()}`);
    const diskPath = path.join(process.cwd(), 'uploads', f.fileName);
    if (fs.existsSync(diskPath)) {
      const content = fs.readFileSync(diskPath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      console.log(`  Disk File: ${diskPath} | Exists: true | Bytes: ${content.length} | SHA256: ${hash}`);
    } else {
      console.log(`  Disk File: ${diskPath} | Exists: FALSE`);
    }
  }

  // Find the primary 100-record benchmark file in DB
  const benchLog = await prisma.logFile.findFirst({
    where: { originalName: 'AegisAI_Dummy_Website_Authentication_Logs_100.csv' },
    orderBy: { uploadedAt: 'asc' },
  });

  if (benchLog) {
    console.log('\n=== Primary Benchmark File Analysis ===');
    console.log(`File ID: ${benchLog.id} | Stored: ${benchLog.fileName}`);
    const records = await prisma.logRecord.findMany({
      where: { fileId: benchLog.id },
      orderBy: { rowIndex: 'asc' },
    });

    console.log(`Total LogRecords in Neon: ${records.length}`);
    
    // Analyze events
    let successCount = 0;
    let failCount = 0;
    const bfEvents: any[] = [];

    records.forEach((r) => {
      const extra = JSON.parse(r.extra || '{}');
      const status = (extra.status || '').toUpperCase();
      const ip = extra.sourceIp || r.source || '';
      const user = extra.user || '';
      const ts = r.timestamp || extra.timestamp || '';

      if (status === 'SUCCESS') successCount++;
      if (status === 'FAILURE' || status === 'FAILED') {
        failCount++;
        if (ip === '203.0.113.55' && user === 'admin') {
          bfEvents.push({ rowIndex: r.rowIndex, timestamp: ts, ip, user, status, action: extra.action });
        }
      }
    });

    console.log(`Success Events: ${successCount}`);
    console.log(`Failed Events: ${failCount}`);
    console.log(`Brute Force Events Count: ${bfEvents.length}`);
    console.log(`Source IP: ${bfEvents[0]?.ip}`);
    console.log(`Target Username: ${bfEvents[0]?.user}`);
    console.log('Brute Force Timestamps:');
    bfEvents.forEach(b => console.log(`  - Row ${b.rowIndex}: ${b.timestamp} (${b.ip} -> ${b.user}, status: ${b.status})`));
  }

  // Also check all physical files in uploads
  console.log('\n=== All CSV files in uploads/ ===');
  const uploadDir = path.join(process.cwd(), 'uploads');
  const dirFiles = fs.readdirSync(uploadDir).filter(f => f.endsWith('.csv'));
  for (const df of dirFiles) {
    const p = path.join(uploadDir, df);
    const buf = fs.readFileSync(p);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const text = buf.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    console.log(`File: ${p}`);
    console.log(`  Size: ${buf.length} bytes | Lines: ${lines.length} | SHA256: ${hash}`);
    if (lines.length > 0) {
      console.log(`  Header: ${lines[0].slice(0, 80)}`);
    }
  }

  await pool.end();
}

verify().catch(console.error);
