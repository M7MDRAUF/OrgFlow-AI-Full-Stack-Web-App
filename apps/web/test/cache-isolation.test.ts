// Phase 5 — Web cache isolation on 401 (CACHE-002 / FE-C-001).
// Verifies the api-client's response interceptor: a 401 must wipe the React
// Query cache AND the auth storage, AND must redirect the browser to /login
// (so any in-memory React state tied to the prior identity is torn down).
import type * as AxiosNs from 'axios';
import type { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

type RejectFn = (error: AxiosError) => Promise<never>;

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

interface Loaded {
  reject: RejectFn;
  storageClear: () => void;
  qcClear: () => void;
}

async function loadInterceptor(): Promise<Loaded> {
  const captured: { reject: RejectFn | null } = { reject: null };
  const storageClear = vi.fn();
  const qcClear = vi.fn();

  vi.doMock('axios', async () => {
    const actual = await vi.importActual<typeof AxiosNs>('axios');
    return {
      ...actual,
      default: {
        ...actual.default,
        create: () => ({
          defaults: { headers: { common: {} } },
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

  vi.doMock('../src/features/auth/storage.js', () => ({
    authStorage: {
      getToken: () => 'fake',
      clear: storageClear,
    },
  }));

  vi.doMock('../src/lib/query-client.js', () => ({
    queryClient: { clear: qcClear },
  }));

  await import('../src/lib/api-client.js');
  if (captured.reject === null) throw new Error('reject handler not registered');
  return { reject: captured.reject, storageClear, qcClear };
}

function makeAxiosError(status: number): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: `Request failed with status code ${String(status)}`,
    response: {
      status,
      data: { success: false, error: { code: 'UNAUTHENTICATED', message: 'token expired' } },
      statusText: '',
      headers: {},
      config: {} as never,
    },
    config: {} as never,
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

describe('CACHE-002: 401 interceptor wipes auth storage AND react-query cache', () => {
  it('calls authStorage.clear() and queryClient.clear() on 401', async () => {
    const { reject, storageClear, qcClear } = await loadInterceptor();
    // jsdom's window.location is non-configurable; replace it wholesale with
    // a minimal stub so we can observe the redirect call.
    const assignSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        pathname: '/projects',
        search: '',
        href: 'http://localhost/projects',
        assign: assignSpy,
      },
    });
    try {
      await expect(reject(makeAxiosError(401))).rejects.toMatchObject({ message: 'token expired' });
      expect(storageClear).toHaveBeenCalledTimes(1);
      expect(qcClear).toHaveBeenCalledTimes(1);
      expect(assignSpy).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?from=/));
    } finally {
      Object.defineProperty(window, 'location', {
        writable: true,
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('does NOT clear cache for non-401 errors', async () => {
    const { reject, storageClear, qcClear } = await loadInterceptor();
    await expect(reject(makeAxiosError(500))).rejects.toBeDefined();
    expect(storageClear).not.toHaveBeenCalled();
    expect(qcClear).not.toHaveBeenCalled();
  });
});
