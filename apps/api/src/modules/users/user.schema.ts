import { USER_ROLES, USER_STATUSES } from '@orgflow/shared-types';
import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  role: z.enum(USER_ROLES).optional(),
  teamId: z.string().nullable().optional(),
  themePreference: z.enum(['light', 'dark', 'system']).optional(),
});

// BUG-MEDIUM-3: restrict the status values an admin can explicitly set.
// 'pending' is an initial-invite state set by the system, not a valid
// target for a manual status update (it would re-lock invited users).
export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'disabled'] as const),
});

export const listUsersQuerySchema = z.object({
  teamId: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
