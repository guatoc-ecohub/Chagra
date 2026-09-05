# Nubes volumétricas

Efecto 3D reusable para horizontes de valle y páramo. No carga texturas ni
depende de React: usa una nube de puntos con billboards procedurales suaves,
por lo que la capa completa se mantiene en un draw call. La siembra es
determinista y la animación no asigna objetos por frame.

## Uso

```js
import {
  crearNieblaDeAltura,
  crearNubesVolumetricas,
} from './lib3d/fx/nubesVolumetricas.js';

const nubes = crearNubesVolumetricas({
  count: 20,
  area: { x: [-24, 24], z: [-34, 6] },
  alturaBase: 8,
  viento: { x: 0.65, z: 0.1 },
  seed: 2026,
});
scene.add(nubes.group);

// En el loop de render del host:
nubes.update(deltaSeconds);

const bruma = crearNieblaDeAltura({
  alturaBase: 1.5,
  alturaMax: 9,
  densidad: 0.4,
  color: '#a9c3c4',
});
const retirarBruma = bruma.applyTo(terrainMaterial);
```

`applyTo` funciona con materiales built-in de Three que usen los chunks
estándar (`MeshStandardMaterial`, `MeshLambertMaterial`, etc.). Devuelve una
función de limpieza para retirar el parche antes de descartar un material.
Los uniforms se comparten por referencia, así que `bruma.setDensity(0)`
permite atenuar la capa sin recompilar el material.

## Presupuesto y ajuste

- `count` controla el número de billboards, con `18` como valor inicial.
- `alturaBase` y `alturaMax` deben rodear la franja de niebla del horizonte.
- `densidad`, `opacidad` y `tamano` aceptan valores entre `0` y `1` donde
  corresponde; `tamano` está expresado en unidades de mundo.
- `frustumCulled` queda desactivado porque el viento mueve los billboards.
  Mantenga `area` acotada al horizonte visible.
- Para equipos modestos, reduzca `count` a `8` o `12` y actualice el módulo
  solo con el `frameloop` de la escena anfitriona.

El módulo no modifica Assets, Logs ni estado persistido. Es una capa visual
derivada que el consumidor puede montar, actualizar y liberar.
