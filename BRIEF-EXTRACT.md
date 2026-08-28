Tarea: RECONSTRUIR limpio sobre origin/dev los cambios de compai P2/R4 y P5, que hoy viven en la rama `fix/compai-fab-menu-peek-20260826` (47 commits divergente — NO mergear esa rama). El cherry-pick directo choca (AgentFab.jsx/AgentFabMenu.jsx divergieron).

Commits fuente (en el repo /home/kortux/Workspace/chagra, refs disponibles):
- P2/R4 = `161926e56` "menú compacto del FAB (R4) + peek/idle-gating (R2)" — toca: src/components/AgentFab.jsx, AgentFabMenu.jsx (NUEVO), AgentScreen/AgentScreen.jsx, agent-fab-skin.css, src/services/compaiOcupado.js (NUEVO) + tests (AgentFabMenu.test.jsx, compaiOcupado.test.js).
- P5 = `c3b7afd34` "AngelitaAvisoGlobal, burbuja visible" — toca: src/App.jsx, src/visual/agente/{AngelitaAvisoGlobal.jsx,angelitaAvisoGlobal.css,duracionAviso.js,index.js} (NUEVOS salvo App.jsx/index.js).

Método: mirá `git show 161926e56` y `git show c3b7afd34` para el INTENTO, pero APLICÁ los cambios sobre el AgentFab.jsx/App.jsx ACTUALES de origin/dev (que son distintos). Los archivos NUEVOS (AgentFabMenu.jsx, compaiOcupado.js, AngelitaAvisoGlobal.jsx, etc.) se pueden copiar tal cual (`git show <commit>:<path>`). Para los MODIFICADOS (AgentFab.jsx, App.jsx, AgentScreen.jsx, index.js) reaplicá SOLO la funcionalidad compai (menú Ver/Escuchar/Callar, peek/idle-gating R2, mount de AngelitaAvisoGlobal) sin arrastrar el resto del scope divergente.

Qué NO traer: NADA de los otros 45 commits (eslint flat, NOC view, swaps de modelo, RAG, bench, GBIF, red, mercado). SOLO P2/R4/P5.

Verificá: `npx vite build` limpio + `npx vitest run src/components/__tests__/AgentFabMenu.test.jsx src/services/__tests__/compaiOcupado.test.js` verde. Commiteá en feat/compai-P2R4P5-clean-20260826. NO mergees. Reportá archivos + resultado de build/tests. Cero PII.
