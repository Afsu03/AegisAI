# AegisAI — Project Structure & Cleanup Report

**Comprehensive Architecture Audit, Demonstration Dataset Catalog, Typography System, and Cleanup Verification**

---

### 1. Current Architecture
The production AegisAI platform operates as a secure, multi-tenant cyber threat intelligence and incident response system:

```
[ Multi-Format Security Logs ] (CSV, JSON, JSONL, XLSX, XML)
              │
              ▼
[ Ingestion & Normalization Layer ] (backend/src/lib/parser.ts)
              │
              ▼
[ In-Memory Deterministic Engine ] (backend/src/lib/threatDetectionEngine.ts)
   ├── Rule 1: Brute Force Attack (5 fails / 5 min, Score: 85/100)
   ├── Rule 2: Multi-Account Probing (Score: 75/100)
   ├── Rule 3: Password Spray Attack (Score: 70/100)
   ├── Rule 4: Impossible Travel (Coordinates & Speed > 1,000 km/h, Score: 80/100)
   └── Rule 5: Privileged Account Activity (3 fails on root/admin, Score: 70/100)
              │
              ▼
[ ThreatEvent Entity ] (Prisma 7 / Neon PostgreSQL)
              │
              ▼
[ Unified 4-Agent AI Orchestrator ] (backend/src/services/aiInvestigationOrchestrator.ts)
   ├── Stage 1: Threat Analysis Agent (Technical triage & evidence grounding)
   ├── Stage 2: Incident Summary Agent (Executive scope & timeline)
   ├── Stage 3: Risk Assessment Agent (Contextual impact & deterministic (L*I)/16*100)
   └── Stage 4: Recommendation Agent (Mitigation playbook with humanReviewRequired: true)
              │
              ▼
[ Relational Investigation Cache ] (Neon PostgreSQL 16)
              │
              ▼
[ Human Security Analyst ] (React SPA / Minimal Monochrome UI)
```

---

### 2. Production Components

#### Backend Services (`backend/`)
- `src/server.ts`: Express REST API endpoints, JWT authentication & cookie handling, IDOR authorization guards, multi-format upload handlers, BYOK provider endpoints.
- `src/lib/threatDetectionEngine.ts`: High-throughput in-memory deterministic rule engine ($2.49\text{ ms}$ mean latency).
- `src/lib/parser.ts`: Zero-XXE multi-format log parsers.
- `src/lib/encryption.ts`: AES-256-GCM encryption/decryption and masking for BYOK credentials.
- `src/lib/ai/providers.ts`: Google Gemini AI provider implementation with dynamic BYOK resolution and system fallback.
- `src/lib/ai/agent.ts`, `summarizationAgent.ts`, `riskAssessmentAgent.ts`, `recommendationAgent.ts`: Specialized LLM agents with strict Zod validation.
- `src/services/aiInvestigationOrchestrator.ts`: Sequential orchestrator with stage-level PostgreSQL caching and partial resume logic.
- `prisma/schema.prisma`: Relational database schema with cascade constraints.

#### Frontend Application (`frontend/`)
- `src/App.tsx`: Protected route guards and React Router configuration.
- `src/context/AuthContext.tsx`: Session state, JWT token management, login/register/logout.
- `src/lib/api.ts`: Centralized typed API client.
- `src/pages/`: `DashboardPage`, `AnalysesPage`, `NewAnalysisPage`, `ThreatDetailsPage`, `MultiAgentsPage`, `IncidentResponsePage`, `ProfilePage`, `ArchitecturePage`, `AboutPage`, `LoginPage`, `RegisterPage`.
- `src/components/layout/`: `Navbar.tsx`, `Sidebar.tsx`.
- `src/index.css`: Minimal monochrome palette (Black, White, Warm Cream `#F5F2EA`) with Austin typography hierarchy.

---

### 3. Removed Unused Components
- **`python-ai/` directory**: Removed from repository. All AI functionality is natively implemented in TypeScript in `backend/src/lib/ai/`.
- **`python-ai` container service**: Removed from `docker-compose.yml`.
- **Transient test upload artifacts**: Cleaned 0-byte test uploads (`1786714811921-1740.csv`, `1786714864799-266741.csv`).

---

### 4. Python Folder Decision
- **Status**: **`UNUSED & REMOVED`**
- **Rationale**: Static code analysis confirmed zero runtime dependencies or HTTP requests from the Node.js backend or React frontend to `python-ai/`. The Python directory was an early prototype mock service. Removing it streamlined repository footprint without touching production runtime.

---

### 5. Dataset Catalog
10 representative demonstration datasets created in `docs/`:

