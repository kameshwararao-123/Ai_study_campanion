# AI Study Companion — Master Implementation Plan (IMPLEMENTATION_PLAN.md)

**Project:** AI Study Companion — AI-Powered Learning & Growth Workspace  
**Document Version:** 2.0 (React JS / JSX & Express.js Roadmap)  
**Baseline References:** `Project_Requirements.pdf`, `REQUIREMENTS.md`, `ARCHITECTURE.md`  
**Requirement Range:** `REQ-001` through `REQ-092` (100% Coverage)  

---

## 1. Implementation Phases & Task Mapping

---

### Phase 1: Project Setup, Database & Core Infrastructure
- **Task 1.1: Environment & Project Scaffolding** (`REQ-005`, `REQ-008`)
  - Express.js backend + React Vite frontend scaffolding.
  - Environment variables specification and `.gitignore` security.
- **Task 1.2: Database Modeling & Migrations** (`REQ-003`, `REQ-090`)
  - Prisma schema with 19 relational entities.
  - Prisma client generation and SQLite database sync.
- **Task 1.3: Response Formatting & Domain Errors** (`REQ-005`, `REQ-089`, `REQ-090`)
  - Unified JSON response helper (`apiSuccess`, `apiError`) and domain error classes.
- **Task 1.4: AI Provider Abstraction** (`REQ-074`, `REQ-089`)
  - `IAIProvider` interface with Gemini and Deterministic Mock implementations.

---

### Phase 2: Authentication, Authorization & User Management
- **Task 2.1: Authentication Service & JWT** (`REQ-001`, `REQ-008`)
  - Registration, login, password hashing with `bcryptjs`, JWT token signing & verification.
- **Task 2.2: RBAC & Auth Middleware** (`REQ-002`, `REQ-003`)
  - `authenticate` and `requireAdmin` Express middleware.
- **Task 2.3: Multi-Tenant Query Scoping** (`REQ-003`, `REQ-004`)
  - Tenant query isolation helpers ensuring user-scoped data access.
- **Task 2.4: React Auth UI Components** (`REQ-001`)
  - `LoginPage.jsx`, `RegisterPage.jsx`, and `AuthContext.jsx`.

---

### Phase 3: Spaces & Projects Workspace Hierarchy
- **Task 3.1: Spaces Backend Service & CRUD** (`REQ-009`, `REQ-010`, `REQ-011`)
  - Space creation with visual configuration, listing, updating, deletion.
- **Task 3.2: Space UI Views** (`REQ-011`, `REQ-012`)
  - `SpacesListPage.jsx` and `SpaceDashboardPage.jsx` with project aggregations.
- **Task 3.3: Projects Backend Service & Goal Management** (`REQ-013`, `REQ-016`)
  - Project creation with learning goals, context initialization, event emission.
- **Task 3.4: Project Workspace Layout & Dashboard** (`REQ-014`, `REQ-015`)
  - `ProjectLayout.jsx` with workspace navigation tabs and `ProjectDashboardPage.jsx`.

---

### Phase 4: Learning Materials Ingestion & Asynchronous Pipeline
- **Task 4.1: Secure PDF Upload API** (`REQ-007`, `REQ-017`, `REQ-018`)
  - Multer upload handler validating PDF MIME types, 25MB limits, and secure disk storage.
- **Task 4.2: Asynchronous Job Processing Engine** (`REQ-004`, `REQ-068`, `REQ-072`, `REQ-073`)
  - Decoupled job queue supporting state transitions (`QUEUED`, `PROCESSING`, `READY`, `FAILED`), retries, and failure logging.
- **Task 4.3: Ingestion Worker Pipeline** (`REQ-019`, `REQ-021`, `REQ-022`, `REQ-069`)
  - Orchestration of parsing, OCR, concept extraction, chunking, and embeddings.
- **Task 4.4: Materials UI & Status Observability** (`REQ-020`, `REQ-023`)
  - `MaterialsHubPage.jsx`, `FileDropzone.jsx`, `DocumentStatusBadge.jsx`.

---

### Phase 5: Knowledge Extraction, Chunking & Vector Retrieval
- **Task 5.1: PDF Text & Structure Extraction** (`REQ-024`, `REQ-026`)
  - Page-aware PDF parser segmenting text into chunks with start/end page boundaries.
- **Task 5.2: Scanned Document & OCR Handling** (`REQ-025`)
  - OCR fallback for image-only PDF pages.
