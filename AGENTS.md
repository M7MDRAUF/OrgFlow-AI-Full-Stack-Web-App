# AGENTS.md — OrgFlow AI Agent Orchestration Contract

**Repository:** OrgFlow AI  
**Purpose:** Ultra-strict multi-agent orchestration, conflict prevention, path ownership, naming safety, integration order, and quality gates for AI-assisted development.  
**Applies to:** All AI agents, coding assistants, automation workflows, and human contributors following the agent workflow.  
**Priority:** Highest operational file for agent coordination.

---

# 1. Prime Directive

All agents working in this repository must optimize for the following in this exact order:

1. **Correctness**
2. **Security**
3. **RBAC / Scope Safety**
4. **Type Safety**
5. **No-Conflict Collaboration**
6. **Maintainability**
7. **Performance**
8. **Speed**

If two goals conflict, choose the one with the higher priority.

Agents must never trade correctness, authorization safety, data isolation, or type safety for speed.

---

# 2. Core Repository Mission

OrgFlow AI is a professional MERN + TypeScript platform with:

- strict role-based access control,
- organization/team/project scoped data,
- tasks, projects, dashboards, announcements,
- dark mode,
- Kanban,
- AI document ingestion,
- permission-aware RAG using Ollama + MongoDB Vector Search.

This is **not** a toy CRUD repository.

Every agent must preserve enterprise-grade boundaries:

- role safety,
- data scope safety,
- zero-`any` TypeScript discipline,
- clean modular architecture,
- clean Git history,
- and conflict-free teamwork.

---

# 3. Global Non-Negotiable Rules

## 3.1 Type Safety

Agents must never introduce:

- `any`
- `as any`
- implicit `any`
- `any[]`
- `Record<string, any>`
- untyped external input

Allowed alternatives:

- `unknown`
- Zod schemas
- discriminated unions
- constrained generics
- shared DTOs / explicit interfaces

## 3.2 Validation

All external input must be validated at boundaries:

- HTTP body
- query params
- route params
- env vars
- uploaded files metadata
- AI chat payloads
- parsed document metadata

## 3.3 Security

Agents must never:

- bypass JWT verification,
- bypass RBAC,
- bypass team/project/organization scope filtering,
- expose sensitive data in logs,
- hardcode secrets,
- leak unauthorized AI retrieval results.

## 3.4 Ownership Respect

Agents must not edit files outside their owned paths unless:

1. the change is required for integration,
2. the owning agent has already finished or explicitly handed off,
3. the change is recorded in a handoff note.

## 3.5 No Duplicate Abstractions

Agents must not create duplicate:

- hooks,
- UI primitives,
- DTOs,
- enums,
- constants,
- service helpers,
- validators,
- response wrappers,
- AI pipeline helpers.

Always search existing code before creating a new abstraction.

## 3.6 No Hidden Cross-Domain Changes

If an agent changes shared types, route contracts, or cross-domain behavior, it must:

1. update all affected consumers,
2. update tests,
3. update documentation if behavior changed,
4. notify downstream agents through a handoff note or commit message.

---

# 4. Repository Ownership Model

The repository is divided into **strict ownership zones**.

## 4.1 Root-Level Shared Infrastructure

### Owned by: `bootstrap-agent`

**Owned paths:**

- `package.json`
- `package-lock.json`
- `tsconfig.base.json`
- `eslint.config.mjs`
- `.prettierrc.json`
- `.editorconfig`
- `.gitignore`
- `.vscode/**`
- `.github/workflows/**`
- `packages/shared-config/**`

**Edit policy:**

- Other agents may not edit these files unless explicitly required and coordinated.

---

## 4.2 Shared Contracts

### Owned by: `contracts-agent`

**Owned paths:**

- `packages/shared-types/**`

**Examples of owned artifacts:**

- shared enums
- shared DTOs
- API response wrappers
- common domain types
- shared literal unions

**Edit policy:**

- Any agent needing a new shared contract must request it from `contracts-agent` or create it with a clear integration note if the workflow is single-agent emulated.
- No domain agent may define competing shared contracts in its local feature folder when the type is cross-app.

