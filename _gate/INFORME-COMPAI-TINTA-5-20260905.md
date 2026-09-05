# INFORME GATE VISUAL · 5 compai del selector de avatar EN TINTA

Fecha: 2026-09-05 · Carril: `opencode` (compai-tinta-5-telegram-20260905)
Repo: `/home/kortux/Workspace/chagra` (guatoc-ecohub/Chagra) · cwd del carril = raíz del repo
Código evaluado: `origin/dev` HEAD `073969f1e` (worktree `.worktrees/gate-compai-tinta5-20260905`, rama `chore/gate-compai-tinta-5-20260905`)

Canonical que se gatea: los que monta `src/components/Settings/AgentAvatarSelector.jsx` (Ajustes → Apariencia), SVG en DOM. Se capturaron los cinco que faltaban del roster (chivito-punk y guacamaya YA capturados en `7bb3514c2`, no se repitieron).

Veredicto del carril: **SIN-CERTIFICAR en los cinco**. El modelo de este carril no ve píxeles; se usó juez VL local (qwen3-vl:8b) + medidas de píxel (sharp) + sonda DOM + lectura estructural de qué cuerpo monta cada adaptador en `origin/dev`. El que juzga el arte es el operador sobre los PNG crudos.

## 1. Qué se montó y con qué commit vivo

| compai | archivo adaptador (`src/components/`) | commit vivo | cuerpo que monta el adaptador (origen/dev) |
|---|---|---|---|
| Angelita | `ChagraAgentAvatarAngelita.jsx` | `aaf758d84` | `visual/agente/Angelita` (la abeja, producción, NO se tocó) |
| Jaguar | `ChagraAgentAvatarJaguar.jsx` | `7bb3514c2` | `visual/creatures/JaguarTrazado` (tinta) |
| Zarigüeya | `ChagraAgentAvatarZariguya.jsx` | `7bb3514c2` | `visual/creatures/ZariguyaTrazado` (tinta) |
| Oso de bastón | `ChagraAgentAvatarOsoBaston.jsx` | `7bb3514c2` | `visual/creatures/OsoBaston` (2.5D vector con contorno INK y rellenos cálidos, NO es `*Trazado`) |
| Luciérnaga | `ChagraAgentAvatarLuciernaga.jsx` | `7bb3514c2` | `visual/creatures/LuciernagaTrazado` (tinta) |

El harness monta el ADAPTADOR (no el cuerpo pelado) con `estado=caminando`, igual que el selector.

## 2. Método

- **Harness**: `tests/visual/compai-tinta5-gate-harness.{html,jsx}` (nuevo, temporal, sin snapshots). Monta el adaptador del compai elegido por `?compai=` con `estado` por `?estado=` (default caminando). Cada compai sobre papel (`#f4efe2`) en 3 tamaños: 330 (anatomía), 150 (plano medio) y 64 (tamaño real del avatar en el selector). Sin rótulos dentro de la imagen para no contaminar al juez.
- **Servidor**: `vite` dev en `127.0.0.1:5273` dentro del worktree (node_modules symlink al checkout principal). Canario por CONTENIDO: el HTML servido trae el título del harness y el módulo servido trae los marcadores del archivo (no es un puerto ajeno).
- **Sonda DOM viva** (playwright-core + chromium nix, `_gate/probe-compai5.mjs`): por cada compai, 3 SVGs montados, `data-compai` y `data-agt-estado=caminando` correctos, 0 pageerror, 0 peticiones fallidas.
- **Captura**: `microapp-shot` (DOM, no WebGL), `SHOT_SIZE=560,560`, una por compai.
- **Juez**: `judge-vl` (qwen3-vl:8b local) sobre la captura completa y sobre un ZOOM de la franja grande (crop y 0..348) para nombrar defectos de cara/dibujo. El juez describe, no certifica; el color no se le pregunta, se mide.
- **Medidas de píxel**: ImageMagick no está instalado; se usó `sharp` (`_gate/medidas-compai5.mjs`): cobertura de tinta oscura, color fuerte, tono medio y colores dominantes sobre el papel.

## 3. Sonda DOM (hecho estructural)

Para cada compai: raíz `[data-compai]` correcta, `data-agt-estado=caminando`, 3 `<svg>` (330/150/64). `pageErrs=0`, `reqFail=0` en los cinco.