- **Task 5.3: Automated Concept Extraction** (`REQ-027`)
  - AI extraction of domain concepts, definitions, and importance scores.
- **Task 5.4: Vector Embedding & Similarity Search** (`REQ-028`, `REQ-039`)
  - Cosine similarity vector search strictly filtered by `projectId`.

---

### Phase 6: AI Tutor, Grounded Citations & Safety Boundaries
- **Task 6.1: 3-Part Context Assembly** (`REQ-032`, `REQ-033`, `REQ-062`)
  - Prompt builder combining conversation history, retrieved chunks, and learner context.
- **Task 6.2: Grounded Answering & Citations** (`REQ-034`, `REQ-035`)
  - Page citations (`[Source: Doc — Page X]`) with interactive slide-over preview drawer.
- **Task 6.3: Hallucination Prevention & Uncertainty Communication** (`REQ-006`, `REQ-036`)
  - Refusal logic when evidence is insufficient.
- **Task 6.4: Controlled Tool Execution Interface** (`REQ-006`, `REQ-037`, `REQ-038`, `REQ-041`)
  - Structured tool requests validated on the backend.
- **Task 6.5: Streaming Response API & Chat UI** (`REQ-029`, `REQ-030`, `REQ-031`, `REQ-087`)
  - SSE streaming endpoint and `TutorChatPage.jsx` with learning mode buttons.

---

### Phase 7: Adaptive Quiz Engine & Open-Ended Assessment
- **Task 7.1: Adaptive Question Selection Algorithm** (`REQ-042`, `REQ-045`)
  - Evidence-based selection prioritizing weak concepts and recent mistakes.
- **Task 7.2: Quiz Generation (MCQ & Open-Ended)** (`REQ-042`, `REQ-043`, `REQ-044`)
  - Grounded question generator with Zod schema validation.
- **Task 7.3: Interactive Quiz Runner UI** (`REQ-043`, `REQ-044`, `REQ-046`)
  - `AdaptiveQuizPage.jsx` step-by-step runner.
- **Task 7.4: Open-Ended AI Evaluation & Feedback** (`REQ-047`, `REQ-048`)
  - Qualitative analysis (understanding, missing concepts, reasoning).
- **Task 7.5: Assessment Event Dispatch** (`REQ-049`, `REQ-067`, `REQ-070`)
  - Triggers mastery updates and recommendation workflows upon completion.

---

### Phase 8: Concept Mastery Tracking & Growth Analysis
- **Task 8.1: Dynamic Mastery Estimation Engine** (`REQ-040`, `REQ-050`, `REQ-051`, `REQ-052`)
  - 0–100% mastery calculations, evidence weighting, and historical delta logging.
- **Task 8.2: Growth Trend Categorization** (`REQ-053`)
  - Classifying concepts into Improving, Stable, and Requiring Attention.
- **Task 8.3: Growth Analysis Dashboard** (`REQ-054`)
  - `GrowthAnalysisPage.jsx` with 3-column matrix and trajectory charts.

---

### Phase 9: Actionable Recommendations Engine ("What should I do next?")
- **Task 9.1: Multi-Signal Recommendation Synthesis** (`REQ-055`, `REQ-056`)
  - Ingests 7 learner signals to generate concrete, contextual next steps.
- **Task 9.2: Actionable UI with Direct Action Linking** (`REQ-057`, `REQ-058`)
  - `RecommendationCard.jsx` with one-click action launches.

---

### Phase 10: Persistent Learner Context & Error-Pattern Workflows
- **Task 10.1: Persistent Learner Profile Service** (`REQ-059`, `REQ-060`)
  - Manages goals, preferences, confirmed strengths, and registered weaknesses.
- **Task 10.2: Repeated-Mistake Pattern Detection Workflow** (`REQ-061`, `REQ-071`)
  - Identifies recurring errors and dispatches remedial recommendations.

---

### Phase 11: Event-Driven Learning Architecture & Analytics Dashboards
- **Task 11.1: Learning Event Bus** (`REQ-063`, `REQ-064`)
  - Structured event logger with idempotent deduplication.
- **Task 11.2: Project Analytics View** (`REQ-065`)
  - `ProjectAnalyticsPage.jsx` activity timeline and score radar.
- **Task 11.3: Global Learner Analytics** (`REQ-066`)
  - `GlobalAnalyticsPage.jsx` cross-space aggregation.
