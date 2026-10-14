import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    globals: false,
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 50,
        statements: 60,
      },
    },
  },
});
