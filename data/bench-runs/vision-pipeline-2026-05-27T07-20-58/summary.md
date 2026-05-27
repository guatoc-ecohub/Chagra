# Bench Vision Pipeline — 2026-05-27T07-20-58

**Model**: llama3.2-vision:11b
**Fixtures**: 16
**Pipeline**: vision → resolveSpeciesId → sidecar validate_visual_match

## Métricas

| Métrica | Valor |
|---|---|
| Nombre común correcto | 12.5% (2/16) |
| Nombre científico correcto | 18.8% (3/16) |
| **Grounded: verified** | **12.5%** (2/16) |
| Grounded: rejected (anti-halluc) | 68.8% (11/16) |
| Grounded: no-binomial | 18.8% (3/16) |
| Sidecar error | 0.0% (0/16) |
| Vision latency p50 / p95 | 13329ms / 29057ms |
| Sidecar latency p50 / p95 | 19ms / 36ms |

## Comparación con bench crudo (sin grounding)

| | Crudo (vision-flora-2026-05-27) | Pipeline (este run) |
|---|---|---|
| Nombre común | 18.8% | 12.5% |
| Sci match (full) | 18.8% | 18.8% |
| Anti-halluc (rejected o no-binomial) | n/a | 87.5% |

## Interpretación

- **verified** = vision dijo X, sidecar confirma X existe en catálogo Chagra → seguro mostrar al user.
- **rejected** = vision dijo X, sidecar dice X NO existe → anti-halluc clave. Frontend debe mostrar warning amber.
- **no-binomial** = vision falló JSON o devolvió binomial inválido → mostrar "no se identificó".
- **sidecar-error** = sidecar timeout/5xx → degradar al vision result sin grounding.
