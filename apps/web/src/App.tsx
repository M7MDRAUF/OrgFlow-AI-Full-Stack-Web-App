import type { JSX } from 'react';
import { AppProviders } from './app/providers.js';
import { AppRoutes } from './app/router.js';

export function App(): JSX.Element {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
