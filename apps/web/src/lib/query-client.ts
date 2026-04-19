// Shared QueryClient singleton. Exposed as a module-level instance so the
// axios response interceptor can invalidate the cache on 401 (FE-C-001/FE-C-002).
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});