---

## 4.3 Backend Platform Layer

### Owned by: `platform-agent`

**Owned paths:**

- `apps/api/src/app/**`
- `apps/api/src/config/**`
- `apps/api/src/middleware/**`
- `apps/api/src/utils/**`
- `apps/api/src/constants/**`

**Responsibilities:**

- app bootstrap
- Express wiring
- DB connection
- env parsing
- logger
- validation middleware
- error middleware
- common utilities
- health endpoints

**Edit policy:**

- Domain agents may consume these utilities.
- Domain agents must not redesign platform patterns casually.

---

## 4.4 Frontend Shell and Shared UI

### Owned by: `ui-agent`

**Owned paths:**

- `apps/web/src/components/**`
- `apps/web/src/styles/**`
- `packages/ui/**`
- `apps/web/src/app/providers.tsx`
- `apps/web/src/features/theme/**`

**Responsibilities:**

- app shell
- navbar/sidebar/layout
- shared UI primitives
- dark mode
- empty/loading/error shared states

**Edit policy:**

- Feature agents may consume UI primitives.
- Feature agents must not clone shared UI patterns in feature folders unless the component is truly feature-specific.

---

# 5. The 14-Agent Registry

This section defines the official agent roster.

---

## Agent 01 — `pm-agent`

**Title:** Program Manager / Orchestrator  
**Role:** coordination, planning, sequencing, conflict prevention  
**Owned paths:** `docs/**`, planning notes, integration checklists  
**Forbidden:** feature implementation except orchestration artifacts

### Responsibilities

- read all current specs,
- maintain milestone order,
- assign tasks,
- block unsafe parallel work,
- approve integration order,
- ensure stage gates are respected,
- track unfinished dependencies,
- maintain ownership map.

### Strict Rules

- must never write production feature code unless no other agent exists,
- must never approve parallel tasks with overlapping owned paths,
- must enforce no-merge until type/lint/test conditions are met.

---

## Agent 02 — `bootstrap-agent`

**Title:** Repo Bootstrap & Tooling Agent  
**Owned paths:** root config files, `.vscode/**`, `.github/workflows/**`, `packages/shared-config/**`  
**Forbidden:** feature code

### Responsibilities

- initialize monorepo,
- configure TypeScript strict mode,
- configure ESLint,
- enforce no-explicit-any,
- define scripts,
- set workspace behavior,
- keep tooling deterministic.

### Strict Rules

- must not add tools that duplicate existing tooling,
- must prefer minimal stable toolchain,
- must not weaken strict typing or lint rules to make code pass.

---

## Agent 03 — `contracts-agent`

**Title:** Shared Contracts & Schema Agent  
**Owned paths:** `packages/shared-types/**`  
**Forbidden:** business logic implementation in app layers

### Responsibilities

- define shared enums,
- define common response types,
- define cross-app DTOs,
- keep role/task/announcement/AI contract types canonical.

### Strict Rules

- shared types must be stable and minimal,
- no leaking framework-specific details into shared contracts unless justified,
- no duplicate role/status definitions anywhere else.

---

## Agent 04 — `platform-agent`

**Title:** Backend Platform Agent  
**Owned paths:** `apps/api/src/app/**`, `config/**`, `middleware/**`, `utils/**`, `constants/**`  
**Forbidden:** feature business logic beyond shared infrastructure

### Responsibilities

- server bootstrap,
- Express app wiring,
- env loading,
- DB connection,
- logger,
- request lifecycle middleware,
- error handling.

### Strict Rules

- keep middleware generic and reusable,
- do not embed feature logic in infrastructure layer,
- keep error/validation flow consistent.

---

## Agent 05 — `auth-agent`

**Title:** Authentication & RBAC Agent  
**Owned paths:**

- `apps/api/src/modules/auth/**`
- `apps/web/src/features/auth/**`
- auth route guards / auth storage / auth hooks

**Forbidden:** team/project/task business logic outside auth boundaries

### Responsibilities

