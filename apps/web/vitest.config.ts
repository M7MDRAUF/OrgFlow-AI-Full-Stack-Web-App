import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: false,
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/index.ts', 'src/main.tsx'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
        // Auth boundary on the client (token storage + guards) is
        // security-critical and must not regress.
        'src/features/auth/**/*.{ts,tsx}': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
