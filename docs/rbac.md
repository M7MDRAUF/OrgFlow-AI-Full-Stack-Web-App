# OrgFlow AI — Role-Based Access Control (RBAC)

## Roles

Three roles exist, defined in `@orgflow/shared-types` (`roles.ts`):

| Role     | Rank | Description                                                          |
| -------- | ---- | -------------------------------------------------------------------- |
| `admin`  | 3    | Full organization access. Can manage users, teams, and org settings. |
| `leader` | 2    | Manages their assigned team and its resources.                       |
| `member` | 1    | Assigned tasks and team-scoped data only.                            |

```ts
const USER_ROLES = ['admin', 'leader', 'member'] as const;
type UserRole = (typeof USER_ROLES)[number];
```

### Role Hierarchy

Role comparison uses numeric rank:

```ts
const ROLE_RANK: Record<UserRole, number> = {
  member: 1,
  leader: 2,
  admin: 3,
};

function hasAtLeastRole(current: UserRole, required: UserRole): boolean {
  return ROLE_RANK[current] >= ROLE_RANK[required];
}
```

An `admin` satisfies any role check. A `member` only satisfies `member`-level checks.

## Authentication Layer

**Middleware:** `authMiddleware` (`auth.middleware.ts`)

1. Extracts `Bearer <token>` from the `Authorization` header.
2. Verifies JWT signature against `JWT_SECRET`.
3. Validates the decoded payload with Zod:
   ```ts
   { sub: string, organizationId: string, teamId: string | null, role: UserRole }
   ```
4. Attaches an `AuthContext` object to `req.auth`.

If any step fails, a `401 Unauthenticated` error is returned.

## Route Guards

**Middleware:** `requireRole(minRole)` (`role.middleware.ts`)

Applied per-route to enforce minimum role:

```ts
router.post('/invite', authMiddleware, requireRole('admin'), controller.invite);
```

If the caller's role rank is below the required minimum, a `403 Forbidden` error is returned.

### Route-Level Role Requirements

| Route                          | Minimum Role                      |
| ------------------------------ | --------------------------------- |
| `POST /auth/invite`            | `admin`                           |
| `PATCH /organizations/current` | `admin`                           |
| All other authenticated routes | `member` (any authenticated user) |

Frontend mirrors these guards with `<RoleGuard minRole="admin">` on Teams, Users, and Knowledge pages.

## Scope Filtering

**Module:** `scope.middleware.ts`

Scope helpers produce MongoDB filter objects that restrict query results based on the caller's auth context. This ensures data isolation at the service layer — not the frontend.

### Organization Scope

Every query includes `{ organizationId: auth.organizationId }`. Users never see data from other organizations.

### Team Scope — `scopeTeamFilter(auth, opts?)`

| Role     | Filter Behavior                                                      |
| -------- | -------------------------------------------------------------------- |
| `admin`  | Organization-wide. Optional `teamId` filter if explicitly requested. |
| `leader` | Restricted to their own `teamId`. Cannot access other teams.         |
| `member` | Restricted to their own `teamId`.                                    |

If a leader or member has no assigned team (`teamId: null`), they see no team-scoped results.

### Assignee Scope — `scopeAssigneeFilter(auth)`

Extends team scope for task visibility:

| Role     | Filter Behavior                                         |
| -------- | ------------------------------------------------------- |
| `admin`  | All tasks in the organization                           |
| `leader` | All tasks in their team                                 |
| `member` | Only tasks assigned to them (`assignedTo: auth.userId`) |

## AI Retrieval Scope

The RAG pipeline enforces the same scope rules. When a user sends a chat message:

1. The retrieval query includes metadata filters for `organizationId` and `teamId`.
2. Vector search results are filtered to only return document chunks the user is authorized to see.
3. Members only see chunks from documents associated with their team/projects.
4. Admins see all chunks within the organization.

**Release-blocking violations** (per `AGENTS.md §12`):

- Retrieval without organization/team/project filters
- Leaking chunks across unauthorized scopes
- Returning raw embedding data to clients
- Fabricating answers when no context is found
- Silently ignoring ingestion failures

## Summary Flow

```
Request → authMiddleware (JWT verify → req.auth)
        → requireRole(minRole)  [if route requires elevated role]
        → Controller
        → Service calls scopeTeamFilter(req.auth) / scopeAssigneeFilter(req.auth)
        → Mongoose query with scope filter applied
        → Only authorized data returned
```