```
angelita    compai=angelita    estado=caminando  svg=3  errs=0
jaguar      compai=jaguar      estado=caminando  svg=3  errs=0
zariguya    compai=zariguya    estado=caminando  svg=3  errs=0
oso-baston  compai=oso-baston  estado=caminando  svg=3  errs=0
luciernaga  compai=luciernaga  estado=caminando  svg=3  errs=0
```

## 4. Salida cruda del juez (qwen3-vl:8b, describe no certifica)

Veredictos breves (copias literales completas en `_gate/juez-compai5-*.txt` y `-zoom.txt`):

- **angelita**: "Sí, se lee como abeja. No hay defectos: cara completa, trazos definidos, alas/antenas en posición correcta." Al zoom: "cara intacta... defecto concreto: solo se observa una ala (la otra parece ausente o no dibujada)." El juez la clasificó "a color" (tiene rellenos ámbar/amarillo/negro).
- **jaguar**: "Sí se lee como jaguar. No hay defectos" (captura). Al zoom: "cara intacta... línea vertical fina y artificial que recorre el costado del cuerpo (hombro a cola), parece error/trazo accidental". Lo clasificó "a color" (rellenos tierra/óxido).
- **zariguya**: "Sí se lee como zarigüeya. No hay defectos. Es tinta monocroma." Al zoom: "cara intacta; no hay crías al lomo; no hay antifaz". (El antifaz sí existe como marca en el canon; ver nota abajo.)
- **oso-baston**: "Sí se lee como oso de anteojos. No hay defectos; las marcas claras de los 'anteojos' son nítidas." Al zoom: "cara intacta, sin defectos concretos". Lo clasificó "a color".
- **luciernaga**: "No, se lee como cucaracha/escarabajo, no luciérnaga. Cara intacta. Abdomen no brilla." Al zoom: mismo veredicto, "abdomen sin brillo (opaco amarillento) y antenas más propias de escarabajo". Lo clasificó "a color".

## 5. Medidas de píxel (sharp) — resumen

| compai | papel % | tinta oscura % | color fuerte % | colores dominantes (no papel) |
|---|---|---|---|---|
| angelita | 91.3 | ~0 | 5.5 | negro `32,32,0`, blanco, naranja/ámbar `255,192,96`, marrón |
| jaguar | 86.2 | 0.1 | 9.0 | blanco, óxido/tierra `160,96,64`, `128,96,64`, `96,64,32` |
| zariguya | 84.1 | 0.9 | 9.4 | blanco, grises/sepia `96,96,64`, `64,64,32`, `32,32,32` |
| oso-baston | 70.0 | 7.7 | 8.6 | negro `32,32,0`, grises `64,64,64`, crema `224,224,192`, blanco |
| luciernaga | 84.6 | 0.8 | 10.3 | blanco, marrones `64,64,32`, `64,32,32`, `32,32,32` |

Lectura del carril: la paleta dominante de los cinco es tinta + tierra/sepia/ámbar (el lenguaje tinta de la casa no es negro puro: tiene lavados cálidos). No apareció ninguna lámina raster de color tipo placa. El "a color" del juez es lectura de esos rellenos cálidos, no una placa fotográfica.

## 6. Defectos candidatos NOMBRADOS al zoom (SIN certificar)

El carril no ve la imagen; estos son los puntos que un juez VL marcó y que el ojo del operador debe confirmar o descartar sobre los PNG:

