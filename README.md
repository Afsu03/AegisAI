# AegisAI

> **AI-Assisted Security Operations & Multi-Agent Threat Investigation Platform**

---

## 1. Project Overview

**AegisAI** is an evidence-driven security operations and incident triage platform designed to assist Security Operations Center (SOC) analysts in handling high-velocity security telemetry. The system establishes a structured, multi-stage investigation workflow that bridges high-throughput deterministic threat detection and contextual multi-agent Large Language Model (LLM) reasoning:

1. **Multi-Format Security-Log Ingestion**: Ingests security telemetry across diverse enterprise formats (`CSV`, `JSON`, `JSONL`, `XLSX`, `XML`).
2. **Deterministic Threat Detection**: Executes in-memory, rule-based detection to rapidly isolate suspicious telemetry without incurring LLM latency or cost.
3. **Evidence Correlation**: Extracts and groups correlated log records and Indicators of Compromise (IoCs) associated with the detected threat event.
4. **Four-Agent LLM Investigation**: Orchestrates four domain-specialized AI agents to perform technical analysis, generate executive summaries, evaluate risk factors, and construct mitigation playbooks.
5. **Contextual Risk Assessment**: Combines LLM qualitative evaluation with deterministic backend scoring to derive objective, mathematically reproducible risk scores.
6. **Response Recommendations**: Delivers structured, prioritized response plans categorized into immediate containment, deep investigation, mitigation, and monitoring.
7. **Human Security Review**: Enforces mandatory human-in-the-loop oversight before any operational remediation or mitigation action is undertaken.

### Central Pipeline Flow

$$\text{Raw Security Logs} \longrightarrow \text{Normalization} \longrightarrow \text{Deterministic Detection} \longrightarrow \text{Threat Event} \longrightarrow \text{AI Investigation} \longrightarrow \text{Risk Assessment} \longrightarrow \text{Response Recommendation} \longrightarrow \text{Human Review}$$

> [!NOTE]
> AegisAI is designed as an **analyst-assistance platform**, not an autonomous replacement for human security personnel. The platform assists analysts by automating initial alert correlation, synthesizing incident narratives, and drafting response playbooks while keeping human operators in full operational control.

---

## 2. Problem Statement

Modern enterprise environments generate millions of raw security logs daily across authentication gateways, firewalls, identity providers, and endpoint sensors. While traditional rule-based SIEM and detection systems excel at rapid pattern matching and explainable alert generation, they present critical operational challenges:

- **Alert Fatigue & Cognitive Load**: Security analysts must manually inspect dozens of raw log lines to interpret the scope and credibility of every triggered alert.
- **Context Fragmentation**: Correlating distributed evidence (e.g., disparate IP addresses, incremental failure sequences, geographic anomalies) requires time-consuming manual triage.
- **Subjective Risk Prioritization**: Severity scoring in traditional rules is often static, lacking contextual awareness of targeted asset criticality, evidence completeness, or attacker progression.
- **Delayed Response Formulation**: Drafting containment and remediation steps requires cross-referencing playbooks, slowing incident response times.

AegisAI addresses this challenge by combining the speed and explainability of deterministic detection with the contextual synthesis and reasoning capabilities of specialized multi-agent LLMs.

---

## 3. Proposed Solution

AegisAI implements a hybrid cybersecurity intelligence architecture:

$$\mathbf{Hybrid\ Architecture} = \mathbf{Deterministic\ Engine} + \mathbf{Multi\text{-}Agent\ LLM\ Triage} + \mathbf{Deterministic\ Risk\ Math} + \mathbf{Human\ Guard}$$

- **Deterministic Engine**: Acts as the initial high-throughput filter. High-volume benign logs are processed in sub-millisecond timeframes, ensuring zero LLM API cost on normal traffic.
- **LLM Investigation Pipeline**: When a threat event is flagged, a sequential chain of four specialized AI agents is invoked to analyze evidence, synthesize incident summaries, assess risk dimensions, and draft response playbooks.
- **Deterministic Risk Calculation**: The LLM evaluates qualitative factors (Likelihood, Impact, Asset Criticality, Evidence Strength), while the backend computes the final compound risk score using a deterministic formula.
- **Human-in-the-Loop Security Review**: The AI system produces advisory intelligence. Destructive remediation actions (such as firewall modifications or account lockouts) are never executed autonomously.

---

## 4. System Architecture

