# Paleta madre — guía de adopción

Chagra tiene valle, bosque, microsuelo, sierra, finca, juegos… y el riesgo
permanente de que se vean como cinco demos distintos. Este módulo es el alma
común: **la paleta andina, los materiales canónicos y la luz de la casa**,
extraídos de los mundos ya aprobados (no inventados). Un mundo nuevo que
importa de aquí se ve de la misma obra desde el primer commit.

Este módulo **construye encima** de lo que ya es ley — no lo reemplaza:

| Ya existía (no tocar)            | Qué resuelve                                     |
| -------------------------------- | ------------------------------------------------ |
| `../atmosferaMadre.js`           | la hora dorada, los cielos por familia, el bloom |
| `../deviceTier.js`               | el tier y el `perfilDeTier(tier)`                |
| `../cielosHoraData.js`           | las franjas del día (amanecer→noche)             |
| `../escenas/EscenaBase3D.jsx`    | el Canvas del framework (ya monta esta luz)      |
| `../escenas/BloomSutil.jsx`      | el bloom sutil, lazy, SOLO tier alto             |

Lo que este módulo agrega: **los colores con nombre** (`paletaMadre.js`),
**las recetas de material** (`materialesMadre.js`) y **la luz como
componente** (`LuzMadre.jsx`) para escenas fuera del framework.

## 1. Colores: nunca un hex nuevo sin preguntarle a la paleta

```js
import { VERDES, TIERRAS, CORTEZAS, AGUAS, ACENTOS, NEUTROS } from '../paleta';
```

- **Verdes**: elegí por PISO TÉRMICO, no por gusto. Tierra caliente →
  `VERDES.calido` (oliva); templado → `VERDES.trabajo`; frío → `VERDES.frio`;
  páramo → los `paramo*` (apagados, con plata). Rampa completa: `EJE_TERMICO`.
- **El único azul es el agua** (`AGUAS.*`) y el índigo textil
  (`ACENTOS.indigo`) como acento. Cielos: los pone la atmósfera, no vos.
- **Acentos a cucharadas**: `ACENTOS` (cochinilla, maíz, guayacán…) es para
  una cinta, una baya, una señal — jamás para superficies grandes.
- **Nada de grises fabriles ni negro puro**: `NEUTROS.lamina/concreto` ya
  vienen entibiados; la línea oscura es `NEUTROS.tinta` (negro cálido).
- ¿Falta un color? Primero buscá el pariente más cercano y derivalo con
  `mezclar(a, b, t)`. Solo si de verdad no existe, se agrega AQUÍ (con
  fuente y comentario), nunca como hex suelto en el mundo.

## 2. Materiales: la receta decide cómo responde a la luz

```js
import { crearMaterialMadre, crearMaterialVertexColors } from '../paleta';

// materiales con nombre (memoizar + liberar, como siempre):
const matFollaje = useMemo(() => crearMaterialMadre('follaje', perfil), [perfil]);
const matCorteza = useMemo(
  () => crearMaterialMadre('corteza', perfil, { color: CORTEZAS.quenual }),
  [perfil],
);
useEffect(() => () => { matFollaje.dispose(); matCorteza.dispose(); }, [matFollaje, matCorteza]);

// malla fusionada con color por vértice (patrón floraParamo/fincaRealista):
const matUnico = useMemo(() => crearMaterialVertexColors(perfil), [perfil]);
```

Recetas: `follaje`, `corteza`, `tierra`, `roca`, `agua`, `musgo`, `madera`,
`lamina`, `cal`. Cada una ya sabe:

- **Tier**: `materialRico` → `MeshStandardMaterial` con SU roughness;
  medio/bajo → `MeshLambertMaterial`. El mundo no escribe ese ternario nunca
  más.
- **flatShading**: el follaje/tierra/roca lo siguen del perfil; la corteza
  orgánica lo apaga (regla EntQuenua: el relieve es geometría, no facetas).
- **Casos especiales**: `musgo` es Lambert SIEMPRE; `agua` es el único
  material con transparencia y metalness.

Override legítimo: `extra.color` para la variante de especie
(`CORTEZAS.quenual` vs `CORTEZAS.roble`). Override sospechoso: cambiar
roughness/metalness — si lo necesitás, probablemente va una receta nueva acá.

## 3. Luz: dentro del framework no hacés nada; fuera, `<LuzMadre>`

- **Mundo dentro de `EscenaBase3D`** (arquetipos): la luz YA es esta. No
  montés luces propias; a lo sumo elegí tu `CIELOS.familia`.
- **Escena standalone** (galería, mockup, preview con su propio `<Canvas>`):

```jsx
import { LuzMadre, CIELOS, mezclarCielo } from '../paleta';

const c = useMemo(() => mezclarCielo(CIELOS.ladera), []);
<Canvas>
  <color attach="background" args={[c.fondo]} />
  {perfil.fog && <fog attach="fog" args={[c.niebla, 12, 40]} />}
  <LuzMadre cielo={CIELOS.ladera} perfil={perfil} />
  {/* …tu mundo… */}
</Canvas>
```

`<LuzMadre>` acepta `madre` (un preset de `CIELOS_HORA` para amanecer/noche),
`cielo` (tu familia), `perfil` (sombras solo tier alto) y `escala`. Cuatro
luces, cero costo por frame. **No calqués los números a mano**: la deriva de
calcos es exactamente lo que este componente elimina.

## 4. Bloom: no lo montés vos

El bloom sutil vive en `../escenas/BloomSutil.jsx` como chunk lazy que
`EscenaBase3D` monta SOLO con `tier === 'alto' && !reducedMotion`. Su receta
(`BLOOM`: fuerza 0.18, umbral 0.85 — un velo, no discoteca) es dirección de
arte central. Si tu escena standalone de verdad lo amerita, importalo lazy
con el mismo gate; jamás un composer propio con números propios.

## 5. Checklist del mundo nuevo

1. Verdes por piso térmico de la paleta; ni un hex inventado.
2. Materiales por `crearMaterialMadre` / `crearMaterialVertexColors`.
3. Luz: `EscenaBase3D` (arquetipo) o `<LuzMadre>` (standalone).
4. Familia de cielo elegida de `CIELOS`, mezclada con `mezclarCielo` (la ley
   60%-hacia-la-madre), nunca un fondo hex directo.
5. Acentos con cuentagotas; el drama lo pone la luz dorada, no la saturación.
6. Tier-safe gratis: si consumiste 1–3, tu mundo ya degrada solo.
