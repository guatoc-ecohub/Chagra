# Brief ART-ONLY — Animales de finca colombianos por raza

**Para:** Fable · **Fecha:** 2026-07-21 · **Repo:** `chagra` v1.0.55
**Encargo del operador:**
1. Sobre `#/mockups/momento-venta-mercado-3d`: *"aprobado, solo darle una pasada: que la vaca no sea tan cuadrada y que se parezca más a las vacas de Colombia. Ya hay código de eso, revisa."*
2. *"El comportamiento de las vacas integrarlo para el mundo de los cerdos 3D."*

**Regla madre:** el rasgo debe ser **real y verificable**. Una raza inventada le enseña mal al campesino.
Todo rasgo de este brief trae fuente. Lo que no pude verificar va marcado **NO VERIFICADO** y **no se dibuja**.

---

## 1. Inventario: qué hay hoy (auditado archivo por archivo)

**Respuesta corta a "¿hay un componente reutilizable?": NO. Hay CUATRO sistemas distintos que dibujan la misma vaca, y el mejor de los cuatro lo usa un solo consumidor.**

| # | Archivo | Técnica | Razas que conoce | Quién lo consume |
|---|---|---|---|---|
| 1 | `src/visual/mundo3d/finca/fincaRealista.geom.js` (1423 L) | **La buena.** Loft orgánico (`cuerpoOrganico`), sombreado horneado en `vertexColors` (`hornearPelaje`), manchas **pintadas por vértice** (`pintarManchas`), fusión anti-null (`fusionarHato`). 2 draw-calls por animal. | `RAZAS_VACA` = holstein, criolla, cebu · `RAZAS_CERDO` = zungo, sanpedreno, duroc, landrace, pietrain | **solo** `src/mockups/valle/animales.jsx` |
| 2 | `src/visual/mundo3d/lecheria/GanadoLechero.jsx` (309 L) | Cápsulas + esferas ensambladas. Ubre-reloj del ordeño, aliento visible en frío, brete. | holstein, **normando**, criolla, cebu | `EscenaLecheriaViva` (`#/mockups/lecheria-viva-3d`) |
| 3 | `src/mockups/MomentoVentaMercado3D.jsx` (res en L304-450) | **`boxGeometry` pura.** Torso = caja `[1.3, 0.6, 0.62]`; las manchas también son cajas. **Esto es la "vaca cuadrada" del operador.** | ninguna (solo `P.res` / `P.resClara`) | `#/mockups/momento-venta-mercado-3d` |
| 4 | `src/visual/mundo3d/escenas/CorralVivo.jsx` (659 L) | `InstancedMesh` + tabla `ESPECIES` data-driven (primitivas). El corral como espejo del dato real. | `COLOR_RAZA` = zungo, sanpedreño/sanpedreno, duroc, landrace, normando, cebú, campesina, ponedora, criolla | `#/mockups/mundo3d-animales`, `EscenaRecinto`, `EscenaMercado`, `AnimalMomento` |

**Sobre "el mundo de los cerdos 3D":** verificado sobre las 88 rutas `mockups/*` de `src/App.jsx` — **no existe una ruta propia de cerdos**. Los cerdos viven hoy en dos sitios: `#/mockups/mundo3d-animales` (CorralVivo, primitivas) y la zona de animales del valle (`src/mockups/valle/animales.jsx`, geometría realista). El pedido se cumple llevando el comportamiento a **esos dos**, no creando un mundo nuevo.

### El patrón "sabido pero no dibujado", con línea y archivo

- `src/App.jsx:196` dice textual *"piso térmico (Holstein/Normando en frío, criolla/cruce cebú en cálido)"* — pero `RAZAS_VACA` de `fincaRealista.geom.js` **no tiene `normando`**.
- `src/components/VacasScreen.jsx:49` documenta *"Criollo (BON, Romosinuano, Costeño)"* — **ninguna** está dibujada en 3D.
- `src/components/CaprinosScreen.jsx` ya aplica fidelidad por raza criolla a los caprinos. El criterio existe; a bovinos y porcinos no llegó completo.

