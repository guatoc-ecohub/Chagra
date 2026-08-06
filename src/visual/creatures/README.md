# `src/visual/creatures` — personajes de fauna reutilizables

Librería de **personajes de fauna de la chagra** como componentes SVG limpios,
parametrizables y sin dependencias nuevas. Nace para **dejar de redibujar el
mismo bicho** en cada mockup/escena: hoy el colibrí, la abeja angelita, la
lombriz, la mariposa y el escarabajo aparecían dibujados por separado en varios
sitios (`mockups/MockupGuardianesNarrativos`, `dashboard/Scene*`,
`FincaVivaHero`, `MundoVinetas`, `MundoSubsuelo`, avatares del colibrí…) con
calidad dispar. Aquí vive la **versión canónica** de cada uno.

## Regla de la casa

> **Antes de dibujar un personaje de fauna, búscalo aquí.**
> Si existe → **reúsalo** (y si podés, **mejorá** la versión canónica en su
> archivo, para que todos hereden la mejora).
> Si dibujás un personaje nuevo reutilizable → **agregalo aquí en el mismo PR**
> (componente + entrada en `index.js` + fila en esta tabla).

## Personajes

| Componente | Especie (binomio verificado) | Notas |
|---|---|---|
| `AbejaAngelita` | *Tetragonisca angustula* | Meliponino nativo **SIN aguijón** — NO *Apis*. Alitas de tul que baten. |
| `Colibri` | *Colibri coruscans* | Colibrí chillón andino. Pico largo, garganta violeta, alas que baten. |
| `Lombriz` | *Martiodrilus crassus* | Lombriz gigante nativa. Cuerpo segmentado con clitelo. Sin animación propia (su movimiento lo da la escena). |
| `Mariposa` | *Dione juno* | Pasionaria de alas largas. Cuatro alas que abren y cierran. |
| `Escarabajo` | *Dichotomius belus* | Estercolero colombiano. Élitros brillantes, cuerno, y bola de abono que rueda. |

## Props

Todos comparten la misma firma:

| Prop | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `size` | `number \| string` | `64` | Ancho/alto en modo standalone (`<svg>`). Ignorado en modo `inline`. |
| `className` | `string` | — | Clase(s) del nodo raíz. En modo `inline` es donde la escena engancha su coreografía de entrada/posición. |
| `inline` | `boolean` | `false` | `false` → `<svg>` autónomo (avatares, catálogo, botones). `true` → solo un `<g>` para incrustar en una escena SVG existente. |
| `animated` | `boolean` | `true` | Activa la vida perpetua (aleteo, alas, bola, patas). `false` = quieto. Siempre reduced-motion-safe. |
| `title` | `string` | nombre del bicho | `aria-label` + `<title>` accesible. |

Props extra (`...rest`) se pasan al `<svg>` en modo standalone.

## Uso

```jsx
import { Colibri, AbejaAngelita } from '@/visual/creatures';

// Avatar / catálogo — SVG autónomo:
<Colibri size={48} title="Colibrí chillón" />
<AbejaAngelita size={40} animated={false} />

// Dentro de una escena SVG propia (la escena pone posición y entrada):
<svg viewBox="0 0 340 210">
  {/* …fondo, suelo… */}
  <g transform="translate(120 66)">
    <Colibri inline className="mi-entrada-volando" />
  </g>
</svg>
```

Consumidor de referencia: **`src/mockups/MockupGuardianesNarrativos.jsx`**
(usa las 5 criaturas en modo `inline`).

## Técnica

- SVG + CSS puros, **cero dependencias nuevas**; solo `transform`/`opacity`
  (GPU, Android gama baja). Familia visual del glow de `GuardianEspiritu`.
- Cada instancia genera **ids de filtro únicos** (`useId`), así se pueden
  repetir muchas criaturas en una misma página sin colisión.
- La **vida perpetua** vive en `creatures.css` (clases `crt-*`), es intrínseca
  a la criatura y **reduced-motion-safe** (sin animación → fotograma digno).
- La **coreografía de LLEGADA** (entrar volando, asomar del suelo, rodar) NO
  vive aquí: es responsabilidad de la escena que consume la criatura, sobre el
  `className` del modo `inline`.
