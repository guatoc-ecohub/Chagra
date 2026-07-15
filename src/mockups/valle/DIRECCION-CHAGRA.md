# DIRECCIÓN-CHAGRA — el valle y los mundos, mirados con ojo de director

> Rama `fable/direccion-valle` · base `dev` · 2026-07-14
>
> **Parte I**: la dirección del valle (aplicada en esta rama).
> **Parte II**: revisión de dirección de los mundos "listos" — con la
> separación que pidió el operador: **qué es dirección** (arreglable con
> cámara/encuadre/escala/ritmo/disposición) **y qué es acabado del arte**
> (va a otra pasada / DR de realismo). Esa separación decide si un mundo se
> re-dirige o se rehace.

---

# PARTE I — EL VALLE
>
> El valle 3D es LA CASA de Chagra: lo primero que ve el campesino y desde
> donde sale a todo. Tenía piezas buenas **sueltas** (cámara de director,
> aplane New Donk, ciclo diurno, criaturas, tiering); esta pasada las compone.
> La ley nueva vive como datos en `src/visual/mundo3d/direccion/composicionValle.js`;
> las piezas r3f en `src/mockups/valle/composicionValle3D.jsx`.

## Lo que estaba mal (diagnóstico)

1. **El valle no tenía casa.** La mirada de reposo (`MIRA_VALLE`) aterrizaba
   en pasto vacío: el ojo no tenía dónde descansar y el conjunto se leía como
   un menú de landmarks, no como una finca.
2. **Nada conectaba los lugares.** Sin senderos ni suelo trabajado: los
   11 lugares estaban *puestos*, no *compuestos*.
3. **El frente inferior amontonado.** Corral, semillero, eras y hongos a
   <2 u entre sí a la izquierda; el frente derecho vacío; el mercado tapando
   el centro-bajo del encuadre.
4. **Solo el rótulo era tocable.** Tocar la milpa o el corral (la cosa
   grande y obvia) no hacía nada.
5. **Los velos Odyssey aprobados estaban huérfanos.** `VeloOdyssey` (la pieza
   que el operador aprobó) solo se usaba en su demo; el flujo real usaba el
   velo genérico viejo (`TransicionMundo`).
6. **Entrar y volver se sentían igual** (misma velocidad de cámara), y la
   entrada real (`EntradaValle3D`) ni siquiera encendía la cámara de director
   — el barrido establishing solo corría en la escena del framework.
7. **La jerarquía de personajes no estaba escrita.** Angelita era central de
   facto, pero no había ley (tamaños, bordes, luz) ni hueco para los
   secundarios de tierra (el oso).

## Decisiones (qué se hizo y por qué)

### 1. Cámara
- **`camaraDirector` encendida en `EntradaValle3D`** (antes solo en
  `EscenaValle`): la primera impresión es el barrido cine de `DirectorValle`
  (6 s, acelerable con el primer gesto, una vez por sesión), no un plano seco.
  Gateado por tier/reduced-motion adentro — gama baja conserva el encuadre fijo digno.
- **El regreso exhala** (`CamaraViajera`): entrar es decidido (lerp 0.07),
  volver es más lento (0.042) y abre a 18 u — llegar a casa se siente
  distinto a salir de ella.
- El trabajo previo de `CamaraDirectorDemo` ya estaba absorbido por
  `CamaraDirector`/`DirectorValle`; no se duplicó nada.

