# Inventario del Toolkit 3D — congruencia entre escenas

**Fecha:** 2026-07-16 · **Rama base:** `app-3d` · **Rama:** `feat/toolkit-3d-congruencia`

Objetivo: que las ~15 escenas 3D (`src/visual/mundo3d/**` + `src/mockups/*3D*`) se
vean como **un solo juego de Switch**. Hoy no: cada escena reinventó terreno,
niebla, luz, instancing y materiales. Este documento inventaria lo que existe,
dónde está **duplicado**, **qué escena usa qué**, y los **GAPS**. La Fase 2
(el módulo `src/visual/mundo3d/kit/`) ya consolida lo señalado aquí.

---

## 1. El hallazgo central: DOS familias de escena

| Familia | Andamiaje | Atmósfera | Ciclo día | Sombra contacto | Cámara | Veredicto |
|---|---|---|---|---|---|---|
| **Dioramas** (`escenas/*`) | `EscenaBase3D` | hereda `atmosferaMadre` (mezcla 60% → hora madre) | **sí** (`useCicloDia`) | **sí** (`SombraContacto`) | `CamaraDirector` (establishing shot) | **coherente** |
| **Mundos vivos** (`bosque/`, `cacao/`, `cafetal/`, `papa/`, `sierra/`) | `<Canvas>` propio | **cielo estático clavado** por escena | **no** | círculo plano a mano | `OrbitControls` pelón | **dispar** |

La familia diorama ya está congruente porque **todo** (Canvas, luz, atmósfera de
la hora, cámara, sombras) lo hereda de `EscenaBase3D`. La familia "mundo vivo"
monta su propio Canvas y **reinventa cada pieza** — por eso se ven de otro juego.
Cerrar esta brecha es el 80% de la congruencia.

Ejemplo (`bosque/EscenaBosqueVivo.jsx`): define su propio `PARAMO` gris, su
`rng` local, su niebla `[9,34]` fija, su sombra de contacto como `circleGeometry`
plano, luces `directionalLight` estáticas — **no** cambia con la hora ni conversa
con el valle. `cafetal/EscenaCafetalVivo.jsx` idem con su `TEMPLADO`.

---

## 2. Inventario por dimensión

### 2.1 Terreno / heightfield
- **Patrón repetido:** doble bucle nx×nz → `y = altura(wx,wz)` → color por vértice
  (pasto/tierra/mantillo según altura+ruido) → índices → `toNonIndexed()` si
  facetado → `computeVertexNormals`.
- **Reimplementado en:** `cafetal/EscenaCafetalVivo.jsx` (`construirLadera`),
  `cacao/EscenaCacaoVivo.jsx`, `papa/EscenaPapaVivo.jsx`, y mockups
  (`MundoCafe3D`, `MundoParamo3D`, `ValleNoche3D`, `MomentoVentaMercado3D`,
  `valle/Valle3D.jsx`).
- Las funciones de altura propias (`alturaLadera`, `alturaTerreno`) SÍ son
  identidad de cada escena y deben quedarse; lo duplicado es el **andamiaje**.
- **→ kit:** `construirTerreno({ancho, fondo, seg, altura, pintar, plano})`.

### 2.2 Atmósfera (cielo / niebla / luz)
- **Canónico:** `atmosferaMadre.js` (`ATMOSFERA`, `CIELOS` por familia,
  `mezclarCielo` receta 60%→madre, `BLOOM`, `PALETA`) + `cielosHoraData.js`
  (`CIELOS_HORA` por franja, `presetDeHora`, `franjaDeHoraDecimal`).
- `EscenaBase3D` los aplica (color de fondo + fog + hemisphere + ambient + sol de
  la franja + relleno frío + estrellas). **Los mundos vivos NO** — clavan un
  objeto de cielo local (`PARAMO`, `TEMPLADO`, etc.) estático.
- **→ kit:** `atmosferaDeFamilia(familia, franja)` + `useAtmosferaMundo(...)` +
  `<AtmosferaMundo>` (drop-in que replica el bloque de `EscenaBase3D`).

