# OrgFlow AI — Unified PRD + SDD + System Architecture + AI-Agent Execution Blueprint

**Document Type:** Single-source master specification (PRD + SDD + Architecture + Implementation Playbook)  
**Project:** OrgFlow AI  
**Stack:** MERN + TypeScript + Local AI (Ollama) + RAG + MongoDB Vector Search  
**Status:** Approved baseline specification  
**Version:** 1.0.0  
**Owner:** Student Team (3 members)  
**Primary Goal:** Build a professional, clean, low-bug, role-based enterprise collaboration platform with a local AI assistant using RAG.

---

## 0. How to Use This File with a VS Code AI Agent

This file is intentionally written as a **machine-executable build specification** for an AI coding agent running inside VS Code (for example, Copilot agent mode, Roo Code, Cline, Continue, or any equivalent tool that can read repository files, write code, execute terminal commands, and open/edit multiple files).

### 0.1 Agent Runtime Instructions

The AI agent **must** treat this document as the highest-priority repository specification for implementation.

### 0.2 Required Agent Capabilities

The AI agent must be granted permission to:

1. Read and write files in the workspace.
2. Execute terminal commands.
3. Create folders and initialize packages.
4. Run local development servers.
5. Install dependencies.
6. Run linting, formatting, tests, and type-checking.
7. Use Git locally for branch creation and commits.
8. Parallelize work using **14 logical subagents** defined in this document if the agent platform supports parallel task delegation.

### 0.3 Agent Mission Statement

The AI agent must:

- create a **clean monorepo**,
- enforce **strict TypeScript**,
- allow **zero implicit any**,
- reject **explicit any**,
- prevent naming collisions,
- minimize merge conflicts through path ownership,
- implement the system in staged milestones,
- keep architecture clean and scalable,
- prefer correctness over speed,
- prefer small verified changes over large risky changes,
- never create duplicate utilities,
- never silently change interfaces without updating callers,
- never bypass lint/type/test failures.

### 0.4 Stage-Gate Rule

The AI agent must follow this strict stage order:

1. **Repository bootstrap**
2. **Tooling & guardrails**
3. **Shared types/contracts**
4. **Backend foundation**
5. **Frontend foundation**
6. **Authentication & RBAC**
7. **Teams/users/projects/tasks**
8. **Dashboard, announcements, search/filter, overdue, dark mode**
9. **Kanban drag & drop**
10. **AI document ingestion & vector search**
11. **AI chat runtime**
12. **Testing & hardening**
13. **CI quality gates**
14. **Final cleanup & documentation**

The next stage may begin only when the previous stage passes **type-check + lint + tests for touched scope**.

---

# 1. Executive Summary

OrgFlow AI is a role-based enterprise collaboration platform for managing teams, users, projects, tasks, announcements, dashboards, and an internal AI assistant powered by Retrieval-Augmented Generation (RAG). It is designed for a company-like environment but scoped to a university team project.

The product will be built as a **TypeScript-first MERN application** with:

- **React + Vite + React Router** for the frontend,
- **Node.js + Express** for the API,
- **MongoDB** for transactional data,
- **MongoDB Vector Search** for semantic retrieval,
- **Ollama** for local LLM execution,
- a **permission-aware RAG pipeline** so users only retrieve documents they are authorized to see.

The platform supports three core roles:

- **Admin**
- **Team Leader**
- **Team Member**

Each role sees only the permitted data scope:

- Members: own tasks + authorized team/project data.
- Leaders: team-wide operational data.
- Admins: organization-wide operational data, notes, monitoring, and knowledge administration.

---

# 2. Product Requirements Document (PRD)

## 2.1 Product Vision

Build a professional web application that demonstrates mastery of:

- component-based UI design,
- client-side routing,
- frontend/backend networking,
- MongoDB CRUD,
- authentication and authorization,
- modern dashboard UX,
- local AI + RAG integration.

## 2.2 Product Positioning

This is **not** a basic to-do app.

This is a **mini enterprise workflow and knowledge platform** with:

- role-based access,
- scoped visibility,
- task/project operations,
- deadline awareness,
- AI assistant grounded in internal documents.

## 2.3 Business Problem

Teams often fail because:

- work is not clearly assigned,
- deadlines are missed,
- leaders cannot track progress,
- employees cannot find the right information,
- teams cannot communicate through one structured system,
- knowledge is scattered across files and messages.

## 2.4 Product Goals

1. Manage teams, users, and permissions cleanly.
2. Manage projects and tasks with strong UX.
3. Give admins and leaders a live operational dashboard.
4. Provide company/team/project notes and announcements.
5. Support search, filter, overdue highlighting, and drag-and-drop Kanban.
6. Integrate a **local AI assistant** with permission-aware RAG.
7. Maintain a clean codebase with strict typing and low defect rate.

## 2.5 Non-Goals

The first release will **not** include:

- payroll,
- full HR workflows,
- external customer portals,
- real-time collaborative editing,
- email delivery infrastructure,
- mobile native apps,
- distributed microservices,
- fine-tuning of LLM weights.

RAG is required. Full model fine-tuning is not required.

## 2.6 User Roles

### Admin

Can manage:

- all teams,
- all users,
- all projects,
- all tasks,
- company-wide notes/announcements,
- AI knowledge base,
- organization dashboard.

### Team Leader

Can manage:

- their own team,
- team projects,
- team tasks,
- task assignments,
- team-level notes,
- team dashboard,
- AI usage within team scope.

### Team Member

Can access:

- own dashboard,
- own tasks,
- assigned project data,
- team data if permitted,
- AI answers only from their allowed scope.

## 2.7 Core User Stories

### Authentication & Access

- As a user, I want to sign in securely so that I can access my workspace.
- As an admin, I want to invite users and assign roles so that I control access.
- As a member, I want to see only permitted information so that sensitive data is protected.

### Team & User Management

- As an admin, I want to create teams and assign leaders so that departments are organized.
- As an admin, I want to move users between teams so that structure can change safely.

### Project Management

- As a leader, I want to create projects for my team so that work can be tracked.
- As a member, I want to view only the projects relevant to me so that the UI stays focused.

### Task Management

- As a leader, I want to create tasks and assign them to members.
- As a member, I want to update task status and comment on tasks.
- As a user, I want overdue tasks highlighted so that deadlines are visible.

### Dashboard

- As an admin, I want high-level statistics across teams.
- As a leader, I want team-specific productivity indicators.
- As a member, I want a personal dashboard of my work.

### AI Assistant

- As a user, I want an internal chatbot that answers using company/team/project docs.
- As a user, I must never retrieve documents outside my permissions.
- As an admin, I want to upload and index documents for the assistant.

