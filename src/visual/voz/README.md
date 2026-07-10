# `src/visual/voz` — la voz con forma

`IrisVoz` es la **identidad visual de la voz de Chagra**: un iris orgánico de
anillos concéntricos (mitad ondas de agua en una totuma, mitad anillos de
crecimiento de un tronco) con una brasa en el centro. Cálido y de tierra —
deliberadamente lo opuesto al astrolabio holográfico de `EscuchaOverlay`.

Mockup de decisión: `#/mockups/voz-con-forma` (`src/mockups/VozConForma.jsx`).

## La regla de oro: el movimiento tiene dirección semántica

| estado | qué hace | por qué |
| --- | --- | --- |
| `reposo` | apenas respira (`--vfx-beat`), brasa en rescoldo | se aquieta, no pide atención |
| `escuchando` | las ondas viajan **hacia adentro**; el brillo sube con el nivel | la voz de usted entra hasta la brasa |
| `pensando` | los anillos se **trenzan** (contra-rotación lentísima) | agua dando vueltas antes de aclararse |
| `hablando` | las ondas **nacen en la brasa** y salen | ahora la voz es de Chagra |

## Uso

```jsx
import IrisVoz from '../visual/voz';

// producción: nivel = RMS real del micrófono, leído cada frame
<IrisVoz estado="escuchando" size={220} getNivel={() => rmsRef.current} />

// demo/onboarding: sin getNivel usa la pseudo-habla determinista incluida
<IrisVoz estado="hablando" size={56} />
```

- **Decorativo por contrato** (`aria-hidden`): el estado se anuncia con texto
  del consumidor (`aria-live`), nunca solo con color.
- La firma sobrevive desde ~22 px (chip) hasta pantalla completa.

## Reglas de la casa (heredadas de `src/visual/effects`)

- Solo `transform`/`opacity` animados; el glow (`GlowFilter` de `effects`) es
  filtro **estático**.
- Cero setState por frame: un solo rAF escribe sobre refs.
- `prefers-reduced-motion`: el rAF no arranca; el CSS pinta un fotograma
  quieto pero legible por estado (color + opacidad cuentan el momento).
- Geometría **determinista** (sin `Math.random`): el iris es una firma.
