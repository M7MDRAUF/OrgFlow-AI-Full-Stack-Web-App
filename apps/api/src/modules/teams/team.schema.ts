import { z } from 'zod';

export const listTeamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional(),
  leaderId: z.string().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).nullable().optional(),
  leaderId: z.string().nullable().optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
