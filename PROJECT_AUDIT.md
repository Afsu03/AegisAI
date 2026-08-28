# AegisAI — Comprehensive Repository & Project Audit

## 1. Active Production Components
- **Backend Core**:
  - `backend/src/server.ts`: Express REST API, auth middleware, file upload, detection dispatch, AI investigation endpoints, BYOK endpoints.
  - `backend/src/lib/threatDetectionEngine.ts`: In-memory deterministic detection engine (Rules 1–5), `normalizeRecord()`, risk calculation.
  - `backend/src/lib/parser.ts`: Multi-format log parser (CSV, JSON, JSONL, XLSX, XML, Syslog, Windows Event, Firewall).
  - `backend/src/lib/encryption.ts`: AES-256-GCM encryption/decryption and key masking for BYOK credentials.
  - `backend/src/lib/ai/providers.ts`: Google Gemini AI provider implementation, dynamic BYOK provider resolution, system fallback.
  - `backend/src/lib/ai/agent.ts` (Agent 01 - Threat Analysis): Zod-validated technical threat triage.
  - `backend/src/lib/ai/summarizationAgent.ts` (Agent 02 - Incident Summary): Zod-validated executive incident context.
  - `backend/src/lib/ai/riskAssessmentAgent.ts` (Agent 03 - Risk Assessment): Qualitative assessment & deterministic compound risk scoring.
  - `backend/src/lib/ai/recommendationAgent.ts` (Agent 04 - Response Recommendation): Response playbooks with mandatory human review.
  - `backend/src/services/aiInvestigationOrchestrator.ts`: 4-Agent unified sequential pipeline with per-stage Neon PostgreSQL caching and partial resume.
- **Database & Data Layer**:
  - `backend/prisma/schema.prisma`: Prisma schema defining `User`, `AIProviderConfig`, `Analysis`, `LogFile`, `LogRecord`, `ThreatEvent`, and 4 AI output tables.
  - `backend/src/generated/prisma/`: Generated Prisma 7 Client.
- **Frontend Core**:
  - `frontend/src/App.tsx`: Routing, navigation layout, protected routes.
  - `frontend/src/context/AuthContext.tsx`: Authentication state management, JWT token handling, login/register/logout.
  - `frontend/src/lib/api.ts`: Typed API client for analyses, files, records, threats, investigations, and BYOK.
  - `frontend/src/pages/`:
    - `DashboardPage.tsx`: SOC overview metrics, quick actions, recent analyses.
    - `AnalysesPage.tsx`: Analyses list and workspace management.
    - `NewAnalysisPage.tsx`: Workspace creation & multi-format security log upload.
    - `ThreatDetailsPage.tsx`: Threat inspection, raw log evidence, and AI investigation trigger.
    - `MultiAgentsPage.tsx`: 4-Agent live investigation visualization and output review.
    - `IncidentResponsePage.tsx`: Incident overview, timeline, and mitigation actions.
    - `ProfilePage.tsx`: User profile and encrypted BYOK AI Provider settings.
    - `ArchitecturePage.tsx`: Architectural design review.
    - `AboutPage.tsx`: Project overview.
    - `LoginPage.tsx` & `RegisterPage.tsx`: Secure user authentication.
  - `frontend/src/components/layout/`: `Navbar.tsx`, `Sidebar.tsx`.
  - `frontend/src/index.css`: Minimal monochrome design system, warm cream accents, typography hierarchy with Austin font.

---

## 2. Experimental Components
- `backend/src/test_ai.ts`: Standalone developer test script for direct Gemini API testing.
- `backend/src/test_phase5_byok.ts`: Automated test script for BYOK AES-256-GCM verification.

---

## 3. Benchmark Components
- `backend/src/run_validation.ts`: Phase 2C automated system validation test runner.
- `backend/src/audit_phase6_full.ts`: Phase 6 comprehensive 25-module security audit suite.
- `backend/src/benchmark_phase7a.ts`: Phase 7A experimental performance and research benchmarking runner.
- `backend/src/check_dataset_consistency.ts`: Phase 7A dataset consistency & SHA-256 validation script.
- `backend/src/inspect_csv.ts`: Quick CSV inspector utility.

