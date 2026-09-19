# AI Study Companion — Technical Architecture Specification (ARCHITECTURE.md)

**System:** AI Study Companion — AI-Powered Learning & Growth Workspace  
**Document Version:** 2.0 (React JS / JSX & Express.js Architecture)  
**Source Baseline:** `Project_Requirements.pdf` & `REQUIREMENTS.md` (`REQ-001` through `REQ-092`)  

---

## 1. Recommended Technology Stack

The architecture is designed to deliver a responsive, production-ready AI learning companion with clear separation of concerns, fast development speed, strong developer ergonomics, and multi-tenant data isolation.

| Component | Selected Technology | Rationale & Trade-offs | REQ Mapping |
|---|---|---|---|
| **Frontend Framework** | **React.js + Vite (JavaScript / JSX)** | Fast HMR, clean client-side routing, modular React components, and zero TypeScript compilation overhead. | `REQ-011`, `REQ-015`, `REQ-082`, `REQ-087` |
| **Frontend Styling** | **Tailwind CSS + Lucide React** | Utility-first responsive design, modern UI components, animated status indicators, custom themes. | `REQ-010`, `REQ-014`, `REQ-020`, `REQ-031` |
| **Visualizations & Formatting** | **Recharts + KaTeX + Prism.js** | Interactive charts for concept mastery and growth trajectories; KaTeX for LaTeX formulas; Prism.js for code snippets. | `REQ-029`, `REQ-050`, `REQ-054`, `REQ-065`, `REQ-066` |
| **Backend API Runtime** | **Express.js on Node.js (JavaScript ES Modules)** | Lightweight, highly extensible REST API server with middleware ecosystem and native streaming support (SSE / Chunked Transfer). | `REQ-001`, `REQ-005`, `REQ-037`, `REQ-074`, `REQ-089` |
| **Database & ORM** | **SQLite (dev/test) / PostgreSQL (prod) + Prisma ORM** | Complete 19-entity relational model, transactional safety, fast embedded local database with zero external daemon requirements. | `REQ-003`, `REQ-050`, `REQ-063`, `REQ-090` |
| **Vector Search Engine** | **High-Performance In-Memory Cosine Similarity / pgvector** | Project-scoped cosine similarity indexing and retrieval with strict multi-tenant boundary checks. | `REQ-003`, `REQ-028`, `REQ-039`, `REQ-078` |
| **Authentication & RBAC** | **JWT (JSON Web Tokens) + HTTP-only Cookies / Bearer + bcryptjs** | Tamper-proof stateless tokens, secure password hashing (12 rounds), role claims (`LEARNER` vs `ADMIN`). | `REQ-001`, `REQ-002`, `REQ-003` |
| **AI / LLM Integration** | **Unified Provider Abstraction (Google Gemini 1.5, OpenAI GPT-4o, Deterministic Mock Engine)** | Pluggable interface supporting text generation, token streaming, structured JSON schemas, and embeddings. | `REQ-006`, `REQ-027`, `REQ-029`, `REQ-032`, `REQ-034`, `REQ-042`, `REQ-047`, `REQ-055`, `REQ-074` |
| **Embeddings & Vector Indexing** | **Google text-embedding-004 / OpenAI text-embedding-3-small (with fallback hash-vectorizer)** | High-dimensional semantic vectors for document chunks. | `REQ-028`, `REQ-039` |
| **Document Processing & OCR** | **pdf-parse / pdfjs-dist + OCR / Multimodal Vision Fallback** | Extraction of text, hierarchy, tables, and page boundaries from PDFs. | `REQ-017`, `REQ-019`, `REQ-024`, `REQ-025`, `REQ-026` |
| **Background Processing** | **Database-backed Asynchronous Task Queue & Event Bus** | Decoupled background execution for ingestion, evaluations, and pattern detection with retry & idempotency. | `REQ-004`, `REQ-019`, `REQ-021`, `REQ-022`, `REQ-068`, `REQ-073` |
| **AI Observability & Telemetry** | **In-App Telemetry Logger + Database Audit Store** | Tracks latency, token consumption, financial cost estimates, retrieval quality, and error diagnostics. | `REQ-075`, `REQ-076`, `REQ-077`, `REQ-078`, `REQ-086` |
| **Deployment** | **Docker Multi-Stage Container / Cloud Ready** | Single-container deployment bundling Express backend serving static React Vite frontend. | `REQ-008`, `REQ-092` |

