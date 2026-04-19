# Announcements Module

## Purpose

Manages targeted announcements (organization/team/user-scoped) with read-state tracking and role-based creation rules.

## Endpoints

| Method | Path                      | Auth | Role         | Description                                     |
| ------ | ------------------------- | ---- | ------------ | ----------------------------------------------- |
| GET    | `/announcements`          | Yes  | Any          | List visible announcements (with unread filter) |
| GET    | `/announcements/:id`      | Yes  | Any          | Get a single announcement by ID                 |
| POST   | `/announcements`          | Yes  | Admin/Leader | Create a new announcement                       |
| PATCH  | `/announcements/:id`      | Yes  | Admin/Leader | Update an announcement                          |
| DELETE | `/announcements/:id`      | Yes  | Admin/Leader | Delete an announcement                          |
| POST   | `/announcements/:id/read` | Yes  | Any          | Mark an announcement as read                    |

## Files

- `announcement.routes.ts` — Route definitions
- `announcement.controller.ts` — Request handlers
- `announcement.service.ts` — Business logic with targeting and read-state
- `announcement.model.ts` — Mongoose schema for Announcement
- `announcement.schema.ts` — Zod validation for create/update/query inputs

## Key Behaviors

- Announcements can target an organization (all users), a specific team, or a specific user
- Admins can create any target; leaders can only post to their own team or individual users within it; members cannot create announcements
- Users only see announcements targeted at their organization, their team, or themselves
- Read-state is tracked per user via `readBy` array; supports `unreadOnly` query filter
