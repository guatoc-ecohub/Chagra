# Embedder fine-tune experiment — nombres regionales de especies (2026-07-15)

Experimento de fine-tuning contrastivo sobre un embedder multilingüe (`intfloat/multilingual-e5-large`)
usando pares reales `(nombre regional/común, especie)` extraídos del grafo de conocimiento de Chagra
(`RegionalLabel` + `Species.nombres_comunes`), con negativos duros por género/familia botánica.

**Objetivo:** medir si un embedder fine-tuneado sobre nombres regionales colombianos distingue mejor
especies fácilmente confundibles en el habla campesina (`papa`/`papaya`/`papayuela`, passifloras,
`tomate`/`tomate de árbol`, `brassica oleracea`, `arracacha`/`yuca`) que un embedder pretrained sin tocar.

**Resultado (ver `results/` para el JSON completo):**

| Métrica | Base | Fine-tuned | Δ |
|---|---|---|---|
| Recall@1 global | 31.6% | 36.2% | +4.7pp |
| Recall@5 global | 43.6% | 49.9% | +6.3pp |
| MRR global | 0.373 | 0.421 | +0.049 |
| Recall@1 confundibles | 28.6% | 33.2% | +4.5pp |
| Recall@5 confundibles | 42.7% | 54.3% | +11.6pp |

El fine-tune mejora sustancialmente en 3 de 5 grupos de confundibles (tomate/tomate-de-árbol,
brassica oleracea, papa/papaya/papayuela) pero **no mejora** (o empeora levemente) en passifloras
y en arracacha-vs-yuca — este último es un caso de confusión entre familias botánicas distintas
(Apiaceae vs Euphorbiaceae) que los negativos duros por taxonomía no cubren. **Veredicto: no se
reemplaza el embedder de producción con este checkpoint** — la señal es real y vale la pena iterar,
pero el resultado es desparejo en justo los casos más difíciles. Detalle completo, tabla de
confundibles y el hallazgo de un artefacto de colapso (documentos vacíos en el corpus atrayendo
queries fuera de distribución) en el reporte interno de operaciones.

## Reproducir

Requiere GPU (o CPU, más lento) con `torch` + `transformers` instalados, y acceso al grafo AGE de
Chagra (`chagra_kg`, Apache AGE sobre Postgres) para regenerar los pares. Los scripts asumen que
ya existen tres extractos planos del grafo (`species.jsonl`, `regional_labels.jsonl`,
`species_family.psv` — ver cabecera de `build_pairs.py` para el formato exacto y las queries Cypher
usadas para generarlos).

```bash
# 1. Construir pares + split honesto por especie + corpus de recuperación
python build_pairs.py

# 2. Entrenar (InfoNCE manual + negativos duros por género/familia, sin sentence-transformers)
python train_embedder.py --epochs 4 --batch-size 16 --neg-k 2

# 3. Evaluar base vs fine-tuned (recall@1/@5/MRR global + subset de confundibles)
python eval_embedder.py --model intfloat/multilingual-e5-large --tag base --out results/eval_base.json
python eval_embedder.py --model <path al checkpoint fine-tuneado> --tag finetuned --out results/eval_finetuned.json

# 4. (Opcional) exportar a ONNX para servir sin torch/CUDA
python export_onnx.py
```

No se incluye el checkpoint del modelo (binarios grandes, no van en este repo) — solo el código y
las métricas para reproducir el experimento.
