# Changelog

All notable changes to OrgFlow AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

<!--
  ════════════════════════════════════════════════════════════════════
  DEVELOPMENT ROUNDS — PROJECT HISTORY
  CS 628 · Team 3 · OrgFlow AI · Harrisburg University

  Round 1  (commit a5b97f7) ─ Monorepo Bootstrap
    • Initialised npm workspaces: apps/api, apps/web, packages/shared-types,
      packages/ui, packages/shared-config.
    • Strict TypeScript across all packages (15 compiler flags including
      strictNullChecks, noImplicitAny, exactOptionalPropertyTypes).
    • ESLint flat-config with 7 no-unsafe rules enforcing zero-any policy.
    • Shared enum/DTO contracts in packages/shared-types (roles, task status,
      announcement targets, AI types, API response wrapper).
    • commitlint + conventional-commit enforcement via husky + lint-staged.

  Round 2  (commit 054a28d) ─ Platform Layer + UI Shell
    • Express 4 app bootstrap: Helmet, CORS allow-list, rate limiter, JSON
      body limit, URL-encoded parser, correlation-ID middleware.
    • Logger (pino), env-config (Zod-validated), DB connection (Mongoose 8),
      AppError class hierarchy with 8 factory methods.
    • Zod validation middleware and error-normalisation middleware.
    • React 18 + Vite 5 shell: ThemeProvider (dark mode), QueryClient,
      AuthGuard, RoleGuard, lazy-loaded router skeleton.
    • Shared UI primitives in packages/ui: Button, Card, Badge, Input,
      Modal, Spinner, Avatar, Table.

  Round 3  (commit dd8149c) ─ Auth Agent
    • Backend: POST /auth/login (bcrypt verify → JWT sign), GET /auth/me,
      POST /auth/invite (admin-only), POST /auth/complete-invite.
    • auth.middleware.ts — Bearer token extraction + Zod payload validation.
    • requireRole(minRole) factory for role-guard middleware.
    • Frontend: LoginPage, ActivatePage, useAuth hook, authStore (Zustand),
      cross-tab sync via BroadcastChannel.

  Round 4  (commits 2dd364a → ebfd4da → 55db95f → 0eacf83) ─ Core Features
    • Org agent — Users & Teams backend: CRUD with RBAC + org scope,
      admin invite flow, user-status management.
    • Org agent — Users & Teams frontend: admin user table with invite/edit
      modals, team management page.
    • Projects agent — backend + frontend: project CRUD, member assignment,
      project-detail page with team-scoped access.
    • Tasks agent — backend: task CRUD, comments sub-resource, overdue
      detection, role-scoped mutation guards, 5 compound indexes.
    • Tasks agent — frontend: task list with filters, task-detail modal
      with inline comments, status badge, priority chips.

  Round 5  (commits 4a9f2bb → 80ee174 → 9fc8816) ─ Secondary Features
    • Dashboard agent: role-aware stats (admin sees org-wide, leader sees
      team, member sees own tasks); N+1 fixed with $group aggregation.
    • Notes agent: announcement CRUD with org/team/user targeting,
      read-state tracking, unread-count badge in sidebar.
    • UI polish + a11y: skip-link, ARIA landmarks, focus-visible rings,
      modal focus-trap, keyboard navigation throughout.

  Round 6  (commit c2aebca) ─ Kanban Board
    • dnd-kit drag-and-drop Kanban with column-per-status layout.
    • Optimistic status updates: local state updates immediately; backend
      PATCH fires in background with rollback on error.
    • react-hot-toast notifications on all 22 mutations.

  Round 7  (commits 75b0178 → f67d0ce) ─ RAG Ingestion + Retrieval
    • rag-ingest-agent: multipart upload → MIME-byte validation → text
      extraction → sliding-window chunker (T=800, overlap=100) → batch
      embeddings via Ollama nomic-embed-text (768-dim) with deterministic
      fallback for offline testing → DocumentChunk persistence.
    • Permission-aware retrieval: buildScopeFilter injects org/team/project
      $match before $vectorSearch aggregation stage.
    • Exact cosine-similarity fallback for environments without Atlas index.
    • Upload rate limit: 10 requests/min on /ai/documents.

  Round 8  (commits 7fcb67f → d9eccab) ─ RAG Chat
    • rag-chat-agent: /ai/chat endpoint — query embed → HNSW kNN retrieval
      → grounded prompt assembly (<<<context>>> delimiters) → Ollama
      gemma3 generation → citation extraction → chat-log persistence.
    • Cursor-based pagination on chat history.
    • Chat UI: conversation thread, citation pills, Ollama health indicator,
      source-panel expandable per message.

  Round 9  (commits 8594b41 → cf7f13a → 7481ec6) ─ Testing
    • Unit tests: sliding-window chunker, cosine-similarity, AppError
      factory, organization service, pagination utility.
    • Integration tests: auth login/me full HTTP flow (in-memory MongoDB +
      supertest), RBAC boundary checks, chat-history scope isolation,
      retrieval RBAC, full CRUD smoke test, document-upload pipeline.
    • Component tests: Button render/click/disabled, 7 page smoke tests,
      8 hook tests (useAuth, useTasks, useProjects, useTeams, useUsers,
      useAnnouncements, useDebouncedValue, useCrossTabAuthSync).
    • Coverage thresholds enforced at 80% (stmt/branch/fn/line) in both
      apps/api and apps/web vitest configs.

  Round 10 (commits 10fc817 → 46006ff → e480dc7) ─ CI, Docs & Hardening
    • GitHub Actions workflow: typecheck → lint → test → build pipeline with
      concurrency groups to cancel stale PR runs.
    • README with setup instructions, architecture overview, env-var table,
      and script reference.
    • Seed script: creates demo organisation, admin/leader/member users,
      sample project, and tasks for immediate local exploration.
    • OpenAPI/Swagger docs at /api-docs covering all 38 endpoints.
    • Dependabot config for npm and GitHub Actions.
    • Fix: removed rootDir from sub-tsconfigs (apps/api/test,
      apps/api/scripts, apps/web/test) to resolve tsc project-reference
      path-resolution errors.
  ════════════════════════════════════════════════════════════════════
