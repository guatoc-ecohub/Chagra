Tarea: REVISAR A PROFUNDIDAD los 47 commits de `fix/compai-fab-menu-peek-20260826` que NO están en origin/dev, y RESCATAR lo valioso. SOLO ANÁLISIS + un doc + (opcional) cherry-pick de lo claramente valioso y limpio a una rama de rescate. NO mergear a dev.

Lista: `git log --oneline origin/dev..fix/compai-fab-menu-peek-20260826` (repo /home/kortux/Workspace/chagra). Son ~47, PRs #2311-#2797 + eslint/NOC.

Para CADA commit:
1. ¿Su contenido YA está en origin/dev por otra vía? (git diff del/los archivo(s) clave vs origin/dev; byte-idéntico o equivalente = YA-EN-DEV, descartar). 
2. Si NO está: ¿es VALIOSO y de PRODUCCIÓN? Prioridad ALTA a: swap de modelos prod (qwen3.5:4b agente, qwen3-vl:8b visión — barrer gemma4:e2b/gemma3:4b), guards anti-invención, fixes de grafo/RAG/grounding, red service PWA (#2792), deep-research+tools (#2790), juez async visión (#2791), GBIF photos (#2471). Marcá cada uno: RESCATAR-ALTO / RESCATAR-MEDIO / RUIDO/EXPERIMENTO / YA-EN-DEV.
3. ¿Mergea limpio sobre dev? (git cherry-pick --no-commit en un worktree de prueba, luego abort). LIMPIO / CONFLICTO(archivos).
4. Riesgo/regresión: ¿reemplaza algo maduro de dev? 🔴 si sí.

Salida: `/home/kortux/Workspace/Chagra-strategy/ops/RESCATE-47-COMMITS-FAB-MENU-2026-08-26.md` con tabla: commit | PR | qué hace | ya-en-dev? | valor | mergea? | riesgo | veredicto. Al final: lista "RESCATAR YA (alto valor, limpio, bajo riesgo)" ordenada por prioridad, con los comandos cherry-pick exactos. Los de RESCATAR-ALTO que sean limpios y bajo-riesgo, cherry-pickealos a una rama `rescate/fab-menu-alto-valor-20260826` (desde origin/dev) y confirmá build. NO mergees a dev. Cero PII.
