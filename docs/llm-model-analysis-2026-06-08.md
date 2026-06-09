# Analisis de modelos LLM - 2026-06-08

## Decision actual

No promover Gemma 4 todavia. Mantener `granite3.1-dense:8b` como baseline de
chat hasta completar el mismo bench end-to-end, con sidecar y output guards,
contra `gemma4:e4b` y `gemma4:12b-it-qat`.

## Por que Gemma 4 cambia la evaluacion

Gemma 4 fue anunciado el 2 de abril de 2026. La familia incluye E2B, E4B, 26B
MoE y 31B dense. Google publico Gemma 4 12B el 3 de junio y checkpoints QAT el
5 de junio. Por eso los benches de mayo que promovieron Granite no sirven para
descartar Gemma 4.

Ollama publica actualmente:

| Candidato | Tamano Ollama aproximado | Papel a evaluar |
| --- | ---: | --- |
| `gemma4:e4b` | 9.6 GB | chat, NLU y posible consolidacion multimodal |
| `gemma4:12b-it-qat` | 7.2 GB | chat complejo y vision en una M6000 de 12 GB |
| `gemma4:26b` | 18 GB | fuera del presupuesto de VRAM local |
| `gemma4:31b` | 20 GB | fuera del presupuesto de VRAM local |

Aunque E4B tiene 4.5B parametros efectivos, su artefacto pesa mas que Granite
8B Q4. En la M6000 de 12 GB puede caber solo, pero la concurrencia con Kokoro,
Whisper o un segundo modelo requiere medicion. El 12B QAT entra en disco/VRAM
nominalmente, pero deja poco margen para KV cache y otros servicios.

## Cambios requeridos para evaluarlo correctamente

Gemma 4 recomienda `temperature=1.0`, `top_p=0.95` y `top_k=64`. Reutilizar la
configuracion de Granite (`temperature=0.3`) produciria un A/B sesgado. Tambien
es un modelo con thinking: el chat de Chagra debe desactivarlo para no pagar
latencia ni almacenar trazas; la ruta `reasoning` puede evaluarlo por separado.

El router ya aplica `temperature`, `top_p` y control de thinking cuando Gemma 4
se activa mediante `VITE_LLM_CHAT_MODEL` o `VITE_LLM_COMPLEX_MODEL`. `top_k`
solo se aplica en el benchmark nativo porque Ollama no lo expone en su endpoint
OpenAI-compatible. El benchmark largo acepta:

```bash
BENCH_MODELS=granite3_1_8b,gemma4_e4b,gemma4_12b_qat \
  node scripts/bench-agente-completo.mjs
```

## Gate de promocion

Promover solo si el candidato:

1. Iguala o supera a Granite en evaluacion semantica anti-alucinacion.
2. No regresa los casos BORDE ni las confusiones regionales conocidas.
3. Mantiene JSON valido en NLU si se propone consolidar esa ruta.
4. No expone thinking ni rompe streaming, stop sequences o memoria.
5. Cabe con margen operativo real en M6000 12 GB y no provoca swap/thrash.
6. Mejora calidad o reduce latencia de forma material; ahorrar un modelo por si
   solo no justifica una regresion agronomica.

## Hallazgos del stack actual

- El bench semantico final de BORDE marca 15/15 despues de output guards, pero
  ese resultado combina Granite con guardas; no demuestra que Granite crudo
  tenga 100% de precision.
- El scorer determinista de BORDE da falsos negativos masivos y no debe usarse
  como metrica primaria para elegir modelo.
- `chat` y `chat_complex` usan el mismo modelo. El router de complejidad cambia
  hoy limites de tokens y keep-alive, no capacidad del modelo.
- La documentacion historica CPU-only de Alpha quedo obsoleta tras activar la
  Quadro M6000; las decisiones nuevas deben usar el estado GPU actual.

## Fuentes

- Google, "Gemma 4: Our most capable open models to date", 2026-04-02:
  https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/
- Google, "Introducing Gemma 4 12B", 2026-06-03:
  https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemma-4-12b/
- Google, "Gemma 4 with quantization-aware training", 2026-06-05:
  https://blog.google/innovation-and-ai/technology/developers-tools/quantization-aware-training-gemma-4/
- Ollama Gemma 4 registry:
  https://ollama.com/library/gemma4