## 2.8 Functional Requirements

### FR-001 Authentication

- Email + password sign-in.
- Password hashing.
- JWT-based session handling.
- Protected routes on frontend and backend.

### FR-002 User Invitations

- Admin can create invited/pending users.
- User completes first-time setup or receives an assigned password flow.

### FR-003 Role-Based Access Control (RBAC)

- Roles: `admin`, `leader`, `member`.
- Every request must be validated by token + role + scope.

### FR-004 Data Scope Enforcement

- All organization data must be partitioned by `organizationId`.
- Team-scoped data must be partitioned by `teamId`.
- Project-scoped data must be filterable by project membership.

### FR-005 Team Management

- Create/update/delete teams.
- Assign/remove leader.
- View team members.

### FR-006 User Management

- Create/update/deactivate users.
- Assign role.
- Assign team.
- View profile.

### FR-007 Project Management

- Create/read/update/delete projects.
- Add/remove project members.
- Filter by team/status.

### FR-008 Task Management

- Create/read/update/delete tasks.
- Assign task to user.
- Set status, priority, due date.
- Add task comments.

### FR-009 Kanban Board

- Show tasks grouped by status.
- Support drag & drop between columns.
- Persist status updates through API.

### FR-010 Search & Filter

- Search projects by title.
- Filter tasks by status, priority, assignee, overdue flag, team, project.

### FR-011 Overdue Alerts

- Tasks past due date and not done must be marked overdue.
- Overdue tasks must be visually highlighted.
- Dashboard must show overdue counts.

### FR-012 Dashboard

- Admin dashboard: global stats.
- Leader dashboard: team stats.
- Member dashboard: personal work stats.

### FR-013 Announcements / Notes

- Admin can target notes to company/team/user.
- Leaders can target notes to team.
- Users can mark notes as read.

### FR-014 Dark Mode

- System supports light/dark theme.
- Theme persisted in user preference or local storage.

### FR-015 AI Chatbot (RAG)

- Upload internal docs.
- Chunk and embed documents.
- Store chunks + metadata + vectors.
- Retrieve semantically relevant chunks at query time.
- Generate grounded answers using local model.
- Return citations/sources.
- Apply permission filters during retrieval.

### FR-016 Auditability

- Log chat requests and sources used.
- Log critical admin operations.

## 2.9 Non-Functional Requirements

### NFR-001 Type Safety

- Entire codebase must be TypeScript.
- `strict: true` is mandatory.
- `noImplicitAny: true` is mandatory.
- Explicit `any` is forbidden by ESLint.

### NFR-002 Reliability

- Errors must be surfaced with structured error responses.
- UI must provide meaningful error states and loading states.

### NFR-003 Maintainability

- Domain-driven folder structure.
- Shared types package.
- No duplicated utilities.
- Clear ownership per domain.

### NFR-004 Security

- JWT validation.
- Password hashing with bcrypt.
- Helmet.
- CORS restriction.
- Input validation with Zod.
- Permission-aware backend enforcement.

### NFR-005 Performance

- Paginate list endpoints.
- Use indexes on common filters.
- Cache only when safe.
- Keep RAG top-k retrieval bounded.

### NFR-006 Observability

- Central request logging.
- Error logging.
- Chat interaction logging.
- Healthcheck endpoint.

### NFR-007 Testability

- Unit tests for utilities/services.
- Integration tests for API.
- Component tests for critical frontend pieces.

### NFR-008 Accessibility

- Semantic HTML.
- Keyboard usable navigation.
- Focus-visible states.
- Color contrast for light/dark themes.

### NFR-009 Consistency

- Strict naming conventions.
- Shared DTOs and schemas.
- Single source of truth for enums and constants.

## 2.10 Success Metrics

The product is considered successful if:

1. All required features work end-to-end.
2. A user only sees allowed data.
3. Type-check passes with zero errors.
4. Lint passes with zero errors.
5. Core tests pass.
6. Demo scenario completes without manual fixes.
7. AI assistant returns source-grounded answers for uploaded docs.

## 2.11 Acceptance Criteria (High Level)

- Users can log in and access role-specific pages.
- Admin can create teams, users, and announcements.
- Leader can manage projects/tasks within team scope.
- Member sees only own/authorized work.
- Search/filter works correctly.
- Overdue tasks are highlighted.
- Kanban drag/drop updates task status.
- AI assistant answers based on indexed docs and obeys permissions.

---

# 3. Software Design Document (SDD)

## 3.1 Architecture Style

Use a **modular monorepo** with a **layered architecture** and **domain-based boundaries**.

### Guiding Principles

1. **Type-safe everywhere**
2. **Single responsibility per module**
3. **Domain ownership**
4. **Thin controllers, rich services**
5. **Validation at boundaries**
6. **No hidden global state**
7. **Backend enforces permissions; frontend only reflects them**
8. **AI retrieval is permission-aware**

## 3.2 Monorepo Layout

```text
orgflow-ai/
  apps/
    api/
    web/
  packages/
    shared-types/
    shared-config/
    ui/
  docs/
    MASTER_SPEC.md
  .github/
    workflows/
  .vscode/
  package.json
  tsconfig.base.json
  eslint.config.mjs
  .editorconfig
  .gitignore
  .prettierrc.json
```

## 3.3 Folder Structure — Backend

```text
apps/api/
  src/
    app/
      server.ts
      app.ts
      env.ts
    config/
      db.ts
      logger.ts
      cors.ts
    constants/
      roles.ts
      task-status.ts
      task-priority.ts
      note-target.ts
    middleware/
      auth.middleware.ts
      role.middleware.ts
      scope.middleware.ts
      error.middleware.ts
      validate.middleware.ts
    modules/
      auth/
        auth.controller.ts
        auth.service.ts
        auth.routes.ts
        auth.schema.ts
      users/
        user.model.ts
        users.controller.ts
        users.service.ts
        users.routes.ts
        users.schema.ts
      teams/
        team.model.ts
        teams.controller.ts
        teams.service.ts
        teams.routes.ts
        teams.schema.ts
      projects/
        project.model.ts
        projects.controller.ts
        projects.service.ts
        projects.routes.ts
        projects.schema.ts
      tasks/
        task.model.ts
        comment.model.ts
        tasks.controller.ts
        tasks.service.ts
        tasks.routes.ts
        tasks.schema.ts
      dashboard/
        dashboard.controller.ts
        dashboard.service.ts
        dashboard.routes.ts
      announcements/
        announcement.model.ts
        announcements.controller.ts
        announcements.service.ts
        announcements.routes.ts
        announcements.schema.ts
      ai/
        documents/
          document.model.ts
          document-chunk.model.ts
          ingestion.service.ts
          parser.service.ts
          chunking.service.ts
          embedding.service.ts
          vector-index.service.ts
        chat/
          chat.controller.ts
          chat.service.ts
          retrieval.service.ts
          prompt.service.ts
          citation.service.ts
          chat-log.model.ts
          ai.routes.ts
          ai.schema.ts
    utils/
      async-handler.ts
      date.ts
      ids.ts
      pagination.ts
      errors.ts
    tests/
```