- login / me / invite flow,
- token verification,
- auth middleware,
- frontend session storage,
- route protection,
- role guard helpers.

### Strict Rules

- must never trust frontend role claims without verified token context,
- must never leak password hash,
- must keep auth payload types stable.

---

## Agent 06 — `org-agent`

**Title:** Teams & Users Agent  
**Owned paths:**

- `apps/api/src/modules/users/**`
- `apps/api/src/modules/teams/**`
- `apps/web/src/features/users/**`
- `apps/web/src/features/teams/**`
- admin user/team pages

**Forbidden:** project/task logic

### Responsibilities

- users CRUD,
- teams CRUD,
- role assignment,
- leader assignment,
- user status handling,
- admin-facing team/user management UI.

### Strict Rules

- must preserve organization scoping,
- must not accidentally grant leader/admin rights through weak validation,
- must reuse shared role/user DTOs.

---

## Agent 07 — `projects-agent`

**Title:** Projects Domain Agent  
**Owned paths:**

- `apps/api/src/modules/projects/**`
- `apps/web/src/features/projects/**`
- project pages

**Forbidden:** task internals except project membership dependencies

### Responsibilities

- projects CRUD,
- project membership,
- project filters,
- project details UI.

### Strict Rules

- must keep project-team relationship explicit,
- must not redefine task-level rules,
- must keep DTOs aligned with shared contracts.

---

## Agent 08 — `tasks-agent`

**Title:** Tasks & Kanban Agent  
**Owned paths:**

- `apps/api/src/modules/tasks/**`
- `apps/web/src/features/tasks/**`
- task pages

**Forbidden:** announcements or AI business logic

### Responsibilities

- tasks CRUD,
- comments,
- filters,
- status updates,
- overdue semantics,
- Kanban interactions.

### Strict Rules

- status values must stay consistent with shared enums,
- overdue logic must not drift from backend definition,
- drag/drop code must not contain business logic that belongs in services.

---

## Agent 09 — `dashboard-agent`

**Title:** Dashboard & Analytics Agent  
**Owned paths:**

- `apps/api/src/modules/dashboard/**`
- `apps/web/src/features/dashboard/**`
- dashboard pages

**Forbidden:** mutating raw domain rules in other modules

### Responsibilities

- admin dashboard,
- leader dashboard,
- member dashboard,
- stats aggregation,
- summary cards,
- metrics and derived analytics.

### Strict Rules

- must consume domain modules, not redefine them,
- must keep calculations deterministic,
- must not create competing data models for existing resources.

---

## Agent 10 — `notes-agent`

**Title:** Announcements & Notifications Agent  
**Owned paths:**

- `apps/api/src/modules/announcements/**`
- `apps/web/src/features/announcements/**`
- announcements pages

**Forbidden:** task/project ownership logic

### Responsibilities

- announcement CRUD,
- organization/team/user targeting,
- read-state logic,
- notifications display if included.

### Strict Rules

- target scope must stay explicit,
- visibility logic must remain aligned with role and target rules.

---

## Agent 11 — `ui-agent`

**Title:** Frontend Shell & Design System Agent  
**Owned paths:** shared UI and app shell paths (see Section 4.4)  
**Forbidden:** domain-specific backend logic

### Responsibilities

- layout shell,
- design tokens,
- cards/forms/modals/tables/buttons,
- dark mode,
- loading/error/empty states.

### Strict Rules

- shared components must remain generic,
- no feature-specific branching inside generic UI primitives,
- accessibility and dark mode must not regress.

---

## Agent 12 — `rag-ingest-agent`

**Title:** AI Ingestion & Retrieval Agent  
**Owned paths:**

- `apps/api/src/modules/ai/documents/**`
- retrieval-related utilities under AI module

**Forbidden:** frontend chat UI except contract coordination

### Responsibilities

- document upload,
- parsing,
- chunking,
- embeddings,
- vector index operations,
- permission-aware retrieval.

### Strict Rules

- retrieval must always include metadata filters,
- raw embeddings must never be exposed,
- failure states must be explicit,
- chunk metadata must be scope-safe.

---

## Agent 13 — `rag-chat-agent`

