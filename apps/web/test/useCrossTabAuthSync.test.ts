import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/auth/storage.js', () => ({
  authStorage: {
    clear: vi.fn(),
    getToken: vi.fn(),
    getProfile: vi.fn(),
    set: vi.fn(),
  },
}));

const { authStorage } = await import('../src/features/auth/storage.js');
const mockedAuthStorage = vi.mocked(authStorage);
const { useCrossTabAuthSync } = await import('../src/features/auth/use-cross-tab-sync.js');

const replaceMock = vi.fn();
const reloadMock = vi.fn();

describe('useCrossTabAuthSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { replace: replaceMock, reload: reloadMock },
    });
  });

  it('clears storage and redirects when token is removed in another tab', () => {
    renderHook(() => useCrossTabAuthSync());

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'orgflow:token',
        newValue: null,
        oldValue: 'prev-token',
      }),
    );

    expect(mockedAuthStorage.clear).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('reloads when a new token appears from another tab', () => {
    renderHook(() => useCrossTabAuthSync());

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'orgflow:token',
        newValue: 'new-token',
        oldValue: null,
      }),
    );

    expect(reloadMock).toHaveBeenCalled();
  });

  it('ignores storage events for unrelated keys', () => {
    renderHook(() => useCrossTabAuthSync());

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-key', newValue: null }));

    expect(mockedAuthStorage.clear).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('removes the storage event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useCrossTabAuthSync());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    removeSpy.mockRestore();
  });
});