```
                       +----------------------------------+
                       |      Security Log Telemetry      |
                       |  (CSV, JSON, JSONL, XLSX, XML)   |
                       +----------------+-----------------+
                                        |
                                        v
                       +----------------------------------+
                       |     Multi-Format Log Parser      |
                       |     (Normalized Log Records)     |
                       +----------------+-----------------+
                                        |
                                        v
                       +----------------------------------+
                       |   Deterministic Detection Engine |
                       |       (In-Memory Rules 1-5)      |
                       +----------------+-----------------+
                                        |
                                        v
                       +----------------------------------+
                       |           Threat Event           |
                       +----------------+-----------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                           AI Investigation Orchestrator                           |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Agent 01 — Threat Analysis (Technical Analysis, Reasoning, Confidence)       |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------v---------------------------------------+  |
|  | Agent 02 — Incident Summary (Executive Narrative, Targets, Timeline)        |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------v---------------------------------------+  |
|  | Agent 03 — Risk Assessment (Qualitative Evaluation + Deterministic Formula) |  |
|  +-------------------------------------+---------------------------------------+  |
|                                        |                                          |
|  +-------------------------------------v---------------------------------------+  |
|  | Agent 04 — Response Recommendation (Mitigation Playbooks, Human Guard)      |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
                       +----------------------------------+
                       | PostgreSQL Database (Neon Cloud) |
                       |   (Cached Investigation State)   |
                       +----------------+-----------------+
                                        |
                                        v
                       +----------------------------------+
                       |      Security Analyst Review     |
                       |    (React 19 + TypeScript UI)    |
                       +----------------------------------+
```

### Architectural Layer Overview
1. **Ingestion & Normalization Layer**: Ingests multi-format log files, verifies structural schemas, and converts diverse schemas into uniform internal `LogRecord` representations.
2. **Deterministic Detection Layer**: Evaluates in-memory detection rules across temporal windows to generate structured `ThreatEvent` records and isolate relevant evidence.
3. **AI Investigation Layer**: Orchestrates four specialized Google Gemini agents sequentially, validating outputs with Zod schemas and persisting results to PostgreSQL.
4. **Data Persistence Layer**: PostgreSQL via Prisma ORM caches all investigation stages, enabling instant re-retrieval and partial pipeline resume.
5. **Presentation Layer**: Interactive React/TypeScript web interface featuring analyst workspaces, threat timelines, IoC inspection, and human-in-the-loop response verification.

---

## 5. Multi-Format Log Ingestion

AegisAI natively parses and normalizes five major structured file formats:

| Format | Parsing Engine | Implementation | Normalized Representation |
| :--- | :--- | :--- | :--- |
| **CSV** | `csv-parser` | Stream-based comma-separated row ingestion | Normalized `LogRecord` |
| **JSON** | Native V8 JSON | Array of structured JSON telemetry objects | Normalized `LogRecord` |
| **JSONL** | Line Reader + JSON | Newline-delimited JSON log streams | Normalized `LogRecord` |
| **XLSX** | `xlsx` (SheetJS) | Binary workbook and worksheet parsing | Normalized `LogRecord` |
| **XML** | `fast-xml-parser` | Hierarchical XML event node normalization | Normalized `LogRecord` |

Regardless of source format, every log entry is mapped to a standardized internal schema containing:
- `timestamp`: Event timestamp (ISO 8601 UTC)
- `eventType` / `action`: Action descriptor (e.g., `LOGIN_FAILURE`, `AUTH_SUCCESS`)
- `status`: Outcome (`SUCCESS`, `FAILURE`, `DENIED`, `BLOCKED`)
- `sourceIp` & `destinationIp`: Network endpoints
- `username` / `targetUser`: Identity associated with the event
- `details`: Extracted key-value attributes (geographic coordinates, user-agent, error codes)

---

## 6. Deterministic Detection Engine

Before initiating LLM inference, raw telemetry is processed by an in-memory deterministic rule engine (`backend/src/lib/threatDetectionEngine.ts`). This provides instantaneous filtering and reproducible threat flagging.

Currently implemented detection categories:

| Rule ID | Rule Name | Detection Criteria | Severity | Initial Score |
| :--- | :--- | :--- | :---: | :---: |
| **Rule 1** | **Possible Brute Force Attack** | $\ge 5$ failed authentications within 60 seconds from the same source IP | HIGH | 85 |
| **Rule 2** | **Possible Credential Stuffing** | $\ge 3$ distinct usernames targeted from a single IP within 120 seconds | HIGH | 80 |
| **Rule 3** | **Suspicious Authentication Activity** | Anomalous authentication failure bursts outside normal thresholds | MEDIUM | 60 |
| **Rule 4** | **Impossible Travel Detection** | Consecutive logins across coordinate pairs exceeding $1,000\text{ km/h}$ velocity (Haversine distance) | HIGH | 80 |
| **Rule 5** | **Suspicious Privileged Account Activity** | Consecutive authentication failures targeting privileged identities (`admin`, `root`, `administrator`) | HIGH | 70 |

---

## 7. Four Specialized AI Agents

AegisAI utilizes four dedicated AI agents implemented with Google Gemini and validated via strict Zod schemas:

```
[Agent 01: Threat Analysis] ──> [Agent 02: Incident Summary] ──> [Agent 03: Risk Assessment] ──> [Agent 04: Response Recommendation]
```

### Agent 01 — Threat Analysis (`ThreatAnalysisAgent`)
- **Purpose**: Conducts deep technical triage on the detected threat event and its correlated log records.
- **Analysis Scope**: Evaluates the underlying attack pattern, assesses threat validity, constructs detailed technical reasoning, extracts concrete evidence indicators, estimates the potential blast radius, identifies analytical uncertainties, and assigns a confidence score ($0.0 \le \text{confidence} \le 1.0$).
- **Validation**: Schema-enforced via `ThreatAnalysisSchema`.

