// Auth zod schemas. Owned by auth-agent.
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const inviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(1).max(200).trim(),
  role: z.enum(['admin', 'leader', 'member']),
  teamId: z.string().min(1).optional(),
});

export const completeInviteSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type CompleteInviteInput = z.infer<typeof completeInviteSchema>;
