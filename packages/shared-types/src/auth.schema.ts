// Shared auth validation schemas (H-012). Consumed by both FE and BE so the
// same rules apply everywhere. Owned by contracts-agent (AGENTS.md §4.2).
import { z } from 'zod';
import { USER_ROLES } from './roles.js';

/** Lenient password rule — authenticating existing accounts. */
export const passwordSchema = z.string().min(8).max(200);

/**
 * Stronger policy for **new** passwords only (invite completion).
 * Requires ≥1 letter + ≥1 digit. Existing accounts are not affected.
 */
export const newPasswordSchema = passwordSchema.superRefine((val, ctx) => {
  if (!/[A-Za-z]/.test(val) || !/\d/.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must include at least one letter and one number',
    });
  }
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
});

export const inviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(1).max(200).trim(),
  role: z.enum(USER_ROLES),
  teamId: z.string().min(1).optional(),
});

export const completeInviteSchema = z.object({
  token: z.string().min(10),
  password: newPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type CompleteInviteInput = z.infer<typeof completeInviteSchema>;
