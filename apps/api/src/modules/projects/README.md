# Projects Module

## Purpose

Manages project CRUD with organization/team scoping, membership control, and role-based access enforcement.

## Endpoints

| Method | Path            | Auth | Role         | Description                    |
| ------ | --------------- | ---- | ------------ | ------------------------------ |
| GET    | `/projects`     | Yes  | Any          | List projects (scoped by role) |
| GET    | `/projects/:id` | Yes  | Any          | Get a single project by ID     |
| POST   | `/projects`     | Yes  | Admin/Leader | Create a new project           |
| PATCH  | `/projects/:id` | Yes  | Admin/Leader | Update a project               |
| DELETE | `/projects/:id` | Yes  | Admin/Leader | Delete a project               |

## Files

- `project.routes.ts` — Route definitions
- `project.controller.ts` — Request handlers
- `project.service.ts` — Business logic with team-scoped queries
- `project.model.ts` — Mongoose schema for Project
- `project.schema.ts` — Zod validation for create/update/query inputs

## Key Behaviors

- Admins see all projects org-wide; leaders see only their team's projects; members see only projects they are a member of
- Project members must belong to the same team as the project (BE-H-002 cross-team safety check)
- Leaders can only create/update/delete projects within their own team
- Supports search filtering by title, status, and teamId query parameters