- **Task 11.4: User Home Dashboard** (`REQ-082`)
  - `UserHomePage.jsx` answering "Where was I, how am I doing, what should I do next?".

---

### Phase 12: Administrator Dashboard & Platform Oversight
- **Task 12.1: Platform KPI Overview Dashboard** (`REQ-083`)
  - `AdminOverviewPage.jsx` platform stats and system health.
- **Task 12.2: Learner Journey Deep-Dive** (`REQ-084`)
  - `AdminUserInspectionPage.jsx` inspection of individual learning paths.
- **Task 12.3: Platform Activity Audit Trail** (`REQ-085`)
  - `AdminActivityPage.jsx` with multi-dimensional filtering.
- **Task 12.4: Background Jobs Monitor** (`REQ-073`, `REQ-086`)
  - `AdminJobsPage.jsx` queue viewer with manual retry buttons.

---

### Phase 13: AI Observability, Telemetry & Cost Tracking
- **Task 13.1: AI Telemetry Logger** (`REQ-075`, `REQ-076`)
  - Records prompt/completion tokens, latency, cost, and errors per request.
- **Task 13.2: Retrieval Quality & Latency Diagnostics** (`REQ-077`, `REQ-078`)
  - Logs chunk similarity scores to diagnose retrieval vs inference performance.
- **Task 13.3: Admin AI Telemetry View** (`REQ-075`, `REQ-076`, `REQ-077`, `REQ-086`)
  - `AdminAIPage.jsx` charts and logs.

---

### Phase 14: AI Quality Evaluation Framework & Regression Testing
- **Task 14.1: Tutor Groundedness Benchmark** (`REQ-079`)
  - Automated evaluator measuring accuracy, citation validity, and refusal rate.
- **Task 14.2: Assessment & Recommendation Evaluator** (`REQ-080`)
  - Schema conformance and grading consistency checks.
- **Task 14.3: Regression Test Runner** (`REQ-081`)
  - Benchmark script detecting prompt/model regressions.

---

### Phase 15: Performance, Resilience, Security & E2E Verification
- **Task 15.1: Caching Layer** (`REQ-088`)
  - In-memory cache for search queries and embeddings.
- **Task 15.2: Provider Error & Rate-Limit Resilience** (`REQ-089`)
  - Exponential backoff retry handler for AI calls.
- **Task 15.3: Database Indexing & Pagination** (`REQ-091`)
  - Query optimization on high-volume tables.
- **Task 15.4: End-to-End Learning Loop Integrity Test** (`REQ-092`)
  - Complete automated verification of the 12-step learning cycle.

---

## 2. REQ-ID Coverage Matrix (REQ-001 to REQ-092)

