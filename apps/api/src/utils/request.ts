// Typed param extractor — routes can rely on path params being string.
import type { Request } from 'express';
import { errors } from './errors.js';

export function requireParam(req: Request, key: string): string {
  const raw = req.params[key];
  if (typeof raw !== 'string' || raw.length === 0) {
    throw errors.validation(`Missing path param: ${key}`);
  }
  return raw;
}
