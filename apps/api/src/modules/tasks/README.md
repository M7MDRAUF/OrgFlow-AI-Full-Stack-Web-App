# Tasks Module

## Purpose

Handles task CRUD, status transitions, comments, and filtering with project/team/org scoping and Kanban-friendly status management.

## Endpoints

| Method | Path                  | Auth | Role                  | Description                              |
| ------ | --------------------- | ---- | --------------------- | ---------------------------------------- |
| GET    | `/tasks`              | Yes  | Any                   | List tasks with filters (scoped by role) |
| GET    | `/tasks/:id`          | Yes  | Any                   | Get a single task by ID                  |
| POST   | `/tasks`              | Yes  | Admin/Leader          | Create a new task                        |
| PATCH  | `/tasks/:id`          | Yes  | Admin/Leader/Assignee | Update a task                            |
| PATCH  | `/tasks/:id/status`   | Yes  | Admin/Leader/Assignee | Update task status                       |
| DELETE | `/tasks/:id`          | Yes  | Admin/Leader          | Delete a task                            |
| GET    | `/tasks/:id/comments` | Yes  | Any                   | List comments for a task                 |
| POST   | `/tasks/:id/comments` | Yes  | Any                   | Add a comment to a task                  |

## Files

- `task.routes.ts` — Route definitions
- `task.controller.ts` — Request handlers
- `task.service.ts` — Business logic with project-scoped queries
- `task.model.ts` — Mongoose schema for Task and TaskComment
- `task.schema.ts` — Zod validation for create/update/query/comment inputs

## Key Behaviors

- Members see tasks assigned to them or in projects they belong to; leaders see all tasks in their team; admins see all org tasks
- Overdue status is computed dynamically: a task is overdue if its due date has passed and status is not `done`
- Comment counts are batch-aggregated in a single query to avoid N+1 when listing tasks
- Members can only mutate tasks assigned to them; leaders can mutate all tasks in their team