---

## 4. Unused Components
- `python-ai/`: Legacy prototype FastAPI mock service (`python-ai/main.py`, `python-ai/Dockerfile`, `python-ai/requirements.txt`). All AI functionality is natively implemented in TypeScript in `backend/src/lib/ai/`. Marked as **UNUSED**.

---

## 5. Duplicate Components
- Multiple physical upload copies in `backend/uploads/` generated during automated test runs (e.g. `1786714811921-1740.csv` 0-byte upload from multer test, `1786715379244-577968.csv` 71-byte path traversal test).

---

## 6. Deprecated Files
- `python-ai/`: Superceded by native Node.js / TypeScript AI orchestrator and agents.

---

## 7. Development-Only Files
- `backend/src/generate_demo_datasets.ts`: One-time script for generating demonstration datasets in `docs/`.
- `backend/benchmark_results_phase7a.json`: Local artifact containing raw JSON output from Phase 7A execution.

---

## 8. Python Dependencies
- `python-ai/requirements.txt`: `fastapi`, `uvicorn`, `pydantic`, `python-dotenv`. Not used by production backend or frontend.

---

## 9. TypeScript / Node Dependencies
- **Backend** (`backend/package.json`):
  - `@google/genai`, `@google/generative-ai`: Google Gemini API client.
  - `@prisma/client`, `@prisma/adapter-pg`, `pg`: Prisma 7 ORM with PostgreSQL client.
  - `express`, `cors`, `cookie-parser`, `dotenv`: Web server & middleware.
  - `bcryptjs`, `jsonwebtoken`: Authentication and secure password hashing.
  - `multer`, `csv-parser`, `fast-xml-parser`, `xlsx`: Multi-format file ingestion.
  - `zod`: Strict schema validation for AI agent outputs.
  - `ts-node`, `typescript`, `@types/*`: Development and compilation tools.
- **Frontend** (`frontend/package.json`):
  - `react`, `react-dom`, `react-router-dom`: UI framework & SPA routing.
  - `lucide-react`: UI iconography.
  - `tailwindcss`, `postcss`, `autoprefixer`: CSS utilities.
  - `vite`, `@vitejs/plugin-react`: Build system and dev server.

---

## 10. AI-Related Dependencies
- `@google/genai` (v0.1.1): Official Google GenAI SDK used in `GeminiProvider`.
- `@google/generative-ai` (v0.24.1): Supported provider fallback.

---

## 11. Database Dependencies
- Neon Serverless PostgreSQL 16 (AWS `ap-southeast-1`).
- `@prisma/adapter-pg` + `pg` connection pool.

---

## 12. Frontend Dependencies
- React 18, React Router v6, Lucide React, Tailwind CSS, Vite.

---

## 13. Potential Dead Code
- `python-ai/` folder (safe to remove or archive as it is not referenced in production runtime).

---

## 14. Duplicate Upload / Test Data
- `backend/uploads/1786714811921-1740.csv` (0 bytes, multer reject test)
- `backend/uploads/1786714864799-266741.csv` (0 bytes, multer reject test)
- `backend/uploads/1786715379244-577968.csv` (71 bytes, path traversal test)
- `backend/uploads/1786716215027-843952.csv` (71 bytes, path traversal test)

---

## 15. Files Safe to Remove / Archive
- `python-ai/` directory (after documenting decision in report).
- Transient 0-byte and 71-byte test upload files in `backend/uploads/`.
- Scratch verification scripts after validation.

---

## 16. Files that MUST NOT be Removed
- `backend/uploads/1786445044657-777713.csv`: **Authoritative Benchmark Dataset** (SHA-256: `aa2cefc3ef89707ed2820b392c0187630efb6748e67bd29df283a36fae6024e1`).
- `backend/prisma/schema.prisma`: Core database schema.
- `backend/src/server.ts`: Production API backend.
- `backend/src/lib/**/*`: Core detection engine, parsers, encryption, AI agents, and orchestrator.
- `frontend/src/**/*`: Production React frontend application.
- `docs/dataset-*`: 10 demonstration datasets.
