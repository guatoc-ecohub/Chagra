# Auditoría de biodiversidad — todo el 3D de Chagra

> Rama `integra/todo-3d-a-prod` (commit `5b938e97`, 2026-07-16). Método: lectura de código —
> geometría (`*.geom.js`), escenas (`*.jsx`) y el manifiesto `src/config/rutasProdChagraApp.js` —
> contra la regla dura del operador: **el paisaje/flora/fauna de cada mundo 3D debe ser lo más
> DENSO y cercano a la BIODIVERSIDAD COLOMBIANA REAL posible, por piso térmico.**
> Ojo triple: director 3D (densidad/composición) + agrónomo (especies útiles por piso) +
> biólogo (especies nativas reales). Solo lectura — no se tocó ninguna escena.
>
> Cruce contra `Chagra-strategy/deepresearch/DR-FANOUT/` (512 DRs existentes a la fecha) para no
> duplicar investigación ya hecha.

## Hallazgo transversal, antes de la tabla mundo por mundo

El repo tiene **dos capas de calidad muy distintas** conviviendo:

1. **La capa "taller nuevo"** (`sombreadoVegetal.js` + `.geom.js` con especies reales, color
   horneado por vértice, `fusionarSeguro`, tier-safe): `floraParamo.geom.js`,
   `doselBiodiverso.geom.js`, `floraCafetal.geom.js`, `floraCacao.geom.js`, `floraPapa.geom.js`,
   `arbolMayor.geom.js`, `sucesion.geom.js`, `polinizadores.geom.js` + `floresSindrome.geom.js`.
   Estos módulos SÍ nombran especies reales colombianas con nombre científico en el comentario
   de cabecera y las distribuyen con conteos por tier. Es un trabajo serio, con DR de respaldo.
2. **La capa "diorama viejo"** (mockups didácticos tipo cutaway/anillo): `MundoAgua3D`,
   `MundoCompost3D`, `MundoFermentos3D`, `MundoSueloVivo3D`, `MundoGallinero3D` y el fondo
   ambiental del propio `Valle3D`. Aquí la vegetación es geometría genérica sin identidad
   (`function Arbol()` = un cono sobre un cilindro — exactamente el patrón que
   `arbolMayor.geom.js` describe como **"el árbol de navidad… parece una caricatura mal hecha"**
   y que ya se corrigió para la Sierra, pero no para estos mundos) y casi nunca hay fauna.

El problema más grave no es "falta investigación" — es que **el contenido bueno ya existe y en
tres casos centrales no está cableado**: el mundo de POLINIZADORES completo, el mundo de
GALERÍA DE ÁRBOLES MAYORES de la Sierra por piso térmico, y (más chico) el mismo patrón se repite
en la vegetación de fondo del Valle. Ver hallazgo "construido pero no cableado" en cada sección.

---

## 1. VALLE (`src/mockups/valle/*`, `src/visual/mundo3d/direccion/composicionValle.js`)

**Inventario real.** Dos capas separadas:
- **Landmarks por lugar** (`Valle3D.jsx` `LandmarkGeom`): el landmark `'bosque'` usa
  `ArboledaEspecies` — 5 árboles reales reutilizando `floraParamo.geom.js`: 2× roble andino
  (*Quercus humboldtii*), 2× aliso (*Alnus acuminata*), 1× gaque (*Clusia*) (`Valle3D.jsx:280-308`).
  El landmark `'cafetal'` dibuja arbustos de café genéricos con cereza roja (no reusa
  `floraCafetal.geom.js`). El landmark `'animales'` (potrero) usa `animales.jsx`: vacas, ovejas,
  cerdos y gallinas con geometría real por raza (`fincaRealista.geom.js`) separados por
  **cercas vivas de matarratón, nacedero y botón de oro** (especies reales de cerca viva
  colombiana, `animales.jsx:1-22`) — esto está muy bien hecho.
- **Vegetación de fondo ambiental** (`VEGETACION_PISOS`, `valleData.js:102-121`): **17 matas**
  regadas por los 4 pisos (5 páramo / 4 frío / 4 templado / 4 cálido) en un terreno de 48×48 u.
  Cada mata es un `tipo` (`frailejon` | `papa` | `cafe` | `platano`) resuelto en `Valle3D.jsx`
  contra `SILUETAS_MATA` — **geometría 100% genérica**: un cono o una bola tintados, sin
  identidad de especie (`Valle3D.jsx:820-836`). Ni la "papa" ni el "café" de fondo se parecen a
  `floraPapa.geom.js`/`floraCafetal.geom.js` que sí existen en el repo.

**Densidad.** El potrero y los landmarks curados se ven bien poblados; el terreno GRANDE
(48×48, "el valle respira", rediseño 2026-07) entre landmarks queda con solo 17 marcadores de
vegetación — se lee raleado en el trayecto entre lugares.

**Fidelidad de biodiversidad.** Los landmarks curados (bosque, potrero) son fieles. El fondo
ambiental (los 17 marcadores) NO tiene identidad de especie real — son 4 siluetas geométricas
por piso, no las especies que el propio repo ya modeló en detalle para Cafetal/Papa/Páramo.

**BUGS/GAPS:**
1. **Alta prioridad** — la vegetación de fondo (`VEGETACION_PISOS`/`SILUETAS_MATA`) no reusa las
   geometrías reales que YA existen (`floraCafetal.geom.js`, `floraPapa.geom.js`,
   `floraParamo.geom.js`) como sí hace el landmark `'bosque'`. Mismo arreglo, aplicado a más
   sitios: swap de geometría, no investigación nueva.
