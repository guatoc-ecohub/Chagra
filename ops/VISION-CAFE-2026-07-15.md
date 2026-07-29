# Clasificador de enfermedades del café con datos de campo (RoCoLe + BRACOL) — 2026-07-15

Entrenado en `alpha` con la RTX 3090 (compartida con un bench de embedders en paralelo) en la
ventana de horas antes de que la tarjeta saliera. Rama `feat/vision-cafe-rocole`.

## TL;DR / veredicto honesto

**No va a producción tal como está. No le gana al 5/8 de la torre multimodal.**

Se entrenó un EfficientNet-B0 (5 clases: sana/roya/minador/phoma/cercospora) sobre 1443 imágenes
reales de RoCoLe+BRACOL (datasets de campo verificados, licencia CC BY 4.0 confirmada
independientemente — no CC BY-NC-SA 4.0 como decía el DR). El modelo generaliza MUY bien dentro
de su propio dataset (test acc 0.896, macro F1 0.845, split respetando hoja/planta donde el
dataset lo permite) pero **falla las dos únicas fotos de café-enfermedad-de-hoja realmente
comparables de Chagra (`hemileia_vastatrix.jpg`, `cercospora_coffeicola.jpg`): 0/2, incluyendo un
caso de roya con síntoma inconfundible clasificado como "sana" con 94% de confianza.** Un segundo
intento con augmentación mucho más agresiva (run2), diseñado específicamente para atacar esa
brecha, no la cerró — y empeoró el modelo en su propio test interno. Esto es evidencia de que el
problema no es de augmentación sino de **diversidad de fuente**: BRACOL/RoCoLe son datasets "de
campo" en el sentido de que las plantas están enfermas de verdad, pero comparten un protocolo
fotográfico específico (hoja aislada, fondo controlado, alta resolución) que sigue siendo
distinto de una foto libre de celular con mano en el cuadro y fondo de finca. El clasificador
tampoco sabe dudar de forma confiable: 13-14 de 15 fotos fuera de dominio (otro cultivo, u otra
parte de la planta) recibieron una respuesta confiada en vez de abstención.

**Lo que sí queda listo y es reusable**: datasets bajados/auditados/licenciados de verdad (con
dos hallazgos de licencia y tamaño que corrigen al DR), un mapeo de taxonomía documentado
(incluida la trampa "cercospora" ≠ "ojo de gallo colombiano"), un pipeline de entrenamiento
reproducible con split leaf-safe donde el dataset lo permite, y un artefacto que **sí** corre sin
la Ampere (verificado en CPU, ONNX exportado) — sólo que no es lo bastante bueno para
diagnosticar en campo todavía. El camino correcto de acá es más fotos de campo REALES de Chagra
(no aumentadas), no más ingeniería de augmentación sobre las mismas 1443 imágenes.

## 1. Datasets: qué se bajó, licencia verificada, conteo real

### RoCoLe — verificado, NO como decía el DR

El DR (`Chagra-strategy/deepresearch/DR-FANOUT/datasets-pblicos-...`) decía **~15.000 imágenes,
CC BY-NC-SA 4.0**. Verificado empíricamente contra la API pública de Mendeley Data
(`https://data.mendeley.com/public-api/datasets/c5yvn32dzg?version=2`), **ambos datos son
incorrectos**:

- **Tamaño real: 1560 imágenes** (el paper original — Paraga-Alava et al. 2019, PMC6727496 —
  lo dice explícitamente: "1560 robusta coffee leaf images"). El DR sobreestimó por ~10x.
- **Licencia real: CC BY 4.0** (Creative Commons Attribution, SIN NonCommercial ni ShareAlike),
  confirmada en el campo `data_licence` de la respuesta JSON de la API oficial de Mendeley, no
  en la página de aterrizaje. Es MÁS permisiva que lo que decía el DR, así que sigue siendo
  compatible con el catálogo de Chagra (CC BY-NC-SA 4.0, verificado en
  `catalog/LICENSE.md` de este repo) — una obra CC BY se puede incorporar sin problema a una
  colección con más restricciones, mientras se dé atribución.
