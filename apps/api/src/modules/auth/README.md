# Auth Module

## Purpose

Handles user authentication (login/logout), session retrieval, and invite-based user onboarding with rate-limited endpoints.

## Endpoints

| Method | Path                    | Auth | Role  | Description                             |
| ------ | ----------------------- | ---- | ----- | --------------------------------------- |
| POST   | `/auth/login`           | No   | Any   | Authenticate user, returns JWT          |
| GET    | `/auth/me`              | Yes  | Any   | Get current authenticated user profile  |
| POST   | `/auth/logout`          | Yes  | Any   | Logout current session                  |
| POST   | `/auth/invite`          | Yes  | Admin | Invite a new user to the organization   |
| POST   | `/auth/complete-invite` | No   | Any   | Complete invite registration with token |

## Files

- `auth.routes.ts` — Route definitions with rate-limiting for login and invite endpoints
- `auth.controller.ts` — Request handlers
- `auth.service.ts` — Business logic (login, invite, token issuance)
- `auth.schema.ts` — Zod validation for login, invite, and complete-invite payloads

## Key Behaviors

- Login and complete-invite endpoints are rate-limited (10/min and 20/min respectively) to mitigate brute-force attacks
- Invite tokens are SHA-256 hashed before storage and expire after 7 days
- Passwords are hashed with bcrypt at cost factor 12
- Only active users with a valid password hash can authenticate; disabled/pending users are rejected
