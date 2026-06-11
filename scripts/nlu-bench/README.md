# NLU BENCH SÓLIDO — ruteo de grado decisión

Encuentra el modelo de NLU (ruteo a tools MCP) **mejor Y más veloz** para el
sidecar `agro-mcp`, con evidencia reproducible. Ejecuta la **pipeline real de
prod** (system prompt + corrector heurístico) importándola del `dist/`
compilado del sidecar — NO reimplementa la clasificación. Habla con el Ollama
real de `alpha` (`:11434`).

## Qué mide

- **accuracy modelo-solo**: decisión del LLM SOLO (JSON parseado + allow-list de
  rutas conectadas), ANTES del corrector heurístico `correctRouting`.
- **accuracy modelo+corrector**: la pipeline COMPLETA de prod (lo que el usuario
  realmente recibe).
- **latencia WARM p50/p95** por modelo (modelo ya cargado).
- **estabilidad** (crashes / timeouts).
- **CASCADE doble-LLM + conjuez**: pequeño (granite-moe:1b) de 1er pase; escala
  a granite8b si dispara cualquier trigger. Reporta accuracy + % escalado +
  latencia efectiva.

## Rutas conectadas (labels válidos)

Verificadas contra `chagra/src/services/sidecarClient.js` (`ALLOWED_TOOLS`) y
`chagra-pro/.../allowed-tools.ts`:

`get_species`, `get_companions`, `get_multihop_companions`, `get_biopreparados`,
`get_pest_controllers`, `get_precio_sipsa`, `get_normativa_ica`,
`get_subgrafo_relacional`, `get_diseno_restauracion`, `get_clima_ideam`,
`get_enso_status`, `get_alertas_clima_zona`.

Las tools de diseño NO conectadas (silvopastoril, finca, viables, calendario,
grado_dia, finca_overview, add_planta) **no se usan como label**.

## Reproducir

Requisitos: Ollama en `:11434` con los modelos `granite3.1-dense:8b`,
`granite3.1-moe:1b`, `qwen2.5:1.5b`; y el `dist/` del sidecar compilado
(`cd chagra-pro/modules/agro-mcp/sidecar && npm run build`).

```bash
cd chagra/scripts/nlu-bench
node nlu-bench.mjs --reps 3                  # todos + cascade
node nlu-bench.mjs --only granite3.1-dense:8b --reps 3
```

- `--reps N`: repeticiones por query (latencia/estabilidad). Decisión con
  temp 0 (determinista); se usa el content de la 1ª rep, se promedian latencias.
- Al terminar **re-pinea `granite3.1-dense:8b` con `keep_alive:-1`** (chat+NLU de
  prod — no lo deja evictado).
- Salida tabular por stdout + dump completo en `nlu-bench-results.json`.

## Cómo es fiel a prod (no es un proxy)

- `buildSystemPrompt(FALLBACK_TOOL_SCHEMAS)` = el MISMO system prompt que arma
  `planNlu` (mismo catálogo DSL comprimido, mismas reglas PLAGAS/RECETAS/PRECIOS).
- `correctRouting` = el MISMO corrector heurístico importado del dist.
- El mismo `requestBody` a `/api/chat` (temp 0, num_predict 150, format json,
  keep_alive 60s) que usa el sidecar.
- `getNluModel()` honra `NLU_MODEL=<candidato>` (escape-hatch del código) para
  cualquier valor distinto de `gemma3:4b`; el bench fija el modelo directo en el
  requestBody, equivalente.

Cross-validado en vivo contra el endpoint de prod `POST /nlu` (granite): C05→
normativa, C13/C14→chat, C18→pest_controllers coinciden con el harness.

## NOTA empírica importante (2026-06-10)

El `dist/` que prod corre (build_sha `3b70167`, mtime 10:32) va **atrás** de
`src/nlu.ts` (mtime 11:53, commit `f3eb01f`): la regla **R0e relacional**
(`get_subgrafo_relacional`) existe en src pero NO en el dist desplegado. Por eso
el caso C07 (broca+café+clima) se enruta hoy en prod a
`chain[get_companions,get_biopreparados]` (R4), NO a `get_subgrafo_relacional`.
El bench lo etiqueta semánticamente correcto (subgrafo) → falla en TODOS los
modelos porque el gap está en el corrector desplegado, no en el modelo. Para
cerrar ese gap: `npm run build` + `systemctl restart agro-mcp-sidecar`.

## Archivos

- `nlu-bench-cases.json` — los 20 casos + labels + criterio auditable.
- `nlu-bench.mjs` — harness reproducible.
- `nlu-bench-results.json` — última corrida (dump completo).