### 2. Fluidez
- **VOLVER al valle ahora usa `VeloOdyssey`** (velo `luz`: "De vuelta a
  casa…"), con el contrato correcto: cubre → swap en la meseta
  (`onCubierto` → `completarViaje`) → **revela** el valle ya montado. Antes el
  swap iba al final del velo viejo = corte seco a pantalla descubierta.
- ENTRAR conserva el mural New Donk aprobado (aplane + destello); si el flag
  se apaga, cae al velo Odyssey del destino (identidad andina), no al genérico.
- El velo clásico queda SOLO como respaldo de viajes que nadie armó
  (deep-link inicial).
- **Qué es tocable se ve sin leer**: cada lugar navegable tiene su **patio de
  tierra pisada** (afordancia diegética, 1 draw call instanciado) y los
  **senderos llegan hasta él**; además **la geometría misma es botón**
  (tocar la milpa = entrar a cultivos) con cursor pointer en desktop.

### 3. Disposición (criterio real, no estético)
- **La casa campesina como ancla** (`CasaCampesina`): encalada, zócalo
  pintado, teja a dos aguas, ventana con luz cálida. No navegable: es el
  punto de silencio del cuadro, apenas a la izquierda de la mira de reposo
  (tercios). De noche es el corazón del valle.
- **Tres franjas de uso** (documentadas en `composicionValle.js`):
  lo **diario** rodea la casa al frente (corral, eras, semillero, huerta);
  lo **semanal** a media ladera (milpa, cafetal, agua); lo **contemplativo**
  al fondo (monte, veleta del páramo).
- **Movimientos** (`COMPOSICION_LUGARES`, override sin tocar `valleData`):
  mercado → borde derecho-frontal (la *salida* a la plaza, con su sendero que
  sale del cuadro); huerta → pegada a la casa (su propia narración lo decía);
  corral/semillero/eras/hongos → aire mínimo ~2 u; milpa cede un paso.
  `agua`, `cafe`, `disenio` y `clima` ya estaban bien contados: no se tocaron.
- **Senderos** (`SENDEROS_VALLE`): el circuito del trajín (casa→eras→
  semillero→corral), el camino de la plaza (casa→huerta→mercado→fuera del
  cuadro), la subida del lote y el viaje del balde. El camino dice qué se usa.

### 4. Jerarquía de personajes ⭐
- **La ley en números** (`JERARQUIA_PERSONAJES`): Angelita es la única
  protagonista — 44-58 px, primer plano, follow de cámara, y ahora **la única
  con luz propia** (pointLight cálida que la sigue, solo donde el perfil ya
  paga luces). Los secundarios: techo duro 30 px (~0.55×), bordes del valle,
  a ras de tierra, jamás capturan toques.
- **El hueco del oso, listo** (`SECUNDARIOS_TIERRA` + `SecundariosDeTierra`):
  registro-driven contra `CREATURES` — el oso andino de dev ya asoma en el
  borde del monte (junto al bosque) y el borugo en el matorral izquierdo;
  cuando `fable/oso-andino-completo` mergee, el dibujo mejora solo, sin tocar
  este mapa. Un slug ausente no monta nada.
- Registros respetados (GUIA-RUBBERHOSE, rama d4): los secundarios son
  personajes rubber-hose como billboards (igual que Angelita y las criaturas);
  la casa y los senderos son REALISTAS (geometría de mundo, sin tinta).

## Lo que NO pude arreglar (fuera de scope) — con el fix exacto

1. **Gemelo 2D y fallback divergen del mapa 3D.**
   `GemeloValle2D.jsx` (visual/mundo3d — rama activa) y `Valle2DFallback.jsx`
   leen `MUNDOS_VALLE` crudo → el mapa 2D no coincide con la composición.
   *Fix exacto*: en cada consumidor,
   `import { componerMundos } from '.../direccion/composicionValle.js'` y
   envolver: `componerMundos(MUNDOS_VALLE)`. En `GemeloValle2D` basta pasar
   `mundos={componerMundos(MUNDOS_VALLE)}` desde su host (acepta la prop).
2. **`EscenaValle` (framework) sigue con el velo del host que la monte.**
   El cableo de `VeloOdyssey` se hizo en `EntradaValle3D`; el host de
   `EscenaValle` (app-3d) debe montar el mismo patrón: estado local
   `{fase, destino}`, `onCubierto` → swap, `onFin` → desmontar.
3. **`micorrizas` no tiene ruta 2D** (`wire3DNav.js: micorrizas: null`,
   rama de wiring). *Fix*: mapear a `'subsuelo'` (el mundo subterráneo ya
   existe como vista) hasta que tenga pantalla propia.
4. **El mundo `clima` no puede entrarse** (`puedeEntrar` false → panel
   "pronto") aunque su escena YA existe como cielo táctil de `EscenaValle`.
   *Fix*: registrarlo en el registro de mundos como escena ambiental
   (`escena: 'valle'` + los toques de cielo), o mapear su CTA a
   `clima_boletin` como hace la montaña.
5. **El chip del compañero usa `AbejaAngelita` cruda**, no la Angelita v2 del
   agente (`src/visual/agente`, 9 estados, mirada que sigue). *Fix*: en
   `EntradaValle3D`, reemplazar el bloque `.valle-companero__cara` por
   `<Angelita estado={...} />` mapeando `gesto` → estado
   (`celebra`→`celebrando`, `reposo`→`descansando`, hablar→`hablando`).
   No lo hice porque `agente/` acaba de aterrizar y el mapeo de estados
   merece revisión del operador (es la cara de la IA).
6. **Los beats del director no corren en la entrada real**: `EntradaValle3D`
   no monta `FaunaAmbiental` ni pasa `beatsRef` (solo `EscenaValle` lo hace).
   *Fix*: copiar el patrón de `EscenaValle` (puntos + MutationObserver de
   `data-fase='gesto'` → `beatsRef`) o extraerlo a un hook
   `useBeatsDeFauna(raizRef)` compartido.
7. **`AcompananteMundo` y las posiciones de `valleData.LUGARES`** quedan como
   fuente cruda: si un frente agrega un lugar nuevo, decidir su sitio en
   `COMPOSICION_LUGARES` (o dejarlo sin override si nace bien puesto).

---

# PARTE II — LOS MUNDOS "LISTOS"

## 0. La vara: por qué las transiciones aprobadas SÍ funcionan

Las transiciones (`transiciones/`, aprobadas: "geniales") tienen cinco cosas
que a casi todo lo demás le faltan. Son la lista de chequeo de dirección:

1. **Asimetría con significado.** Entrar ≠ volver: entrar es ceremonial
   (descubrir, overshoot), volver es tibio y corto (regresar a casa). Dos
   coreografías, no una al revés. *Los mundos tratan llegar y salir igual.*
2. **Anticipación (el peso).** El velo primero SE RECOGE (14% de movimiento
   contrario) antes de lanzarse — squash & stretch del timing. *Las cámaras
   de los mundos arrancan sin tomar aire.*
3. **Identidad del lugar.** El velo lo elige el DESTINO (niebla del páramo,
   tierra que traga, hojas del monte, luz de la casa): la transición ya
   cuenta a dónde vas. *Los mundos usan recursos genéricos que no dicen
   dónde estás.*
4. **Contrato temporal honesto.** El swap ocurre GARANTIZADO bajo la meseta
   cubierta (timers deterministas, no `animationend`): el usuario jamás ve
   el corte. *El resto deja ver los cortes (montajes secos, botones que
   aparecen tarde).*
5. **Degradación con dignidad.** Gama baja recibe EL MISMO velo sin adornos,
   nunca una pantalla en blanco. La identidad no es negociable por tier.

## 1. BOSQUE VIVO / EL ENT (`bosque/` — NO TOCADA: rama activa)

**El hallazgo grave (dirección, no acabado):**

`MundoEntBosque.jsx:40` monta el botón "Bajar al microsuelo" con
`animation: entb-aparece 0.9s ease 5.6s forwards`. El comentario de `:26`
dice: *"La invitación aparece cuando la cámara ya llegó al claro (~5.2s de
caminata)"*.

