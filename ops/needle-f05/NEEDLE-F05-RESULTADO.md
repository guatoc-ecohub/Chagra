# Needle Fase 0.5: montaje del runtime oficial v2 + estabilización del LoRA

Fecha de la medición: 2026-08-12. Host: alpha (CPU). Todo local, sin nube.

## Veredicto

**GO-condicional para una Fase 1 de ingeniería.** Los dos bloqueos que dejó
la Fase 0 quedan resueltos y medidos con el runtime OFICIAL v2:

1. El WASM oficial de Needle 2 se montó y se midió de extremo a extremo (Node),
   cargando el modelo `needle2.cact` con `needle_load()`. Ya no es v1 comunitario.
2. El LoRA que divergía a `nan` quedó estabilizado con una causa raíz identificada
   y evidencia por paso; entrena finito y mejora el modelo en el corpus agro.

**NO-GO para producción / autonomía todavía**, por un motivo único y concreto:
la `confidence` calibrada del modelo base es ~0 en los dos casos de español
(0.0000 y 0.0003), tanto en nativo como en WASM. Con cualquier umbral razonable,
las dos llamadas escalan en vez de ejecutarse. Antes de comprometer producción,
Fase 1 debe exportar un `.cact` tuneado y demostrar que la confidence calibrada
sube por encima de un umbral accionable. Esa prueba no se puede hacer con el
runtime que se distribuye (ver "Limitación de la medición de confidence").

## Objetivo 1: medición del Needle 2 oficial (medición, no pronóstico)

### Camino usado y por qué

Se usó el **binario nativo `linux-x86_64`** como ground-truth (opción (a)) **y**
el **WASM en Node** (opción (b)) como target de despliegue. No se usó el wheel
Python para inferencia porque el wheel resultó ser *inference-only* y usa la misma
`libneedle.so` que el binario nativo; el binario da el mismo motor con menos capas.

- Nativo: binario auto-contenido de 14.8 MB con el modelo horneado. Se corrió con
  `--prompt` (una sola respuesta) y con `--serve` + `POST /reset` para medir
  latencia en caliente por llamada (una sesión conserva estado entre turnos, por
  eso hay que resetear entre mediciones o la segunda consulta se contesta como
  continuación de la primera).
- WASM: `needle.wasm` (308 KB) es sólo el motor; el modelo (14 MB) se carga aparte
  desde `needle2.cact` vía `needle_load()`. El harness Node está en
  `run/wasm_measure.cjs`.

`tools.json` (las dos tools en español) está en `run/tools.json`.

### Tabla de mediciones

Latencia en caliente, 3 corridas con `reset` entre cada una, alpha CPU.

| Camino | Caso | Llamada devuelta | Correcto | Latencia (ms) | confidence | decode tps |
|---|---|---|---|---|---:|---:|
| Nativo (serve) | cosecha | `registrar_cosecha({cantidad:3, unidad:"kg", cultivo:"tomate"})` | sí | 450 / 476 / 444 | 0.0000 | ~177 |
| Nativo (serve) | plaga | `consultar_control_plaga({plaga:"mosca_blanca"})` | tool sí, arg con guion bajo | 124 / 145 / 147 | 0.0003 | ~317 |
| WASM (Node) | cosecha | `registrar_cosecha({cantidad:3, unidad:"kg", cultivo:"tomate"})` | sí | 1367 / 1367 / 1390 | 0.0000 | ~58 |
| WASM (Node) | plaga | `consultar_control_plaga({plaga:"mosca_blanca"})` | tool sí, arg con guion bajo | 412 / 407 / 410 | 0.0003 | ~113 |

RAM pico reportada por el runtime nativo: ~26.8 MB (coincide con el claim de 28 MB
del README). El WASM no reporta RAM pico (`peak_ram_mb: 0`).

Salidas crudas (nativo, `--prompt`):

