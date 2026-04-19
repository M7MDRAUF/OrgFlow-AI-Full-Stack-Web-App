import type { JSX } from 'react';
import { AppErrorBoundary } from './app/ErrorBoundary.js';
import { AppProviders } from './app/providers.js';
import { AppRoutes } from './app/router.js';

export function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </AppErrorBoundary>
  );
}