### 2.3 Ciclo de día — `useCicloDia.js`
- Reloj compartido, three-free, con override `?ciclo=demo|<hora>`.
- **Usan:** `EscenaBase3D`, `mockups/EntradaValle3D`, `mockups/CaraProd3D`,
  `bosque/FaunaBosque`. **NO usan:** las 4 escenas de mundo vivo (su Canvas
  propio) → sus mundos no amanecen/anochecen.
- **→ kit:** re-exportado; `useAtmosferaMundo` lo envuelve para la familia viva.

### 2.4 Instancing / scatter + fusión segura
- **`fusionarSeguro` / merge anti-null-silencioso — reimplementado en 7 archivos:**
  | Archivo | Nombre | Nota |
  |---|---|---|
  | `bosque/sombreadoVegetal.js` | `fusionarSeguro` | **CANÓNICO** — desindexa + valida atributos + **truena** + `computeVertexNormals` |
  | `finca/fincaRealista.geom.js` | `fusionarHato` | variante que NO recalcula normales (preserva suaves) + borra `uv` |
  | `bosque/floraParamo.geom.js` | `fusionar` | con `dispose()`, sin validar atributos |
  | `cafetal/floraCafetal.geom.js` | inline | copia local |
  | `papa/floraPapa.geom.js` | inline | copia local |
  | `cacao/floraCacao.geom.js` | inline | copia local |
  | `vitrina/miradorAndino.geom.js` | inline | copia local |
  Es la mordida documentada (`mergeGeometries` mezcla indexada+no-indexada →
  **null en silencio** → especie invisible sin error). Ya apagó especies 3 veces.
- **Scatter:** `floraParamo.geom.js` tiene un `sembrar`/`distribucionFlora`
  genérico y bueno, pero **privado**. cacao/cafetal/papa reparten a mano.
- **InstancedMesh:** cada `Flora*.jsx` arma su instanciado (1 draw-call/especie);
  patrón sano pero no factorizado.
- **→ kit:** `fusionarSeguro` (re-export del canónico, **única fusión permitida**)
  + `sembrarEnAnillo(...)` (generaliza el `sembrar` de floraParamo).

### 2.5 Ruido y PRNG (el azar determinista)
- **`ruido(wx,wz)` de terreno — 6 copias byte-a-byte** (`cafetal/EscenaCafetalVivo`
  + `cafetal/floraCafetal.geom`, `cacao/EscenaCacaoVivo` + `cacao/floraCacao.geom`,
  `papa/EscenaPapaVivo` + `papa/floraPapa.geom`) + 1 variante (`sierra/…`) +
  copias en mockups (`MundoCafe3D`, `MundoParamo3D`, `ValleNoche3D`,
  `MomentoVentaMercado3D`).
- **`rng(seed)` LCG — ~12 copias locales** (`entQuenua.geom`, `sombreadoVegetal`
  [export], `EscenaBosqueVivo`, `EscenaEntMaestro`, `CicloMata`, `EscenaCalma3D`,
  `EscenaCutaway`, `micorrizas.geom`, `MicrofaunaSuelo`, `MundoCompost3D`,
  `MundoSemillero3D`, `MundoSueloVivo3D`, …).
- **`crearRng(sem)` mulberry32 — canónico** en `particulasData.js`, importado por
  ~10 mockups; PERO tiene 2 **copias locales** (`CatalogoInfra3D`, `AliadosFinca3D`).
- **`ruido3D`/`ruidoFbm`/`hash3`** canónicos en `sombreadoVegetal`; `vitrina`
  tiene su propio `fbm1D`/`fbm2D`.
- **→ kit:** `ruidoTerreno` (la copia canónica), `rng` (re-export LCG), `crearRng`
  (re-export mulberry32), `ruido3D`/`ruidoFbm` (re-export), `smoothstep`.

### 2.6 Materiales / paleta
- **Canónico:** `atmosferaMadre.PALETA` (madera/tierra/follaje/agua/piedra/… — un
  solo marrón de madera en todo el juego) + `PAL` por escena (frailejón, café…)
  para colores de especie. La `PALETA` madre es buena y está adoptada en varias.
- No hay un "material canónico" (los dioramas usan `MeshLambert + flatShading`;
  los animales `fincaRealista` van sin flatShading a propósito). Consistente por
  contrato, no por un componente compartido — aceptable.
