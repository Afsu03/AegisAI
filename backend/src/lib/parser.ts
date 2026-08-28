/**
 * AegisAI Multi-Format Log Ingestion & Normalization Engine (Phase 4)
 * Converts CSV, JSON, JSONL, XLSX, XML, Syslog, Windows Events, and text logs
 * into a single normalized LogRecord structure for deterministic threat detection.
 */

import csv from 'csv-parser';
import { Readable } from 'stream';
import * as xlsx from 'xlsx';
import { XMLParser } from 'fast-xml-parser';

export type LogType =
  | 'CSV'
  | 'JSON'
  | 'JSONL'
  | 'XLSX'
  | 'XML'
  | 'SYSLOG'
  | 'WINDOWS_EVENT'
  | 'FIREWALL'
  | 'GENERIC';

export interface NormalizedSecurityEvent {
  timestamp: string | null;
  level: string | null;
  source: string | null;
  message: string | null;
  user: string | null;
  sourceIp: string | null;
  destinationIp: string | null;
  action: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  extra: Record<string, any>;
}

export interface ParsedRecord {
  rowIndex: number;
  raw: string;
  timestamp?: string;
  level?: string;
  source?: string;
  message?: string;
  extra?: string; // JSON string of normalized + extra fields
}

export interface ParseResult {
  logType: LogType;
  totalLines: number;
  parsedRecords: number;
  errorCount: number;
  records: ParsedRecord[];
}

export interface SecurityLogParser {
  parse(contentOrBuffer: string | Buffer, filename: string): Promise<ParseResult>;
}

// ─── Normalization Helper ──────────────────────────────────────────────────

const TIMESTAMP_KEYS = new Set(['timestamp', 'time', 'event_time', 'datetime', '@timestamp', 'date', 'recorded_at', 'eventtime', 'timestamp_utc']);
const LEVEL_KEYS = new Set(['level', 'severity', 'priority', 'loglevel', 'log_level', 'type']);
const SOURCE_KEYS = new Set(['source', 'host', 'hostname', 'server', 'service', 'app', 'application', 'src_host']);
const MESSAGE_KEYS = new Set(['message', 'msg', 'event', 'description', 'details', 'text', 'info', 'summary', 'reason']);
const USER_KEYS = new Set(['user', 'username', 'account', 'user_name', 'usr', 'identity', 'login', 'account_name', 'principal']);
const SRC_IP_KEYS = new Set(['source_ip', 'src_ip', 'client_ip', 'srcip', 'sourceip', 'src', 'ip', 'ip_address', 'ipaddress', 'caller_ip']);
const DST_IP_KEYS = new Set(['destination_ip', 'dst_ip', 'dest_ip', 'dstip', 'destip', 'dst', 'target_ip']);
const ACTION_KEYS = new Set(['action', 'event_type', 'activity', 'method', 'command', 'operation', 'event_name']);
const STATUS_KEYS = new Set(['status', 'login_result', 'result', 'outcome', 'response_code', 'http_status', 'auth_status', 'state']);
const LAT_KEYS = new Set(['latitude', 'lat']);
const LON_KEYS = new Set(['longitude', 'lon', 'lng', 'long']);
const LOC_KEYS = new Set(['location', 'country', 'city', 'region', 'geo', 'geolocation']);

/**
 * Normalizes an arbitrary key-value object into a standard NormalizedSecurityEvent.
 * Unmapped/unknown fields are preserved in the `extra` dictionary.
 */