**Esa caminata NO EXISTE.** `EscenaBosqueVivo.jsx` no importa
`CamaraDirector` ni corre un solo `useFrame` de cámara: la pose es fija
(`[1.5, 2.3, 12.5]`, fov 44, target `[0, 3.2, 0]`) desde el frame 0; lo único
que se mueve es `autoRotate` a 0.16. **El usuario mira una postal quieta
durante 5.6 segundos esperando un botón que cree que está llegando.** Ese es
el "no pasa nada" que se siente al entrar.

*Fix exacto*: montar `CamaraDirector` (o `DirectorValle`) en
`EscenaBosqueVivo` con `reposo=[1.5, 2.3, 12.5]`, `mira=[0, 3.2, 0]`,
`duracion≈3.4`, `unaVezClave='bosque'` — la caminata que el comentario
promete. El 5.6s pasa a ser consecuencia del barrido, no un temporizador
ciego. Con `reducedMotion`/tier bajo el botón ya aparece de una
(`.entb__panel--ya`): correcto, no tocar.

**Jerarquía del Ent (dirección, arreglable sin redibujar):**
El Ent maestro mide 7.75 de cima; el vecino más alto (aliso) llega a ~5.0.
Es **1.55×** — poco para "el anciano del páramo" (en grosor sí manda: radio
1.26 vs 0.24 del roble, ~5×). Los 15 árboles del bosque viven en un anillo
r 8.5–19 y **la niebla arranca en r=9** (`fog args=[…, 9, 34]`): el bosque
que debería dar escala se lo come la bruma. El Ent no se lee como gigante
porque **no hay contra quién medirlo**.
*Fix*: bajar `FLORA_TIER` de los árboles cercanos a r 6–9 (dentro de la
niebla útil, no detrás) o subir `fog.near` a ~14. Escala del Ent: no tocar
(la geometría está bien; es el contexto el que falla).

