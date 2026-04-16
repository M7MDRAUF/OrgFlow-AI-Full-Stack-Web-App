// Roles & RBAC primitives — single source of truth (AGENTS.md §3.5, §4.2).
export const USER_ROLES = ['admin', 'leader', 'member'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['pending', 'active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ROLE_RANK: Readonly<Record<UserRole, number>> = {
  member: 1,
  leader: 2,
  admin: 3,
};

export function hasAtLeastRole(current: UserRole, required: UserRole): boolean {
  return ROLE_RANK[current] >= ROLE_RANK[required];
}