1. **Angelita · ala única (¿)**: dos lecturas del juez (captura y zoom) ven una sola ala en la pose caminando (vuela). Puede ser la vista lateral con el ala opuesta oculta por el cuerpo, o un rasgo del diseño. NO se toca (regla ANGELITA). Revisar en `_gate/avatar-tinta5-angelita.png`.
2. **Jaguar · línea vertical en el costado (¿)**: el juez describe una "línea vertical fina" del hombro a la cola al zoom. Análisis de píxel de bordes verticales NO encontró una costura vertical continua larga (máx. corrida de 7 filas con borde fuerte), así que puede ser un artefacto del rig por clip-regiones en la pose de caminado o una alucinación del juez sobre el pelaje. Revisar en `_gate/avatar-tinta5-jaguar.png` (flanco del ejemplar grande).
3. **Zarigüeya · sin crías al lomo en caminando (dato, probablemente por diseño)**: el juez no ve crías en la pose caminando. En código, `ZariguyaTrazado` solo monta las crías en el momento/pose dedicado `'crias'` (idle/vitrina), no durante el ciclo de caminado. Coherente con diseño, no con regresión; ojo del operador.
4. **Zarigüeya · antifaz facial no leído al zoom**: el juez dijo "no hay antifaz"; en la captura completa no lo marcó como defecto. En el gate del portal (2026-09-05 03:25) otro juez leyó esa máscara como "círculos negros sobre los ojos". Sigue siendo el punto ambiguo conocido de la chucha sobre papel.
5. **Luciérnaga · no se lee como luciérnaga y abdomen sin luz**: el juez la lee como escarabajo/cucaracha y no ve abdomen luminoso. Comparado con la referencia `portal-tinta-luciernaga.png` (gate anterior), TAMPOCO había abdomen claro (solo 135 px claros-cálidos en toda la referencia vs 46 en esta captura): la ausencia de brillo parece rasgo del dibujo actual de la luciérnaga en tinta, no regresión de este commit. Antenas largas y élitros cerrados acercan la silueta a un escarabajo. Punto a juicio del operador.

## 7. Qué NO pude verificar

- El juicio fino de arte (cara, proporción, calidad de línea) es del operador: el modelo del carril no ve imágenes. Todo lo de arriba es juez VL + medidas + estructura, SIN certificar.
- La distinción "tinta con lavado cálido" vs "a color" no la puedo certificar por píxel con confianza (ver §5): la separación fina entre el lenguaje tinta sepia/ámbar y una lámina a color necesita ojo.
- La pose congelada es un instante del ciclo de caminado (microapp-shot saca un frame); no gateé la fluidez del ciclo ni la coreografía. Con animación continua, cada captura cae en una fase distinta del paso.
- No corrí `git` contra el selector real de la app (fuera de alcance): el harness monta el adaptador exacto, no todo `ProfileScreen`.
- FPS/GPU no aplican: SVG en DOM, captura headless.

## 8. Entrega a Telegram

**NO se pudo enviar al Telegram del operador.** El token vive en `~/.config/telegram-attach-bot-token`, ruta FUERA del cwd de este carril y PROHIBIDA por la regla dura del brief (auto-rechazo en silencio). No se intentó leerla ni se envió ninguna captura. Los PNG quedan listos en disco para que el orquestador los mande (o re-capture) con el caption `🖋 <slug> en tinta · SIN-CERTIFICAR · <commit>`.

Registro `slug|commit|fecha|msg_id` (msg_id NA = no enviado):

```
angelita|aaf758d84|2026-09-05|NA
jaguar|7bb3514c2|2026-09-05|NA
zariguya|7bb3514c2|2026-09-05|NA
oso-baston|7bb3514c2|2026-09-05|NA
luciernaga|7bb3514c2|2026-09-05|NA
```

Archivo `~/.local/state/compai-capturado.txt`: NO se escribió (fuera del cwd, auto-rechazo). El orquestador copia desde este informe.

## 9. Artefactos

- Capturas: `_gate/avatar-tinta5-{angelita,jaguar,zariguya,oso-baston,luciernaga}.png` (560x560).
- Zooms: `_gate/zoom-tinta5-{...}.png` (franja grande del avatar).
- Juez: `_gate/juez-compai5-*.txt` (captura) y `_gate/juez-compai5-*-zoom.txt`.
- Medidas: `_gate/medidas-compai5.mjs` · Sonda DOM: `_gate/probe-compai5.mjs` · Crop: `_gate/crop-zoom-compai5.mjs`.
- Harness: `tests/visual/compai-tinta5-gate-harness.{html,jsx}`.

## 10. Lo que se tocó / no se tocó

- ANGELITA NO se modificó (solo se capturó). Ningún archivo de arte se editó. Sin `kill` en lote. Sin force-push/reset/branch -D.
- Harness nuevo temporal sin snapshots. Rama local `chore/gate-compai-tinta-5-20260905` desde `origin/dev`, commit sin merge.
- Código evaluado: `origin/dev` @ `073969f1e`. No se tocó `compaiRegistry.js` ni adaptadores.