| REQ-ID | Phase / Task | REQ-ID | Phase / Task | REQ-ID | Phase / Task |
|---|---|---|---|---|---|
| `REQ-001` | Phase 2 (Task 2.1, 2.4) | `REQ-032` | Phase 6 (Task 6.1) | `REQ-063` | Phase 11 (Task 11.1) |
| `REQ-002` | Phase 2 (Task 2.2) | `REQ-033` | Phase 6 (Task 6.1) | `REQ-064` | Phase 11 (Task 11.1) |
| `REQ-003` | Phase 1 & 2 (Task 1.2, 2.2, 2.3) | `REQ-034` | Phase 6 (Task 6.2) | `REQ-065` | Phase 11 (Task 11.2) |
| `REQ-004` | Phase 2 & 4 (Task 2.3, 4.2) | `REQ-035` | Phase 6 (Task 6.2, 6.5) | `REQ-066` | Phase 11 (Task 11.3) |
| `REQ-005` | Phase 1 (Task 1.1, 1.3) | `REQ-036` | Phase 6 (Task 6.3) | `REQ-067` | Phase 7 & 11 (Task 7.5, 11.1) |
| `REQ-006` | Phase 6 (Task 6.3, 6.4) | `REQ-037` | Phase 6 (Task 6.4) | `REQ-068` | Phase 4 (Task 4.2) |
| `REQ-007` | Phase 4 (Task 4.1) | `REQ-038` | Phase 6 (Task 6.4) | `REQ-069` | Phase 4 (Task 4.3) |
| `REQ-008` | Phase 1 & 2 (Task 1.1, 2.1) | `REQ-039` | Phase 5 & 6 (Task 5.4, 6.4) | `REQ-070` | Phase 7 (Task 7.5) |
| `REQ-009` | Phase 3 (Task 3.1) | `REQ-040` | Phase 6 & 8 (Task 6.4, 8.1) | `REQ-071` | Phase 10 (Task 10.2) |
| `REQ-010` | Phase 3 (Task 3.1) | `REQ-041` | Phase 6 (Task 6.4) | `REQ-072` | Phase 4 (Task 4.2) |
| `REQ-011` | Phase 3 (Task 3.1, 3.2) | `REQ-042` | Phase 7 (Task 7.2) | `REQ-073` | Phase 4 & 12 (Task 4.2, 12.4) |
| `REQ-012` | Phase 3 (Task 3.2) | `REQ-043` | Phase 7 (Task 7.2, 7.3) | `REQ-074` | Phase 1 (Task 1.4) |
| `REQ-013` | Phase 3 (Task 3.3) | `REQ-044` | Phase 7 (Task 7.2, 7.3) | `REQ-075` | Phase 13 (Task 13.1, 13.3) |
| `REQ-014` | Phase 3 (Task 3.4) | `REQ-045` | Phase 7 (Task 7.1) | `REQ-076` | Phase 13 (Task 13.1, 13.3) |
| `REQ-015` | Phase 3 (Task 3.4) | `REQ-046` | Phase 7 (Task 7.3, 7.5) | `REQ-077` | Phase 13 (Task 13.2, 13.3) |
| `REQ-016` | Phase 3 (Task 3.3) | `REQ-047` | Phase 7 (Task 7.4) | `REQ-078` | Phase 13 (Task 13.2) |
| `REQ-017` | Phase 4 (Task 4.1, 4.4) | `REQ-048` | Phase 7 (Task 7.4) | `REQ-079` | Phase 14 (Task 14.1) |
| `REQ-018` | Phase 4 (Task 4.1) | `REQ-049` | Phase 7 (Task 7.5) | `REQ-080` | Phase 14 (Task 14.2) |
| `REQ-019` | Phase 4 (Task 4.3) | `REQ-050` | Phase 8 (Task 8.1) | `REQ-081` | Phase 14 (Task 14.3) |
| `REQ-020` | Phase 4 (Task 4.4) | `REQ-051` | Phase 8 (Task 8.1) | `REQ-082` | Phase 11 (Task 11.4) |
| `REQ-021` | Phase 4 (Task 4.3) | `REQ-052` | Phase 8 (Task 8.1) | `REQ-083` | Phase 12 (Task 12.1) |
| `REQ-022` | Phase 4 (Task 4.3) | `REQ-053` | Phase 8 (Task 8.2) | `REQ-084` | Phase 12 (Task 12.2) |
| `REQ-023` | Phase 4 (Task 4.4) | `REQ-054` | Phase 8 (Task 8.3) | `REQ-085` | Phase 12 (Task 12.3) |
| `REQ-024` | Phase 5 (Task 5.1) | `REQ-055` | Phase 9 (Task 9.1) | `REQ-086` | Phase 12 & 13 (Task 12.4, 13.3) |
| `REQ-025` | Phase 5 (Task 5.2) | `REQ-056` | Phase 9 (Task 9.1) | `REQ-087` | Phase 6 (Task 6.5) |
| `REQ-026` | Phase 5 (Task 5.1) | `REQ-057` | Phase 9 (Task 9.2) | `REQ-088` | Phase 15 (Task 15.1) |
| `REQ-027` | Phase 5 (Task 5.3) | `REQ-058` | Phase 9 (Task 9.2) | `REQ-089` | Phase 1 & 15 (Task 1.3, 15.2) |
| `REQ-028` | Phase 5 (Task 5.4) | `REQ-059` | Phase 10 (Task 10.1) | `REQ-090` | Phase 1 (Task 1.2, 1.3) |
| `REQ-029` | Phase 6 (Task 6.5) | `REQ-060` | Phase 10 (Task 10.1) | `REQ-091` | Phase 15 (Task 15.3) |
| `REQ-030` | Phase 6 (Task 6.5) | `REQ-061` | Phase 10 (Task 10.2) | `REQ-092` | Phase 15 (Task 15.4) |
| `REQ-031` | Phase 6 (Task 6.5) | `REQ-062` | Phase 6 & 10 (Task 6.1, 10.1) | | |