```json
{"type":"call","success":true,"function_calls":[{"name":"registrar_cosecha","arguments":{"cantidad":3,"unidad":"kg","cultivo":"tomate"}}],"reasoning":"'3 kilos' -> quantity 3, 'tomate' -> product_name 'tomate'. No unit specified, default to kg.","confidence":0.0000,"prefill_tps":551.8,"decode_tps":145.6,"peak_ram_mb":24.6}
```

### Hallazgos de la medición

- **Semántica correcta en español sin fine-tune**: el caso de cosecha sale exacto
  (`cantidad:3`, `unidad:"kg"`, `cultivo:"tomate"`); el modelo defaultea la unidad
  a `kg` cuando el texto dice "kilos". Corrige el defecto semántico del v1
  comunitario que reportó la Fase 0.
- **Defecto menor en plaga**: la tool y la intención son correctas, pero el
  argumento sale `"mosca_blanca"` (con guion bajo) en vez de `"mosca blanca"`.
  Es un artefacto de la gramática/tokenización, idéntico en nativo y WASM.
- **confidence ~0 en base** (0.0000 / 0.0003), reproduce la Fase 0. Con el contrato
  del modelo ("actúa por encima del umbral, escala por debajo"), ambas llamadas
  escalarían. Este es el hallazgo que gobierna el veredicto, y no se esconde.
- **Nativo vs WASM**: misma semántica y misma confidence (mismo motor y modelo).
  WASM decodifica ~3x más lento (58-113 tps vs 177-317 tps), de ahí la latencia
  mayor. El caso cosecha es más lento que plaga por la cadena de `reasoning` larga
  que decodifica (más tokens), no por la tool.

## Objetivo 2: estabilización del LoRA `nan`

### Causa raíz (con evidencia)

El wheel oficial `cactus_needle 2.0.0` **no trae código de entrenamiento**: sólo
expone `Needle`, `tool`, `Field`, `extract` (inferencia sobre `libneedle.so`). El
fine-tune vive en el repo `github.com/cactus-compute/needle` (JAX/Flax/optax),
en `needle/model/finetune.py`. Esa es la ruta que hay que usar, no el wheel.

Los pesos de `needle2.pkl` son **todos float16** (56 tensores). La función
`init_lora` del repo castea los adaptadores A y B a `weight.dtype`, o sea **fp16**,
y `optax.adamw` optimiza esos parámetros fp16 con `eps=1e-8`. En fp16 ese epsilon
subdesborda a 0 y el estado del optimizador no tiene resolución.

Reproducción instrumentada (`run/lora_train.py --mode stock`, config idéntica a F0:
rank 16, alpha 32, lr 1e-4, adaptadores fp16, AdamW, sin clip):

```
step 1/8  loss 1.4961  grad_norm 1.0040e-01      <- finito y sano
step 2/8  loss nan     grad_norm nan
  >>> FIRST NON-FINITE at step 2
  --- PREV lora params (input a step 2) --- mtp_block/self_attn/*/A,B: NON-FINITE
```

La clave: en el paso 1 el gradiente es finito (norma 0.10), pero **la actualización
de AdamW en fp16 al final del paso 1 produce parámetros LoRA `nan`** (el `mtp_block`
es el primero en caer). El paso 2 ya arranca con pesos `nan`. Por eso F0 divergía en
el paso 2 tanto con lr 1e-4 como 1e-6: no es el learning rate, es la precisión del
optimizador. Bajar el lr no ayuda porque el problema es el update fp16, no su tamaño.

### El arreglo

`run/lora_train.py --mode fixed` cambia exactamente tres perillas:

1. Adaptadores A/B y estado de AdamW en **float32** (la base fp16 queda congelada;
   el delta LoRA se castea a fp16 sólo dentro de `merge_lora` para el forward).
2. **Gradient clipping** por norma global 1.0 (`optax.clip_by_global_norm`).
3. Logits a **float32** antes del cross-entropy (estabilidad del softmax).

Resultado (10 épocas, 40 pasos, lr 3e-4, rank 16, alpha 32, clip 1.0, fp32):