2. El fondo del valle grande (48×48) tiene solo 17 instancias de vegetación — para "el valle
   respira" del rediseño 2026-07, es poco denso comparado con el resto del terreno navegable.
3. El landmark `'cafetal'` del valle no reusa `floraCafetal.geom.js` (sí lo hace `CafetalVivo3D`)
   — dos representaciones inconsistentes del mismo cultivo en el mismo repo.

**DRs necesarios.** Ninguno nuevo — es 100% trabajo de "conectar cañería" con contenido que ya
existe en el propio repo.

---

## 2. BOSQUE VIVO (`src/visual/mundo3d/bosque/*` — `MundoEntBosque.jsx` → `EscenaBosqueVivo.jsx`)

**El mundo más fuerte del repo, y fue redisñado HOY (2026-07-16) según los propios comentarios
del código** (`floraParamo.geom.js:75-79`: *"rediseño 2026-07-16, dos-mundos"*).

**Inventario real — flora, con nombre científico en el propio código:**
- `floraParamo.geom.js` (cortejo del claro del Ent): frailejón/*Espeletia* (ahora reducido a
  "acento raro del filo alto", por diseño), yarumo plateado/*Cecropia telealba*, roble andino/
  *Quercus humboldtii*, encenillo/*Weinmannia*, aliso/*Alnus acuminata*, gaque/*Clusia*,
  mortiño/*Vaccinium meridionale*, romerillo, roca+musgo. **9 especies+elementos reales**, con
  gradiente de EDAD en el frailejonal (joven/adulto/viejo/en flor).
- `doselBiodiverso.geom.js` (dosel multiespecie andino/subandino): guadua/*Guadua angustifolia*,
  nogal cafetero/*Cordia alliodora*, cedro/*Cedrela odorata*, cámbulo/*Erythrina fusca*,
  gualanday/*Jacaranda caucana*, siete cueros/*Tibouchina lepidota*, helecho arbóreo/*Cyathea*,
  heliconia, quiche/bromelia (*Tillandsia*/*Guzmania*). **9 especies reales**, organizadas por
  estrato (dosel/floración/sotobosque/epífitas).
- `bosqueTakeA.geom.js`: el queñual (*Polylepis*, el Ent-guardián + su cortejo, 8-20 instancias
  según anillo).

**Conteos (tier `alto`):** floraParamo ≈89 instancias + doselBiodiverso ≈84 + queñual ≈20 =
**≈193 instancias de flora**, cubriendo dosel/emergentes, floración, sotobosque, epífitas y suelo
(rocas+musgo). Es, con diferencia, el mundo con más estratos representados del repo.

**Fauna (`FaunaBosque.jsx`):** 6 "vecinos" con nombre y SVG rubber-hose propio —
oso de anteojos/oso andino, rana andina (dardo), borugo, danta, jaguar (místico, franjas
nocturnas) — más fauna ambiental procedural: cóndor, venado de páramo, bandada, quetzal fugaz,
escarabajo del musgo, luciérnagas, mariposas (Morpho azul mencionada explícitamente), abejas del
frailejonar, colibrí.

**Densidad.** Alta y bien repartida por estrato — se lee como bosque, no como "un árbol solo".

**Fidelidad de biodiversidad.** Muy alta. Único matiz biológico: el frailejonal (páramo abierto)
y el robledal/dosel de guadua-cedro-cámbulo (bosque andino/subandino, más bajo) rara vez coexisten
en el mismo sitio real — pero el propio comentario del código YA reconoce esto y bajó
deliberadamente el peso del frailejón a "acento del filo alto, transición hacia el páramo de
arriba" (`floraParamo.geom.js:75-79`). Es una decisión de composición consciente, no un error.

**BUGS/GAPS:**
1. Menor: sería más honesto renombrar `floraParamo.geom.js` (vive en `bosque/`, ya no es
   "flora del páramo" sino "cortejo del claro del Ent") — housekeeping, no biodiversidad.
2. Sin fauna acuática/ribereña en el arroyo del bosque (el arroyo existe geométricamente —
   `xArroyo()`, `curvaArroyo()` en `bosqueTakeA.geom.js` — pero no lleva vida: sin rana en el
   agua, sin libélula).

**DRs necesarios.** Ninguno — este mundo ya consumió (y bien) `flora-del-paramo-para-el-mundo-3d-
bosqueclima-de-chagra-{gemini,glm}-2026-06-19.md`, `fauna-andina-realista-en-3d-*-2026-06-19.md`,
`bosque-vivo-taxonomia-de-12-arquetipos-*-2026-06-19.md`, `bosque-paramos-3d-{gemini,glm}-
2026-07-13.md`.

---

## 3. PÁRAMO (`src/mockups/MundoParamo3D.jsx`, ruta `diorama_paramo`)

