# Gate GPU — pasada de arte «suelo vivo» (escena de micorrizas)

> Fable · 2026-08-18/19 · rama `fable/micorrizas-arte-suelo` (base `origin/dev` e786a490e)
> Sujeto: `#/mockups/micorrizas-3d` (base de la lección de los Ents de páramo — orden O28)

## Qué cambió (arte, mirada Humboldt: masa, no low-poly)

1. **El suelo dejó de ser un plano muerto.** El backdrop plano (#120c09, invisible) y la
   lámina translúcida del techo se reemplazaron por `entornoSuelo()`: pared con relieve fbm
   y los HORIZONTES del perfil (humus → zona de raíces → banda micorrízica → roca) con onda,
   grano y grietas de oscuridad LOCAL; techo de humus colgando en bultos; piedras deformadas
   una a una, medio enterradas. La **red le hornea su luz a la tierra** (receta de la 3.ª
   pasada de `corteSuelo`). Una sola malla fundida, normales preservadas.
2. **Las hifas ya no son hilos contables.** `pelusaDeRed()`: vello de ramillas finas por hilo
   + el MANTO hifal que FORRA cada punta de raíz (la vaina, la frase central de la simbiosis).
   LineSegments aditivo, un draw-call, con desvanecimiento a negro en las puntas.
3. **Las raíces tienen pelos radicales** (`pelosRadicales()`): borra fina de materia (blending
   normal) en el tramo bajo; el tubo dejó de leerse a plástico.
4. **Muerte al low-poly literal:** nodos octaedro → esferas suaves; conos `flatShading` de las
   hojitas → hojas de verdad (`hojasSuperficie()`): láminas arqueadas de maíz con canal y filo
   ondulado, foliolos de fríjol, hojas lobuladas de ahuyama, gradiente horneado.

Todo determinista (rng con semilla), puro three-core, testeable headless, presupuestado por
tier (`pelusaPorHilo/mantoPorPunta/pelosPorRaiz/segEntorno/piedras` bajan alto→medio→bajo).

## Evidencia (harness-gate.mjs, chromium HEADED sobre la sesión X real)

| captura | base | webgl | fps | errores | fallos req | vida (control quieto) |
|---|---|---|---|---|---|---|
| `ANTES.png` | origin/main | true | 59.7 | 0 | 0 | vive ✅ / control ✅ |
| `DESPUES.png` | rama (base main) | true | 60.2 | 0 | 0 | vive ✅ / control ✅ |
| `DESPUES-base-dev.png` | rama (base dev) | true | 60.0 | 0 | 0 | vive ✅ / control ✅ |

- **Prueba de vida con control negativo** (regla RULINGS 2026-08-18): dos capturas del canvas
  difieren en modo normal y NO difieren bajo `prefers-reduced-motion` (frameloop demand).
- **Costo de rendimiento: cero** (59.7 → 60.0/60.2 FPS, ambas clavadas al vsync).
- **Excepción documentada (2 conteos, idéntica en ANTES y DESPUÉS):** la firma 404
  `GET /radial-gradient(120%…` es PREEXISTENTE en origin/main y dev (App.jsx envuelve el
  fondo-gradiente en `url()`); ya está corregida en `7de47a1b8` de la rama
  `fix/mercado-ronda2-enlaces-renders-codex`, sin mergear. No se trajo ese commit para no
  mezclar alcances; el harness la filtra por firma exacta y la cuenta aparte.
- **Calibración empírica:** la primera versión de la pared quedaba bajo el umbral visible
  contra la niebla negra (se verificó con la pared en rojo puro y se recalibró la pintura);
  las piedras se confinaron a la franja donde la pared se LEE (piedra sobre negro = grumo
  flotante). Iteraciones en `/tmp/pared-{roja,v2,v3}.png`.

## Tests

- `micorrizas.geom.test.js`: 23/23 verdes (18 previos + 5 nuevos de la pasada: presupuestos
  por tier, muestras de luz, pelusa determinista, pelos bajo tierra, glow horneado suma color,
  hojas sobre las tres hermanas).
- `corteSuelo.test.js` + `mundo.smoke.test.jsx`: verdes salvo 1 rojo (`arquetipos: 5 dioramas…`)
  que **falla igual en origin/dev limpio** (verificado en worktree aparte) — preexistente.
- Batería amplia `mundo3d + mockups` sobre base main: 24 rojos, **los mismos 24 en
  origin/main limpio** (diff vacío) — ninguno introducido.
- ESLint `--max-warnings=0` limpio sobre lo tocado (incluye sanear el `mat.opacity` en
  `useFrame` preexistente de `RedMicelio`, que violaba `react-hooks/immutability`).
