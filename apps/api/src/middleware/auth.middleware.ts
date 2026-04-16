// JWT verification middleware. Extracts Bearer token, verifies, attaches req.auth.
// auth-agent will add the login/logout endpoints; this middleware is platform
// infrastructure (AGENTS.md §4.3).
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { z } from 'zod';
import { loadEnv } from '../app/env.js';
import { errors } from '../utils/errors.js';
import type { AuthContext } from './auth-context.js';

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  organizationId: z.string().min(1),
  teamId: z.string().nullable(),
  role: z.enum(['admin', 'leader', 'member']),
});

export type AuthTokenPayload = z.infer<typeof tokenPayloadSchema>;

export function signAuthToken(payload: AuthTokenPayload): string {
  const env = loadEnv();
  type ExpiresIn = NonNullable<jwt.SignOptions['expiresIn']>;
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as ExpiresIn,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const env = loadEnv();
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw errors.unauthenticated('Invalid or expired token');
  }
  const parsed = tokenPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw errors.unauthenticated('Malformed token payload');
  }
  return parsed.data;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ') !== true) {
    next(errors.unauthenticated());
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAuthToken(token);
    const context: AuthContext = {
      userId: payload.sub,
      organizationId: payload.organizationId,
      teamId: payload.teamId,
      role: payload.role,
    };
    req.auth = context;
    next();
  } catch (err) {
    next(err);
  }
}
