# Chagra — Eval del agente con modelos locales (Promptfoo)

Harness de **evaluación autónoma del agente Chagra** usando los modelos locales
de Ollama. **IA que juzga IA**, 100% local, costo $0. Complementa los tests
unit (Vitest) y E2E (Playwright): cubre la capa de **comportamiento del LLM**,
donde no se puede hacer `assert` exacto sobre texto generativo.

## Qué valida

1. **Anti-voseo (determinista)** — `assert-no-voseo.js` reusa el `voseoFilter`
   REAL del producto (`src/services/voseoFilter.js`). Si la salida del agente
   trae voseo argentino, falla con la corrección. Mismo control que el filtro
   de la PWA, ahora en CI.
2. **Anti-alucinación + factualidad (LLM-as-judge)** — un segundo modelo local
   califica si la respuesta inventa especies/cifras o reconoce no saber.
3. **Grounding** — assertions `icontains`/`llm-rubric` sobre casos con verdad
   conocida (broca, aguacate≠guayaba, especie inventada, precio inventado).

## Por qué Promptfoo

JS-nativo (igual que Vitest/Playwright), habla OpenAI-compat → apunta directo a
Ollama. Declarativo (YAML), integrable en CI, y **genera casos adversariales**
(red-team) con los modelos locales para ampliar cobertura sin escribirlos a mano.
Ver comparación vs DeepEval/RAGAS en el PR que introdujo este harness.

## Modelos (moat)

Los nombres de modelo **no se hardcodean**. Se leen de variables de entorno
(`CHAGRA_AGENT_MODEL`, `CHAGRA_JUDGE_MODEL`). Copia `.env.example` a `.env` y
ajústalos según `judge-bench.mjs`.

## Uso

```bash
cd eval/promptfoo
npm ci                       # instala promptfoo (aislado del PWA)
cp .env.example .env         # configura modelos locales
set -a && . ./.env && set +a
npm run eval                 # corre la suite
npm run view                 # UI de resultados
```

## judge-bench.mjs — elegir el mejor juez

`npm run judge-bench` mide qué modelo local concuerda mejor con un **golden-set
de alucinaciones reales** (respuestas buenas → PASS, inventadas → FAIL). El de
mayor accuracy es el `CHAGRA_JUDGE_MODEL`. Cada candidato se carga solo
(GPU 12 GB → `keep_alive:0` descarga el anterior).

> Hallazgo: el juez por defecto previo daba accuracy baja (dejaba pasar
> alucinaciones). El bench eligió un juez más fuerte — ver el PR.

## Roadmap

- Migrar los ~100 prompts de `scripts/bench-llm-judge.mjs` a casos declarativos.
- Apuntar el provider al sidecar `/nlu` real (no solo al modelo crudo) para
  evaluar el pipeline completo con grounding-AGE.
- Job CI no-bloqueante en el runner alpha (Ollama disponible).
- Red-team mensual (cron) que genera adversariales nuevos.