-->

## [Unreleased]

### Added

#### Infrastructure & DX

- Graceful shutdown with SIGTERM/SIGINT handlers in server.ts
- Git hooks with husky, lint-staged, and commitlint (conventional commits)
- `.env.example` files for both API and Web apps
- Root-level `clean` script to remove all build artifacts
- OpenAPI/Swagger documentation at `/api-docs` (38 endpoints annotated)
- Module README files for all 9 backend modules
- Architecture docs: `docs/architecture.md`, `docs/api-overview.md`, `docs/rbac.md`, `docs/development.md`
- Dependabot configuration for npm and GitHub Actions
- ESLint react-hooks plugin for frontend linting
- CI concurrency groups to cancel stale PR runs

#### Backend

- `commentCount` field on `TaskResponseDto`
- Vector index validation at DB connection startup
- Upload rate limit (10 req/min) on `/ai/documents`
- JSON `SyntaxError` handler returning `INVALID_JSON` error code
- Pagination on all 6 list endpoints (users, teams, projects, tasks, announcements, documents)
- Dashboard N+1 query fix — replaced N×3 `countDocuments` with `$group` aggregations
- Cursor-based pagination for AI chat history
- Comprehensive audit logging on all mutation operations (14 new action types)
- Improved Ollama error logging with structured context
- Unread announcement count endpoint (`GET /announcements/unread-count`)
- Ollama health check endpoint (`GET /ai/chat/health`)
- Organization service tests and pagination utility tests
- Integration smoke test covering full CRUD lifecycle

#### Frontend

- `react-hot-toast` notifications on all 22 mutations
- Unread announcement count badge in sidebar navigation
- Ollama connection status indicator on AI Assistant page
- Code splitting with `React.lazy()` for all 10 page routes
- Optimistic updates on Kanban task status changes
- Search debouncing with `useDebouncedValue` hook (300ms)
- Request cancellation via `AbortController` signal on all queries
- Cross-tab auth synchronization via `storage` events
- 11 modal components extracted from 5 large page files
- Shared `QueryErrorBanner` and `PageSkeleton` components
- Centralized `QUERY_KEYS` constants for all React Query keys
- Mobile responsive hamburger menu with slide-out drawer
- `gcTime` configured on `QueryClient` (10 minutes)

#### Testing

- 7 new frontend page tests (LoginPage, ActivatePage, TasksPage, ProjectsPage, TeamsPage, UsersPage, KnowledgePage)
- 8 new frontend hook tests (useDebouncedValue, useCrossTabAuthSync, useAuth, useTasks, useProjects, useTeams, useUsers, useAnnouncements)
- Coverage thresholds set at 80% (statements, branches, functions, lines)
- Backend gap tests: organization service, pagination utility
- Full lifecycle integration smoke test

### Fixed

- Vector index type guard in `db.ts` preventing startup crash
- `INVALID_JSON` added to `API_ERROR_CODES` shared type
- Dashboard aggregation query performance (was O(N×teams), now O(1))

### Removed

- Dead code: unused `ids.ts` utilities (`isObjectId`, `toObjectId`, `assertObjectId`)
- Dead code: unused `date.ts` (`isOverdue` — duplicated in task.service.ts)
- Dead code: unused `errors.ts` frontend helper (`getClientErrorMessage`)
