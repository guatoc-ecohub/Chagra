# compAI — el NÚCLEO, la fuente única de verdad

> Decisión de arquitectura, 2026-07-26. Cierra la pregunta abierta #4 del
> listado de 107 comportamientos (*"¿el compAI de `V/` se hace vivo, o `V/` se
> absorbe en la PWA?"*).

## El problema

El compAI estaba partido en dos productos que no comparten una línea de código:

| | `chagra/` (la PWA) | `valle-guatoc/` (3d.guatoc.co) |
|---|---|---|
| stack | React 18 + R3F + three 0.180, build Vite | three r160 vendorizado, **sin build** |
| carga | bundler resuelve `import` | ESM nativo + `<script type="importmap">` |
| compAI | motor + 9 gestos + anti-repetición | un SVG con `data-estado` fijo |

Dos elencos, dos llaves de `localStorage`, dos ideas de qué dice el personaje.
Iban a divergir más, no menos.

## La decisión: **núcleo portable copiado, no puerto ni monorepo**

No se unifican los *stacks* (no se puede: uno tiene build y el otro es dogma
sin build). Se unifica **lo que el personaje sabe y lo que el personaje hace**,
en un núcleo de **ESM puro, plano y sin una sola dependencia**:

- cero `import` a nada que no esté en este mismo directorio,
- cero React, cero three, cero zustand, cero `fetch`, cero DOM,
- funciones puras y datos — testeables sin navegador.

Eso lo hace consumible **por los dos lados sin adaptador**:

- `chagra/` lo importa como código fuente normal; Vite lo bundlea.
- `valle-guatoc/` lo importa como ESM nativo desde `./compai/`, sin build.

La copia la hace un script, nunca una persona:

```
node scripts/sync-compai-nucleo.mjs          # copia + reporta md5
node scripts/sync-compai-nucleo.mjs --check  # falla si hay deriva (para CI)
```

### Por qué copiar y no un paquete npm

`valle-guatoc/` **no tiene build ni `package.json`** — es un directorio que
`nginx` sirve tal cual. Un paquete npm exigiría darle un bundler, que es
justo la decisión que el proyecto ya rechazó. Un symlink no sobrevive al
`scp` archivo-por-archivo del despliegue. La copia verificada por md5 es la
única forma que respeta las dos restricciones a la vez.

### Por qué esto no vuelve a divergir

1. El núcleo es la **única** definición: `angelitaEstados.js`,
   `angelitaInteligencia.js` y `marco.js` **importan de aquí**, no copian.
2. `--check` compara md5 de origen y destino: la deriva es un error, no una
   sorpresa.
3. Todo archivo del núcleo es plano y sin imports externos — si alguien mete
   un `import` a React, el sync lo rechaza.

## Qué vive en el núcleo

| archivo | qué es | quién lo consumía antes |
|---|---|---|
| `datosFinca.js` | **el contrato de datos**: de los assets crudos al `{cultivos,especies,total}` que el comentarista espera | nadie — se le pasaba `{}` |
| `comentarista.js` | los 8 comentaristas de mundo y su regla de callar honesto | `angelitaInteligencia.js` (aquí vivía) |
| `gestos.js` | el repertorio de micro-gestos ociosos + el azar sin repetición | `angelitaEstados.js` (aquí vivía) |
| `elenco.js` | los 6 guías, sus tamaños y **una sola llave de compañero** | dos llaves distintas, una por stack |

## Lo que NO entra al núcleo, y por qué

- `angelitaVariedad.js` — llama al LLM (`llmRouter`, `apiService`). Su capa
  determinista sí podría bajar, pero mezclada con la de red no es portable.
- `creatureIdle.js` — es puro y podría entrar, pero hoy solo lo consume el 3D
  de R3F. Entra el día que `V/` tenga cuerpos 3D del compAI, no antes.
- `useAngelitaGuia.js` — es React por diseño (mide DOM con hooks).

## Contrato de datos (lo que un stack le debe al otro)

```js
import { inventarioCompai, datosDeMundo } from './compai/datosFinca.js';

const inv = inventarioCompai({ plants, animales, cosechas });
const datos = datosDeMundo('mis_matas', inv);   // → { cultivos: [{name,count}] }
comentarioDeMundo('mis_matas', datos);          // → texto grounded, en usted
```

`inventarioCompai` acepta assets en **cualquiera de las dos formas** que usa la
app (`asset.attributes.name` de farmOS, o `asset.name` plano), porque los dos
stacks los tienen distintos. Esa normalización es del núcleo, no de cada lado.