export function normalizeEventFields(rawObj: Record<string, any>): NormalizedSecurityEvent {
  const norm: NormalizedSecurityEvent = {
    timestamp: null,
    level: null,
    source: null,
    message: null,
    user: null,
    sourceIp: null,
    destinationIp: null,
    action: null,
    status: null,
    latitude: null,
    longitude: null,
    location: null,
    extra: {},
  };

  if (!rawObj || typeof rawObj !== 'object') {
    return norm;
  }

  for (const [key, value] of Object.entries(rawObj)) {
    if (value === undefined || value === null || value === '') continue;

    const lower = key.toLowerCase().trim().replace(/[\s\-_]+/g, '_');
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();

    if (!norm.timestamp && (TIMESTAMP_KEYS.has(lower) || TIMESTAMP_KEYS.has(key.toLowerCase().trim()))) {
      norm.timestamp = strVal;
    } else if (!norm.level && (LEVEL_KEYS.has(lower) || LEVEL_KEYS.has(key.toLowerCase().trim()))) {
      norm.level = strVal.toUpperCase();
    } else if (!norm.source && (SOURCE_KEYS.has(lower) || SOURCE_KEYS.has(key.toLowerCase().trim()))) {
      norm.source = strVal;
    } else if (!norm.message && (MESSAGE_KEYS.has(lower) || MESSAGE_KEYS.has(key.toLowerCase().trim()))) {
      norm.message = strVal;
    } else if (!norm.user && (USER_KEYS.has(lower) || USER_KEYS.has(key.toLowerCase().trim()))) {
      norm.user = strVal;
      norm.extra['username'] = strVal;
      norm.extra['user'] = strVal;
    } else if (!norm.sourceIp && (SRC_IP_KEYS.has(lower) || SRC_IP_KEYS.has(key.toLowerCase().trim()))) {
      norm.sourceIp = strVal;
      norm.extra['sourceIp'] = strVal;
      norm.extra['source_ip'] = strVal;
      norm.extra['ip_address'] = strVal;
      norm.extra['ip'] = strVal;
    } else if (!norm.destinationIp && (DST_IP_KEYS.has(lower) || DST_IP_KEYS.has(key.toLowerCase().trim()))) {
      norm.destinationIp = strVal;
      norm.extra['destinationIp'] = strVal;
    } else if (!norm.action && (ACTION_KEYS.has(lower) || ACTION_KEYS.has(key.toLowerCase().trim()))) {
      norm.action = strVal;
      norm.extra['action'] = strVal;
    } else if (!norm.status && (STATUS_KEYS.has(lower) || STATUS_KEYS.has(key.toLowerCase().trim()))) {
      norm.status = strVal;
      norm.extra['status'] = strVal;
      norm.extra['login_result'] = strVal;
    } else if (norm.latitude === null && (LAT_KEYS.has(lower) || LAT_KEYS.has(key.toLowerCase().trim()))) {
      const num = parseFloat(strVal);
      if (!isNaN(num)) {
        norm.latitude = num;
        norm.extra['latitude'] = num;
      }
    } else if (norm.longitude === null && (LON_KEYS.has(lower) || LON_KEYS.has(key.toLowerCase().trim()))) {
      const num = parseFloat(strVal);
      if (!isNaN(num)) {
        norm.longitude = num;
        norm.extra['longitude'] = num;
      }
    } else if (!norm.location && (LOC_KEYS.has(lower) || LOC_KEYS.has(key.toLowerCase().trim()))) {
      norm.location = strVal;
      norm.extra['location'] = strVal;
      norm.extra['country'] = strVal;
    } else {
      norm.extra[key] = value;
    }
  }

  // If source is not set but sourceIp exists, use sourceIp
  if (!norm.source && norm.sourceIp) {
    norm.source = norm.sourceIp;
  }

  return norm;
}

// ─── Format Detection ──────────────────────────────────────────────────────

const SYSLOG_RE =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\S+\s+\S+/;
const WIN_EVENT_RE = /EventID|EventCode|<Event\s/i;
const FIREWALL_RE =
  /\b(ALLOW|DENY|DROP|ACCEPT|REJECT|BLOCK)\b.*(src|dst|SRC|DST|srcip|dstip)/i;
const TIMESTAMP_RE =
  /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/;
const LEVEL_RE =
  /\b(CRITICAL|ALERT|EMERGENCY|ERROR|ERR|WARN|WARNING|NOTICE|INFO|DEBUG|TRACE)\b/i;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;

