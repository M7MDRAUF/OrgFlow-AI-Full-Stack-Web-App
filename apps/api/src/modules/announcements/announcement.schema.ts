import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  targetType: z.enum(['organization', 'team', 'user']),
  targetId: z.string().min(1),
  title: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(10000),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  body: z.string().min(1).max(10000).optional(),
});

export const listAnnouncementsQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;
