// Auth storage — persists JWT + minimal auth profile in localStorage.
// auth-agent owns this path per AGENTS.md §4.5.
import type { UserRole } from '@orgflow/shared-types';

const TOKEN_KEY = 'orgflow:token';
const PROFILE_KEY = 'orgflow:auth-profile';

export interface AuthProfile {
  userId: string;
  organizationId: string;
  teamId: string | null;
  role: UserRole;
  displayName: string;
  email: string;
}

function readProfile(): AuthProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as AuthProfile;
  } catch {
    return null;
  }
}

export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  getProfile(): AuthProfile | null {
    if (typeof window === 'undefined') return null;
    return readProfile();
  },
  set(token: string, profile: AuthProfile): void {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  clear(): void {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
  },
};
