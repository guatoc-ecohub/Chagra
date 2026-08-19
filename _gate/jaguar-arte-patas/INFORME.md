# INFORME — jaguar: arte y pisada de las patas delanteras (Fable, 2026-08-18)

**Rama:** `fable/jaguar-arte-patas` (commit `5f588436b`, base `origin/feat/jaguar-lamina-caminando` = `4cce290a3`)
**Encargo:** pulir el ARTE de las patas delanteras (se veían raras al caminar) + silueta felina correcta. Cara intacta.

## Diagnóstico (medido, no adivinado)

1. **Cinemática — el carpo nunca estiraba.** Los anclajes de pisada delanteros
   estaban corridos respecto al pie dibujado (`delCercana` 15px atrás, ambos 3px
   ARRIBA). La pata dibujada está a un soplo de la extensión total (d≈L1+L2),
   así que 3px de objetivo doblaban el carpo **−20°..−29° durante TODO el
   apoyo**: el jaguar caminaba "de puntillas con las muñecas plegadas".
   Simulación del ciclo completo en `marcha.js` (sin tocar el navegador).
2. **Arte — la zarpa blanca tenía el espejo roto.** Sondas de alfa columna a
   columna sobre `pata-del-lejana.png`: la zarpa genuina ya era correcta
   (dedos x≈110-137 pisando y≈385, planta subiendo x137→158). Todo x≥161 a
   nivel de zarpa era relleno sintético: **arcos de dedos naranjas fantasma**
   (la recta `CORTE_PATAS_DEL`, medida para las columnas, atraviesa los dedos
   de la pata naranja a nivel de piso) + **gancho oscuro** colgando a y≈389,
   DEBAJO de la línea de dedos. En reposo lo tapaba la naranja; al caminar se
   destapaba.

## Cirugía

- `pata-del-lejana.png`: recorte a silueta real digitígrada + contorno de
  tinta + asomo de almohadilla metacarpiana + sombra de contacto conservada.
  Script reproducible en `_gate/jaguar-arte-patas/repintar-zarpa.mjs` del
  worktree (opera desde el respaldo `pata-del-lejana.ORIG.png`).
- `anatomia.js`: anclajes delanteros al pie dibujado ([159,384] / [197,386]),
  `plieMax` 36→28, `lift` 14→11. Apoyo ≤9° de flexión (las traseras: ≤9°).
- `capas.js` + `CORTE_PATAS_DEL.zarpa`: bajo y≈348-360 el corte se dobla a la
  frontera vertical del canal de sombra (x=163±5): la naranja conserva su
  bloque de dedos completo, la blanca ya no carga el fantasma.
- `JaguarLaminaViva.jsx`: párpados retraídos explícitos con `animated=false`
  (bug latente anotado en memoria: el fotograma salía con ojos cerrados).

## Verificación (dos lados, mismas condiciones)

- **A/B de marcha:** 8 fases CONGELADAS por harness determinista (`?fase=`,
  vars `--jlv-anda-*` escritas a mano con `poseMarcha` — misma cámara, misma
  fase, solo cambia el sujeto). `panel-fases-ANTES.png` vs
  `panel-fases-DESPUES.png`: antes ambas delanteras cuelgan plegadas en toda
  fase; después el apoyo extiende y la zancada lee felina.
- **Reposo (la lámina aprobada no se toca):** ensamble DESPUÉS vs ensamble
  ANTES (worktree efímero de la base, mismo harness): **2.500 px ≠ (0,12% de
  la escena), el 100% dentro de la zona operada** (canal de sombra entre
  zarpas, donde el gancho asomaba). Cabeza: 12.891 px = párpados abiertos,
  intencional. Definición: máx |Δcanal| > 20 sobre captura 1440×1440.
- **Tests:** jaguar 28/28 verdes (marcha + capas). Los 2 vitest rojos del
  árbol (`Borugo` registro / `vidaEstados` repertorio) **ya fallan en la base
  sin estos cambios** — preexistentes, control negativo corrido; no se tocan.
- **Lint:** eslint --max-warnings=0 limpio en los 3 archivos JS/JSX.

## Gate vivo (captura enviada al operador)

- `jaguar-5f588436b.png` (Telegram **msg 1787**) + `jaguar.mp4` (18 frames·5fps).
- Movimiento: **17/17 pares cambian · control `anim=0`: 0/9** (medidor con
  control negativo cableado).
- Juez qwen3-vl:8b (rúbrica de mamífero): 4 patas exactas, delanteras
  anatómicamente correctas sin pies dobles, cara intacta, natural (`juez.txt`).

## Incidente del arnés (resuelto, con parche durable)

El primer envío del gate canónico salió **NEGRO** (msg 1779): N vites de la
flota comparten `node_modules/.vite` (symlink al repo) y se invalidan la caché
entre sí → 504 "Outdated Optimize Dep" → React no monta. `dom-shot` lo
dictaminó (`ok:false`) pero `capturar-lamina-viva.sh` solo miraba que el PNG
existiera y lo mandó igual, marcando el dedup. Corregido:
- dedup falso removido y captura buena re-enviada (msg 1787);
- `~/.local/bin/capturar-lamina-viva.sh` parchado (respaldo
  `.bak-20260818-fable`): obedece el `ok:false` de dom-shot ANTES de enviar
  (candado probado contra el shot.json negro real y el bueno) + vite del gate
  con `cacheDir` propio por slug.

## Límites honestos

- El canal de sombra entre las dos zarpas queda ~20% más claro en reposo
  (píxeles repartidos entre piezas); invisible a escala avatar, medido arriba.
- Las costuras diagonales del torso (bandas de crossfade) siguen ahí — están
  encoladas aparte (`#detector-costuras-numerico`), no eran de este encargo.
