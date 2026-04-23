import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // ADR-002: ningún import estático desde chagra-pro en el repo público.
      // Módulos Pro se cargan vía src/core/loadProModules.js (dynamic import).
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['chagra-pro', 'chagra-pro/*', '../chagra-pro', '../chagra-pro/*', '../../chagra-pro/*', '@guatoc/chagra-pro', '@guatoc/chagra-pro/*', '@chagra/pro-*'], message: 'Imports estáticos desde chagra-pro están prohibidos. Usa moduleRegistry (ver src/core/moduleRegistry.js y ADR-002).' },
        ],
      }],
    },
  },
])