**Lo que es ACABADO, no dirección** (va al DR de realismo):
Las copas de TODAS las especies son racimos de `IcosahedronGeometry(s, 0)`
(bolas de 20 caras). El **aliso** es literalmente un árbol de navidad por
construcción — `floraParamo.geom.js:438-448` estrecha el radio con la altura:
`rad = (0.65 - f*0.5) * (0.4 + r()*0.8)` con `f = i/nBlobs` (0 abajo → 1
arriba) y encoge la bola (`s = 0.4 - f*0.18 + …`). Eso ES un cono discretizado.
El operador tiene razón y el diagnóstico es geométrico, no de gusto.
*Fix (otra pasada)*: silueta por especie — el aliso real es estrecho pero
IRREGULAR, con ramas que salen del fuste; no un cono de blobs.
**El Ent en sí NO entra ahí**: tiene barba de 15 mechones, parpadeo, mirada,
cejas, mandíbula, sway en tres capas desfasadas. Es de los mejores
ciudadanos del repo — no lo toquen en la pasada de realismo.

## 2. MICROSUELO / `bosque/EscenaEntMaestro.jsx` (NO TOCADA)

**Ojo primero — no está en la base**: el último commit del archivo es
`4d6259d2` ("capas del suelo v2 — la lección del Ent maestro, a nivel obra")
en `fable/capas-suelo-b2`, **sin mergear**. Lo que sigue describe la versión
de la base (`9b9a61e0`). **Verificar contra la v2 antes de actuar** — puede
que ya esté resuelto.

**Dirección:**
- **Bajar al microsuelo es un CORTE**, no un viaje: `setModo('microsuelo')`
  desmonta un Canvas y monta otro; lo único que hay es un fade CSS de 0.8s.
  Las dos escenas ni comparten pose (`[1.5,2.3,12.5]` fov 44 → `[4.5,2.0,14]`
  fov 46). Un mundo que se llama "BAJAR" y no baja.
  *Fix exacto*: `VeloOdyssey` con `destino='microsuelo'` → familia `tierra`
  ("el suelo se abre y lo traga a uno" — el velo existe, aprobado, y es
  EXACTAMENTE este momento). `onCubierto` → `setModo`; `onFin` → apagar.
  Es la pieza aprobada esperando su mejor uso en todo el repo.
