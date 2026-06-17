/**
 * vitest.config.js — config for component-mounting tests (#100).
 *
 * Used together with @testing-library/react to test React components in
 * isolation, sin requerir el flujo full E2E de Playwright (que rompía
 * cuando el componente vivía dentro de un form que requiere navegación
 * desde dashboard root).
 *
 * Conventions:
 * - Test files: `*.test.jsx` (al lado del componente) o `tests/unit/*.test.jsx`.
 * - Setup global: `tests/unit/setup.js` (importa jest-dom matchers).
 * - Excluye `tests/*.spec.js` que son Playwright E2E.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.js'],
    include: [
      'src/**/*.test.{js,jsx}',
      'tests/unit/**/*.test.{js,jsx}',
      'tests/integration/**/*.test.{js,jsx}',
      'eval/**/*.test.{js,mjs}',
      // POC Apache AGE (feat/apache-age-poc-2026-05-20): tests del importer
      // viven junto al script para mantener cohesión local. Incluye .mjs
      // porque el importer es ESM nativo.
      'scripts/__tests__/**/*.test.{js,mjs}',
      // Reingenieria bench 2026-06-15: tests del framework de benches
      // (runner + indice + historial). Deterministas, sin GPU/red.
      'bench/__tests__/**/*.test.{js,mjs}',
    ],
    exclude: ['node_modules', 'dist', 'tests/*.spec.js'],
    css: false,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        '**/*.config.{js,ts}',
        'scripts/',
      ],
    },
  },
});
