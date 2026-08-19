# INFORME — Gate 2.5D DOM · luciérnaga lámina-viva
Rama `feat/luciernaga-lamina-viva` · worktree `.worktrees/luciernaga-lamina-viva` · base `origin/dev` (e786a490e) · 2026-08-18

## Qué se construyó
- `src/visual/creatures/luciernagaLamina/anatomia.js` — anatomía MEDIDA de la lámina aprobada
  (`~/demos/3d/compai/laminas/luciernaga.png`, sha256 76a277fb…, 367×507; copia bit a bit
  committeada en `public/compai/laminas/luciernaga.png`, el path servido del patrón jaguar).
- `src/visual/creatures/luciernagaLamina/capas.js` — horneado por alfa (puerto del motor del
  jaguar): cuerpo + cabeza + mandíbula + 2 antenas + manoLapiz + linterna + 2 párpados.
- `src/visual/creatures/luciernagaLamina/luciernagaLamina.css` — la vida (idle/escucha/habla/
  piensa/caminando + destella/lee/reposo + eco-bioindicador + tier bajo + reduced-motion).
- `src/visual/creatures/LuciernagaLaminaViva.jsx` — el rig vivo (useVidaIdle('luciernaga') +
  useRitmoPropio + useMiradaUsted + visemas), contrato idéntico a JaguarLaminaViva.
- `src/components/ChagraAgentAvatarLuciernaga.jsx` — el adaptador pasa del cuerpo vector a la
  lámina-viva (Luciernaga.jsx NO se borra, igual que Jaguar.jsx en su momento).

## Reglas duras — cumplimiento
1. **CARA INTACTA**: la cara viaja ENTERA en la pieza cabeza; el único corte es el mentón
   DEBAJO de la línea de la sonrisa (candado en capas.test.js: labio.y0 > ojo+radio).
2. **PIEL = LÁMINA SIN TOCAR**: todo píxel sale del PNG (párpados = parches de la propia
   frente). Única excepción heredada del jaguar: el interior de boca sintético.
3. **NO DEFORMAR**: solo rotaciones chicas desde pivotes anatómicos + latido por FILTRO en la
   linterna (jamás se mueve). Piernas plantadas y cuaderno abrazado = estáticos (límites
   honestos documentados en anatomia.js — detrás no hay píxeles).

## Verificación numérica (offline, sharp — `hornear-verifica.mjs`)
- **Aditivo (huecos reales): 0.000%** de 75 459 px visibles (peor falta 0.000) — cada píxel
  del original queda repartido entero entre las capas. La misma garantía del jaguar.
- Pintor (costura translúcida de crossfade): 1.299% de px con dip ≤0.248 en las bandas de
  mezcla — inherente a la técnica aprobada (el jaguar la tiene igual); invisible en el
  compuesto (ver capturas).
- Fugas encontradas y CERRADAS en la revisión por capas (candados en capas.test.js):
  a) punta de antena derecha fuera de caja (x1 330→367); b) la mano sin techo reclamaba el
  arco de la antena izquierda (techo y165-180); c) la elipse de la linterna mordía el puño de
  la bota (bandas de pierna extendidas a y≥450).

## Gate 2.5D DOM (microapp-shot + revisión propia + judge-vl qwen3-vl:8b)
Harness: `_gate/luciernaga-lamina/solo.html|jsx` servido por Vite dev en 127.0.0.1:5183
(canario del puerto VERDE: testigo `luciernaga-gate-2026-08-18` + lámina 200/228050b).
Capturas 900×760 en `_gate/luciernaga-lamina/shot-*.png`:
- `quieto-vs-ref` (animated=0 + lámina plana al lado): indistinguibles a zoom 2× (revisión
  propia, crop-caras-quieto.png). Identidad de la piel.
- `parpado-cerrado` (fase=parpado): los DOS párpados renderizan y tapan los ojos (el bug 0×0
  del jaguar NO se repitió); la cara lee natural.
- `habla-jaw` (V3 forzado): mentón abajo + interior sintético visible; sonrisa superior y
  media cara ARRIBA intactas.
- `escucha`: antenas ERGUIDAS (perk) + testa ladeada; ojos abiertos.
- `piensa` / `vida-lee` / `vida-destella`: mirada arriba / lectura / FLASH de linterna con
  halo alrededor de las botas (las piernas quietas y nítidas — capa por filtro funcionó).
- `control-roto` (romper=cabeza): CONTROL NEGATIVO — el render sale sin cabeza de forma
  obvia. El juez lo detectó (FALLA), o sea el medidor distingue roto de sano.
- BUG encontrado POR el gate y corregido: con `animated=0` los párpados quedaban visibles
  (transform default scaleY(1)) → fotograma con ojos cerrados y ceja doble. Fix: retraer
  explícito (misma política que reduced-motion). Re-capturado verde.

## Tests / lint
- 28/28 nuevos (capas.test.js con candados de fugas + contrato LuciernagaLaminaViva).
- 30/30 elenco unificado (entrada luciérnaga → raizDiv, la misma migración del jaguar).
- eslint --max-warnings=0 limpio en todo lo tocado.
- Fallos preexistentes en dev (SeedingLog/Seguimiento/VoiceStatusStrip, 5) verificados con
  CONTROL sobre origin/dev limpio (stash): fallan igual sin mis cambios. No son de esta rama.

## Veredictos judge-vl
(anexados al final de la corrida — ver JUICIOS.txt)