- Fuente: Parraga-Alava, J., Cusme, K., Loor, A., Santander, E. (2019). "RoCoLe: A robusta
  coffee leaf images dataset for evaluation of machine learning based methods in plant diseases
  recognition." Mendeley Data V2, doi: 10.17632/c5yvn32dzg.2.

**Descarga incompleta — causa documentada, no oculta.** La API de listado de archivos de
Mendeley (`/api/datasets/<id>/files`) está rota para paginación: ignora por completo el header
`Range: items=N-M` y cualquier variante de query params probada (`offset`, `page`, `folder_id`
explícito) — siempre devuelve los primeros 100 elementos sin importar lo pedido (confirmado con
`content-range` idéntico en cada respuesta). El endpoint "download all" tampoco sirve (cae en un
buscador genérico no relacionado al dataset). Sin acceso a un token de sesión de navegador real
no se pudo forzar la paginación en el tiempo disponible. **Resultado: se bajaron 100/1560
imágenes (6.4%)**, con checksum verificado por tamaño. Las 100 sí tienen etiqueta fiable: el
propio nombre de archivo codifica planta + estado (`C<n>P<m><E|H><k>.jpg`, `E`=enferma/roya per
la descripción del dataset, `H`=sana) — ver limitación de esa asunción en la sección de mapeo.

### BRACOL — verificado, con un hallazgo serio: el zip alojado en Mendeley está corrupto

- **Licencia real: CC BY 4.0** (igual verificación contra la API oficial de Mendeley Data,
  dataset `yy2k5y8mxg` v1, campo `data_licence.short_name`). El DR también decía CC BY-NC-SA
  4.0 para este — mismo patrón de sobre-restricción reportado incorrectamente.
- **Tamaño real: 1747 imágenes** (leaf dataset), confirmado contra el paper original (Esgario,
  Krohling, Ventura 2020, "Deep learning for classification and severity estimation of coffee
  leaf biotic stress", arXiv:1907.11561): "272 healthy, 387 leaf miner, 531 rust, 348 brown leaf
  spot (phoma), 147 cercospora" = 1685 de las 5 clases de etiqueta única + 62 filas "mixed" (dos
  enfermedades empatadas, sin ganador claro) = **1747**, y esa distribución coincide dígito por
  dígito con la que se extrajo directamente del `dataset.csv` incluido en el zip (ver tabla en la
  sección 3) — cruce de verificación independiente exitoso. El DR decía ~3.000 — otra
  sobreestimación (~1.7x).
- **El .zip alojado en Mendeley (`yy2k5y8mxg`, 164,516,964 bytes) está truncado en origen.**
  `sha256sum` del archivo descargado coincide EXACTAMENTE con el hash publicado por la API de
  Mendeley (`25a2fc97...5fdfc1f`) — no es un error de red, el archivo hosteado ahí ya está roto
  (le falta el End-Of-Central-Directory; `p7zip` lo confirma: "Unexpected end of archive",
  physical size esperado 164,583,270 vs 164,516,964 bytes reales, diferencia de ~66 KB en la
  cola). Se recuperó todo lo posible con `p7zip` (que reconstruye por escaneo de local file
  headers en vez de depender del directorio central): **1402/1747 imágenes recuperadas (80.3%)**,
  más el `dataset.csv` completo con las 1747 etiquetas (el CSV en sí no estaba dañado). El primer
  archivo (`coffee-datasets/`) y el índice sobrevivieron; lo que falta son ~345 imágenes
  dispersas por todo el archivo (no solo la cola), consistente con un orden de escritura no
  secuencial en el zip original.

### CoffeeNet

No se bajó. Con el reloj corriendo y el hallazgo de que el DR se equivocó en licencia Y tamaño
para los dos datasets anteriores, se priorizó verificar y entrenar sobre RoCoLe+BRACOL (que ya
dieron ~1450 imágenes utilizables) en vez de perseguir un tercer dataset de licencia sin
verificar. Queda como trabajo futuro explícito.

