# La ley del lenguaje visual del valle

Corrección #1 de `AUDITORIA-VALLE.md` (hallazgo 1.1). El valle acumuló 321
materiales únicos, 712 colores hex, 288 usos de `flatShading` contra 199 de
sombreado suave y cuatro modelos de material en el mismo cuadro: "el ojo no
interpreta variedad dentro de un lugar, sino activos de bibliotecas
distintas". Esta ley reduce las decisiones y las aplica con disciplina.

**Código fuente de la ley** (la verdad ejecutable; este documento solo la
explica):

- `src/visual/mundo3d/direccion/paletaValle.js` — paleta, borde, relaciones de luz.
- `src/visual/mundo3d/direccion/materialValle.js` — la familia única de shader.
- `src/visual/mundo3d/direccion/__tests__/paletaValle.test.js` — la ley fijada en CI.
- `src/mockups/HojaPruebaValle.jsx` — el patrón oro (`#/mockups/hoja-prueba-valle`).

## Las tres reglas

### 1. La paleta: 4 madres, 16 muestras, cero hex suelto

Todo color físico del valle sale de `MUESTRAS` de `paletaValle.js` (extraídas
de la paleta madre aprobada, `src/visual/mundo3d/paleta/paletaMadre.js`).
Cuatro familias: **verde** (vida vegetal), **tierra** (suelo, corteza, teja,
madera), **cal** (encalado, piedra, carpintería), **agua** (el único azul).

- Las variantes horneadas `*Sombra`, `*Claro`, `*Oscuro` **desaparecen**: la
  banda de sombra de la rampa las produce. Un objeto = una muestra por parte.
- Los estados horarios transforman las muestras **vía la luz**
  (`CIELOS_HORA`), jamás con paletas paralelas por franja.
- Acentos (`ACENTOS`: cochinilla, maíz, guayacán…): máximo **uno por objeto**
  y nunca más del **5% del área visible**.
- Emisivos con permiso (`EMISIVOS`): ventana, candela, luna, portal. Cualquier
  otro brillo sin fuente diegética **se apaga en origen**.
- ¿Un color que no mapea a ninguna muestra? Se mapea a la más cercana o la
  pieza se rediseña. Agregar la muestra 17 exige decisión de dirección (el
  test de CI truena).

### 2. El sombreado: una familia, tres bandas

Todo material físico opaco se crea con `crearMaterialValle(nombre)`:
`MeshToonMaterial` con **una rampa compartida de tres bandas**
(sombra 0.42 / media 0.74 / luz 1.0, cortes duros). La variación entre piezas
es el **color de la muestra**, nunca el modelo de respuesta a la luz.

- `MeshStandardMaterial`, `MeshLambertMaterial` y `MeshPhongMaterial` quedan
  **prohibidos** en el valle. La familia no cambia por tier (la rampa cuesta
  lo que un Lambert; el tier sigue mandando en dpr, sombras, fog y densidad).
- `flatShading` queda **prohibido** (los 288 usos migran a suave): la banda es
  el lenguaje, el relieve es geometría.
- Mallas fusionadas con color por vértice → `crearMaterialValleVertexColors()`
  (los colores de vértice también salen de las muestras).
- El **agua** es el único material transparente (opacity 0.85, ya en la receta).
- `MeshBasicMaterial` solo vía `crearMaterialEmisivo(nombre)` (lista blanca) y
  para el cielo.
- Sombra barata: solo `crearMaterialSombraContacto(preset.sombra)` (disco
  radial). No cuenta contra la regla del agua.

### 3. El borde: binario, sin grosores por autor

- **Paisaje** (terreno, vegetación, arquitectura, roca, agua): **sin contorno**.
- **Habitantes** (personas, animales) e **interactivos** (portales, señales
  tocables): contorno **tinta** (`NEUTROS.tinta`, negro cálido, nunca `#000`)
  de **~1.5 px de pantalla**.