### Agent 02 — Incident Summary (`IncidentSummaryAgent`)
- **Purpose**: Translates complex technical triage into a structured, executive-level incident briefing.
- **Analysis Scope**: Produces an executive incident title, an executive summary narrative, targeted assets/accounts, source entities (IPs, hostnames), temporal context and timeline of events, corroborated evidence indicators, and explicit caveats/uncertainties.
- **Validation**: Schema-enforced via `IncidentSummarySchema`.

### Agent 03 — Risk Assessment (`RiskAssessmentAgent`)
- **Purpose**: Conducts multi-dimensional risk evaluation combining qualitative reasoning with deterministic backend scoring.
- **Evaluation Dimensions**:
  - **Likelihood**: `Rare` (1), `Unlikely` (2), `Likely` (3), `Definite` (4)
  - **Impact**: `Low` (1), `Medium` (2), `High` (3), `Critical` (4)
  - **Target Criticality**: `Low`, `Medium`, `High`, `Critical`
  - **Evidence Strength**: `Low`, `Medium`, `High`
- **Deterministic Risk Scoring Formula**:
  The LLM does **not** generate arbitrary numerical scores. The backend deterministically computes:
  $$\text{riskScore} = \text{round}\left(\frac{\text{likelihoodScore} \times \text{impactScore}}{16} \times 100\right)$$
- **Score Mapping & Prioritization**:
  - `0 – 24` = **LOW** (Priority: **P4**)
  - `25 – 49` = **MEDIUM** (Priority: **P3**)
  - `50 – 74` = **HIGH** (Priority: **P2**)
  - `75 – 100` = **CRITICAL** (Priority: **P1**)
- **Why Deterministic Scoring is Used**: Prevents numerical hallucination, ensures mathematical reproducibility across repeated evaluations, and maintains auditability for compliance.

### Agent 04 — Response Recommendation (`ResponseRecommendationAgent`)
- **Purpose**: Formulates a prioritized, four-phase incident response and mitigation playbook.
- **Playbook Structure**:
  - **Immediate Actions**: High-priority containment options (e.g., isolate IP, enforce step-up MFA).
  - **Investigation Steps**: Forensic avenues to verify breach scope and lateral movement.
  - **Mitigation Steps**: Remediation and vulnerability patching recommendations.
  - **Monitoring Recommendations**: Detection rules and threshold adjustments to prevent recurrence.
  - **Human-in-the-Loop Guard**: Explicit flag `requiresHumanReview: true`.
- **Operational Safety Constraint**: AegisAI does **not** autonomously execute destructive remediation commands. All mitigation actions require explicit human analyst validation.

---

## 8. AI Investigation Orchestrator

The AI Investigation Orchestrator (`backend/src/services/aiInvestigationOrchestrator.ts`) coordinates the execution lifecycle of the four AI agents:

1. **Sequential Execution**: Stages run in strict sequence ($\text{Agent 01} \rightarrow \text{Agent 02} \rightarrow \text{Agent 03} \rightarrow \text{Agent 04}$), passing validated structured outputs downstream.
2. **Stage Dependencies**: Downstream agents (e.g., Risk Assessment) receive the verified technical reasoning and summary context produced by upstream agents.
3. **Database Caching**: Every stage output is immediately persisted to PostgreSQL. Completed investigations are returned directly from the database without invoking Gemini API calls.
4. **Partial Resume Capability**: If an investigation is interrupted or partially executed (e.g., Stages 1 and 2 completed), the orchestrator detects existing stage records and resumes execution directly from Stage 3.
5. **Idempotency**: Multiple requests for a completed investigation return cached results with zero redundant inference cost.

---

## 9. Investigation Caching & Performance

```
Analyst Request ──> Check Database (PostgreSQL / Neon)
                          │
          ┌───────────────┴───────────────┐
          │                               │
     [Cache Hit]                     [Cache Miss]
(All 4 Stages Present)          (Missing Stages Detected)
          │                               │
          v                               v
Return Cached Investigation      Execute Missing Stages via Gemini
  (0 Gemini API Calls)           Persist Outputs to Database
 (~1.6s Database Query)          Return Complete Investigation
```

- **Speedup**: Loading a cached investigation reduces response latency from ~158 seconds (fresh sequential LLM generation) to ~1.6 seconds (database retrieval), representing an observed **98.8x speedup**.
- **Cost Efficiency**: Cached queries consume 0 LLM API tokens.

---

## 10. User Accounts & Data Ownership

AegisAI enforces comprehensive multi-tenant isolation and user ownership:

- **Authentication**: JWT-based authentication supporting both HTTP-only secure cookies and standard `Authorization: Bearer <token>` headers.
- **Password Security**: Passwords hashed using `bcryptjs` with salt rounds.
- **Resource Ownership**:
  - Analysis workspaces (`Analysis`), uploaded log files (`LogFile`), normalized records (`LogRecord`), threat events (`ThreatEvent`), and AI investigation results are strictly associated with the authenticated `userId`.