## 3.4 Folder Structure — Frontend

```text
apps/web/
  src/
    app/
      router.tsx
      providers.tsx
      store/
    assets/
    components/
      layout/
      shared/
      feedback/
    features/
      auth/
      users/
      teams/
      projects/
      tasks/
      dashboard/
      announcements/
      ai/
      settings/
      theme/
    hooks/
    lib/
      api-client.ts
      query-client.ts
      auth-storage.ts
      utils.ts
    pages/
      auth/
      admin/
      leader/
      member/
      common/
    styles/
    types/
    tests/
    main.tsx
```

## 3.5 Layering Rules

### Backend Layer Rules

- **Routes**: request mapping only.
- **Controllers**: request/response adaptation only.
- **Services**: business logic.
- **Models**: persistence schema only.
- **Middleware**: cross-cutting concerns only.
- **Utils**: stateless helpers only.

Controllers must never contain complex domain logic.

### Frontend Layer Rules

- **Pages** compose feature-level containers.
- **Features** own domain components, hooks, and service wrappers.
- **Shared components** must be generic and UI-only.
- **API access** goes through a single typed client.
- **Role guards** live in routing/auth layer, not random page components.

## 3.6 Domain Model

### Organization

- id
- name
- createdAt
- updatedAt

### Team

- id
- organizationId
- name
- description
- leaderId | null
- createdAt
- updatedAt

### User

- id
- organizationId
- teamId | null
- role (`admin` | `leader` | `member`)
- status (`pending` | `active` | `disabled`)
- name
- email
- passwordHash
- avatarUrl | null
- themePreference (`light` | `dark` | `system`)
- createdAt
- updatedAt

### Project

- id
- organizationId
- teamId
- title
- description
- createdBy
- memberIds[]
- status (`planned` | `active` | `completed` | `archived`)
- startDate | null
- dueDate | null
- createdAt
- updatedAt

### Task

- id
- organizationId
- teamId
- projectId
- title
- description
- assignedTo
- createdBy
- status (`todo` | `in-progress` | `done`)
- priority (`low` | `medium` | `high`)
- dueDate | null
- overdue (derived or materialized)
- createdAt
- updatedAt

### TaskComment

- id
- taskId
- userId
- body
- createdAt
- updatedAt

### Announcement

- id
- organizationId
- createdBy
- targetType (`organization` | `team` | `user`)
- targetId
- title
- body
- createdAt
- updatedAt

### Document

- id
- organizationId
- teamId | null
- projectId | null
- visibility (`organization` | `team` | `project`)
- title
- originalFilename
- mimeType
- uploadedBy
- storagePath
- status (`uploaded` | `parsed` | `indexed` | `failed`)
- createdAt
- updatedAt

### DocumentChunk

- id
- documentId
- organizationId
- teamId | null
- projectId | null
- visibility
- allowedRoles[]
- chunkIndex
- text
- embedding[]
- metadata
- createdAt

### ChatLog

- id
- organizationId
- userId
- teamId | null
- question
- answer
- sources[]
- durationMs
- createdAt

## 3.7 RBAC and Scope Model

### Access Matrix

#### Admin

- Full CRUD across teams/users/projects/tasks/announcements/documents.
- Can query organization-wide dashboards.
- Can upload organization/team/project docs.

#### Leader

- CRUD for team-owned projects/tasks.
- Read team members.
- Can assign tasks within team scope.
- Can read team-level dashboards.
- Can upload docs for team/project scope if allowed.

#### Member

- Read own profile.
- Read assigned/authorized projects/tasks.
- Update own task status if policy allows.
- Add comments.
- Query AI only within authorized scope.

## 3.8 Permission Enforcement Strategy

Permissions must be enforced in backend services using both role and scope.

### Required Scoping Fields

Every scoped resource must include:

- `organizationId`
- optionally `teamId`
- optionally `projectId`

### Query Filtering Rules

1. **Admin**: filter by organization only.
2. **Leader**: filter by organization + team.
3. **Member**: filter by organization + one or more of:
   - team membership,
   - project membership,
   - task assignee,
   - explicit target user.

### Critical Rule

Frontend route hiding is **not** security. Backend enforcement is mandatory.

## 3.9 API Design Standards

### API Versioning

Use prefix:

```text
/api/v1
```

### Response Shape

All responses must follow one of the following patterns.

#### Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

#### Error

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found"
  }
}
```

### HTTP Rules

- `200` OK for successful read/update.
- `201` Created for successful creation.
- `204` No Content for successful deletion without body.
- `400` Validation errors.
- `401` Unauthenticated.
- `403` Forbidden.
- `404` Not found.
- `409` Conflict.
- `500` Unexpected server error.

## 3.10 API Endpoint Inventory

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout` (optional stateless no-op)
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/invite` (admin)
- `POST /api/v1/auth/complete-invite`

### Users

- `GET /api/v1/users`
- `GET /api/v1/users/:userId`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:userId`
- `PATCH /api/v1/users/:userId/status`

### Teams

- `GET /api/v1/teams`
- `GET /api/v1/teams/:teamId`
- `POST /api/v1/teams`
- `PATCH /api/v1/teams/:teamId`
- `DELETE /api/v1/teams/:teamId`

### Projects

- `GET /api/v1/projects`
- `GET /api/v1/projects/:projectId`
- `POST /api/v1/projects`
- `PATCH /api/v1/projects/:projectId`
- `DELETE /api/v1/projects/:projectId`

### Tasks

