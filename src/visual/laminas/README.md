# `src/visual/laminas` — láminas de cuaderno de campo reutilizables

Librería de **láminas de cuaderno de campo** como componentes SVG limpios,
parametrizables y sin dependencias nuevas. Nace para **dejar de redibujar la
misma lámina** en cada mundo/pantalla: la siembra y el aporque de los
tubérculos, la mata de maíz, el cafeto y la mata "viva" por etapa vivían
dibujadas por separado en `components/tuberculos`, `components/milpa`,
`components/cafe` y `components/mockups`, con calidad dispar. Aquí vive la
**versión canónica** de cada una.

Es la hermana de [`src/visual/creatures`](../creatures/README.md): allí viven
los **personajes** (íconos cuadrados de fauna); aquí las **láminas** (hojas de
papel enteras, con su viewBox y su relación de aspecto). Por eso **no comparten
la misma firma de props**: una lámina no tiene `size`/`inline` — se dibuja a
`width:100%` y expone `className` + su propia prop de dominio.

## Regla de la casa

> **Antes de dibujar una lámina de cuaderno, búscala aquí.**
> Si existe → **reúsala** (y si podés, **mejorá** la versión canónica en su
> archivo, para que todos hereden la mejora).
> Si dibujás una lámina nueva reutilizable → **agregala aquí en el mismo PR**
> (componente + entrada en `index.js` + fila en esta tabla).

## Láminas

| Componente | Nombre común | Especie / mundo | Accesibilidad | Prop propia |
|---|---|---|---|---|
| `LaminaSiembra` | Formas de siembra | Tubérculos y raíces | decorativa (`aria-hidden`) | `activo` |
| `LaminaAporque` | El aporque (en corte) | Tubérculos y raíces | decorativa (`aria-hidden`) | — |
| `LaminaMaiz` | La mata de maíz | *Zea mays* | enseña (`role=img` + rótulos) | — |
| `LaminaCafeto` | El cafeto | *Coffea arabica* | enseña (`role=img` + rótulos) | — |
| `LaminaMataEtapa` | La mata por etapa (viva) | *Solanum lycopersicum* | decorativa (`aria-hidden`) | `etapa` |

## Props

| Prop | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `className` | `string` | — | Clase(s) extra sobre el nodo raíz. Se **añaden** a las clases base de la lámina (`w-full h-auto select-none` en las SVG, o `lam-mata-svg`), nunca las reemplazan. |
| `activo` | `'tuberculo' \| 'esqueje' \| 'colino' \| null` | `null` | **Solo `LaminaSiembra`.** Resalta una de las tres formas y atenúa las otras. Sin valor, se ven las tres. |
| `etapa` | `'semilla' \| 'plantula' \| 'juvenil' \| 'adulto' \| 'floracion' \| 'cosecha'` | `'semilla'` | **Solo `LaminaMataEtapa`.** Cambia el dibujo según la etapa real de la mata y reanima el crecimiento. |

## Uso

```jsx
import { LaminaSiembra, LaminaMaiz } from '@/visual/laminas';

// Decorativa, con una forma resaltada:
<LaminaSiembra activo="esqueje" />

// Lámina que enseña (trae sus propios rótulos):
<LaminaMaiz className="max-w-md mx-auto" />

// Lámina viva de una mata concreta:
<LaminaMataEtapa etapa="floracion" />
```

Consumidor de referencia: **`src/components/TuberculosScreen.jsx`** (importa
`LaminaSiembra` y `LaminaAporque` desde aquí).

## Técnica

- SVG puro, **cero dependencias nuevas**. Colores de tinta **fijos** en las
  láminas que "enseñan" (maíz, cafeto): son un pliego de papel prendido a la
  pantalla, legible al sol en los cuatro temas. Las decorativas de tubérculos
  usan `currentColor` + clases Tailwind para respirar con el tema.
- `LaminaMaiz` genera los ids de sus `<defs>` (papel, clip de la mazorca) con
  **`useId`**, así se puede repetir varias veces en una misma página sin
  colisión de ids.
- La única animación (el crecimiento de `LaminaMataEtapa` al cambiar de etapa)
  vive en `laminas.css` (`lam-mata-brota`) y es **reduced-motion-safe**.
- Todas son **rsvg-safe** salvo por el `<text>` de rótulos (sin emoji-en-SVG,
  sin filtros exóticos), aptas para captura de pantalla del harness visual.

## Candidatos evaluados y **aún no** promovidos

- **`EstiercolIlustraciones`** (rama `feat/mundo-estiercol-compost`, sin mergear
  a `main`) es un módulo **mixto**, no una lámina limpia:
  - `BiodigestorIlustracion` **sí** es una lámina de corte (parametrizable con
    `llenado`) — es la candidata a promover **cuando su mundo llegue a `main`**,
    trayéndose además sus animaciones `estiercol-*` a `laminas.css`.
  - `CicloCorralAbono` usa **emoji-en-SVG** (🐖 🛢️ 💧 🌱), que **no es
    rsvg-safe** ni cumple la regla de la casa → no entra tal cual.
  - `AbonoGlifo` es un **glifo** de 44×44, no una lámina (más cerca de un ícono).
  Se dejó fuera de este PR a propósito para no arrastrar un módulo a medio
  mergear ni romper la garantía de arte byte-idéntico.