### Bugs de fidelidad verificados (no son opinión, son lectura del código)

1. **`geomVaca({raza:'normando'})` devuelve una Holstein.** `fincaRealista.geom.js:325` hace `RAZAS_VACA[raza] || RAZAS_VACA.holstein` y `normando` no está en la tabla. `src/visual/mundo3d/mundoData.js:42` tiene una vaca `raza: 'normando'` — hoy la salva CorralVivo (que sí tiene `normando` en `COLOR_RAZA`), pero el día que se conecte a `fincaRealista` sale Holstein sin avisar.
2. **`RAZAS_CERDO` tiene `sanpedreno` sin ñ** (`fincaRealista.geom.js:469`) mientras `mundoData.js:40` usa `'sanpedreño'` con ñ. Fallback silencioso a zungo. `CorralVivo.jsx:59-60` sí registra las dos grafías — copiar ese patrón.
3. **`RAZAS_CERDO.sanpedreno.orejas = 'caida'` contradice la fuente**: el San Pedreño tiene **orejas rectas y medianas**. Hay que corregirlo.
4. **Falta `casco de mula`**, la tercera raza criolla porcina colombiana, en `RAZAS_CERDO`. Está en el DR interno y en fuentes ICA/Agrosavia.
5. `RAZAS_CERDO.sanpedreno.calcetin: '#d8cec0'` — **NO VERIFICADO**. No hallé fuente para calcetines claros en el San Pedreño. **No reforzar ese rasgo hasta verificarlo.**
6. `pietrain` está dibujado y es correcto como raza, pero **es belga, no criolla colombiana**. No es error; simplemente no es prioridad de fidelidad campesina.

---

## 2. Tabla de razas con rasgos DIBUJABLES y su fuente

### 2.1 Bovinos

| Raza | Rasgos dibujables (silueta / capa) | Fuente | Estado |
|---|---|---|---|
| **Holstein** | Blanco crema con **manchas negras irregulares de borde neto**; **mocha** (sin cuernos en la lechera de establo); ubre grande. | ya dibujada en `fincaRealista.geom.js` + DR interno `cadena-lactea-…-gemini-2026-06-19.md` L13 (frío >1800 msnm) | ✅ correcta, dejarla |
| **Normando** | Base blanca con **manchas pardo/caoba de BORDES DIFUSOS** (pelos entremezclados, no parche neto): del amarillo claro al café casi negro. **"Anteojos": manchas oscuras alrededor de los ojos** — la seña inconfundible. Hocico oscuro; pigmentación definida en **ollares, orejas, contorno ocular y cara posterior de las extremidades**. Cuerpo **amplio de pecho y abdomen → silueta RECTANGULAR y sólida** (no la cuña de la Holstein). | Wikipedia ES *Normando (raza bovina)*; razasbovinasdecolombia.weebly.com; zoovetesmipasion.com. DR interno: adaptada **1800–4200 msnm**, rústica, transforma forraje pobre | ✅ verificado — **FALTA DIBUJARLA en `fincaRealista`** |
| **Criolla BON (Blanco Orejinegro)** | **Pelaje blanco** con **orejas NEGRAS por dentro y por fuera** — de ahí el nombre, y es la seña que se lee a 20 m. **Mucosas y contornos oculares negros**, piel fuertemente pigmentada. Tamaño **medio**, cuerpo **robusto**, **patas cortas**. Los terneros nacen rosados y pigmentan hacia los 24 meses. | Wikipedia ES *Blanco orejinegro*; CONtexto Ganadero (*"tesoro criollo con 500 años"*); Perulactea; asocriollanos.com | ✅ verificado — **FALTA DIBUJARLA** |
| **Cruce cebú / Brahman** | **Giba** sobre la cruz, **papada** colgante amplia, **orejas grandes caídas**, capa gris clara. Clima cálido. | ya dibujada (`RAZAS_VACA.cebu`) + DR interno L11 (Criollo × Cebú → calor) | ✅ correcta, dejarla |
| Romosinuano | Criolla del valle del Sinú, bosque seco tropical. | DR interno L19 | ⚠️ **NO VERIFICADO** su fenotipo dibujable (color, presencia/ausencia de cuernos). **No dibujar todavía.** |

