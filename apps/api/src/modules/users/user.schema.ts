import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  role: z.enum(['admin', 'leader', 'member']).optional(),
  teamId: z.string().nullable().optional(),
  themePreference: z.enum(['light', 'dark', 'system']).optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'disabled']),
});

export const listUsersQuerySchema = z.object({
  teamId: z.string().optional(),
  role: z.enum(['admin', 'leader', 'member']).optional(),
  status: z.enum(['pending', 'active', 'disabled']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