---

## 2. Frontend Architecture

### 2.1 Architectural Pattern
The frontend is built with **React.js (Vite)** using plain JSX (`.jsx`) and a modular component structure:
- **Application Shell:** `App.jsx` with `BrowserRouter`, global `AuthProvider`, and top-level toast/notification manager.
- **Route Views (`src/pages/`):** View-level components mapping to specific URLs.
- **Context State (`src/context/`):** React Context for global Auth state (`AuthContext.jsx`) and Active Workspace state (`ProjectContext.jsx`).
- **Custom Hooks (`src/hooks/`):**
  - `useAuth`: Login, register, logout, profile state.
  - `useTutorStream`: Manages SSE / streaming token generation, message history, and citation resolution.
  - `useDocumentPoll`: Live polling for material status updates (`QUEUED` → `PROCESSING` → `READY` / `FAILED`).
  - `useQuizRunner`: Step-by-step adaptive quiz state machine.
- **Component UI Kit (`src/components/`):** Reusable atomic and composite JSX components.

### 2.2 Layout & Navigation Tree
```
App (Router, AuthProvider)
│
├── Public Routes (Unauthenticated)
│   ├── /login (LoginPage.jsx)
│   └── /register (RegisterPage.jsx)
│
└── Protected App Layout (AppLayout.jsx — Sidebar, Header, Breadcrumbs)
    ├── / (UserHomePage.jsx — "Where was I, how am I doing, what should I do next?")
    ├── /spaces (SpacesListPage.jsx)
    ├── /spaces/:spaceId (SpaceDashboardPage.jsx)
    │
    ├── /spaces/:spaceId/projects/:projectId (ProjectLayout.jsx with Workspace Tabs)
    │   ├── / (ProjectDashboardPage.jsx)
    │   ├── /materials (MaterialsHubPage.jsx)
    │   ├── /tutor (TutorChatPage.jsx)
    │   ├── /quiz (AdaptiveQuizPage.jsx)
    │   ├── /growth (GrowthAnalysisPage.jsx)
    │   └── /analytics (ProjectAnalyticsPage.jsx)
    │
    ├── /analytics (GlobalAnalyticsPage.jsx)
    │
    └── /admin (AdminLayout.jsx — Admin role required)
        ├── / (AdminOverviewPage.jsx)
        ├── /users (AdminUsersPage.jsx)
        ├── /users/:userId (AdminUserInspectionPage.jsx)
        ├── /activity (AdminActivityAuditPage.jsx)
        ├── /ai (AdminAIObservabilityPage.jsx)
        └── /jobs (AdminJobsPage.jsx)
```
*Supports: `REQ-011`, `REQ-012`, `REQ-014`, `REQ-015`, `REQ-082`, `REQ-083`.*

---

## 3. Backend Architecture

