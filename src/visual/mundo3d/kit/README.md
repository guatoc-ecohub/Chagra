# kit — Toolkit 3D compartido de Chagra

La fundación de la **congruencia visual**: todas las escenas 3D deben verse como
**un solo juego de Switch** (mismo suelo, misma niebla, misma luz de la hora del
valle, misma paleta madre, misma sombra de contacto, la misma fusión de geometría
a prueba del *null silencioso*). Antes cada escena reinventaba esas piezas y se
veían dispares. Este módulo las reúne detrás de **un solo import**.

```js
import {
  AtmosferaMundo, useAtmosferaMundo, construirTerreno, ruidoTerreno,
  fusionarSeguro, poner, apuntar, hornearFollaje, sembrarEnAnillo,
  PALETA, CIELOS, perfilDeTier, SombraContacto, useCicloDia,
} from '@/visual/mundo3d/kit';
```

> ⚠️ **El barrel importa `three`/`@react-three`.** Úselo solo desde archivos de
> escena (chunk `vendor-three`, montaje perezoso). **No** lo importe desde el
> barrel three-free `mundo3d/index.js` ni desde el bundle base. Para dato puro
> three-free (paleta, cielos por hora, device-tier) importe del módulo suelto.

## Qué consolida (y de dónde sale lo canónico)

| Pieza | Casa canónica | Qué resuelve |
|---|---|---|
| `rng` (LCG) | `bosque/sombreadoVegetal.js` | PRNG de la línea de geometría — la misma semilla da el mismo árbol en todo el juego. Estaba reimplementado ~12×. |
| `crearRng` (mulberry32) | `particulasData.js` | PRNG de partículas/dispersión, three-free. |
| `ruidoTerreno(wx,wz)` | **kit/ruido.js (nuevo)** | El ruido 2D de terreno que estaba **copiado byte-a-byte en 6 escenas**. |
| `ruido3D` / `ruidoFbm` | `bosque/sombreadoVegetal.js` | Ruido de valor 3D (arruga corteza, muerde copa). |
| `fusionarSeguro` | `bosque/sombreadoVegetal.js` | **La única fusión permitida**: desindexa, valida atributos y **truena** si `mergeGeometries` da null. La trampa del null silencioso estaba reimplementada en **7 archivos**. |
| `poner` / `apuntar` / `hornearFollaje` / `hornearCorteza` / `tuboOrganico` / `curvaTronco` / `sembrarFollaje` / `matojoHoja` | `bosque/sombreadoVegetal.js` | Colocación + horneado de color por vértice + geometría orgánica. |
| `sembrarEnAnillo` | **kit/geometria.js (nuevo)** | Dispersión determinista en anillo (generaliza el `sembrar` privado de `floraParamo`). |
| `construirTerreno` | **kit/terreno.js (nuevo)** | Heightfield con color por vértice — consolida el `construirLadera`/`construirSuelo` de cafetal/cacao/papa. |
| `atmosferaDeFamilia` / `useAtmosferaMundo` / `AtmosferaMundo` | **kit/atmosfera(.jsx) (nuevo)** | La hora viva del valle (ciclo diurno + mezcla 60% a la madre) **para cualquier Canvas**, no solo dioramas. |
| `PALETA` / `CIELOS` / `mezclarCielo` / `BLOOM` | `atmosferaMadre.js` | Paleta y cielos madre. |
| `CIELOS_HORA` / `presetDeHora` / `franjaDeHoraDecimal` | `cielosHoraData.js` | Presets de luz por franja del día. |
| `perfilDeTier` / `decidirTier` | `deviceTier.js` | Presupuesto de render por dispositivo (LOD). |
| `SombraContacto` | `escenas/SombraContacto.jsx` | AO barato (sombra de contacto falsa). |
| `CamaraDirector` / `resolverEncuadre` | `escenas/CamaraDirector.jsx`, `camaraDioramas.js` | Establishing shot + encuadres por mundo. |
| `VeloOdyssey` / `useCruceMundo` | `transiciones/` | Transición Odyssey entre mundos. |

**No se movió** el código canónico (evitar churn/roturas en escenas que ya
importan de su casa). El kit es la **superficie pública** única.

## Receta: hacer congruente un "mundo vivo" (bosque/cacao/cafetal/papa)

Estas escenas montan su propio `<Canvas>` y hoy clavan un cielo estático que ni
cambia con la hora ni conversa con el valle. Para heredar la hora viva:

```jsx
import { Canvas } from '@react-three/fiber';
import { AtmosferaMundo, perfilDeTier, construirTerreno, ruidoTerreno } from '@/visual/mundo3d/kit';

function Diorama({ tier, reducedMotion }) {
  return (
    <>
      {/* reemplaza <color>/<fog>/luces/estrellas/sombras hechas a mano: */}
      <AtmosferaMundo familia="sotobosque" tier={tier} reducedMotion={reducedMotion} radio={7} />
      {/* … tu terreno con construirTerreno(...), tu flora con fusionarSeguro(...) … */}
    </>
  );
}
```

`familia` es una de `CIELOS`: `neutro | agua | tierra | corral | plaza | huerta |
sotobosque | ladera | alba`. Es el 40% de identidad propia del mundo; el 60%
restante lo pone la hora madre del valle.

## Terreno

```js
const geo = construirTerreno({
  ancho: 20, fondo: 20, seg: perfilDeTier(tier).segmentosTerreno,
  altura: (wx, wz) => ruidoTerreno(wx * 0.2, wz * 0.2) * 1.5,
  pintar: (wx, wz, alt, out) => out.lerpColors(cPasto, cTierra, saturar(alt)),
  plano: perfilDeTier(tier).flatShading,
});
```

## Geometría procedural — regla de oro

**Nunca** llame `mergeGeometries` a mano. Siempre `fusionarSeguro(partes, etiqueta)`.
Desindexa todo, valida que las partes declaren los mismos atributos y truena con
el nombre de la especie si el merge da null — el fallo que ya apagó especies
enteras **sin un solo error en consola**, tres veces.

## Estado / GAPS pendientes

Ver `ops/TOOLKIT-3D-INVENTARIO-2026-07-16.md` para el inventario completo, los
consumidores por escena y los gaps que quedan (migración de las escenas vivas al
kit, dedupe del PRNG local, terreno de los mockups).
