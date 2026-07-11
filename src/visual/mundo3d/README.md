# `src/visual/mundo3d` — el framework de MUNDOS (2D + 3D data-driven)

Un solo host **`<Mundo>`** construye cualquier mundo de la finca eligiendo un
**arquetipo** por datos y cruzándolo con el **device-tier** del equipo. El
objetivo (DR-MUNDOS-3D-FRAMEWORK): **sumar un mundo = una entrada de datos +
assets de la librería visual; nunca código de escena desde cero.**

Un principio, dos dimensiones de PRIMERA CLASE:

- **3D** cuando el espacio ENSEÑA (lo invisible del subsuelo, la pendiente del
  agua, la verticalidad del bosque, el ciclo del corral, el mapa del valle).
- **2D** cuando el valor ES el dato/foto/diagnóstico (mercado, sanidad, fichas de
  cultivo). No es "el fallback tonto": es un arquetipo que un mundo declara
  DIRECTO. Y todo diorama 3D cae a un **espejo 2D digno** en equipos humildes.

## El contrato de `<Mundo>`

```jsx
import Mundo from 'src/visual/mundo3d';

<Mundo
  mundoId="suelo"        // clave de MUNDO[] (mundoData.js)
  tier="alto"            // 'alto'|'medio'|'bajo'|'2d' — de decidirTier()
  reducedMotion={false}
  onHotspot={(view, data) => onNavigate(view, data)}  // re-rutea a una vista 2D REAL
  onSalir={() => volverAlValle()}
  animo="sereno" energia={0.8}   // de la salud real de la finca (la abeja)
/>
```

- **Regla de oro (reachability):** todo `hotspot.view` es un `case` real de
  `App.jsx`. El mundo **nunca** reimplementa la pantalla 2D — la **re-rutea**.
- **Nada de lógica de negocio** dentro de `<Mundo>`: solo lee datos y elige
  arquetipo. Sumar un mundo no toca este componente.

## Las capas (archivos)

| Archivo | Qué es |
| --- | --- |
| `mundoData.js` | **El registro `MUNDO[id]`** — una entrada por mundo (el corazón). |
| `arquetipos.js` | El set CERRADO y filtrable de arquetipos (`dim`, `role`, espejo). |
| `resolverMundo.js` | Función pura: `(mundoId, tier) → plan { modo, escena, entrada }`. |
| `deviceTier.js` | `decidirTier()` — device-tiering heredado del valle (alto/medio/bajo). |
| `Mundo.jsx` | El host: 2D estático + 3D **perezoso** adentro. |
| `Mundo2D.jsx` | Host de los arquetipos 2D (three-free, siempre fiable). |
| `escenas/` | Los dioramas 3D (`vendor-three`, cargados perezoso). |
| `laminas2d/` | Los arquetipos 2D (mirror, infografia, ficha, lamina, valle2d). |

## Los arquetipos

**3D (dioramas low-poly, `escenas/`):**

| clave | qué enseña | espejo 2D | mundos |
| --- | --- | --- | --- |
| `cutaway` | el corte del suelo/compost (vida invisible) | `mirror` | suelo, abono |
| `flujo` | el camino del agua (gravedad y pendiente) | `mirror` | agua |
| `recinto` | el corral y su ciclo cerrado del abono | `mirror` | animales |
| `estratos` | la verticalidad del bosque comestible | `mirror` | disenio |
| `valle` | el mapa navegable (reusa `Valle3D`) | `valle2d` | valle |

**2D de primera clase (`laminas2d/`):**

| clave | qué es | mundos |
| --- | --- | --- |
| `lamina` | ficha ilustrada, reusa `src/visual/laminas` | cultivos, cafe |
| `infografia` | dato/cifras/dosis | mercado, sanidad |
| `ficha` | tarjeta de especie foto-secuencial | frutales |
| `mirror` | el espejo 2D SVG de un diorama 3D degradado | (auto) |
| `valle2d` | el mapa isométrico SVG (`Valle2DFallback`) | (auto) |

## Cómo se ve "sumar un mundo"

**1) Mundo 2D-dato** (otra ficha/tabla) — minutos:
```js
mercado: {
  escena: 'infografia',
  params: { titulo: 'Mercado y despensa', cifras: [...], notas: [...] },
  hotspots: [{ id: 'vender', emoji: '🤝', label: 'Vender y comprar', view: 'mercado' }],
},
```

**2) Mundo SÍ-3D que reusa arquetipo** (p. ej. compost → `cutaway`) — una
entrada de datos, **cero código 3D**:
```js
abono: {
  escena: 'cutaway',
  params: { vida: 0.55, capas: [ { nombre:'cobertura', color:'#8a6a3a', alto:0.5, bichos:['hifa'] }, … ] },
  hotspots: [{ id:'compost', pos:[0,0.6,0.6], emoji:'🍂', label:'El compost, paso a paso', view:'compost' }],
  entrada: { zoom: 6, narra: 'abono' },
},
```

**3) Mundo con metáfora NUEVA** (raro) — se añade UN arquetipo `Escena*` a
`escenas/` (la única vez que se escribe R3F) componiendo `EscenaBase3D`, y queda
reutilizable por todos.

## Rendimiento y offline (DR §6)

- Dioramas **frugales**: `MeshLambert`/`MeshBasic`, **sin sombras**, sin
  post-proceso, `dpr={[1,1.5]}`, `AdaptiveDpr`, `frameloop='demand'` con
  reduced-motion. Geometría **100% procedural** — cero GLTF/HDR/fuentes remotas.
- `three`/`@react-three` viven en el chunk **`vendor-three`** (perezoso). El
  barrel de este framework **no** los importa; los dioramas se cargan a demanda
  desde `<Mundo>`. El 2D **nunca** toca `three` → es el piso digno garantizado.
- La abeja **Angelita** (`src/visual/creatures`) es el avatar-jugador; su
  coreografía de entrada la comparte `escenas/useEntradaAbeja.jsx` (la creature
  posee el cuerpo, la escena posee la coreografía). `IrisVoz` (`src/visual/voz`)
  es la voz que nombra el mundo al entrar.