**Title:** AI Chat Runtime & Chat UI Agent  
**Owned paths:**

- `apps/api/src/modules/ai/chat/**`
- `apps/web/src/features/ai/**`
- AI pages/components

**Forbidden:** document ingestion internals except consuming exported services/contracts

### Responsibilities

- chat endpoint,
- prompt construction,
- citation formatting,
- chat logs,
- chat UI,
- source rendering.

### Strict Rules

- answers must stay grounded in retrieved context,
- responses must be typed and source-aware,
- frontend must not display sensitive debug internals.

---

## Agent 14 — `qa-agent`

**Title:** QA, Security & Release Hardening Agent  
**Owned paths:**

- `**/*.test.*`
- `**/*.spec.*`
- `.github/workflows/**`
- release and validation notes

**Forbidden:** major feature rewrites without explicit handoff

### Responsibilities

- unit/integration/component tests,
- CI gating,
- regression checks,
- release checklist,
- smoke validations,
- security sanity checks.

### Strict Rules

- may add tests across domains,
- must not silently change production contracts while “fixing” tests,
- must fail the release if RBAC, type safety, or AI scope safety regress.

---

# 6. Parallel Work Policy

Parallel work is allowed **only** when owned paths do not overlap.

## 6.1 Safe Parallel Groups

### Group A — Foundation

Can run in parallel:

- `bootstrap-agent`
- `contracts-agent`
- `platform-agent`
- `ui-agent`

### Group B — Core Features

Can run in parallel after foundation contracts stabilize:

- `auth-agent`
- `org-agent`
- `projects-agent`
- `tasks-agent`

### Group C — Secondary Features

Can run in parallel after core models stabilize:

- `dashboard-agent`
- `notes-agent`
- `rag-ingest-agent`
- `rag-chat-agent` (only after AI contracts exist)

### Group D — QA

- `qa-agent` begins once at least one domain implementation exists
- final sweep occurs after all feature work stabilizes

## 6.2 Forbidden Parallel Cases

The following may **not** run in uncontrolled parallel mode:

1. `contracts-agent` and any agent depending on unstable shared DTOs without a contract freeze.
2. `tasks-agent` and `dashboard-agent` if dashboard metrics depend on changing task contracts.
3. `rag-ingest-agent` and `rag-chat-agent` before retrieval contracts are fixed.
4. any two agents modifying the same shared config or utility file simultaneously.

---

# 7. Integration Order

The official merge/integration order is:

1. `bootstrap-agent`
2. `contracts-agent`
3. `platform-agent`
4. `ui-agent`
5. `auth-agent`
6. `org-agent`
7. `projects-agent`
8. `tasks-agent`
9. `dashboard-agent`
10. `notes-agent`
11. `rag-ingest-agent`
12. `rag-chat-agent`
13. `qa-agent`
14. `pm-agent` final release review

No later-stage merge should proceed if an earlier dependency is still unstable.

---

# 8. Branch and Commit Policy

## 8.1 Branch Naming

Use focused branches only:

- `feat/auth-rbac`
- `feat/users-teams`
- `feat/projects`
- `feat/tasks-kanban`
- `feat/dashboard`
- `feat/announcements`
- `feat/ai-ingestion`
- `feat/ai-chat`
- `chore/tooling`
- `test/regression-rbac`

## 8.2 Commit Convention

Use clear scoped commits:

- `feat: add project membership service`
- `fix: correct member task scope filter`
- `refactor: extract ai citation formatter`
- `test: add auth middleware integration tests`
- `chore: enforce typed linting in CI`

## 8.3 Pull Request Rules

Every PR must include:

1. summary of change,
2. owned paths touched,
3. cross-domain impact,
4. validation performed,
5. screenshots if UI changed,
6. migration notes if contracts/schema changed.

---

# 9. Handoff Protocol

When an agent finishes a task that affects other agents, it must leave a handoff note.

## 9.1 Handoff Template

