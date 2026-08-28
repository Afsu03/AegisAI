import { LogRecord } from '../generated/prisma/client';

export interface NormalizedEvent {
  id: string;
  rowIndex: number;
  raw: string;
  timestamp: Date;
  username: string | null;
  ip: string | null;
  action: string | null;
  status: string | null;
  message: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  extra: Record<string, any>;
}

export interface DetectedThreat {
  fileId: string;
  title: string;
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  riskScore: number;
  description: string;
  evidence: any;
  sourceRecordIds: string[];
  status: 'ACTIVE';
}

// ─── Normalization Layer ──────────────────────────────────────────────────

export function normalizeRecord(rec: LogRecord): NormalizedEvent {
  let extra: Record<string, any> = {};
  if (rec.extra) {
    try {
      extra = JSON.parse(rec.extra);
    } catch {
      // ignore
    }
  }

  // Helper to search keys case-insensitively in extra first, then LogRecord fields
  const getField = (keys: string[]): string | null => {
    for (const key of keys) {
      const val = extra[key] ?? extra[key.toLowerCase()] ?? extra[key.toUpperCase()];
      if (val !== undefined && val !== null && val !== '') {
        return String(val);
      }
    }
    // Fall back to direct record fields
    for (const key of keys) {
      const directVal = (rec as any)[key];
      if (directVal !== undefined && directVal !== null && directVal !== '') {
        return String(directVal);
      }
    }
    return null;
  };

  // Extract fields
  const ip = getField(['ip_address', 'ipaddress', 'ip', 'sourceip', 'srcip', 'src', 'source', 'clientip', 'host', 'hostname']);
  const username = getField(['username', 'user_name', 'user', 'account', 'uid', 'login']);
  const action = getField(['action', 'event', 'method', 'endpoint', 'operation']);
  const status = getField(['login_result', 'loginresult', 'status', 'result', 'outcome', 'code', 'status_code']);
  const location = getField(['location', 'country', 'country_code', 'city', 'geolocation']);

  const latStr = getField(['latitude', 'lat']);
  const lonStr = getField(['longitude', 'lon', 'lng', 'long']);
  const latitude = latStr ? parseFloat(latStr) : null;
  const longitude = lonStr ? parseFloat(lonStr) : null;

  // Parse Timestamp
  const tsStr = getField(['timestamp', 'time', 'date', 'datetime', '@timestamp']);
  let timestamp: Date | null = null;
  if (tsStr) {
    const d = new Date(tsStr);
    if (!isNaN(d.getTime())) {
      timestamp = d;
    }
  }
  if (!timestamp) {
    timestamp = new Date(rec.createdAt);
  }

  // Default message: use record message, fallback to search, then fallback to raw only if no extra exists (i.e. unstructured log)
  const message = rec.message || getField(['message', 'msg', 'description', 'text']) || (rec.extra ? '' : rec.raw);

  return {
    id: rec.id,
    rowIndex: rec.rowIndex,
    raw: rec.raw,
    timestamp,
    username: username ? username.trim() : null,
    ip: ip ? ip.trim() : null,
    action: action ? action.trim() : null,
    status: status ? status.trim() : null,
    message: message ? message.trim() : null,
    location: location ? location.trim() : null,
    latitude: latitude !== null && !isNaN(latitude) ? latitude : null,
    longitude: longitude !== null && !isNaN(longitude) ? longitude : null,
    extra,
  };
}

// ─── Classification Helpers ───────────────────────────────────────────────

export function isFailedAuth(event: NormalizedEvent): boolean {
  const stat = (event.status || '').toLowerCase();
  
  if (stat) {
    if (stat === 'success' || stat === 'ok' || stat === '200') return false;
    if (stat.includes('fail') || stat.includes('err') || stat.includes('invalid') || stat.includes('deny') || stat.includes('block') || stat.includes('reject')) {
      return true;
    }
  }

  const msg = (event.message || '').toLowerCase();
  const act = (event.action || '').toLowerCase();
  const lvl = (event.extra.level || event.extra.severity || '').toLowerCase();

  const authKeywords = ['login', 'auth', 'signin', 'authenticate', 'password', 'session'];
  const failKeywords = ['fail', 'invalid', 'err', 'deny', 'block', 'reject', 'unauthorized', 'incorrect'];

  const isAuthEvent = authKeywords.some(kw => msg.includes(kw) || act.includes(kw));
  const isFailureEvent = failKeywords.some(kw => msg.includes(kw) || stat.includes(kw) || lvl.includes(kw));

  const isSyslogFailure = msg.includes('failed password') || msg.includes('authentication failure') || msg.includes('failed login') || msg.includes('failed to authenticate');

  return (isAuthEvent && isFailureEvent) || isSyslogFailure;
}

