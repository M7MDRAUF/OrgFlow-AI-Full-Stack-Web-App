import { TASK_PRIORITIES, TASK_STATUSES } from '@orgflow/shared-types';
import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true });

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: isoDate.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: isoDate.nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export const listTasksQuerySchema = z.object({
  projectId: z.string().optional(),
  teamId: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedTo: z.string().optional(),
  mine: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v !== undefined ? v === 'true' : undefined)),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000).trim(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
