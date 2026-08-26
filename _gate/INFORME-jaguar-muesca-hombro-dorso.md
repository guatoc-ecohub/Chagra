# INFORME — Jaguar trazado: grieta hombro-dorso (casquete plano → casqueteCalco)

Fecha: 2026-08-25. Rama: `fix/compai-caminar-huesos-20260825` (worktree `compai-caminar`).
Commit: `f3b1b24aa`. Archivo: `src/visual/creatures/jaguarTrazado/pielTrazado.js`.

## Síntoma (del brief)

Línea pálida que corta el patrón de rosetas en la juntura hombro-dorso del
JaguarTrazado activo. Diagnóstico esperado: casquete de color plano fijo a un
hueso que el calco de la región vecina deja expuesto al articular, o costura
entre clip-regiones. Fix esperado: patrón `casqueteCalco` / costura por
solape ya usado en jaguarHuesos.

## Diagnóstico (archivo:línea)

`src/visual/creatures/jaguarTrazado/pielTrazado.js:339`

```js
${casquete('pataDelCercaAlto', elipse(222, 252, 36, 30, P.hombroCerca))}
```

El casquete `hombroCerca` es un ELIPSE DE COLOR PLANO `#614027` pintado en el
hueso padre `jh-cuerpo` ANTES de la pata delantera cerca. La región
`pataDelCercaAlto` entra con `usoCalcoFade` (máscara: invisible en y228 →
visible en y260) para fundirse con el pecho; al ser semi-transparente, el
color plano asoma DEBAJO del calco en la franja del fade. Al articular la
pata (±14.5° en la marcha), el calco de la región vecina desocupa la franja y
deja el color plano expuesto. Es exactamente "casquete de color plano fijo a
un hueso que el calco de la región vecina deja expuesto al articular".

Medición en REPOSO (render vs lámina `jaguar-natural.png`, misma malla):

```
(245,242): render 71,46,28   lámina 22,14,13   |Δ| = 96   ← cap asomando
(235,250): render 122,91,63  lámina 161,130,96 |Δ| = 111  ← cap asomando
(237,242): render 114,82,55  lámina 165,140,127|Δ| = 181  ← cap + trazo oscuro
```

## Cambio

1. `FILTRO_BANDA` (l.150): `hombro: 'jtBorrosoHombro'`.
2. `BANDAS` (l.169): banda propia `jt-b-hombro` — elipse `cx=222 cy=248 rx=46
   ry=36 rotate(-6)` sobre la juntura hombro-dorso.
3. `DEFS` (l.209): filtro `jtBorrosoHombro` (userSpaceOnUse, blur 1.4).
4. l.341: `casquete('pataDelCercaAlto', elipse(...))` →
   `casqueteCalco('pataDelCercaAlto', 'hombro')`.

El respaldo ahora es una copia BORROSA del propio calco de la región (pelaje
fuera de foco), no un color inventado: mismo patrón que `cuello/cruz` y
`cabeza/atlas` ya usan en este módulo, y misma "cura" que la jaguarHuesos
(la costura se cierra con la textura local, nunca con un parche plano).

## Verificación

Harness: SVG plano inyectado en HTML (misma string que `JAGUAR_TRAZADO_SVG` +
`jaguarHuesos.css`), render Chromium 151 headless (playwright, software GL),
análisis de píxeles con sharp. Malla: viewBox `-30 -80 765 500`, box
380×250, dsf 2-3; lamina (lx,ly) → device `((lx+30)*380/765*dsf,
(ly+80)*250/500*dsf)`.

- Reposo: perfil de silueta render-vs-lámina SIN diferencias en x150-460
  (no hay muesca de contorno); el cambio localiza la diferencia ANTES/DESPUÉS
  solo en x188-255 y225-275 (la juntura hombro-dorso).
- Articulación: poses congeladas pata ±14.5° (paso50/paso0) y cuello −3.4°
  (giro idle). Cero huecos de fondo en la pata delantera completa
  (x170-270 y210-360) ANTES y DESPUÉS: la costura sigue cerrada.
- Fidelidad render-vs-lámina en la franja del cap (x228-250 y238-258):
  MAD ANTES = 25.48 lum → DESPUÉS = 22.35 lum (−12.3%). Punto focal
  (245,242): |Δ| 96 → 36.
- Tests: `JaguarTrazado.integral.test.jsx` 10/10 ✓, `JaguarCompaiEscena`
  + `Jaguar.render` 32/32 ✓. `eslint` sin warnings.

## Evidencia cruda

Sonda de color por punto (REPOSO), render antes → después vs lámina:

```
pt      ANTES      DESPUES    lámina     |Δantes|  |Δdespues|
(245,242) 71,46,28   44,27,14    22,14,13    96        36
(235,250) 122,91,63  129,98,70   161,130,96  111       90
(237,242) 114,82,55  117,89,62   165,140,127 181       164
(240,240) 69,43,25   65,46,29    66,45,28    8         3
```

## Límites

- No pude abrir las capturas de referencia
  (`Chagra-strategy/ops/revision-compai-2026-08-24/shots/jaguar-muesca-dev-*`):
  están fuera del cwd de este carril (auto-rechazo). La verificación es sobre
  la lámina fuente (`jaguar-natural.png`, md5 6cb5f043) y el comportamiento
  del rig.
- El veredicto visual fino (que la franja se LE como pelaje y no como
  manchón) requiere ojo humano sobre una captura grande; la sonda numérica
  confirma que el color plano desapareció y la fidelidad a la lámina sube,
  pero no certifico "lee como pelaje" sin esa mirada.
- No se tocó el casquete de la pata trasera cerca (`musloCerca`, misma
  técnica) ni los demás compais: alcance mínimo a la juntura hombro-dorso.
