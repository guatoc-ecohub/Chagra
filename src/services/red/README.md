# services/red — Backend del MVP de la RED humana (campesino ↔ campesino)

Capa de **datos + servicios + tipos** de la red de pares de Chagra. **No hay
UI aquí** — la "cara" la construye aparte quien consuma estos servicios.

## La idea (del DR de red groundeado)

**La puerta es el mercado.** Cada trato del mercado ya codifica quién cultiva
qué, en qué vereda, con qué fiabilidad entregó y qué calidad calificó el
comprador. Por eso el **grafo social** y la **reputación** NO se piden ni se
votan: son **subproducto** de transacciones que ya ocurren. Esto evita el
_cold-start_ y sirve desde un piloto chico (~15 productores).

Dos capacidades núcleo:

1. **mercado → grafo + reputación** (`redReputation.js`): convierte los tratos
   en aristas del grafo (productor–cultivo–vereda) + reputación **ganada**
   (fiabilidad de entrega + calidad), anclada a hechos verificables.
2. **"Pregúntele al vecino" + ruteo** (`redMatchmaking.js`): dado un problema
   (cultivo × vereda × síntoma), encuentra al par competente y cercano (que
   **demostró** éxito con ese cultivo) y decide si enrutarle la duda.

## Local-first / anti-extractivo (inviolable)

El dato crudo vive en el dispositivo por default. La compartición es **opt-in de
3 niveles** (`redSharing.js`):

| Nivel | Nombre | Qué hace |
|------:|--------|----------|
| 1 | `PRIVADO` | Solo en el dispositivo. **Nunca** entra al grafo ni al matchmaking. Default seguro. |
| 2 | `PARES` | Alimenta grafo + reputación + "pregúntele al vecino". **El MVP opera en 1–2.** |
| 3 | `CANONIZADO` | Un sabedor lo vuelve conocimiento comunitario. Se **modela** aunque el MVP no lo ejecute todavía. |

`redSharing` es la **única compuerta**: los servicios de grafo/reputación jamás
leen la lista cruda, solo `filterShareable`. `redactForPeers` recorta lo que los
pares no necesitan (identidad del comprador, referencias internas, texto libre).
El nivel 3 es el **puente** con el grafo `DR-SOCIAL-1`
(`src/data/social-age-schema.json`): `Caso —SE_VUELVE→ ConocimientoComunitario`.

Nada se monetiza en la capa de pares — **el mercado es la única superficie de
dinero**. El contacto con un vecino reusa el canal directo del mercado
(WhatsApp) y **solo** si el par expuso un teléfono público (opt-in); sin ese
consentimiento, el ruteo entrega la intención + el mensaje sugerido, nunca un
número.

## Cómo se conecta

- **Al mercado** (`marketplaceService.js`, `db/marketplaceOfertas.js`): un trato
  (`RedTransaction`) referencia la oferta que lo originó. `redService.buildTrato`
  mapea una oferta del mercado + el desenlace a un trato. `abrirCanal` reusa
  `construirContacto` del mercado.
- **A la identidad** (`operatorIdentityService.js`): el `productorHash` es el id
  **pseudonimizado** del operador (HMAC, Ley 1581 Habeas Data). La reputación se
  ancla a ese hash, no a un nombre.
- **Al grafo** (`grafoRelations.js`, `src/data/social-age-schema.json`): el
  grafo social de la red es complementario al grafo de especies. Para resolver
  un **síntoma → cultivo** en el ruteo, el caller puede usar
  `grafoRelations.resolvePestSynonym` antes de llamar a `preguntarAlVecino`.
- **Al agente**: `preguntarAlVecino(problema, opts)` es el punto de enganche —
  el asistente llama esto cuando **no sabe** (`agentConfident:false`) o cuando la
  duda es **local-específica**, y usa la decisión para ofrecer el contacto.

## Modelo de reputación (honesto)

- **Fiabilidad**: media bayesiana con prior neutral `Beta(1,1)` →
  `(entregas + 1) / (confirmadas + 2)`. Con `n` chico tiende a 0.5 (desconocida),
  no a 1.0. Entrega parcial pesa 0.5.
- **Calidad**: promedio de calificaciones 1..5 presentes (o `null`, nunca
  inventa), normalizado a 0..1.
- **Confianza por volumen**: `n / (n + 3)` — pondera el ranking sin tapar a un
  vecino nuevo prometedor.
- **Recencia (supuesto de Markov)**: decaimiento exponencial con media vida
  configurable, porque la conducta de entrega **no es estacionaria** (cambio de
  tierra, práctica o mala cosecha). Ver el docstring de `redReputation.js`.
- **Nivel** (semáforo humano, espeja `semaforoConfianza` pero para un actor):
  `nuevo` (sin historial) · `verde` · `ámbar` · `rojo`.

## Persistencia

`db/redTransactions.js` (store `red_transactions`, ChagraDB **v27**) — CRUD
offline-first, append-only (fuente de verdad). Grafo y reputación son **cache
reconstruible** (ADR-019). Mismo patrón que `marketplaceOfertas.js`.

## API pública (barrel `index.js`)

```js
import {
  // orquestación (async, con I/O)
  registrarTrato, cargarReputaciones, cargarGrafoSocial, preguntarAlVecino,
  abrirCanal, buildTrato,
  // puro
  computeReputacion, computeAllReputaciones, buildSocialGraph,
  findCompetentPeers, routeQuestion, buildMensajeVecino,
  // compuerta anti-extractiva
  isShareable, filterShareable, redactForPeers, withDefaultShareLevel,
  // vocabulario
  SHARE_LEVEL, ENTREGA, CONFIRMADO_POR, NIVEL_REPUTACION,
} from '@/services/red';
```

## Qué queda para la "cara" (fable)

Este módulo **no** trae UI. Falta construir (consumiendo lo de arriba):

1. **Cierre de trato desde el mercado**: al contactar/cerrar una oferta, un
   paso opt-in ("¿se concretó el negocio?") que llame a `registrarTrato` con el
   desenlace de entrega + una calificación de calidad. Es el gesto mínimo que
   alimenta toda la red.
2. **Control de compartición (3 niveles)**: el switch `PRIVADO / PARES /
   CANONIZADO` por trato, con la copy de `SHARE_LEVEL_COPY`.
3. **Vista "pregúntele al vecino"**: enganchar `preguntarAlVecino` en el agente
   y el mercado; mostrar el par sugerido (nivel + cercanía) y el botón que abre
   el canal (`abrirCanal`) cuando hay contacto público.
4. **Un `useRedStore` (Zustand)**: fachada reactiva que hidrate desde
   `cargarReputaciones` / `cargarGrafoSocial` y exponga las acciones (mismo
   patrón que `useLoteStore` / `useCosechaStore`).
5. **Tarjeta de reputación** del productor por cultivo (semáforo + fiabilidad +
   calidad + n), reusando el idioma visual del `SemaforoConfianza`.
