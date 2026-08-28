# AegisAI — REST API Reference

> **Base URL:** `http://localhost:5000/api`  
> **Auth:** JWT Token via `jwt` HTTP-Only Cookie or `Authorization: Bearer <token>` Header  
> **Content-Type:** `application/json` (or `multipart/form-data` for file uploads)  

---

## 1. System Health

### GET `/health`
**Public** — System and database health status.

**Response:**
```json
{
  "status": "UP",
  "service": "AegisAI API",
  "version": "1.0.0",
  "database": "CONNECTED",
  "timestamp": "2026-08-19T04:48:00.000Z"
}
```

---

## 2. Authentication

### POST `/auth/register`
**Public** — Register a new analyst account.

**Request:**
```json
{
  "email": "analyst@aegisai.local",
  "password": "SecurePassword123!",
  "name": "Alex Mercer"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGci...",
  "user": {
    "id": "cly1234567890",
    "email": "analyst@aegisai.local",
    "name": "Alex Mercer"
  }
}
```

### POST `/auth/login`
**Public** — Authenticate analyst credentials and receive JWT session.

**Request:**
```json
{
  "email": "analyst@aegisai.local",
  "password": "SecurePassword123!"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGci...",
  "user": {
    "id": "cly1234567890",
    "email": "analyst@aegisai.local",
    "name": "Alex Mercer"
  }
}
```

### GET `/auth/me`
**Authenticated** — Retrieve current analyst profile and AI provider configuration status.

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "cly1234567890",
    "email": "analyst@aegisai.local",
    "name": "Alex Mercer",
    "hasCustomApiKey": true,
    "aiProvider": "gemini",
    "maskedApiKey": "AIza••••••••XXXX"
  }
}
```

### POST `/auth/logout`
**Public / Authenticated** — Invalidate authentication session and clear HTTP-only cookie.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 3. AI Provider Configuration (BYOK)

### GET `/profile/ai-provider`
**Authenticated** — Retrieve current user's encrypted BYOK AI configuration.

**Response (200 OK):**
```json
{
  "success": true,
  "configured": true,
  "provider": "gemini",
  "maskedKey": "AIza••••••••XXXX",
  "updatedAt": "2026-08-19T04:30:00.000Z"
}
```

### PUT `/profile/ai-provider`
**Authenticated** — Save or update user's custom Gemini API key (encrypted with AES-256-GCM).

**Request:**
```json
{
  "apiKey": "TEST_GEMINI_KEY_ALICE_0001",
  "provider": "gemini"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "AI provider configuration saved successfully",
  "maskedKey": "AIza••••••••XXXX"
}
```

### DELETE `/profile/ai-provider`
**Authenticated** — Remove custom BYOK configuration and revert to system fallback.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Custom AI provider configuration removed"
}
```

### POST `/profile/ai-provider/test`
**Authenticated** — Test Gemini API connectivity with provided or stored credentials.

**Request:**
```json
{
  "apiKey": "TEST_GEMINI_KEY_ALICE_0001"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Gemini API connection test successful"
}
```

---

## 4. Analyses Workspaces

### POST `/analyses`
**Authenticated** — Create a new analysis workspace.

**Request:**
```json
{
  "title": "Q3 Authentication Anomaly Investigation",
  "description": "Investigation into repeated failed logins across administrative endpoints"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "analysis": {
    "id": "ana_01j7xyz...",
    "userId": "cly1234567890",
    "title": "Q3 Authentication Anomaly Investigation",
    "description": "Investigation into repeated failed logins across administrative endpoints",
    "createdAt": "2026-08-19T04:40:00.000Z"
  }
}
```

### GET `/analyses`
**Authenticated** — List all analysis workspaces owned by the user.

**Response (200 OK):**
```json
{
  "success": true,
  "analyses": [
    {
      "id": "ana_01j7xyz...",
      "title": "Q3 Authentication Anomaly Investigation",
      "createdAt": "2026-08-19T04:40:00.000Z",
      "_count": {
        "logFiles": 2,
        "threatEvents": 1
      }
    }
  ]
}
```

### GET `/analyses/:id`
**Authenticated** — Get detailed analysis workspace with associated files and threats.

### DELETE `/analyses/:id`
**Authenticated** — Delete analysis workspace and cascading assets.

---

## 5. Security Log Ingestion & Parsing

### POST `/logs/upload`
**Optional Auth / Authenticated** — Upload and normalize security telemetry (`multipart/form-data`).