- **La lección no se puede seguir**: ciclo automático de 18 s
  (`DUR_CAPA = 3.6` × 5 capas) sin control del usuario, y **el brazo del Ent
  es estático** — señala un punto fijo, no la capa activa. El maestro no mira
  lo que enseña.
  *Fix*: `BrazoMaestro` recibe `capaActiva` y lerpa la muñeca hacia
  `centrosCapas()[activa].cy`; y que un toque en una capa la fije (pausa el
  ciclo).
- **El "trueque azúcar–fósforo" NO EXISTE en la escena.** Lo más cercano son
  6 octaedros de **0.083 unidades** (`OctahedronGeometry(0.055,0)` × 1.5) en
  color `PALETA.arbusculo`, a 13.6 de la cámara, **sin rótulo ni leyenda**.
  El hotspot con el copy real ("Fósforo por azúcar", 💛) existe pero en otro
  módulo sin cablear: `mundoData.js:573`, `pos: [0.5, -2.1, 0.2]`.
  *Fix*: cablear ese hotspot + un rótulo `<Html>` en la capa micorrízica.
  Hoy la idea central del mundo es invisible.
- **Encuadre**: las 5 capas (profundidad total 4.79) ocupan ~41% del alto
  del frame y comparten cuadro con un Ent de 7.75 desplazado en x. Al bajar
  al suelo, el suelo debería LLENAR el cuadro.
  *Fix*: `target=[2.5, -2.4, 1.9]` (el centro real del corte) y
  `position≈[4.2, -0.6, 9]` — el corte manda, el Ent asoma.

## 3. SIERRA (`sierra/GaleriaSierraArboles.jsx`) — RECHAZADA → re-dirigida en esta rama

**Dirección vs acabado — el desglose:**

| Problema | ¿Dirección o acabado? | Estado |
|---|---|---|
| Cámara frontal-centrada `[0, 5.2, 16.6]` → target `[0, 2.7, 0.2]`: la montaña de frente como telón, sin escorzo — "maqueta de museo" | **Dirección** | **ARREGLADO**: pose ¾ descentrada (`CAMARA_SIERRA [3.4, 4.6, 15.6]`, mira `[-1.1, 2.5, 0.2]`) — tercios, diagonal cálido→nieve, sol a contraluz lateral |
| Aparece de golpe (fade del canvas y ya) | **Dirección** | **ARREGLADO**: `CamaraDirector` establishing + settle, clave `sierra` |
| 4 fichas de museo permanentes flotando (piso+árbol+binomio) | **Dirección** (jerarquía de información) | **ARREGLADO**: en reposo solo piso+árbol; binomio/rasgo/invitación al acercarse |
| "Los árboles feos": copas = nubes de icosaedro (`ArbolMayor` blobs), sin silueta por especie de verdad | **Acabado** | Pendiente — es EXACTAMENTE lo que el DR de realismo 3D debe resolver (siluetas: ceiba emergente de copa plana, guayacán florecido, roble denso, queñua multitronco de corteza roja que pela) |
| Escala árbol:montaña ~1:6 (5 775 m vs árbol de 30 m sería 1:200) | **Convención de diorama** — defendible (los árboles son ÍCONOS navegables), pero solo funciona si el acabado del árbol es digno; con blobs se lee como juguete | Nota para el DR |
| Héroes en zig-zag mecánico casi equidistante (`CENTROS` x: −6.5, −2.4, 2.4, 6.4) | **Dirección**, riesgo bajo | NO tocado: las posiciones fueron verificadas por línea de vista (comentario en el archivo); romper la equidistancia exige re-verificar oclusiones con captura. Fix sugerido: variar ±0.8 en x y re-verificar |

