import { useEffect } from 'react';
import { authStorage } from './storage.js';

const TOKEN_KEY = 'orgflow:token';

/**
 * Listens for `storage` events fired by other tabs. When the auth token is
 * removed in another tab (logout) we redirect to /login. When a token is
 * written (login) we reload to pick up the new session.
 */
export function useCrossTabAuthSync(): void {
  useEffect(() => {
    function handleStorage(event: StorageEvent): void {
      if (event.key !== TOKEN_KEY) return;
      if (event.newValue === null) {
        // Another tab logged out — redirect here too.
        authStorage.clear();
        window.location.replace('/login');
      } else if (event.oldValue === null) {
        // Another tab logged in — reload to pick up session.
        window.location.reload();
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
}
