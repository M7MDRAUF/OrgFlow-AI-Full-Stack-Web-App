import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