export function isSuccessfulAuth(event: NormalizedEvent): boolean {
  const stat = (event.status || '').toLowerCase();

  if (stat) {
    if (stat === 'success' || stat === 'ok' || stat === '200') return true;
    if (stat.includes('fail') || stat.includes('err') || stat.includes('invalid') || stat.includes('deny') || stat.includes('block') || stat.includes('reject')) {
      return false;
    }
  }

  const msg = (event.message || '').toLowerCase();
  const act = (event.action || '').toLowerCase();

  const authKeywords = ['login', 'auth', 'signin', 'authenticate', 'session'];
  const successKeywords = ['success', 'ok', 'allow', 'accept', 'granted', 'established'];

  const isAuthEvent = authKeywords.some(kw => msg.includes(kw) || act.includes(kw));
  const isSuccessEvent = successKeywords.some(kw => msg.includes(kw) || stat.includes(kw));

  const isSyslogSuccess = msg.includes('accepted password') || msg.includes('session opened') || msg.includes('successful login');

  return (isAuthEvent && isSuccessEvent) || isSyslogSuccess;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Detection Engine ─────────────────────────────────────────────────────

export function runDetectionEngine(
  records: LogRecord[],
  fileId: string
): DetectedThreat[] {
  const events = records.map(normalizeRecord);
  const failedAuths = events.filter(isFailedAuth);
  const successfulAuths = events.filter(isSuccessfulAuth);

  const threats: DetectedThreat[] = [];

  // Group failed auths by username + IP
  const userIpGroups: Record<string, NormalizedEvent[]> = {};
  for (const ev of failedAuths) {
    if (ev.username && ev.ip) {
      const key = `${ev.username.toLowerCase()}||${ev.ip.toLowerCase()}`;
      if (!userIpGroups[key]) userIpGroups[key] = [];
      userIpGroups[key].push(ev);
    }
  }

  // Group failed auths by IP only (for Credential Stuffing)
  const ipGroups: Record<string, NormalizedEvent[]> = {};
  for (const ev of failedAuths) {
    if (ev.ip) {
      const key = ev.ip.toLowerCase();
      if (!ipGroups[key]) ipGroups[key] = [];
      ipGroups[key].push(ev);
    }
  }

  // Group successful auths by username (for Impossible Travel)
  const successUserGroups: Record<string, NormalizedEvent[]> = {};
  for (const ev of successfulAuths) {
    if (ev.username) {
      const key = ev.username.toLowerCase();
      if (!successUserGroups[key]) successUserGroups[key] = [];
      successUserGroups[key].push(ev);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  RULE 1 & 3: Brute Force & Suspicious Authentication Activity
  // ─────────────────────────────────────────────────────────────
  for (const key of Object.keys(userIpGroups)) {
    const list = userIpGroups[key].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const [username, ip] = key.split('||');

    let i = 0;
    while (i < list.length) {
      const startEv = list[i];
      const startTime = startEv.timestamp.getTime();
      const windowEnd = startTime + 5 * 60 * 1000; // 5-minute window
      const windowEvents: NormalizedEvent[] = [];

      for (let j = i; j < list.length; j++) {
        const e = list[j];
        const t = e.timestamp.getTime();
        if (t >= startTime && t <= windowEnd) {
          windowEvents.push(e);
        } else if (t > windowEnd) {
          break;
        }
      }

      if (windowEvents.length >= 5) {
        // Trigger Rule 1: Brute Force Attack
        threats.push({
          fileId,
          title: 'Possible Brute Force Attack',
          category: 'AUTHENTICATION',
          severity: 'HIGH',
          riskScore: 85,
          description: `Repeated failed authentication attempts (${windowEvents.length}) were detected for the account "${username}" and source IP ${ip} within a 5-minute window.`,
          evidence: {
            failedAttempts: windowEvents.length,
            username,
            sourceIp: ip,
            windowMinutes: 5,
            firstAttempt: windowEvents[0].timestamp.toISOString(),
            lastAttempt: windowEvents[windowEvents.length - 1].timestamp.toISOString(),
          },
          sourceRecordIds: windowEvents.map(e => e.id),
          status: 'ACTIVE',
        });
        i += windowEvents.length; // Skip past these events to avoid duplicate window detections
      } else if (windowEvents.length >= 3) {
        // Skip generic alert if this is a privileged user (let Rule 5 handle it with higher specificity)
        const privilegedUsers = new Set(['admin', 'administrator', 'root', 'manager']);
        if (privilegedUsers.has(username.toLowerCase())) {
          i++;
          continue;
        }

        // Trigger Rule 3: Suspicious Authentication Activity (3-4 failures)
        threats.push({
          fileId,
          title: 'Suspicious Authentication Activity',
          category: 'AUTHENTICATION',
          severity: 'MEDIUM',
          riskScore: 60,
          description: `Unusual failed authentication activity (${windowEvents.length} attempts) was detected for account "${username}" from source IP ${ip} within a 5-minute window.`,
          evidence: {
            failedAttempts: windowEvents.length,
            username,
            sourceIp: ip,
            windowMinutes: 5,
            firstAttempt: windowEvents[0].timestamp.toISOString(),
            lastAttempt: windowEvents[windowEvents.length - 1].timestamp.toISOString(),
          },
          sourceRecordIds: windowEvents.map(e => e.id),
          status: 'ACTIVE',
        });
        i += windowEvents.length;
      } else {
        i++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  RULE 2: Credential Stuffing Indicator
  // ─────────────────────────────────────────────────────────────
  for (const ip of Object.keys(ipGroups)) {
    const list = ipGroups[ip].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let i = 0;
    while (i < list.length) {
      const startEv = list[i];
      const startTime = startEv.timestamp.getTime();
      const windowEnd = startTime + 5 * 60 * 1000; // 5-minute window
      const windowEvents: NormalizedEvent[] = [];
      const uniqueUsernames = new Set<string>();

      for (let j = i; j < list.length; j++) {
        const e = list[j];
        const t = e.timestamp.getTime();
        if (t >= startTime && t <= windowEnd) {
          windowEvents.push(e);
          if (e.username) {
            uniqueUsernames.add(e.username.toLowerCase());
          }
        } else if (t > windowEnd) {
          break;
        }
      }

      if (uniqueUsernames.size >= 3) {
        threats.push({
          fileId,
          title: 'Possible Credential Stuffing',
          category: 'AUTHENTICATION',
          severity: 'HIGH',
          riskScore: 80,
          description: `Failed authentication attempts targeting multiple different usernames (${Array.from(uniqueUsernames).join(', ')}) were detected from the same source IP ${ip} within a 5-minute window.`,
          evidence: {
            failedAttempts: windowEvents.length,
            usernamesCount: uniqueUsernames.size,
            usernames: Array.from(uniqueUsernames),
            sourceIp: ip,
            windowMinutes: 5,
            firstAttempt: windowEvents[0].timestamp.toISOString(),
            lastAttempt: windowEvents[windowEvents.length - 1].timestamp.toISOString(),
          },
          sourceRecordIds: windowEvents.map(e => e.id),
          status: 'ACTIVE',
        });
        i += windowEvents.length;
      } else {
        i++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  RULE 4: Impossible Travel Indicator
  // ─────────────────────────────────────────────────────────────
  for (const username of Object.keys(successUserGroups)) {
    const list = successUserGroups[username].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let j = 0; j < list.length - 1; j++) {
      const ev1 = list[j];
      const ev2 = list[j + 1];

      // Check if both events contain reliable geographic coordinates
      if (
        ev1.latitude !== null && ev1.longitude !== null &&
        ev2.latitude !== null && ev2.longitude !== null
      ) {
        const lat1 = ev1.latitude;
        const lon1 = ev1.longitude;
        const lat2 = ev2.latitude;
        const lon2 = ev2.longitude;

        const distance = getDistanceKm(lat1, lon1, lat2, lon2);
        const timeDiffMs = ev2.timestamp.getTime() - ev1.timestamp.getTime();

        if (timeDiffMs > 0) {
          const timeDiffHours = timeDiffMs / (3600 * 1000);
          const timeDiffMins = timeDiffMs / 60000;
          const speedKmh = distance / timeDiffHours;

          // Flag only if speed exceeds physically plausible threshold (e.g. 1000 km/h)
          if (speedKmh > 1000) {
            threats.push({
              fileId,
              title: 'Impossible Travel Detected',
              category: 'AUTHENTICATION',
              severity: 'HIGH',
              riskScore: 75,
              description: `Consecutive successful logins for user "${username}" were observed from coordinates (${lat1}, ${lon1}) and (${lat2}, ${lon2}) within a timeframe (${Math.round(timeDiffMins)} minutes) requiring an impossible travel speed of ${Math.round(speedKmh)} km/h.`,
              evidence: {
                username,
                previousLoginTime: ev1.timestamp.toISOString(),
                currentLoginTime: ev2.timestamp.toISOString(),
                previousLatitude: lat1,
                previousLongitude: lon1,
                currentLatitude: lat2,
                currentLongitude: lon2,
                distanceKm: Math.round(distance * 100) / 100,
                timeDifferenceMinutes: Math.round(timeDiffMins),
                calculatedSpeedKmh: Math.round(speedKmh * 100) / 100,
              },
              sourceRecordIds: [ev1.id, ev2.id],
              status: 'ACTIVE',
            });
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  RULE 5: Suspicious Privileged Account Activity
  // ─────────────────────────────────────────────────────────────
  const privilegedUsers = new Set(['admin', 'administrator', 'root', 'manager']);

  for (const key of Object.keys(userIpGroups)) {
    const [username, ip] = key.split('||');
    if (!privilegedUsers.has(username.toLowerCase())) {
      continue;
    }

    const list = userIpGroups[key].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let i = 0;
    while (i < list.length) {
      const startEv = list[i];
      const startTime = startEv.timestamp.getTime();
      const windowEnd = startTime + 5 * 60 * 1000;
      const windowEvents: NormalizedEvent[] = [];

      for (let j = i; j < list.length; j++) {
        const e = list[j];
        const t = e.timestamp.getTime();
        if (t >= startTime && t <= windowEnd) {
          windowEvents.push(e);
        } else if (t > windowEnd) {
          break;
        }
      }

      if (windowEvents.length >= 3) {
        // Deduplicate/Overlap Check:
        // Do not trigger if there's already a "Possible Brute Force Attack" covering these records
        const isAlreadyBF = threats.some(
          t => t.title === 'Possible Brute Force Attack' && 
               t.evidence.username.toLowerCase() === username.toLowerCase() &&
               t.evidence.sourceIp.toLowerCase() === ip.toLowerCase() &&
               Math.abs(new Date(t.evidence.firstAttempt).getTime() - startTime) < 5 * 60 * 1000
        );

        if (!isAlreadyBF) {
          threats.push({
            fileId,
            title: 'Suspicious Privileged Account Activity',
            category: 'PRIVILEGED_ACCESS',
            severity: 'MEDIUM',
            riskScore: 70,
            description: `Suspicious repeated failed authentication attempts (${windowEvents.length}) were detected for privileged account "${username}" from source IP ${ip} within a 5-minute window.`,
            evidence: {
              username,
              sourceIp: ip,
              failedAttempts: windowEvents.length,
              windowMinutes: 5,
              firstAttempt: windowEvents[0].timestamp.toISOString(),
              lastAttempt: windowEvents[windowEvents.length - 1].timestamp.toISOString(),
            },
            sourceRecordIds: windowEvents.map(e => e.id),
            status: 'ACTIVE',
          });
          i += windowEvents.length;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
  }

  return threats;
}
