# Organizations Module

## Purpose

Provides read and update access to the current user's organization (tenant boundary derived from JWT).

## Endpoints

| Method | Path                     | Auth | Role  | Description                            |
| ------ | ------------------------ | ---- | ----- | -------------------------------------- |
| GET    | `/organizations/current` | Yes  | Any   | Get the current user's organization    |
| PATCH  | `/organizations/current` | Yes  | Admin | Update the current organization (name) |

## Files

- `organization.routes.ts` — Route definitions
- `organization.controller.ts` — Request handlers
- `organization.service.ts` — Business logic for org retrieval and update
- `organization.model.ts` — Mongoose schema for Organization
- `organization.schema.ts` — Zod validation for update input

## Key Behaviors

- Only "current org" endpoints are exposed; there is no multi-org listing (single-tenant per JWT)
- Any authenticated user can read their organization details
- Only admins can update the organization name
- Organization ID is always derived from the JWT token, never from request parameters