### 2.2 Porcinos criollos colombianos

Colombia tiene **tres** razas porcinas criollas reconocidas y conservadas en el banco de germoplasma de **AGROSAVIA**: **San Pedreño, Zungo y Casco de Mula** (~500 años en el país). Comparten: adaptadas al clima, viven en pastoreo al aire libre, **alta tolerancia a parásitos** y a enfermedades transmitidas por mosquitos.

| Raza | Rasgos dibujables | Fuente | Estado |
|---|---|---|---|
| **Zungo** (Zungo Pelado) | **Negro**, **poco pelo** (de ahí "pelado"), **cuerpo redondeado**, **tamaño pequeño**, **patas cortas**, muy graso — la panza casi barre el piso. Costa Caribe (Atlántico, Córdoba, Cesar, Magdalena). | archivo.lapatria.com *"Conozca las tres especies de cerdos criollos"*; repositorio Agrosavia *Cerdos Criollos Colombianos*; DR interno `cerdos-de-traspatio-…` L27 | ✅ ya dibujado y **correcto** |
| **San Pedreño** (Sampedreño) | **Tamaño mediano**, **color negro**, **abundante pelo** (contrasta con el Zungo pelado — esa es la diferencia legible), **hocico CORTO**, **orejas RECTAS y medianas**. Perfil cóncavo a subcóncavo. Zona alta de Antioquia y Viejo Caldas. | archivo.lapatria.com; SciELO MX *Análisis de diversidad genética en cerdo criollo san pedreño* (S2007-90282019000200333); DR interno L28 | ⚠️ dibujado pero **con orejas caídas — CORREGIR a rectas** |
| **Casco de Mula** | **La seña única: el casco NO es una pezuña hendida en dos, sino entero, como el de una mula o un caballo** (mutación / sindactilia). **Color entre rojo y amarillento — NO negro** (a diferencia de las otras dos). Rústico, piel pigmentada resistente a picaduras. Orinoquía, Meta, Casanare. | archivo.lapatria.com; ICA *"Sanmartinero y Casco de Mula, razas criollas que atesora el ICA Seccional Meta"*; repositorio.minciencias.gov.co *Caracterización fenotípica y molecular de los cerdos criollos de Colombia casco de Mula, Zungo y Sanpedreño*; DR interno L29 | ❌ **NO EXISTE — dibujarla** |
| Congo Santandereano | Pelo largo, hocico largo, cara angosta, orejas erectas, escaso pelo. Santander. | DR interno L31, confianza **Media**, sin DOI | ⚠️ **NO VERIFICADO en fuente externa.** Opcional, baja prioridad. |
| Duroc / Landrace / Pietrain | Comerciales (EEUU/Dinamarca/Bélgica), no criollas. Ya dibujadas y correctas. | — | ✅ dejar como están |