- **→ kit:** `PALETA`, `CIELOS`, `BLOOM`, `mezclarCielo` re-exportados.

### 2.7 Billboards SVG (criaturas rubber-hose como `<Html>`)
- Las criaturas SVG se montan como billboards en `escenas/FaunaEscena.jsx`
  (`Fauna`) y `bosque/FaunaBosque.jsx`. Patrón sano (reusa los SVG ya hechos, no
  geometría procedural fea — memoria `svg-rubberhose-en-mundos-3d`).
- **No está factorizado** como primitiva del kit → **GAP** (ver §4).

### 2.8 Sombras de contacto / AO barato — `escenas/SombraContacto.jsx`
- Canónico: `CanvasTexture` radial cacheada, plano transparente. Excelente.
- **Solo lo usan** `EscenaBase3D` y `useEntradaAbeja`. Los mundos vivos hacen su
  propio `circleGeometry` plano con `meshBasicMaterial` (aproximación pobre).
- **→ kit:** re-exportado; `<AtmosferaMundo conSuelo>` lo monta por la familia viva.

### 2.9 Cámara
- `escenas/CamaraDirector.jsx` — establishing shot (dolly con arco + lente que se
  asienta) + respiración del encuadre; una vez por sesión. Muy bueno.
- `camaraDioramas.js` — `ENCUADRES`/`resolverEncuadre` (poses por mundo+tier).
- **Duplicado:** hay un `CamaraDirector.jsx` en la raíz de `mundo3d/` además del
  de `escenas/` (revisar cuál es el vivo; el de `escenas/` es el que usa
  `EscenaBase3D`).
- La familia viva usa `OrbitControls` pelón → sin establishing shot.
- **→ kit:** `CamaraDirector` + `resolverEncuadre` re-exportados (migración pend.).

### 2.10 Transiciones (VeloOdyssey / cruce)
- **Ya consolidado** en `transiciones/` (barrel DOM-safe): `VeloOdyssey`,
  `useCruceMundo`, `velosData` (`VELOS`, `duracionCruce`, `curvaCruce`…), y
  `CamaraCruce` (import directo por el chunk three). Buen estado.
- Además en la raíz: `TransicionMundo`, `TransicionNewDonk`, `TransicionMundoKit`,
  `TransicionSierraMundo` — algo dispersos pero funcionales.
- **→ kit:** re-exporta el barrel de `transiciones/`.

### 2.11 device-tier — `deviceTier.js`
- `decidirTier` (alto/medio/bajo por RAM/núcleos/saveData/webgl/reduced-motion),
  `permite3D`, `perfilDeTier` (`PERFIL_RENDER`: dpr, sombras, segmentosTerreno,
  flatShading, estrellas, criaturas, matasInstanciadas, lod, fog, sombrasContacto).
- **La pieza mejor adoptada:** casi todas las escenas/mockups la usan. Modelo a
  seguir para el resto del kit.
- **→ kit:** re-exportado.

---

## 3. Mapa de consumidores (quién usa qué)

- **`EscenaBase3D`** (11 arquetipos + 4 mockups): cutaway, flujo, recinto,
  estratos, mercado, sanidad, semillero, boveda, cafe, calma, valle +
  `MundoAgua3D`, `ValleLluvia3D`, `ColocarInfraestructura`, `JuegoMiFincaOdyssey`.
- **`atmosferaMadre`**: ~45 archivos (paleta/cielos ampliamente adoptados).
- **`deviceTier`/`perfilDeTier`**: ~universal (~70 archivos).
- **`useCicloDia`**: `EscenaBase3D`, `EntradaValle3D`, `CaraProd3D`, `FaunaBosque`.
- **`SombraContacto`**: `EscenaBase3D`, `useEntradaAbeja` (solo).
- **`sombreadoVegetal`** (taller de geometría): `bosque/FaunaBosque`,
  `sierra/sierraMonte.geom`, `finca/fincaRealista.geom` (los buenos ciudadanos).
  cacao/cafetal/papa/vitrina **no** lo importan (reimplementan).

---

## 4. GAPS (lo que faltaba para congruencia)