- `GET /api/v1/tasks`
- `GET /api/v1/tasks/:taskId`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/:taskId`
- `PATCH /api/v1/tasks/:taskId/status`
- `DELETE /api/v1/tasks/:taskId`
- `GET /api/v1/tasks/:taskId/comments`
- `POST /api/v1/tasks/:taskId/comments`

### Dashboard

- `GET /api/v1/dashboard/admin`
- `GET /api/v1/dashboard/team`
- `GET /api/v1/dashboard/me`

### Announcements

- `GET /api/v1/announcements`
- `POST /api/v1/announcements`
- `PATCH /api/v1/announcements/:announcementId`
- `DELETE /api/v1/announcements/:announcementId`
- `POST /api/v1/announcements/:announcementId/read`

### AI / Documents

- `POST /api/v1/ai/documents/upload`
- `GET /api/v1/ai/documents`
- `POST /api/v1/ai/documents/:documentId/reindex`
- `DELETE /api/v1/ai/documents/:documentId`
- `POST /api/v1/ai/chat`
- `GET /api/v1/ai/chat/logs`

## 3.11 Frontend Routes

### Public

- `/login`
- `/activate-invite`

### Shared Protected

- `/app`
- `/app/settings`
- `/app/ai`

### Admin

- `/app/admin/dashboard`
- `/app/admin/teams`
- `/app/admin/users`
- `/app/admin/projects`
- `/app/admin/announcements`
- `/app/admin/knowledge`

### Leader

- `/app/leader/dashboard`
- `/app/leader/projects`
- `/app/leader/projects/:projectId`
- `/app/leader/tasks`
- `/app/leader/announcements`

### Member

- `/app/me/dashboard`
- `/app/me/tasks`
- `/app/me/projects`

## 3.12 UI/UX Specification

### Design Language

- Clean, modern enterprise aesthetic.
- Responsive layout.
- Sidebar + top navbar on protected area.
- Cards for metrics and records.
- Strong empty states, loading states, error states.

### Color System

- Primary: deep blue or indigo
- Success: green
- Warning: amber
- Danger: red
- Neutral: slate/gray

### Dark Mode

- Theme tokens rather than hard-coded colors.
- All major components must support dark mode from day one.

### Accessibility

- Every icon button must have aria-label.
- Form inputs require labels.
- Modals trap focus.
- Drag/drop interactions must still be possible via alternative controls if time permits.

## 3.13 Search and Filtering Design

Search/filter state must be serializable in URL query parameters where useful.

Examples:

- `/app/leader/tasks?status=todo&priority=high`
- `/app/admin/projects?search=marketing`

Benefits:

- shareable URLs,
- reload-safe filter state,
- predictable debugging.

## 3.14 Overdue Computation Design

A task is overdue when:

```text
status != done AND dueDate < currentDateTime
```

Implementation options:

- **Derived on read** (simpler, consistent)
- **Materialized field** updated by write operations or scheduled jobs (faster for large scale)

For this project, use **derived-on-read + projected flag** for simplicity and correctness.

## 3.15 Error Handling Design

### Backend

- Central error middleware.
- Custom app error class.
- Input validation errors normalized.
- Unknown errors sanitized before returning to client.

### Frontend

- Error boundary for route-level failures.
- API errors normalized in one place.
- Toast/snackbar for mutations.
- Empty state for zero data.
- Skeleton/spinner for loading.

## 3.16 State Management Strategy

Use lightweight predictable state.

Recommended:

- React Query or TanStack Query for server state.
- Context for auth/theme only.
- Local component state for transient UI.

Do **not** put everything in one giant context.

## 3.17 Logging & Observability

### Log Categories

- request logs,
- auth failures,
- permission denials,
- document ingestion status,
- AI chat requests and durations,
- unhandled errors.

### Health Endpoints

- `GET /health`
- `GET /ready`

## 3.18 Security Design

Mandatory:

- bcrypt password hashing
- JWT secret via environment variables
- Helmet
- CORS whitelist
- request body size limits
- multer file restrictions
- MIME allow-list for doc uploads
- validation with Zod
- never trust client role info without token verification

## 3.19 Performance Design

- Add DB indexes for common filters:
  - `organizationId`
  - `teamId`
  - `projectId`
  - `assignedTo`
  - `status`
  - `dueDate`
- Paginate list endpoints.
- Avoid loading full documents when only summaries are needed.
- Keep vector retrieval `topK` conservative (e.g. 4–8).
- Chunk size tuned for retrieval precision.

---

# 4. AI / RAG System Architecture

## 4.1 AI Feature Goal

Provide an internal assistant that answers questions using organization/team/project documents while respecting RBAC and scope.

## 4.2 Why RAG Instead of Fine-Tuning

RAG is preferred because:

- documents can be updated without retraining,
- university teams can implement it faster,
- answers stay grounded in uploaded files,
- sensitive data stays local when Ollama runs locally,
- it maps naturally to enterprise knowledge access.

## 4.3 AI Functional Scope

The assistant must support:

- document upload,
- parsing,
- chunking,
- embeddings,
- vector storage,
- retrieval with metadata filters,
- answer generation,
- source citation,
- chat logging.

## 4.4 Permission-Aware Retrieval

This is a critical requirement.

Retrieval must **not** search every chunk in the database.

Instead, it must apply filters based on:

- `organizationId`
- `visibility`
- `teamId`
- `projectId`
- `allowedRoles`

### Example

A marketing member asking about finance policy must not retrieve finance-only chunks.

## 4.5 AI Data Pipeline

### Phase A — Upload

Accepted document types:

- `.pdf`
- `.txt`
- `.md`
- `.docx` (optional but recommended)

### Phase B — Parse

Extract plain text from document.

### Phase C — Clean

Normalize whitespace, remove duplicate blank lines, preserve headings if possible.

### Phase D — Chunk

Split into semantically reasonable chunks.

Recommended starter values:

- chunk size: 600–1000 characters or equivalent token-oriented approximation
- overlap: 100–200 characters

### Phase E — Embed

Generate embeddings locally using an embedding model served through Ollama.

### Phase F — Persist

Store:

- document metadata,
- chunk text,
- embeddings,
- scope metadata.

### Phase G — Retrieve

At query time:

1. embed the question,
2. vector search top-k chunks,
3. apply scope filters,
4. build grounded prompt.

### Phase H — Generate

Send prompt + retrieved context to local model through Ollama.

### Phase I — Respond

Return:

- answer text,
- used sources,
- optional confidence metadata.

## 4.6 Prompt Policy

The system prompt must enforce:

- answer only from provided context,
- if not present, say the answer is not available,
- never fabricate policy details,
- keep tone professional,
- cite source names when available.

## 4.7 Chat Output Contract

```json
{
  "success": true,
  "data": {
    "answer": "...",
    "sources": [
      {
        "documentId": "...",
        "title": "Remote Work Policy",
        "chunkIndex": 4
      }
    ]
  }
}
```

## 4.8 Recommended AI Runtime Design

Use a **manual RAG service** rather than a heavy agent framework for v1.

Benefits:

- fewer dependencies,
- easier debugging,
- less abstraction,
- cleaner teaching/demo value.

### Components

- `embedding.service.ts`
- `retrieval.service.ts`
- `prompt.service.ts`
- `chat.service.ts`
- `citation.service.ts`

## 4.9 AI Safety & Reliability Rules

- Do not answer outside retrieved context when policy data is missing.
- Never return chunks from unauthorized scope.
- Always store chat logs without secret tokens.
- Never expose raw embeddings to frontend.
- File ingestion failures must mark document as `failed`.

---

# 5. Local Development Setup (A–Z)

This section is written so an AI coding agent can execute it through the VS Code terminal with minimal ambiguity.

## 5.1 Required Tools

Mandatory:

- Git
- Node.js LTS
- npm
- VS Code
- MongoDB Atlas account (recommended) or local MongoDB setup
- Ollama

Optional:

- Docker Desktop
- Postman or Bruno
- MongoDB Compass

## 5.2 Node.js Requirement

Use **Node.js LTS** only.

As of April 2026, Node.js 24.x is an LTS line and recommended for production-grade applications.

## 5.3 Repository Bootstrap Commands

Run from terminal:

```bash
mkdir orgflow-ai
cd orgflow-ai
git init
npm init -y
npm pkg set private=true
npm pkg set "workspaces[0]=apps/*"
npm pkg set "workspaces[1]=packages/*"
mkdir -p apps/api apps/web packages/shared-types packages/shared-config packages/ui docs .github/workflows .vscode
```

## 5.4 Frontend Bootstrap

```bash
npm create vite@latest apps/web -- --template react-ts
```

## 5.5 Backend Bootstrap

```bash
cd apps/api
npm init -y
npm pkg set type=module
cd ../..
```

## 5.6 Root Dev Dependencies

```bash
npm install -D typescript tsx eslint @eslint/js prettier globals typescript-eslint @types/node
```

## 5.7 Backend Dependencies

```bash
npm install -w apps/api express cors helmet morgan jsonwebtoken bcryptjs zod mongoose multer dotenv ollama pdf-parse mammoth
npm install -D -w apps/api typescript tsx @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/morgan @types/multer @types/node
```

## 5.8 Frontend Dependencies

```bash
npm install -w apps/web react-router-dom @tanstack/react-query axios zod clsx tailwind-merge lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D -w apps/web typescript @types/react @types/react-dom tailwindcss postcss autoprefixer
```

## 5.9 Shared Types Package Bootstrap

```bash
cd packages/shared-types
npm init -y
npm pkg set type=module
cd ../..
```

## 5.10 Base TypeScript Config

Create `tsconfig.base.json` at repo root and make all packages extend it.

Mandatory compiler principles:

- `strict: true`
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `forceConsistentCasingInFileNames: true`
- `useUnknownInCatchVariables: true`

## 5.11 ESLint Rules

Mandatory lint rules:

- no explicit any
- no floating promises
- no unused vars
- no unsafe assignment/call/member access/return
- explicit imports for types where useful

Recommended TypeScript ESLint strategy:

- use type-aware linting
- fail build on lint errors

## 5.12 Prettier Rules

Keep formatting automatic and minimal.

Recommended:

- semicolons: yes
- singleQuote: true
- trailingComma: all
- printWidth: 100

## 5.13 VS Code Recommended Extensions

Create `.vscode/extensions.json` and recommend:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- GitHub Copilot (if using)
- Error Lens

## 5.14 VS Code Workspace Settings

Create `.vscode/settings.json` with:

- format on save
- ESLint fix on save
- TypeScript SDK resolution if needed
- files exclude for build output

---

# 6. Ollama Setup Instructions

## 6.1 Purpose

Ollama runs local LLMs and exposes a local API. It will be used for:

- generation model,
- embeddings model,
- local AI workflow.

## 6.2 Windows Install

Run in PowerShell:

```powershell
irm https://ollama.com/install.ps1 | iex
```

Or use the Windows installer.

## 6.3 macOS / Linux Install

Run in terminal:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## 6.4 Verify Installation

```bash
ollama --version
```

## 6.5 Start Ollama

If Ollama is not already running as a background service:

```bash
ollama serve
```

## 6.6 Pull a Generation Model

Use a default generation model that is supported in your local environment.

Recommended baseline command:

```bash
ollama pull gemma3
```

## 6.7 Pull an Embedding Model

Pull a local embedding-capable model supported by your environment. Example placeholder:

```bash
ollama pull <embedding-model>
```

If your instructor explicitly requires Google Gemma family usage, keep the default generation model configurable through environment variables so the project can switch to another supported local model after validation.

## 6.8 Verify Local API

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "gemma3",
  "messages": [{"role": "user", "content": "Hello"}]
}'
```

