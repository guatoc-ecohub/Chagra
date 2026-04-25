# PROHIBITED_IN_PUBLIC — lista universal de patrones prohibidos en el repo público

Este archivo documenta los patterns genéricos (industry-standard + boundary Pro sin revelar roadmap) que **nunca** deben aparecer en `guatoc-ecohub/Chagra` (público, AGPL-3.0). El auditor (`scripts/audit-bundle.mjs`) los busca en `dist/` después de cada build.

La lista específica de identificadores Pro (nombres de presets, prompts, content marks propietarios) vive en `guatoc-ecohub/chagra-pro/PROHIBITED_INTERNAL.md` — no aquí, porque telegrafía roadmap comercial. El auditor la carga si está presente (dev local con Pro path-relative, o CI Pro), y solo la pública cuando no.

Ver ADR-015 (guatoc-ecohub/Chagra-strategy) para contexto — incidente Anthropic 31-mar-2026.

## Strings literales

- `chagra-pro`
- `@chagra/pro-`
- `@guatoc/pro-`
- `@guatoc/chagra-pro`
- `PRIVATE_KEY`
- `BEGIN RSA PRIVATE KEY`
- `BEGIN OPENSSH PRIVATE KEY`

## Patrones regex

- `api[_-]?key[_-]?(chagra|guatoc|ministerio)` — claves internas con convención de nombre
- `passphrase[_-]?default` — configuraciones appliance sensibles

## Archivos completos prohibidos

- Cualquier archivo dentro de `oss-pro/` excepto este `PROHIBITED_IN_PUBLIC.md` y `README.md` documentales
- `**/*.pro.js`, `**/*.pro.ts`, `**/*.pro.jsx`, `**/*.pro.tsx`
- Cualquier archivo con frontmatter o encabezado `Chagra Pro`, `All rights reserved`
- Modelos finetuned de Ollama (`.gguf`, `.safetensors`)

## Catálogos prohibidos

- `catalog/pro/` — subdirectorio reservado para Pro, nunca debe materializarse en público

## Credenciales y tokens (regex)

- `gh[oprsu]_[A-Za-z0-9]{30,}` — GitHub tokens
- `sk-[A-Za-z0-9]{32,}` — OpenAI-style keys
- `sk-ant-[A-Za-z0-9_-]{30,}` — Anthropic-style keys
- `AKIA[0-9A-Z]{16}` — AWS access keys
- `AIza[0-9A-Za-z_-]{35}` — Google API keys
- `glpat-[0-9A-Za-z_-]{20}` — GitLab PATs

## Direcciones y rangos de red interna

- `\b10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b` — IP completa RFC 1918 (rango 10/8)
- `\b172\.(1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3}\b` — IP completa RFC 1918 (rango 172.16-31)
- `\b192\.168\.[0-9]{1,3}\.[0-9]{1,3}\b` — IP completa RFC 1918 (rango 192.168/16)
- `chagra\.guatoc\.co` — dominio operativo del backend (frontend público usa rutas relativas `/api/...`, nunca hostname)

## Contenido estratégico (lista universal)

Patrones que describen estrategia, modelo de negocio, infraestructura
operativa propia o identidad personal y nunca deben aparecer en el público.
Identificadores específicos (codenames de agentes propios, infra interna)
viven en `chagra-pro/PROHIBITED_INTERNAL.md` para no telegrafiar.

- `burnout` — telegrafía contexto personal/operativo del operador
- `cap[.-]table`, `founding[.-]team`, `valuation` — info societaria
- `mollison[._-]?adapt`, `lawton[._-]?curated` — copyright tercero adaptado
- `ADR-(009|010|014|017|018)\s*\(` — referencia descriptiva a ADRs
  estratégicos (con paréntesis explicando contenido). Citar el número
  como referencia es OK; añadir título o resumen es leak.
- Identidad personal del operador o trabajadores hardcoded en código.
  Usar env var `VITE_PRIMARY_WORKER_NAME` (o equivalente) con default
  genérico tipo 'Trabajador'.

## Qué NO está prohibido (pero requiere cuidado)

Nombres y textos perfectamente aceptables en el público:
- `gremio`, `roles_in_guild`, `companions`, `antagonists` — lenguaje del dominio público del catálogo
- `Chagra Pro` mencionado en docs (`README`, `CONTRIBUTING`, ADRs linkeados) — referencia al repo hermano
- Variables `VITE_PRO_MODULES_PATH`, `VITE_PRIMARY_WORKER_NAME` — mecanismos declarados para configuración por deploy
- ADR-002, ADR-008, ADR-011, ADR-013, ADR-015, ADR-019 — son técnicos/legales y pueden referenciarse en código y docs (incluso con título o resumen breve)

## Actualización

Nueva entrada a esta lista cuando:
- Se introduce un patrón universal nuevo (credencial de un servicio cloud, rango de red, dominio operativo adicional)
- Se descubre un leak de un secreto industry-standard en PR

Entradas **específicas de Pro** (nombre de preset certificador, codename de catálogo curado, etc.) van a `chagra-pro/PROHIBITED_INTERNAL.md`, no aquí.

Auditor lee este archivo en tiempo de build. No cambiar el formato de los bullets sin actualizar `scripts/audit-bundle.mjs`.