**Veredicto**: se re-dirige (hecho aquí) + una pasada de acabado SOLO en
`ArbolMayor.jsx`/`arbolesMayores.js`. No se rehace: monte, mar, bandas
climáticas, slider 2050, leyenda y cóndor están bien contados.

## 4. VITRINA MAESTRA (`mockups/VitrinaMaestraMundos.jsx`) — RECHAZADA

**Contexto importante**: el rechazo ("¿es 2D? feíta, merece reinvención
completa") es ANTERIOR a la revisión que hoy vive en el archivo — ya fue
reescrita como valle 3D con 12 portales de piedra en dos terrazas, viñetas
low-poly dentro de cada aro y el viaje Odyssey de túnel (dolly FOV 46→15 +
iris). El operador probablemente vio la versión vieja (o el fallback DOM de
tier bajo, que sí es 2D).

**Diagnóstico de la versión actual (dirección):**
- Lo que ya está bien: paisaje-lugar, viñetas que dicen a dónde se entra,
  viaje de túnel intacto (ley 4 de la vara ✓).
- Lo que sigue siendo menú: **anfiteatro simétrico** — dos arcos
  concéntricos de portales equidistantes mirando al centro (`ANGULOS_FRENTE`
  ±58/±35/±12) = una estantería curva. Es la misma grilla, ahora en 3D.
  Ningún lugar real acomoda 12 puertas en semicírculo.

**Qué DEBERÍA ser la puerta a los 12 mundos (propuesta de director):**
1. **La puerta maestra de la app ES el valle** (Parte I): los mundos ya son
   LUGARES con senderos, patios y jerarquía. No hay que inventar una segunda
   puerta — la vitrina duplica la función de la casa.
2. La vitrina queda como **sala de demos/QA** (su valor real hoy): probar los
   12 mundos y sus transiciones sin sesión. Para eso su forma actual sirve.
3. Si prod insiste en una galería: que los portales dejen la estantería y se
   siembren **en la ladera por piso térmico** (cálido abajo, páramo arriba —
   la MISMA gramática del valle y la sierra), con un camino que sube y el
   velo de cada portal con su identidad (`velosData.familiaDeVelo`). Eso es
   re-dirección (~1 día), no reinvención.

**Veredicto**: no rehacer otra vez. Decidir su ROL (demo vs puerta) antes de
gastar otra pasada de arte. Mi voto: demo; la puerta es el valle.

## 5. GRAFO (`grafo/NavegadorGrafo.jsx` — NO TOCADA: rama activa)

Corrida real del layout contra `public/grafo-relations.json` (352 nodos, tier
alto): `yMin −2.94 · yMax 7.61 · radioMax 7.31`, cámara
`[0, 7.56, 25.0]` fov 45, target `(0, 2.34, 0)`.

**Bug de encuadre (dirección, verificado — no es sospecha):**
`grafoLayout.js:192-196` calcula `yMax` **solo con las posiciones de nodos**,
ignorando las bandas. Las bandas `superparamo` (y=10) y `nival` (y=12.5)
tienen **población 0** pero **igual se dibujan** como aros
(`BandasPiso.jsx:65-77`, `opacity: vacia ? 0.45 : 0.8`). Resultado: el
encuadre cree estar componiendo 10.54 unidades (50% del frame) cuando el
contenido dibujado real va de −2.6 a 12.5 = **15.1 unidades (71% del
frame)** — los dos aros vacíos quedan pegados al borde superior, fuera del
cálculo.
*Fix exacto*: incluir las bandas en el cálculo —
`yMax = Math.max(...posiciones.map(p=>p.y), ...bandas.filter(b=>b.habitantes>0).map(b=>b.y))`
— **y no dibujar los aros de pisos vacíos** (un páramo sin especies no es
información, es ruido que descuadra). Con eso el rango cae a [0, 7.5] = 35%
del frame y la cámara puede acercarse de verdad.

**Lo que ya está bien**: eje Y = altitud (la misma gramática del valle y la
sierra ✓), espiral áurea dentro de banda, radio por población. No tocar.

**Dato de producto, no de arte**: **55 de 134 especies (41%) caen en
`sin_piso`** y viven en la banda de niebla a y=−2.6 — es la segunda banda más
poblada y está *debajo* del cálido. El grafo hoy dice, sin querer, que el 41%
del conocimiento de Chagra no tiene lugar en la montaña. Eso es dato faltante,
no dirección; pero es lo primero que se ve.

**Reencuadre visible al montar**: `OrbitControls` no recibe `target` (:219-231)
→ arranca en `[0,0,0]` y `CamaraEnfoque` lo lerpa a y=2.34 con
`k = 1 - exp(-dt*3.2)`: hay un tirón de ~1 s al entrar.
*Fix*: pasar `target={[0, centroY, 0]}` directo al `OrbitControls`.

## 6. ATMÓSFERA (`atmosfera/` — NO TOCADA: rama activa)

**El sistema está bien**: `atmosferaVivaData` (datos puros) +
`useAtmosferaViva` (reloj) + `AtmosferaViva.jsx` (r3f). Nada que redirigir.

**Lo feíto es el maniquí — y NO es solo un demo:**
`DemoAtmosferaViva.jsx` se autodescribe *"viñeta AISLADA de QA/arte, no
producto"* y *"NO está cableada a ninguna ruta (contrato A4)"* (:10).
**Es falso**: `rutasProdChagraApp.js:88-94` la publica en
`prod.chagra.app/atmosfera` (alias `dia_vivo`, `hora`). Es el único montaje —
**el maniquí de QA es lo que ve el usuario en producción.**

Qué ve: `Casita` = `boxGeometry([1.7,1.1,1.3])` + `coneGeometry(1.45,0.75,4)`
de techo + puerta y ventana como `planeGeometry` mono-cara pegados a la pared
(sin `DoubleSide`, sin marco). `Arbol` = `coneGeometry(0.65,1.5,6)` sobre
`cylinderGeometry` — **el árbol de navidad literal**, y del color del pasto.
Cámara `[7,4.5,10]` fov 42 **sin OrbitControls**: no se puede ni mirar
alrededor.

*Fix exacto (elegir uno)*:
1. **Despublicar** la ruta `atmosfera` de `rutasProdChagraApp.js` (una línea)
   — es QA, que viva en mockups. Lo correcto si nadie decidió publicarla.
2. Si la ruta debe existir para el usuario, el maniquí se reemplaza por
   `CasaCampesina` + los senderos de esta rama
   (`mockups/valle/composicionValle3D.jsx`, ya importables) y se le agregan
   `OrbitControls`. Coste: ~1 hora. La casa ya está hecha y respeta la paleta.

---

# APÉNDICE — la lista de chequeo del director

Para cualquier mundo que se declare "listo", en orden de impacto:

1. ¿A este lugar **se llega** o aparece? (establishing + settle)
2. ¿Entrar y salir se sienten **distinto**? (asimetría)
3. ¿El **sujeto llena el cuadro**, o comparte frame con todo lo demás?
4. ¿Se entiende **qué es tocable** sin leer? (patio, sendero, cursor, escala)
5. ¿La **jerarquía** dice quién manda sin texto? (tamaño, luz, centro, follow)
6. ¿Los **cortes están tapados**? (velo con contrato de meseta)
7. ¿La **degradación** conserva la identidad? (tier bajo ≠ pantalla en blanco)
8. ¿El comentario del código **describe lo que pasa**, o lo que se soñó?
   (el 5.6s del bosque: el comentario prometía una caminata inexistente —
   si un comentario miente, el mundo se siente roto y nadie sabe por qué)
