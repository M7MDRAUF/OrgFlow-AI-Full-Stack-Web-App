import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://placeholder/orgflow_test',
      JWT_SECRET: 'test-secret-at-least-16-chars-long',
      DEV_VECTOR_FALLBACK: '1',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      // Enterprise gates per Expert Test Master Plan §1.3.
      // Per-file thresholds (`perFile: true`) prevent a high-coverage file
      // from masking a critical untested file in the same module.
      thresholds: {
        // Project-wide minimum.
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
        // Security boundary: middleware MUST stay at 100%. Any drop blocks CI.
        'src/middleware/**/*.ts': {
          statements: 100,
          branches: 95,
          functions: 100,
          lines: 100,
        },
        // Domain modules carry the auth/RBAC/scope surface.
        'src/modules/**/*.ts': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
