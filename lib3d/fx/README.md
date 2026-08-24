# Toon shading para el valle

`toonShading.js` concentra el acabado cel-shaded de los meshes 3D en un
módulo sin React y sin dependencia de una escena específica. Incluye:

- `MeshToonMaterial` con un `DataTexture` de bandas discretas y filtro nearest.
- Rim light dependiente de cámara, inyectado en el fragment shader del material.
- Contorno opcional por shell de back-face, sin necesitar un postprocesado global.

## Aplicarlo a una malla del valle

El material necesita una luz de escena normal, por ejemplo una
`DirectionalLight`, porque el mapa define cómo se cuantiza la iluminación que
recibe la malla:

```js
import { Mesh } from 'three';
import {
  createGradientMap,
  createToonMaterial,
  createToonOutline,
} from './fx/toonShading.js';

const sueloValle = new Mesh(geometriaDelValle, createToonMaterial({
  color: 0xc98291,
  // De sombra a luz: cada valor es una banda, no un color interpolado.
  gradientMap: createGradientMap([0.16, 0.38, 0.68, 1]),
  rim: {
    color: 0xffd8e3,
    strength: 0.34,
    power: 2.8,
  },
}));

createToonOutline(sueloValle, {
  color: 0x321d2c,
  thickness: 0.035,
});
scene.add(sueloValle);
```

Si se usa el mapa por defecto de `createToonMaterial`, no hace falta crear
`gradientMap` manualmente. El outline se añade como hijo del mesh y comparte su
geometría, por lo que sigue sus transformaciones y no crea una segunda copia
de los vértices. Libere ambos materiales y el mapa cuando se destruya la
escena:

```js
sueloValle.children.find((child) => child.userData.toonOutline)?.material.dispose();
sueloValle.material.gradientMap?.dispose();
sueloValle.material.dispose();
```

Para React Three Fiber, cree el material en `useMemo` y páselo con
`material={material}`. El helper de outline debe ejecutarse una sola vez por
mesh, por ejemplo en un `useEffect` de montaje.
