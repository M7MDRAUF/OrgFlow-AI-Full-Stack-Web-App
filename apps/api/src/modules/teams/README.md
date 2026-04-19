# Teams Module

## Purpose

Provides CRUD operations for teams within an organization, including leader assignment and membership management.

## Endpoints

| Method | Path         | Auth | Role  | Description                               |
| ------ | ------------ | ---- | ----- | ----------------------------------------- |
| GET    | `/teams`     | Yes  | Any   | List all teams in the organization        |
| GET    | `/teams/:id` | Yes  | Any   | Get a single team by ID                   |
| POST   | `/teams`     | Yes  | Admin | Create a new team                         |
| PATCH  | `/teams/:id` | Yes  | Admin | Update a team (name, description, leader) |
| DELETE | `/teams/:id` | Yes  | Admin | Delete a team                             |

## Files

- `team.routes.ts` — Route definitions
- `team.controller.ts` — Request handlers
- `team.service.ts` — Business logic with org-scoped queries
- `team.model.ts` — Mongoose schema for Team
- `team.schema.ts` — Zod validation for create/update inputs

## Key Behaviors

- All roles can list/view teams within their organization (members need team context for UI selectors)
- Only admins can create, update, or delete teams
- Team deletion is rejected if the team still has members or projects (H-003 safety check)
- Leader assignment validates that the leader user exists within the same organization
