// JWT verification middleware. Extracts Bearer token, verifies, attaches req.auth.
// auth-agent will add the login/logout endpoints; this middleware is platform
// infrastructure (AGENTS.md §4.3).
import { USER_ROLES } from '@orgflow/shared-types';
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
  role: z.enum(USER_ROLES),
});

export type AuthTokenPayload = z.infer<typeof tokenPayloadSchema>;

// SEC-01: HS256 is the only algorithm we ever sign with. Pinning the verifier
// to the same set defends against alg-confusion attacks (e.g. `alg: none`,
// or RSA-public-as-HMAC-secret historical jsonwebtoken bugs). Any token whose
// header advertises a different algorithm is rejected before any signature
// check runs, keeping the trust boundary minimal and explicit.
const JWT_ALGORITHMS: readonly jwt.Algorithm[] = ['HS256'] as const;

export function signAuthToken(payload: AuthTokenPayload): string {
  const env = loadEnv();
  // BE-03 / TYPE-01: use the proper jwt typing for `expiresIn` instead of an
  // unsafe `as unknown as` cast. The Zod-validated env value is a duration
  // string like "7d" / "30m" which jsonwebtoken's `StringValue` accepts.
  type ExpiresIn = NonNullable<jwt.SignOptions['expiresIn']>;
  const expiresIn = env.JWT_EXPIRES_IN as ExpiresIn;
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const env = loadEnv();
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [...JWT_ALGORITHMS] });
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
  if (header?.toLowerCase().startsWith('bearer ') !== true) {
    next(errors.unauthenticated());
    return;
  }
  const token = header.slice('bearer '.length).trim();
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
