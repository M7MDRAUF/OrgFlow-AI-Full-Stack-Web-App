// Authenticated request types + auth context shape. Shared between middleware
// and controllers so every handler has a typed `req.auth` without using `any`.
import type { Request } from 'express';
import type { UserRole } from '@orgflow/shared-types';

export interface AuthContext {
  userId: string;
  organizationId: string;
  teamId: string | null;
  role: UserRole;
}

export interface AuthenticatedRequest<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = unknown,
> extends Request<TParams, unknown, TBody, TQuery> {
  auth: AuthContext;
}

// Express request augmentation so middleware can assign `req.auth`.
declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}