## 6.9 Model Storage Notes

Make sure sufficient disk space exists for local models.

---

# 7. MongoDB Setup Instructions

## 7.1 Recommended Approach

Use **MongoDB Atlas** for database hosting and **Atlas Vector Search** for RAG retrieval.

## 7.2 Required Collections

- organizations
- teams
- users
- projects
- tasks
- taskComments
- announcements
- documents
- documentChunks
- chatLogs

## 7.3 Required Indexes

### Normal Indexes

- users: `{ organizationId: 1, teamId: 1, email: 1 }`
- teams: `{ organizationId: 1, name: 1 }`
- projects: `{ organizationId: 1, teamId: 1, status: 1 }`
- tasks: `{ organizationId: 1, teamId: 1, projectId: 1, assignedTo: 1, status: 1, dueDate: 1 }`
- announcements: `{ organizationId: 1, targetType: 1, targetId: 1, createdAt: -1 }`

### Vector Search Index

Create a vector index on `documentChunks.embedding` and add filterable fields:

- organizationId
- teamId
- projectId
- visibility
- allowedRoles

---

# 8. Environment Variables

Create:

```text
apps/api/.env
apps/web/.env
```

## 8.1 Backend `.env`

```env
NODE_ENV=development
PORT=4000
API_BASE_PATH=/api/v1
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
OLLAMA_HOST=http://localhost:11434
OLLAMA_CHAT_MODEL=gemma3
OLLAMA_EMBED_MODEL=
MAX_UPLOAD_SIZE_MB=10
```

## 8.2 Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

### Secret Rules

- Never commit real secrets.
- Commit only `.env.example` files.
- Agent must never print secrets into logs or markdown docs.

---

# 9. Testing Strategy

## 9.1 Minimum Required Tests

### Backend

- auth service
- RBAC guard logic
- scope filtering logic
- task overdue logic
- announcement targeting logic
- document ingestion pipeline helpers
- retrieval permission filters

### Frontend

- protected route logic
- dashboard rendering states
- task filters
- Kanban status mutation flow
- AI chat UI states

## 9.2 Test Types

- **Unit tests** for pure functions/services
- **Integration tests** for API endpoints
- **Component tests** for core React components
- **E2E smoke tests** if time allows

## 9.3 Quality Gates

Every merge to main must pass:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

---

