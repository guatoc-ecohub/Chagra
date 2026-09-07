# Auditoría — tintas y comportamientos de los 7 compai (2026-09-03)

> Encabezados escritos ANTES de medir (regla de la casa). Carril Sonnet —
> medición sobre el repo + página que monta componentes React vivos. Repo:
> `chagra`, checkout limpio desde `origin/dev` (tip `23a6b7f29`), rama
> `claude/audit-tintas-comportamientos` (trabajado en un clon aislado en
> `/tmp/chagra-audit-tintas` por límite de worktrees del repo compartido).
>
> Fuentes de los 107 comportamientos: `Chagra-strategy/ops/GAP-COMPAI-107-2026-08-13.md`
> y `docs/compai/SSOT-COMPORTAMIENTOS-POR-BICHO.md`. Este segundo documento se usa
> como LISTA DE COMPORTAMIENTOS (sus 12 columnas), no como estado — estaba
> desactualizado en varios puntos verificados hoy contra código real (ver §4).
> No se rehízo el recuento de los 107 ítems uno a uno desde cero: eso ya lo hizo
> el operador en el GAP-107 (95🟢/5🟡/7🔴 al 13-ago, con 4 de los 5 "de mayor
> valor" ya cerrados desde entonces). Esta pasada se enfoca en lo que el
> operador pidió puntual: **qué archivo de cuerpo corre HOY por compai** y una
> actualización con evidencia de la matriz de 12 columnas del SSOT.

## 0. Regla de medición

Por lo QUE HACE el código, no por cómo se llama el archivo. Aprendizaje de la
medición anterior fallida (mencionada por el operador): buscar "Trazado" en el
nombre no basta — hay dos archivos `*Trazado.jsx` (Chivito, Luciérnaga) que
literalmente importan el componente compartido `TrazadoBase`, y otros dos
(`JaguarTrazado.jsx`, `ZariguyaTrazado.jsx`) que **NO** lo importan: son
auto-contenidos, con su propia máquina de estados y su propio reloj. Mismo
sufijo de nombre, dos arquitecturas distintas — confirmado leyendo el código,
no asumido por el nombre.

---

## 1. La primera pregunta — qué versión monta el registro HOY

Hay **tres registros distintos** en el repo, y cada uno puede montar un
archivo de cuerpo diferente para el mismo compai. Esta es la tabla que
responde "cuál de las 4-5 versiones corre hoy" — con la respuesta real: **no
hay una sola respuesta por compai, hay hasta tres**.

| Compai | ① Agente PWA (chat/FAB) — `ChagraAgentAvatarX.jsx` importa | ② Portal Valle 3D (handoff 2D→3D) — `compaiRegistry.js` | ③ Selector de avatar del USUARIO — `CREATURES` (`visual/creatures/index.js`) | ¿Las tres coinciden? |
|---|---|---|---|---|
| **Angelita** | `Angelita.jsx` → envuelve `AbejaAngelita.jsx` inline | `AbejaAngelita.jsx` | *(no aplica — Angelita es la base, no es una opción más del selector-fauna)* | única familia, sin fragmentación (ver §2) |
| **Jaguar** | `JaguarTrazado.jsx` | `JaguarTrazado.jsx` | `JaguarTrazado.jsx` | ✅ **SÍ — el único de los 6 totalmente unificado** |
| **Zarigüeya** | `ZariguyaTrazado.jsx` | `Zariguya.jsx` (RH_INK, la piel VIEJA) | `ZariguyaTrazado.jsx` | ⚠️ NO — el portal Valle 3D quedó en la piel anterior |
| **Oso (oso-baston)** | `OsoBaston.jsx` (RH_INK) | `OsoBaston.jsx` (RH_INK) | `OsoBastonLaminaViva.jsx` (familia Lámina-foto) | ⚠️ NO — agente y portal en una 3ra familia (Lámina) que el chat/valle no usan |
| **Luciérnaga** | `LuciernagaTrazado.jsx` | `Luciernaga.jsx` (RH_INK, la pieza VIEJA) | `LuciernagaTrazado.jsx` | ⚠️ NO — mismo patrón que zarigüeya |
| **Chivito(-punk)** | `ChivitoTrazado.jsx` | `ChivitoPunk.jsx` (familia arte-valle `:host`→CSS) | `ChivitoTrazado.jsx` | ⚠️ NO — el portal usa el rig del valle (F24), no el Trazado |
| **Guacamaya** | `GuacamayaCompai.jsx` (arte-valle) | `GuacamayaCompai.jsx` (arte-valle) | *(no está en `CREATURES`)* | ✅ coincide en las dos superficies que tiene |

**Lectura**: Jaguar es HOY el único de los 7 compai con un solo cuerpo en las
tres superficies. Zarigüeya, Luciérnaga y Chivito comparten el mismo patrón de
drift: el agente de chat y el selector de avatar del usuario ya migraron a
`*Trazado.jsx` (la tinta nueva), pero **el portal 2D→3D del valle se quedó en
la piel anterior** (RH_INK para zarigüeya/luciérnaga, arte-valle para
chivito) — nadie corrió el equivalente de `sync-compai-nucleo.mjs` para el
CUERPO, solo existe ese sincronizador para los METADATOS del elenco (ver GAP-107
§3). Oso es el caso más raro: ni agente ni portal migraron nunca — los dos
siguen en RH_INK — mientras que el selector de avatar de usuario SÍ migró,
pero a una familia distinta (Lámina), no a Trazado (no existe un
`OsoTrazado.jsx`).

---

## 2. Inventario completo de archivos de representación (TODOS, sin curar)

Cada archivo `.jsx` de cuerpo que existe hoy en `origin/dev`, vivo o muerto,
con evidencia de dónde se monta o por qué no se monta en ningún lado. LOC por
`wc -l` (solo el archivo componente; los payloads de datos que importa
—`pielTrazado.js`, `anatomia.js`, `capas.js`— no se cuentan aquí).

### Angelita/Abeja — 2 archivos, los dos vivos (la única sin fragmentar)

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `visual/agente/Angelita.jsx` | 723 | 🟢 vivo | Cuerpo del agente completo; `ChagraAgentAvatarAngelita.jsx` lo importa directo. |
| `visual/creatures/AbejaAngelita.jsx` | 588 | 🟢 vivo | Importado INLINE por `Angelita.jsx` (línea 4) + `PortalComponent` en `compaiRegistry.js` + `CREATURES['abeja-angelita']`. |

Angelita no tiene ni "Trazado" ni "Lámina" ni variante recoloreada — es la
única sin la fragmentación 4-5 que sí sufren los otros 6. Coherente con la
regla dura del operador ("Angelita es la base y NUNCA se cambia"): no hay
nada que reconciliar porque nunca se bifurcó.

### Jaguar — 4 archivos

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `Jaguar.jsx` (RH_INK) | 1043 | 🟡 vivo, pero solo de vitrina | Único consumidor real: `src/mockups/JaguarMonte3D.jsx` (5 usos). Barrel-exportado en `index.js` sin otro consumidor. NO es el agente ni el portal ni el selector. |
| `JaguarHuesos.jsx` | 170 | 🔴 muerto | Cero imports fuera de sí mismo/su test. Solo aparece en comentarios de `JaguarTrazado.jsx`/`ChagraAgentAvatarJaguar.jsx` como el predecesor ("mismas props, mismos estados") que `JaguarTrazado` reemplazó. |
| `JaguarLaminaViva.jsx` | 338 | 🔴 muerto, huérfano RECONOCIDO en el propio código | `src/visual/creatures/index.js:303`: *"`JaguarLaminaViva.jsx` NO se borra (huérfano GATED, por historia)"*. Reemplazada el 2026-08-24 (`ChagraAgentAvatarJaguar.jsx`, docstring: rechazada por el operador — "el pecho raster no aguanta el corte"). |
| `JaguarTrazado.jsx` | 206 (+ `jaguarTrazado/pielTrazado.js`) | 🟢 vivo, unificado | Agente PWA + Portal Valle 3D (`compaiRegistry.js:114`) + `CREATURES['jaguar']` (`index.js`). |

### Oso — 5 archivos (3 personajes distintos conviven bajo "oso")

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `OsoBaston.jsx` (RH_INK) | 966 | 🟢 vivo | Agente PWA (`ChagraAgentAvatarOsoBaston.jsx`) + Portal Valle 3D (`compaiRegistry.js:123`). |
| `OsoBastonLaminaViva.jsx` (Lámina) | 303 | 🟢 vivo, pero en otra superficie | Solo `CREATURES['oso-baston']` (`index.js:326`) — el selector de avatar del USUARIO, no el agente. |
| `OsoAndino.jsx` (RH_INK) | 344 | 🔴 muerto por decisión del operador | `index.js` comentario explícito: *"ARCHIVADOS por feos y NO se surfacean"*, fuera de `CREATURES` a propósito. |
| `OsoAnteojos.jsx` (RH_INK) | 411 | 🔴 muerto, mismo motivo | Igual que arriba. |
| `OsoGuardian.jsx` (RH_INK) | 722 | 🟢 vivo, pero es OTRO personaje | `CREATURES['oso-guardian']` + `SierraMonte3D.jsx` + `MetalSlugCampo.jsx`. **No es una representación de "oso-baston"**: es el "oso guardián" ambiental, no seleccionable como agente. Se cuenta aquí porque comparte especie (Tremarctos ornatus) y carpeta, pero es un personaje aparte por decisión del operador (documentado en `elenco.js`: *"'oso' (Oso andino genérico) NUNCA tuvo cuerpo propio en la PWA — decisión del operador: 'NO crees un oso nuevo'"*). |

### Zarigüeya — 4 archivos

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `Zariguya.jsx` (RH_INK) | 404 | 🟡 vivo, pero solo como Portal | `PortalComponent` en `compaiRegistry.js:104`. Ya NO es el agente PWA (eso lo hace Trazado) ni el selector de usuario. |
| `ZariguyaLaminaViva.jsx` (Lámina) | 317 | 🔴 muerto | Cero consumidores; ni siquiera barrel-exportada en `index.js`. |
| `ZariguyaGeminiLaminaViva.jsx` (Lámina Gemini-hero) | 448 | 🟢 vivo, un 4to lugar de montaje | Usada DENTRO de `ZariguyaCompaiEscena.jsx` (la coreografía del Valle 3D) — distinto del Portal (`Zariguya.jsx`). Es decir: la ESCENA (cómo se mueve en el mundo) y el PORTAL (el cuerpo que cruza el 2D→3D) usan dos archivos diferentes para la misma zarigüeya. |
| `ZariguyaTrazado.jsx` | 266 (+ `zariguyaTrazado/pielTrazado.js`) | 🟢 vivo | Agente PWA + `CREATURES['zariguya']`. |

### Luciérnaga — 4 archivos

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `Luciernaga.jsx` (RH_INK) | 415 | 🟡 vivo, pero solo como Portal + Escena | `PortalComponent` en `compaiRegistry.js:128` y usada dentro de `LuciernagaCompaiEscena.jsx`. |
| `LuciernagaLaminaViva.jsx` (Lámina) | 335 | 🔴 muerto | Cero consumidores, ni barrel-exportada. |
| `LuciernagaTinta.jsx` (RH_INK, "tinta nueva" fechada 2026-08-31) | 332 | 🔴 muerto HOY, pero es el trabajo más reciente de los 4 | Solo barrel-exportada (`index.js:223`), cero consumidor real. Docstring propio: personaje de pie, lápiz+libro, "TINTA NUEVA dibujada a mano... cero vtracer". Es una tercera dirección de arte para luciérnaga que nunca se cableó a ningún selector. |
| `LuciernagaTrazado.jsx` | 34 (+ `trazadoPayloads.js`) | 🟢 vivo | Agente PWA + `CREATURES['luciernaga']`. |

### Chivito — 4 archivos

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `ChivitoPunk.jsx` (arte-valle, rig F24 `:host`→light DOM) | 181 | 🟢 vivo | Portal Valle 3D (`compaiRegistry.js:132`) + Escena (`AvesCompaiEscena.jsx`, vía `ChivitoCompaiEscena`). |
| `ChivitoPunkLaminaViva.jsx` (Lámina) | 311 | 🔴 muerto | Cero consumidores, ni barrel-exportada. |
| `ChivitoTinta.jsx` (RH_INK, "tinta nueva" fechada 2026-08-31) | 422 | 🔴 muerto HOY, mismo patrón que LuciernagaTinta | Solo barrel-exportada (`index.js:221`), cero consumidor real. |
| `ChivitoTrazado.jsx` | 41 (+ `trazadoPayloads.js`) | 🟢 vivo | Agente PWA + `CREATURES['chivito-punk']`. |

### Guacamaya — 2 archivos (no 4-5; el operador no la incluyó en el conteo de fragmentación y el código confirma por qué)

| Archivo | LOC | Estado | Evidencia |
|---|---|---|---|
| `Guacamaya.jsx` | 126 | 🟢 vivo, pero es fauna decorativa | Solo `FaunaCalido.jsx` (billboard ambiental) — NO es el compai. |
| `GuacamayaCompai.jsx` (arte-valle) | 516 | 🟢 vivo, unificado | Agente PWA + Portal Valle 3D + Escena. No hay Trazado ni Lámina para guacamaya: nunca se bifurcó como los otros 5. |

**Resumen de archivos muertos encontrados (10 de ~29 archivos de cuerpo
auditados)**: `JaguarHuesos.jsx`, `JaguarLaminaViva.jsx`, `OsoAndino.jsx`,
`OsoAnteojos.jsx`, `ZariguyaLaminaViva.jsx`, `LuciernagaLaminaViva.jsx`,
`LuciernagaTinta.jsx`, `ChivitoPunkLaminaViva.jsx`, `ChivitoTinta.jsx` (9
confirmados sin ningún consumidor real; `OsoAndino`/`OsoAnteojos` muertos por
decisión explícita del operador, el resto por reemplazo silencioso sin
limpieza).

---

## 3. Familias de tinta

**Corrección/aclaración importante antes de la tabla**: existen DOS sistemas
que comparten la palabra "rubber-hose" y **NO son el mismo código**. Mezclarlos
sería exactamente el tipo de error de nombre contra el que advirtió el
operador.

- **"Rubber-hose RECOLOREADA"** (`public/valle/compai/rigs/*.rig.svg`,
  `onboarding.js`, `build-piel-kart.mjs`) — **ARCHIVADA, PROHIBIDO TOCAR** por
  decisión del operador. Este árbol **no existe en el repo `chagra`**: es
  generado/sincronizado desde `~/demos/3d` y está gitignoreado
  (`.gitignore:98`, `/public/valle/`). Confirmado con `ls` vacío y grep del
  `.gitignore` en este mismo checkout.
- **`_rubberhose.jsx` / `RH_INK`** (`src/visual/creatures/`) — el kit de
  dibujo COMPARTIDO (ojos, boca/`BocaVisema`, mejillas, el color de tinta
  `RH_INK`) que usa el arte HECHO A MANO de cuerpo completo. **Esta familia
  está ACTIVA, no archivada** — la propia Angelita (que nunca se toca) la
  importa directo (`Angelita.jsx:5`). Comparte nombre con la de arriba por
  casualidad histórica; son sistemas distintos, en repos distintos.

Con esa aclaración, las familias de tinta encontradas en `chagra/src` son:

| Familia | Quién la usa (de los 7 compai/reps relevantes) | Rasgo distintivo |
|---|---|---|
| **A — RH_INK / `_rubberhose.jsx`** (31 archivos en total, cifra ya medida por el operador) | `AbejaAngelita`, `Angelita` (vía AbejaAngelita), `Jaguar.jsx`, `OsoBaston.jsx`, `OsoAndino.jsx`, `OsoAnteojos.jsx`, `OsoGuardian.jsx`, `Zariguya.jsx`, `Luciernaga.jsx`, `ChivitoTinta.jsx`, `LuciernagaTinta.jsx` | Dibujo vectorial a mano, kit compartido de piezas de cara/boca, ~20 archivos más de fauna ambiental. |
| **B — `TrazadoBase`** (`trazadoBase.jsx`) | `ChivitoTrazado.jsx`, `LuciernagaTrazado.jsx` (literalmente, importan el componente) | Contenedor genérico: SVG auto-trazado (vtracer/potrace) + clip-region; **solo acepta la prop `animated`** (código citado abajo). |
| **B' — Trazado auto-contenido** (misma técnica, otra arquitectura) | `JaguarTrazado.jsx`, `ZariguyaTrazado.jsx` (NO importan `TrazadoBase`) | Su propio `pielTrazado.js` de clip-regiones, su propio `ESTADO_CANON` (con más estados, incluido `caminando`), su propio reloj 70/30 (`TRAMO_ACTUANDO`), envueltos en `CompaiAgente.jsx`/`COMPAI_ESPECIES`. **El operador los agrupó bajo "TrazadoBase" en el brief — en código son una familia hermana, no la misma.** |
| **C — arte-valle (`:host` CSS→light DOM)** | `GuacamayaCompai.jsx`, `ChivitoPunk.jsx` | Reusa los rigs F24 (SVG+CSS) del valle, con el fix `hostALigero()` (2026-08-21/27) que reescribe selectores `:host` a planos para que funcionen fuera de Shadow DOM. |
| **D — Lámina-foto** (parallax PNG, cero SVG vectorial) | `JaguarLaminaViva`, `OsoBastonLaminaViva`, `ZariguyaLaminaViva`, `ZariguyaGeminiLaminaViva`, `LuciernagaLaminaViva`, `ChivitoPunkLaminaViva` | Recorta una foto real por capas rígidas que rotan desde un pivote (`anatomia.js`+`capas.js`). Cero three.js, cero geometría 3D pese al nombre "viva 3D". |

Evidencia literal de `TrazadoBase` (familia B, la que de verdad limita a
`animated`):

```js
// src/visual/creatures/trazadoBase.jsx
export function TrazadoBase({
  markup, creature, size, className = '', title,
  animated = true, data = {}, style, onClick, onDoubleClick,
}) { /* ... */ }
```

`ChivitoTrazado.jsx` y `LuciernagaTrazado.jsx` SÍ agregan props propias por
encima de `TrazadoBase` (`actuando`/`punk` para Chivito, `linterna` para
Luciérnaga) — pero ninguna de las dos acepta un `estado` genérico como
`JaguarTrazado`/`ZariguyaTrazado` sí aceptan.

---

## 4. Correcciones al SSOT existente (`docs/compai/SSOT-COMPORTAMIENTOS-POR-BICHO.md`)

El propio operador ya advirtió que este documento estaba desactualizado en un
punto ("guacamaya y chivito caen a Angelita en 3D — hoy falso"). Verificado, y
se encontraron más puntos:

1. **La columna (6) "transición 2D→3D" está desactualizada para 5 de 7
   filas, no solo guacamaya/chivito.** El SSOT (2026-08-27) decía: completa
   solo angelita+zarigüeya; parcial jaguar/oso-baston/luciérnaga
   (`PortalComponent: null`); ninguna guacamaya/chivito-punk
   (`EscenaComponent: null`). **Leído `compaiRegistry.js` completo hoy
   (líneas 87-133): las 7 filas tienen `EscenaComponent` Y `PortalComponent`
   no-nulos** (el único `EscenaComponent: null` es Angelita, y es por diseño —
   su escena nativa vive en `useEntradaAbeja.jsx`, no es un hueco). Es decir:
   **hoy nadie cae a Angelita por defecto** — el "roster a 7 con escena, portal
   y presencia propios" que el comentario del propio `compaiRegistry.js`
   promete ya está cumplido para los 7. Matiz importante: "completo" aquí
   significa "tiene componente propio registrado", NO que el salto de tinta
   sea invisible — zarigüeya/luciérnaga/chivito-punk sí tienen Portal propio,
   pero ese Portal es de una familia de tinta DISTINTA a la que el mismo
   compai muestra como agente de chat (ver §1) — el salto visual sigue
   existiendo, solo que ya no es "salta a Angelita", es "salta a su propio
   cuerpo con otra piel".
2. **`AngelitaSalida.jsx` YA EXISTE** (el SSOT decía "no existe en `dev`").
   El archivo está en `src/visual/agente/AngelitaSalida.jsx` con un componente
   `AngelitaSalida` real y exportado. Pero **sigue sin estar montada en
   ningún lado** — el único import cruzado es `AngelitaEntrada.jsx` tomando
   prestado un helper menor (`MotasMisticas`), no el componente
   `AngelitaSalida` en sí; el único `<AngelitaSalida .../>` que aparece en
   todo el repo está dentro de su propio comentario de ejemplo de uso. El
   hallazgo FUNCIONAL del SSOT (Angelita no tiene salida épica real en
   pantalla) se mantiene — cambió el hecho subyacente (el archivo sí existe),
   no la conclusión.
3. **Jaguar ya NO usa `JaguarLaminaViva`** para nada real (el SSOT la
   describía como *"es el avatar PWA real"*). Desde el 2026-08-24
   (`ChagraAgentAvatarJaguar.jsx`, ver docstring) el agente usa
   `JaguarTrazado`; `JaguarLaminaViva.jsx` quedó huérfana y el propio
   `index.js` lo reconoce por escrito (§2).
4. **Los 5-8 ítems del GAP-107 §4 ya cerrados que el SSOT no reflejaba
   explícitamente**: `#78` (enso/cosechaReciente reales), `#60`
   (precalentar variantes), `#58` (cadencia adaptativa del husmeo) — cerrados
   desde `1e4a764b4` según la propia corrección del 13-ago del GAP-107; no
   son parte de la matriz de 12 columnas del SSOT pero condicionan cuánta
   confianza dar al resto del documento si no se re-verifica seguido.

Puntos del SSOT que se verificaron y siguen EXACTOS hoy (sin cambios):
`comportamientos/` solo consumida por `AbejaAngelita`/`AbejaTransicion`; el
hallazgo de `oso-baston` con Lámina wireada al selector de usuario, no al
agente; los tres osos archivados/aparte (`oso-andino`, `oso-anteojos`,
`oso-guardian`).

---

## 5. Cableado real: `caminando`, `comportamientos/`, `TrazadoBase`

Confirmación puntual de lo que el operador pidió confirmar, con cita exacta:

**`comportamientos/`** (`aplicarComportamientos` + 19 helpers de gesto en
`clima.js`, `gestos.js`, `idle.js`, `lipsync.js`, `poder.js`, `politica.js`,
`rubberhose.js`, `transicion.js`): grep repo-wide de
`aplicarComportamientos` da exactamente 4 archivos —
`comportamientos/index.js` (donde se define), `visual/creatures/index.js`
(re-exporta, no consume), `AbejaAngelita.jsx` y `AbejaTransicion.jsx`.
**Confirmado: solo estas dos lo consumen de verdad.**

**`TrazadoBase` solo acepta `animated`**: confirmado literal (código citado en
§3). Pero el alcance real de esa limitación es más angosto de lo que sugiere
agrupar "los cuatro `*Trazado.jsx`" en una sola familia: **solo aplica a
Chivito y Luciérnaga** (los dos que literalmente pasan por `TrazadoBase`).
Jaguar y Zarigüeya, aunque también se llaman `*Trazado.jsx`, tienen su propio
`ESTADO_CANON` con `caminando` mapeado a un ciclo de marcha real — no heredan
esa limitación.

**El estado `caminando` que calcula `AgentFab.jsx:299`** (`comportamiento.caminando && estadoBase==='acompana' ? 'caminando' : estadoBase`) SÍ llega hasta el
cuerpo para 4 de los 7:

| Compai | Pose real por `caminando` | Evidencia |
|---|---|---|
| Angelita | `vuela` (aire, correcto — la abeja no camina) | `compaiEspecies.js` `POSES_AIRE` |
| Jaguar | `camina` (ciclo de marcha real) | `ESTADO_CANON.caminando` en `JaguarTrazado.jsx:23`, wrapper reenvía `estado={estadoEfectivo}` |
| Zarigüeya | `camina` (ciclo de marcha real) | ídem, `ZariguyaTrazado.jsx` |
| Oso-baston | `camina` (ciclo de marcha real, RH_INK) | `OsoBaston.jsx:901` `caminando: 'camina'`, wrapper reenvía `estado` |

Para los otros 3, el prop se calcula y se **descarta en el camino**:

- **Luciérnaga**: `ChagraAgentAvatarLuciernaga.jsx` no acepta un prop de pose,
  solo `linterna` (derivado de si el estado está en
  `ESTADOS_LINTERNA_FUERTE` — que NO incluye `caminando`). El `data-estado`
  llega al DOM como atributo (vía `...rest` → `TrazadoBase.data`), pero
  `trazadoCreature.css` no tiene ninguna regla `[data-estado]` que reaccione
  — grep vacío, confirmado.
- **Chivito-punk**: su wrapper ni siquiera mapea `caminando` — solo revisa si
  el estado está en una lista de "actuando" (`speaking`/`respondiendo`/etc.,
  sin `caminando`) para decidir la piel punk. Cero efecto visual.
- **Guacamaya**: `GuacamayaCompai.jsx` sí tiene su propio mapa interno
  (`caminando: 'idle'`, línea 187) — decide EXPLÍCITAMENTE quedarse en idle
  en vez de animar una marcha/vuelo propio.

Además, a nivel de especie (`compaiEspecies.js`), `luciernaga`,
`chivito-punk` y `guacamaya` están declarados `medio:'aire'` con
`caminando:'vuela'` — es decir, `CompaiAgente.jsx` SÍ calcula
`pose='vuela'` para los tres cuando el compai deambula. Pero ese `pose` nunca
llega a ninguno de los tres adaptadores: ninguno de los tres wrappers
(`ChagraAgentAvatarLuciernaga/ChivitoPunk/Guacamaya.jsx`) declara un prop
`pose` en su firma, así que React lo recibe y lo descarta en silencio. **Se
calcula y se tira** — coincide exactamente con el hallazgo ya documentado por
el operador ("patinaje del compai: el estado que nunca se pasa"), ahora con
evidencia archivo:línea por cada uno de los 3 casos.

**Conclusión de la sección**: de los 7, **4 reaccionan de verdad al roam**
(angelita, jaguar, zarigüeya, oso-baston) y **3 no reaccionan en absoluto**
(luciérnaga, chivito-punk, guacamaya) — pese a que los 3 tienen el dato
correcto calculado más arriba en la cadena.

---

## 6. Matriz de comportamientos (condensación de los 107) — ranking

Se parte de la matriz de 12 columnas del SSOT (que ya es una condensación por
categorías de los ítems relevantes del GAP-107, no un mapeo literal 1:1) y se
corrige con lo verificado en esta pasada (§4). **No se re-verificó cada una
de las 84 celdas (7×12) desde cero en este pase** — se corrigieron las que
esta auditoría tocó directamente (columna 6 para las 7 filas) y se dejan
heredadas del SSOT 2026-08-27 las demás, marcadas como tal.

Puntaje: ✅=1, 🔶=0.5, ❌/N-D=0. Columna (6) corregida hoy para las 7 filas.
Se agrega una columna (13) nueva — **caminando/roam con reacción visual
real** — porque es un hallazgo de esta pasada, no estaba en el SSOT original.

| Compai | (1) Idle | (2) Habla | (3) Entrada | (4) Salida | (5) Místico | (6) 2D→3D* | (7) Gestos | (8) Estados (10) | (9) Gafas | (10) Clima visual | (11) Lámina 3D real | (12) Presencia PWA | (13) Caminando visual* | **Puntaje /13** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Angelita** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ 10/10 | ✅ | ✅ | ❌ | ✅ | ✅ | **9.0** |
| **Jaguar** | ✅ | ✅ | 🔶 | 🔶 | ✅ | ✅* | ✅ | ✅ | ❌ | ✅ | ❌ (es Trazado 2D, no 3D real) | ✅ | ✅ | **8.5** |
| **Oso-baston** | ✅ | ✅ | 🔶 | 🔶 | ❌ | ✅* | ✅ | ✅ | ❌ | 🔶 (solo piel, sin ropa) | 🔶 (Lámina existe, no wireada al agente) | ✅ | ✅ | **7.5** |
| **Zarigüeya** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* (con salto de tinta) | 🔶 | ✅ | ❌ | 🔶 | 🔶 (Lámina 2D existe, wireada a avatar-usuario) | ✅ | ❌ | **7.0** |
| **Luciérnaga** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅* (con salto de tinta) | ✅ | ✅ | ❌ | 🔶 | 🔶 (ídem) | ✅ | ❌ | **7.0** |
| **Guacamaya** | ✅ | ✅ | ❌→🔶** | ❌→🔶** | ❌ | ✅* | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | **6.5** |
| **Chivito-punk** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅* (con salto de familia) | ✅ | ✅ | ❌ | ❌ | 🔶 (ídem Lámina sin usar) | ✅ | ❌ | **6.0** |

\* Columna (6) corregida en esta pasada — ver §4.1: los 7 tienen
`EscenaComponent`+`PortalComponent` propios hoy; se marca ✅ para las 7,
con la nota de "salto de tinta" para las 3 que cambian de familia entre
agente y portal.

\** Guacamaya SÍ tiene `GuacamayaEntrada.jsx`/`GuacamayaSalida.jsx` (con
tests propios) — el SSOT no las tenía porque no existían el 27-ago; existen
hoy pero no se verificó en esta pasada si están montadas en la app real o
solo en mockup (`GuacamayaViva.jsx`) — por eso quedan en 🔶, no en ✅, y se
listan en §8 como pendiente de confirmar.

**Lectura del ranking**: Jaguar es el más avanzado de los 6 no-angelita (y el
único totalmente unificado en tinta, §1) casi empatado con Oso-baston en
puntaje bruto, pero Oso arrastra la peor fragmentación de tinta de los 7 (una
familia archivada como agente/portal, una tercera familia sin usar como
Lámina). Chivito-punk queda de último — es el que menos columnas cierra Y el
que tiene la mayor pieza de trabajo reciente sin cablear (`ChivitoTinta.jsx`,
2026-08-31, muerta).

---

## 7. La página — galería viva

`/tmp/galeria-compais/` (proyecto Vite hermano, mismo patrón que
`galeria-angelitas/` que ya sirve `angelitas.guatoc.co`: `roster.js` con la
metadata, `CardFrame`+`ErrorBoundary` para que un componente que no monte
standalone lo diga en vez de reventar la página, alias `@chagra` que importa
los componentes TAL CUAL — cero copias). Vive en `/tmp` y no en
`~/Workspace/` porque el guard de aislamiento del repo compartido bloqueó
escribir ahí durante esta sesión (worktrees del repo en su límite); el alias
`@chagra` apunta al clon aislado `/tmp/chagra-audit-tintas` (mismo
`origin/dev`, tip `23a6b7f29`). `vite.config.js` sirve además el `public/`
real de chagra (`publicDir`) para que la familia Lámina-foto cargue sus PNG
reales (`/compai/laminas/*.png`) sin copiar ni un asset.

**Servida SOLO en local — `http://127.0.0.1:5199/` — no se publicó a ningún
dominio.**

Contenido: una fila "El agente HOY" con los 7 `ChagraAgentAvatarX.jsx`
exactos que monta `AgentAvatarSelector.jsx` hoy, y 7 secciones (una por
compai) con TODAS sus representaciones montadas vivas — vivas o muertas por
igual, cada una con su badge (vivo/muerto), su familia de tinta, dónde vive
hoy o por qué no vive en ningún lado, y una fila de chips marcando las tres
superficies (agente/portal/selector) con ⚠️ cuando no coinciden. 32 tarjetas
en total (7 "hoy" + 25 archivos de cuerpo del inventario de §2).

**Verificación visual (regla de la casa — mirar crítico, no certificar)**:
capturado headed vía `shot3d` (GPU real, `~/demos/3d/_gate/herramientas/gate-x-estado.sh`
confirmó X vivo antes de intentarlo). Primera pasada mostró 2 problemas
reales, ambos corregidos:
1. Warning de React "non-boolean attribute" (`actuando`/`punk` filtrando a
   props genéricas que no los esperaban) — corregido acotando esas props a
   los 3 componentes que sí las usan (`EXTRA` en `App.jsx`).
2. `JaguarLaminaViva.jsx`/`OsoBastonLaminaViva.jsx` montaban en blanco (caja
   vacía) — causa: sus PNG (`/compai/laminas/*.png`) no resolvían contra el
   servidor de la galería. Corregido con `publicDir` (arriba).

Tras la corrección: captura de página completa (1400×9000, `--wait-ms 6000`)
con **0 errores de página, 1 solo error de consola (favicon 404, cosmético),
0 fallos de red**. Se miró CRÍTICO por regiones (recortada en franjas de
1000px con `imagemagick`, cada una inspeccionada) — no un solo zoom de una
región: las 7 secciones + la fila "hoy" se revisaron una por una. Confirmado
a ojo: los 32 cuerpos rendieron con arte reconocible y distinto entre
familias (la comparación lado a lado de zarigüeya/luciérnaga —RH_INK vs
Lámina vs Lámina-Gemini vs Trazado— hace visualmente obvio el hallazgo de
fragmentación de §1/§2, no hace falta leer código para verlo).

Descripción independiente con el juez barato (regla de la casa: nunca un
modelo caro para "qué ves aquí"; `judge-vl <img> "<pregunta>" qwen3-vl:8b`,
describe — no certifica): confirmó que las tarjetas muestran "imágenes de
animales... bien renderizadas... sin errores obvios (imágenes faltantes o
texto ilegible)".

**4 capturas enviadas al Telegram del operador** (overview + Jaguar/Oso +
Zarigüeya + Luciérnaga) — el operador juzga, esta auditoría no certifica.

---

## 8. Qué quedó SIN medir (honesto)

- **No se re-hizo el recuento de los 107 ítems del GAP-107 uno por uno**
  contra código — se heredó el 95/5/7 del 13-ago y solo se tocaron los 5
  ítems de mayor valor que el propio GAP-107 ya marcó cerrados en su
  corrección del mismo día (§6 de ese documento). Si alguien necesita el
  recuento fino de los 12 restantes (🟡/🔴), es trabajo aparte.
- **Las 84 celdas de la matriz de §6 NO se re-verificaron todas contra
  código en esta pasada** — solo la columna (6) para las 7 filas y la
  columna (13) nueva. El resto se hereda del SSOT del 27-ago (ya verificado
  en su momento, pero sin re-confirmar hoy). Marcado explícitamente en la
  tabla.
- **`GuacamayaEntrada.jsx`/`GuacamayaSalida.jsx`** (encontradas en el
  inventario de archivos, con tests propios) no se verificó si están
  montadas en una pantalla real de la app o solo en el mockup
  `GuacamayaViva.jsx` — quedó en 🔶 por precaución, no confirmado.
  Igual `AngelitaEntrada.jsx` (¿corre en el arranque real o solo en el
  mockup `/mockups/angelita-viva`?) — el SSOT decía "solo mockup" en
  agosto; no se re-verificó hoy.
- **Los estados de "gafas"** (columna 9): se heredó ❌ para los 6 no-angelita
  sin re-verificar si algo cambió desde agosto.
- **Comparación de las 20 fauna ambiental** que también usan RH_INK
  (Ardilla, Beagle, Borugo, Colibrí, Cóndor, Crisopa, Dálmata, Danta,
  Gallina, Morrocoy, Perezoso, Rana Andina, Sírfido, Trichogramma,
  MaizCompai, EntFrailejon, BarbuditoParamo) — fuera de alcance a propósito:
  el operador pidió los 7 compai seleccionables, no toda la fauna del
  registro `CREATURES`.
- **No se abrió la app real (chagra-dev.guatoc.co) para confirmar visualmente
  cada hallazgo con captura de la app en vivo** — la galería (§7) monta los
  MISMOS componentes que la app real importa (mismo alias `@chagra` que
  `galeria-angelitas`), pero no es literalmente un screenshot de la PWA
  corriendo con su estado real de Zustand/backend.
