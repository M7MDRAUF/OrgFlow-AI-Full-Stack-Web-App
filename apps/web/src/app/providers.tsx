import { QueryClientProvider } from '@tanstack/react-query';
import { type JSX, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { useCrossTabAuthSync } from '../features/auth/use-cross-tab-sync.js';
import { ThemeProvider } from '../features/theme/ThemeProvider.js';
import { queryClient } from '../lib/query-client.js';

function AuthSyncGate(props: { children: ReactNode }): JSX.Element {
  useCrossTabAuthSync();
  return <>{props.children}</>;
}

export function AppProviders(props: { children: ReactNode }): JSX.Element {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthSyncGate>{props.children}</AuthSyncGate>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '8px', fontSize: '14px' },
            error: { duration: 6000 },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
