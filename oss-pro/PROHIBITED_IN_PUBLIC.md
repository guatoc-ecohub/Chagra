# PROHIBITED_IN_PUBLIC — lista viva de símbolos y artefactos prohibidos en el repo público

Este archivo documenta qué **nunca** debe aparecer en `guatoc-ecohub/Chagra` (público, AGPL-3.0). El auditor de bundle (`scripts/audit-bundle.mjs`) busca estos patterns en los artefactos de `dist/` después de cada build público. Si encuentra uno, el build falla.

Ver ADR-015 (guatoc-ecohub/Chagra-strategy) para el contexto — incidente Anthropic 31-mar-2026, diseño leak-proof.

## Strings literales

- `chagra-pro`
- `@chagra/pro-`
- `@guatoc/pro-`
- `@guatoc/chagra-pro`
- `PROMPT_PRO_`
- `PRIVATE_KEY`
- `BEGIN RSA PRIVATE KEY`
- `BEGIN OPENSSH PRIVATE KEY`
- `GREMIOS_RECETA_CURADA`
- `ECOCERT_PRESET_INTERNAL`
- `MAYACERT_PRESET_INTERNAL`
- `CONTROL_UNION_PRESET_INTERNAL`

## Patrones regex

- `prompt[_-]?pro[_-]?[a-z]+` — cualquier nombre de prompt Pro
- `mollison[_-]?adapted` — permacultura adaptada propietaria
- `lawton[_-]?curated` — curaduría Geoff Lawton propietaria
- `api[_-]?key[_-]?(chagra|guatoc|ministerio)` — claves internas
- `passphrase[_-]?default` — configuraciones appliance sensibles

## Archivos completos prohibidos

- Cualquier archivo dentro de `oss-pro/` excepto este `PROHIBITED_IN_PUBLIC.md` y `README.md` documentales
- `**/*.pro.js`, `**/*.pro.ts`, `**/*.pro.jsx`, `**/*.pro.tsx`
- Cualquier archivo con frontmatter o encabezado `Chagra Pro`, `All rights reserved`
- Modelos finetuned de Ollama (`.gguf`, `.safetensors`)

## Catálogos prohibidos

- `catalog/pro/` — subdirectorio reservado para Pro, nunca debe materializarse en público
- `catalog/gremios-receta-pro.json`, `catalog/gremios-receta-curada.json`

## Credenciales y tokens (regex)

- `gh[oprsu]_[A-Za-z0-9]{30,}` — GitHub tokens
- `sk-[A-Za-z0-9]{32,}` — OpenAI-style keys
- `sk-ant-[A-Za-z0-9_-]{30,}` — Anthropic-style keys
- `AKIA[0-9A-Z]{16}` — AWS access keys
- `AIza[0-9A-Za-z_-]{35}` — Google API keys
- `glpat-[0-9A-Za-z_-]{20}` — GitLab PATs

## Direcciones y rangos de red interna

- `\b10\.` — rango RFC 1918
- `172\.(1[6-9]|2[0-9]|3[01])\.` — rango RFC 1918
- `192\.168\.` — rango RFC 1918
- `chagra\.guatoc\.co` — dominio operativo (proxy público sí, hostnames backend no)
- `alpha\b` como hostname (el nombre está permitido en contextos narrativos)

## Qué NO está prohibido (pero requiere cuidado)

Nombres y textos perfectamente aceptables en el público:
- `gremio`, `roles_in_guild`, `companions`, `antagonists` — lenguaje del dominio público del catálogo
- `Chagra Pro` mencionado en docs (`README`, `CONTRIBUTING`, ADRs linkeados) — referencia al repo hermano
- Variables `VITE_PRO_MODULES_PATH` — es el mecanismo declarado para dev local con chagra-pro presente

## Actualización

Nueva entrada a esta lista cada vez que:
- Se crea un módulo Pro con sufijo nuevo (añadir al patrón string)
- Se descubre un leak en PR (añadir el patrón exacto)
- Una certificadora/institución entra en Pro (añadir el identificador del preset)

Auditor de bundle lee este archivo en tiempo de build. No cambiar el formato de los bullets sin actualizar `scripts/audit-bundle.mjs`.
