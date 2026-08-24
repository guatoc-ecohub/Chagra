# Robo-report: seed atlas 3D

Fecha: 2026-08-24
Origen revisado: `/home/kortux/.claude/jobs/6b23183e/tmp/robo-seed/seed`
Destino: Chagra, dimensión de especies y educación

## Qué hace `seed`

`seed` es un atlas educativo de ocho cultivos con tres estados de espécimen por
cultivo: entero, en corte y germinando. El recorrido combina selección de
cultivo, modelo 3D rotatable, marcadores anatómicos anclados al espécimen,
tarjetas educativas, lecciones y dos formas de quiz: selección múltiple e
identificación espacial sobre el modelo.

Su arquitectura separa el contenido por cultivo (`src/data`), el estado de
interfaz en Zustand (`src/state/useAtlas.ts`) y la escena 3D en clases que viven
fuera del árbol React (`src/three`). El renderer usa `three/webgpu`, TSL y
`WebGPURenderer`, aunque configura fallback WebGL2. El pipeline de assets
optimiza GLB, imágenes y atlas de distribución, y `segment-tissues.mjs`
recupera etiquetas de tejido desde el color base de los modelos.

## Licencia y regla de reutilización

La copia revisada no contiene `LICENSE`, `COPYING`, `NOTICE` ni una declaración
de licencia clara en `README.md` o `package.json`. No se copia código, datos,
texto educativo, modelos, imágenes ni shaders de `seed`. Se reutilizan solo
ideas de interacción y arquitectura, reimplementadas en Chagra con el catálogo
existente y contenido propio ya grounded.

## Qué amerita robar

### 1. Marcadores anatómicos sobre el modelo o lámina 3D

Veredicto: **sí, prioridad alta, esfuerzo medio**.

La idea más transferible es guardar coordenadas locales por especie, proyectarlas
a DOM y resolver una posición sobre la superficie al cargar el modelo. En
Chagra se adapta a WebGL clásico y a la geometría procedural ya existente, sin
TSL, sin `three/webgpu` y sin importar el renderer del clon. Los marcadores
deben seguir siendo botones accesibles, con tooltip y ficha de detalle; la
oclusión se hace con raycast calculado durante la actualización de la escena,
limitado al viewer y no al resto del valle.

### 2. Tarjetas educativas por estado

Veredicto: **sí, prioridad alta, esfuerzo bajo**.

Se incorpora una secuencia compacta de estados de especie que reutiliza la
ficha existente: semilla, brote y planta madura. Cada estado tiene título,
qué observar y una tarjeta de aprendizaje. El dato vive en un módulo educativo
local y se deriva de la especie seleccionada, no se agrega como campo persistido
de Asset ni se duplica en el store.

### 3. Quiz de identificación

Veredicto: **sí, prioridad alta, esfuerzo bajo/medio**.

Se implementa quiz de opción múltiple y una ronda espacial de identificación de
marcadores. La respuesta espacial muestra la estructura correcta y su
explicación. El resultado es efímero en Zustand, no se guarda en IndexedDB ni
se convierte en estado de una planta.

### 4. Store Zustand desacoplado

Veredicto: **sí, prioridad media, esfuerzo bajo**.

Chagra ya usa Zustand. Se crea un store pequeño y aislado para la sesión del
atlas educativo: especie, estado, marcador seleccionado, modo quiz y progreso.
No se modifica el store de Assets/Logs ni se persisten vistas derivadas.

### 5. `segment-tissues.mjs`

Veredicto: **diferido, esfuerzo alto y sin insumo compatible**.

El script de `seed` depende de GLB con UV, textura basecolor y un pipeline de
optimización que produce el atributo `_TISSUE`. Las láminas y modelos
procedurales actuales de Chagra no tienen ese contrato común. Copiar el
pipeline exigiría importar modelos, generar assets y crear una estrategia de
validación de tejidos que no es necesaria para el valor educativo inmediato.
Se conserva la alternativa honesta de highlight espacial alrededor del
marcador.

## Qué queda diferido

- **WebGPU, TSL y `WebGPURenderer`:** incompatibles con el contrato de Chagra,
  que debe seguir en WebGL r160.
- **24 GLB, Draco, LRU de GPU y precarga:** coste de descarga, memoria y
  mantenimiento demasiado alto sin modelos licenciados y sin un catálogo de
  ocho cultivos equivalente en Chagra.
- **Globo 3D y rasterizador Natural Earth:** útil, pero es una dimensión
  geográfica distinta. El catálogo actual ya tiene piso térmico y biodiversidad;
  no se introduce una segunda fuente de distribución.
- **GSAP y renderer on-demand completo:** el viewer integrado usa el ciclo de
  render de R3F/Three que ya existe en Chagra. Se adopta solo la regla de no
  animar innecesariamente y el respeto por reduced motion.
- **Contenido de ocho cultivos y assets visuales de `seed`:** no se copian por
  licencia ausente. La experiencia se alimenta del catálogo Chagra y sus
  imágenes con atribución cuando existen.

## Cómo se enchufa en Chagra

La integración entra debajo de `SpeciesFicha`, que ya es la puerta del
Directorio de especies. El atlas usa el id de especie de la ficha, monta una
escena WebGL solo en esa ficha y conserva fallback textual cuando no hay
contexto WebGL. Las tarjetas y el quiz viven en el mismo capítulo educativo,
sin crear un directorio paralelo ni una ruta huérfana.

## Veredicto

**8/10 como patrón de producto.** Marcadores, estados, tarjetas y quiz encajan
directamente con la dimensión educativa existente y tienen coste bajo/medio.
El renderer WebGPU, el pipeline pesado de assets, la segmentación de tejidos y
el globo no justifican forzar una copia en Chagra ahora.

**Esfuerzo estimado de lo integrado: 1 a 2 días de trabajo efectivo**, incluido
el componente React, la escena WebGL, el store efímero, datos educativos y
tests. **Esfuerzo diferido: 3 a 7 días por bloque**, dependiendo de disponer de
modelos licenciados y de un contrato de assets estable.
