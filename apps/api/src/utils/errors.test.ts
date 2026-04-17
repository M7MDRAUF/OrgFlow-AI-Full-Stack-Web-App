// Unit tests — error factory produces correctly shaped AppError instances.
import { describe, expect, it } from 'vitest';
import { errors, isAppError, AppError } from './errors.js';

describe('errors factory', () => {
  it('validation builds a 400 error', () => {
    const e = errors.validation('bad');
    expect(e).toBeInstanceOf(AppError);
    expect(e.statusCode).toBe(400);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.message).toBe('bad');
    expect(e.expose).toBe(true);
  });

  it('unauthenticated defaults to 401', () => {
    const e = errors.unauthenticated();
    expect(e.statusCode).toBe(401);
    expect(e.code).toBe('UNAUTHENTICATED');
  });

  it('forbidden returns 403', () => {
    const e = errors.forbidden('nope');
    expect(e.statusCode).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });

  it('notFound returns 404', () => {
    const e = errors.notFound();
    expect(e.statusCode).toBe(404);
    expect(e.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('internal is not exposed', () => {
    const e = errors.internal();
    expect(e.statusCode).toBe(500);
    expect(e.expose).toBe(false);
  });

  it('isAppError narrows correctly', () => {
    expect(isAppError(errors.validation('x'))).toBe(true);
    expect(isAppError(new Error('x'))).toBe(false);
  });
});
