# Users Module

## Purpose

Manages organization-scoped user listing, profile retrieval, updates, and status changes with role-based visibility filtering.

## Endpoints

| Method | Path                | Auth | Role  | Description                                     |
| ------ | ------------------- | ---- | ----- | ----------------------------------------------- |
| GET    | `/users`            | Yes  | Any   | List users in the organization (scoped by role) |
| GET    | `/users/:id`        | Yes  | Any   | Get a single user by ID                         |
| PATCH  | `/users/:id`        | Yes  | Any   | Update a user (name, role, theme, teamId)       |
| PATCH  | `/users/:id/status` | Yes  | Admin | Update user active/disabled status              |

## Files

- `user.routes.ts` — Route definitions
- `user.controller.ts` — Request handlers
- `user.service.ts` — Business logic with scoped queries
- `user.model.ts` — Mongoose schema for User
- `user.schema.ts` — Zod validation for query/body inputs

## Key Behaviors

- Admins see all users in the organization; leaders see only their team's users; members see only collaborators they share a project or task with
- Members can only retrieve their own profile via `GET /users/:id`; accessing other users outside shared projects is forbidden
- Role and status changes are audit-logged; only admins can promote to admin or disable users
- User listing supports filtering by role, status, and teamId query parameters
