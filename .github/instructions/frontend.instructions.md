---
applyTo: 'apps/web/src/**/*.{ts,tsx},packages/ui/**/*.{ts,tsx}'
---

# Frontend Instructions — OrgFlow AI

These instructions apply to all frontend and shared UI code in this repository.

## Mission

Build a clean, production-grade React + TypeScript frontend with strict typing, predictable state, accessible UI, and low-conflict collaboration.

## Hard Rules

1. Never use `any`, `as any`, `any[]`, or `Record<string, any>`.
2. Never fetch data directly from page components if a feature-level API hook or typed client is more appropriate.
3. Never duplicate shared UI primitives or utility hooks.
4. Never put business logic in presentational components.
5. Never bypass backend RBAC assumptions on the client. The client reflects permissions; it does not enforce security.
6. Never introduce inconsistent naming, component duplication, or styling fragmentation.
7. Always preserve dark mode compatibility.
8. Always keep loading, empty, success, and error states explicit.

## Frontend Architecture

Follow this structure:

- `app/` for router, providers, and app bootstrap
- `components/` for shared UI and layout primitives
- `features/` for domain-owned logic and components
- `pages/` for route containers only
- `lib/` for API client, utilities, query client, auth storage
- `hooks/` for shared hooks only when truly cross-feature

### Layering Rules

- Pages compose feature containers.
- Feature folders own domain-specific UI, hooks, queries, and mutations.
- Shared components must remain generic and reusable.
- Route components must stay thin.
- API calls go through a typed API client or feature-level service wrapper.

## React Rules

### Components

- Use functional components only.
- Use `PascalCase.tsx` for component files.
- Keep components focused and small.
- Extract repeated JSX into reusable components.
- Prefer composition over prop explosion.
- Avoid deeply nested anonymous render logic.

### Hooks

- Prefix hooks with `use`.
- Keep feature hooks inside their feature unless truly shared.
- Do not create generic hooks that hide critical behavior.
- Avoid hooks with unstable dependency patterns.

### Props and Types

- Define explicit props types.
- Export prop types only when consumers need them.
- Prefer narrow unions and domain enums over stringly-typed props.
- Use shared types from `packages/shared-types` whenever possible.

## State Management

Use the correct state tool for the correct job:

- TanStack Query for server state
- local component state for ephemeral UI
- Context only for app-wide concerns such as auth and theme

Do not build a large global store unless there is a strong architectural need.

### TanStack Query Rules

- Query keys must be consistent and feature-scoped.
- Mutations must invalidate or update only the necessary queries.
- Prefer optimistic updates only when rollback is clearly implemented.
- Normalize API error handling in one place.

## Routing Rules

- Use role-aware protected layouts and route guards.
- Admin, leader, and member routes must remain clearly separated.
- Do not hardcode route strings in multiple places if a route helper can reduce drift.
- Route pages should not contain raw API request orchestration when a feature hook can own it.

## UI / UX Rules

### Accessibility

- Every interactive element must be keyboard accessible.
- Icon-only buttons must have accessible labels.
- Inputs must have labels.
- Modal/dialog components must handle focus correctly.
- Error messages must be readable and tied to the relevant input.

### Visual Consistency

- Reuse spacing, radius, colors, shadows, and typography conventions.
- Prefer shared design tokens and class composition helpers.
- Do not hardcode arbitrary colors when semantic colors already exist.
- Ensure light and dark themes remain visually consistent.

### Required UX States

Every data-driven screen should support:

- loading state
- empty state
- error state
- success feedback where relevant

## Forms and Validation

- Validate user input with Zod or shared schemas when appropriate.
- Keep form defaults typed.
- Do not submit unvalidated payloads.
- Keep form field names aligned with API DTOs when possible.

## Naming and Anti-Conflict Rules

### Files

- Components: `PascalCase.tsx`
- Hooks: `useSomething.ts`
- Feature utilities: `kebab-case.ts`

### Symbols

- variables/functions: `camelCase`
- components/types/enums/interfaces: `PascalCase`
- constants: `UPPER_SNAKE_CASE`

### Domain Prefixes

Prefer domain-aware names to avoid collisions:

- `authUser`
- `teamRecord`
- `projectRecord`
- `taskFilterState`
- `aiChatMessage`

Avoid vague names like `data`, `item`, `value`, `temp` except inside tiny obvious scopes.

## Styling Rules

- Use Tailwind consistently.
- Prefer utility composition helpers instead of long duplicated class strings.
- Keep layout primitives reusable.
- Do not mix conflicting styling strategies in the same area.

## Feature-Specific Rules

### Dashboard

- Keep dashboard cards presentational and data hooks separate.
- Stats formatting must be deterministic and typed.

### Tasks / Kanban

- Drag-and-drop logic must be isolated from card rendering.
- Status updates must map cleanly to backend enums.
- Overdue display logic must remain consistent with backend semantics.

### Announcements

- Visibility must reflect target scope.
- Read state should be explicit.

### AI Chat UI

- Chat message state must be typed.
- Source citations must be rendered clearly.
- Never expose raw embeddings or internal retrieval debug data in the UI.

## Test Expectations

When adding or changing frontend logic, add or update tests for:

- route protection behavior
- critical feature hooks
- loading/error/empty states
- task filters and task status transitions
- AI chat message rendering and source presentation

## Completion Checklist

Before considering frontend work complete:

1. TypeScript passes with no errors.
2. ESLint passes with no errors.
3. No `any` was introduced.
4. UI supports dark mode.
5. Accessibility basics are preserved.
6. The change follows feature ownership and does not duplicate shared components.
