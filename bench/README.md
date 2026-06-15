# bench/ - framework componible de benchmarks de Chagra

Reingenieria 2026-06-15. Objetivo del operador: "que no quede nada redundante +
un indice que facilite la ejecucion y consulta de historial". Modular,
componible, self-improving (los fallos se vuelven casos), tendencia visible.

## Que hay aca

```
bench/
  INDEX.md          Catalogo legible (GENERADO desde index.json). No editar a mano.
  index.json        FUENTE DE VERDAD: cada bench + suite de test (que/infra/cmd/metricas).
  run.mjs           Punto de entrada UNICO: listar / correr (uno o todos) / tendencia.
  README.md         Este archivo.
  lib/
    registry.mjs    Carga + valida + resuelve entradas de index.json.
    history.mjs     Esquema FIJO v1 de corrida + lectura + calculo de tendencia.
    render-index.mjs Regenera INDEX.md desde index.json (PURO, testeable).
  history/          Un JSON por corrida (esquema v1). Tendencia se calcula de aca.
  __tests__/        Tests del framework (registry/history/render/run). Deterministas.
```

Los SCRIPTS de bench y sus libs de dominio siguen en `scripts/` y `scripts/lib/`
(convencion del repo; no se movieron para no romper imports ni el contrato del
bench-borde). El indice los referencia por path.

## Uso

```bash
node bench/run.mjs --list             # lista todo (benches + suites) con infra y ultima corrida
node bench/run.mjs --history          # tendencia (mejora/empeora) por bench y modelo
node bench/run.mjs --history borde    # tendencia filtrada por bench
node bench/run.mjs <id>               # corre UN bench/suite (id exacto o sufijo unico)
node bench/run.mjs --all [--dry-run]  # corre todo lo ejecutable con su infra disponible
node bench/run.mjs --regen-index      # regenera INDEX.md desde index.json
node bench/run.mjs --check            # valida indice (ids unicos + scripts existen) + INDEX.md sincronizado
```

`--all` saltea (con mensaje claro) los benches a los que les falta infra
(`gpu`, `ollama`, `sidecar`, `claude-cli`, `anthropic-key`, `fixtures-privadas`,
`corpus`) y los meta/manuales (rescore, summary-diff, capabilities) que requieren
argumentos. Por defecto `--all` corre solo la suite de test barata
(`suite-bench-framework`); las suites pesadas (e2e/full) se corren por id.

## Historial estandarizado (esquema v1)

Cada corrida que quiera aparecer en la tendencia escribe un JSON en
`bench/history/` con forma FIJA:

```json
{
  "schema": 1,
  "bench": "borde-alucinacion",
  "date": "2026-06-14T08:00:00.000Z",
  "model": "granite3.3:8b",
  "config": "PROD",
  "commit": "fe9ea44",
  "metrics": { "ah_pct": 16.0, "pass_pct": 84.0 },
  "passCount": 23, "failCount": 4, "passPct": 84,
  "notes": "", "seed": false
}
```

La DIRECCION de cada metrica (mas alto vs mas bajo = mejor) vive en
`METRIC_DIRECTION` (`bench/lib/history.mjs`). De ahi sale el veredicto:
`ah_pct` baja -> mejora; `pass_pct`/`accuracy` suben -> mejora; latencias bajan ->
mejora. La metrica AH% es SIEMPRE alucinacion real = FAIL/total (nunca pass-rate;
ver memoria feedback-bench-borde-ah-field-is-passrate).

Emitir un registro desde un bench:

```js
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';
writeHistoryRecord(buildHistoryRecord({
  bench: 'model-compare', model: 'granite3.1-dense:8b', config: 'qwen3-vs-granite',
  metrics: { keywords_pct: 74.0, latency_avg_ms: 2250 },
}));
```

`bench-model-compare.mjs` y `bench-rag-retrieve.mjs --history` ya lo hacen. Los
registros en `bench/history/` marcados `"seed": true` son EJEMPLOS sembrados en
la reingenieria para que la tendencia sea demostrable; reemplazar con corridas
reales (o borrar) cuando haya datos de produccion.

## Agregar un bench nuevo

1. Escribe el script en `scripts/bench-<algo>.mjs`, reusando los libs
   (`scripts/lib/bench-runner.mjs`, `bench-ollama.mjs`, `bench-scorer.mjs`,
   `bench-stats.mjs`, `bench-sidecar.mjs`) - CERO duplicacion.
2. Que emita un registro v1 al terminar (ver arriba).
3. Agrega su entrada en `bench/index.json` (id, type, cluster, infra, cmd,
   metrics, what).
4. `node bench/run.mjs --regen-index` y `node bench/run.mjs --check`.

## Libs de dominio (en scripts/lib/)

| lib | que aporta |
|---|---|
| `bench-runner.mjs` | callOllamaChat, loadPrompts, sampleResources, saveJsonl, paths, token, dirs |
| `bench-ollama.mjs` | callOllamaGenerate, checkOllamaModels, unloadModel, checkMaxwellError |
| `bench-summary.mjs` | generacion de summary.md (metadata/tablas/conclusion) |
| `bench-scorer.mjs` | scoreKeywordsFlexible + jueces (LLM/Anthropic/claude-cli/determinista) + anti-halluc |
| `bench-stats.mjs` | varianza (mean/stddev/IC95) para benches no-deterministas |
| `bench-checkout-guard.mjs` | guarda anti-stale (no benchear codigo viejo) |
| `bench-sidecar.mjs` | sidecar (resolve/post-validate) + GPU (temp/thermal) + generador chat + juez ollama |
| `bench-nocturno-runner.mjs` + `bench-nocturno-scenarios.mjs` | bench nocturno FarmProcess |
