// platform-agent — I-006 correlation-id middleware.
// Generates (or honours inbound) X-Correlation-Id so every log line and every
// downstream request can be linked back to a single user-visible request.
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

const HEADER = 'x-correlation-id';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.header(HEADER);
  const id =
    typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128
      ? inbound
      : randomUUID();
  req.correlationId = id;
  res.setHeader(HEADER, id);
  next();
}
