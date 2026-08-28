import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function inspectCsv(filename: string) {
  const p = path.join(process.cwd(), 'uploads', filename);
  if (!fs.existsSync(p)) return;
  const buf = fs.readFileSync(p);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const lines = buf.toString('utf-8').split(/\r?\n/).filter(l => l.trim().length > 0);

  console.log(`\n========================================`);
  console.log(`FILE: ${p}`);
  console.log(`SIZE: ${buf.length} bytes`);
  console.log(`SHA256: ${hash}`);
  console.log(`TOTAL LINES: ${lines.length} (Header + ${lines.length - 1} data records)`);
  console.log(`HEADER: ${lines[0]}`);

  const headerCols = lines[0].split(',');
  console.log(`HEADER COLUMNS (${headerCols.length}): ${headerCols.join(' | ')}`);

  let successCount = 0;
  let failCount = 0;
  const bfEvents: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',');
    // Check status in line
    const isSuccess = line.includes('SUCCESS') || line.includes('200') || line.includes('LOGIN_SUCCESS');
    const isFail = line.includes('FAILURE') || line.includes('FAILED') || line.includes('401') || line.includes('403') || line.includes('LOGIN_FAILED');
    
    if (isSuccess) successCount++;
    if (isFail) failCount++;

    if (line.includes('203.0.113.55') || line.includes('admin') && isFail) {
      bfEvents.push({ lineIndex: i, line });
    }
  }

  console.log(`SUCCESSFUL EVENTS: ${successCount}`);
  console.log(`FAILED EVENTS: ${failCount}`);
  console.log(`BRUTE FORCE / SUSPICIOUS EVENTS MATCHING: ${bfEvents.length}`);
  bfEvents.forEach(b => console.log(`  Line ${b.lineIndex}: ${b.line}`));
}

inspectCsv('1786445044657-777713.csv');
inspectCsv('1786715071064-323267.csv');
inspectCsv('1786715513724-699622.csv');