# 10. CI/CD and Git Strategy

## 10.1 Branching

- `main` — protected
- `develop` — integration
- feature branches by domain

### Feature Branch Naming

```text
feat/auth-rbac
feat/projects-tasks
feat/dashboard-ai
fix/task-overdue
chore/tooling
```

## 10.2 Commit Convention

```text
feat: add task status update API
fix: correct scope filter for member projects
refactor: extract ollama chat client
test: add integration tests for announcements
chore: enable strict typed linting
```

## 10.3 Pull Request Rule

A PR must include:

- scope summary,
- affected paths,
- screenshots if UI changed,
- test evidence,
- migration notes if schema changed.

---

# 11. Naming Conventions and Anti-Conflict Rules

These are mandatory. They exist specifically to prevent variable collisions, component duplication, inconsistent naming, and merge conflicts.

## 11.1 Global Naming Policy

### Files

- React components: `PascalCase.tsx`
- hooks: `useXyz.ts`
- utility modules: `kebab-case.ts`
- model files: `entity.model.ts`
- service files: `domain.service.ts`
- controller files: `domain.controller.ts`
- route files: `domain.routes.ts`
- schema/validation files: `domain.schema.ts`

### Variables

- `camelCase` for variables and functions
- `PascalCase` for types, interfaces, enums, components
- `UPPER_SNAKE_CASE` for environment variable names and constants intended as true constants

## 11.2 Prefix Policy by Domain

To avoid collisions across domains, use domain prefixes for key identifiers.

### Shared UI

- `AppShell`
- `AppSidebar`
- `AppNavbar`
- `AppCard`

### Auth

- `authToken`
- `authUser`
- `useAuthSession`
- `AuthGuard`

### Teams

- `teamRecord`
- `teamListQuery`
- `TeamFormValues`

### Users

- `userRecord`
- `userStatusBadge`
- `UserDetailsPanel`

### Projects

- `projectRecord`
- `projectFilterState`
- `ProjectDetailsPage`

### Tasks

- `taskRecord`
- `taskFilterState`
- `taskKanbanColumn`
- `TaskStatusBadge`

### AI

- `aiChatMessage`
- `aiSourceCitation`
- `aiRetrievalContext`
- `AiChatPanel`

## 11.3 HTML IDs and Test IDs

Use domain prefixes:

- `auth-login-form`
- `team-create-button`
- `project-search-input`
- `task-kanban-column-todo`
- `ai-chat-submit-button`

## 11.4 API DTO Naming

- request DTOs: `CreateTaskRequestDto`, `UpdateProjectRequestDto`
- response DTOs: `TaskResponseDto`, `PagedProjectsResponseDto`

## 11.5 Type Naming

- `UserRole`
- `TaskStatus`
- `TaskPriority`
- `AnnouncementTargetType`
- `DocumentVisibility`

## 11.6 Forbidden Naming Patterns

The following are forbidden:

- generic `data` when a more precise name is possible
- generic `item`, `obj`, `temp`, `value` outside tiny local scopes
- duplicate component names in different domains without prefixes
- misleading names like `getUsers` for a mutation

## 11.7 `any` Policy

### Hard Rule

`any` is forbidden.

Allowed alternatives:

- `unknown`
- discriminated unions
- generics with constraints
- indexed records with explicit value types
- Zod inferred types

If unknown external input exists, use:

1. `unknown`
2. validate with Zod
3. narrow to concrete type

---

# 12. 14-Subagent Orchestration Blueprint

This section defines **logical subagents**. If the VS Code AI tool supports parallel agents, they must be instantiated according to this plan. If the tool does not support true parallel agents, the main agent must emulate them sequentially while preserving path ownership and responsibilities.

## 12.1 Shared Rules for All Subagents

Every subagent must obey these rules:

1. Work only in assigned paths unless a handoff is approved.
2. Do not rename shared contracts without updating imports and notifying impacted domains.
3. Do not introduce `any`.
4. Run local validation after changes.
5. Prefer additive changes over destructive refactors.
6. Do not change another subagent's owned files without creating a handoff note.
7. Do not duplicate helpers or constants.
8. If a needed shared contract is missing, create it in `packages/shared-types` through the Shared Contracts agent.
9. Use existing enums/constants before creating new ones.
10. Keep commits focused and domain-scoped.

## 12.2 Subagent Registry

### Agent 01 — Program Manager / Orchestrator

**Code name:** `pm-agent`  
**Owns:** planning, task graph, milestone validation, merge order  
**Writable paths:** `docs/`, root configs only when necessary  
**Forbidden:** feature implementation except coordination files  
**Responsibilities:**

- read this master spec,
- create milestone checklist,
- assign tasks to subagents,
- enforce stage gates,
- block conflicting changes,
- create integration order.

### Agent 02 — Repo Bootstrap & Tooling

**Code name:** `bootstrap-agent`  
**Owns:** repo initialization, tsconfig, eslint, prettier, workspace config, scripts  
**Writable paths:** root config files, `.vscode/`, `packages/shared-config/`  
**Forbidden:** feature code  
**Responsibilities:**

- initialize monorepo,
- configure TypeScript strict mode,
- configure ESLint + no-explicit-any,
- create base scripts,
- ensure clean workspace behavior.

### Agent 03 — Shared Contracts & Types

**Code name:** `contracts-agent`  
**Owns:** `packages/shared-types/`  
**Writable paths:** `packages/shared-types/**`  
**Forbidden:** domain business logic  
**Responsibilities:**

- define shared enums,
- define DTO types,
- define API response wrappers,
- define shared utility types,
- act as single source of truth for cross-package contracts.

### Agent 04 — Backend Platform & Database

**Code name:** `platform-agent`  
**Owns:** backend app setup, DB connection, env parsing, logger, middleware skeleton  
**Writable paths:** `apps/api/src/app/**`, `apps/api/src/config/**`, `apps/api/src/middleware/**`, `apps/api/src/utils/**`  
**Forbidden:** domain endpoints except skeletal registration  
**Responsibilities:**

- Express app bootstrap,
- Mongoose connection,
- error middleware,
- validation middleware,
- request logging,
- health endpoints.

### Agent 05 — Authentication & RBAC

**Code name:** `auth-agent`  
**Owns:** auth module, JWT, password hashing, auth middleware, role guards  
**Writable paths:** `apps/api/src/modules/auth/**`, related auth frontend paths  
**Forbidden:** teams/projects/tasks domain logic  
**Responsibilities:**

- login/me endpoints,
- invite flow,
- token verification,
- route guards,
- auth storage on frontend,
- protected route wrappers.

### Agent 06 — Teams & Users

