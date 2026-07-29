import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// ---------------------------------------------------------------------------
// Plugin i18n — regla "no-hardcoded-spanish" (soft enforcement, warn)
//
// TAREA 100: detecta texto en espanol hardcodeado en JSX y strings largos
// que deberian migrarse a src/config/messages.js.
// ---------------------------------------------------------------------------
const SPANISH_PATTERNS = [
  /\b(?:Registrar|Cosechar|Registrar cosecha|Guardar|Cancelar|Eliminar)\b/,
  /\b(?:Configuraci[oó]n|Bienvenido|Cargando|Sincronizando|Pendientes?)\b/,
  /\b(?:Plantas|Mapa|Insumos|Tareas|Bit[aá]cora|Informes|Perfil|Ayuda)\b/,
  /\b(?:Sin conexi[oó]n|Error al|Ocurri[oó] un error|No se pudo)\b/,
  /\b(?:Cerrar sesi[oó]n|Ver m[aá]s|Operador|Finca|Agregar|Confirmar)\b/,
  /\b(?:Observaci[oó]n|Aplicaci[oó]n|Fertilizaci[oó]n|Descargar)\b/,
  /\b(?:grabando|procesando|pensando|respondiendo|verificando)\b/i,
];

function hasHardcodedSpanish(value) {
  if (!value || value.length < 4) return false;
  if (/^(https?:\/\/|#|\/|\.|@|rgb|hsl|px|em|rem|%|[0-9]+$|true|false|null|undefined)/.test(value)) return false;
  return SPANISH_PATTERNS.some(p => p.test(value));
}

const i18nPlugin = {
  meta: { name: 'chagra-i18n' },
  rules: {
    'no-hardcoded-spanish': {
      meta: { type: 'suggestion', docs: { description: 'Detecta strings en espanol hardcodeados (TAREA 100).' }, schema: [] },
      create(context) {
        return {
          JSXText(node) {
            const text = node.value.trim();
            if (hasHardcodedSpanish(text)) {
              context.report({ node, message: 'Texto en espanol hardcodeado: "' + text.slice(0, 80) + '". Migrar a src/config/messages.js (ADR-050 i18n).' });
            }
          },
          Literal(node) {
            if (typeof node.value !== 'string') return;
            const p = node.parent;
            if (p && (p.type === 'ImportDeclaration' || p.type === 'ExportNamedDeclaration')) return;
            if (hasHardcodedSpanish(node.value)) {
              context.report({ node, message: 'String en espanol hardcodeado: "' + node.value.slice(0, 80) + '". Migrar a src/config/messages.js (ADR-050 i18n).' });
            }
          },
          TemplateLiteral(node) {
            const text = node.quasis.map(q => q.value.raw).join('');
            if (hasHardcodedSpanish(text)) {
              context.report({ node, message: 'Template literal en espanol hardcodeado. Migrar a src/config/messages.js (ADR-050 i18n).' });
            }
          },
        };
      },
    },
  },
};

// Vitest globals para test files
const vitestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  vi: 'readonly',
}

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-prod',
    // Modo campo (#2088): librerías de terceros vendoreadas TAL CUAL (UMD
    // minificado de @tensorflow/tfjs-core|layers|data|backend-wasm y
    // @tensorflow-models/speech-commands, ver scripts/wake-word/vendor-libs.mjs).
    // NO son código propio — lintearlas tira cientos de falsos + (exports/
    // require UMD, vars de una letra minificadas, etc.).
    'public/vendor/**',
  ]),
  {
    // Configs Node (playwright/vite/etc.) — requieren globals.node.
    files: ['*.config.{js,mjs,ts}', 'playwright.config.js', 'vite.config.js'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
  },
  {
    // Test files con vitest
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...vitestGlobals,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      'chagra-i18n': i18nPlugin,
    },
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
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      // ADR-002: ningún import estático desde chagra-pro en el repo público.
      // Módulos Pro se cargan vía src/core/loadProModules.js (dynamic import).
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['chagra-pro', 'chagra-pro/*', '../chagra-pro', '../chagra-pro/*', '../../chagra-pro/*', '@guatoc/chagra-pro', '@guatoc/chagra-pro/*', '@chagra/pro-*'], message: 'Imports estáticos desde chagra-pro están prohibidos. Usa moduleRegistry (ver src/core/moduleRegistry.js y ADR-002).' },
        ],
      }],
      'chagra-i18n/no-hardcoded-spanish': 'warn',
    },
  },
  {
    files: ['src/config/messages.js'],
    rules: { 'chagra-i18n/no-hardcoded-spanish': 'off' },
  },
  {
    // Los tests aseveran sobre el texto en español RENDERIZADO (p. ej.
    // `screen.getByText('Finca El Páramo')`), así que necesitan literales en
    // español a propósito: no son cadenas de UI que migrar a messages.js.
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    rules: { 'chagra-i18n/no-hardcoded-spanish': 'off' },
  },
])
