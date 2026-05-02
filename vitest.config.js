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
    include: ['src/**/*.test.{js,jsx}', 'tests/unit/**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'tests/*.spec.js'],
    css: false,
  },
});
