# Informe de gate: arte multiespecie del invernadero versátil

Fecha de captura: 2026-08-19 (madrugada). Rama `fable/invernadero-arte-multiespecie`,
montada sobre `feat/invernadero-parametrizable-codex` (PR #2959). El contrato de esa
pasada queda intacto: `normalizarCultivo`, `posicionesCultivo`, `invernaderoDeTier`
y las props de `FloraInvernadero` no se tocaron — solo se reemplazaron los
arquetipos visuales, exactamente lo que pedía `README-ARTE-FABLE.md`.

## Qué cambió

1. **El motor de láminas se volvió genérico** (`laminaMasa.js`): atlas pintado por
   código con dilatación anti-orla, quads cruzados, material con tile por instancia
   + vaivén, variante determinista. Extraído de `tomateHumboldt.js` SIN cambiar un
   número (control: la lámina plana del tomate salió idéntica y su test 9/9).
2. **La tomatera Humboldt** (portada del gate anterior, 57,9/55,9 FPS) quedó como
   primera lámina del registro. Sus racimos siguen pintados en el atlas.
3. **Dos láminas NUEVAS** (`hortalizasHumboldt.js`), con la misma caligrafía de
   plancha (lavados, pinceladas, nervadura, contorno de tinta verde-oliva):
   - **Pimentón**: mata en horqueta dicotómica, hoja ENTERA lustrosa (sin borde
     aserrado — eso es del tomate), frutos de BLOQUE de tres lomos dentro de la
     copa (verde arriba, rojo abajo), florecitas blancas. Atlas 4×2 de 512×640.
   - **Lechuga batavia**: roseta apaisada con borde RIZADO, hondas atrás,
     frescas al medio, corazón claro apretado. Atlas 4×2 de 512×384. Su lámina
     es MÁS ANCHA QUE ALTA y el motor respeta esa proporción (test duro:
     |aspecto tile − aspecto mundo| < 0.05 en las tres especies).
4. **`desfase` de planos en el motor**: en la roseta baja el quad visto de canto
   pintaba una costura vertical oscura por el eje de cada mata (medido en la
   envolvente v1). Los planos secundarios se corren a lo largo de su normal
   (lechuga 0.22, pimentón 0.1, tomate 0 — su geometría gateada no cambia) y la
   rotación por instancia disuelve la costura. Verificado en envolvente v2.
5. **La cama derecha y la era** dejan los icosaedros de `geomHortaliza` y siembran
   la lámina de pimentón a escala 0.72 (mata más joven). Las familias de
   fruto-esfera y hortaliza facetada salen de FloraInvernadero.
6. **Destrabe del gate (base, no arte)**: `App.jsx` precargaba el fondo de tema
   con `new Image()` y desde 2026-07-16 el catálogo de fondos son GRADIENTES CSS
   → el navegador pedía `radial-gradient(...)` como URL y metía un 404 de consola
   en TODAS las rutas (ningún mundo podía salir MUNDO VIVO), además de envolver
   el gradiente en `url()` (CSS inválido). Migrado al helper `esGradiente()` que
   LoginScreen y BackgroundSelector ya usaban. Tests del store 38/38.

## Medición GPU (headed, X vivo `VIVO :0`, Quadro M6000 real)

Renderer informado por Chromium en TODAS las corridas:
`ANGLE (NVIDIA Corporation, Quadro M6000/PCIe/SSE2, OpenGL 4.5.0)`.
Dist propio servido estático con canario verificado por HTTP antes de gatear
(regla del canario; el intento previo sobre :5199 lo atajó el canario — otro vite
respondió con SU index). FPS medidos CON vsync: 60 es el techo del monitor, no el
techo del render (la sonda de codex sin vsync midió 399/94 sobre la misma base).

### Ruta real `#/mockups/invernadero-vivo-3d` (dist, `?ciclo=10.5` luz de día)

| Especie · cantidad | Veredicto | FPS (vsync) | Evidencia |
|---|---|---:|---|
| tomate · 1.500 | MUNDO VIVO | 60,2 | `_gate/invernadero-arte/ruta-dia-tomate-1500.png` |
| tomate · 10.000 | MUNDO VIVO | 60,2 | `ruta-dia-tomate-10000.png` |
| pimentón · 1.500 | MUNDO VIVO | 60,2 | `ruta-dia-pimenton-1500.png` |
| pimentón · 10.000 | MUNDO VIVO | 60,1 | `ruta-dia-pimenton-10000.png` |
| lechuga · 1.500 | MUNDO VIVO | 60,2 | `ruta-dia-lechuga-1500.png` |
| lechuga · 10.000 | MUNDO VIVO | 60,2 | `ruta-dia-lechuga-10000.png` |

La primera pasada (sin `ciclo=`) salió DE NOCHE — el mundo sigue el reloj real y
eran las 23:4x. Esas seis también dieron MUNDO VIVO (51,4–60,2 FPS); se
recapturó de día para poder juzgar el ARTE, no solo la vida.

### Envolvente (harness `lamina-cultivos-3d.html?especie=`, cerca/medio/amplia)

| Especie | Veredicto | FPS | Evidencia |
|---|---|---:|---|
| tomate | MUNDO VIVO | 60,2 | `envolvente-tomate.png` |
| pimentón | MUNDO VIVO | 60,1 | `envolvente-pimenton-v2.png` |
| lechuga | MUNDO VIVO | 60,0 | `envolvente-lechuga-v2.png` |

### Lámina plana (harness `lamina-cultivos-harness.html`, doctrina: primero la lámina)

`plana-tomate.png` (control del refactor: idéntica al arte gateado) ·
`plana-pimenton-v2.png` · `plana-lechuga-v2.png`. Iteración v1→v2 del pimentón:
horqueta 0.34→0.22 (el tercio inferior quedaba pelado, "paleta"), fruto 28% más
ancho (leía ají, no bloque), frutos DENTRO de la copa (colgaban en racimo bajo la
mata, gesto de tomate). Lechuga v1→v2: venas cortas y caligráficas (leían radios
de rueda), sombra propia por hoja (las capas se fundían en anillos), paleta
fresca dominante (leía col oscura).

## audit-plantas — censo de TODA planta del invernadero y su técnica

| Familia | Técnica | ¿Humboldt? |
|---|---|---|
| Cultivo principal (tomate/pimentón/lechuga, 1.500–10.000) | Lámina-masa ilustrada instanciada | ✅ |
| Cama derecha de hortaliza (27 matas) + era (4) | Lámina pimentón ×0.72 | ✅ (antes icosaedros) |
| Brotes de bandeja (~90, escala 2–8 cm) | Cono+cilindro figurativo con etapa por color | ⚠️ aceptado: a esa escala la plántula real ES dos cotiledones; sin caras contables en pantalla. Candidato a lámina-brote si el operador lo pide. |
| Plántula de bolsa de repique (8) | Conos chicos | ⚠️ mismo caso |
| Frutos-esfera / hortaliza facetada / penachos de icosaedro | **ELIMINADOS de la escena** | — |

Residuo declarado: `geomTomatePlanta`, `geomTomateFruto` y `geomHortaliza` siguen
exportados en `invernadero.geom.js` sin consumidor en Flora — el README de codex
pide no tocar ese contrato y su test los cubre. Retirarlos es decisión de la
integración, no de esta pasada de arte.

## Límites y no verificado

- FPS con vsync: certifican "no baja de 60 percibidos", no el techo de render.
- El juez `qwen3-vl` NO se usó: la regla vigente es que la rúbrica se deriva del
  sujeto y los defectos de lámina (costuras, orlas) están MEDIDOS como invisibles
  para ese juez. El juicio visual de esta pasada es del ojo (capturas adjuntas) +
  métrica dura de tests (aspecto, tiles, determinismo).
- Móvil no re-gateado en esta pasada (codex ya validó 390×844 de la ruta; el arte
  no cambia el layout). Pendiente si la integración lo pide.
