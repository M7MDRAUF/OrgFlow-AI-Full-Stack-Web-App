# OrgFlow AI — Developer Guide

## Prerequisites

| Tool    | Version       | Purpose                                |
| ------- | ------------- | -------------------------------------- |
| Node.js | ≥ 20.11.0     | Runtime                                |
| npm     | ≥ 10          | Package manager (workspaces)           |
| MongoDB | 7+ (or Atlas) | Database (Memory Server used in tests) |
| Ollama  | Latest        | Local LLM + embeddings                 |

### Ollama Models

Pull the required models before starting the API:

```bash
ollama pull gemma3
ollama pull nomic-embed-text
```

## Setup

```bash
# 1. Clone the repository
git clone <repo-url> && cd orgflow-ai

# 2. Install all workspace dependencies
npm install

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your MongoDB URI, JWT_SECRET, Ollama URL, etc.

# 4. Seed the database (creates org, admin user, sample data)
npm run seed -w @orgflow/api

# 5. Start development servers
npm run dev:api   # Express API on port 4000
npm run dev:web   # Vite dev server on port 5173
```

## Scripts

Run from the repository root:

| Script                 | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run dev:api`      | Start API in watch mode                             |
| `npm run dev:web`      | Start frontend dev server                           |
| `npm run build`        | Build shared-types → API → web                      |
| `npm run typecheck`    | Run `tsc --noEmit` across all workspaces            |
| `npm run lint`         | ESLint across entire monorepo                       |
| `npm run lint:fix`     | ESLint with auto-fix                                |
| `npm run format`       | Prettier format all files                           |
| `npm run format:check` | Prettier check (CI)                                 |
| `npm run test`         | Run Vitest in API and web workspaces                |
| `npm run gates`        | Full quality gate: typecheck + lint + format + test |
| `npm run clean`        | Remove all `dist/` directories                      |
| `npm run audit:deps`   | Run `npm audit` (dev deps excluded)                 |

## Workspace Structure

```
orgflow-ai/
├── apps/
│   ├── api/               # @orgflow/api — Express REST backend
│   │   ├── src/
│   │   │   ├── app/       # App bootstrap, router, env
│   │   │   ├── config/    # DB connection, Swagger, Ollama
│   │   │   ├── constants/ # Shared constants
│   │   │   ├── middleware/ # Auth, role, scope, error, validation
│   │   │   ├── modules/   # Domain modules (auth, users, teams, ...)
│   │   │   └── utils/     # Response helpers, errors, logger
│   │   ├── test/          # Integration & unit tests
│   │   └── scripts/       # Seed script
│   └── web/               # @orgflow/web — React SPA
│       └── src/
│           ├── app/       # Shell, router, providers, layout
│           ├── features/  # Domain features (auth, tasks, ai, ...)
│           ├── lib/       # API client, query-client config
│           └── styles/    # Tailwind base styles
├── packages/
│   ├── shared-types/      # @orgflow/shared-types — DTOs, enums, Zod schemas
│   ├── ui/                # @orgflow/ui — Shared React components
│   └── shared-config/     # @orgflow/shared-config — TS/ESLint presets
└── docs/                  # Architecture documentation
```

## Git Hooks

Managed via **Husky** (installed on `npm install` via `prepare` script).

### Pre-commit — `lint-staged`

Runs on staged files before every commit:

| File Pattern               | Actions                                             |
| -------------------------- | --------------------------------------------------- |
| `*.{ts,tsx}`               | `eslint --fix --max-warnings 0`, `prettier --write` |
| `*.{json,md,css,yml,yaml}` | `prettier --write`                                  |

### Commit Message — `commitlint`

Enforces [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add project membership service
fix: correct member task scope filter
refactor: extract ai citation formatter
test: add auth middleware integration tests
chore: enforce typed linting in CI
```

## Testing

| Tool                  | Purpose                                     |
| --------------------- | ------------------------------------------- |
| Vitest                | Test runner (both API and web)              |
| MongoDB Memory Server | In-memory MongoDB for API integration tests |
| React Testing Library | Component tests (web)                       |

### Running Tests

```bash
# All tests
npm run test

# API tests only
npm run test -w @orgflow/api

# Web tests only
npm run test -w @orgflow/web

# Watch mode (in workspace)
cd apps/api && npx vitest --watch
```

### Test Files

API tests live in `apps/api/test/` and cover:

- Auth integration (`auth.integration.test.ts`)
- Middleware (`middleware.test.ts`)
- Service tests per domain (tasks, projects, teams, users, dashboard, announcements)
- RBAC scope tests (`retrieval.rbac.test.ts`, `users-scope.integration.test.ts`)
- AI document ingestion (`document-service.test.ts`, `document-upload.integration.test.ts`)
- Chat history scope (`chat-history.scope.test.ts`)

## Quality Gates

The `npm run gates` command runs all checks required before merge:

1. **Typecheck** — `tsc --noEmit` (strict, no `any`)
2. **Lint** — ESLint with zero warnings
3. **Format** — Prettier consistency check
4. **Test** — Full Vitest suite

CI and human reviewers should block merges if any gate fails.