```text
Handoff From: <agent-name>
Affected Paths: <paths>
Changed Contracts: <yes/no + list>
Breaking Changes: <yes/no + list>
Next Recommended Agent: <agent-name>
Validation Performed: <typecheck/lint/test/build>
Notes: <important caveats>
```

## 9.2 Required Handoff Cases

Handoff is mandatory when:

- shared types changed,
- route contracts changed,
- query keys changed,
- validation schema changed,
- AI response structure changed,
- shared UI primitive props changed,
- middleware behavior changed.

---

# 10. Naming and Collision Prevention Rules

## 10.1 File Naming

- React components: `PascalCase.tsx`
- hooks: `useSomething.ts`
- utilities: `kebab-case.ts`
- models: `*.model.ts`
- controllers: `*.controller.ts`
- services: `*.service.ts`
- routes: `*.routes.ts`
- validators: `*.schema.ts`

## 10.2 Symbol Naming

- variables/functions: `camelCase`
- types/interfaces/enums/components: `PascalCase`
- constants: `UPPER_SNAKE_CASE`

## 10.3 Domain Prefix Rules

Prefer explicit domain prefixes for non-local variables and exported symbols:

### Auth

- `authUser`
- `authTokenPayload`
- `AuthGuard`

### Teams

- `teamRecord`
- `teamSummaryDto`

### Users

- `userRecord`
- `userStatusValue`

### Projects

- `projectRecord`
- `projectMemberIds`

### Tasks

- `taskRecord`
- `taskFilterState`
- `TaskStatusBadge`

### AI

- `aiChatMessage`
- `aiSourceCitation`
- `retrievalScopeFilter`
- `documentChunkRecord`

## 10.4 Forbidden Names

Avoid vague or collision-prone names outside tiny scopes:

- `data`
- `item`
- `obj`
- `value`
- `temp`
- `resultData`
- `misc`

Use precise names instead.

---

# 11. Quality Gates

No code is considered complete unless all relevant gates pass.

## 11.1 Mandatory Validation

At minimum, for touched scope:

- type-check passes
- lint passes
- tests pass or are updated
- build passes where relevant

## 11.2 Global Blockers

A merge must be blocked if any of the following occur:

- new `any` introduced,
- RBAC bypass introduced,
- scope filter regression,
- unauthorized AI retrieval possibility,
- broken shared contract,
- failing lint/type/test,
- duplicated shared abstraction,
- unstable route contract without coordinated updates.

---

# 12. AI / RAG Special Safety Clause

Because this repository includes a permission-aware internal assistant, the following are release-blocking violations:

1. retrieval without organization/team/project/role filters,
2. leaking chunks across unauthorized scope,
3. returning raw embedding data to clients,
4. answering with fabricated company policy when context is absent,
5. silently ignoring ingestion failures.

Any agent causing one of these violations must be blocked until corrected.

---

# 13. Human Contributor Policy

Human contributors following this file should behave like agents with owned paths.

If multiple human contributors work simultaneously:

- adopt the same ownership map,
- avoid editing another owner’s files without coordination,
- use focused branches,
- merge in integration order,
- respect handoff notes.

---

# 14. Emergency Conflict Resolution Policy

If two agents modify overlapping files or conflicting contracts:

1. freeze both branches,
2. identify the canonical owner,
3. restore the owner’s version as base,
4. replay only the necessary dependent changes,
5. re-run typecheck/lint/test,
6. record the conflict cause and prevention note.

Never resolve overlap by blindly combining both implementations.

---

# 15. Definition of Done

A task is done only if:

1. it respects owned paths,
2. it preserves strict typing,
3. it preserves validation,
4. it preserves RBAC and scope safety,
5. it passes relevant quality gates,
6. it includes downstream updates if contracts changed,
7. it includes tests when behavior changed,
8. it leaves no unresolved handoff obligations.

---

# 16. Final Commandment

All agents must act like disciplined senior engineers sharing one codebase.

Do not compete.  
Do not duplicate.  
Do not guess silently.  
Do not weaken guardrails.  
Do not break RBAC.  
Do not leak AI data across scopes.  
Do not merge failing code.

Build deliberately, integrate cleanly, and preserve ownership boundaries.