## 2. Mapeo de taxonomía de clases — la trampa que pide la tarea

**NO se asumió que "rust"=="roya" con el mismo criterio en los dos datasets sin revisar.**
Los dos, BRACOL y RoCoLe, resultaron describir la MISMA enfermedad (*Hemileia vastatrix*, roya)
para su etiqueta positiva, verificado contra ambos papers originales — así que la fusión es
válida para esa clase. Pero hay una trampa real y documentada, no hipotética:

- **BRACOL/RoCoLe llaman "cercospora" a *Cercospora coffeicola*** (mancha de cercospora, "mancha
  de hierro" en Brasil). **En Colombia, "ojo de gallo" casi siempre se refiere a *Mycena
  citricolor*** (mancha americana de la hoja), un hongo DISTINTO. Chagra ya tiene una foto de
  campo para *Mycena citricolor* (`mycena_citricolor.jpg`) que NO corresponde a la clase
  "cercospora" del modelo. Esto se documenta explícitamente en el eval de las 18 fotos (sección
  7) — si el modelo predice "cercospora" para esa foto, es una coincidencia de nombre común, no
  un diagnóstico correcto, y el reporte lo marca así.

Tabla de mapeo final usada (5 clases):

| Clase canónica (modelo) | BRACOL `predominant_stress` | RoCoLe | Especie |
|---|---|---|---|
| `sana` | 0 (272 leaves) | `H` (healthy) | — |
| `roya` | 2 (531 leaves) | `E` (unhealthy, per descripción del dataset) | *Hemileia vastatrix* |
| `minador` | 1 (387 leaves) | no presente | *Leucoptera coffeella* |
| `phoma` | 3 (348 leaves, "brown leaf spot") | no presente | *Phoma sp.* |
| `cercospora` | 4 (147 leaves) | no presente | *Cercospora coffeicola* (≠ ojo de gallo colombiano) |
| excluido | 5 ("mixed", 62 leaves — dos enfermedades empatadas sin ganador claro) | — | — |

**Asunción marcada explícitamente, no verificada de forma independiente**: RoCoLe describe su
clase "unhealthy" como "visible mites and spots (denoting coffee leaf rust presence)" en la
propia página del dataset — se tomó esa descripción al pie de la letra para mapear `E`→`roya`.
No se pudo cruzar contra un archivo de severidad/anotación separado (no se logró listar el
archivo completo del dataset por la falla de paginación de la API descrita arriba), así que si
alguna de las 50 imágenes `E` descargadas fuera en realidad ácaro rojo (mencionado también en la
descripción) y no roya, quedaría mal etiquetada. Riesgo acotado: son 50/1443 imágenes (3.5% del
total de entrenamiento).

## 3. Conteos reales (post-fusión, post-limpieza)

Generado por `scripts/ml/vision-cafe/prep_manifest.py` (ver
`/home/kortux/datasets/cafe/manifests/prep_summary.json` para el JSON completo).

- BRACOL: 1747 filas en `dataset.csv` → 62 excluidas por `predominant_stress==5` (mixed/empate,
  ambiguo para etiqueta única) → 342 sin archivo de imagen recuperable (el zip corrupto, sección
  1) → **1343 imágenes utilizables**.
- RoCoLe: 100/100 archivos descargados, 100 parseados correctamente por el patrón de nombre
  (`C<n>P<m><E|H><k>.jpg`) → **100 imágenes utilizables**.
- **Total combinado: 1443 imágenes.**

| clase | BRACOL | RoCoLe | total |
|---|---:|---:|---:|
| sana | 142 | 50 | 192 |
| roya | 465 | 50 | 515 |
| minador | 254 | 0 | 254 |
| phoma | 346 | 0 | 346 |
| cercospora | 136 | 0 | 136 |

Split resultante (train/val/test, agrupado por hoja/planta donde el dataset lo permite —
sección 4):

| split | sana | minador | roya | phoma | cercospora | total |
|---|---:|---:|---:|---:|---:|---:|
| train | 128 | 174 | 362 | 242 | 105 | 1011 |
| val | 34 | 41 | 69 | 50 | 17 | 211 |
| test | 30 | 39 | 84 | 54 | 14 | 221 |

`cercospora` es la clase más chica en las tres particiones (14 imágenes en test) — cualquier
métrica por-clase de esa clase en particular tiene el intervalo de confianza más ancho de las
cinco; se señala explícitamente al leer la sección 6.

## 4. Split — por hoja/planta cuando el dataset lo permite, limitación explícita cuando no

- **RoCoLe: split leaf/plant-safe.** El nombre de archivo codifica el id de planta
  (`C<n>P<m>...`). Todas las imágenes de la misma planta quedan en el MISMO split
  (train/val/test) — nunca partidas entre dos. Implementado como agrupamiento explícito antes
  del split aleatorio (no split por imagen).
- **BRACOL: split por imagen, NO por hoja — limitación explícita, no ocultada.** El
  `dataset.csv` liberado por los autores expone solo un `id` secuencial plano, sin ningún campo
  de hoja/planta/parcela. No hay forma de saber, con los metadatos publicados, si dos ids
  distintos son fotos de la misma hoja física. **Si BRACOL contiene fotos repetidas de la misma
  hoja bajo ids distintos, la porción BRACOL de la métrica de test podría estar optimista.** Se
  buscó evidencia indirecta (nombres de archivo secuenciales sin patrón de agrupamiento visible)
  pero no se pudo confirmar ni descartar en el tiempo disponible.
- Split final: 70/15/15 train/val/test, agrupado como se describe arriba.

## 5. Modelo y entrenamiento

- **Backbone: EfficientNet-B0** (torchvision, pesos ImageNet1K_V1), fine-tune completo.
  Justificación: (a) dataset chico (~1450 imágenes) — un ViT sin datos/regularización extra
  generaliza peor que una CNN con sesgo inductivo; (b) **tiene que sobrevivir sin la Ampere**
  (CPU o Quadro M6000 sm_52, que torch 2.11 ni siquiera trae kernels CUDA para) — EfficientNet-B0
  son 5.3M parámetros contra 28M de ConvNeXt-Tiny o 86M de ViT-B/16, la única opción cómoda para
  inferencia en CPU de las tres; (c) precedente fuerte en la literatura de diagnóstico de café
  por imagen (los propios papers de BRACOL/RoCoLe usan arquitecturas de esta familia).
- **Augmentación pensada para el campesino** (celular barato, mala luz, ángulo raro, hoja en la
  mata, no arrancada): `RandomResizedCrop` (encuadres variables), `ColorJitter` agresivo
  (brillo/contraste/saturación — simula mala luz), `GaussianBlur` aplicado con probabilidad 35%
  (desenfoque de cámara barata/mano temblando), `RandomPerspective` (ángulos no frontales),
  `RandomRotation`, `RandomErasing` (oclusión parcial — dedo, otra hoja tapando).
- **Loss ponderada por clase** (inverso de frecuencia) para compensar el desbalance (roya 531 en
  train vs cercospora 105).
- **run1** (augmentación base): 35 epochs, 416.5s (~7 min) en la RTX 3090, batch 24, compartida
  en paralelo con un bench de embedders (otro `codex` de otra tarea) — `nvidia-smi` mostró
  6.6-8.4 GB en uso por el vecino durante toda la corrida, nunca se acaparó la tarjeta.
  `best_val_macro_f1 = 0.896` en epoch 30.
- **run2** (augmentación reforzada, motivada por el hallazgo de la sección 7): mismo dataset y
  split, `RandomResizedCrop` con escala más agresiva (0.3-1.0 en vez de 0.6-1.0, para que el
  modelo vea la hoja ocupando una fracción chica del cuadro y no solo hoja-llena-el-cuadro como
  en BRACOL/RoCoLe), `RandomAffine` con traslación (hoja descentrada), `RandomErasing` más
  agresivo (hasta 35% del área, p=0.5, simula mano/otra hoja tapando parte), y una pasada de
  downsample→upsample aleatoria (simula compresión/resolución baja de celular barato). 40
  epochs.

## 6. Métricas — por clase, no accuracy global

**run1**, sobre el split de test (n=221, leaf/plant-safe para RoCoLe, image-level para BRACOL,
ver limitación de la sección 4). Accuracy global = 0.896 — **se reporta pero no es la métrica
que importa**, ahí abajo está el desglose real:

| clase | precision | recall | f1 | n (test) |
|---|---:|---:|---:|---:|
| roya | 0.900 | 0.964 | 0.931 | 84 |
| phoma | 0.980 | 0.889 | 0.932 | 54 |
| minador | 0.917 | 0.846 | 0.880 | 39 |
| sana | 0.848 | 0.933 | 0.889 | 30 |
| **cercospora** | **0.615** | **0.571** | **0.593** | 14 |

macro F1 = 0.845. **cercospora es, con claridad, la clase débil** — la más chica de las cinco
(14 en test) y la que peor generaliza.

Matriz de confusión (filas=verdadero, columnas=predicho, orden `[cercospora, minador, phoma,
roya, sana]`):

```
              pred_cercospora  pred_minador  pred_phoma  pred_roya  pred_sana
true_cercospora        8            0            0          5          1
true_minador            1           33            1          3          1
true_phoma               3           1           48          0          2
true_roya                1           1            0         81          1
true_sana                 0          1            0          1         28
```

**El error que más importa clínicamente**: de 14 hojas verdaderamente `cercospora` en test, **5
(36%) fueron clasificadas como `roya`.** Ese es exactamente el escenario que la tarea advierte
como peligroso — confundir cercospora con roya manda a comprar/aplicar el fungicida
equivocado. `phoma` y `roya` en cambio casi no se confunden entre sí ni con las demás (ambas con
recall >88%).

## 7. La prueba que decide: las 18 fotos reales de campo

**Aviso de alcance, antes de los números**: el clasificador es de **enfermedades de HOJA de
café, 5 clases**. De las 18 fotos en `public/plaga-images/`, la gran mayoría NO son ni café ni
enfermedad de hoja (papa, yuca, banano, maíz, frijol, cacao, plagas de fruto/raíz). Comparar un
accuracy global de "X/18" sería una cifra sin sentido — se reporta en dos partes:

1. **Subconjunto estrictamente dentro de dominio** (café, enfermedad de hoja, en la taxonomía
   de 5 clases del modelo): sólo 2 de las 18 fotos califican sin ambigüedad —
   `hemileia_vastatrix.jpg` (roya) y `cercospora_coffeicola.jpg` (cercospora). No se encontró el
   reporte fuente del "5/8" de la torre multimodal pese a buscarlo (no está en los archivos de
   `Chagra-strategy/ops/` revisados); se toma como dato dado por la tarea, con la salvedad de que
   probablemente evaluaba sobre un conjunto de fotos/criterio distinto (multi-cultivo, no solo
   café-hoja), así que la comparación numérica directa es débil incluso siendo honesta al
   respecto.
2. **Comportamiento ante fotos fuera de dominio** (15 fotos: otro cultivo, o plaga de fruto/
   raíz no de hoja): la prueba real de "debe saber dudar".

**Resultado run1 — MALO, y se reporta así:**

| foto | predicción | confianza | ¿abstiene? (umbral 0.55) | dominio |
|---|---|---:|---|---|
| `hemileia_vastatrix.jpg` (roya, síntoma muy visible) | **sana** ❌ | 0.943 | no | dentro de taxonomía |
| `cercospora_coffeicola.jpg` (cercospora, lesión chica) | **sana** ❌ | 0.519 | sí (borderline) | dentro de taxonomía |

**Subconjunto estricto dentro de dominio: 0/2 correctas. NO le gana al 5/8 (62.5%) de la torre
multimodal — al contrario, se equivoca en las dos.**

Inspección visual de las dos fotos (se miraron directamente, no se infirió): `hemileia_vastatrix.jpg`
muestra una hoja sostenida por una mano, con pústulas naranjas cubriendo gran parte del envés —
síntoma de manual, inconfundible a simple vista — sobre un fondo de finca desenfocado.
`cercospora_coffeicola.jpg` muestra una hoja sobre una superficie de concreto, con UNA sola
lesión pequeña bien definida (mancha oscura con halo amarillo) — el resto de la hoja está sana,
así que la confusión con "sana" es más comprensible ahí (predomina el área sana en el cuadro).

**Diagnóstico (no solo el número, la causa)**: las fotos de entrenamiento de BRACOL/RoCoLe son
de hoja completa, fondo liso/controlado, resolución alta (2048×1024, estilo "hoja sobre mesa de
trabajo/fondo neutro" consistente con el protocolo de cuantificación de severidad de esos
papers). Las fotos reales de Chagra (540-720px, unos pocos KB) tienen mano en el cuadro, fondo de
finca desordenado, y la hoja no siempre llena el encuadre. **Esto es un segundo salto de brecha
de dominio, más allá de "laboratorio vs campo"**: incluso dos datasets académicos "de campo"
tienen su propio protocolo fotográfico (hoja aislada, fondo controlado) que no es lo mismo que
una foto libre de celular. Se probaron variantes de preprocesamiento en inferencia (crop más
amplio, resize sin crop, five-crop promediado) sobre el mismo checkpoint de run1 — mejoran algo
la confianza en `cercospora_coffeicola.jpg` (hasta acertar con resize320+centercrop y five-crop)
pero **`hemileia_vastatrix.jpg` sigue prediciendo "sana" en todas las variantes probadas** — no
es un artefacto de crop, es que el modelo no generalizó el patrón visual de roya fuera del
protocolo fotográfico de sus datos de entrenamiento.

**Comportamiento fuera de dominio (15 fotos)**: 14/15 respondieron con confianza ≥ 0.55 a pesar
de no ser ni café ni enfermedad de hoja — el modelo casi nunca duda cuando debería. Ejemplos:
`alternaria_solani.jpg` (tizón de papa/tomate) → predicho "roya" con 0.994 de confianza;
`ustilago_maydis.jpg` (carbón del maíz) → "roya" con 0.993; `moniliophthora_perniciosa.jpg`
(escoba de bruja del CACAO, no café) → "sana" con 0.991. **El modelo no sabe dudar** — el umbral
de confianza tal como está calibrado no sirve como salvaguarda de producción.

`mycena_citricolor.jpg` (el "ojo de gallo" colombiano de verdad, hongo distinto al `cercospora`
de BRACOL) predijo "sana" con 0.606 — por encima del umbral, otro falso negativo, y confirma la
trampa de taxonomía documentada en la sección 2: aunque hubiera acertado con "cercospora" ahí,
habría sido un acierto de nombre común, no de hongo.

Tabla completa y JSON crudo: `/home/kortux/qlora-out/vision-cafe/eval_18_results.json`, generado
por `scripts/ml/vision-cafe/eval_18.py` (evaluado con una copia congelada de las 18 fotos
originales — ver nota en el script sobre por qué no se leyó `public/plaga-images/` en vivo).

### 7.2 Resultado run2 (augmentación reforzada) — la hipótesis se probó y NO alcanzó

40 epochs, 352.6s, misma GPU compartida. **Test interno (split leaf/plant-safe) empeoró respecto
a run1**: acc 0.819 (vs 0.896), macro F1 0.763 (vs 0.845). El costo se concentra en
`cercospora`: recall subió (0.571→0.643) pero precision se hundió (0.615→0.290) — la
augmentación más agresiva volvió al modelo más propenso a gritar "cercospora" en general,
incluyendo 9 hojas que en verdad eran `roya` (antes solo 1 en run1). Cambió qué confusión
domina, no la resolvió.

**Contra las 18 fotos reales, la hipótesis tampoco se sostuvo:**

| foto | run1 | run2 |
|---|---|---|
| `hemileia_vastatrix.jpg` | sana ❌ (conf 0.943) | sana ❌ (conf 0.894) |
| `cercospora_coffeicola.jpg` | sana ❌ (conf 0.519, casi abstiene) | sana ❌ (conf 0.901, **peor** — ahora confiado) |

**run2: 0/2 en el subconjunto estricto, igual que run1.** Fuera de dominio: 13/15 respuestas
confiadas (vs 14/15 en run1) — mejora marginal, sigue sin saber dudar de forma confiable.

**Conclusión del experimento**: la augmentación más agresiva (crops parciales, hoja
descentrada, oclusión más grande, degradación tipo celular barato) no cerró la brecha, y en el
propio test interno la empeoró. Esto es evidencia en contra de que el problema sea *solamente*
encuadre/resolución — apunta a que el gap es más fundamental: el modelo aprendió texturas/
colores específicos del protocolo fotográfico de BRACOL+RoCoLe (iluminación de estudio, fondo
neutro consistente) que no se replican con augmentación sintética sobre las mismas fotos base.
La solución real sería más diversidad de FUENTE (fotos de campo genuinas, no aumentadas), no más
augmentación sobre las mismas ~1450 imágenes.

**Artefacto final elegido: run1.** Mejor en las tres dimensiones medidas (test interno, y no
peor en las 18 fotos reales) — se descarta run2 para producción, se documenta como intento
fallido, no se oculta.

## 8. Empaquetado — verificado SIN la Ampere

Artefacto final: **run1** (mejor en todas las métricas medidas). `export_package.py` carga el
checkpoint con `map_location="cpu"` y corre una inferencia sin tocar CUDA en ningún punto del
camino:

- **Carga: 0.095s. Inferencia de una imagen en CPU: 31.6ms.** Suficientemente rápido para servir
  detrás de un endpoint sin GPU (la M6000 sm_52 sobra para esto, ni siquiera hace falta —CPU puro
  ya cumple).
- **ONNX exportado con éxito** (16.0 MB) — tuvo que forzarse el exportador legado
  (`dynamo=False`) porque el exportador nuevo por-default de torch≥2.9 requiere el paquete
  opcional `onnxscript`, no instalado en el venv `qlora-dpo` (no se instaló nada nuevo ahí, por
  la regla dura de no tocar ese venv sin `--no-deps`).
- Artefactos en `/home/kortux/qlora-out/vision-cafe/`: `model.pt` (16.3 MB, peso principal),
  `model.onnx` (16.0 MB), `MANIFEST.json`, `classes.json`, `cpu_only_check.json`,
  `eval_18_results.json` / `eval_18_results_run2.json`, `test_results_run1.json` /
  `test_results_run2.json`, `train_log_run1.json` / `train_log_run2.json`.
- **La verificación "sin Ampere" pasa.** Lo que no pasa es la de calidad (sección 7) — son dos
  preguntas distintas y las dos se responden por separado, tal como pide la tarea.

## 9. Veredicto honesto: ¿a producción o no?

**NO.** Con la evidencia de esta corrida, este clasificador no debe reemplazar ni complementar el
diagnóstico visual de Chagra todavía. Razones concretas:

1. **Falla el único test que importa** (fotos reales de campo de Chagra), no el test que se
   inventó el propio pipeline (el split interno de BRACOL/RoCoLe). 0/2 en el subconjunto
   estrictamente comparable, incluyendo un falso negativo confiado al 94% sobre un caso de roya
   con síntoma de manual.
2. **No sabe dudar.** El objetivo explícito de la tarea era que el modelo tuviera un umbral de
   confianza útil para abstenerse; en la práctica, 13-14 de 15 fotos claramente fuera de dominio
   recibieron una respuesta confiada. Desplegar esto tal cual **es peor que no tener modelo**:
   le daría a un campesino una etiqueta con apariencia de certeza sobre una enfermedad de otro
   cultivo, o "sana" sobre una hoja con roya visible.
3. **El segundo intento (más augmentación) no lo arregló** y empeoró el modelo en su propia
   métrica interna — descarta la hipótesis más barata de arreglar esto (más tiempo de GPU con la
   misma data) y apunta a que hace falta más DATOS reales, no más entrenamiento.
4. `cercospora` (la clase más chica, 14 imágenes en test) es estructuralmente débil incluso
   dentro del propio dataset (f1=0.593 en run1) — con 3-4x menos ejemplos que roya, cualquier
   despliegue real necesitaría más datos de esa clase de todas formas.

**Lo que SÍ vale de este trabajo** (no se tira, por la regla dura de la tarea sobre reportar
Fase 1 aunque la Fase 2/3 no llegue a buen puerto):

- Datasets bajados, auditados y con licencia verificada de forma independiente — corrige dos
  errores del DR (licencia y tamaño) que habrían quedado sin detectar si se hubiera confiado en
  el documento en vez de verificar contra la fuente primaria.
- Pipeline de entrenamiento reproducible (`scripts/ml/vision-cafe/`), con manejo correcto de
  split leaf-safe donde el metadato lo permite, loss ponderada por clase, y augmentación
  orientada a campo.
- Confirmación empírica y reproducible de que un EfficientNet-B0 SÍ corre sin la Ampere (31ms/
  imagen en CPU) — el camino de despliegue (M6000 o CPU puro) está probado, sólo falta un modelo
  que valga la pena desplegar.
- Un diagnóstico honesto y accionable del PORQUÉ falla: falta diversidad fotográfica real de
  campo (mano en el cuadro, fondo de finca, celular barato), no arquitectura ni augmentación.

**Recomendación concreta para la próxima vuelta (cuando llegue la 5070 Ti)**: antes de re-entrenar,
conseguir aunque sea 50-100 fotos de café tomadas con el protocolo real de Chagra (celular,
campo, sin controlar fondo) por clase — mezclarlas con BRACOL/RoCoLe como fine-tuning final sobre
ese dominio específico, no como augmentación sintética de las mismas fotos de estudio. Esa es la
brecha que este informe deja identificada y medida, no adivinada.

## 10. Trabajo futuro explícito

- CoffeeNet no se bajó (licencia sin verificar en el tiempo disponible).
- RoCoLe: solo 6.4% del dataset (100/1560) por la falla de paginación de la API de Mendeley
  documentada arriba. Recuperar el resto requiere o bien acceso autenticado (cuenta Mendeley +
  sesión de navegador real) o un mirror alternativo con licencia verificada de forma
  independiente (hay copias en Kaggle sin auditar aquí).
- BRACOL: 80.3% recuperado (1402/1747) por corrupción del zip alojado en origen en Mendeley — se
  podría reportar el bug a los mantenedores del dataset, o buscar el mismo dataset en el mirror
  de GitHub `esgario/lara2018` (apunta a Google Drive, no intentado por tiempo).
- Split de BRACOL no es leaf-safe (ver sección 4) — si llega tiempo/GPU después de la 5070 Ti,
  vale la pena contactar a los autores por un id de hoja/planta, o inspeccionar visualmente una
  muestra para descartar duplicados antes de confiar en el número de test al 100%.
- **La prioridad real para la próxima vuelta no es más GPU, es más fotos de campo reales de
  Chagra** (ver sección 9) — se probó que more-augmentation-on-same-data no cierra la brecha
  (run2), así que insistir por ese camino sin datos nuevos es tiempo de Ampere mal gastado.
- `mycena_citricolor` ("ojo de gallo" colombiano real) no tiene representación en el dataset de
  entrenamiento — sería una 6ª clase necesaria si se quiere cubrir el nombre común que de verdad
  usa el campesino colombiano, no solo el equivalente brasileño/ecuatoriano.
