# OrgFlow AI

Role-based MERN + TypeScript platform with permission-aware retrieval-augmented chat over internal documents.

## Stack

- **Monorepo**: npm workspaces, TypeScript 5.6 (strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`)
- **Backend** (`apps/api`): Node 20, Express 4, MongoDB via Mongoose 8, Zod 3, JWT, bcrypt, Multer, Pino
- **Frontend** (`apps/web`): React 18, Vite 5, TanStack Query 5, React Router 6, Tailwind, dnd-kit
- **Shared** (`packages/shared-types`, `packages/ui`, `packages/shared-config`)
- **AI**: Ollama (chat + embeddings) with deterministic fallback so the app stays functional offline
- **Tooling**: ESLint 9 (flat, strict + stylistic type-checked), Prettier, Vitest 2

## Prerequisites

- Node.js **>=20.11**
- MongoDB (local instance or Atlas)
- Optional: [Ollama](https://ollama.com) with models `gemma3` and `nomic-embed-text` for real RAG answers. Without it the app falls back to deterministic embeddings and an extractive top-chunk answer.

## Getting started

```bash
npm install

# Create apps/api/.env (see variables below)

npm run build -w @orgflow/shared-types
npm run seed -w @orgflow/api        # seed demo org + users + project + tasks
npm run dev:api                     # API on http://localhost:4000/api/v1
npm run dev:web                     # Web on http://localhost:5173
```

### Seeded credentials (password `Password123!`)

| Email            | Role   | Scope          |
| ---------------- | ------ | -------------- |
| admin@acme.test  | admin  | Acme Corp      |
| leader@acme.test | leader | team: Platform |
| member@acme.test | member | team: Platform |

### API environment (`apps/api/.env`)

```
NODE_ENV=development
PORT=4000
API_BASE_PATH=/api/v1
MONGODB_URI=mongodb://localhost:27017/orgflow
JWT_SECRET=replace-with-a-strong-at-least-16-char-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
OLLAMA_HOST=http://localhost:11434
OLLAMA_CHAT_MODEL=gemma3
OLLAMA_EMBED_MODEL=nomic-embed-text
MAX_UPLOAD_SIZE_MB=10
LOG_LEVEL=info
```

### Web environment (`apps/web/.env`)

```
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Scripts

Run from the repository root unless noted.

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev:api`   | Start the API with hot reload                        |
| `npm run dev:web`   | Start the web app with Vite                          |
| `npm run build`     | Build shared-types, api, and web                     |
| `npm run typecheck` | TypeScript project references across all workspaces  |
| `npm run lint`      | ESLint (type-aware) across the monorepo              |
| `npm run format`    | Prettier write                                       |
| `npm run test`      | Vitest (api unit + integration, web component tests) |
| `npm run gates`     | typecheck + lint + format:check + test               |

## Architecture overview

```
apps/
  api/                  Express + Mongoose backend
    src/app/            bootstrap, env, router, error/notFound handlers
    src/middleware/     auth, rbac, validation, error
    src/modules/
      auth/             login, invite, me, RBAC helpers
      users/ teams/     CRUD + role scoping
      projects/ tasks/  CRUD + Kanban status transitions
      dashboard/        admin/leader/member aggregated views
      announcements/    org/team/user scoped notices
      ai/
        documents/      upload, parse (txt/md/pdf), chunk, embed, index
        chat/           retrieval + prompt build + cited answers + history
  web/                  React + Vite SPA
    src/features/       auth, users, teams, projects, tasks, dashboard,
                        announcements, ai (documents + assistant)
    src/components/     shared layout (navbar, sidebar, provider)
packages/
  shared-types/         DTOs, enums, response wrappers
  ui/                   source-only primitives (Button, Badge, Modal, …)
  shared-config/        base tsconfigs
```

### RBAC & data scoping

Every request is tagged with `{ userId, organizationId, teamId, role }` after JWT verification. Services filter by `organizationId` unconditionally, and:

- **admin**: full organization scope
- **leader**: own team and projects they belong to
- **member**: projects they are a member of; tasks they own or are assigned to

The same filters are applied to AI retrieval (see `apps/api/src/modules/ai/retrieval.ts`) so document chunks never leak across scope or role.

### AI pipeline

1. Upload (`POST /ai/documents`): file → extract text → chunk (~800 tokens, 100 overlap) → embed via Ollama (fallback: deterministic 384-dim normalized vector) → persist chunks with `organizationId`, `teamId`, `projectId`, `visibility`, `allowedRoles`.
2. Ask (`POST /ai/chat`): embed question → cosine-rank chunks that pass the scope filter → build a citation-forced prompt → call Ollama chat (fallback: extractive top-chunk) → persist user + assistant messages with sources.
3. Retrieval never returns raw embeddings to the client; only `{ documentId, title, chunkIndex, excerpt }` citations.

## Testing

- `apps/api`: Vitest runs unit tests (`src/**/*.test.ts`) and integration tests (`test/**/*.test.ts` using `mongodb-memory-server` + `supertest`).
- `apps/web`: Vitest + Testing Library + jsdom for component tests.

```bash
npm run test                       # both workspaces
npm run test -w @orgflow/api
npm run test -w @orgflow/web
```

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs typecheck, lint, test, and build on every push / PR against `main`.

## Conventions

- No `any` / `as any`; validate all external input with Zod at route boundaries.
- Shared enums and DTOs live in `@orgflow/shared-types` and are the single source of truth.
- Frontend state: TanStack Query for server state; small React context only for auth.
- UI primitives come from `@orgflow/ui`; feature-specific components live under `apps/web/src/features/<domain>`.

## License

Proprietary — internal OrgFlow AI project.