export function detectLogType(contentOrBuffer: string | Buffer, filename: string): LogType {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') return 'XLSX';
  if (ext === 'jsonl' || ext === 'ndjson') return 'JSONL';
  if (ext === 'xml') return 'XML';
  if (ext === 'csv') return 'CSV';
  if (ext === 'json') return 'JSON';

  const contentStr = typeof contentOrBuffer === 'string'
    ? contentOrBuffer
    : contentOrBuffer.toString('utf-8');

  const first500 = contentStr.slice(0, 500).trim();

  if (first500.startsWith('<?xml') || (first500.startsWith('<') && first500.includes('>'))) {
    return 'XML';
  }
  if (first500.startsWith('[') || first500.startsWith('{')) {
    // Check if it is multiline JSON or single JSON array
    try {
      JSON.parse(contentStr);
      return 'JSON';
    } catch {
      if (contentStr.includes('\n')) return 'JSONL';
      return 'JSON';
    }
  }

  if (WIN_EVENT_RE.test(first500)) return 'WINDOWS_EVENT';
  if (FIREWALL_RE.test(first500))  return 'FIREWALL';
  if (SYSLOG_RE.test(first500))    return 'SYSLOG';

  return 'GENERIC';
}

// ─── Format Parsers ────────────────────────────────────────────────────────

/**
 * 1. CSV Parser — Stream-based, preserves quotes and headers.
 */
export function parseCSV(content: string): Promise<ParsedRecord[]> {
  return new Promise((resolve, reject) => {
    const records: ParsedRecord[] = [];
    let rowIndex = 0;

    const stream = Readable.from(content).pipe(csv());

    stream.on('data', (row) => {
      const normalized = normalizeEventFields(row);

      records.push({
        rowIndex,
        raw: JSON.stringify(row),
        timestamp: normalized.timestamp || undefined,
        level: normalized.level || undefined,
        source: normalized.source || undefined,
        message: normalized.message || undefined,
        extra: Object.keys(normalized.extra).length > 0 ? JSON.stringify(normalized.extra) : undefined,
      });
      rowIndex++;
    });

    stream.on('end', () => resolve(records));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * 2. JSON Parser — Handles JSON arrays [{...}] or single object events.
 */
export function parseJSON(content: string): ParsedRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback to JSONL
    return parseJSONL(content).records;
  }

  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.map((item: any, idx) => {
    const normalized = typeof item === 'object' && item !== null
      ? normalizeEventFields(item)
      : normalizeEventFields({ value: item });

    return {
      rowIndex: idx,
      raw: JSON.stringify(item),
      timestamp: normalized.timestamp || undefined,
      level: normalized.level || undefined,
      source: normalized.source || undefined,
      message: normalized.message || undefined,
      extra: Object.keys(normalized.extra).length > 0 ? JSON.stringify(normalized.extra) : undefined,
    };
  });
}

/**
 * 3. JSONL Parser — One JSON object per line, skips blank lines, resilient to bad lines.
 */
export function parseJSONL(content: string): { records: ParsedRecord[]; totalLines: number; errorCount: number } {
  const lines = content.split(/\r?\n/);
  const records: ParsedRecord[] = [];
  let errorCount = 0;
  let rowIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const parsed = JSON.parse(line);
      const normalized = typeof parsed === 'object' && parsed !== null
        ? normalizeEventFields(parsed)
        : normalizeEventFields({ value: parsed });

      records.push({
        rowIndex,
        raw: line,
        timestamp: normalized.timestamp || undefined,
        level: normalized.level || undefined,
        source: normalized.source || undefined,
        message: normalized.message || undefined,
        extra: Object.keys(normalized.extra).length > 0 ? JSON.stringify(normalized.extra) : undefined,
      });
      rowIndex++;
    } catch {
      errorCount++;
      // Preserve as unparsed generic line rather than crashing
      records.push({
        rowIndex,
        raw: line,
        message: line.slice(0, 500),
      });
      rowIndex++;
    }
  }

  return { records, totalLines: lines.filter(Boolean).length, errorCount };
}

/**
 * 4. XLSX Parser — Reads first non-empty worksheet, extracts column headers and records.
 */
