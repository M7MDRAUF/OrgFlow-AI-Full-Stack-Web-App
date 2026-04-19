import { ANNOUNCEMENT_TARGET_TYPES } from '@orgflow/shared-types';
import { z } from 'zod';

// Body bounds tightened from min(1)/max(10_000) per BE-M-005: enforce a
// readable minimum and a reasonable ceiling aligned with §2.8 FR guidance.
const announcementBody = z.string().min(10).max(2000).trim();

export const createAnnouncementSchema = z.object({
  targetType: z.enum(ANNOUNCEMENT_TARGET_TYPES),
  targetId: z.string().min(1),
  title: z.string().min(1).max(200).trim(),
  body: announcementBody,
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  body: announcementBody.optional(),
});

export const listAnnouncementsQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v !== undefined ? v === 'true' : undefined)),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;
