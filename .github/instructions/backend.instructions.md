---
applyTo: 'apps/api/src/**/*.ts,packages/shared-types/**/*.ts'
---

# Backend Instructions — OrgFlow AI

These instructions apply to all backend TypeScript code and shared contracts that affect backend behavior.

## Mission

Build a secure, strictly typed, modular Express + MongoDB backend with strong RBAC enforcement, clean service boundaries, and low-conflict collaboration.

## Hard Rules

1. Never use `any`, `as any`, `any[]`, or `Record<string, any>`.
2. Never trust raw request data.
3. Never place business logic in routes.
4. Never bypass validation.
5. Never enforce permissions only on the frontend.
6. Never perform organization/team/project queries without proper scope filtering.
7. Never return raw internal stack traces to clients.
8. Never duplicate DTOs, enums, or shared contracts when `packages/shared-types` is the right source of truth.

## Backend Architecture

### Layer Rules

#### Routes

- Register endpoints only.
- Compose middleware and delegate to controllers.
- No business logic.

#### Controllers

- Parse request context.
- Call service methods.
- Return normalized response envelopes.
- No complex domain logic.

#### Services

- Own domain/business logic.
- Own permission checks when relevant.
- Own orchestration across models.
- Throw typed operational errors when needed.

#### Models

- Define persistence shape and indexes.
- No controller logic.
- No request parsing.

#### Middleware

- Auth verification
- role checks
- scope derivation
- validation
- centralized error handling
- logging

## Type Safety Rules

- All exported functions must have explicit parameter and return types.
- Unknown external input must be narrowed safely.
- Environment variables must be parsed and validated.
- Shared response types should stay stable.
- Use enums or literal unions for statuses and roles.

## Validation Rules

Validate all external input using Zod or equivalent runtime schemas:

- request body
- query params
- route params
- env vars
- file upload metadata

Validation flow:

1. receive unknown input
2. validate
3. narrow to domain-safe type
4. pass to service layer

Never send `req.body` directly into Mongoose create/update calls.

## Error Handling Rules

- Use a central error middleware.
- Normalize error responses.
- Prefer operational error classes or equivalent structured error utilities.
- Preserve useful internal logging without leaking unsafe details to clients.

## Response Rules

Prefer consistent envelopes:

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Readable message"
  }
}
```

## Security and RBAC Rules

### Authentication

- JWT-based auth context must be derived from verified tokens only.
- Passwords must be hashed with bcryptjs.
- Never expose password hashes.

### Authorization

Roles:

- `admin`
- `leader`
- `member`

Authorization must be enforced on reads and writes.

### Scope Rules

All tenant-scoped resources must include `organizationId`.

Where relevant, also include:

- `teamId`
- `projectId`
- membership references
- assignment references

Do not query cross-tenant data accidentally.

### Query Filtering Expectations

- Admin: organization-wide
- Leader: organization + team scope
- Member: organization + explicit allowed scope (own assignment, team membership, project membership, or direct targeting)

## Domain Rules

### Users and Teams

- Admin owns user/team management.
- Team leaders must not gain organization-wide read/write powers accidentally.
- User status transitions should remain explicit (`pending`, `active`, `disabled`).

### Projects

- Projects are team-scoped unless explicitly designed otherwise.
- Membership and ownership logic must be explicit.

### Tasks

- Task status and priority must use consistent enums/literal unions.
- Overdue state should be computed or projected consistently.
- Comment ownership and visibility must stay tied to task access rules.

### Announcements

Target scope must be explicit:

- organization
- team
- user

Read access must respect the target rules.

## Database Rules

- Add indexes for common query paths.
- Keep schemas consistent with domain modeling.
- Avoid overly dynamic document shapes.
- Prefer explicit nullable fields over inconsistent presence/absence patterns when that improves readability.

### Mongoose Rules

- Keep schema definitions typed.
- Avoid untyped document mutation patterns.
- Prefer lean reads when only plain objects are needed.

## Logging Rules

Log these categories clearly:

- request lifecycle
- auth failures
- permission denials
- validation failures
- ingestion status
- AI chat duration and source counts
- unexpected exceptions

Do not log secrets or tokens.

## Shared Types and DTO Rules

Use `packages/shared-types` for:

- roles
- task statuses
- priorities
- common response shapes
- shared DTOs
- cross-app enums and domain types

Do not redefine shared enums in multiple places.

## Naming and Anti-Conflict Rules

### Files

- routes: `*.routes.ts`
- controllers: `*.controller.ts`
- services: `*.service.ts`
- models: `*.model.ts`
- validation: `*.schema.ts`

### Symbols

- variables/functions: `camelCase`
- types/interfaces/enums/classes: `PascalCase`
- constants: `UPPER_SNAKE_CASE`

### Domain-Aware Names

Prefer precise names like:

- `taskRecord`
- `projectMembershipFilter`
- `announcementTargetType`
- `authPayload`

Avoid vague symbols like `data`, `obj`, `item`, `temp` unless trivially local.

## Testing Expectations

Add or update tests when touching:

- auth logic
- RBAC and scope filters
- task overdue behavior
- announcement targeting behavior
- shared response helpers
- schema validation edge cases

## Completion Checklist

Before considering backend work complete:

1. TypeScript passes with no errors.
2. ESLint passes with no errors.
3. No `any` was introduced.
4. Validation exists for new inputs.
5. RBAC and scope rules are preserved.
6. Shared contracts were reused instead of duplicated.
7. Errors are normalized and safe.
