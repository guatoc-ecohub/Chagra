# `src/visual` — la librería visual reutilizable de Chagra

Fuente **única** de las piezas visuales del repo, para **dejar de redibujar** lo
mismo en cada pantalla/mockup. Se consulta viva en la vitrina
`#/mockups/visual-lib` (storybook), alimentada por el registro consolidado
[`registry.js`](./registry.js).

## La regla de la casa (reuso)

> **Antes de dibujar cualquier cosa — un bicho, un velo, una lámina, un cielo,
> un mundo — búsquela aquí primero.**
> - Si existe → **reúsela** (y si puede, **mejore** la versión canónica en su
>   archivo, para que todos hereden la mejora).
> - Si dibuja algo nuevo reutilizable → **agréguelo en el mismo PR** (componente +
>   su barrel `index.js` + su fila en `registry.js` con sus **tags**).

Reglas duras compartidas: SVG/geometría **propia** (cero stock, cero
dependencias nuevas ni assets remotos — offline-first); solo `transform`/`opacity`
animados, filtros estáticos; ids con `useId`; `prefers-reduced-motion` con un
fotograma final digno; copy en **español Colombia (usted)**, sin voseo.

## Las familias

| Carpeta | Qué vive ahí | `dim` · `role` |
| --- | --- | --- |
| [`creatures/`](./creatures) | Fauna de la chagra (abeja, colibrí, lombriz…). | `2d` · `creature` |
| [`effects/`](./effects) | Técnicas de cine: glow, acuarela, auto-dibujo, grades. | `2d` · `effect` |
| [`laminas/`](./laminas) | Hojas de cuaderno: la mata o la labor dibujada. | `2d` · `lamina` |
| [`scenes/`](./scenes) | Decorados base: cielo, parallax, guardián, finca-organismo. | `2d` · `scene` |
| [`voz/`](./voz) | `IrisVoz` — la identidad de la voz con forma. | `2d` · `voz` |
| [`mundo3d/`](./mundo3d) | **El framework de MUNDOS** (2D + 3D data-driven). | `3d`/`2d` · `mundo3d-archetype`… |

## Tags filtrables en el registro

Cada pieza de `registry.js` declara metadatos filtrables — al menos
`dim: '2d' | '3d'` y `role`. Helpers exportados:

```js
import { piezas3D, piezasCapaces3D, piezasPorRole } from 'src/visual/registry.js';

piezas3D();          // los 5 arquetipos de escena (dim === '3d')
piezasCapaces3D();   // + la abeja (avatar) e IrisVoz (capaz3d)
piezasPorRole('lamina');
```

## El framework de MUNDOS (2D + 3D por datos)

`mundo3d/` es la pieza clave: **un solo host `<Mundo>`** que construye cualquier
mundo de la finca eligiendo un **arquetipo** por datos y cruzándolo con el
device-tier del equipo. Sumar un mundo = **una entrada de datos + assets de esta
librería**, sin código de escena nuevo.

**Sumar un mundo NUEVO (2D o 3D) — el contrato en 3 pasos:**

1. **Escoja un arquetipo YA existente** en `mundo3d/arquetipos.js`:
   - **3D** (dioramas): `cutaway` (suelo/compost), `flujo` (agua), `recinto`
     (animales), `estratos` (bosque/diseño), `valle` (el mapa).
   - **2D de primera clase**: `lamina` (reusa `src/visual/laminas`), `infografia`
     (dato/cifras), `ficha` (especie), `mirror` (espejo 2D de un 3D), `valle2d`.
2. **Agregue UNA entrada** en `mundo3d/mundoData.js`:
   ```js
   miMundo: {
     escena: 'cutaway',              // arquetipo (3D o 2D) — o null para ir directo al 2D real
     params: { /* capas, cifras, lamina… propias del arquetipo */ },
     hotspots: [                     // 3-5 puntos; cada `view` es una vista REAL de App.jsx
       { id: 'x', pos: [0, 0.6, 0.3], emoji: '🪱', label: 'Abrir…', view: 'subsuelo' },
     ],
     entrada: { zoom: 6.5, narra: 'miMundo' },
   },
   ```
3. **Nada más.** No se toca `<Mundo>`, ni los arquetipos, ni R3F. El
   device-tier decide 3D vs 2D; en equipo humilde el 3D cae a su **espejo 2D
   digno** con los mismos hotspots. Título/emoji/tinte se resuelven del
   manifiesto real (`mundosFinca.js`), no se duplican.

Solo se escribe R3F/SVG de escena cuando aparece una **metáfora espacial
genuinamente nueva** (rarísimo): se añade UN arquetipo `Escena*` al mapa y queda
reutilizable por todos. Detalle completo en [`mundo3d/README.md`](./mundo3d/README.md).