**Inventario real.** Mundo más viejo (mockup, no pasó por el rediseño de HOY). Especies: campo
de frailejones/*Espeletia* instanciado + 1 frailejón "monumental" de detalle, pajonal, cojines de
musgo, romero de páramo/*Diplostephium*, chusque (bambú de páramo, 2-3 macollas), cardón/*Puya*
(la bromelia gigante, 2 instancias), quenuas/*Polylepis* dispersas (4-6), y aves (1 cóndor + 2-3
aves menores).

**Densidad (tier `alto`):** frailejón 18, pajonal 150, musgo 46, romero 22, chusque 2-3,
cardón 2, quenuas 4-6, aves 3 → **≈250 instancias**. Numéricamente denso.

**Fidelidad de biodiversidad.** Buena variedad vegetal (7 especies/elementos reales, incluido el
cardón/*Puya* que el propio brief del operador dio como ejemplo de algo que "podría faltar" — **ya
está**). El GAP real es la fauna: solo aves (cóndor + 2 pequeñas). Sin fauna terrestre de páramo
(venado de páramo, curí, comadreja de páramo, zorro andino) y sin el colibrí que
`fauna-andina-realista-*.md` documenta como polinizador clave del frailejón a esta altura
—curioso, porque SÍ está en Bosque Vivo (`ColibriDelFrailejonar`) pero no en el mundo Páramo
dedicado.

**BUGS/GAPS:**
1. Sin fauna terrestre (venado de páramo, curí/*Cavia*, zorro andino) — el páramo campesino real
   tiene más vida en tierra que la que se muestra aquí.
2. Este archivo no pasó por el rediseño 2026-07-16 que sí tuvo Bosque Vivo — es candidato directo
   al mismo tratamiento (edades del frailejón, capas por estrato) usando exactamente el mismo
   taller (`sombreadoVegetal.js`) que ya existe.
3. Duplicación de sistemas: `MundoParamo3D.jsx` tiene su propio código de frailejón/musgo/quenua
   independiente del taller `floraParamo.geom.js`/`sombreadoVegetal.js` usado en Bosque — dos
   implementaciones paralelas del mismo ecosistema con calidad visual distinta.

**DRs necesarios.** Ninguno nuevo — `flora-del-paramo-para-el-mundo-3d-bosqueclima-de-chagra-*`
y `fauna-andina-realista-en-3d-*` ya cubren frailejón, chusque, cardón, romero, musgo, cóndor,
oso, colibrí de páramo. Falta implementación, no investigación.

---

## 4. SIERRA (dos implementaciones — una cableada, floja; otra rica, huérfana)

### 4a. `SierraMonte3D.jsx` (CABLEADA, ruta `sierra_global`/`sierra`)

**Inventario real.** `sierraMonte.geom.js`: 3 tipos de vegetación (`palmera`, `cafeto`,
`frailejon`) + partículas de `niebla`. Sin nombre de especie en el comentario — son formas
genéricas ("árbol frondoso genérico" según el propio código, `sierraMonte.geom.js:264`).

**Densidad (tier `alto`):** palmera 70 + cafeto 95 + niebla 85 + frailejón 70 = **320
instancias** — muy denso numéricamente.

**Fidelidad de biodiversidad.** Baja pese al volumen: solo 3 categorías genéricas para
representar 4 pisos térmicos completos (el comentario de cabecera promete "palma abajo, café,
bosque de niebla, frailejón y roca y nieve arriba" pero el "bosque de niebla" no tiene especie
propia — es el mismo "árbol frondoso" reetiquetado). **Cero fauna** (`grep` sin resultados para
cóndor/ave/creature/fauna en todo el archivo) pese a que la Sierra Nevada de Santa Marta es LA
sede simbólica del cóndor andino en el imaginario colombiano.

### 4b. `GaleriaSierraArboles.jsx` (**construido, NO cableado — huérfano**)

Registrado en `src/prodApp/ProdChagraApp.jsx:56` (`componentMap.GaleriaSierraArboles`) pero
**sin ninguna entrada de ruta en `src/config/rutasProdChagraApp.js`** — inalcanzable en prod.
Usa `arbolMayor.geom.js`, que sí tiene 4 especies reales con nombre científico, una por piso:
queñua/*Polylepis quadrijuga* (páramo), roble andino/*Quercus humboldtii* (frío), guayacán
amarillo/*Handroanthus chrysanthus* (templado, "florece de oro sin una sola hoja"), ceiba/
*Ceiba pentandra* (cálido, con raíces tablares). Cada especie es el "árbol mayor" ancla de un
diorama con su propia viñeta de vida (palmas y costa junto a la ceiba, cafetos bajo el guayacán,
robledal de niebla, laguna+frailejones del páramo) y **fauna realista** (cóndor andino planeando).
También incluye un slider climático hoy→2050 que anima el corrimiento de pisos térmicos
(termofilización) — contenido didáctico que no existe en ningún otro mundo del repo.

**BUGS/GAPS (prioridad crítica, fix barato):**
1. **`GaleriaSierraArboles.jsx` es estrictamente mejor que `SierraMonte3D.jsx` en biodiversidad
   (4 especies nombradas + fauna vs. 3 genéricas + 0 fauna) y está sin cablear.** Esto no es un
   gap de contenido: es un gap de ruta. Agregar su entrada a `NUCLEO_3D` en
   `rutasProdChagraApp.js` (y decidir si reemplaza o complementa a `sierra_global`) resuelve de
   un solo cambio la mitad de los problemas de biodiversidad de la Sierra.
2. `SierraMonte3D.jsx` (mientras siga siendo la ruta activa) no tiene fauna — ni el cóndor, la
   especie más asociada a la Sierra Nevada.
3. `SierraMonte3D.jsx` reduce el "bosque de niebla" (piso frío) a la misma malla genérica que el
   cafetal — sin roble/encenillo/aliso que sí existen en `floraParamo.geom.js` y que
   `GaleriaSierraArboles` sí referencia indirectamente vía `arbolMayor.geom.js`.

**DRs necesarios.** Ninguno — `sierra-geo-render-gemini-2026-06-19.md` y
`sierra-cultural-nav-gemini-2026-06-19.md` ya existen y alimentaron `arbolMayor.geom.js`. Es
trabajo de wiring + de portar la riqueza de 4b a 4a (o promover 4b a la ruta principal).

---

## 5. CULTIVOS

### 5a. Cafetal (`CafetalVivo3D.jsx` → `MundoCafetal.jsx`, CABLEADO)

**Inventario:** `floraCafetal.geom.js` — cafeto/*Coffea arabica* + cereza (color por instancia:
verde→pintón→rojo), guamo/*Inga*, nogal cafetero/*Cordia alliodora*, plátano intercalado.
**Densidad (alto):** cafeto 120, cereza 360, guamo 7, nogal 3, plátano 6 — muy denso y correcto
agronómicamente (café bajo sombra, no en hilera al sol). **Fauna:** solo 3 instancias estáticas
(2 mariposa + 1 colibrí, `EscenaCafetalVivo.jsx:213`) pese a que el propio copy del mundo dice
*"bajo el sombrío vuelven las aves, las mariposas y los polinizadores"* — la densidad de fauna no
acompaña esa afirmación.

### 5b. Cacao (`CacaoVivo3D.jsx` → `MundoCacao.jsx`, CABLEADO)

**Inventario:** `floraCacao.geom.js` — cacao/*Theobroma cacao* con caulifloria correctamente
modelada (mazorca nace del tronco, no de ramas finas), guamo, plátano. **Densidad (alto):**
cacao 90, mazorca 300, guamo 6, plátano 8. **Fauna:** 3 instancias (2 mariposa + 1 escarabajo).

### 5c. Papa (`PapaVivo3D.jsx` → `MundoPapa.jsx`, CABLEADO)

**Inventario:** `floraPapa.geom.js` — mata de papa criolla/*Solanum phureja*, flor (lila/blanca
por instancia), tubérculo cosechado (amarilla/roja/morada — diversidad varietal real), pajonal,
frailejón lejano como silueta de fondo (correcto: anuncia el páramo cerca sin invadir el piso).
**Densidad (alto):** mata 130, flor 300, papa 44, paja 90. **Fauna:** 3 instancias (2 mariposa +
1 colibrí).

### 5d. Milpa — **el cultivo peor servido en 3D**

Ruta `milpa`/`milpa_cultivo` monta `<Mundo mundoId="milpa">` (framework genérico
`mundoData.js:445-468`), NO un `.geom.js` dedicado como los tres anteriores. Es un **cutaway**
(corte transversal) con **UNA sola instancia** de maíz, UNA de fríjol (con nódulos de *Rhizobium*
bajo tierra, dato correcto: 30-60 kg N/ha) y UNA de calabaza — ilustra el concepto de las Tres
Hermanas pero no es un campo poblado. Las versiones "juego" (`MilpaSimulator.jsx`,
`JuegoLaMilpa.jsx`) son 2D (sin `Canvas`/`three`) — no cuentan como mundo 3D.

**BUGS/GAPS de Cultivos:**
1. **Milpa no tiene una parcela 3D poblada** — es el único de los 4 cultivos insignia sin un
   `.geom.js` propio al estilo `floraCafetal`/`floraCacao`/`floraPapa`. Dado que la asociación
   real es visualmente rica (maíz de tutor + fríjol trepador + calabaza rastrera cubriendo el
   suelo), esto es un hueco visible.
2. Fauna de los tres cultivos cableados (cafetal/cacao/papa) es uniformemente delgada: 3
   instancias fijas cada uno, siempre el mismo patrón (2 mariposa + 1 colibrí/escarabajo) — no
   varía con la altitud/piso ni crece con el tier salvo un recorte a 2 en cacao.
3. Sin gremio de aves/mamíferos específicos del piso cálido (cacao) — el único fauna-DR del repo
   (`fauna-andina-realista-*`) está centrado en fauna de páramo/frío (oso, cóndor, colibrí de
   páramo); no hay grounding de fauna de piso cálido/tropical bajo (tucanes, guacamayas, mono
   aullador) para nutrir Cacao ni el dosel cálido de Bosque.

**DRs necesarios (nuevo, no existe hoy):**
- Fauna del piso cálido/tropical bajo colombiano para 3D (tucanes, guacamayas, primates
  pequeños, mariposas de bosque húmedo) — no hay equivalente al DR de fauna andina/páramo para
  esta franja.

**DRs que YA existen y alcanzan (no lanzar de nuevo):** `cacao-saf-red-de-aristas-
agroecologica*`, `grounding-cacao-plagas-colombia-*`, `milpa-maiz-frijol-calabaza-y-
policultivos-colombia*`, `aristas-milpa-core-maiz-frijol-calabaza-colombia-*`,
`aristas-tabla-milpa-maiz-frijol-calabaza-colombia-*` (para poblar una milpa 3D densa, la
investigación agronómica YA está).

---

## 6. LECHERÍA — **el mundo no existe**

No hay ningún archivo, ruta ni componente de "lechería"/ganadería lechera dedicado (`grep`
exhaustivo sin resultados de `lecheria` como mundo 3D). El único ganado en 3D vive dentro del
landmark `'animales'` del Valle (`animales.jsx`): vacas con geometría real por raza
(`fincaRealista.geom.js`) en un potrero con cercas vivas reales — pero es una escena chica de
paso, no un mundo propio con el ciclo lechero (ordeño, cuajada/queso, terneros, pastoreo
rotacional Voisin). El patrón para construirlo YA existe en el repo: `MundoGallinero3D.jsx`
implementa exactamente el patrón de pastoreo rotacional por parcelas que una lechería
necesitaría, solo que para gallinas.

**DR ya existe y está listo para consumir:** `cadena-lactea-campesina-agroecologica-en-colombia-
por-piso-termico-ganaderia-lechera--quesos-y-deriv-33f3eb92-{gemini,glm}-2026-06-19.md`, más
`rotacion-de-potreros-y-manejo-holistico-en-ganaderia-de-montana-andina-*` y
`sistemas-silvopastoriles-*`. **No hace falta lanzar DR nuevo — hace falta construir el mundo.**

---

## 7. PISCICULTURA — **el mundo no existe, y no hay ni un placeholder**

`grep` exhaustivo por pisci/trucha/mojarra/pez en `src/` no devuelve nada: no hay ruta, no hay
mockup, no hay ni una mención en `mundoData.js`. Es el único de los mundos nombrados en el
alcance de esta auditoría que **no tiene ni siquiera un diorama viejo** que mejorar.

**DR ya existe y está listo para consumir:** `piscicultura--acuicultura-campesina-de-pequena-
escala-en-colombia-por-piso-termico-trucha-frio-mojar-5b59fe75-{gemini,glm}-2026-06-19.md`.
**No hace falta lanzar DR nuevo — hace falta construir el mundo desde cero.**

---

## 8. AGUA (`src/mockups/MundoAgua3D.jsx`, CABLEADO, ruta `diorama_agua`)

**Inventario real.** El ciclo del agua está bien pensado a nivel de puesta en escena (nacimiento
→ quebrada → bocatoma con caudal ecológico visible → reservorio → riego → filtración por capas →
nube → lluvia), pero la vegetación es un único `function Arbol()` genérico: cono sobre cilindro,
sin identidad de especie (`MundoAgua3D.jsx:415-428`) — el mismo patrón "árbol de navidad" que el
propio repo ya diagnosticó como error en `arbolMayor.geom.js` y corrigió para la Sierra.

**Densidad.** Terreno bien poblado de elementos de infraestructura (bocatoma, canal, reservorio,
camas de cultivo) pero la vegetación de ribera es escasa y genérica.

**Fidelidad de biodiversidad.** **Fauna: cero.** `grep` de pez/garza/rana/libélula/CREATURES/
Fauna sobre todo el archivo no devuelve nada. Es llamativo para un mundo cuya tesis explícita es
*"la FÁBRICA DE AGUA de Colombia"* — sin una sola forma de vida asociada al agua (ni pez de
quebrada, ni garza, ni libélula, ni rana). Tampoco hay vegetación ribereña con nombre (sauco,
helecho de quebrada, aliso ribereño).

**BUGS/GAPS:**
1. Sin fauna acuática/ribereña — el gap más visible de todo el world.
2. El `Arbol` genérico debería reusar especies reales ya construidas (aliso —*Alnus acuminata*—
   ya existe en `floraParamo.geom.js` y es literalmente un árbol de ribera de montaña en la vida
   real).

**DRs necesarios (nuevo, no existe hoy):**
- Fauna acuática y ribereña de quebrada andina colombiana para 3D (peces nativos de agua fría —
  capitán de la sabana, guapuchas—, garza, libélula, rana). No se encontró ningún DR existente
  con este enfoque (se buscó "acuático", "libélula", "garza", "anfibio", "pez/ictio" sin
  resultados en las 512 entradas de `DR-FANOUT`).

**DR ya existente y subutilizado:** `ciclo-del-agua-en-la-finca-andina-para-el-3d-de-chagra-
{gemini,glm}-2026-06-19.md` — cubre el ciclo hídrico (bien reflejado en la escena) pero no fauna.

---

## 9. SUELO / SUBSUELO (`MundoSueloVivo3D.jsx`, `MundoSubsuelo.jsx`, ruta `diorama_suelo`/`subsuelo`)

**Inventario real.** Cutaway de los 5 horizontes (O-A-B-C-R) con UNA "planta héroe" (brote de
fríjol) bajando por O→A→B y micorrizas (hifas doradas) abrazando la raíz. La micro-fauna reusa
`DioramaMicrofaunaSuelo` (`MicrofaunaSuelo.jsx`): lombriz, colémbolo, ácaro, red de hifas,
bacterias — con nombres reales, no genéricos.

**Densidad/fidelidad.** Correcto para su propósito didáctico (es un diagrama de corte, no un
campo); la micro-fauna está bien fundamentada (coincide con el DR
`micro-y-meso-fauna-del-suelo-para-el-mundo-3d-del-suelo-de-chagra-*`, que ya cita
*Martiodrilus* y *Dichotomius* — aunque el código no llega a nombrar género/especie en pantalla,
solo "lombriz"/"escarabajo" genéricos en el copy).

**GAP menor:** los nombres de especie de la micro-fauna (que el DR sí documenta:
*Martiodrilus*, *Dichotomius*) no llegan al usuario ni al código — se quedan en "lombriz"/
"escarabajo" sin género. Bajo impacto (es fauna microscópica, difícil de ver el detalle igual),
pero es la brecha entre "grounding disponible" y "grounding usado".

**DRs necesarios.** Ninguno — `micro-y-meso-fauna-del-suelo-para-el-mundo-3d-del-suelo-de-
chagra-{gemini,glm}-2026-06-19.md` y `salud-biologica-del-suelo-andino-indicadores-campesinos-*`
ya cubren esto.

---

## 10. COMPOST (`MundoCompost3D.jsx`, CABLEADO, ruta `diorama_compost`)

Anillo de 4 estaciones (residuos → pila por capas → lombricultivo con lombriz roja
californiana, correcta → suelo vivo), reusa `DioramaMicrofaunaSuelo`. Correcto para su alcance
didáctico — no es un mundo de biomasa vegetal, es un proceso. Sin gaps de biodiversidad
relevantes más allá de los ya cubiertos en Suelo (§9).

## 11. FERMENTOS (`MundoFermentos3D.jsx`, CABLEADO, ruta `diorama_fermentos`)

Taller de bioinsumos (MM, bocashi, biol, caldos minerales) con el mismo `Arbol` genérico de
fondo que Agua (`MundoFermentos3D.jsx:238-252`). Sin fauna. Bajo impacto porque el foco del
mundo es un proceso artesanal, no un ecosistema — pero el árbol de fondo podría reusar especies
reales sin costo adicional (mismo fix que Agua).

## 12. MICROFAUNA (`MundoMicrofauna3D.jsx`, CABLEADO, ruta `diorama_microfauna`)

Vitrina táctil sobre `DioramaMicrofaunaSuelo`, con un nematodo benéfico nuevo agregado. Bien
fundamentado y con nombres reales de organismos en el copy educativo. Sin gaps relevantes.

## 13. ABEJAS (`MundoAbejas3D.jsx`, CABLEADO, ruta `diorama_abejas`)

Enjambre de `AbejaAngelita` (abeja nativa sin aguijón, correcto dato que conviven con colmenas
Langstroth). Sin flora con identidad propia alrededor (el paisaje es genérico pasto/madera). Dato
positivo: distingue correctamente meliponas nativas de *Apis mellifera* europea — coherente con
`polinizadores.geom.js` que SÍ tiene el mismo elenco pero está sin cablear (ver §14).

## 14. GALLINERO (`MundoGallinero3D.jsx`, CABLEADO, ruta `diorama_gallinero`)

8 gallinas en posiciones fijas + 4 parcelas de pastoreo rotacional (Voisin, bien explicado en el
copy) + 18 "cultivos" del huerto aliado que son **geometría idéntica repetida** (cono+2 esferas,
`MundoGallinero3D.jsx:185-199`) sin ninguna variación de especie — el huerto detrás del gallinero
podría fácilmente reusar variedad real (hay DR de huerto biodiverso disponible). Sin nombres de
raza para las gallinas pese a que sí existe DR de razas.

**DR ya existente:** `diseño-de-huerto-biodiverso-y-sucesion-de-siembras-para-autoconsumo-
andino-*`, `grounding-gallinas-ponedoras-campesinas-*`, `aves-de-corral-agroecologicas-*`.

## 15. RESTAURACIÓN EN EL TIEMPO (`RestauracionEnElTiempo.jsx`, CABLEADO, ruta `restauracion`)

**Bien fundamentado.** `sucesion.geom.js` reutiliza directamente las especies de
`floraParamo.geom.js` (aliso, yarumo, encenillo, gaque, roble, mortiño, romerillo) más queñua
joven (*Polylepis*) regresando con el bosque maduro — la sucesión ecológica real de un potrero
degradado volviendo a monte, con especies reales en cada cohorte de edad. Uno de los mundos mejor
resueltos junto con Bosque Vivo. Sin gaps de biodiversidad relevantes.

## 16. VITRINA MAESTRA (`VitrinaMaestraMundos.jsx`, CABLEADO, ruta `vitrina_maestra`)

Es un HUB de navegación (15 arcos-portal), no un bioma — cada viñeta (`vinetasMundos.geom.js`)
es una miniatura de ~10-15 cm de radio visual. Dentro de ese límite, tiene identidad razonable:
la viñeta de páramo dibuja "TRES frailejones con enagua y roseta plateada (el ícono, de verdad)"
(`vinetasMundos.geom.js:769`), hay viñetas dedicadas a café, cacao, papa, sierra, animales, agua,
suelo, compost. No aplica el mismo estándar de densidad que un mundo navegable — es correcto que
no lo tenga. Sin gaps que valga la pena priorizar.

## 17. POLINIZADORES (`src/visual/mundo3d/polinizadores/*`) — **construido, cero cableado**

**El contenido ecológicamente más sofisticado de todo el repo, y es TOTALMENTE INALCANZABLE en
producción.** `grep` confirma: ningún archivo fuera de `src/visual/mundo3d/polinizadores/`
importa `EscenaPolinizadores.jsx`; no aparece en `rutasProdChagraApp.js`; no aparece en el
`componentMap` de `ProdChagraApp.jsx`. Es código completo, comentado, testeable — y muerto en el
árbol de rutas.

**Inventario (si se cableara):**
- `polinizadores.geom.js`: **8 especies de polinizador**, cada una con su morfología distintiva
  para reconocerse sin etiqueta — angelita (nativa sin aguijón), *Apis mellifera*, abejorro,
  colibrí (*Colibri coruscans*, mismo dato que `Colibri.jsx`), sirfido (mosca mimética de abeja,
  con los ojos rojizos y un solo par de alas como pistas biológicas correctas), mariposa,
  escarabajo, murciélago filostómido nocturno.
- `floresSindrome.geom.js`: **7 síndromes florales reales** ligados a su polinizador — tubo/rojo
  para colibrí, brocha/blanca nocturna para el guamo, campana/amarilla con flor macho y hembra
  separadas para cucurbitáceas, plato/morada con guías de néctar UV para abejas, margarita para
  mariposa, copa para escarabajo, corona (la pasiflora — maracuyá/curuba/gulupa, con sus 5
  anteras y 3 estigmas correctos) para un polinizador fuerte.
- `meliponario.geom.js`, `ParcelaCultivos.jsx`, `RedPolinizacion.jsx` (la red de polen tejida
  entre flor y bicho, visualizando el servicio invisible), ciclo día/noche con relevo de
  especies.

**BUGS/GAPS:**
1. **Cablear la ruta es la acción de mayor retorno de TODA esta auditoría** — contenido ya
   existe, ya está grounded, y es precisamente sobre el tema central de la auditoría
   (biodiversidad funcional). Cero costo de investigación, solo falta un `path` en
   `rutasProdChagraApp.js` + una entrada en `componentMap`.

**DRs necesarios.** Ninguno — `grounding-abejas-polinizacion-colombia-{gemini,glm}-*`,
`polinizadores-nativos-colombianos-y-cultivos-pollinatedby-*`, `polinizadores-nativos-y-manejo-
de-abejas-sin-aguijon-meliponas-colombia-*`, `polinizadores-nativos-y-meliponas-por-cultivo-*`,
`polinizacion-{gemini,glm}-2026-07-13.md` — ya alimentaron este módulo. Es, con Bosque Vivo, el
mundo mejor investigado del repo. Solo necesita salir a producción.

---

## 18. BIODIVERSIDAD (concepto, no hay mundo 3D dedicado)

No existe un mundo 3D llamado "biodiversidad". `BiodiversidadView.jsx` es un dashboard 2D de
estadísticas (estratos/gremios de las especies sembradas por el usuario, sin `Canvas`/`three`).
El contenido 3D más cercano al concepto de "biodiversidad pura" son `DoselBiodiverso` (dentro de
Bosque Vivo, cableado y bien hecho) y el mundo POLINIZADORES (sin cablear, §17). No es
necesariamente un gap — probablemente "biodiversidad" nunca debió ser un mundo aparte sino la
propiedad transversal que esta auditoría mide — pero vale la pena que quede explícito: si el
operador esperaba un mundo dedicado, no existe.

## 19. MONTAÑA (`MontanaMundosCampesino.jsx`, CABLEADO, ruta `montana_mundos`) — nota de método

Esta pantalla es un **mapa cinematográfico ilustrado en SVG** (capas de parallax con `<path>`/
`<rect>`, clases como `mm2-arbolito`/`mm2-arbol-mango`), no una escena WebGL con flora/fauna
instanciada como el resto de los mundos de esta lista. La vegetación que trae es iconográfica
(un arbolito genérico repetido + un mango puntual) — coherente con su rol de "mapa de
wayfinding", no de bioma navegable. Se anota para que quede claro por qué esta sección no lleva
tabla de especies/conteos: la métrica de densidad de instancias no aplica igual a un ilustración
2D vectorial.

---

## Tabla resumen

| Mundo | Densidad (1-10) | Biodiversidad (1-10) | Top-3 acciones |
|---|---|---|---|
| Bosque Vivo | 9 | 9 | (1) Fauna en el arroyo (2) Housekeeping de nombre de archivo (3) Mantener como referencia de calidad para el resto |
| Restauración en el tiempo | 7 | 8 | (1) Nada urgente — ya reusa el taller bien |
| Polinizadores | 8 (potencial) | 10 (potencial) | **(1) CABLEAR LA RUTA — máxima prioridad de toda la auditoría** (2) validar perf con el resto del framework (3) enlazar desde Vitrina Maestra |
| Sierra — GaleriaSierraArboles | 6 (potencial) | 8 (potencial) | (1) Cablear ruta o promover sobre SierraMonte3D (2) validar el slider climático 2050 en prod (3) sumar más fauna que solo el cóndor |
| Cafetal | 9 | 7 | (1) Más fauna (aves reales, no solo 3 fijas) (2) Reusar en el landmark del Valle (3) Nada más urgente |
| Cacao | 8 | 7 | (1) Más fauna piso cálido (2) DR de fauna tropical (3) — |
| Papa | 8 | 6 | (1) Más fauna (2) Acompañantes de piso frío además del frailejón lejano (3) — |
| Páramo (MundoParamo3D) | 7 | 6 | (1) Fauna terrestre (venado, curí) (2) Migrar al taller de Bosque Vivo (3) Sumar colibrí como en Bosque |
| Suelo/Subsuelo | 4 | 6 | (1) Nombrar género/especie de microfauna en UI (2) — (3) — |
| Compost | 3 | 5 | (1) Sin cambios urgentes |
| Microfauna (dedicado) | 5 | 7 | (1) Sin cambios urgentes |
| Gallinero | 5 | 3 | (1) Variar especies del huerto aliado (2) Nombrar razas de gallina (3) — |
| Abejas | 4 | 4 | (1) Flora con identidad alrededor del colmenar |
| Vitrina Maestra | n/a (hub) | 6 | (1) Enlazar Polinizadores cuando se cablee |
| Valle (fondo ambiental) | 4 | 3 | (1) **Reusar geometrías reales ya existentes en vez de conos/bolas genéricas** (2) Más densidad en el terreno 48×48 (3) Landmark café debería reusar floraCafetal |
| Sierra — SierraMonte3D (activa) | 7 | 3 | (1) Fauna (empezar por el cóndor) (2) Especies reales por piso, no 3 genéricas (3) O reemplazar por GaleriaSierraArboles |
| Agua | 3 | 1 | (1) **Fauna acuática/ribereña (cero hoy)** (2) Árbol genérico → especie real (aliso) (3) DR de fauna acuática |
| Fermentos | 3 | 2 | (1) Árbol genérico → especie real |
| Milpa (3D real) | 1 | 4 | (1) **Construir parcela poblada `.geom.js` como Cafetal/Cacao/Papa** (2) — (3) — |
| Lechería | 0 | 0 | (1) **Construir el mundo — DR ya listo** (2) Reusar patrón de pastoreo rotacional de Gallinero (3) — |
| Piscicultura | 0 | 0 | (1) **Construir el mundo desde cero — DR ya listo** (2) — (3) — |
| Biodiversidad (mundo dedicado) | n/a | n/a | No existe; probablemente no debería existir aparte — es la propiedad transversal que mide esta auditoría |
| Montaña (mapa SVG) | n/a | n/a | Fuera de la métrica — es wayfinding ilustrado, no bioma 3D |

---

## Lista consolidada de acciones (sin duplicar investigación existente)

### Wiring, no investigación (retorno inmediato, cero DR)
1. **Cablear `EscenaPolinizadores` a una ruta del manifiesto** — el gap de mayor impacto de toda
   la auditoría. Todo el grounding ya existe.
2. **Cablear o promover `GaleriaSierraArboles.jsx`** sobre/junto a `SierraMonte3D.jsx` — 4
   especies reales por piso + fauna, ya construido.
3. Reusar `floraCafetal.geom.js`/`floraPapa.geom.js`/`floraParamo.geom.js` en la vegetación de
   fondo del Valle (`VEGETACION_PISOS`/`SILUETAS_MATA`) en vez de conos/bolas genéricos.
4. Construir la parcela 3D poblada de Milpa (`.geom.js` dedicado, mismo patrón que Cafetal/
   Cacao/Papa) — la investigación agronómica ya está en 3+ DRs de milpa.
5. Construir Lechería y Piscicultura reusando el patrón de `MundoGallinero3D.jsx` (pastoreo
   rotacional) — DRs ya existen para ambos.

### DRs nuevos a lanzar (gap real de grounding, no se encontró equivalente en las 512 entradas)
1. **Fauna acuática y ribereña de quebrada andina colombiana para 3D** (peces nativos de agua
   fría, garza, libélula, rana) — para el mundo AGUA, hoy en 0 fauna.
2. **Fauna del piso cálido/tropical bajo colombiano para 3D** (tucanes, guacamayas, primates
   pequeños) — para CACAO y el estrato cálido de DoselBiodiverso; el único DR de fauna existente
   (`fauna-andina-realista-*`) está centrado en páramo/frío.

### DRs que YA EXISTEN y solo faltan consumirse (no relanzar)
- `piscicultura--acuicultura-campesina-de-pequena-escala-en-colombia-por-piso-termico-trucha-
  frio-mojar-5b59fe75-{gemini,glm}-2026-06-19.md`
- `cadena-lactea-campesina-agroecologica-en-colombia-por-piso-termico-ganaderia-lechera--quesos-
  y-deriv-33f3eb92-{gemini,glm}-2026-06-19.md`
- `milpa-maiz-frijol-calabaza-y-policultivos-colombia--aristas-citadas-con-doiopenalex-v3-
  gemini-2026-06-19.md`, `aristas-milpa-core-maiz-frijol-calabaza-colombia-gemini-2026-06-19.md`,
  `aristas-tabla-milpa-maiz-frijol-calabaza-colombia-gemini-2026-06-19.md`
- `grounding-abejas-polinizacion-colombia-{gemini,glm}-2026-06-19.md`,
  `polinizadores-nativos-*-2026-06-19.md` (×3), `polinizacion-{gemini,glm}-2026-07-13.md`
- `sierra-geo-render-gemini-2026-06-19.md`, `sierra-cultural-nav-gemini-2026-06-19.md`
- `diseño-de-huerto-biodiverso-y-sucesion-de-siembras-para-autoconsumo-andino-{gemini,glm}-
  2026-06-19.md` (para variar el huerto del Gallinero)
- `flora-del-paramo-para-el-mundo-3d-bosqueclima-de-chagra-{gemini,glm}-2026-06-19.md`,
  `fauna-andina-realista-en-3d-*-2026-06-19.md` (para enriquecer `MundoParamo3D.jsx` con el
  mismo taller que ya usa Bosque Vivo)
