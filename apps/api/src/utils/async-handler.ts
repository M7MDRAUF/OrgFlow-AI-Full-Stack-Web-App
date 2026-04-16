// Wraps async Express handlers so thrown errors flow to error middleware.
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler<TReq extends Request = Request, TRes extends Response = Response> = (
  req: TReq,
  res: TRes,
  next: NextFunction,
) => unknown;

export function asyncHandler<TReq extends Request = Request, TRes extends Response = Response>(
  fn: AsyncHandler<TReq, TRes>,
): RequestHandler {
  return (req, res, next): void => {
    Promise.resolve(fn(req as TReq, res as TRes, next)).catch(next);
  };
}
