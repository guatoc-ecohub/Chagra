# `src/visual/scenes` — escenas base reutilizables

Librería de los **decorados base** de Chagra (las "escenas" que se repiten en el
home vivo y los mockups) como componentes SVG/DOM limpios, parametrizables y sin
dependencias nuevas. Nace para **dejar de re-armar el mismo decorado** en cada
escena: hoy la capa de cielo por hora/clima, el parallax de la Montaña, el marco
del guardián-espíritu, el grano de papel kraft y la finca-organismo con su
latido aparecían dibujados/hilvanados por separado en `FincaVivaHero`,
`MontanaMundosCine`, `GuardianEspiritu` y las escenas del home. Aquí vive la
**versión canónica** de cada uno.

Hermana de [`src/visual/creatures`](../creatures/README.md) (fauna) y
[`src/visual/effects`](../effects/README.md) (técnicas de cine): misma filosofía,
mismo contrato de reuso.

## Regla de la casa

> **Antes de re-armar una escena base, búscala aquí.**
> Si existe → **reúsela** (y de ser posible, **mejore** la versión canónica en su
> archivo, para que todos hereden la mejora).
> Si arma una escena base nueva reutilizable → **agréguela aquí en el mismo PR**
> (componente + entrada en `index.js` + fila en esta tabla).

## Qué hay

| Escena | Componente | Clave | Salió de |
|---|---|---|---|
| **Capa cielo paramétrica** | `CapaCielo` | sol/luna/estrellas/nubes/niebla/lluvia por **hora y clima reales** | `FincaVivaHero` (subcomponente `Sky`, compartido por las 3 escenas) |
| **Parallax multicapa** | `Parallax` | motor de cámara por capas (`f<1` lejos, `f>1` cerca) | `MontanaMundosCine` (Montaña de los Mundos, pasada cine) |
| **Guardián-espíritu base** | `GuardianEspirituBase` | avatar de fauna como espíritu, glow por acento | `GuardianEspiritu` (mockup avatar-biopunk) |
| **Papel kraft** | clase `.scn-kraft` | grano de papel por líneas repetidas (sin imagen/noise) | `finca-viva-hero.css` (grano nature/minimalista) |
| **Finca organismo** | `SceneFincaOrganismo` | finca bioluminiscente con corazón-semilla que **late** | `SceneFincaOrganismo` (escena-home-biopunk-v2) |

## Props

### `CapaCielo`
Se monta como hijos de un `<svg>` que la escena ya define (con su `viewBox`).
Emite su `<defs>` (gradientes del sol, **ids únicos por instancia** con `useId`)
+ el grupo del cielo + la veladura de sol bajo.

| Prop | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `cielo` | `{ luz?, condicion?, tema? }` | — | atmósfera ya resuelta (misma forma que `atmosphereService` + `useTheme`). **No lee el DOM.** |
| `cx` / `cy` / `r` | `number` | — | centro y radio del astro en coords del `viewBox`. |
| `lluviaY` | `number` | `150` | altura desde donde caen lluvia/niebla. |
| `w` / `h` | `number` | `390` / `360` | tamaño de la veladura de sol bajo. |
| `wash` | `boolean` | `true` | montar la veladura cálida de amanecer/atardecer. |

Helpers exportados: `Sky`, `CieloDefs`, `WashSolBajo` (piezas sueltas), y
`cieloEscena(cielo, escena)`, `tonoLuz`, `esNoche`, `esCubierto`, más las tablas
`CIELOS_ESCENA` / `CIELOS_TEMA`.

### `Parallax`
El **motor** apila capas; la **geometría de la escena** (pisos, encuadre, gestos)
la calcula el consumidor y le pasa la cámara base `{ tx, ty, s }`.

| Prop | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `camara` | `{ tx, ty, s }` | — | cámara base; la escena la calcula con su dominio. |
| `capas` | `Array<{ id?, f, contenido, clase?, interactiva?, style? }>` | `[]` | capas de fondo a frente; `f` = factor (use `CAPAS_PARALLAX.*`), `interactiva:true` deja pasar el toque. |
| `alturaCapa` | `number` | — | alto en px de cada capa (= alto de la escena escalada). |

Helpers: `CAPAS_PARALLAX` (factores por capa), `transformCapa(camara, f)`,
`useViewport(ref)`.

### `GuardianEspirituBase`
El avatar-espíritu en su disco con halo por acento + los filtros glow/blur. El
avatar (los `<g>` de cada especie) es del dominio del consumidor: se pasa como
`children` y filtra su glow con `url(#scn-ge-glow)`.

