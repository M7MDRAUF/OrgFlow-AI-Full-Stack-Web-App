// Zod-based validation middleware. Parses body/query/params and mutates
// req.body/query/params in place with parsed results. All boundary validation
// goes through here per AGENTS.md §3.2.
import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { errors } from '../utils/errors.js';
import { paginationSchema } from '../utils/pagination.js';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body !== undefined) {
        req.body = runSchema(schemas.body, req.body, 'body');
      }
      if (schemas.query !== undefined) {
        const parsed = runSchema(schemas.query, req.query, 'query') as Record<string, unknown>;
        const paginationParsed = paginationSchema.safeParse(req.query);
        const paginationData: Record<string, unknown> = {};
        if (paginationParsed.success) {
          if ('page' in req.query) paginationData['page'] = paginationParsed.data.page;
          if ('pageSize' in req.query) paginationData['pageSize'] = paginationParsed.data.pageSize;
        }
        for (const key of Object.keys(req.query)) {
          Reflect.deleteProperty(req.query, key);
        }
        Object.assign(req.query as Record<string, unknown>, parsed, paginationData);
      }
      if (schemas.params !== undefined) {
        const parsed = runSchema(schemas.params, req.params, 'params') as Record<string, unknown>;
        for (const key of Object.keys(req.params)) {
          Reflect.deleteProperty(req.params, key);
        }
        Object.assign(req.params as Record<string, unknown>, parsed);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function runSchema(schema: ZodTypeAny, input: unknown, section: string): unknown {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw errors.validation(
      `Invalid ${section}`,
      result.error.issues.map((issue) => ({
        path: [section, ...issue.path.map(String)].join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