**Code name:** `org-agent`  
**Owns:** teams/users modules and UI  
**Writable paths:** `apps/api/src/modules/users/**`, `apps/api/src/modules/teams/**`, frontend features/pages for users/teams  
**Forbidden:** project/task domain logic  
**Responsibilities:**

- user CRUD,
- team CRUD,
- assignment of leaders,
- pending/active/disabled states,
- admin UI for teams/users.

### Agent 07 — Projects Domain

**Code name:** `projects-agent`  
**Owns:** projects API and UI  
**Writable paths:** `apps/api/src/modules/projects/**`, frontend project feature paths  
**Forbidden:** task logic except project membership lookup  
**Responsibilities:**

- project CRUD,
- membership management,
- project details pages,
- project filtering.

### Agent 08 — Tasks & Kanban Domain

**Code name:** `tasks-agent`  
**Owns:** tasks/comments API and UI, Kanban  
**Writable paths:** `apps/api/src/modules/tasks/**`, frontend task feature paths  
**Forbidden:** announcement or AI logic  
**Responsibilities:**

- task CRUD,
- comment CRUD,
- task filters,
- overdue computation,
- drag/drop board.

### Agent 09 — Dashboard & Analytics

**Code name:** `dashboard-agent`  
**Owns:** dashboard API and pages  
**Writable paths:** `apps/api/src/modules/dashboard/**`, frontend dashboard pages/features  
**Forbidden:** raw CRUD modules outside read-only aggregation  
**Responsibilities:**

- admin/team/member dashboards,
- stats cards,
- charts if added,
- overdue and completion metrics.

### Agent 10 — Announcements & Notifications

**Code name:** `notes-agent`  
**Owns:** announcements module and UI  
**Writable paths:** `apps/api/src/modules/announcements/**`, frontend announcements feature paths  
**Forbidden:** auth/task/project changes  
**Responsibilities:**

- notes targeting organization/team/user,
- mark-as-read flow,
- notifications badge if added.

### Agent 11 — Frontend Shell & Design System

**Code name:** `ui-agent`  
**Owns:** layout, theming, shared UI components, dark mode, design tokens  
**Writable paths:** `apps/web/src/components/**`, `apps/web/src/styles/**`, `packages/ui/**`, theme feature  
**Forbidden:** domain-specific business logic  
**Responsibilities:**

- app shell,
- navbar/sidebar,
- buttons/forms/modals/tables/cards,
- dark mode,
- loading/empty/error components.

### Agent 12 — AI Ingestion & Retrieval

**Code name:** `rag-ingest-agent`  
**Owns:** documents, parsing, chunking, embeddings, vector indexing, retrieval filters  
**Writable paths:** `apps/api/src/modules/ai/documents/**`, retrieval-related paths  
**Forbidden:** frontend chat UI except contract coordination  
**Responsibilities:**

- doc upload endpoint,
- document parsing,
- chunk creation,
- embedding generation,
- vector search queries,
- permission-aware retrieval.

### Agent 13 — AI Chat Runtime & Frontend

**Code name:** `rag-chat-agent`  
**Owns:** chat API orchestration and frontend chat experience  
**Writable paths:** `apps/api/src/modules/ai/chat/**`, frontend AI feature paths  
**Forbidden:** document ingestion internals except imports  
**Responsibilities:**

- prompt construction,
- source citation formatting,
- chat endpoint,
- chat panel UI,
- message history state,
- source rendering.

### Agent 14 — QA, Security & Release Hardening

**Code name:** `qa-agent`  
**Owns:** tests, CI workflow, release checks, dependency sanity, smoke scripts  
**Writable paths:** `**/*.test.*`, `**/*.spec.*`, `.github/workflows/**`, sanity scripts, docs notes  
**Forbidden:** major feature logic rewrites without coordination  
**Responsibilities:**

- test coverage additions,
- CI pipeline,
- regression checks,
- lint/type/test/build gating,
- security headers verification,
- release checklist.

## 12.3 Parallelization Rules

Parallel work is allowed only when path ownership does not overlap.

### Safe Parallel Groups

#### Group A

- bootstrap-agent
- contracts-agent
- ui-agent
- platform-agent

#### Group B

- auth-agent
- org-agent
- projects-agent
- tasks-agent

#### Group C

- dashboard-agent
- notes-agent
- rag-ingest-agent
- rag-chat-agent

#### Group D

- qa-agent after at least one feature branch exists

## 12.4 Conflict Prevention Rules

1. Shared contracts must be merged **before** dependent features finalize.
2. UI shared components must be stable before domain pages heavily depend on them.
3. RAG chat cannot finalize before ingestion + retrieval contracts exist.
4. Dashboard agent must consume existing APIs; must not redefine domain schemas.
5. QA agent can add tests in any domain but must not rename domain exports.

## 12.5 Integration Order

1. bootstrap-agent
2. contracts-agent
3. platform-agent + ui-agent
4. auth-agent
5. org-agent + projects-agent + tasks-agent
6. dashboard-agent + notes-agent
7. rag-ingest-agent
8. rag-chat-agent
9. qa-agent
10. pm-agent final release review

---

# 13. Strict Coding Standards

## 13.1 TypeScript Rules

Mandatory:

- `strict: true`
- `noImplicitAny: true`
- `no unchecked` unsafe patterns where lint rules exist
- no `@ts-ignore` without documented justification
- no explicit `any`
- prefer `type` / `interface` consistency by rule
- exported functions require explicit return types

## 13.2 Validation Rules

All external input must be validated with Zod or an equivalent runtime validator:

- HTTP body
- query params
- route params
- uploaded document metadata
- AI chat payload

## 13.3 API Client Rules

Frontend must not call `fetch` ad hoc across random files.
Create one typed API layer.

## 13.4 React Rules

- One component per file unless tiny helper.
- Avoid inline giant anonymous functions in JSX when logic is non-trivial.
- Extract reusable hooks.
- Keep pages thin; move logic into features/hooks.
- Avoid prop drilling by using domain hooks/providers only where justified.

## 13.5 Express Rules

- No business logic in route registration.
- No silent `try/catch` swallowing.
- Always pass errors to middleware.
- Services return typed results or throw typed app errors.

## 13.6 Database Rules

- All schemas include timestamps.
- All queries scoped by organization.
- Never trust client-provided organizationId; derive it from auth context if possible.

## 13.7 RAG Rules

- Never query vectors without scope filters.
- Never send full confidential docs to frontend.
- Always cap retrieved chunks.
- Always include source metadata in logs.

---

# 14. Detailed Implementation Milestones

## Milestone 1 — Workspace and Tooling

Deliverables:

- monorepo initialized,
- Vite web app created,
- API app created,
- TypeScript strict configs,
- ESLint + Prettier,
- workspace settings,
- scripts.