### 3.1 Layered Modular Architecture
```
HTTP Client (React Frontend / API Consumer)
        │
        ▼
[Express.js Server & Middleware] (CORS, JSON Parser, Auth Guard, Rate Limiting, Error Handler)
        │
        ▼
[API Route Controllers] (`server/routes/*.js`)
        │
        ▼
[Domain Services Layer] (`server/services/*.js`)
   ├── AuthService               (Registration, Login, JWT, User Management)
   ├── SpaceService              (Space CRUD, Project Aggregations)
   ├── ProjectService            (Project CRUD, Goals, State Summary)
   ├── IngestionService          (PDF Parser, OCR, Chunking, Embeddings Pipeline)
   ├── TutorService              (3-Part Context Assembly, Citations, Hallucination Prevention)
   ├── AssessmentService         (Adaptive Question Selection, MCQ & Open-Ended Evaluation)
   ├── MasteryService            (Dynamic Multi-Source Mastery Updates, Decay Modeling)
   ├── GrowthService             (Trend Classification: Improving / Stable / Attention)
   ├── RecommendationService     (7-Signal "What should I do next?" Engine)
   ├── LearningContextService    (Persistent Profiles, Strengths, Weaknesses, Mistakes)
   ├── EventService              (Learning Event Bus & Idempotent Handlers)
   ├── TelemetryService          (Token Counts, Costs, Latency Breakdown, Logging)
   ├── EvaluationService         (Automated AI Quality Benchmarks & Regression Detection)
   └── AdminService              (Platform Analytics, User Inspection, Job Monitoring)
        │
        ▼
[Data Access & ORM] (Prisma ORM Client & Vector Engine)
        │
        ▼
SQLite / PostgreSQL Database & Uploaded File Storage
```
*Supports: `REQ-003`, `REQ-005`, `REQ-037`, `REQ-038`, `REQ-041`, `REQ-074`.*

---

## 4. Database Architecture

### 4.1 Relational Entity-Relationship Model
The schema captures the full 19-entity domain:
1. `User` (id, email, passwordHash, name, role: LEARNER | ADMIN, timestamps)
2. `Space` (id, userId, name, description, visualConfig, timestamps)
3. `Project` (id, spaceId, userId, name, description, learningGoal, timestamps)
4. `LearningMaterial` (id, projectId, userId, filename, fileUrl, fileSizeBytes, pageCount, status: QUEUED | PROCESSING | READY | FAILED, errorMessage, timestamps)
5. `DocumentChunk` (id, materialId, projectId, userId, chunkIndex, startPage, endPage, content, tokenCount, embedding, metadata, timestamps)
6. `Concept` (id, projectId, userId, name, definition, sourceMaterialId, sourcePage, importanceScore, timestamps)
7. `ConceptMastery` (id, conceptId, projectId, userId, masteryScore: 0-100, confidenceScore, trend: IMPROVING | STABLE | REQUIRING_ATTENTION, lastAssessedAt, timestamps)
8. `MasteryHistoryLog` (id, masteryId, conceptId, projectId, userId, previousScore, newScore, sourceType, timestamps)
9. `TutorSession` (id, projectId, userId, title, summary, timestamps)
10. `TutorMessage` (id, sessionId, projectId, userId, sender: USER | ASSISTANT, content, mode, citations, metadata, timestamps)
11. `Quiz` (id, projectId, userId, title, status: IN_PROGRESS | COMPLETED, score, totalQuestions, timestamps)
12. `QuizQuestion` (id, quizId, conceptId, questionType: MCQ | OPEN_ENDED, prompt, options, correctAnswer, explanation, difficultyScore, sortOrder)
13. `QuizSubmission` (id, quizId, questionId, userId, userAnswer, isCorrect, scoreEarned, evalFeedback, answeredAt)
14. `PersistentLearnerContext` (id, projectId, userId, goals, preferences, strengths, weaknesses, repeatedMistakes, summary, updatedAt)
15. `Recommendation` (id, projectId, userId, conceptId, title, message, actionType, actionTargetId, status: ACTIVE | COMPLETED | DISMISSED, timestamps)
16. `LearningEvent` (id, userId, projectId, eventType, payload, timestamp)
17. `AITelemetryLog` (id, userId, projectId, featureName, modelName, promptTokens, completionTokens, totalTokens, latencyMs, estimatedCostUsd, status, errorMessage, timestamps)
18. `AIEvaluationRecord` (id, featureName, metricName, score, details, evaluatedAt)
19. `BackgroundJob` (id, queueName, jobType, payload, status: QUEUED | RUNNING | COMPLETED | FAILED, attempts, maxRetries, errorMessage, timestamps)
*Supports: `REQ-003`, `REQ-026`, `REQ-027`, `REQ-050`, `REQ-059`, `REQ-063`, `REQ-075`.*

---

## 5. Authentication Architecture

- **Token Protocol:** JSON Web Tokens (JWT) signed with HMAC-SHA256 (`JWT_SECRET`).
- **Transport Mechanisms:**
  - `Authorization: Bearer <token>` HTTP header (for SPA API calls).
  - `auth_token` HTTP-only, Secure, SameSite=Strict cookie.
- **Token Payload:**
  ```json
  {
    "userId": "usr_ck89234",
    "email": "learner@example.com",
    "role": "LEARNER",
    "exp": 1726588800
  }
  ```
- **Security:** Passwords hashed with `bcryptjs` (cost factor 12). Tokens expire in 7 days.
*Supports: `REQ-001`, `REQ-008`.*

---

## 6. Authorization & RBAC Architecture

- **`LEARNER` Role:** Full CRUD on user's own Spaces, Projects, Materials, Tutor sessions, and Quizzes. Strictly isolated from other users' records.
- **`ADMIN` Role:** Platform-level access to `/api/admin/*` endpoints, user inspection views, system health, AI cost telemetry, and job queue management.
- **Tenant Scoping Rule:** All queries strictly include `where: { userId: req.user.userId }` to prevent IDOR / horizontal privilege escalation.
*Supports: `REQ-002`, `REQ-003`, `REQ-004`, `REQ-083`.*

---

## 7. API Structure

### 7.1 Unified Response Contract
```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2026-09-17T18:00:00.000Z" }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address",
    "details": null
  },
  "meta": { "timestamp": "2026-09-17T18:00:00.000Z" }
}
```
*Supports: `REQ-005`, `REQ-089`.*

---

## 8. Folder Structure

```
aiprof/
├── package.json                 # Monorepo root scripts
├── .env.example                 # Environment variables specification
├── .env                         # Local runtime secrets
├── .gitignore                   # Ignored files
├── prisma/
│   ├── schema.prisma            # Relational database schema
│   └── seed.js                  # Database seed script
├── server/                      # Express.js Backend (Plain JavaScript)
│   ├── index.js                 # Server entry point
│   ├── lib/
│   │   ├── db.js                # Prisma singleton client
│   │   ├── auth.js              # JWT & bcrypt utilities
│   │   ├── response.js          # API envelope helpers
│   │   ├── errors.js            # Domain error hierarchy
│   │   ├── ai.js                # AI provider abstraction (Gemini / Mock)
│   │   ├── queue.js             # Async background job runner
│   │   └── pdf.js               # PDF extraction & chunking utility
│   ├── middleware/
│   │   ├── authenticate.js      # Auth & RBAC guards
│   │   └── errorHandler.js      # Global error handler
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   ├── spaces.js            # Space CRUD
│   │   ├── projects.js          # Project CRUD
│   │   ├── materials.js         # PDF upload & chunk viewing
│   │   ├── tutor.js             # Chat & SSE streaming
│   │   ├── quiz.js              # Adaptive quiz & submissions
│   │   ├── mastery.js           # Concept mastery & growth
│   │   ├── recommendations.js   # "What should I do next?"
│   │   ├── analytics.js         # Project & Global analytics
│   │   └── admin.js             # Admin oversight & telemetry
│   └── services/
│       ├── auth.service.js
│       ├── ingestion.service.js
│       ├── tutor.service.js
│       ├── assessment.service.js
│       ├── mastery.service.js
│       ├── recommendation.service.js
│       ├── event.service.js
│       └── telemetry.service.js
├── client/                      # React.js Frontend (Vite + JSX)
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx             # React DOM entry point
│       ├── App.jsx              # Router & Providers
│       ├── context/
│       │   └── AuthContext.jsx  # Auth state manager
│       ├── components/
│       │   ├── layout/          # Sidebar, Header, Breadcrumbs, TabNav
│       │   ├── tutor/           # ChatView, MessageBubble, CitationDrawer
│       │   ├── quiz/            # QuestionRunner, MCQOption, FeedbackCard
│       │   ├── materials/       # Dropzone, StatusBadge, ChunkModal
│       │   ├── mastery/         # MasteryBar, TrendMatrix
│       │   ├── recommendations/ # RecommendationCard
│       │   └── admin/           # TelemetryCard, UserTable, AuditLog
│       └── pages/
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           ├── UserHomePage.jsx
│           ├── SpacesListPage.jsx
│           ├── SpaceDashboardPage.jsx
│           ├── ProjectDashboardPage.jsx
│           ├── MaterialsHubPage.jsx
│           ├── TutorChatPage.jsx
│           ├── AdaptiveQuizPage.jsx
│           ├── GrowthAnalysisPage.jsx
│           ├── ProjectAnalyticsPage.jsx
│           ├── GlobalAnalyticsPage.jsx
│           └── admin/
│               ├── AdminOverviewPage.jsx
│               ├── AdminUsersPage.jsx
│               ├── AdminActivityPage.jsx
│               ├── AdminAIPage.jsx
│               └── AdminJobsPage.jsx
└── tests/                       # Automated test suites
    ├── backend/                 # Auth, isolation, API tests
    ├── ai/                      # Groundedness & hallucination benchmarks
    └── e2e/                     # End-to-end learning loop tests
```
*Supports: All 92 Requirements.*

---

## 9. Database Schemas (Prisma)

Refer to [`prisma/schema.prisma`](file:///home/raju/Desktop/Aiprof/prisma/schema.prisma) for the full entity model declarations with indexes, cascade rules, and field typings.

---

## 10. Frontend Routes

| Route | Component | Purpose | REQ Mapping |
|---|---|---|---|
| `/login` | `LoginPage.jsx` | User sign in | `REQ-001` |
| `/register` | `RegisterPage.jsx` | User sign up | `REQ-001` |
| `/` | `UserHomePage.jsx` | "Where was I, how am I doing, what should I do next?" | `REQ-082` |
| `/spaces` | `SpacesListPage.jsx` | Spaces overview and creation | `REQ-009`, `REQ-011` |
| `/spaces/:spaceId` | `SpaceDashboardPage.jsx` | Projects within space, aggregate progress | `REQ-012` |
| `/spaces/:spaceId/projects/:projectId` | `ProjectDashboardPage.jsx` | Project summary, concepts, latest activity, next step | `REQ-014` |
| `/spaces/:spaceId/projects/:projectId/materials` | `MaterialsHubPage.jsx` | PDF upload, processing status, chunk previews | `REQ-017`, `REQ-020`, `REQ-023` |
| `/spaces/:spaceId/projects/:projectId/tutor` | `TutorChatPage.jsx` | Grounded AI Tutor, streaming tokens, citations | `REQ-029`, `REQ-031`, `REQ-034`, `REQ-087` |
| `/spaces/:spaceId/projects/:projectId/quiz` | `AdaptiveQuizPage.jsx` | Adaptive MCQs & open-ended questions, feedback | `REQ-042`, `REQ-043`, `REQ-044`, `REQ-048` |
| `/spaces/:spaceId/projects/:projectId/growth` | `GrowthAnalysisPage.jsx` | Improving / Stable / Requiring Attention concept board | `REQ-053`, `REQ-054` |
| `/spaces/:spaceId/projects/:projectId/analytics` | `ProjectAnalyticsPage.jsx` | Activity timeline, mastery distribution, AI stats | `REQ-065` |
| `/analytics` | `GlobalAnalyticsPage.jsx` | Cross-Space aggregated learning analytics | `REQ-066` |
| `/admin` | `AdminOverviewPage.jsx` | Platform KPIs, active users, AI spend, system health | `REQ-083` |
| `/admin/users/:userId` | `AdminUserInspectionPage.jsx`| User journey deep-dive inspection | `REQ-084` |
| `/admin/activity` | `AdminActivityPage.jsx` | Filterable platform audit trail | `REQ-085` |
| `/admin/ai` | `AdminAIPage.jsx` | Token usage, cost attribution, latency diagnostics | `REQ-075`, `REQ-076`, `REQ-077` |
| `/admin/jobs` | `AdminJobsPage.jsx` | Background job queue monitor & retry controls | `REQ-073`, `REQ-086` |

---

## 11. Backend Routes

- `POST /api/auth/register` — Create user account (`REQ-001`, `REQ-005`)
- `POST /api/auth/login` — Authenticate & issue token (`REQ-001`)
- `GET /api/auth/me` — Current user profile (`REQ-001`, `REQ-002`)
- `GET /api/spaces` — List user's spaces (`REQ-003`, `REQ-011`)
- `POST /api/spaces` — Create space (`REQ-009`, `REQ-010`)
- `GET /api/spaces/:spaceId` — Space details (`REQ-012`)
- `GET /api/projects/space/:spaceId` — Projects in space (`REQ-013`)
- `POST /api/projects/space/:spaceId` — Create project (`REQ-013`, `REQ-016`)
- `GET /api/projects/:projectId` — Project summary state (`REQ-014`)
- `POST /api/materials/upload` — Multipart PDF upload (`REQ-017`, `REQ-019`)
- `GET /api/materials/:materialId` — Processing status (`REQ-020`)
- `POST /api/tutor/chat` — Send prompt & receive grounded answer with citations (`REQ-029`, `REQ-032`, `REQ-034`, `REQ-036`)
- `GET /api/tutor/chat/stream` — SSE streaming tutor response (`REQ-087`)
- `POST /api/quiz/generate` — Generate adaptive quiz (`REQ-042`, `REQ-045`)
- `POST /api/quiz/:quizId/submit` — Submit answers & evaluate (`REQ-043`, `REQ-044`, `REQ-047`, `REQ-049`)
- `GET /api/mastery/:projectId` — Concept mastery scores (`REQ-050`, `REQ-051`)
- `GET /api/mastery/:projectId/growth` — Trend categorization (`REQ-053`)
- `GET /api/recommendations/:projectId` — Active recommendations (`REQ-055`, `REQ-056`)
- `GET /api/analytics/project/:projectId` — Project analytics (`REQ-065`)
- `GET /api/analytics/global` — Global analytics (`REQ-066`)
- `GET /api/admin/overview` — Platform KPIs (`REQ-083`)
- `GET /api/admin/users/:userId` — User inspection (`REQ-084`)
- `GET /api/admin/activity` — Filterable audit log (`REQ-085`)
- `GET /api/admin/ai/usage` — AI telemetry logs (`REQ-075`, `REQ-076`)
- `GET /api/admin/jobs` — Background job queue (`REQ-073`, `REQ-086`)

---

## 12. Major Reusable Components

- `TutorChatView.jsx`: Full chat interface with markdown, code styling, mode buttons, citations, and source drawer.
- `CitationChip.jsx`: Clickable source tag (`[ML Notes - p.14]`).
- `CitationDrawer.jsx`: Slide-over panel displaying exact matched source excerpt and page preview.
- `FileDropzone.jsx`: Drag-and-drop PDF uploader with validation and progress state.
- `DocumentStatusBadge.jsx`: Color-coded animated badge (`Queued`, `Processing`, `Ready`, `Failed`).
- `QuizSessionRunner.jsx`: Interactive step-by-step adaptive question runner.
- `AssessmentFeedbackCard.jsx`: Qualitative explanation breakdown (understanding, missing concepts).
- `ConceptMasteryBar.jsx`: Progress bar for concept mastery percentage and confidence.
- `GrowthTrendMatrix.jsx`: 3-column board (Improving, Stable, Requiring Attention).
- `RecommendationCard.jsx`: Targeted action card with one-click direct action button.
- `ActivityFilterTable.jsx`: Filterable platform event table for admin audit.

---

## 13. State Management

- **Global Auth:** React `AuthContext` providing `user`, `login`, `register`, `logout`, and token management.
- **Server Cache & Polling:** Custom React hooks with automated interval polling for async tasks (document ingestion, quiz evaluation).
- **Local Screen State:** Standard React `useState` / `useReducer` for chat inputs, active quiz step, draft answers, modal toggles.

---

## 14. Validation Strategy

- Dual-layer schema validation using **Zod** (`server/lib/validation.js`).
- Client-side pre-validation for immediate UX feedback.
- Server-side request validation on every API endpoint before processing.
- AI Structured Output validation ensuring all model-generated JSON matches expected schemas.

---

## 15. Error Handling Strategy

- Centralized Express `errorHandler` middleware catching domain errors.
- Domain error classes (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `AIProviderError`, `IngestionError`).
- AI Fallback: Graceful uncertainty response when material evidence is insufficient ($< 0.65$ confidence threshold).

---

## 16. Security Architecture

- **Tenant Isolation:** Enforced on every database query using composite `{ id, userId }` filters.
- **Prompt Injection Defense:** Delimited XML tags (`<context>`, `<user_input>`) to prevent untrusted user inputs or documents from overriding system instructions.
- **File Upload Security:** Verification of PDF MIME types, magic numbers, 25MB file limit, isolated upload storage.
- **Secrets Protection:** All keys stored in `.env`, excluded via `.gitignore`.

---

## 17. Deployment Architecture

- Monorepo structure containerizable into a single Docker image:
  - Node.js environment running Express backend on port 5000.
  - Express serves compiled Vite React assets (`client/dist`) for all client routes.
  - SQLite embedded database or PostgreSQL connection via `DATABASE_URL`.