export function parseXLSX(buffer: Buffer): ParsedRecord[] {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });

  // Deterministic policy: select the first sheet with data rows
  let targetSheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet && sheet['!ref']) {
      targetSheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) return [];

  // Parse rows as json objects with headers from row 1
  const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd hh:mm:ss',
    defval: '',
  });

  return rawRows.map((row, idx) => {
    const normalized = normalizeEventFields(row);

    return {
      rowIndex: idx,
      raw: JSON.stringify(row),
      timestamp: normalized.timestamp || undefined,
      level: normalized.level || undefined,
      source: normalized.source || undefined,
      message: normalized.message || undefined,
      extra: Object.keys(normalized.extra).length > 0 ? JSON.stringify(normalized.extra) : undefined,
    };
  });
}

/**
 * 5. XML Parser — Safe XML parsing with XXE external entity expansion disabled.
 */
export function parseXML(content: string): ParsedRecord[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
    processEntities: false, // Prevents external entity execution / XXE
    trimValues: true,
  });

  const parsed = parser.parse(content);
  if (!parsed || typeof parsed !== 'object') return [];

  // Find candidate array of records in common XML schemas
  const findRecordsArray = (obj: any): any[] | null => {
    if (!obj || typeof obj !== 'object') return null;

    // Direct array?
    if (Array.isArray(obj)) return obj;

    // Look for common wrapper names: events, logs, records, audit, entries, items
    const candidates = ['Event', 'event', 'Log', 'log', 'Record', 'record', 'Entry', 'entry', 'Item', 'item', 'Row', 'row'];
    for (const key of Object.keys(obj)) {
      if (candidates.includes(key)) {
        const val = obj[key];
        return Array.isArray(val) ? val : [val];
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nested = findRecordsArray(obj[key]);
        if (nested) return nested;
      }
    }

    return null;
  };

  let recordsList = findRecordsArray(parsed);

  // If no array found, treat root properties as single record
  if (!recordsList) {
    recordsList = [parsed];
  }

  return recordsList.map((item, idx) => {
    const normalized = typeof item === 'object' && item !== null
      ? normalizeEventFields(item)
      : normalizeEventFields({ content: String(item) });

    return {
      rowIndex: idx,
      raw: typeof item === 'object' ? JSON.stringify(item) : String(item),
      timestamp: normalized.timestamp || undefined,
      level: normalized.level || undefined,
      source: normalized.source || undefined,
      message: normalized.message || undefined,
      extra: Object.keys(normalized.extra).length > 0 ? JSON.stringify(normalized.extra) : undefined,
    };
  });
}

/**
 * 6. Syslog Parser
 */
export function parseSyslog(lines: string[]): ParsedRecord[] {
  return lines.map((line, idx) => {
    const match = line.match(
      /^(\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s+(.*)/
    );
    if (match) {
      const [, ts, host, service, , msg] = match;
      const levelMatch = msg.match(LEVEL_RE);
      return {
        rowIndex: idx,
        raw: line,
        timestamp: ts,
        source: `${host}/${service}`,
        level: levelMatch ? levelMatch[1].toUpperCase() : 'INFO',
        message: msg,
      };
    }
    return parseGenericLine(line, idx);
  });
}

/**
 * 7. Windows Event Log Text Parser
 */
export function parseWindowsEvent(lines: string[]): ParsedRecord[] {
  return lines.map((line, idx) => {
    const eventId = line.match(/EventID[=:\s]+(\d+)/i)?.[1];
    const ts = line.match(TIMESTAMP_RE)?.[0];
    const level = line.match(LEVEL_RE)?.[1];
    const msg = line.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      rowIndex: idx,
      raw: line,
      timestamp: ts,
      level: level?.toUpperCase() ?? (eventId ? 'EVENT' : undefined),
      source: eventId ? `EventID:${eventId}` : undefined,
      message: msg.slice(0, 500),
    };
  });
}

/**
 * 8. Firewall Log Text Parser
 */