> **Sobre `zai-search`:** lo corrí dos veces para este grounding y devolvió fuentes irrelevantes (una distancia entre ciudades de Brasil, código C#). El grounding de arriba viene de WebSearch + el DR interno. Dejo constancia para que nadie lo dé por bueno sin leer las fuentes.

---

## 3. Contrato de comportamiento reutilizable (vaca → cerdo)

El operador pidió *"el comportamiento de las vacas integrarlo para el mundo de los cerdos"*. **Ese contrato ya existe** — está escrito en `src/mockups/valle/animales.jsx:58-82` como la tabla `GESTOS`, enterrado en un mockup del valle. No hay que inventarlo: hay que **subirlo a un módulo compartido** y darle al cerdo lo que hoy solo tiene la vaca.

### Núcleo común — todo animal de finca

| Capacidad | Dónde está hoy la mejor implementación | Parámetros |
|---|---|---|
| **Respirar** (el flanco sube apenas) | `GanadoLechero.jsx:91` — `cuerpo.scale.y = 1 + sin(t*0.9 + fase)*0.02` | amplitud 0.02, ~0.9 rad/s |
| **Gesto de cabeza en pivote de cuello** | `valle/animales.jsx:58-82` (tabla `GESTOS`) | rotación del grupo-cabeza; el cuerpo queda plantado |
| **Cola / apéndice que espanta moscas** | `GanadoLechero.jsx:93` — `cola.rotation.x = sin(t*1.6 + fase)*0.35` | 1.6 rad/s, ±0.35 |
| **Jitter determinista por instancia** | `valle/animales.jsx:98-104` — escala no uniforme + inclinación mínima sembradas por `fase` | dos animales de la misma raza ≠ clones |
| **Marcha por camino paramétrico** | `MomentoVentaMercado3D.jsx:429-446` (`colocarVacaEnCamino`) — bob + squash + **patas diagonales** + cabeceo, todo escalado por `andar` | patas 0/3 en fase, 1/2 en contrafase |
| **Contrato declarativo por `name`** | `MomentoVentaMercado3D.jsx:321-331` (`resolverPartes`) — ningún ref cruza frontera de componente | `<especie>-nucleo/cuerpo/cabeza/cola/pata-N` |
| **Gates obligatorios** | `reducedMotion` + `tier` (`'alto'|'medio'|'bajo'`) en los cuatro sistemas | `bajo` = quieto y sin piezas finas |

### Propio de cada especie — solo cambia el gesto de cabeza

```
pasta   (vaca)     rotation.z = -0.15 - (sin(t*0.55 + fase)*0.5 + 0.5) * 0.55   // baja y se demora abajo
hocica  (cerdo)    rotation.z = -(max(0, sin(t*1.1 + fase)) ** 4) * 0.35        // empuje corto y seco, abajo-adelante
picotea (gallina)  rotation.z = -(((sin(t*2.4 + fase)+1)/2) ** 4) * 0.9         // golpes secos con pausas
tantea  (oveja)    rotation.z = -0.1 - (sin(t*0.7 + fase)*0.5 + 0.5) * 0.35     // más tímida que la vaca
mira    (perro)    rotation.y = sin(t*0.4 + fase)*0.45; rotation.x = sin(t*0.23 + fase*2)*0.1
```

Además, propio y no compartible:
- **vaca**: ubre como **reloj del ordeño** (`llenura` 0..1 → escala y caída de la bolsa), aliento visible en frío, rumia.
- **cerdo**: **lechones que siguen a la madre** (ya hay `geomLechon`), revolcadero, y — si Fable quiere una seña de vida propia — el **meneo de la cola en tirabuzón**, que la vaca no tiene.

### La forma del módulo compartido

```
src/visual/mundo3d/finca/gestosAnimal.js
  export const GESTOS      // pasta, hocica, picotea, tantea, mira  (movido de valle/animales.jsx)
  export const NUCLEO      // respira, colea, jitter — parámetros arriba
  export function resolverPartes(raiz, prefijo)   // generalizado de 'res-' a cualquier especie
  export function animarMarcha(partes, camino, u, andar, fase, resp)
```
Consumidores a reconectar: `valle/animales.jsx`, `CorralVivo.jsx`, `GanadoLechero.jsx`, `MomentoVentaMercado3D.jsx`.

---

## 4. El brief para Fable

**Alcance: ARTE. No tests, no wiring de rutas, no deploy — eso lo hace Opus.**
Orden de prioridad: 1 → 2 → 3. Si el tiempo alcanza para uno solo, que sea el 1.

### Tarea 1 — La vaca del mercado deja de ser una caja
**Archivo:** `src/mockups/MomentoVentaMercado3D.jsx`, componente `Vaca` (L334-423).
**Qué hacer:** reemplazar el torso `boxGeometry([1.3, 0.6, 0.62])` y las manchas-caja por la fábrica que **ya existe**: `geomVaca()` de `src/visual/mundo3d/finca/fincaRealista.geom.js`.
**Qué NO romper:** el contrato declarativo por `name` (`res-nucleo`, `res-cuerpo`, `res-cabeza`, `res-cola`, `res-pata-0..3`) — `resolverPartes` y `colocarVacaEnCamino` dependen de esos nombres, y el momento de la partida desvanece la res con `transparent`. Si `fincaRealista` fusiona el cuerpo en una malla, hay que exponer igual los pivotes de cabeza y cola, y mantener los materiales `transparent`.
**Raza:** una **criolla** o una **BON** — es la res que un campesino lleva a vender en el mercado, no una Holstein de establo.

### Tarea 2 — Las dos razas que el proyecto ya nombra y nunca dibujó
**Archivo:** `src/visual/mundo3d/finca/fincaRealista.geom.js`, tabla `RAZAS_VACA` (L302-315).
Añadir con los rasgos de la tabla §2.1:
- **`normando`**: base blanca + manchas caoba de **borde difuso** (bajar el umbral / subir la suavidad de `pintarManchas` respecto a la Holstein — ese es el contraste que se ve), **"anteojos" oscuros alrededor de los ojos**, hocico oscuro, silueta **rectangular** (torso más ancho de pecho y abdomen). Con cuernos.
- **`bon`** (Blanco Orejinegro): **cuerpo blanco pleno** + **orejas negras** + **contorno ocular y hocico negros**, tamaño medio, **patas cortas**, cuerpo robusto.

Y en `RAZAS_CERDO` (L464-485):
- **corregir** `sanpedreno.orejas` de `'caida'` a **`'parada'`/recta mediana**; reforzar el **pelo abundante** (moteado más marcado) y el **hocico corto** — es lo que lo separa del Zungo pelado.
- **añadir `cascoDeMula`**: capa **rojiza-amarillenta** (no negra) y — el rasgo firma — **el casco entero, sin hendidura, como el de una mula**. Si a esta escala el casco no se lee, resuélvalo con la **silueta de la pata** y el color de capa, y déjelo anotado.
- registrar **ambas grafías** `sanpedreno` y `sanpedreño` (copiar el patrón de `CorralVivo.jsx:59-60`).
- **NO** dibujar calcetines claros en el San Pedreño: no hay fuente.

### Tarea 3 — El comportamiento de la vaca llega al cerdo
Extraer `GESTOS` de `src/mockups/valle/animales.jsx:58-82` a `src/visual/mundo3d/finca/gestosAnimal.js` con el núcleo común de §3, y dárselo al cerdo en **`CorralVivo.jsx`** (hoy el cerdo solo tiene `gesto: 'hocica'` y le falta respirar, colear y el jitter por instancia). Los lechones deben seguir a la cerda.

### Reglas técnicas de la casa (no negociables)
- **`mergeGeometries` devuelve `null` en silencio** si se mezclan geometrías indexadas y no indexadas → **desindexar SIEMPRE antes de fusionar**. `fusionarHato` (`fincaRealista.geom.js:70-95`) ya lo hace y **truena fuerte** si algo no cuadra: use esa función, no llame `mergeGeometries` a pelo.
- **No recalcular `computeVertexNormals()` sobre geometría desindexada** — produce normales por cara y el animal vuelve a verse poliedro por más suave que sea el material. `fusionarHato` ya lo evita a propósito.
- Paleta y materiales madre: `src/visual/mundo3d/paleta/paletaMadre.js` y `paleta/materialesMadre.js` (**ojo: van dentro de `paleta/`**, no en la raíz de `mundo3d/`).
- El hato usa `MATERIAL_HATO` (Lambert + `vertexColors`, **sin `flatShading`** — carne curva). `MATERIAL_FINCA` con `flatShading` es para la arboleda: no compartirlo con animales.
- Todo gateado por `reducedMotion` y `tier`; en `'bajo'`, quieto y sin piezas finas.
- Cero GLTF, cero texturas: todo procedural, corre offline en Android barato.

### Criterio de aceptación visual
> **Un ganadero colombiano debería poder pararse frente a la pantalla y decir: "esa sí es una Normando"** — por los anteojos y las manchas difusas, no porque se lo digan. Y frente al corral: *"ese es un Zungo y ese otro es un San Pedreño"*, porque uno es pelado y redondo y el otro es peludo y de orejas paradas.

Concreto:
- **A distancia de silueta** (principio Humboldt): la BON se distingue por las orejas negras sobre cuerpo blanco; el cebú por la giba; la Normando por el rectángulo sólido; el Zungo por lo bajo y redondo.
- **La vaca del mercado no debe tener ni una arista de caja visible** en el torso.
- **Gate visual obligatorio**: ninguna escena se mergea sin captura. Antes/después de `#/mockups/momento-venta-mercado-3d` y de `#/mockups/mundo3d-animales`.

---

## 5. Fuentes

**Externas (WebSearch, 2026-07-21)**
- [Blanco orejinegro (raza bovina) — Wikipedia ES](https://es.wikipedia.org/wiki/Blanco_orejinegro_(raza_bovina))
- [Blanco orejinegro, tesoro criollo con 500 años de historia en Colombia — CONtexto Ganadero](https://www.contextoganadero.com/ganaderia-sostenible/blanco-orejinegro-tesoro-criollo-con-500-anos-de-historia-en-colombia)
- [Raza Blanco Orejinegro: Características Zootécnicas de un Bovino Criollo — Perulactea](https://perulactea.com/raza-blanco-orejinegro-caracteristicas-zootecnicas-de-un-bovino-criollo/)
- [BLANCO OREJINEGRO (BON) — asocriollanos](https://www.asocriollanos.com/blanco-orejinegro-bon/)
- [Normando (raza bovina) — Wikipedia ES](https://es.wikipedia.org/wiki/Normando_(raza_bovina))
- [Normando / Normande — Razas Bovinas de Colombia](https://razasbovinasdecolombia.weebly.com/normando--normande.html)
- [Raza Bovina Normando — zoovetesmipasion](https://zoovetesmipasion.com/ganaderia/razas-bovina/raza-bovina-normando)
- [Cerdos Criollos Colombianos: caracterización racial, productiva y genética — repositorio AGROSAVIA](https://repository.agrosavia.co/server/api/core/bitstreams/6601059a-bc2f-4291-b5dd-dbf1d5c9ba6d/content)
- [Conozca las tres especies de cerdos criollos — La Patria](https://archivo.lapatria.com/ciencias/conozca-las-tres-especies-de-cerdos-criollos-439406)
- [Caracterización fenotípica y molecular de los cerdos criollos de Colombia casco de Mula, Zungo y Sanpedreño — Minciencias](https://repositorio.minciencias.gov.co/entities/publication/f43b53ad-8714-4a14-9a41-06a5570882f9)
- [Sanmartinero y Casco de Mula, razas criollas que atesora el ICA Seccional Meta — ICA](https://www.ica.gov.co/noticias/pecuaria/2015/sanmartinero-y-casco-de-mula-razas-criollas-que-a)
- [Análisis de diversidad genética en cerdo criollo san pedreño (pedigrí) — SciELO MX](https://www.scielo.org.mx/scielo.php?script=sci_arttext&pid=S2007-90282019000200333)
- [Este es el panorama del cerdo criollo colombiano — CONtexto Ganadero](https://www.contextoganadero.com/agricultura/este-es-el-panorama-del-cerdo-criollo-colombiano)

**Internas (DR-FANOUT, 2026-06-19)**
- `cadena-lactea-campesina-agroecologica-en-colombia-por-piso-termico-…-{gemini,glm}-2026-06-19.md` — razas por piso térmico
- `cerdos-de-traspatio-y-porcicultura-agroecolgica-gemini-2026-06-19.md` — tabla de razas criollas porcinas
- `grounding-cerdos-traspatio-colombia-{gemini,glm}-2026-06-19.md`