- Implementación 3D: casco invertido (`crearMaterialContorno()`, BackSide)
  escalado con `grosorContornoMundo(distancia, fov, altoPx)`. Filos planos
  (anillo de portal): `crearMaterialTinta()`.
- Billboards SVG (campesinos, criaturas): el trazo del SVG se normaliza al
  equivalente de 1.5 px de pantalla al tamaño de reposo — hoy el grosor
  depende de cada archivo.

## La luz de la ley (por franja)

Colores, posición del sol, luna y niebla vienen del preset aprobado
(`CIELOS_HORA`) — **intocables** (mar de nubes, crepúsculo corto, luna,
cenital, ronda de perros). Lo que cambia: el relleno se **desacopla** de la
clave con `intensidadesDeLey(preset, franja)` (`RELACION_LUZ`: día 0.55,
amanecer 0.40, atardecer 0.38, noche 0.35 — nunca más el 90% fijo que aplanaba
todas las horas; auditoría 4.1).

## La hoja de prueba (el patrón oro)

`#/mockups/hoja-prueba-valle` monta roca, árbol, casa, persona (1.70 u),
perro (0.59 u), portal y agua bajo la ley, a escala 1 u = 1 m. Franjas:

| Franja | URL |
|---|---|
| Amanecer | `/?ciclo=6.2#/mockups/hoja-prueba-valle` |
| Mediodía | `/?ciclo=12#/mockups/hoja-prueba-valle` |
| Tarde | `/?ciclo=16#/mockups/hoja-prueba-valle` |
| Crepúsculo | `/?ciclo=18.1#/mockups/hoja-prueba-valle` |
| Noche | `/?ciclo=22#/mockups/hoja-prueba-valle` |

**Regla de entrada**: todo activo nuevo o migrado se captura junto a la hoja
en las cinco franjas. Si rompe las bandas (aparece gradiente liso o faceta),
el borde (contorno en paisaje, o habitante sin tinta) o mete un hex fuera de
las muestras, **no entra**.

## Guía de migración (el refactor de los 58 archivos)

1. Por archivo: cada `new Mesh*Material` / `<mesh*Material>` →
   `crearMaterialValle('<muestra>')`. El nombre se elige por semántica (¿qué
   ES la pieza?), no por cercanía de hex.
2. Cada hex local se mapea a su muestra (tabla en `MUESTRAS`, con `uso`).
   Duplicados `*Sombra`/`*Claro` colapsan a la muestra base.
3. `flatShading: true` se borra. Si la pieza pierde lectura, el problema es de
   silueta: se arregla con geometría, no con facetas.
4. `MeshBasicMaterial` físico → muestra opaca; halo sin fuente → se elimina.
5. Habitante/interactivo → casco de tinta; paisaje → nada.
6. Captura de la escena migrada junto a la hoja de prueba, 5 franjas, antes
   del merge (política del brazo visual: la prueba del arte es la captura).

**Criterios de aceptación medibles** (re-correr
`scripts/diag/auditar-valle-runtime.mjs`):

- Tipos de material en el grafo: `MeshToonMaterial` + `MeshBasicMaterial`
  (emisivos/cielo/sombra/tinta). Cero Standard/Lambert/Phong.
- Usos con `flatShading`: **0**.
- Colores de material visibles ⊆ muestras ∪ emisivos ∪ acentos ∪ preset de
  cielo (≤ 30 en total; base: 84 visibles, 712 en fuentes).
- Contornos: solo en habitantes e interactivos, todos con la misma tinta.

## Qué NO toca esta ley

- `Valle3D.jsx` y `composicionValle3D.jsx` (escala y composición: T2).
- `bosque/` (páramo: T4).
- Los cinco intocables de la auditoría (mar de nubes, crepúsculo, ronda de
  Dante y Oliver, luna, cenital de mediodía).
- La paleta madre (`paleta/paletaMadre.js`): esta ley la restringe para el
  valle, no la reemplaza. Los demás mundos siguen su propia guía hasta que
  adopten la suya.