| File Name | Format | Scenario | Expected Rule Trigger | Expected Threat | Coordinates |
| :--- | :---: | :--- | :---: | :--- | :---: |
| `docs/dataset-01-normal-auth.csv` | `CSV` | 5 routine successful logins across roles | None | None | No |
| `docs/dataset-02-brute-force.json` | `JSON` | 6 rapid consecutive failures on `admin` | Rule 1 | Brute Force Attack (`85/100`) | No |
| `docs/dataset-03-privileged-activity.jsonl` | `JSONL` | 3 consecutive failures on `root` | Rule 5 | Privileged Activity (`70/100`) | No |
| `docs/dataset-04-impossible-travel.xlsx` | `XLSX` | Logins from NYC & London in 30 min | Rule 4 | Impossible Travel (`80/100`) | Yes |
| `docs/dataset-05-benign-location.xml` | `XML` | Country change (USA $\rightarrow$ Canada) in 20 min | None | None (Conservative Rule 4) | No |
| `docs/dataset-06-mixed-authentication.csv` | `CSV` | Mixed normal logins, typos, isolated probes | None | None | No |
| `docs/dataset-07-api-authentication.json` | `JSON` | Automated microservice token requests | None | None | No |
| `docs/dataset-08-enterprise-auth.jsonl` | `JSONL` | Enterprise SSO SAML authentication events | None | None | No |
| `docs/dataset-09-mixed-security-events.xlsx` | `XLSX` | VPN gateway tunnel state telemetry | None | None | No |
| `docs/dataset-10-coordinate-travel.xml` | `XML` | Logins from San Francisco & Tokyo in 45 min | Rule 4 | Impossible Travel (`80/100`) | Yes |

---

### 6. UI Changes & Canonical Navigation
- Canonical Model: `ANALYSES` $\rightarrow$ `Analysis Workspace` $\rightarrow$ `Files`, `Records`, `Threats`, `AI Investigations`.
- Sidebar navigation updated: Action item explicitly labeled as **`+ New Analysis`** (`/analyses/new`).
- Workflow clarity: Obvious 8-step primary flow (`CREATE ANALYSIS -> UPLOAD LOGS -> DETECT THREATS -> SELECT THREAT -> RUN AI INVESTIGATION -> REVIEW 4 AGENTS -> HUMAN DECISION`).

---

### 7. Typography Changes
Typography scale updated across `frontend/src/index.css`:
- **Page Titles**: `32px` (`font-family: 'Austin', Georgia, serif`, font-weight: `700`, line-height: `1.2`)
- **Section Titles**: `22px` (`font-family: 'Austin', Georgia, serif`, font-weight: `600`, line-height: `1.25`)
- **Card Titles**: `17px` (`font-weight: 600`, line-height: `1.3`)
- **Body Text**: `15px` (`font-family: 'Inter', sans-serif`, line-height: `1.65`)
- **Metadata & Labels**: `13px` (`font-family: 'Inter', sans-serif`, font-weight: `500`)
- **Code & Telemetry Values**: `14px` (`font-family: 'JetBrains Mono', monospace`)

---

### 8. Austin Font Status
- **Asset Discovered**: `Austin Shocks.otf` located in `docs/austin-shocks.zip`.
- **Configuration**: Extracted to `frontend/public/fonts/Austin Shocks.otf` and configured via `@font-face` in `frontend/src/index.css`.
- **Usage**: Applied exclusively to high-level display elements (page titles, section headings, agent titles). Dense log data and technical tables remain in clean system sans-serif (`Inter`) and monospace (`JetBrains Mono`).

---

### 9. Duplicate Cleanup
- **Uploaded Test Files**: Audited all files in `backend/uploads/`.
- **Preserved Source**: Preserved authoritative benchmark dataset `1786445044657-777713.csv` (`13,230 bytes`, SHA-256: `aa2cefc3ef89707ed2820b392c0187630efb6748e67bd29df283a36fae6024e1`).
- **Cleaned**: Removed transient 0-byte multipart test files.

---

### 10. Verification Results
```bash
# Backend TypeScript Compilation
$ cd backend && npx tsc --noEmit
Exit Code: 0 (0 errors)

# Frontend TypeScript Compilation
$ cd frontend && npx tsc --noEmit
Exit Code: 0 (0 errors)
```
- **End-to-End Verification**: Confirmed active login, dashboard, analyses workspace creation, multi-format upload, threat detection, cached AI investigation review, profile BYOK settings, and logout workflows.

---

### 11. Remaining Risks
- BYOK configuration currently targets Google Gemini model family (`gemini-2.0-flash` / `gemini-flash-latest`).
- Demonstration datasets in `docs/` are synthetic test representations and must not be conflated with the authoritative IEEE evaluation dataset.

---

### 12. Files Intentionally Untouched
- `backend/prisma/schema.prisma` (Database schema unchanged)
- `backend/src/lib/threatDetectionEngine.ts` (Detection algorithms & Rule 1–5 thresholds unchanged)
- `backend/src/lib/ai/*.ts` (4 AI agent implementations and prompts unchanged)
- `backend/src/services/aiInvestigationOrchestrator.ts` (Orchestrator logic unchanged)
- `backend/src/server.ts` (Production APIs and auth middleware unchanged)
- `backend/uploads/1786445044657-777713.csv` (Authoritative IEEE benchmark file unchanged)
