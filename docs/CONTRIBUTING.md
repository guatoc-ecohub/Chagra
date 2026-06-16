# Guia de Contribucion a Chagra

## Setup Inicial

```bash
git clone https://github.com/guatoc-ecohub/Chagra.git
cd Chagra
npm install
npm run hooks:install
cp .env.example .env
```

## Comandos Principales

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de produccion |
| `npm run lint` | ESLint (max-warnings=0) |
| `npm run test:unit` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run coverage` | Cobertura de tests (Vitest + v8) |

## Estrategia de Ramas

Ramas efimeras desde `main`: `feat/<nombre>`, `fix/<nombre>`, `chore/<nombre>`, `docs/<nombre>`. Prohibido commitear a `main` directo.

## Conventional Commits

Formato: `feat(scope):`, `fix(scope):`, `chore(scope):`, `refactor(scope):`, `docs(scope):`, `test(scope):`. Validado por lefthook.

## Lint Rules

ESLint 9 con `no-unused-vars`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `no-restricted-imports`.

Pre-commit lefthook: secret-scan, infra-refs-scan, pro-import-scan, ESLint `--max-warnings=0`.

## Reglas Anti-Leak

1. Sin URLs de infraestructura privada
2. Sin IPs RFC 1918
3. Sin tokens/credenciales
4. Configuracion via `import.meta.env.VITE_*`
5. `.env` en `.gitignore`
6. Revision pre-commit: `git diff --staged | grep -iE "(token|bearer|password|secret|10\\.)"`
7. Tokens OAuth2 en `localStorage` unicamente

## Merge Gates

- CodeQL SAST (security-extended)
- Playwright E2E offline-first

## CLA

Firma requerida (`CLA.md`). Comentar en PR: `I have read the CLA Document and I hereby sign the CLA`

## Estilo de Copy UI

Sin em dashes en strings JSX. Vocabulario colombiano rural. Estados via `src/constants/assetStatuses.js`.
