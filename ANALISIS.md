# Análisis: OpenSpec (openspec.dev)

## 1. Qué es

Framework ligero open-source (Fission-AI, MIT-style, `npm i -g @fission-ai/openspec`) de desarrollo spec-driven: las especificaciones funcionales viven como Markdown versionado en el propio repo, organizadas por capacidad (`openspec/specs/<capability>/spec.md`). Es universal (Claude Code, Cursor, OpenCode, Codex, Gemini CLI...) vía slash commands, sin API keys ni servidores MCP.

## 2. Para qué sirve / qué problema resuelve

Resuelve el desalineamiento entre lo que pides y lo que el agente construye: en vez de confiar en el plan efímero de una sesión de chat, cada cambio genera primero una propuesta revisable (`proposal.md`, `design.md`, `tasks.md`) más un **delta de requisitos** (Requirement + Scenarios GIVEN/WHEN/THEN) que muestra cómo cambia el contrato del sistema. El humano revisa el intent antes de que exista una línea de código, y las specs quedan como documentación viva que sobrevive al fin de la sesión. Es brownfield-first: pensado para codebases maduras donde el dolor es entender cómo funciona lo existente, no proyectos verdes.

## 3. Qué robar/usar para Chagra

| Patrón | Aplicación concreta |
|---|---|
| **Specs por capacidad en Markdown plano** | Extender la disciplina de AGENTS.md a `specs/` por feature crítica: `specs/offline-sync.md`, `specs/modelo-datos-asset-log.md`, `specs/valle-3d.md`. Cualquier worker de la flota (Zen, GLM, stg, codex) lee el mismo archivo sin acoplarse a un agente concreto. |
| **Scenarios GIVEN/WHEN/THEN = contratos testeables** | Cada Scenario mapea 1:1 a un test Playwright en `tests/offline.spec.js` o vitest. La spec deja de ser prosa y se vuelve checklist verificable en CI (merge gates). |
| **Spec deltas en PRs** | Todo PR que toque `dbCore.js`, `syncManager.js` o `payloadService.js` incluiría el diff de requisitos (qué Requirement cambia, qué Scenario nuevo). El reviewer juzga el intent sin leer 800 líneas de diff. Encaja directo con los merge gates actuales. |
| **Carpeta de change** (`proposal/tasks/design`) | Reemplaza los prompts ad-hoc de `tasks/` de la flota: cada task despachada lleva spec + tasks breakdown. Reduce re-descubrimiento por sesión nueva de worker. |
| **Brownfield-first, no upfront** | Coincide con el YAGNI del repo: no generar specs de todo, solo crear/actualizar la spec cuando se toca esa feature. Cero big-bang. |
| **Agent-agnosticismo** | Las specs son archivos, no plugins: si mañana cambia el modelo o la flota, el contexto persiste. Crítico para Chagra donde rotan modelos (Zen/GLM/stg). |

Para el **valle 3D**: especificar comportamientos como Scenarios ("GIVEN planta en surco WHEN cámara zoom THEN tooltip hoja de vida") en vez de tickets vagos. Para la **flota**: el patrón clave es que el prompt de tarea referencie `specs/x.md` en lugar de re-explicar el contexto cada vez.

## 4. Veredicto

**7/10.** La herramienta completa es opcional; el valor real es la convención (carpetas + formato Requirement/Scenario + deltas en PRs), que se puede robar sin instalar nada.

- **Esfuerzo solo convención**: bajo, ~1 día (crear `specs/` inicial con offline-sync y modelo-datos, sumar delta-spec al template de PR).
- **Esfuerzo herramienta completa**: ~0.5 día extra (CLI + slash commands), pero añade dependencia y proceso que el repo ya emula con AGENTS.md + ADRs + queue.

Riesgo: burocracia si se aplica a features triviales. Regla sugerida: spec delta obligatorio solo para las superficies que ya tienen merge gate (persistencia, sync, SW).
