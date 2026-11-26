import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      include: ['src/engine/**/*.js'],
      exclude: ['src/engine/cli.js'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
