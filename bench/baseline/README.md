# bench/baseline — referencias known-good del Bench Gate

Cada archivo `<bench>.json` es un registro de historial v1 (mismo esquema que
`bench/history/`, ver `bench/lib/history.mjs`) que representa el **nivel de
calidad aceptado en produccion** para ese bench. `bench/gate.mjs` compara la
corrida fresca de un PR contra este baseline y emite GREEN / YELLOW / RED segun
los umbrales de `Chagra-strategy/ops/BENCH_GATE_PIPELINE.md` §2:

- accuracy cae > 5pp -> RED (> 2pp -> YELLOW)
- hallucination sube > 3pp -> RED (> 1pp -> YELLOW)
- parse_rate cae > 2pp -> RED (> 1pp -> YELLOW)
- latency sube > 25% -> RED (> 10% -> YELLOW)

## Baselines actuales

| bench | config | referencia | notas |
|---|---|---|---|
| `borde-alucinacion` | PROD | granite3.3:8b, ah_pct 16 / pass_pct 84 | AH sellado (decision granite3.3, N=69). El bench de producto mas riguroso; pesado (GPU + claude-cli + fixtures-privadas). |
| `agro-rotatorio` | daily-rotating | granite3.3:8b | Drift diario base-variedad + alucinacion; corpus (sin GPU) -> default del gate. |

## Como actualizar un baseline

Cuando el operador acepta un nuevo nivel de calidad en produccion (ej. tras
mergear una mejora que el gate marco GREEN), se promueve la corrida nueva a
baseline:

```bash
# 1) correr el bench de producto (config-PROD, NUNCA el modelo crudo)
node bench/run.mjs borde-alucinacion
# 2) promover la corrida mas reciente a baseline
cp "$(ls -t bench/history/borde-alucinacion__*.json | head -1)" bench/baseline/borde-alucinacion.json
# 3) commitear el baseline nuevo con la justificacion en el mensaje
```

REGLA DURA: el baseline SIEMPRE sale de un bench de PRODUCTO (con tools/RAG/
sidecar), nunca del modelo crudo (`eval_completo.py` / config A). El bench crudo
da veredictos opuestos y no representa lo que ve el usuario.