## Milestone 2 — Shared Contracts and Core Platform

Deliverables:

- shared types package,
- Express bootstrap,
- MongoDB connection,
- logger,
- error middleware,
- health endpoint,
- API response helpers.

## Milestone 3 — Auth & RBAC

Deliverables:

- login,
- me endpoint,
- JWT middleware,
- protected frontend routing,
- invite scaffolding,
- role guards.

## Milestone 4 — Teams, Users, Projects, Tasks

Deliverables:

- CRUD endpoints,
- forms/pages,
- filters,
- comments,
- scope enforcement.

## Milestone 5 — Dashboard, Announcements, Dark Mode

Deliverables:

- admin/team/member dashboards,
- announcement targeting,
- light/dark themes,
- polished empty/loading/error states.

## Milestone 6 — Kanban

Deliverables:

- task board,
- drag/drop status transitions,
- optimistic update with rollback.

## Milestone 7 — AI Document Ingestion

Deliverables:

- upload endpoint,
- parsing,
- chunking,
- embeddings,
- vector storage.

## Milestone 8 — AI Chat Runtime

Deliverables:

- retrieval service,
- prompt service,
- chat endpoint,
- UI panel,
- sources display,
- logs.

## Milestone 9 — QA and Release

Deliverables:

- tests,
- CI,
- final cleanup,
- README,
- demo script.

---

# 15. Suggested NPM Scripts

## Root `package.json`

```json
{
  "scripts": {
    "dev:web": "npm run dev -w apps/web",
    "dev:api": "npm run dev -w apps/api",
    "build": "npm run build -w apps/web && npm run build -w apps/api",
    "typecheck": "npm run typecheck -w apps/web && npm run typecheck -w apps/api",
    "lint": "eslint .",
    "test": "npm run test -w apps/api && npm run test -w apps/web"
  }
}
```

---

# 16. Demo Scenario for Instructor

1. Admin logs in.
2. Admin views company dashboard.
3. Admin creates a team and invites users.
4. Leader logs in and creates a project.
5. Leader creates tasks and assigns them.
6. Member logs in and sees only authorized tasks/projects.
7. Member updates task status.
8. Overdue task appears highlighted.
9. Leader opens Kanban and drags task between columns.
10. Admin posts an announcement.
11. Admin uploads a policy/project document.
12. Member asks AI assistant a question.
13. Assistant answers using allowed document chunks and shows sources.
14. Show that restricted user cannot retrieve unauthorized knowledge.

---

# 17. Final Release Checklist

## Functional

- [ ] Login works
- [ ] RBAC works
- [ ] Teams CRUD works
- [ ] Users CRUD works
- [ ] Projects CRUD works
- [ ] Tasks CRUD works
- [ ] Task comments work
- [ ] Search/filter works
- [ ] Overdue highlighting works
- [ ] Dark mode works
- [ ] Kanban works
- [ ] Announcements work
- [ ] Document upload/indexing works
- [ ] AI chat works with citations
- [ ] AI respects permissions

## Technical

- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] No explicit any
- [ ] Tests pass
- [ ] Build passes
- [ ] Environment examples documented
- [ ] README created

## Presentation

- [ ] Screens ready
- [ ] Demo flow rehearsed
- [ ] Git history clean
- [ ] Team responsibilities documented

---

# 18. Recommended First Terminal Session for the AI Agent

The AI agent should execute the following sequence in a new VS Code terminal.

```bash
mkdir orgflow-ai
cd orgflow-ai
git init
npm init -y
npm pkg set private=true
npm pkg set "workspaces[0]=apps/*"
npm pkg set "workspaces[1]=packages/*"
mkdir -p apps/api apps/web packages/shared-types packages/shared-config packages/ui docs .github/workflows .vscode
npm create vite@latest apps/web -- --template react-ts
cd apps/api
npm init -y
npm pkg set type=module
cd ../..
npm install -D typescript tsx eslint @eslint/js prettier globals typescript-eslint @types/node
npm install -w apps/api express cors helmet morgan jsonwebtoken bcryptjs zod mongoose multer dotenv ollama pdf-parse mammoth
npm install -D -w apps/api typescript tsx @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/morgan @types/multer @types/node
npm install -w apps/web react-router-dom @tanstack/react-query axios zod clsx tailwind-merge lucide-react @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install -D -w apps/web typescript @types/react @types/react-dom tailwindcss postcss autoprefixer
curl -fsSL https://ollama.com/install.sh | sh || true
ollama --version || true
```

If on Windows, replace the Ollama install step with PowerShell:

```powershell
irm https://ollama.com/install.ps1 | iex
```

Then create config files, base tsconfig, eslint config, and `.env.example` files before any feature code.

---

# 19. References (Official Sources Recommended for the Agent)

The AI agent should rely primarily on official documentation for setup and integration details:

- Node.js downloads and release lines: https://nodejs.org/
- Node.js download page: https://nodejs.org/en/download
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Vite docs: https://vite.dev/guide/
- React Router docs: https://reactrouter.com/
- React Router `createBrowserRouter`: https://reactrouter.com/api/data-routers/createBrowserRouter
- TypeScript TSConfig reference: https://www.typescriptlang.org/tsconfig/
- typescript-eslint `no-explicit-any`: https://typescript-eslint.io/rules/no-explicit-any/
- typescript-eslint typed linting: https://typescript-eslint.io/getting-started/typed-linting/
- ESLint docs: https://eslint.org/docs/latest/
- Ollama docs: https://docs.ollama.com/
- Ollama quickstart: https://docs.ollama.com/quickstart
- Ollama Windows docs: https://docs.ollama.com/windows
- Ollama macOS docs: https://docs.ollama.com/macos
- Ollama JavaScript SDK: https://github.com/ollama/ollama-js
- MongoDB RAG with Atlas Vector Search: https://www.mongodb.com/docs/atlas/atlas-vector-search/rag/
- MongoDB Vector Search overview: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/
- MongoDB Node.js Vector Search: https://www.mongodb.com/docs/drivers/node/current/atlas-vector-search/
- Gemma model docs: https://ai.google.dev/gemma/docs
- Gemma release notes: https://ai.google.dev/gemma/docs/releases
- Google DeepMind Gemma overview: https://deepmind.google/models/gemma/

---

# 20. Final Agent Commandment

Build the smallest number of well-designed modules necessary to satisfy the full specification.

Do not over-engineer.  
Do not under-specify.  
Do not bypass validation.  
Do not use `any`.  
Do not break RBAC.  
Do not allow unauthorized retrieval in RAG.  
Do not merge failing code.  
Do produce a clean, professional, demo-ready project.
