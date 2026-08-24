# Informe de gate: el tomate Humboldt del invernadero

Fecha de captura: 2026-08-18. Rama `fable/tomate-humboldt`, montada sobre
`feat/invernadero-escalable` (el contrato de instancing de esa pasada queda
intacto: `normalizarCultivo`, `posicionesCultivo` y las props de
`FloraInvernadero` no se tocaron).

## Qué cambió

La tomatera deja de ser geometría facetada (`IcosahedronGeometry` — se le
contaban las caras) y pasa a ser una LÁMINA de historia natural pintada POR
CÓDIGO a un `CanvasTexture` (`tomateHumboldt.js`), el mismo camino doctrinal
de `public/valle/lib/impostor-lod.js`: follaje = MASA, nunca silueta
poligonal contable.

- **Atlas 2048×2048**: 8 tomateras hermanas (4×2 tiles de 512×1024), más
  espejo horizontal por instancia = 16 siluetas. Pintura determinista
  (semilla fija): hoja compuesta imparipinnada con borde aserrado, tallo
  indeterminado amarrado a su tutor de guadua con fibra en cruz, racimos de
  5-8 frutos que se tocan, madurando de abajo (rojo hondo) hacia arriba
  (verde de hombro pálido), flores amarillas de acento y cogollo tierno.
- **Geometría por planta: 3 quads cruzados (6 triángulos)** en un solo
  `InstancedMesh` con una textura: 10.000 matas ≈ 60k tris y 1 draw call
  del cultivo (el arquetipo anterior costaba ~130 tris por mata).
- **Los frutos-esfera salen**: los racimos van pintados en la lámina (eran
  el último rastro lowpoly y flotarían alrededor de los quads).
- **Vaivén** en vertex shader (fase por posición de instancia, pivotado en
  la base), activo en gama alta sin reduced-motion.

## Dos defectos medidos en el harness y sus arreglos

1. **Media plantación caía a NEGRO**: `DoubleSide` voltea la normal en la
   cara trasera del quad (queda iluminada "desde abajo"). Arreglo: normal
   forzada al arriba del mundo POR FRAGMENTO (varying en espacio de vista);
   la masa entera recibe la luz del túnel pareja.
2. **Orla oscura en la lejanía**: el mipmap promediaba el borde con texels
   transparentes negros. Arreglo: dilatación de color en el atlas con el
   anillo a alfa 0.30 — POR DEBAJO del alphaTest (0.42), para no engordar
   la silueta (la lección "exceso de silueta = el dual del déficit").

## Medición GPU (headed, sesión X viva `VIVO :0`)

Renderer informado por Chromium en todas las corridas:
`ANGLE (NVIDIA Corporation, Quadro M6000/PCIe/SSE2, OpenGL 4.5.0)`.
Servidor estático del `dist` propio con canario verificado por HTTP antes
de gatear (regla del canario).

| Toma | FPS | Errores página | Fallos red | Evidencia |
| --- | ---: | ---: | ---: | --- |
| Ruta real, tomate 1.500 surcos | 57,9 | 0 | 0 | `_gate/tomate-humboldt/escena-1500-v3.png` |
| Ruta real, tomate 10.000 surcos | 55,9 | 0 | 0 | `_gate/tomate-humboldt/escena-10000-v3.png` |
| Envolvente cerca/medio/amplia (harness `lamina-tomate-3d.html`) | 60,0 | 0 | 0 | `_gate/tomate-humboldt/envolvente-v3.png` |
| Lámina plana sola (atlas 8 variantes) | n/a | 0 | 0 | `_gate/tomate-humboldt/atlas-v2.png` |

Todas las corridas de ruta real dieron veredicto `MUNDO VIVO` del gate.

## Lectura visual (inspección directa de capturas)

- **Cerca** (envolvente): foliolos pintados con nervadura y tinta, racimo
  rojo que se lee fruto a fruto, flores contadas. El cruce de quads solo se
  insinúa en la coronilla de la mata más próxima (~2 m), dentro de lo
  tolerable del patrón billboard.
- **Plano medio** (ruta 1.500): surcos tutorados con porte indeterminado
  legible y racimos rojos asomando entre el follaje.
- **Amplia** (ruta 10.000): masa densa continua verde-dominante bajo el
  plástico; los frutos se ocluyen con honestidad botánica.
- Sin caras contables en ninguna toma. Verde dominante por ciencia del
  piso térmico del cultivo.

## Comparabilidad

Las parejas v2→v3 del harness comparten cámara FIJA y semillas
deterministas (la regla "dos capturas no son A/B si la cámara se movió").
Las tomas de ruta real usan la cámara por defecto de la ruta, sin
interacción, con la siembra determinista de semilla 733.

## Límites

- El juez de visión NO se usó como gate (tiene umbral medido por debajo de
  defectos reales); el veredicto es medición del gate + inspección directa.
- La cámara de la ruta no se instrumentó para acercarse al surco (igual
  que en la pasada de codex); la envolvente cerca/medio/amplia se certificó
  con el harness que usa el módulo real (atlas + geometría + material).
- La lámina no proyecta sombra (el depth-material no conoce el recorte
  alfa por instancia; una sombra rectangular ×10.000 sería peor que
  ninguna). El contacto al suelo lo da el pie pintado de la mata.
- `pimenton`/`lechuga` siguen en `geomHortaliza` facetada — fuera del
  alcance de esta pasada; les llegará su propia lámina.

## Herramientas que quedan

- `lamina-tomate-harness.html` — la lámina plana sola (doctrina: primero
  la lámina, después la escena).
- `lamina-tomate-3d.html` — envolvente cerca/medio/amplia con el módulo
  real y vaivén vivo.
- `scripts/shot-plano-tomate.mjs` — captura cruda del harness 2D (no es
  el gate; el contrato `html` de shot3d exige documento editorial).
