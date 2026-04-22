// auth-agent — api-client response interceptor must replace axios's generic
// "Request failed with status code 400" message with the backend's own
// error.message so the UI can display something the user can act on.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosError } from 'axios';
import type * as AxiosNs from 'axios';

// Pull the interceptor's reject handler by spying on interceptors.response.use
// before importing the module under test. We re-import inside each test to
// keep the module graph clean.
type RejectFn = (error: AxiosError) => Promise<never>;

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

async function loadInterceptor(): Promise<RejectFn> {
  const captured: { reject: RejectFn | null } = { reject: null };
  vi.doMock('axios', async () => {
    const actual = await vi.importActual<typeof AxiosNs>('axios');
    return {
      ...actual,
      default: {
        ...actual.default,
        create: () => ({
          interceptors: {
            request: { use: () => undefined },
            response: {
              use: (_ok: unknown, err: RejectFn) => {
                captured.reject = err;
              },
            },
          },
        }),
      },
    };
  });
  await import('../src/lib/api-client.js');
  if (captured.reject === null) throw new Error('reject handler not registered');
  return captured.reject;
}

function makeAxiosError(status: number, data: unknown): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: `Request failed with status code ${String(status)}`,
    response: { status, data, statusText: '', headers: {}, config: {} as never },
    config: {} as never,
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

describe('apiClient response interceptor — server message unwrap', () => {
  it('replaces generic axios message with backend error.message', async () => {
    const reject = await loadInterceptor();
    const err = makeAxiosError(400, {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
    });
    await expect(reject(err)).rejects.toMatchObject({ message: 'Invalid request' });
  });

  it('appends first validation issue path/message', async () => {
    const reject = await loadInterceptor();
    const err = makeAxiosError(400, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: [
          { path: 'password', message: 'Password must include at least one letter and one number' },
        ],
      },
    });
    await expect(reject(err)).rejects.toMatchObject({
      message:
        'Invalid request (password: Password must include at least one letter and one number)',
    });
  });

  it('leaves message untouched when body is not the standard envelope', async () => {
    const reject = await loadInterceptor();
    const err = makeAxiosError(500, '<html>boom</html>');
    await expect(reject(err)).rejects.toMatchObject({
      message: 'Request failed with status code 500',
    });
  });
});