- **Protected Access**: REST API routes verify resource ownership. Users cannot query, view, modify, or delete another user's analyses, logs, or investigations.

---

## 11. Bring-Your-Own-Key (BYOK) AI Architecture

AegisAI supports user-level AI Provider configuration, enabling analysts to supply their own Google Gemini API keys:

```
User (Browser)
     ↓ (Submits Gemini API Key via Profile UI)
Express Backend
     ↓
AES-256-GCM Encryption (with PBKDF2 Derived Key)
     ↓
AIProviderConfig Table (PostgreSQL)
     ↓
AI Provider Resolver
     ↓
Gemini Provider Instance (Scoped to User's Key)
     ↓
Four AI Investigation Agents
```

- **Key Isolation**: If a user configures a custom key, all investigations initiated by that user use their encrypted key.
- **System Fallback**: If no user key is configured, the system falls back to the backend default provider if specified.
- **Zero Cross-User Sharing**: User API keys are strictly isolated per user account.
- **Masked Presentation**: The frontend never receives plaintext API keys. Keys are returned in masked format:
  ```
  AIza••••••••XXXX
  ```

---

## 12. Security Design & Defense-in-Depth

AegisAI incorporates security-by-design principles across every layer:

- **Prompt Injection Defense**: Raw security logs are treated as **untrusted user input**. Log fields (usernames, IP addresses, messages, URIs, payloads) are cleanly formatted within structured data boundaries and system prompts instruct the LLM to treat log contents strictly as evidence data, never as operational instructions.
- **AES-256-GCM BYOK Encryption**: User API keys are encrypted at rest with authenticated encryption (AES-256-GCM) utilizing an initialization vector (IV) and authentication tag.
- **Zero Plaintext Secret Exposure**: Backend routes never emit decrypted API keys or database connection strings in responses or logs.
- **JWT Authentication & Ownership Guards**: All workspace and analysis endpoints require valid JWT authentication and enforce strict ownership verification.
- **Human-in-the-Loop Safeguards**: AI recommendations are strictly advisory; destructive commands (firewall blocking, account suspension, network isolation) cannot be triggered autonomously.

---

## 13. Database Architecture

The database is managed via Prisma ORM 7 backed by PostgreSQL 16 (Neon Serverless):

```
User
 ├── AIProviderConfig (1:1, Encrypted BYOK Gemini Key)
 └── Analysis (1:N, Investigation Workspace)
      └── LogFile (1:N, Uploaded Telemetry File)
           ├── LogRecord (1:N, Normalized Event Data)
           └── ThreatEvent (1:N, Detected Security Anomaly)
                ├── ThreatAnalysis (1:1, Agent 01 Output)
                ├── IncidentSummary (1:1, Agent 02 Output)
                ├── RiskAssessment (1:1, Agent 03 Output)
                └── ResponseRecommendation (1:1, Agent 04 Output)
```

---

## 14. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite | Modern Single-Page Application (SPA) |
| **Frontend Styling** | Tailwind CSS, Lucide Icons | Minimal monochrome SOC interface with Austin display typography |
| **Data Visualization** | Recharts | Threat distribution charts and severity breakdowns |
| **Backend Runtime** | Node.js, Express, TypeScript | REST API microservice and business logic |
| **Database ORM** | PostgreSQL 16 (Neon Serverless), Prisma 7 | Persistent relational storage and schema management |
| **Authentication & Crypto** | `jsonwebtoken`, `bcryptjs`, Node `crypto` (AES-256-GCM) | User authentication, password hashing, BYOK key encryption |
| **Telemetry Parsers** | `csv-parser`, `fast-xml-parser`, `xlsx` | Multi-format security log ingestion |
| **AI Reasoning** | Google Gemini (`@google/genai`), Zod | 4-agent structured threat investigation and validation |

---

## 15. Experimental Evaluation

The system was evaluated under controlled experimental conditions (Phase 7A Benchmark Suite) to assess detection latency, multi-format parsing overhead, multi-agent reasoning, and caching efficiency.

### Authoritative Benchmark Dataset
- **Dataset**: `docs/AegisAI_Dummy_Website_Authentication_Logs_100.csv`
- **SHA-256 Checksum**: `aa2cefc3ef89707ed2820b392c0187630efb6748e67bd29df283a36fae6024e1`
- **Volume**: 100 authentication events (81 successful logins, 19 failures, containing a controlled brute-force sequence).

### Measured Performance Summary

| Metric | Measured Value | Notes |
| :--- | :--- | :--- |
| **Mean Deterministic Detection Latency** | **4.93 ms** | In-memory evaluation (Min: 2.45 ms, Max: 9.11 ms across 5 runs) |
| **Detection Engine Throughput** | **35,800+ records/sec** | Measured across scaled synthetic test workloads |
| **Fresh 4-Agent Investigation Latency** | **~157.97 seconds** | Complete sequential 4-agent execution via Google Gemini |
| **Cached Investigation Retrieval Latency** | **~1.60 seconds** | Database retrieval from Neon PostgreSQL |
| **Observed Caching Speedup** | **98.8x** | Direct cache hit vs. fresh LLM execution |
| **Gemini API Calls (Fresh Run)** | **4 calls** | 1 call per specialized agent |
| **Gemini API Calls (Cached Run)** | **0 calls** | Zero LLM token consumption on cache hit |
| **Multi-Format Ingestion Coverage** | **CSV, JSON, JSONL, XLSX, XML** | 0 parsing errors across all supported formats |

