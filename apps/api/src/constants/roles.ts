// Re-exports from shared-types so backend code can import from a single
// local constants barrel without dipping into the package everywhere.
export { USER_ROLES, USER_STATUSES, ROLE_RANK, hasAtLeastRole } from '@orgflow/shared-types';
export type { UserRole, UserStatus } from '@orgflow/shared-types';
