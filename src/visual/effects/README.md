# `src/visual/effects` — efectos visuales reutilizables

Librería de las **técnicas de cine** de Chagra (las que dan el "wow": velos,
viñeta, scrims, grades de luz por piso térmico, glow, pulso cardíaco,
auto-dibujado, acuarela) como **CSS + helpers SVG limpios, parametrizables y sin
dependencias nuevas**. Nace para **dejar de re-hilvanar el mismo efecto** en
cada mockup/escena: hoy el velo neón, la viñeta, los grades `--mm2-*`, el glow
`feMerge`, el latido `--fvo-beat`, el trazo que se dibuja solo y el filtro
acuarela aparecían copiados/redibujados en `finca-viva-hero.css`,
`scene-finca-organismo.css`, `scene-trazo-minimal.css`, `GuardianEspiritu`, los
mockups de la Montaña y el mapa-acuarela. Aquí vive la **versión canónica**.

Hermana de [`src/visual/creatures`](../creatures/README.md) (personajes de
fauna): misma filosofía, mismo contrato de reuso.

## Regla de la casa

> **Antes de re-dibujar un efecto de cine, búsquelo aquí.**
> Si existe → **reúselo** (y de ser posible, **mejore** la versión canónica,
> para que todos hereden la mejora).
> Si crea un efecto nuevo reutilizable → **agréguelo aquí en el mismo PR**
> (clase/helper + entrada en `index.js` + fila en esta tabla).

## Qué hay

| Efecto | Cómo se usa | Catálogo | Semilla |
|---|---|---|---|
| **Velo atmosférico** neón | clase `.vfx-veil` (custom props `--vfx-veil-a/b/opacity`) | §13.5 / §13.16 | `finca-viva-hero` `.fvh-escena-wrap::after` |
| **Viñeta** de cine | clase `.vfx-vignette` (`--vfx-vignette-strength`) | §13.5 | idem |
| **Scrims** arriba/abajo | clases `.vfx-scrim-top` / `.vfx-scrim-bottom` (`--vfx-scrim-color/-h`) | §13.5 | idem |
| **Grades de luz por piso térmico** | clase `.vfx-grade` + modificador `.vfx-grade--{glacial,paramo,frio,templado,calido,valle}`; tokens `--vfx-piso-*`; `--vfx-grade-fuerza` por dirección | §13.2 | los `--mm2-*` de Montaña |
| **Glow** (feMerge) | helper `<GlowFilter id std blurId />` | §13.16 | unifica `ge-glow1` + `creatures/_filters` |
| **Pulso cardíaco** | token `--vfx-beat` + clases `.vfx-beat`, `.vfx-beat-wave`, `.vfx-beat-glow` | §13.10 | `--fvo-beat` (SceneFincaOrganismo) |
| **Auto-dibujado** | helper `<AutoDibujo stage fade />` + clases `.vfx-draw/.vfx-fade/.vfx-t1…t9` | §13.11 | SceneTrazoMinimal `fvm-t*` |
| **Flujo por dash** | clase `.vfx-flow` (`--vfx-flow-dur/-len`) | §13.12 | `fvo-flow` / `adm-sap` |
| **Filtro acuarela** | helper `<FiltroAcuarela id scale frequency />` | — | mapa-acuarela (feTurbulence+feDisplacementMap) |

## Dos formas de consumir

**1. CSS** (velos, viñeta, scrims, grades, latido, auto-dibujado, flujo).
Importe el CSS una vez donde lo use y ponga las clases:

```jsx
import '../../visual/effects/effects.css';

// una escena con cielo de biopunk y hora dorada en la finca:
<div style={{ position: 'relative' }}>
  <MiEscenaSVG />
  <div className="vfx-grade vfx-grade--templado" />   {/* luz de la finca  */}
  <div className="vfx-veil" />                          {/* velo neón        */}
  <div className="vfx-scrim-bottom" />                  {/* para que el texto lea */}
  <div className="vfx-vignette" />                      {/* enfoca el centro */}
</div>
```

El pulso cardíaco sincroniza todo lo vivo con una sola variable:

```jsx
// el corazón late, la red se enciende en fase, la onda se expande:
<g className="vfx-beat"><path d="…corazón…" /></g>
<g className="vfx-beat-glow"><path d="…red micorrízica…" /></g>
<circle className="vfx-beat-wave" r="8" />
// para acelerar/frenar TODO junto:  style={{ '--vfx-beat': '4s' }} en un ancestro
```

**2. Helpers SVG** (glow, acuarela, auto-dibujado). Se montan en tu `<defs>` /
tu SVG. Cada instancia usa **ids únicos** (`useId`) para repetirse sin colisión:

```jsx
import { useId } from 'react';
import { GlowFilter, FiltroAcuarela, AutoDibujo } from '../../visual/effects';
import '../../visual/effects/effects.css';

function MiEscena() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const glow = `glow-${uid}`;
  const agua = `acuarela-${uid}`;
  return (
    <svg viewBox="0 0 390 486">
      <defs>
        <GlowFilter id={glow} std={2.2} blurId={`blur-${uid}`} />
        <FiltroAcuarela id={agua} scale={7} frequency={0.014} />
      </defs>

      {/* glow neón sobre lo vivo */}
      <g filter={`url(#${glow})`}>{/* … */}</g>

      {/* un relieve/mancha con borde de acuarela */}
      <path d="…" fill="#6f9a85" filter={`url(#${agua})`} />

      {/* el trazo se dibuja solo, por etapas */}
      <AutoDibujo d="M20,300 C120,260 …" stage={1} stroke="#414b42" strokeWidth="2.5" fill="none" />
      <AutoDibujo d="M60,300 L60,240 …" stage={3} stroke="#414b42" strokeWidth="2.5" fill="none" />
      <AutoDibujo as="circle" fade stage={6} cx="300" cy="90" r="26" fill="#cbb96a" />
    </svg>
  );
}
```

Consumidor de referencia (convertido en este PR): **`dashboard/GuardianEspiritu.jsx`**
— sus filtros `ge-glow1`/`ge-blur3`, antes inline, hoy salen de `<GlowFilter>`
(mismo markup, cero regresión visual).

## Técnica y reglas

- **CSS + SVG puros, cero dependencias nuevas**; solo `transform`/`opacity`
  animados, **blur/filtros ESTÁTICOS** (Android gama baja). Cero JS por frame.
- Cada helper emite **solo el `<filter>`** (sin `<defs>` propio): el consumidor
  lo mete en su `<defs>` y referencia por id. **Ids únicos** con `useId` para
  repetir muchos en una misma página sin colisión.
- **Reduced-motion-safe**: sin movimiento, el latido queda encendido, el trazo
  COMPLETO, los planos visibles y velos/grades/viñeta quietos (son estáticos).
- Las capas-overlay (`.vfx-veil/.vfx-vignette/.vfx-scrim-*/.vfx-grade`) se montan
  dentro de un contenedor `position: relative`, no capturan toque y heredan el
  radio del contenedor.
- Los **grades por piso térmico** nacen tokenizados (`--vfx-piso-*`): cuando la
  Montaña entre a prod, se re-tiñen desde `themes.css` sin tocar las escenas
  (§13.2, promoción de los `--mm2-*` recomendada por el catálogo §14b).
