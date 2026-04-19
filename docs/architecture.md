# OrgFlow AI — Architecture Overview

## Monorepo Structure

OrgFlow AI is an npm workspaces monorepo (`node >=20.11.0`):

```
orgflow-ai/
├── apps/
│   ├── api/          # Express REST API (@orgflow/api)
│   └── web/          # React SPA (@orgflow/web)
├── packages/
│   ├── shared-types/ # Cross-app DTOs, enums, Zod schemas (@orgflow/shared-types)
│   ├── ui/           # Shared React component library (@orgflow/ui)
│   └── shared-config/# Shared TS/ESLint config (@orgflow/shared-config)
├── docs/             # Architecture & developer documentation
├── tsconfig.base.json
├── eslint.config.mjs
└── package.json
```

All workspaces share a single lockfile and a strict `tsconfig.base.json` with `noUncheckedIndexedAccess`, `strictNullChecks`, and no implicit `any`.

## Backend — `apps/api`

| Concern    | Technology                                    |
| ---------- | --------------------------------------------- |
| Runtime    | Node.js 20+                                   |
| Framework  | Express 4                                     |
| Language   | TypeScript 5 (strict)                         |
| Database   | MongoDB via Mongoose 8                        |
| Auth       | JWT (`jsonwebtoken`) + `bcryptjs`             |
| Validation | Zod (all request bodies, queries, params)     |
| Security   | Helmet, CORS allow-list, `express-rate-limit` |
| Logging    | Morgan (dev/combined) + correlation IDs       |
| Testing    | Vitest + MongoDB Memory Server                |
| API Docs   | Swagger UI (non-production)                   |

### Request Lifecycle

```
Client → Helmet → CORS → JSON parser → Correlation ID → Morgan
       → Rate Limiter → Router → Auth Middleware → Role Guard
       → Zod Validation → Controller → Service → Mongoose → MongoDB
       → Response Wrapper → Error Handler
```

The API base path is `/api/v1`. Health (`/health`) and readiness (`/ready`) endpoints are outside the versioned path.

### Module Layout

Each domain module follows:

```
modules/<domain>/
  ├── <domain>.model.ts       # Mongoose schema
  ├── <domain>.service.ts     # Business logic
  ├── <domain>.controller.ts  # Request/response handling
  ├── <domain>.routes.ts      # Express router
  └── <domain>.schema.ts      # Zod validation schemas
```

## Frontend — `apps/web`

| Concern       | Technology                     |
| ------------- | ------------------------------ |
| Framework     | React 18                       |
| Bundler       | Vite 5                         |
| Routing       | React Router 6                 |
| Data Fetching | TanStack Query 5               |
| Styling       | Tailwind CSS 3                 |
| Language      | TypeScript (strict)            |
| Testing       | Vitest + React Testing Library |

### App Shell

```
<AppErrorBoundary>
  <ThemeProvider>          ← dark/light mode
    <QueryClientProvider>  ← TanStack Query cache
      <BrowserRouter>
        <AppRoutes />      ← route config with AuthGuard / RoleGuard
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
</AppErrorBoundary>
```

Protected routes are wrapped in `<AuthGuard>`. Admin-only pages (Teams, Users, Knowledge) use `<RoleGuard minRole="admin">`.

## Shared Types — `packages/shared-types`

Single source of truth for cross-app contracts. Exports:

| Module                       | Contents                                                  |
| ---------------------------- | --------------------------------------------------------- |
| `roles.ts`                   | `UserRole`, `UserStatus`, `ROLE_RANK`, `hasAtLeastRole()` |
| `auth.ts` / `auth.schema.ts` | Login/invite DTOs, token payload                          |
| `user.ts`                    | User DTOs                                                 |
| `team.ts`                    | Team DTOs                                                 |
| `project.ts`                 | Project DTOs                                              |
| `task.ts`                    | Task DTOs, status/priority enums                          |
| `announcement.ts`            | Announcement DTOs                                         |
| `dashboard.ts`               | Dashboard stat types                                      |
| `organization.ts`            | Organization DTOs                                         |
| `ai.ts`                      | Chat message, document, citation types                    |
| `api.ts`                     | Generic API response wrappers                             |

Both `apps/api` and `apps/web` import from `@orgflow/shared-types`. No duplicate type definitions are allowed across workspaces.

## AI / RAG Pipeline

| Component    | Detail                                                               |
| ------------ | -------------------------------------------------------------------- |
| LLM          | Ollama — `gemma3` model                                              |
| Embeddings   | Ollama — `nomic-embed-text`                                          |
| Vector Store | MongoDB Atlas Vector Search                                          |
| Ingestion    | Upload → parse → chunk → embed → store with scope metadata           |
| Retrieval    | Permission-aware: filters by `organizationId`, `teamId`, `projectId` |

All retrieval queries include scope metadata filters so users only see documents they are authorized to access. Raw embeddings are never exposed to clients.

## Security Summary

- **Authentication**: JWT Bearer tokens, Zod-validated payloads, bcrypt password hashing
- **Authorization**: RBAC middleware (`admin > leader > member`) + scope filters
- **Transport**: Helmet security headers, CORS origin allow-list (never `*`)
- **Rate Limiting**: Global 300 req/min + stricter per-route limits on auth and AI endpoints
- **Validation**: Zod schemas on all external input (body, query, params)
- **Logging**: Correlation IDs on every request, no sensitive data in logs
- **Secrets**: Environment variables only, no hardcoded credentials