```
step  1/40  loss 1.4961  grad_norm 1.1102e-01
step  2/40  loss 1.2787
...
step 38/40  loss 0.6132
=== RESULT mode=fixed: STABLE (all finite) ===
```

Los 40 pasos son finitos; la pérdida baja de ~1.50 a la banda ~0.6-0.9 (ruidosa por
el batch 16 sobre 50 ejemplos). Log completo en `run/fixed_train.log`.

### Evaluación base vs tuneado (medición, no pronóstico)

Métricas teacher-forced sobre los 50 ejemplos, en JAX, sobre los tokens objetivo
(`run/lora_eval.py`; no requiere cuantizar):

| Modelo | loss (CE) | accuracy próximo token |
|---|---:|---:|
| Base | 1.4569 | 84.2% |
| Tuneado (LoRA fp32) | 0.7497 | 89.1% |
| delta | −0.7072 | +4.9 pts |

El LoRA aprende el dominio: el cross-entropy cae casi a la mitad y la accuracy de
próximo token sube ~5 puntos. Es evidencia real de mejora, no un adaptador vacío.

### Limitación de la medición de confidence

No pude medir si la **confidence calibrada** sube tras el fine-tune. La cabeza de
confidence vive dentro del `.cact` en tiempo de ejecución, y el runtime que se
distribuye (wheel/binario nativo) usa el modelo horneado: `Needle.__init__` no
acepta `weights=`. Para medir confidence tuneada hay que `needle build` (merge +
cuantización a `.cact`) y servirlo con el runtime del repo (`playground`/`agent`,
que sí acepta `weights=`). Eso es trabajo de Fase 1 y es el gate que falta.

## Qué queda para Fase 1 (gate)

1. `needle build models/needle2.pkl --lora run/ckpt/needle_lora_fixed.pkl` para
   exportar un `.cact` tuneado y correrlo con el runtime que carga pesos externos.
2. Demostrar que la **confidence calibrada** de los dos casos supera un umbral
   accionable con el modelo tuneado (hoy la base da ~0 → todo escala).
3. Corregir el argumento `"mosca_blanca"` → `"mosca blanca"` (ampliar el corpus
   con variantes de nombres compuestos, o post-procesar el guion bajo).
4. Montar el WASM oficial (`needle.wasm` + `needle2.cact` tuneado) en el Web Worker
   del prototipo, no sólo en Node.

Hasta que (1) y (2) pasen, producción sigue en **NO-GO**; ingeniería en **GO**.

## Reproducibilidad

- `run/env.sh`: variables para JAX/numpy en NixOS (`LD_LIBRARY_PATH` a gcc-lib 64-bit
  + zlib; `JAX_PLATFORMS=cpu` para no competir con Ollama en GPU).
- `run/tools.json`: las dos tools.
- `run/lora-50.jsonl` + `run/make-lora-dataset.mjs`: corpus local (25 cosecha + 25
  plaga), sin generador cloud (`--generate 0`, OPENROUTER nunca se toca).
- `run/lora_train.py`: repro del `nan` (`--mode stock`) y arreglo (`--mode fixed`).
- `run/lora_eval.py`: base vs tuneado.
- `run/wasm_measure.cjs`: medición WASM en Node.

Fuera de git por `.gitignore` (todo re-obtenible, Apache-2.0):
- `models/` (`needle2.cact`, `needle2.pkl`, el wheel) — de HF `Cactus-Compute/needle2`.
- `vendor/` (`needle.wasm`, `needle.js`, `tokenizer.*`, `config.json`, `needle.h`,
  `README.md`) — mismo repo HF, carpeta `wasm/` + raíz.
- `linux-x86_64/needle` — binario nativo, de HF `.../linux-x86_64/needle`.
- `.venv-needle/`, `run/needle-src/` (repo de entrenamiento
  `github.com/cactus-compute/needle`), `run/wheel-src/`, `run/ckpt/` (adaptadores).
