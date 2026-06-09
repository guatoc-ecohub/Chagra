# Bench Candidatos LLM — gemma4:e4b vs granite3.3:8b

## Ejecución

- **Inicio**: 2026-06-08T22:35:09-05:00
- **Fin**: 2026-06-08T23:37:59-05:00
- **Duración**: 62.82 min
- **Script**: `scripts/bench-agente-completo.mjs`
- **50 prompts** | Categorías: species(20), biopreparados(12), plagas(10), normativa(4), agroforestería(4)
- **Output persistente**: `/home/kortux/Workspace/bench-results/llm-candidates-2026-06-08/`

## Modelos evaluados

| Modelo | Exitosos | Win rate | Latencia avg | Keywords avg | Halluc avg | VRAM |
|---|---|---|---|---|---|---|
| **gemma4:e4b** | 50/50 | **74%** (37/50) | 37.1s | 54.5% | 5.1 | 10.6 GB |
| **granite3.3:8b** | 50/50 | 26% (13/50) | **33.3s** | 45.5% | **4.4** | **7.0 GB** |

## Modelos descartados

- **qwen3.5:9b**: 0/4 keywords en 24 prompts, HTTP 400 en post-validate. Paliza, excluido en corrida final.

## Incidentes

- `gemma4:12b-it-qat` requerido por preflight del bench pero incompatible con Ollama 0.24.0 (NixOS). Se parchó MODELS temporalmente (sin tocar cola de código permanente).
- LLM-judge post-procesamiento falló (target default granite3.1-dense:8b no estaba en el bench). No afecta resultados.
- Ambos modelos mostraron ~10 GB de swap — presión de memoria alta.

## Decisión

Revisión humana requerida. gemma4:e4b gana en calidad (74% win, 54.5% keywords) pero pide 10.6 GB VRAM y alucina más. granite3.3:8b es más rápido (33.3s), ligero (7 GB VRAM) y alucina menos.