> [!IMPORTANT]
> **Research Evaluation Note**: These benchmark results reflect measured performance on a controlled synthetic dataset within the defined experimental environment. Latencies in production environments may vary based on network conditions, LLM provider response times, and database cold-start characteristics.

---

## 16. Research Limitations

To maintain academic and operational rigor, the following limitations are documented:

1. **Synthetic Evaluation Dataset**: The primary benchmark utilizes synthetic authentication telemetry. Real-world enterprise logs exhibit significantly higher noise, incomplete fields, and diverse timestamp formats.
2. **Parser Overhead Variations**: Complex formats (`XLSX`, `XML`) exhibit higher parsing overhead (~5–15 ms) compared to lightweight stream formats (`JSON`, `JSONL` at < 1 ms).
3. **LLM Provider Latency & Rate Limits**: Sequential 4-agent inference depends on external Gemini API response times and upstream rate limiting.
4. **Token Usage Telemetry**: Detailed prompt/completion token metrics are not currently exposed by the provider wrapper.
5. **Geolocation Metadata Dependency**: Impossible Travel detection (Rule 4) requires pre-enriched latitude and longitude coordinates.
6. **Serverless Database Latency**: Occasional TLS handshake latency or serverless cold starts may introduce minor variability in query retrieval times.

---

## 17. Demonstration Datasets

The repository includes 10 synthetic demonstration datasets in `docs/` covering diverse operational security scenarios across all supported formats. For detailed specifications, refer to [`docs/DATASET_CATALOG.md`](docs/DATASET_CATALOG.md) and [`docs/README.md`](docs/README.md).

| Dataset File | Format | Scenario Description | Expected Detection |
| :--- | :---: | :--- | :--- |
| **`dataset-01-normal-auth.csv`** | `CSV` | Routine successful authentications across multiple roles | None (Baseline) |
| **`dataset-02-brute-force.json`** | `JSON` | 6 rapid authentication failures targeting `admin` | Rule 1 (Brute Force, Score: 85) |
| **`dataset-03-privileged-activity.jsonl`** | `JSONL` | 3 consecutive failures on superuser `root` | Rule 5 (Privileged Activity, Score: 70) |
| **`dataset-04-impossible-travel.xlsx`** | `XLSX` | Logins from New York and London within 30 minutes | Rule 4 (Impossible Travel, Score: 80) |
| **`dataset-05-benign-location.xml`** | `XML` | Location shift without coordinate metadata | None (Conservative guard) |
| **`dataset-06-mixed-authentication.csv`** | `CSV` | Mixed normal logins, typos, and isolated probes | None (Sub-threshold noise) |
| **`dataset-07-api-authentication.json`** | `JSON` | Service account token generation telemetry | None (Automated API traffic) |
| **`dataset-08-enterprise-auth.jsonl`** | `JSONL` | Enterprise SSO SAML authentication events | None (IdP verification) |
| **`dataset-09-mixed-security-events.xlsx`** | `XLSX` | VPN gateway tunnel connection logs | None (Single failure filtered) |
| **`dataset-10-coordinate-travel.xml`** | `XML` | Logins from San Francisco and Tokyo in 45 minutes | Rule 4 (Impossible Travel, Score: 80) |

> [!NOTE]
> **SYNTHETIC DEMONSTRATION DATA**: These datasets contain synthetic security telemetry generated specifically for parser validation and research demonstration. They are not real-world production logs.

---

## 18. Project Structure

