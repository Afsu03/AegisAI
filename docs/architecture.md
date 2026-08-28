# AegisAI — System Architecture Specification

## Overview

AegisAI is an evidence-driven security operations and multi-agent threat investigation platform that bridges deterministic rule-based threat detection and multi-agent Large Language Model (LLM) reasoning.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|              React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons           |
|         (SOC Dashboard / Log Ingestion / Threat Dossiers / Multi-Agent Review)    |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST API (JSON / Cookies / Bearer)
+-----------------------------------------v-----------------------------------------+
|                                APPLICATION LAYER                                  |
|                         Node.js + Express + TypeScript                            |
|                                                                                   |
|  +------------------------+  +------------------------+  +---------------------+  |
|  | Multi-Format Log Parser|  | Deterministic Engine   |  | Authentication &    |  |
|  | CSV, JSON, JSONL, XLSX |  | Rules 1-5 (In-Memory)  |  | BYOK Encryption     |  |
|  | XML (Normalized Record)|  | Fast Filtering         |  | JWT & AES-256-GCM   |  |
|  +------------------------+  +------------------------+  +---------------------+  |
|                                          |                                        |
|  +---------------------------------------v-------------------------------------+  |
|  |                    AI Investigation Orchestrator                             |  |
|  |                                                                             |  |
|  |  [Agent 01: Threat Analysis]    --> Evaluates threat type, reasoning & IoCs |  |
|  |               |                                                             |  |
|  |  [Agent 02: Incident Summary]   --> Synthesizes executive context & timeline|  |
|  |               |                                                             |  |
|  |  [Agent 03: Risk Assessment]    --> Qualitative scoring + Deterministic Math|  |
|  |               |                     (riskScore = (L x I) / 16 * 100)        |  |
|  |  [Agent 04: Recommendation]     --> Containment & mitigation playbooks      |  |
|  |                                     (Mandatory Human-in-the-Loop Guard)     |  |
|  +---------------------------------------+-------------------------------------+  |
+------------------------------------------|----------------------------------------+
                                           | Prisma 7 Client + pg
+------------------------------------------v----------------------------------------+
|                                   DATA LAYER                                      |
|                       PostgreSQL 16 (Neon Serverless)                             |
|                                                                                   |
|  Users | AIProviderConfigs | Analyses | LogFiles | LogRecords | ThreatEvents      |
|  ThreatAnalyses | IncidentSummaries | RiskAssessments | ResponseRecommendations   |
+-----------------------------------------------------------------------------------+
```

---

## Core Principles & Design Decisions

1. **Deterministic Filtering Before LLM Inference**:
   Raw telemetry is normalized into internal standard events (`LogRecord`) and passed through an in-memory deterministic rule engine. High-volume benign logs are processed in sub-millisecond timeframes without incurring LLM latency or cost.

2. **Sequential Multi-Agent Pipeline with State Isolation**:
   The investigation orchestrator runs 4 specialized agents sequentially. Each agent receives strictly structured, Zod-validated input containing context from preceding stages and generates domain-bounded outputs.

3. **Deterministic Numerical Risk Scoring**:
   The LLM evaluates qualitative metrics (*Likelihood* 1–4, *Impact* 1–4, *Target Criticality*, *Evidence Strength*), but does **not** generate arbitrary numerical scores. The backend deterministically calculates:
   $$\text{riskScore} = \text{round}\left(\frac{\text{likelihoodScore} \times \text{impactScore}}{16} \times 100\right)$$
   This guarantees mathematical reproducibility and prevents hallucinated scores.

4. **Human-in-the-Loop Security Guard**:
   Agent 04 generates structured response recommendations (containment, investigation, mitigation, monitoring), but AegisAI explicitly prohibits automated destructive execution. All containment steps require human analyst verification.

5. **Bring-Your-Own-Key (BYOK) Isolation**:
   Users can supply their own Google Gemini API keys. Keys are encrypted at rest using AES-256-GCM with PBKDF2 key derivation and user ownership isolation. Plaintext keys are never returned across API responses.

6. **Investigation Persistence & Caching**:
   Completed investigations are cached across dedicated PostgreSQL tables. Subsequent queries load instantaneously from the database without repeated Gemini API calls (achieving ~98.8x retrieval speedup).

---

## Deterministic Detection Rules

| Rule ID | Name | Trigger Condition | Severity | Initial Score |
| :--- | :--- | :--- | :---: | :---: |
| **Rule 1** | Possible Brute Force Attack | $\ge 5$ failed authentications within 60 seconds from same IP | HIGH | 85 |
| **Rule 2** | Possible Credential Stuffing | $\ge 3$ distinct accounts targeted from single IP within 120 seconds | HIGH | 80 |
| **Rule 3** | Suspicious Authentication Activity | Isolated or off-hours anomalous authentication failure sequences | MEDIUM | 60 |
| **Rule 4** | Impossible Travel Detection | Consecutive logins across coordinate pairs exceeding 1,000 km/h velocity | HIGH | 80 |
| **Rule 5** | Suspicious Privileged Activity | Consecutive authentication failures on administrative/root accounts | HIGH | 70 |

---

## Database Relational Model

```
User (1)
 ├── (0..1) AIProviderConfig (AES-256-GCM Encrypted BYOK)
 └── (0..N) Analysis
             └── (0..N) LogFile
                         ├── (0..N) LogRecord (Normalized Telemetry)
                         └── (0..N) ThreatEvent
                                     ├── (0..1) ThreatAnalysis (Agent 01)
                                     ├── (0..1) IncidentSummary (Agent 02)
                                     ├── (0..1) RiskAssessment (Agent 03)
                                     └── (0..1) ResponseRecommendation (Agent 04)
```

