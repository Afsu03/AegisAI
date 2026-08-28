# AegisAI Architecture Specification

## Overview

AegisAI is an evidence-driven security operations and multi-agent threat investigation platform that combines deterministic threat detection with four specialized Large Language Model (LLM) agents.

```
                  +--------------------------+
                  |  Security Log Telemetry  |
                  | (CSV, JSON, JSONL, XLSX, |
                  |           XML)           |
                  +-------------+------------+
                                |
                                v
                  +--------------------------+
                  |  Multi-Format Log Parser |
                  |   (Normalized Records)   |
                  +-------------+------------+
                                |
                                v
                  +--------------------------+
                  |   Deterministic Engine   |
                  |  (Rules 1-5, In-Memory)  |
                  +-------------+------------+
                                |
                                v
                  +--------------------------+
                  |       Threat Event       |
                  +-------------+------------+
                                |
                                v
          +------------------------------------------+
          |      AI Investigation Orchestrator       |
          |                                          |
          |  1. Threat Analysis Agent (Agent 01)     |
          |  2. Incident Summary Agent (Agent 02)    |
          |  3. Risk Assessment Agent (Agent 03)     |
          |  4. Recommendation Agent (Agent 04)      |
          +---------------------+--------------------+
                                |
                                v
                  +--------------------------+
                  |   PostgreSQL / Neon DB   |
                  |  (Prisma Schema Caching) |
                  +-------------+------------+
                                |
                                v
                  +--------------------------+
                  |  Security Analyst Review |
                  | (React 19, TypeScript UI)|
                  +--------------------------+
```

## System Components

1. **Frontend (`frontend/`)**:
   - React 19 + TypeScript + Vite + Tailwind CSS.
   - Minimal monochrome design system with Austin display typography.
   - Pages: Dashboard, Analyses, Log Analysis, Threat Details, Multi-Agents, Incident Response, Profile (BYOK Settings), Architecture, About.

2. **Backend REST API (`backend/`)**:
   - Node.js + Express + TypeScript + Prisma ORM.
   - JWT authentication (HTTP-only cookie + Bearer token), AES-256-GCM encryption for BYOK credentials.
   - Multi-format file ingestion: CSV, JSON, JSONL, XLSX, XML.

3. **Deterministic Detection Engine (`backend/src/lib/threatDetectionEngine.ts`)**:
   - In-memory rule evaluation (Brute Force, Credential Stuffing, Suspicious Auth, Impossible Travel with Haversine formula, Suspicious Privileged Activity).
   - Fast filtering before LLM inference.

4. **Multi-Agent AI Investigation Orchestrator (`backend/src/services/aiInvestigationOrchestrator.ts`)**:
   - Sequential execution of 4 specialized agents powered by Google Gemini with Zod output validation.
   - Deterministic risk score calculation: $\text{riskScore} = \text{round}((\text{likelihoodScore} \times \text{impactScore}) / 16 \times 100)$.
   - Per-stage caching in PostgreSQL and partial resume support.

5. **Database Models (`backend/prisma/schema.prisma`)**:
   - `User`, `AIProviderConfig`, `Analysis`, `LogFile`, `LogRecord`, `ThreatEvent`, `ThreatAnalysis`, `IncidentSummary`, `RiskAssessment`, `ResponseRecommendation`.