```
AegisAI/
├── architecture/
│   └── architecture.md               # High-level architecture specification
├── backend/
│   ├── prisma/
│   │   └── schema.prisma             # PostgreSQL database schema (Prisma 7)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── ai/
│   │   │   │   ├── agent.ts                  # Agent 01 — Threat Analysis
│   │   │   │   ├── summarizationAgent.ts     # Agent 02 — Incident Summary
│   │   │   │   ├── riskAssessmentAgent.ts    # Agent 03 — Risk Assessment
│   │   │   │   ├── recommendationAgent.ts    # Agent 04 — Response Recommendation
│   │   │   │   ├── providers.ts              # Gemini provider & BYOK resolver
│   │   │   │   └── types.ts                  # AI output type definitions
│   │   │   ├── auth.ts                       # JWT authentication utilities
│   │   │   ├── encryption.ts                 # AES-256-GCM BYOK encryption
│   │   │   ├── parser.ts                     # Multi-format telemetry parser
│   │   │   └── threatDetectionEngine.ts      # Deterministic detection engine
│   │   ├── services/
│   │   │   └── aiInvestigationOrchestrator.ts # 4-Agent sequential orchestrator
│   │   ├── audit_phase6_full.ts              # Phase 6 comprehensive audit runner
│   │   ├── benchmark_phase7a.ts              # Phase 7A research benchmark runner
│   │   ├── check_dataset_consistency.ts      # Dataset integrity validator
│   │   └── server.ts                         # Express REST API server
│   ├── .env.example                          # Configuration template
│   ├── package.json                          # Backend dependencies
│   └── tsconfig.json                         # Backend TypeScript configuration
├── docs/
│   ├── AegisAI_Dummy_Website_Authentication_Logs_100.csv # Authoritative benchmark dataset
│   ├── DATASET_CATALOG.md                    # Catalog of demonstration datasets
│   ├── FINAL_REPOSITORY_AUDIT.md             # Repository audit report
│   ├── LEGACY_CLEANUP_REPORT.md              # Legacy cleanup audit
│   ├── PROJECT_STRUCTURE_REPORT.md           # Detailed codebase structure
│   ├── README.md                             # Dataset overview & usage guide
│   ├── api-reference.md                      # REST API endpoint reference
│   ├── architecture.md                       # Comprehensive architecture guide
│   ├── benchmark_results_phase7a.json        # Raw benchmark measurement data
│   ├── dataset-01 through dataset-10         # Multi-format demonstration datasets
│   └── setup-guide.md                        # Local development setup guide
├── frontend/
│   ├── public/                               # Static assets and logo
│   ├── src/
│   │   ├── components/layout/                # Navbar, Sidebar components
│   │   ├── context/                          # AuthContext (JWT state management)
│   │   ├── lib/                              # Typed API client
│   │   ├── pages/                            # SPA Views (Dashboard, ThreatDetails, Profile, etc.)
│   │   ├── App.tsx                           # Root application & routing
│   │   └── main.tsx                          # Frontend entry point
│   ├── .env.example                          # Frontend configuration template
│   ├── package.json                          # Frontend dependencies
│   ├── vercel.json                           # Vercel SPA routing configuration
│   └── vite.config.ts                        # Vite configuration
├── docker-compose.yml                        # Multi-container Docker configuration
├── render.yaml                               # Render Web Service Blueprint
├── .gitignore                                # Git ignore specification
└── README.md                                 # Master repository README
```

---

## 19. Local Setup & Quickstart

### Prerequisites
- Node.js `v20+` (LTS recommended)
- PostgreSQL database (Local or Neon Serverless)
- Google Gemini API key

### 1. Backend Configuration
```bash
cd backend
npm install
```

Create `backend/.env` based on `backend/.env.example`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/aegis_ai_db?schema=public"
GEMINI_API_KEY="your-gemini-api-key-here"
AI_PROVIDER="gemini"
AI_KEY_ENCRYPTION_SECRET="your-32-byte-hex-encryption-secret"
PORT=5000
FRONTEND_URL="http://localhost:5174"
```

> [!WARNING]
> Never commit `.env` files to version control. The repository `.gitignore` automatically excludes all environment configuration files.

Initialize database schema and launch backend:
```bash
npx prisma generate
npx prisma db push
npm run dev
```
The REST API will start at `http://localhost:5000`.

### 2. Frontend Configuration
```bash
cd ../frontend
npm install
npm run dev
```
The frontend interface will be accessible at `http://localhost:5174` (or `http://localhost:5173`).

---

## 20. Production Deployment Guide (Render + Vercel + Neon)

AegisAI is engineered for zero-friction cloud deployment across a serverless production topology:

```
+───────────────────────────+         HTTPS / API         +───────────────────────────+
│      Vercel (Frontend)    │ ──────────────────────────> │   Render (Web Service)    │
│  React 19 + TypeScript    │ <────────────────────────── │   Node.js + Express API   │
│  (Root: frontend)         │         CORS Guard          │   (Root: backend)         │
+───────────────────────────+                             +─────────────┬─────────────+
                                                                        │
                                      ┌─────────────────────────────────┴─────────────────────────────────┐
                                      │                                                                   │
                                      v                                                                   v
                        +───────────────────────────+                                       +───────────────────────────+
                        │      Neon PostgreSQL      │                                       │     Google Gemini API     │
                        │  Serverless Relational DB │                                       │  System Fallback + BYOK   │
                        │  (Prisma 7 + Pooler)      │                                       │  (AES-256-GCM Encrypted)  │
                        +───────────────────────────+                                       +───────────────────────────+
```