| # | Gap | Estado tras Fase 2 |
|---|---|---|
| G1 | Los mundos vivos no heredan la atmósfera/hora del valle (cielo estático). | **Cerrado por el kit** (`<AtmosferaMundo>` + `useAtmosferaMundo`). Falta *migrar* las 4 escenas. |
| G2 | `fusionarSeguro` sin casa neutra → copia de la trampa null en 7 archivos. | **Cerrado** (kit re-exporta el canónico como única fusión). Falta migrar los inline. |
| G3 | Sin constructor de terreno compartido. | **Cerrado** (`construirTerreno`). Falta migrar. |
| G4 | Ruido de terreno + PRNG duplicados (6 + ~12 copias). | **Cerrado** (`ruidoTerreno`, `rng`, `crearRng`). Falta dedupe local. |
| G5 | Sin scatter compartido. | **Cerrado** (`sembrarEnAnillo`). |
| G6 | Cámara director atada a la familia diorama; la viva no la usa. | Re-exportada; **migración pendiente**. |
| G7 | Billboards SVG de criaturas sin primitiva de kit. | **Abierto** — recomendación: `<BillboardCriatura>` que envuelva el patrón `<Html>` de `FaunaEscena`. |
| G8 | Sin wrapper de Canvas para la familia viva (equivalente a `EscenaBase3D`). | **Abierto** — recomendación: `EscenaVivaBase` que componga `<AtmosferaMundo>` + `CamaraDirector` + `OrbitControls` + `MonitorRendimiento`. Cambio mayor; diferido. |
| G9 | `CamaraDirector` duplicado (raíz vs `escenas/`). | **Abierto** — unificar. |

---

## 5. Fase 2 entregada — API del kit

`src/visual/mundo3d/kit/` (ver `kit/README.md`). **Un solo import** para la
congruencia. El barrel **importa three** → solo para archivos de escena (chunk
`vendor-three`), nunca el barrel three-free `mundo3d/index.js`.

- `ruido.js` — `rng`, `crearRng`, `ruidoTerreno`, `ruido3D`, `ruidoFbm`, `smoothstep`, `saturar`.
- `geometria.js` — `fusionarSeguro` (única fusión), `desindexar`, `poner`, `apuntar`,
  `pintarPorVertice`, `pintarPlano`, `hornearFollaje`, `hornearCorteza`,
  `tuboOrganico`, `taperTronco`, `curvaTronco`, `sembrarFollaje`, `matojoHoja`, `sembrarEnAnillo`.
- `terreno.js` — `construirTerreno`.
- `atmosfera.js` — `atmosferaDeFamilia`, `useAtmosferaMundo`.
- `AtmosferaMundo.jsx` — drop-in `<color>/<fog>/luces/estrellas/sombras`.
- `index.js` — barrel + re-exports de paleta madre, cielos por hora, `useCicloDia`,
  `deviceTier`, `SombraContacto`, `CamaraDirector`/`resolverEncuadre`, transiciones.

**Pruebas:** `kit/__tests__/kit.test.js` (headless) cubre determinismo del ruido,
`fusionarSeguro` **tronando** ante null/atributos dispares, `construirTerreno`,
coherencia de `atmosferaDeFamilia` con la hora, y `sembrarEnAnillo` determinista.

### Nota sobre gates
- `kit/__tests__/kit.test.js`: **11/11 verde**.
- El diff de esta rama es **solo** `src/visual/mundo3d/kit/` (archivos nuevos, aún
  sin consumidores) → **no introduce errores de tsc**. `origin/app-3d` ya trae 2
  errores de tsc **pre-existentes y ajenos** al kit (`AgentAvatarSelector.jsx`,
  `saludoPantalla.test.js`) — fuera del alcance de este toolkit.

## 6. Siguiente ola (para la reescritura valle/bosque)
1. Migrar `EscenaBosqueVivo`/`EscenaCacaoVivo`/`EscenaCafetalVivo`/`EscenaPapaVivo`
   a `<AtmosferaMundo>` + `construirTerreno` + `fusionarSeguro` del kit (G1–G4).
2. Reemplazar los `rng`/`ruido` locales por los del kit (G4).
3. Construir `<BillboardCriatura>` (G7) y evaluar `EscenaVivaBase` (G8).
4. Unificar el `CamaraDirector` duplicado (G9).