| Prop | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `children` | `ReactNode` | — | el `<g>` del avatar de fauna. |
| `size` | `number\|string` | `78` | lado del disco/SVG. |
| `acc` / `accRgb` | `string` | ámbar | color de acento del halo (hex + `"r, g, b"`). |
| `viewBox` | `string` | `"-26 -24 52 46"` | viewBox del avatar. |
| `glowId` / `blurId` | `string` | `scn-ge-glow` / `scn-ge-blur` | ids de los filtros (override para repetir sin colisión). |
| `title` | `string` | — | rótulo accesible; sin él, decorativo (`aria-hidden`). |

### `SceneFincaOrganismo`
La escena completa de la finca-organismo (biopunk). Props: `estructura`
(`{ tiene, forma }`), `onAnimales` (potrero tappable), `onPregunte` (corazón
tappable). Su CSS (`scene-finca-organismo.css`) se importa donde se use, igual
que la hoja de `effects`.

### Papel kraft — clase `.scn-kraft`
Textura de grano por `repeating-linear-gradient` (cero imagen/`feTurbulence`).
Se re-tiñe con custom props; el modificador `.scn-kraft--fino` da la trama
vertical finísima de papel.

```jsx
import { SCN_KRAFT_CLASS } from '@/visual/scenes';
import '@/visual/scenes/scenes.css';

// grano horizontal de papel kraft (nature), sobre un contenedor position:relative:
<div className="scn-kraft" style={{ position: 'absolute', inset: 0,
  '--scn-kraft-color': 'rgba(122, 82, 48, 0.06)' }} />
```

## Uso

```jsx
import { CapaCielo, Parallax, CAPAS_PARALLAX, GuardianEspirituBase, SceneFincaOrganismo } from '@/visual/scenes';
import '@/visual/scenes/scenes.css';

// 1. Cielo real por hora/clima dentro de una escena SVG propia:
<svg viewBox="0 0 390 360" preserveAspectRatio="xMidYMid slice">
  <CapaCielo cielo={{ luz: 'noche', condicion: 'despejado', tema: 'biopunk' }} cx={300} cy={70} r={26} />
  {/* …tus lomas, plantas, animales… */}
</svg>

// 2. Parallax: la escena calcula la cámara y declara sus capas:
<Parallax
  camara={camara}                 // { tx, ty, s } de tu geometría de pisos
  alturaCapa={escenaH}
  capas={[
    { id: 'cielo', f: CAPAS_PARALLAX.cielo, contenido: <CieloSvg /> },
    { id: 'lejos', f: CAPAS_PARALLAX.lejos, contenido: <CordilleraSvg /> },
    { id: 'principal', f: CAPAS_PARALLAX.principal, interactiva: true, contenido: <MontanaSvg /> },
    { id: 'cerca', f: CAPAS_PARALLAX.cerca, contenido: <PrimerPlanoSvg /> },
  ]}
/>

// 3. Un avatar de fauna como espíritu de la finca:
<GuardianEspirituBase size={78} acc="#2dffc4" accRgb="45, 255, 196" title="Chivito de páramo">
  <g filter="url(#scn-ge-glow)">{/* …el avatar… */}</g>
</GuardianEspirituBase>
```

Consumidor de referencia (convertido en este PR): **`dashboard/FincaVivaHero.jsx`**
— la portada del home consume `SceneFincaOrganismo` desde esta librería (la
escena se movió aquí byte-idéntica; el hero solo cambió su `import`).

## Técnica y reglas

- **SVG + CSS puros, cero dependencias nuevas**; solo `transform`/`opacity`
  animados, **blur/filtros ESTÁTICOS** (Android gama baja). Cero JS por frame
  (el `Parallax` solo mide el viewport en `resize`).
- Ids de gradiente/filtro **únicos** con `useId` (`CapaCielo`), para repetir
  muchas escenas en una misma página sin colisión.
- **Reduced-motion-safe**: el cielo queda quieto, el corazón encendido y en
  reposo (sin ondas), la red ENCENDIDA, el parallax fijo, el espíritu detenido.
- El **pulso** de la finca-organismo sincroniza todo lo vivo con una sola
  variable `--scn-beat` (5.2s); póngala en un ancestro para acelerar/frenar todo.

## Dedupe con `effects` (cuando entre a main)

Esta librería nace **antes** de que `src/visual/effects` esté en `main`, así que
carga su propia receta. Cuando effects entre, reusarlo donde aplique en vez de
re-declarar:

- **pulso** `--scn-beat` / `.scn-heart*` → equivale a `--vfx-beat` / `.vfx-beat*`.
- **glow** `EspirituDefs` (`feMerge`) → equivale al helper `<GlowFilter>`.
- **veladuras / grades** del cielo por tema → equivalen a `.vfx-veil` / `.vfx-grade`.