export function parseFirewall(lines: string[]): ParsedRecord[] {
  return lines.map((line, idx) => {
    const action = line.match(/\b(ALLOW|DENY|DROP|ACCEPT|REJECT|BLOCK)\b/i)?.[1];
    const ts = line.match(TIMESTAMP_RE)?.[0];
    const srcIP = line.match(/(?:src|SRC|srcip)[=:\s]+(\d+\.\d+\.\d+\.\d+)/i)?.[1];
    const dstIP = line.match(/(?:dst|DST|dstip)[=:\s]+(\d+\.\d+\.\d+\.\d+)/i)?.[1];

    return {
      rowIndex: idx,
      raw: line,
      timestamp: ts,
      level: action
        ? (action.toUpperCase() === 'ALLOW' || action.toUpperCase() === 'ACCEPT'
          ? 'INFO' : 'WARN')
        : undefined,
      source: srcIP || undefined,
      message: `${action ?? ''} ${srcIP ? `src=${srcIP}` : ''} ${dstIP ? `dst=${dstIP}` : ''}`.trim() || line.slice(0, 200),
      extra: JSON.stringify({ action, sourceIp: srcIP, destinationIp: dstIP }),
    };
  });
}

/**
 * 9. Generic Line Parser
 */
export function parseGenericLine(line: string, idx: number): ParsedRecord {
  const ts = line.match(TIMESTAMP_RE)?.[0];
  const level = line.match(LEVEL_RE)?.[1];
  const ipMatch = line.match(IP_RE);
  return {
    rowIndex: idx,
    raw: line,
    timestamp: ts,
    level: level?.toUpperCase(),
    source: ipMatch ? ipMatch[0] : undefined,
    message: line.slice(0, 500),
  };
}

export function parseGeneric(lines: string[]): ParsedRecord[] {
  return lines.map((line, idx) => parseGenericLine(line, idx));
}

// ─── Main Dispatcher ───────────────────────────────────────────────────────

export async function parseLogContent(
  contentOrBuffer: string | Buffer,
  filename: string
): Promise<ParseResult> {
  const logType = detectLogType(contentOrBuffer, filename);
  let records: ParsedRecord[] = [];
  let errorCount = 0;
  let totalLines = 0;

  const MAX_RECORDS = 25_000;

  try {
    if (logType === 'XLSX') {
      const buf = Buffer.isBuffer(contentOrBuffer)
        ? contentOrBuffer
        : Buffer.from(contentOrBuffer as string);
      records = parseXLSX(buf);
      totalLines = records.length;
    } else {
      const contentStr = typeof contentOrBuffer === 'string'
        ? contentOrBuffer
        : contentOrBuffer.toString('utf-8');

      if (logType === 'CSV') {
        records = await parseCSV(contentStr);
        totalLines = contentStr.split(/\r?\n/).filter(Boolean).length;
      } else if (logType === 'JSONL') {
        const res = parseJSONL(contentStr);
        records = res.records;
        totalLines = res.totalLines;
        errorCount = res.errorCount;
      } else if (logType === 'JSON') {
        records = parseJSON(contentStr);
        totalLines = contentStr.split(/\r?\n/).filter(Boolean).length;
      } else if (logType === 'XML') {
        records = parseXML(contentStr);
        totalLines = contentStr.split(/\r?\n/).filter(Boolean).length;
      } else {
        const lines = contentStr
          .split(/\r?\n/)
          .map((l) => l.trimEnd())
          .filter(Boolean)
          .slice(0, MAX_RECORDS);

        totalLines = lines.length;

        if (logType === 'SYSLOG')        records = parseSyslog(lines);
        else if (logType === 'WINDOWS_EVENT') records = parseWindowsEvent(lines);
        else if (logType === 'FIREWALL')  records = parseFirewall(lines);
        else                              records = parseGeneric(lines);
      }
    }

    if (records.length > MAX_RECORDS) {
      records = records.slice(0, MAX_RECORDS);
    }
  } catch (err: any) {
    errorCount = 1;
  }

  return {
    logType,
    totalLines: totalLines || records.length,
    parsedRecords: records.length,
    errorCount,
    records,
  };
}
