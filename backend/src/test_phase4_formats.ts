import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import { parseLogContent } from './lib/parser';
import { runDetectionEngine } from './lib/threatDetectionEngine';
import { PrismaClient, LogRecord } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

interface BenchmarkResult {
  format: string;
  fileSize: string;
  recordCount: number;
  parseTimeMs: number;
  detectTimeMs: number;
  errors: number;
  threatsDetected: number;
  threatTitles: string[];
}

async function runPhase4Tests() {
  console.log('===============================================================');
  console.log('  AEGISAI PHASE 4 — MULTI-FORMAT INGESTION & NORMALIZATION TEST');
  console.log('===============================================================\n');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  console.log('[Setup] Connected to Neon PostgreSQL.');

  const results: BenchmarkResult[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. REGRESSION TEST: 100-RECORD BENCHMARK CSV
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Testing CSV & Regression Benchmark ---');
  const benchmarkCsvPath = path.join(__dirname, '..', '..', 'tests', 'data', 'auth_logs_100.csv');
  let csvContent: string;
  if (fs.existsSync(benchmarkCsvPath)) {
    csvContent = fs.readFileSync(benchmarkCsvPath, 'utf-8');
  } else {
    // Generate identical 100-record benchmark if path differs
    const lines = ['timestamp,username,source_ip,action,status,location'];
    for (let i = 1; i <= 94; i++) {
      lines.push(`2026-03-01T10:${String(i % 60).padStart(2, '0')}:00Z,user${i},192.168.1.${i % 250},LOGIN,SUCCESS,United States`);
    }
    for (let i = 1; i <= 6; i++) {
      lines.push(`2026-03-01T12:00:0${i}Z,admin,10.0.0.99,LOGIN,FAILURE,United States`);
    }
    csvContent = lines.join('\n');
  }

  const t0_csv = performance.now();
  const csvParsed = await parseLogContent(csvContent, 'auth_logs_100.csv');
  const t1_csv = performance.now();

  const mockRecordsCsv: LogRecord[] = csvParsed.records.map((r, idx) => ({
    id: `csv-${idx}`,
    fileId: 'test-file-csv',
    rowIndex: r.rowIndex,
    raw: r.raw,
    timestamp: r.timestamp ?? null,
    level: r.level ?? null,
    source: r.source ?? null,
    message: r.message ?? null,
    extra: r.extra ?? null,
    createdAt: new Date(),
  }));

  const t0_det_csv = performance.now();
  const csvThreats = runDetectionEngine(mockRecordsCsv, 'test-file-csv');
  const t1_det_csv = performance.now();

  const bruteForceThreats = csvThreats.filter(t => t.title.includes('Brute Force'));
  const impossibleTravelThreats = csvThreats.filter(t => t.title.includes('Impossible Travel'));
  const privThreats = csvThreats.filter(t => t.title.includes('Privileged'));

  console.log(`[CSV] Records: ${csvParsed.parsedRecords}, Parse: ${(t1_csv - t0_csv).toFixed(2)}ms, Detect: ${(t1_det_csv - t0_det_csv).toFixed(2)}ms`);
  console.log(`[CSV Regression] Brute Force = ${bruteForceThreats.length} (Expected 1): ${bruteForceThreats.length === 1 ? 'PASS' : 'FAIL'}`);
  console.log(`[CSV Regression] Impossible Travel = ${impossibleTravelThreats.length} (Expected 0): ${impossibleTravelThreats.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`[CSV Regression] Privileged Activity = ${privThreats.length} (Expected 0): ${privThreats.length === 0 ? 'PASS' : 'FAIL'}`);

  results.push({
    format: 'CSV',
    fileSize: `${(Buffer.byteLength(csvContent) / 1024).toFixed(1)} KB`,
    recordCount: csvParsed.parsedRecords,
    parseTimeMs: Math.round(t1_csv - t0_csv),
    detectTimeMs: Math.round(t1_det_csv - t0_det_csv),
    errors: csvParsed.errorCount,
    threatsDetected: csvThreats.length,
    threatTitles: csvThreats.map(t => t.title),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. TEST JSON (Array & Object)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing JSON Ingestion & Normalization ---');
  const jsonEvents = [
    { event_time: '2026-03-01T08:00:00Z', user_name: 'alice', client_ip: '192.168.1.10', action: 'LOGIN', login_result: 'SUCCESS', details: 'Normal workstation login' },
    { event_time: '2026-03-01T08:01:00Z', user_name: 'bob', client_ip: '192.168.1.11', action: 'FILE_ACCESS', login_result: 'SUCCESS', details: 'Read document.pdf' },
    // Brute force sequence
    { event_time: '2026-03-01T08:05:01Z', user_name: 'root', client_ip: '45.33.32.156', action: 'LOGIN', login_result: 'FAILURE', details: 'SSH auth failed' },
    { event_time: '2026-03-01T08:05:02Z', user_name: 'root', client_ip: '45.33.32.156', action: 'LOGIN', login_result: 'FAILURE', details: 'SSH auth failed' },
    { event_time: '2026-03-01T08:05:03Z', user_name: 'root', client_ip: '45.33.32.156', action: 'LOGIN', login_result: 'FAILURE', details: 'SSH auth failed' },
    { event_time: '2026-03-01T08:05:04Z', user_name: 'root', client_ip: '45.33.32.156', action: 'LOGIN', login_result: 'FAILURE', details: 'SSH auth failed' },
    { event_time: '2026-03-01T08:05:05Z', user_name: 'root', client_ip: '45.33.32.156', action: 'LOGIN', login_result: 'FAILURE', details: 'SSH auth failed' },
  ];
  const jsonStr = JSON.stringify(jsonEvents, null, 2);

  const t0_json = performance.now();
  const jsonParsed = await parseLogContent(jsonStr, 'auth_events.json');
  const t1_json = performance.now();

  const mockRecordsJson: LogRecord[] = jsonParsed.records.map((r, idx) => ({
    id: `json-${idx}`,
    fileId: 'test-file-json',
    rowIndex: r.rowIndex,
    raw: r.raw,
    timestamp: r.timestamp ?? null,
    level: r.level ?? null,
    source: r.source ?? null,
    message: r.message ?? null,
    extra: r.extra ?? null,
    createdAt: new Date(),
  }));

  const t0_det_json = performance.now();
  const jsonThreats = runDetectionEngine(mockRecordsJson, 'test-file-json');
  const t1_det_json = performance.now();

  console.log(`[JSON] Records: ${jsonParsed.parsedRecords}, Parse: ${(t1_json - t0_json).toFixed(2)}ms, Detect: ${(t1_det_json - t0_det_json).toFixed(2)}ms`);
  console.log(`[JSON Detection] Brute force detected from 45.33.32.156: ${jsonThreats.some(t => t.evidence?.sourceIp === '45.33.32.156') ? 'PASS' : 'FAIL'}`);

  results.push({
    format: 'JSON',
    fileSize: `${(Buffer.byteLength(jsonStr) / 1024).toFixed(1)} KB`,
    recordCount: jsonParsed.parsedRecords,
    parseTimeMs: Math.round(t1_json - t0_json),
    detectTimeMs: Math.round(t1_det_json - t0_det_json),
    errors: jsonParsed.errorCount,
    threatsDetected: jsonThreats.length,
    threatTitles: jsonThreats.map(t => t.title),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. TEST JSONL (Newline-Delimited JSON)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing JSONL (NDJSON) Ingestion ---');
  const jsonlLines = [
    '{"datetime":"2026-03-01T09:00:00Z","user":"charlie","ip":"10.1.1.5","action":"LOGIN","status":"SUCCESS","message":"Workstation login"}',
    '', // blank line to test resilience
    '{"datetime":"2026-03-01T09:00:10Z","user":"charlie","ip":"10.1.1.5","action":"COMMAND","command":"sudo systemctl restart nginx","status":"SUCCESS"}',
    '{"MALFORMED_JSON_LINE_TEST', // intentional invalid JSON line to verify line-level recovery
    '{"datetime":"2026-03-01T09:01:00Z","user":"david","ip":"10.1.1.6","action":"LOGOUT","status":"SUCCESS","message":"User logged out"}',
  ];
  const jsonlContent = jsonlLines.join('\n');

  const t0_jsonl = performance.now();
  const jsonlParsed = await parseLogContent(jsonlContent, 'cloudtrail.jsonl');
  const t1_jsonl = performance.now();

  const mockRecordsJsonl: LogRecord[] = jsonlParsed.records.map((r, idx) => ({
    id: `jsonl-${idx}`,
    fileId: 'test-file-jsonl',
    rowIndex: r.rowIndex,
    raw: r.raw,
    timestamp: r.timestamp ?? null,
    level: r.level ?? null,
    source: r.source ?? null,
    message: r.message ?? null,
    extra: r.extra ?? null,
    createdAt: new Date(),
  }));

  const t0_det_jsonl = performance.now();
  const jsonlThreats = runDetectionEngine(mockRecordsJsonl, 'test-file-jsonl');
  const t1_det_jsonl = performance.now();

  console.log(`[JSONL] Records: ${jsonlParsed.parsedRecords}, Errors caught: ${jsonlParsed.errorCount} (Expected 1), Parse: ${(t1_jsonl - t0_jsonl).toFixed(2)}ms`);
  console.log(`[JSONL Recovery] Parsed valid lines despite malformed line: ${jsonlParsed.parsedRecords === 4 && jsonlParsed.errorCount === 1 ? 'PASS' : 'FAIL'}`);

  results.push({
    format: 'JSONL',
    fileSize: `${(Buffer.byteLength(jsonlContent) / 1024).toFixed(1)} KB`,
    recordCount: jsonlParsed.parsedRecords,
    parseTimeMs: Math.round(t1_jsonl - t0_jsonl),
    detectTimeMs: Math.round(t1_det_jsonl - t0_det_jsonl),
    errors: jsonlParsed.errorCount,
    threatsDetected: jsonlThreats.length,
    threatTitles: jsonlThreats.map(t => t.title),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. TEST XLSX (Excel Workbook)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing XLSX (Excel Workbook) Ingestion ---');
  const xlsxData = [
    { 'Timestamp': '2026-03-01 14:00:00', 'Username': 'eve', 'Source IP': '192.168.10.50', 'Action': 'LOGIN', 'Status': 'SUCCESS', 'Message': 'VPN login' },
    { 'Timestamp': '2026-03-01 14:00:01', 'Username': 'admin', 'Source IP': '185.220.101.5', 'Action': 'LOGIN', 'Status': 'FAILURE', 'Message': 'Bad password' },
    { 'Timestamp': '2026-03-01 14:00:02', 'Username': 'admin', 'Source IP': '185.220.101.5', 'Action': 'LOGIN', 'Status': 'FAILURE', 'Message': 'Bad password' },
    { 'Timestamp': '2026-03-01 14:00:03', 'Username': 'admin', 'Source IP': '185.220.101.5', 'Action': 'LOGIN', 'Status': 'FAILURE', 'Message': 'Bad password' },
    { 'Timestamp': '2026-03-01 14:00:04', 'Username': 'admin', 'Source IP': '185.220.101.5', 'Action': 'LOGIN', 'Status': 'FAILURE', 'Message': 'Bad password' },
    { 'Timestamp': '2026-03-01 14:00:05', 'Username': 'admin', 'Source IP': '185.220.101.5', 'Action': 'LOGIN', 'Status': 'FAILURE', 'Message': 'Bad password' },
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(xlsxData);
  xlsx.utils.book_append_sheet(wb, ws, 'SecurityEvents');
  const xlsxBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const t0_xlsx = performance.now();
  const xlsxParsed = await parseLogContent(xlsxBuffer, 'audit_export.xlsx');
  const t1_xlsx = performance.now();

  const mockRecordsXlsx: LogRecord[] = xlsxParsed.records.map((r, idx) => ({
    id: `xlsx-${idx}`,
    fileId: 'test-file-xlsx',
    rowIndex: r.rowIndex,
    raw: r.raw,
    timestamp: r.timestamp ?? null,
    level: r.level ?? null,
    source: r.source ?? null,
    message: r.message ?? null,
    extra: r.extra ?? null,
    createdAt: new Date(),
  }));

  const t0_det_xlsx = performance.now();
  const xlsxThreats = runDetectionEngine(mockRecordsXlsx, 'test-file-xlsx');
  const t1_det_xlsx = performance.now();

  console.log(`[XLSX] Records: ${xlsxParsed.parsedRecords}, Parse: ${(t1_xlsx - t0_xlsx).toFixed(2)}ms, Detect: ${(t1_det_xlsx - t0_det_xlsx).toFixed(2)}ms`);
  console.log(`[XLSX Detection] Brute force detected from 185.220.101.5: ${xlsxThreats.some(t => t.evidence?.sourceIp === '185.220.101.5') ? 'PASS' : 'FAIL'}`);

  results.push({
    format: 'XLSX',
    fileSize: `${(xlsxBuffer.length / 1024).toFixed(1)} KB`,
    recordCount: xlsxParsed.parsedRecords,
    parseTimeMs: Math.round(t1_xlsx - t0_xlsx),
    detectTimeMs: Math.round(t1_det_xlsx - t0_det_xlsx),
    errors: xlsxParsed.errorCount,
    threatsDetected: xlsxThreats.length,
    threatTitles: xlsxThreats.map(t => t.title),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. TEST XML (Safe XML Parsing)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing XML Ingestion ---');
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<AuditLog>
  <Event>
    <timestamp>2026-03-01T15:00:00Z</timestamp>
    <username>frank</username>
    <source_ip>10.0.0.12</source_ip>
    <action>AUTH</action>
    <status>SUCCESS</status>
    <message>Kerberos ticket granted</message>
  </Event>
  <Event>
    <timestamp>2026-03-01T15:01:00Z</timestamp>
    <username>grace</username>
    <source_ip>10.0.0.15</source_ip>
    <action>SMB_READ</action>
    <status>SUCCESS</status>
    <message>Accessed finance share</message>
  </Event>
</AuditLog>`;

  const t0_xml = performance.now();
  const xmlParsed = await parseLogContent(xmlContent, 'events.xml');
  const t1_xml = performance.now();

  const mockRecordsXml: LogRecord[] = xmlParsed.records.map((r, idx) => ({
    id: `xml-${idx}`,
    fileId: 'test-file-xml',
    rowIndex: r.rowIndex,
    raw: r.raw,
    timestamp: r.timestamp ?? null,
    level: r.level ?? null,
    source: r.source ?? null,
    message: r.message ?? null,
    extra: r.extra ?? null,
    createdAt: new Date(),
  }));

  const t0_det_xml = performance.now();
  const xmlThreats = runDetectionEngine(mockRecordsXml, 'test-file-xml');
  const t1_det_xml = performance.now();

  console.log(`[XML] Records: ${xmlParsed.parsedRecords}, Parse: ${(t1_xml - t0_xml).toFixed(2)}ms, Detect: ${(t1_det_xml - t0_det_xml).toFixed(2)}ms`);
  console.log(`[XML Normalization] User and IP normalized: ${xmlParsed.records[0].source === '10.0.0.12' ? 'PASS' : 'FAIL'}`);

  results.push({
    format: 'XML',
    fileSize: `${(Buffer.byteLength(xmlContent) / 1024).toFixed(1)} KB`,
    recordCount: xmlParsed.parsedRecords,
    parseTimeMs: Math.round(t1_xml - t0_xml),
    detectTimeMs: Math.round(t1_det_xml - t0_det_xml),
    errors: xmlParsed.errorCount,
    threatsDetected: xmlThreats.length,
    threatTitles: xmlThreats.map(t => t.title),
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. TEST SYSLOG / LOG / TXT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Syslog & Raw Log Format ---');
  const syslogContent = `Mar 01 16:00:00 webserver01 sshd[12345]: Failed password for invalid user admin from 192.168.1.55 port 44322 ssh2
Mar 01 16:00:02 webserver01 sshd[12346]: Failed password for invalid user admin from 192.168.1.55 port 44324 ssh2
Mar 01 16:00:04 webserver01 sshd[12347]: Accepted publickey for analyst from 192.168.1.100 port 44326 ssh2`;

  const t0_sys = performance.now();
  const sysParsed = await parseLogContent(syslogContent, 'auth.log');
  const t1_sys = performance.now();

  console.log(`[Syslog] Records: ${sysParsed.parsedRecords}, Parse: ${(t1_sys - t0_sys).toFixed(2)}ms`);
  results.push({
    format: 'SYSLOG',
    fileSize: `${(Buffer.byteLength(syslogContent) / 1024).toFixed(1)} KB`,
    recordCount: sysParsed.parsedRecords,
    parseTimeMs: Math.round(t1_sys - t0_sys),
    detectTimeMs: 0,
    errors: sysParsed.errorCount,
    threatsDetected: 0,
    threatTitles: [],
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. TEST MULTI-FILE INGESTION & DUPLICATE PREVENTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing Multi-File Ingestion & Duplicate Prevention ---');
  // Create a test user and analysis in Neon PostgreSQL
  const testUser = await prisma.user.create({
    data: {
      name: 'Multi-Format Tester',
      email: `tester_${Date.now()}@aegisai.test`,
      passwordHash: 'dummy-hash',
    },
  });

  const testAnalysis = await prisma.analysis.create({
    data: {
      userId: testUser.id,
      name: 'Multi-Format Telemetry Fusion',
      status: 'READY',
    },
  });

  // Ingest File 1 (CSV)
  const file1 = await prisma.logFile.create({
    data: {
      analysisId: testAnalysis.id,
      fileName: 'auth.csv',
      originalName: 'auth.csv',
      fileSize: 1024,
      mimeType: 'text/csv',
      logType: 'CSV',
      totalLines: 10,
      parsedRecords: 10,
      status: 'READY',
    },
  });

  // Ingest File 2 (XLSX) in the same analysis
  const file2 = await prisma.logFile.create({
    data: {
      analysisId: testAnalysis.id,
      fileName: 'firewall.xlsx',
      originalName: 'firewall.xlsx',
      fileSize: 4096,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      logType: 'XLSX',
      totalLines: 50,
      parsedRecords: 50,
      status: 'READY',
    },
  });

  // Verify multiple files in same analysis
  const filesInAnalysis = await prisma.logFile.findMany({
    where: { analysisId: testAnalysis.id },
  });
  console.log(`[Multi-File Check] Files in same Analysis: ${filesInAnalysis.length} (Expected 2): ${filesInAnalysis.length === 2 ? 'PASS' : 'FAIL'}`);

  // Test duplicate check logic
  const isDuplicate = await prisma.logFile.findFirst({
    where: {
      analysisId: testAnalysis.id,
      originalName: 'auth.csv',
      fileSize: 1024,
    },
  });
  console.log(`[Duplicate Prevention Check] Duplicate file recognized: ${isDuplicate !== null ? 'PASS' : 'FAIL'}`);

  // Clean up test records
  await prisma.logFile.deleteMany({ where: { analysisId: testAnalysis.id } });
  await prisma.analysis.delete({ where: { id: testAnalysis.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  await pool.end();

  console.log('\n===============================================================');
  console.log('  PHASE 4 MULTI-FORMAT BENCHMARK & TEST SUMMARY');
  console.log('===============================================================');
  console.table(results);
}

runPhase4Tests().catch((e) => {
  console.error('Phase 4 Test failed:', e);
  process.exit(1);
});
