# usePerformanceMonitor — calidad adaptativa en vivo (FASE 0)

Degradación dinámica de rendimiento para el 3D de Chagra. Mide fps reales con
el `<PerformanceMonitor>` de `@react-three/drei` y gradúa la calidad en
caliente (DPR, densidad de partículas, efectos) para que la gama baja no se
congele. **Complementa** el device-tier estático (`deviceTier.js`), no lo
reemplaza: el tier es el techo, este monitor es el termostato.

Archivo: `src/visual/mundo3d/usePerformanceMonitor.jsx` (autocontenido; nada
existente fue tocado). Tests: `__tests__/usePerformanceMonitor.test.js`.

## Modelo

```text
decidirTier() ──(una vez, antes de montar)──► tier 'alto'|'medio'|'bajo'
                                                │  techo: TECHO_DPR[tier]
<MonitorRendimiento tier={tier}>  (dentro del Canvas)
   └─ drei <PerformanceMonitor> mide fps → factor 0..1 (sube/baja de a `step`)
        └─ store módulo-local → { nivel, factor, dpr, escalaParticulas, fallback }
             ├─ AjusteDpr aplica `setDpr(dpr)` al renderer (opcional)
             └─ useCalidad3D() en cualquier componente (dentro O fuera del Canvas)
```

- `nivel` (`'alto'|'medio'|'bajo'`): perilla **discreta** — efectos on/off
  (niebla, animaciones secundarias, materiales caros).
- `factor` (0..1) y `escalaParticulas` (0.4..1): perillas **continuas** —
  conteos de instancias, densidades, distancias de dibujo.
- `dpr`: cuantizado a pasos de 0.25, siempre `≤ TECHO_DPR[tier]` (DR §6: ≤1.5).
- `fallback`: si el equipo serrucha demasiado (`flipflops`), la calidad queda
  clavada hacia abajo (acepta bajadas, ignora subidas). Estable > bonito.
- El store es singleton (un Canvas activo a la vez, el host `<Mundo>`) y
  persiste lo aprendido entre escenas del mismo tier.

## Cableo propuesto (para Opus)

**1. Montar el monitor dentro del Canvas** — en `escenas/EscenaBase3D.jsx`,
dentro de `<Canvas>`:

```jsx
import MonitorRendimiento from '../usePerformanceMonitor.jsx';

<Canvas dpr={[1, 1.5]} /* ...igual que hoy... */>
  {!reducedMotion && <MonitorRendimiento tier={tier} />}
  <Suspense fallback={null}>...</Suspense>
</Canvas>
```

Dos condiciones NO negociables del cableo:

- **Retirar `<AdaptiveDpr pixelated />`** (hoy en el `<Contenido>` de
  `EscenaBase3D`) o montar `<MonitorRendimiento ajustarDpr={false} />`. Ambos
  llaman `setDpr`; dos manos en la misma perilla pelean.
- **No montar el monitor con `frameloop='demand'`** (camino reduced-motion):
  sin frames continuos el muestreo de fps no significa nada. El gate
  `!reducedMotion` de arriba lo resuelve.

`tier` viene de `decidirTier()` que ya calcula el host `<Mundo>`; hay que
pasarlo como prop hasta `EscenaBase3D` (hoy no llega — es el único cambio de
firma que pide el cableo). Mientras no llegue, el default `'medio'` es seguro.

**2. Consumir la calidad en las escenas/arquetipos** (dentro del Canvas):

```jsx
import { useCalidad3D } from '../usePerformanceMonitor.jsx';

function Particulas({ base = 120 }) {
  const { nivel, escalaParticulas } = useCalidad3D();
  const n = Math.round(base * escalaParticulas); // 48..120 segun rendimiento
  return (
    <>
      <Instancias cantidad={n} />
      {nivel === 'alto' && <NieblaCara />} {/* efecto on/off por nivel */}
    </>
  );
}
```

**3. Dentro de `useFrame`** usar los getters no-reactivos (cero re-renders):

```js
import { leerCalidad, leerFps } from '../usePerformanceMonitor.jsx';

useFrame(() => {
  if (leerCalidad().nivel !== 'alto') return; // saltar animacion secundaria
});
```

**4. Fuera del Canvas** (HUD de la PWA, storybook): `useCalidad3D()` funciona
igual — el store puentea los dos árboles de React, sin ContextBridge.

## Reglas duras

- **NO exportar desde el barrel** `mundo3d/index.js`: este módulo importa
  drei/fiber y el barrel es three-free por contrato (code-split). Importarlo
  solo desde código 3D perezoso (`escenas/`, chunk `vendor-three`), igual que
  `useEntradaAbeja`.
- `reiniciarCalidad(tier)` es para tests/dev; las escenas no lo llaman.
- `__internos` es solo para tests unitarios.

## Props de `<MonitorRendimiento>` (defaults pensados para Chagra)

| prop | default | qué hace |
|---|---|---|
| `tier` | `'medio'` | techo estático de `decidirTier()` |
| `ajustarDpr` | `true` | aplica `setDpr` él mismo |
| `ms` / `iterations` | `250` / `8` | ventana de muestreo (~2s por decisión) |
| `step` | `0.1` | cuánto sube/baja el factor por decisión |
| `flipflops` | `12` | cambios totales antes del candado (drei cuenta CADA cambio, no solo oscilaciones) |
| `limites` | `hz>100 ? [45,100] : [45,60]` | baja bajo 45 fps sostenido; sube al clavar el refresco |

Factor inicial por tier: `alto` arranca en 1.0 (solo puede bajar), `medio` en
0.6 (puede subir si el equipo sorprende). Umbrales de `nivel`: ≥0.7 alto,
≥0.35 medio.
