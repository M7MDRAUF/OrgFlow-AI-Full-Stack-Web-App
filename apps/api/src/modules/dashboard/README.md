# Dashboard Module

## Purpose

Provides role-specific aggregated statistics and summaries for admin, leader, and member dashboards.

## Endpoints

| Method | Path         | Auth | Role | Description                                   |
| ------ | ------------ | ---- | ---- | --------------------------------------------- |
| GET    | `/dashboard` | Yes  | Any  | Get dashboard statistics for the current user |

## Files

- `dashboard.routes.ts` — Route definitions
- `dashboard.controller.ts` — Request handler
- `dashboard.service.ts` — Aggregation logic (admin/leader/member dashboards)
- `dashboard.schema.ts` — Zod validation for optional teamId/projectId query params

## Key Behaviors

- Admin dashboard returns org-wide stats: team count, user count, project count, task breakdown by status, overdue counts, and per-team summaries
- Leader dashboard returns team-scoped stats with per-project task summaries
- Member dashboard returns personal task counts and assigned project summaries
- All overdue computations use a single `now` timestamp per request to prevent drift across parallel queries (F-005)
