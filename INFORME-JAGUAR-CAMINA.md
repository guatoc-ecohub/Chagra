# INFORME — jaguar CAMINA de verdad (`feat/jaguar-camina-dev`)

Rama de trabajo: `feat/jaguar-camina-dev` (worktree `chagra-fable-jaguar-walk`),
rebasada sobre `origin/dev` (incluye política compai v2 paso 1). NO mergeada a dev.

## Rama usada (partir del MEJOR, no de cero)

De las tres candidatas, la única con locomoción real es
**`origin/feat/jaguar-lamina-caminando`** — trae `jaguarLamina/marcha.js`
(motor de gait) + `marcha.test.js` + el set de capas 2.5D (`jaguar-rig/`).
Las otras dos (`fable/jaguar-huesos-definitivo`, `fable/jaguar-trazado-riggeado`)
comparten tip y solo tienen las patas en bloque estático, sin motor.

Se cherry-pickearon sus dos commits tal cual (port FIEL: `git diff` de los
archivos jaguar contra el tip de la candidata = vacío):

- `feat(compai): jaguar lamina-viva CAMINA — gait cuadrupedo real por-pata sobre las capas 2.5D`
- `fix(compai): refinar patas del jaguar — tope de carpo, fémur adentro, talón con su zarpa`

## Qué es la marcha (no un shift rígido de la silueta)

- **Motor** (`src/visual/creatures/jaguarLamina/marcha.js`): ciclo cuadrúpedo en
  secuencia lateral (trasC → delC → trasL → delL a cuartos de ciclo), pisada
  ANCLADA (el período se deriva de la velocidad real de pantalla — 34 px/s del
  roam — para que el pie apoyado quede clavado, cero moonwalk) + IK analítico de
  2 huesos por pata sobre puntos medidos: dos segmentos rígidos que rotan por
  hueso (papel articulado), nunca se estiran.
- **Piel**: capas PRE-CORTADAS del set de arte (`public/compai/laminas/jaguar-rig/`:
  cuerpo-inpaint sin patas + 3 patas con alfa propio) + cortes por alfa de la
  lámina aprobada. Cirugía: la piel no se re-dibujó.
- **Cuerpo entero**: bob de masa a 2 latidos/ciclo (las patas lo compensan),
  pitch del tronco y cabeceo de la testa sincronizados al paso
  (`--jlv-anda-paso`), cola de contrapeso a 3.2× paso (CSS, `[data-anda]`).
- **Disparo**: estado `caminando` (ESTADO_CANON) — `CompaiOverlay` lo pasa
  mientras el roam desplaza al jaguar. Rampa de entrada 0.4 s (sin tirón);
  `prefers-reduced-motion` lo apaga.

## Revive tras la caída (qué encontré y qué hice)

La sesión anterior murió a mitad de una reconciliación con `origin/dev`:
el working tree tenía un `checkout origin/dev -- …` demasiado ancho que traía
política v2 a `AgentFab` (deseado) pero REVERTÍA el cableado de la marcha en
`JaguarLaminaViva`/`anatomia`/`capas` (no deseado). Además los 4 frames de gate
y el arnés de captura quedaron en un stash de untracked.

Recuperación: descartar el clobber (`git checkout -- .`), `git stash pop`
(frames + arnés), y **rebase limpio sobre `origin/dev`** — sin conflictos: los
commits de la marcha no tocan `AgentFab`, y política v2 no toca los archivos
del jaguar. Resultado: la marcha vive ENCIMA de política v2.

## Verificación

**Tests (todos verdes, 122):** `marcha.test.js` + `capas.test.js` (28) ·
`AgentFab.politica` + `AgentFab.silencio` (23) · `JaguarLaminaViva.test.jsx` +
`Jaguar.render` + `ChagraAgentAvatarElencoUnificado` (71). Los tests de marcha
verifican IK≡0 en reposo (sin tirón), consistencia FK↔IK (piezas rígidas),
pisada a velocidad exacta (cero moonwalk) y patas siempre en piso.

**Frames del ciclo** (chromium headless + swiftshader, arnés
`scripts/diag/jaguar-camina.html` con franja de telemetría en vivo; 4 capturas a
T/4 con T=1.884 s, después de la rampa; en `_gate-jaguar-camina/`, no
versionados por convención de gates):

| frame | t | bob | delC | delL | trasC | trasL |
|---|---|---|---|---|---|---|
| `marcha-r2-f0-c0.00.png` | 1.80s | +1.15px | +3.93° | +10.22° | −28.98° | +12.81° |
| `marcha-r2-f1-c0.25.png` | 2.25s | −1.11px | −9.54° | +7.35° | −25.26° | +5.41° |
| `marcha-r2-f2-c0.50.png` | 2.76s | +1.35px | +7.14° | +6.86° | −10.38° | −3.95° |
| `marcha-r2-f3-c0.75.png` | 3.24s | −1.44px | +4.56° | −11.43° | −18.88° | +2.25° |

Lectura cruda: cada pata en fase DISTINTA frame a frame (alternancia real, no
shift); bob alternando de signo (2 latidos/ciclo, visible en la altura del
lomo); en f1 la delantera cercana va EN VUELO con el carpo doblado y la zarpa
recogida; en f3 la delantera lejana barre atrás. Los 4 estados de control
(idle/thinking/speaking/listening) renderizan intactos en cada captura.

## Autocrítica (lo rígido, sin certificar — juzga el operador)

1. **La trasera cercana nunca cruza 0°** (−28.98…−10.38): oscila pero trabaja
   recogida bajo el cuerpo todo el ciclo; su empuje hacia atrás es menos
   legible que el vuelo de las delanteras. Es consecuencia del anclaje medido
   (la pose de la lámina es un fotograma de zancada, no la neutra) — corregible
   re-centrando su anclaje, a costa de arriesgar la cápsula por detrás de la
   grupa (el refino previo fue justo al revés).
2. **La cola en stills apenas se lee**: sí anima (CSS a 3.2× paso) pero 4
   frames de ~1.9 s capturan poco de su onda de ~6 s. Evidencia débil en foto;
   se aprecia en vivo.
3. **En f1 los dedos de la zarpa delantera rozan la silueta del pecho** al
   recogerse — solape menor de 2-3 px a size=560.
4. **El cero-moonwalk no se puede probar con estas fotos**: el arnés tiene al
   jaguar quieto en la página; la pisada clavada está verificada por el test
   matemático (apoyo ≡ velocidad), no visualmente sobre el roam real.
5. El cabeceo de testa y el pitch del tronco existen pero son sutiles en
   captura estática (±1-2° en el CSS); en movimiento se leen, en foto casi no.

## Archivos

- `src/visual/creatures/jaguarLamina/marcha.js` — motor (matemática pura)
- `src/visual/creatures/jaguarLamina/anatomia.js` — RIG_MARCHA + MARCHA medidos
- `src/visual/creatures/jaguarLamina/capas.js` — horneado de capas + corte por rodilla
- `src/visual/creatures/JaguarLaminaViva.jsx` — cableado (rAF → vars CSS)
- `src/visual/creatures/jaguarLamina/jaguarLamina.css` — `[data-anda]` (tronco/testa/cola)
- `scripts/diag/jaguar-camina.{html,jsx}` + `jaguar-camina-shot.mjs` — arnés de gate