### Step 1: Database Setup (Neon PostgreSQL)
1. Create a serverless PostgreSQL project at [Neon](https://neon.tech).
2. Copy the pooled connection string (with `?sslmode=require`).
3. Push database schema:
   ```bash
   cd backend
   DATABASE_URL="your-neon-connection-string" npx prisma db push
   ```

### Step 2: Backend Deployment (Render Web Service)
1. In [Render Dashboard](https://dashboard.render.com), click **New** → **Web Service** (or use Blueprint with `render.yaml`).
2. Connect your `AegisAI` GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables in Render:
   | Variable | Description | Example / Note |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
   | `PORT` | Web service listening port | `10000` (Render sets this automatically) |
   | `NODE_ENV` | Environment mode | `production` |
   | `FRONTEND_URL` | Allowed Vercel frontend URL(s) | `https://your-aegis-app.vercel.app` (comma-separated if multiple) |
   | `JWT_SECRET` | Secret for signing auth tokens | 32+ character random secret string |
   | `AI_PROVIDER` | AI provider identifier | `gemini` |
   | `GEMINI_API_KEY` | System Gemini API key fallback | Google AI Studio API key |
   | `GEMINI_MODEL` | Default Gemini model | `gemini-2.0-flash-lite` |
   | `AI_KEY_ENCRYPTION_SECRET` | 32-byte secret for BYOK encryption | 32-byte hex/random string |
5. Deploy and verify health:
   ```bash
   curl https://your-render-backend.onrender.com/api/health
   # Expected: {"success":true,"status":"healthy","database":"CONNECTED",...}
   ```

### Step 3: Frontend Deployment (Vercel)
1. In [Vercel Dashboard](https://vercel.com), click **Add New** → **Project** and select `AegisAI`.
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   | Variable | Description | Example |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | Render backend Web Service URL | `https://your-render-backend.onrender.com` |
4. Deploy. Vercel will build the frontend and serve it globally with SPA route fallback handled by [`frontend/vercel.json`](frontend/vercel.json).

### Step 4: Link Frontend & Backend CORS
1. Copy your assigned Vercel URL (e.g. `https://aegis-ai.vercel.app`).
2. Go to **Render Dashboard** → Backend Service → **Environment Variables**.
3. Set `FRONTEND_URL` to your Vercel URL (`https://aegis-ai.vercel.app`).
4. Trigger a redeploy on Render so CORS accepts requests from your Vercel domain.

### Important Production Notes:
- **File Upload Storage**: Physical files uploaded via `/api/logs/upload` are parsed in memory / temporary disk storage and their normalized records are persisted in Neon PostgreSQL. Ephemeral container restarts do not impact investigation history or threat records stored in the database.
- **BYOK Isolation**: Analysts can supply their personal Gemini API key in Profile settings. Keys are encrypted at rest with AES-256-GCM and decrypted exclusively in memory during investigation workflows.

---

## 21. API Endpoint Overview

All endpoints are prefixed with `/api`. For detailed request/response schemas, see [`docs/api-reference.md`](docs/api-reference.md).

| Category | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **System** | `GET` | `/api/health` | Service and database health check |
| **Auth** | `POST` | `/api/auth/register` | Register new analyst account |
| **Auth** | `POST` | `/api/auth/login` | Authenticate and obtain JWT session |
| **Auth** | `GET` | `/api/auth/me` | Retrieve authenticated user profile |
| **Auth** | `POST` | `/api/auth/logout` | Invalidate session & clear cookie |
| **BYOK** | `GET` | `/api/profile/ai-provider` | Retrieve encrypted BYOK status & masked key |
| **BYOK** | `PUT` | `/api/profile/ai-provider` | Save custom Gemini API key (AES-256-GCM) |
| **BYOK** | `DELETE` | `/api/profile/ai-provider` | Delete custom BYOK configuration |
| **BYOK** | `POST` | `/api/profile/ai-provider/test` | Test Gemini API connection |
| **Analyses** | `POST` | `/api/analyses` | Create new analysis workspace |
| **Analyses** | `GET` | `/api/analyses` | List user's analysis workspaces |
| **Analyses** | `GET` | `/api/analyses/:id` | Get analysis workspace details |
| **Analyses** | `DELETE` | `/api/analyses/:id` | Delete analysis workspace |
| **Telemetry** | `POST` | `/api/logs/upload` | Upload & parse multi-format security log |
| **Telemetry** | `GET` | `/api/logs` | List uploaded log files |
| **Telemetry** | `GET` | `/api/logs/:id` | Retrieve log file metadata |
| **Telemetry** | `GET` | `/api/logs/:id/records` | Retrieve normalized log records |
| **Telemetry** | `DELETE` | `/api/logs/:id` | Delete log file and records |
| **Threats** | `GET` | `/api/threats` | List detected threat events |
| **Threats** | `GET` | `/api/threats/:id` | Get threat details & evidence |
| **Threats** | `GET` | `/api/logs/:id/threats` | Get threats for specific log file |
| **Threats** | `POST` | `/api/logs/:id/analyze` | Re-run deterministic detection engine |
| **Investigation** | `GET` | `/api/threats/:id/ai-investigation` | Get complete 4-agent investigation (cached) |
| **Investigation** | `POST` | `/api/threats/:id/ai-investigation` | Execute 4-agent investigation pipeline |
| **Investigation** | `GET` | `/api/threats/:id/analysis` | Get Agent 01 Threat Analysis output |
| **Investigation** | `GET` | `/api/threats/:id/summary` | Get Agent 02 Incident Summary output |
| **Investigation** | `GET` | `/api/threats/:id/risk-assessment` | Get Agent 03 Risk Assessment output |
| **Investigation** | `GET` | `/api/threats/:id/recommendations` | Get Agent 04 Response Recommendation output |
| **Stats** | `GET` | `/api/stats` | Global SOC dashboard metrics |

---

## 22. Research Reproducibility & Validation

The codebase includes standalone test and validation scripts to ensure full research reproducibility:

- **`backend/src/check_dataset_consistency.ts`**: Verifies SHA-256 integrity and event distributions of demonstration datasets.
- **`backend/src/test_phase4_formats.ts`**: Validates parsing and normalization across all five supported formats (`CSV`, `JSON`, `JSONL`, `XLSX`, `XML`).
- **`backend/src/test_phase5_byok.ts`**: Validates AES-256-GCM encryption, decryption, masking, and multi-user isolation.
- **`backend/src/test_risk.ts`**: Validates deterministic risk scoring math and edge cases ($L \times I$).
- **`backend/src/test_recommendation.ts`**: Validates Agent 04 response playbook generation and human review flags.
- **`backend/src/test_phase3_auth.ts`**: Validates JWT authentication and route protection.
- **`backend/src/run_validation.ts`**: End-to-end integration test runner.
- **`backend/src/benchmark_phase7a.ts`**: Complete research benchmark suite for latency, throughput, and caching measurements.

---

## 23. Responsible AI & Operational Safety

AegisAI adheres strictly to responsible AI principles in cybersecurity:

1. **Advisory Role**: All outputs generated by AI agents represent analytical hypotheses and recommended actions.
2. **Mandatory Human-in-the-Loop**: Critical containment and remediation measures require human review, validation, and sign-off.
3. **No Autonomous Destructive Execution**: AegisAI does **not** autonomously:
   - Block IP addresses or alter firewall configurations
   - Terminate or disable user credentials
   - Kill processes or modify operating system state
   - Issue automated network isolation commands
4. **Transparency & Evidence Grounding**: Every AI finding must reference corroborating log records and observed telemetry.

---

## 24. Future Work

Planned research and engineering extensions:

- **Expanded LLM Provider Support**: Integration of Anthropic Claude, OpenAI, and self-hosted open-weights models (e.g., Llama 3 on vLLM).
- **Retrieval-Augmented Generation (RAG)**: Knowledge-base indexing over internal SOC playbooks and threat intelligence feeds.
- **Automated MITRE ATT&CK Mapping**: Fine-grained mapping of detected behaviors to MITRE enterprise tactics and techniques (TTPs).
- **Expanded Real-World Datasets**: Evaluation across noisy, multi-gigabyte industrial enterprise SIEM exports.
- **Analyst Feedback Loop**: Active learning mechanisms allowing analysts to provide feedback on AI-generated summaries and risk assessments.
- **SIEM & SOAR Connectors**: Read-only ingestion connectors for Splunk, Elastic SIEM, and Microsoft Sentinel, with explicit two-analyst approval gates for SOAR actions.

---

## 25. Current Implementation Status

- [x] User registration, login, and JWT session authentication
- [x] User-level resource ownership isolation
- [x] Multi-format security log ingestion (CSV, JSON, JSONL, XLSX, XML)
- [x] In-memory deterministic threat detection engine (Rules 1–5)
- [x] Agent 01 — Threat Analysis (Technical triage & reasoning)
- [x] Agent 02 — Incident Summary (Executive synthesis & narrative)
- [x] Agent 03 — Risk Assessment (Qualitative analysis & deterministic scoring)
- [x] Agent 04 — Response Recommendation (Actionable mitigation playbooks)
- [x] Unified 4-agent sequential investigation orchestrator
- [x] PostgreSQL persistence via Prisma ORM 7
- [x] Investigation result caching (98.8x observed speedup)
- [x] Partial investigation resume capability
- [x] Untrusted log prompt-injection defense
- [x] Mandatory human-in-the-loop review guard
- [x] Google Gemini AI provider implementation
- [x] Bring-Your-Own-Key (BYOK) custom provider configuration
- [x] AES-256-GCM authenticated credential encryption
- [x] Research benchmark framework & test suites
- [x] Synthetic demonstration dataset catalog

---

## 26. Core Project Principle

> **"Detect deterministically. Investigate intelligently. Decide with evidence."**

AegisAI aims to drastically accelerate the incident investigation workflow for cybersecurity analysts while maintaining mathematical transparency, evidence grounding, reproducibility, and ultimate human control.

---

## 27. Documentation Links

For further technical details, explore the repository documentation:
- [Setup & Installation Guide](docs/setup-guide.md)
- [System Architecture Specification](docs/architecture.md)
- [Architecture Overview](architecture/architecture.md)
- [REST API Reference](docs/api-reference.md)
- [Demonstration Dataset Catalog](docs/DATASET_CATALOG.md)
- [Dataset Documentation](docs/README.md)
- [Legacy Cleanup Audit Report](docs/LEGACY_CLEANUP_REPORT.md)

---

## 28. Disclaimer

AegisAI is a research and educational cybersecurity analysis platform. It is not intended to operate as a standalone replacement for an enterprise Security Operations Center (SOC), Security Information and Event Management (SIEM), Endpoint Detection and Response (EDR), or professional incident response team without appropriate validation, organizational tailoring, and security oversight.