**Form Data:**
- `file`: Log file (`CSV`, `JSON`, `JSONL`, `XLSX`, `XML`)
- `analysisId` (optional): Analysis workspace ID
- `format` (optional): Format override (`csv` | `json` | `jsonl` | `xlsx` | `xml`)
- `title` (optional): Descriptive title

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Log file uploaded and processed successfully",
  "logFile": {
    "id": "log_01j7abc...",
    "filename": "AegisAI_Dummy_Website_Authentication_Logs_100.csv",
    "format": "csv",
    "recordCount": 100,
    "createdAt": "2026-08-19T04:45:00.000Z"
  },
  "threatsDetected": 1
}
```

### GET `/logs`
**Optional Auth / Authenticated** — List uploaded log files.

### GET `/logs/:id`
**Optional Auth / Authenticated** — Retrieve metadata and threat count for a log file.

### GET `/logs/:id/records?page=1&limit=50`
**Optional Auth / Authenticated** — Fetch normalized log records from a file.

### DELETE `/logs/:id`
**Optional Auth / Authenticated** — Delete log file and associated records.

---

## 6. Deterministic Threat Detection

### GET `/threats`
**Optional Auth / Authenticated** — List all detected threat events.

**Response (200 OK):**
```json
{
  "success": true,
  "threats": [
    {
      "id": "thr_01j7def...",
      "title": "Possible Brute Force Attack",
      "category": "AUTHENTICATION",
      "severity": "HIGH",
      "riskScore": 85,
      "status": "OPEN",
      "timestamp": "2026-08-19T04:45:00.000Z",
      "evidenceCount": 6
    }
  ]
}
```

### GET `/threats/:id`
**Optional Auth / Authenticated** — Retrieve threat details, raw correlated evidence records, and investigation status.

### GET `/logs/:id/threats`
**Optional Auth / Authenticated** — Retrieve threats originating from a specific log file.

### POST `/logs/:id/analyze`
**Optional Auth / Authenticated** — Trigger deterministic detection engine re-scan on existing log file.

---

## 7. Multi-Agent AI Investigation

### GET `/threats/:id/ai-investigation`
**Optional Auth / Authenticated** — Retrieve complete investigation results across all 4 stages (from PostgreSQL cache if completed).

**Response (200 OK):**
```json
{
  "success": true,
  "cached": true,
  "threatId": "thr_01j7def...",
  "investigation": {
    "threatAnalysis": {
      "threatType": "Possible Brute Force Attack",
      "assessment": "High probability of targeted credential brute-forcing attack...",
      "reasoning": "Observed 6 failed login attempts in 42 seconds from single IP...",
      "evidence": ["IP: 203.0.113.88", "Target Account: admin", "Failure Count: 6"],
      "potentialImpact": "Account takeover of administrative privileges.",
      "uncertainties": ["Underlying proxy or automated tool not identifiable without user-agent header."],
      "confidence": 0.95
    },
    "incidentSummary": {
      "title": "Targeted Brute-Force Authentication Spike on Admin Account",
      "summary": "Rapid succession of authentication failures detected against privileged user.",
      "target": "admin",
      "source": "203.0.113.88",
      "context": "Occurred during standard business hours across 42s window.",
      "evidence": ["6 consecutive HTTP 401 unauthorized responses."],
      "uncertainties": ["Whether attacker holds valid secondary credentials."]
    },
    "riskAssessment": {
      "likelihood": "Likely",
      "impact": "High",
      "targetCriticality": "Critical",
      "evidenceStrength": "High",
      "likelihoodScore": 3,
      "impactScore": 3,
      "riskScore": 56,
      "riskLevel": "HIGH",
      "priority": "P2",
      "justification": "High probability of credential guessing targeting top-level admin account."
    },
    "recommendation": {
      "immediateActions": ["Temporarily rate-limit or null-route source IP 203.0.113.88."],
      "investigationSteps": ["Review auth logs for other accounts targeted by the same IP."],
      "containmentOptions": ["Enforce step-up MFA or temporary lock on target username."],
      "mitigationSteps": ["Implement progressive delay on login attempts."],
      "monitoringRecommendations": ["Set alert threshold for >= 3 failures in 60s."],
      "requiresHumanReview": true
    }
  }
}
```

### POST `/threats/:id/ai-investigation`
**Optional Auth / Authenticated** — Execute 4-agent investigation pipeline (sequential execution with partial resume).

### GET `/threats/:id/analysis`
**Optional Auth / Authenticated** — Retrieve Agent 01 (Threat Analysis) result.

### GET `/threats/:id/summary`
**Optional Auth / Authenticated** — Retrieve Agent 02 (Incident Summary) result.

### GET `/threats/:id/risk-assessment`
**Optional Auth / Authenticated** — Retrieve Agent 03 (Risk Assessment) result.

### GET `/threats/:id/recommendations`
**Optional Auth / Authenticated** — Retrieve Agent 04 (Response Recommendation) result.

---

## 8. Aggregate SOC Statistics

### GET `/stats`
**Optional Auth / Authenticated** — Fetch global dashboard metrics.

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalLogs": 100,
    "threatsDetected": 1,
    "criticalThreats": 0,
    "highThreats": 1,
    "investigationsCompleted": 1,
    "riskScoreAverage": 56
  }
}
```

---

## 9. Standard Status & Error Format

All error responses adhere to the standard envelope:
```json
{
  "success": false,
  "error": "Detailed error message",
  "details": []
}
```

| HTTP Code | Description |
| :--- | :--- |
| `200 OK` | Request succeeded. |
| `201 Created` | Resource successfully created. |
| `400 Bad Request` | Missing required parameters or schema validation failure. |
| `401 Unauthorized` | Missing or invalid authentication token. |
| `403 Forbidden` | User does not own the requested resource. |
| `404 Not Found` | Resource ID does not exist. |
| `500 Server Error` | Unexpected backend or database exception. |
