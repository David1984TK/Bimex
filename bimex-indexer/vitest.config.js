import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    globals: false,
    coverage: {
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 55,
        statements: 65,
      },
    }
  },
});
