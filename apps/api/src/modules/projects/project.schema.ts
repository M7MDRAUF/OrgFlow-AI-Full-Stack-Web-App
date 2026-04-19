import { PROJECT_STATUSES } from '@orgflow/shared-types';
import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true });

export const createProjectSchema = z.object({
  teamId: z.string().min(1),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  memberIds: z.array(z.string()).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: isoDate.optional(),
  dueDate: isoDate.optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  startDate: isoDate.nullable().optional(),
  dueDate: isoDate.nullable().optional(),
});

export const listProjectsQuerySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  search: z.string().max(200).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
