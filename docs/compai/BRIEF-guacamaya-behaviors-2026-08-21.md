# BRIEF — Guacamaya: agregar los comportamientos que faltan (ARTE CONGELADO)
> Sonnet · ingeniería (NO arte). Encolado por el operador 2026-08-21.

## 🔴 REGLA DURA — el arte NO se toca
El operador aprobó el dibujo de la guacamaya el **2026-08-07**: *"es la única que siempre me gustó, déjala así, no necesita cambios"* (consta en `public/valle/compai-antes-despues.html` L304-307). **NO redibujes ni cambies un solo path del arte.** Solo AGREGÁS comportamientos (keyframes CSS, wrappers, wiring JS). Los paths SVG de `guacamaya.rig.svg` están CONGELADOS.

## Objetivo
Darle a la guacamaya **los comportamientos que le faltan**, reutilizando los módulos que la abeja YA tiene en main (no reinventar). La guacamaya ya tiene: idle vivo, hablar/lip-sync, gestos, estados. Le **faltan**:
1. **Aparece/desaparece MÍSTICO** — `src/visual/creatures/RevelacionMistica.jsx` es GENÉRICO (envuelve cualquier children). Envolvé la guacamaya con él. Casi gratis.
2. **Entrada épica** — modelo: `src/visual/agente/AngelitaEntrada.jsx`. Creá el equivalente guacamaya que mueve el RIG COMPLETO (translate/scale/rotate del grupo), NO redibuja.
3. **Salida épica** — modelo: `src/visual/agente/AngelitaSalida.jsx`. Ídem, espejo.
4. **Transición 2D→3D** (si aplica y no rompe) — modelo: `AbejaTransicion.jsx`.

Respetá reduced-motion + device-tier igual que los módulos de la abeja.

## Fuente canónica (de dónde parte todo)
- Arte + repertorio existente: `public/valle/compai/rigs/guacamaya.{rig.svg,css,defs.svg,meta.json}` (el rig A2, el rico). Ahí viven ya idle/hablar/gestos/estados.
- Módulos a reutilizar (main): `RevelacionMistica.jsx` (+ `revelacionMistica.css`), `AbejaTransicion.jsx`, `AngelitaEntrada.jsx`, `AngelitaSalida.jsx`.
- Identidad: `guacamayaIdentidad.js` hoy es un stub (solo slug+presencia). Si necesitás paleta/proporciones para posicionar la entrada/salida, extraelas del rig A2 y podés empezar a poblar `GUACAMAYA_PALETA`/`GUACAMAYA_PROPORCION` siguiendo el patrón de `src/visual/creatures/abejaIdentidad.js` (solo-datos). Opcional; no bloquea.

## NO rompas
- Los estados existentes del rig (`:host([data-estado="idle|hablar|senalar|pacto|sana"])`), el idle vivo (`.flota`, `rhBoil`, `rhAntic`, `cabezaHabla`…), el lip-sync (`#picoBajo`).
- Nada del arte (paths, gradientes, colores del dibujo aprobado).

## Demostración (para que Opus verifique GPU-headed)
Armá una página desplegable que muestre la guacamaya corriendo TODOS sus comportamientos en bucle (idle, hablar, entrada, salida, místico) — o extendé una existente. Debe ser capturable headless y desplegable:
`XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus microapp-deploy guacamaya-repertorio <dir-dist> --public`
(elegí el sub que no colisione; `guacamaya.guatoc.co` ya existe, usá otro como `guacamaya-repertorio`).

## Alcance / lo que NO es este build
- NO hagas la deduplicación de las 24/38 copias en worktrees ni la promoción a main del avatar PWA — eso es una fase aparte de limpieza. Este build es SOLO agregar los comportamientos que faltan sobre el rig aprobado + demostrarlos.

## Reporte (dato, a Opus)
Qué comportamientos agregaste, con qué módulos, cómo (sin tocar arte), dónde se demuestran, build + deploy + URL. Español CO sin voseo en comentarios. Sin commits. Opus verifica a ojo antes de cantarle al operador.
