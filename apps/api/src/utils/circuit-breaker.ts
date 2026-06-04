export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
}

interface CircuitState {
  failureCount: number;
  lastFailure: number;
  open: boolean;
}

export interface CircuitBreaker {
  isOpen(): boolean;
  recordFailure(): void;
  recordSuccess(): void;
  getName(): string;
}

export function createCircuitBreaker(name: string, opts: CircuitBreakerOptions): CircuitBreaker {
  const state: CircuitState = { failureCount: 0, lastFailure: 0, open: false };
  return {
    isOpen(): boolean {
      if (!state.open) return false;
      if (Date.now() - state.lastFailure > opts.cooldownMs) {
        state.open = false;
        return false;
      }
      return true;
    },
    recordFailure(): void {
      state.failureCount += 1;
      state.lastFailure = Date.now();
      if (state.failureCount >= opts.failureThreshold) {
        state.open = true;
      }
    },
    recordSuccess(): void {
      state.failureCount = 0;
      state.open = false;
    },
    getName(): string {
      return name;
    },
  };
}
