# Auditoría de Angelita — el personaje-agente de Chagra

Angelita no es un adorno del valle: es **el agente**. Es la que le habla al
campesino y a una niña de once años, la que avisa, explica y acompaña. Se audita
con dos varas: la del **diseño de personaje** (referente explícito del operador:
Miss Minutes, de *Loki*, Marvel Studios) y la del **agroecólogo** (Angelita es
una abeja concreta, de una especie concreta, en un país donde esa distinción
tiene consecuencias).

Se audita además **el sistema de avisos y burbujas**, porque de nada sirve
diseñarle vida permanente si el globo se le para encima.

Rama auditada: **`origin/integra/todo-3d-a-prod`** (HEAD `af52e933`).

---

## 0. Alcance — esto es un informe, no un cambio

**No se modificó el personaje.** `AbejaAngelita.jsx`, `creatures.css`,
`abejaIdentidad.js`, `_rubberhose.jsx`, `visual/agente/` y el resto del elenco
están **intactos**; tampoco se tocó el sistema de avisos. Verificable:

```bash
git diff origin/integra/todo-3d-a-prod --stat -- src/
#   (vacío: esta rama no toca src/)
```

Lo agregado, todo descartable sin arrastrar el informe:

| Archivo | Qué es |
| --- | --- |
| `docs/AUDITORIA-ANGELITA.md` | este informe |
| `docs/angelita/bocetos-angelita.html` | láminas de **propuesta** de especie y registros |
| `docs/angelita/bocetos-avisos.html` | láminas de **propuesta** de anclaje y versión sin letras |
| `scripts/medir-vida-angelita.mjs` | instrumento de medida (§4). No cambia nada de la app |

Opciones de diseño en **§8**; propuesta de vida permanente en **§9**. Descritas y
dibujadas, no implementadas.

### 0.1 Advertencia de método — una corrección a mitad de auditoría

La primera pasada de esta auditoría se hizo **contra el árbol equivocado**: el
worktree venía apuntando a la línea de `main`, no a `integra/todo-3d-a-prod`.
Allí Angelita es mucho más pobre que aquí. Al detectarlo se rehízo todo contra la
rama correcta, y **cuatro hallazgos se cayeron o cambiaron de signo** (§10.2).

Se deja escrito porque importa para leer el resto: en esta rama Angelita es un
personaje **mucho más desarrollado** de lo que sugeriría el nombre
"AbejaAngelita.jsx" — hay 10 estados, un idle con cerebro propio, lip-sync de 4
visemas, cuatro juegos de cejas y una burbuja tipada. Buena parte del trabajo ya
está hecho. Lo que falla es **otra cosa**, y más concreta.

---

## 1. Qué se auditó

| Pieza | Archivo |
| --- | --- |
| El dibujo | `src/visual/creatures/AbejaAngelita.jsx` (379 líneas) |
| Identidad como datos | `src/visual/creatures/abejaIdentidad.js` |
| Kit de rasgos de goma | `src/visual/creatures/_rubberhose.jsx` |
| Cadencia base | `src/visual/creatures/creatures.css` (2704 líneas) |
| **El agente** | `src/visual/agente/Angelita.jsx` (634) + `angelita-agente.css` (1022) |
| Estados y tipos | `angelitaEstados.js`, `angelitaAvisoTipos.js` |
| **La burbuja buena** | `visual/agente/BurbujaAngelita.jsx` + `angelitaBurbuja.css` |
| El cerebro | `src/services/angelitaInteligencia.js`, `src/store/useAngelitaStore.js` |
| Lip-sync | `useLipSync.js`, `lipSyncCore.js`, `_rubberhose.jsx` (`BocaVisema`) |
| Burbujas viejas | `mockups/valle/AcompananteMundo.jsx` + 8 toasts más |

Referencia de especie: `public/abejas/angelita.jpg` (foto CC del propio repo).
Referencia de globos: la investigación previa del proyecto,
`Chagra-strategy/deepresearch/DR-FANOUT/globos-de-dialogo-…-gemini-2026-06-19.md`.

> *Nota sobre esa fuente*: sus secciones 1–4 (gramática del globo, anclaje,
> soluciones de videojuego, legibilidad) son sólidas y se usan aquí como vara. El
> bloque final de "fuentes científicas verificadas" es ruido del brazo automático
> de DOIs —devuelve papers de fútbol— y **no se cita nada de ahí**.

---

## 2. Mirada A — el diseño de personaje (Miss Minutes)

Cuatro mecanismos sostienen a Miss Minutes: **la cara es el personaje**; **nunca
se congela**; **los movimientos grandes son raros y motivados**; **cambia de
registro visiblemente**.

### A1 — la cara es demasiado chica para ser el personaje · **VIGENTE**

En el viewBox `-15 -15 32 30`:

| Rasgo | Medida | Fuente |
| --- | --- | --- |
| Tronco | `rx 8.6` → **17,2 u de ancho** | `abejaIdentidad.js:47` |
| Cabeza | `r 4.4` → **8,8 u** | `abejaIdentidad.js:49` |
| Ojo grande | `r 1.95` → **3,9 u** | `AbejaAngelita.jsx:277` |
| Pupila | `r 1.95 × 0.62` → **2,4 u** | `_rubberhose.jsx:41` |

La cabeza mide **la mitad** del tronco. En una burbuja de chat a 40 px la pupila
cae a **~3 px**. A ese tamaño la expresión no existe — y es el tamaño al que un
agente vive en 2D. La tira al pie de `bocetos-angelita.html` lo muestra a 40 y
26 px.

Vale la pena subrayar la ironía: encima de esa cara chica hay **cuatro juegos de
cejas, cuatro visemas de boca y párpados por estado**. Se construyó una gran
capacidad expresiva sobre un lienzo que no da el ancho.

### A2 — la boca SÍ es un instrumento… desconectado · **CORREGIDO**

**Lo que escribí en la primera pasada era falso.** Existe `BocaVisema`
(`_rubberhose.jsx:171-220`) con cuatro formas —cerrada, entreabierta, fruncida,
abierta— alimentadas por `useLipSync`, que engancha un `AnalyserNode` sobre el
`<audio>` del TTS y deriva el visema del RMS real. Hay hasta fallback digno
cuando no hay WebAudio: *"nunca se queda muda-abierta"* (`useLipSync.js:14-16`).
Y hay cejas: cuatro estilos (`AngelitaGafas.jsx:96-105`) más tres estados que
dibujan las suyas.

**El problema es otro y es peor: en la cara 2D del agente no está cableado.**
Rastreo de todos los call-sites: `AgentFab.jsx:174`, `AgentScreen.jsx:3596`,
`OnboardingCondensado.jsx:553,937`, `LoginScreen.jsx:199`,
`BienvenidaFinca.jsx:263`, `AgentHero.jsx:1706`, `FincaVivaHero.jsx:648`,
`ColibriTransition.jsx:110`, `AngelitaEntrada.jsx:146` — **ninguno pasa
`visema=`**. `ChagraAgentAvatarAngelita.jsx:42,50` lo acepta y lo reenvía, pero
nadie se lo suministra.

Corre en exactamente dos sitios: el 3D (`useEntradaAbeja.jsx:367-371`, cuyo
propio comentario dice *"Es la ÚNICA…"*) y un mockup con visema simulado a mano.

> **En la pantalla donde el campesino conversa con el agente, Angelita mueve la
> boca cero veces.** La tubería completa está construida y probada; falta un
> `visema={visema}`.

### A3 — el metrónomo · **EN GRAN PARTE RESUELTO**

También corrijo aquí. Esta rama tiene un **idle con cerebro**
(`angelitaEstados.js:141-151`): nueve momentos (`mira`, `distraida`, `acicala`,
`rasca`, `sacude`, `posa`…) elegidos por azar ponderado que **excluye el gesto
anterior** (`:164-173`) — nunca repite dos veces seguidas. Y el parpadeo tiene
**ritmo propio por instancia** (`Angelita.jsx:261-264`): duración aleatoria en
4,90–6,60 s y fase en −5–0 s. Dos Angelitas nunca parpadean al tiempo. Es
exactamente el truco anti-bucle que yo iba a proponer: ya está.

Los períodos base son casi co-primos y está declarado a propósito:
1,5 / 2,4 / 5,6 / 6,3 / 7,9 / 9,7 / 12,7 s.

Quedan dos observaciones menores, no defectos:

- **12,7 ≈ 2 × 6,35**: `rh-rubor` y `rh-travieso` reencuentran fase cada ~2
  ciclos. Es el par más cercano a un armónico. El parpadeo aleatorizado tapa el
  batido.
- **La amplitud sigue siendo grande para un agente**: medido, la desviación
  máxima es **46,3 % de la altura** (§4.1). Mejor que el 105 % de la otra rama,
  pero un compañero que se desplaza media altura al lado del texto que usted lee
  sigue compitiendo con él.

### A4 — el registro "tengo algo que decirle" · **EXISTE, mal repartido**

También corrijo. El registro **existe en el cerebro**:
`angelitaInteligencia.js:47-52` define `ESTADOS_COMPORTAMIENTO`
(`calma`/`aviso`/`celebra`/`husmea`) y el flag **`interrumpe`** decide si vale la
pena molestar. `useAngelitaStore.js:75-80` lo respeta: si no interrumpe,
*"Angelita reposa"*. Y se traduce a cuerpo (`angelitaInteligencia.js:68-72`):
`calma → acompana`, `aviso urgente → preocupada`, `aviso tranquilo → invita`.

Hay **10 estados visuales** con coreografía propia (`angelitaEstados.js:28-39`):
`acompana`, `escuchando`, `pensando`, `respondiendo`, `contenta`, `preocupada`,
`no-se`, `senala`, `invita`, `husmea`. Incluye un `no-se` que se encoge de
hombros — honestidad dibujada, que es una decisión de producto excelente.

Lo que falla no es el diseño, es **el reparto**:

- El único sitio que hace de "tengo algo que decirle" en producción es el FAB, y
  lo hace **ad-hoc** (`AgentFab.jsx:79-85`), con un `estado` derivado a mano.
- **`AgentScreen` nunca produce `respondiendo` ni `contenta` ni `preocupada`.**
  Su mapeo (`AgentScreen.jsx:3596`) solo puede dar tres valores:
  `recording → listening`, `thinking || isVoicePlaying → thinking`, resto
  `idle`. Siete de los diez estados no se alcanzan nunca en la pantalla del chat.

### A5 — Angelita en la pantalla del agente · **CORREGIDO: sí está, pero plana**

Mi primera pasada decía que no estaba. **Falso.** Se dibuja en
`ChatBubble.jsx:469` (size 30), `ChatHistory.jsx:131` (size 200) y `:282`,
`AgentScreen.jsx:3596` y `:4098`.

El hallazgo correcto es el de A4: **está presente pero expresivamente plana** —
tres estados de diez, cero visemas, cero cejas actuadas. El cuerpo está; la
actuación no llega.

---

## 3. Mirada B — el agroecólogo

### 3.1 Qué especie es, de verdad — la pregunta central

**Verificado en el repositorio, no supuesto.** Unánime en trece sitios:

> **`Tetragonisca angustula`** — meliponino nativo, **sin aguijón**. NO *Apis*.

- `src/data/animal-diagnostics.json:33` → `"Tetragonisca angustula (angelita)"`,
  nota `"Melipona nativa SIN aguijon"`, fuente `FEDEABEJA, ICA`.
- `:82` → la guarda agronómica: *"Apis mellifera hace pillaje y diezma colmenas
  de meliponas nativas (angelitas). Mantener aislamiento de varios kilómetros…"*
- `visual/creatures/index.js:40`, `README.md:23`, `AbejasScreen.jsx:254`,
  `GuardianEspiritu.jsx:35`, `SaludFinca.jsx:105`, `userProfileService.js:838`.

Y hay **foto de referencia dentro del repo**: `public/abejas/angelita.jpg`
(Carlos Eduardo Joos, CC BY 2.0; atribución en `AbejasScreen.jsx:48-53`). El
dibujo se auditó **contra esa foto**.

*Método*: el grafo vivo (Apache AGE en `alpha`) no es alcanzable desde este nodo
(`stg`); se verificó contra los datos versionados y la foto. Las trece fuentes
coinciden.

**El nombre está bien. El dibujo, no.**

### 3.2 B1 — la estructura de valores está INVERTIDA · **VIGENTE, confirmado**

Lo más serio de la auditoría, y sobrevivió intacto a la corrección de rama.

| | La abeja real (foto del repo) | El dibujo en esta rama |
| --- | --- | --- |
| Cabeza | **Oscura**, con franjas amarillo pálido junto a los ojos | **Clara** `#ffd76a` (`abejaIdentidad.js:36`, dibujo `:268-269`) |
| Tórax | **Oscuro**, destello amarillo al costado | **No existe como pieza**: un solo óvalo `rx 8.6/ry 5.4` (`:247`) |
| Abdomen | **Ámbar pálido, prácticamente SIN bandas** | Ámbar `#ffb54f` con **tres barras oscuras** (`AbejaAngelita.jsx:27-32`) |
| Patas | **Amarillo vivo**, muy visibles | Tubos de tinta con pie crema |
| Alas | **Largas**, sobrepasan la punta del abdomen | **0,8 u cortas**: ala llega a x −7,8; abdomen a x −8,6 |
| Antenas | Cortas, **acodadas** (geniculadas) | **Largas con bombillo**, ~5,5 u (radio de cabeza: 4,4) |
| Punta del abdomen | Roma (sin aguijón) | Sin resolver como rasgo |

Las tres bandas son dobles —trazo de tinta de 1,9 u más hilo tierra `#9c3b1e` de
0,7 u— y **verticales sobre un cuerpo horizontal**: cruzan el tronco de arriba
abajo, como las de una *Apis*.

**El diagnóstico**: la masa oscura de una angelita está en la **cabeza y el
tórax**; su abdomen es pálido y liso. El dibujo hace exactamente lo contrario.

Tres barras oscuras sobre abdomen ámbar es **la firma gráfica de *Apis
mellifera***. El dibujo de la abeja nativa sin aguijón lleva el traje de la abeja
europea — que es, según los propios datos del proyecto, **la especie que saquea y
diezma sus colmenas**.

El código llama a esas barras "chumbe andino" (`AbejaAngelita.jsx:26`) y la
intención cultural es buena. El problema no es el chumbe: es que **el chumbe
elegido coincide con la marca diagnóstica de la especie equivocada**. Se puede
conservar el guiño textil sin pintar una *Apis* (§8).

*Respuesta directa a la pregunta*: **está dibujada como abeja de miel europea,
con el nombre de la melipona nativa.** Error de fidelidad de fondo, no de
acabado. Un campesino con meliponario lo nota de una, y es la distinción sobre la
que se apoya media pantalla de `AbejasScreen`.

### 3.3 B2 — nada dice "sin aguijón"

El hecho más importante de esta abeja —y la razón por la que una niña de once
años puede estar al lado de una colmena— es que **no pica**. La punta del abdomen
no está resuelta como rasgo. No es un error: es una oportunidad desperdiciada.
Una punta roma y redonda dice "mansa" antes que cualquier texto.

### 3.4 B3 — alas y antenas borran la silueta de melipona

Las alas nacen muy arriba (`cy −7` y `−6,4`, con el tronco en `cy 0`) y flotan
por encima del cuerpo en vez de salir del dorso: silueta de abejorro. Y las
antenas largas con bombillo son **vocabulario de hormiga de caricatura**, no de
meliponino. Junto con la ausencia de tórax, es la desviación más marcada.

---

## 4. La vida permanente — medición, no opinión

`scripts/medir-vida-angelita.mjs` abre la app en Chromium, ubica a Angelita y
muestrea la **geometría renderizada** de partes del dibujo cada 50 ms. No lee el
CSS: mide dónde terminan los píxeles. La pose de reposo **no se asume**, es la
mediana. El aleteo se mide aparte (es continuo: contarlo daría 100 % y el número
no querría decir nada).

### 4.1 Estado normal — cumple

```
ruta #/mockups/visual-lib · 40 s @ 50 ms (800 muestras)
movimiento notorio   32.1 %   (meta ≥ 30 %)
reposo vivo          52.0 %
pose quieta          15.9 %
fotogramas congelados   0 / 799
racha muerta más larga  0 ms
desviación máxima      46.3 % de la altura
```

**La regla del 30 % ya se cumple.** El problema nunca fue la cantidad de
movimiento. (La desviación del 46,3 % es la observación de A3.)

### 4.2 El borde donde se cae: `prefers-reduced-motion` · **EL HALLAZGO**

```
ruta #/mockups/visual-lib + reducedMotion:reduce · 20 s @ 50 ms
movimiento notorio    0.0 %
reposo vivo           0.0 %
pose quieta         100.0 %
fotogramas congelados 399 / 399      ← TODOS
racha muerta más larga  19 950 ms    ← la ventana entera
desviación máxima       0.0 %        ← ni un píxel
```

**Angelita es un cadáver con movimiento reducido.** No "casi quieta": *cero*
desviación en toda la ventana. Cuatro bloques CSS y cuatro compuertas JS
conspiran para ello:

```css
/* creatures.css:411-419 */
@media (prefers-reduced-motion: reduce) {
  .rh-boil, .rh-blink, .rh-sway, .rh-smear,
  .rh-antic, .rh-travieso, .rh-mirada, .rh-rubor, … { animation: none !important; }
}
/* creatures.css:511-519 — y aquí el aleteo */
/* angelita-agente.css:965-1006 — toda la capa del agente, y mata
   .rh-blink y .rh-mirada por SEGUNDA vez */
/* angelita-missminutes.css:238-259 — cejas, husmea, entrada */
```

Y en JS: `Angelita.jsx:272` (el idle-cerebro **no arranca**), `:301` (el
seguimiento del puntero no arranca), `AngelitaEntrada.jsx:89`,
`useLipSync.js:81-84` (boca cerrada fija).

Se apagan **la respiración, el parpadeo (dos veces) y el aleteo**. Sobrevive solo
*paint* estático: el iris ámbar, los párpados de estado, los transforms de base.
La expresión se lee. El personaje no se mueve **ni un fotograma**.

El comentario de cabecera lo declara como intención: *"reduced-motion = criatura
quieta en un fotograma digno"* (`creatures.css:5`).

Esa interpretación es **más estricta de lo que pide la norma y peor de lo que
pide el encargo**. `prefers-reduced-motion` existe para evitar movimiento
vestibular —desplazamientos grandes, paralaje, giros, escalados fuertes—, no para
prohibir que un personaje parpadee. Un párpado de 2 px no es lo que la guía busca
suprimir. Y el encargo dice: *"con movimiento reducido, la vida baja a lo mínimo
pero el personaje no queda muerto"*.

Para el usuario que no lee (§6), un personaje congelado no es una molestia
estética: **es el mensaje "la app se dañó" o "el agente se fue".**

### 4.3 `device-tier` bajo · **CORREGIDO: aquí sí queda vida**

Mi primera pasada decía que tier bajo también la mataba. **Falso, y la
diferencia es instructiva.** Las listas de `[data-tier='bajo']`
(`creatures.css:404-409`, `angelita-agente.css:939-963`) **no incluyen
`.rh-blink` ni `.crt-wing`**. En gama baja Angelita **sigue parpadeando y
aleteando**, y conserva los gestos de pose. Pierde la "vida ociosa" (idle-cerebro,
antics, respiración de fondo, rubor).

Son dos umbrales genuinamente distintos y bien pensados: **tier bajo = viva pero
sin ocio; RM = muerta.** El primero es exactamente el criterio correcto. El
segundo debería parecerse más al primero.

### 4.4 Dos cabos sueltos menores

- `LineBoilFilter.jsx` anima la `seed` de un `feTurbulence` con **SMIL**,
  gateado solo por la prop `animated` y **por ningún `@media`**. Hoy es inerte
  (`Angelita.jsx:249` trae `lineBoil = false`), pero un host que pasara
  `lineBoil animated` bajo RM tendría el contorno hirviendo. Única capa sin
  compuerta CSS.
- `Angelita.jsx:346` emite `[data-animo='atento']` y **no existe ninguna regla
  CSS para ese valor** (`creatures.css:359-366` solo cubre `pleno`, `sediento`,
  `descansa`). Valor muerto.

---

## 5. Los avisos y las burbujas

El operador lo resume así: *"la tapan, funcionan raro, no son legibles, tienen
mucho margen de mejora"*.

**Las tres cosas son ciertas — de la generación vieja. Y la buena ya existe en el
repo, cableada en un solo sitio.** Ese es el hallazgo.

### 5.1 Conviven dos generaciones

**La nueva, `BurbujaAngelita`** (`visual/agente/BurbujaAngelita.jsx`, 84 líneas)
está bien hecha y responde a feedback previo del operador, citado en sus propios
comentarios:

- **Typewriter** con velocidad configurable (16 ms), y respeta RM mostrando todo
  de una.
- **Color + ícono por tipo** de aviso (`angelitaAvisoTipos.js`): bienvenida 🌻,
  informativa 💬, sugerencia 💡, atención 📌, alerta ⚠️, celebración 🎉, planta 🌿.
  El ícono **desambigua sin color** — daltonismo contemplado explícitamente.
- **Forma por tipo**: alerta lleva borde de 2 px y esquinas más rectas, *"se
  distingue de una sugerencia hasta en escala de grises"* (`angelitaBurbuja.css:62`).
- **Recorta de verdad**: `recortarAviso` (tope 105 caracteres) corta en frontera
  de frase, o en la última palabra completa. No trunca visualmente cobrando el
  tiempo del texto entero.
- **Letra grande**: `1.05rem` (~16,8 px), peso 600, `line-height 1.35`, texto casi
  blanco sobre fondo profundo. El comentario dice: *"el operador no pudo leer un
  solo aviso — la letra era muy chica"*.
- **Accesible**: `role="status"`, `aria-live="polite"`, y el tipo narrado en
  texto oculto (nunca solo color).

Eso responde, punto por punto, a "no son legibles" y a buena parte de "funcionan
raro".

**Pero está cableada en exactamente un host**: `mockups/valle/Valle3D.jsx:1770`.

**La vieja sigue sirviendo a todo lo demás**: `AcompananteMundo.jsx:315` (que
alimenta las 10 vitrinas de mundo) más ocho toasts independientes
(`ec-aviso` 2800 · `pc-aviso` 3000 · `df-aviso` 2800 · `hcm-aviso` 2600 ·
`agb-nota` 2600 · `cinf__toast` 2600 · `vmun__pista` 3200 · `coach-toque` 4200).
Diez implementaciones copiadas a mano del mismo `useState + useRef(timer) +
setTimeout`.

### 5.2 "La tapan" — cierto en la vieja; en la nueva, resuelto a medias

**La vieja** (`acompananteMundo.css:19-40`) está clavada al borde inferior:

```css
.acomp__burbuja { position: absolute; left: .6rem; right: .6rem; bottom: .6rem; z-index: 6; }
```

Angelita vive dentro de la escena y se mueve libremente. Nada relaciona las dos
posiciones — cero `getBoundingClientRect` en todo el sistema. Que la tape no es
un bug intermitente: **es el comportamiento por diseño** cada vez que ella baja
al tercio inferior. Peor: `.acomp__burbuja` y `.mundo-caida` (`mundo.css:313`)
comparten rectángulo y z-index 6; cuando el 3D cae a 2D se superponen y el orden
lo decide el DOM.

**La nueva sí está anclada al personaje**, y bien (`Valle3D.jsx:1770`):

```jsx
<Html center position={[0, 1.3, 0]} distanceFactor={9} zIndexRange={[45, 20]}>
```

Flota 1,3 unidades **sobre su cabeza**, en espacio 3D: si ella se mueve, el globo
la sigue. Es el patrón Animal Crossing del DR (§3) y es correcto.

**Lo que le falta** —y aquí sí aplica el DR §2 completo—:

- **Sin decisión de lado ni detección de colisión**: la posición es fija
  (`[0, 1.3, 0]`). No prueba alternativas.
- **Sin manejo de borde**: si Angelita está arriba del encuadre, el globo se sale
  por arriba. `center` no clampa nada.
- **Sin rabito** (§5.4): nada apunta a ella.
- `distanceFactor={9}` escala el globo con la distancia de cámara: el tamaño de
  letra en pantalla no está garantizado, justo lo que la burbuja intentaba
  arreglar.

### 5.3 "Funcionan raro" — la cola y la voz

**No hay cola de avisos en ninguna de las dos generaciones.** Búsqueda negativa
confirmada: sin arrays de pendientes, sin `.shift()`, sin "esperar al anterior".

El antipatrón, en `AcompananteMundo.jsx:118-130`:

```js
const decir = useCallback((texto) => {
  setDicho(texto);
  if (dichoTimer.current) clearTimeout(dichoTimer.current);   // ← mata al anterior
  dichoTimer.current = setTimeout(() => setDicho(null),
    Math.min(14000, 4000 + texto.length * 55));
  hablar(texto);
}, [hablar]);
```

Cada aviso **pisa al anterior y cancela su temporizador**. Y la voz se pisa más
duro: `hablar()` arranca con `window.speechSynthesis.cancel()` (`:96`), así que el
segundo `decir()` **corta la frase anterior a mitad de palabra**.

Reproducible: la narración de entrada se dispara a los 900 ms del montaje
(`:146`); si el usuario toca un hotspot antes —cosa normalísima— `decirPuerta`
escribe encima y **la narración de entrada se pierde sin haberse leído ni oído**.

En la generación nueva el `interrumpe` de `useAngelitaStore.js:75-80` sí es una
política de "no molestar" bien pensada — pero es **veto**, no **cola**: decide si
hablar, no qué hacer con lo que ya se estaba diciendo.

**Sobre la duración por costo de lectura**: existe y funciona, pero solo en las
dos burbujas viejas de Angelita, y tiene un techo que la anula:
`Math.min(14000, 4000 + len*55)` ≈ 200 palabras/minuto, razonable — pero el techo
se alcanza a los **182 caracteres**, así que **todo texto largo se satura en los
mismos 14 s**, justo donde el escalado importaba. Los ocho toasts no la usan:
`EntradaCampesina.jsx:370` da los mismos 2800 ms a `"Listo"` que a una frase de
once palabras.

### 5.4 El rabito · **no existe en ninguna parte**

Ninguna burbuja del repo tiene cola. `angelitaBurbuja.css` (112 líneas) y
`acompananteMundo.css` (158) no tienen un solo `::after`/`::before`; los
`clip-path: polygon` del repo son ajenos (decoración de un telar).

Sin rabito, la pregunta de la reorientación no llega a plantearse. Y sin rabito
—dice el DR §1— el globo deja de ser lenguaje de caricatura y pasa a ser
*tooltip* corporativo: el registro que este producto no quiere. En la nueva
burbuja duele más, porque todo lo demás ya tiene carácter.

### 5.5 Un error concreto: la variante para niños tiene la letra MÁS CHICA

`angelitaBurbuja.css:77-81`:

```css
/* NIÑO: esquinas más redondas y tipografía un punto más grande — amable. */
.angelita-burbuja--nino {
  border-radius: 22px;
  font-size: 0.82rem;
}
```

**El comentario dice "un punto más grande"; el código la baja de `1.05rem` a
`0.82rem`** — un 22 % **más chica** que la base. La variante pensada para la
usuaria de once años, y la más cercana al perfil de baja alfabetización, es la
que peor se lee. Comentario y código se contradicen: casi seguro un dedazo.

### 5.6 Tests

**No hay ni un test dedicado a avisos o burbujas.** No existe
`AcompananteMundo.test.jsx` pese a alimentar 10 vitrinas. Vacíos por riesgo:

1. La fórmula `min(14000, 4000 + len*55)` **no se prueba**.
2. **El pisado de avisos no se prueba**: ningún test emite dos `decir()` seguidos.
3. `recortarAviso` está exportada y es puramente funcional — **es trivial de
   probar y no lo está**.
4. `getByRole('status')` es frágil: en `EntradaValle3D` hay **tres** elementos
   con ese rol.

---

## 6. El usuario que no lee

Una de las tres versiones apunta a campesinos con **analfabetismo funcional**,
que además podrían **no hablar**. No es un caso borde: cambia qué es Angelita.

**Si el usuario no lee, el globo de texto no comunica nada.** Angelita deja de
ser un adorno encima de la información y pasa a ser **el canal**. Cada hallazgo
cambia de gravedad:

| Hallazgo | Si el usuario lee | Si NO lee |
| --- | --- | --- |
| 4.2 · muerta con `reduced-motion` | Alta | **Crítica** — personaje quieto = "se dañó" |
| A2 · lip-sync no cableado en 2D | Media | **Crítica** — la boca es media conversación |
| A4/A5 · 3 de 10 estados en el chat | Alta | **Crítica** — la actuación *es* el mensaje |
| 5.5 · la variante niño con letra chica | Media | Alta |
| A1 · cara chica | Media | **Alta** — debe leerse a 40 px |
| 5.4 · sin rabito | Media | **Alta** — ¿quién habla? |
| 5.3 · avisos que se pisan y cortan la voz | Alta | **Crítica** — la voz es el canal |

### 6.1 Lo que hay que trasladar del texto al cuerpo

Un hallazgo propio de los bocetos, contra la intuición: **a tamaño de agente la
micro-expresión facial no alcanza**. Al renderizar los dos registros a 112 px, la
diferencia la cargan **la silueta y la escala** —se acerca, se inclina, levanta
el brazo— mucho más que la boca o las cejas. Regla: **lo que deba entenderse sin
letras tiene que estar en la silueta.** La cara refuerza; la silueta comunica.

Seis mecanismos (dibujados en `bocetos-avisos.html` §2):

1. **Icono grande dentro del globo** como mensaje principal, no como adorno. *La
   mitad ya está*: `angelitaAvisoTipos.js` tiene siete tipos con ícono. Hoy el
   ícono es un disco de 1,55 rem al lado del texto; ahí tendría que **mandar**.
2. **Color por tipo** — ya existe y ya contempla daltonismo. Se aprovecha tal cual.
3. **Forma del globo por tono** (DR §1) — ya empezado (`--alerta` con borde
   grueso). Extender a nube = piensa, bordes de estallido = urgente, punteado =
   menor, rectángulo sin cola = voz del sistema.
4. **Que ella señale de verdad** — §6.2.
5. **Voz siempre**, en español de Colombia y de usted. La infraestructura existe;
   ahí pasaría a ser canal primario junto al gesto. Y exige arreglar 5.3: una voz
   que se corta a mitad de palabra es peor que ninguna.
6. **Vocabulario cerrado de gestos**, siempre igual. *Ya existe y es bueno*: los
   10 estados de §A4 son casi exactamente ese vocabulario — incluido `no-se`, que
   es oro para este usuario. Falta **cablearlos** y probar que se entienden.

### 6.2 El gesto de señalar no señala nada

Existe la pose `señala` y está bien animada (`creatures.css:131-155`: extiende el
brazo a −52°, rebasa, asienta en −44°, recoge con follow-through).

**Pero no apunta a nada real.** El destello del POI está **hardcodeado** en
`Angelita.jsx:521-531` a `translate(16 10.5)` —coordenadas del propio viewBox,
siempre el mismo punto abajo-derecha— y el brazo a un ángulo **fijo**. La única
modulación externa es espejar todo el SVG. No hay prop `poiX`/`target`/`hacia`,
ni cálculo de ángulo hacia un elemento del DOM.

> Para el usuario que no lee, **señalar es el verbo más importante del
> vocabulario**, y hoy es decorativo. Es el hueco más específico y accionable de
> toda la auditoría.

### 6.3 Dos advertencias

- **Si el usuario no habla**, la voz resuelve la salida pero no la entrada. El
  canal de vuelta tendría que ser señalar y tocar sobre la pantalla. Fuera de
  alcance aquí, pero conviene decidirlo junto con esto, no después.
- **No confiar el significado solo al color**: rojo/verde es la distinción que más
  falla en daltonismo. La burbuja nueva ya lo hace bien (ícono + forma + texto
  narrado); mantener esa regla.

---

## 7. Las tres versiones — qué ayuda y qué estorba

| | 3D actual | Institucional 2D | Baja alfabetización |
| --- | --- | --- | --- |
| Ayuda hoy | La presencia 3D está resuelta y el lip-sync **sí corre aquí** | SVG puro: escala sin coste, cae con dignidad sin WebGL | 10 estados ya diseñados, voz, ícono+color por tipo |
| Estorba hoy | El globo no maneja bordes ni colisión (§5.2) | Amplitud de gesto del 46 % de su altura: **lee como poco serio** | Todo el mensaje vive en letras; señalar no señala (§6.2) |
| Falta | Rabito y clamp de borde | Un dial de **sobriedad** | El cableado: visemas, estados, señalar direccionable |

Tres decisiones que sirven para las tres y conviene tomar una sola vez:

1. **Una sola Angelita.** Ya hay arquitectura (`abejaIdentidad.js` es fuente
   única de dibujo 2D y presencia 3D). Cualquier corrección de especie entra
   **ahí** y las tres versiones la heredan.
2. **Un dial de intensidad, no tres personajes.** La diferencia debería ser un
   parámetro de amplitud/frecuencia sobre la *misma* cadencia —institucional
   contenida, baja alfabetización amplia y explícita—, no tres animaciones que se
   desincronizarán. El precedente ya existe: `data-tier` y `data-animo` son
   exactamente eso.
3. **Un solo sistema de avisos**: `BurbujaAngelita` cableada en todas partes. Hoy
   son diez implementaciones; con tres versiones serían treinta.

---

## 8. Opciones de diseño — no decisiones

Dibujadas en `docs/angelita/bocetos-angelita.html`. Son una **escalera**: cada
opción contiene la anterior, se puede parar en cualquier peldaño.

### 8.1 Qué se conserva en TODAS

El nombre y el cariño · la calidez ámbar · el guiño al chumbe (reubicado, no
eliminado) · el lenguaje rubber-hose · el kit compartido con el resto del elenco ·
la arquitectura identidad-como-datos · los períodos casi co-primos y el parpadeo
aleatorizado por instancia · los 10 estados y su coreografía · el lip-sync y las
cejas · la coreografía del cruce 2D↔3D · el mismo `viewBox`, para que ningún
consumidor cambie de tamaño.

### 8.2 Opción 1 — corrección mínima de especie · riesgo bajo

Cuatro cambios de pintura, cero de estructura:

1. Abdomen a ámbar **pálido** y **sin bandas**.
2. Cabeza a **oscura** (efecto lateral gratis: los ojos blancos resaltan mucho más
   — ayuda directa a A1 sin tocar proporciones).
3. Las tres barras de *Apis* → **dos costuras tenues** de tergo: el chumbe
   sobrevive como textura y además es fiel, porque la angelita real sí tiene los
   márgenes de los segmentos algo más oscuros.
4. Alas **largas**, que pasen la punta del abdomen (hoy faltan 0,8 u: es
   literalmente cambiar dos números).

Consecuencia forzada: con la cabeza oscura la sonrisa de tinta desaparece, así
que hay que añadir el **clípeo pálido** (mancha clara de la cara, también rasgo
real) para que la boca y los visemas se lean.

**Resuelve** B1, B3 y parte de B2. **No resuelve** A1.

### 8.3 Opción 2 — melipona legible · riesgo medio

Opción 1 más la corrección de proporciones de agente:

- **Tórax oscuro como pieza propia** entre abdomen y cabeza (hoy no existe): la
  silueta deja de ser un óvalo y pasa a ser una abeja.
- **Cabeza más grande** (`r 4.4 → 5.5`) y **ojos +49 %** (`r 1.95 → 2.9`): la
  pupila pasa de ~3 px a ~4,5 px a tamaño 40. Es la diferencia entre tener cara y
  no tenerla — y es lo que hace que las cejas y los cuatro visemas **ya
  construidos** por fin se vean.
- **Franjas pálidas junto a los ojos**: rasgo real de campo *y* identidad gráfica
  — ninguna caricatura genérica de abeja las tiene. La fidelidad **compra
  distinción**.
- **Patas amarillo vivo** y **antenas cortas acodadas** en vez de las largas con
  bombillo.
- **Punta del abdomen roma**: dice "no pica" sin una palabra (B2).

**Resuelve** B1, B2, B3 y A1.

### 8.4 Opción 3 — cablear lo que ya existe · riesgo BAJO, valor alto

Aquí no hay que dibujar casi nada: hay que **conectar**.

- `visema={visema}` en la cara 2D del agente (`useLipSync` ya funciona).
- Que `AgentScreen` produzca los diez estados, no tres.
- **Señalar direccionable**: prop de objetivo en vez del POI hardcodeado (§6.2).
- Arreglar `angelitaBurbuja.css:80` (la letra de la variante niño).
- `BurbujaAngelita` en todos los hosts, no solo en `Valle3D`.

> Es la opción de mejor relación valor/riesgo de todo el informe, y es
> independiente de la corrección de especie: se puede hacer hoy sin tocar el
> dibujo.

### 8.5 Opciones para los avisos

| | Qué | Resuelve |
| --- | --- | --- |
| **AV-1** | `BurbujaAngelita` como único sistema; jubilar las 10 copias. Añadir **cola** (esperar, no pisar) y quitar el techo de 14 s | 5.1, 5.3 |
| **AV-2** | **Rabito** que apunte a su cabeza + **clamp de borde** + 8 posiciones candidatas con detección de colisión | 5.2, 5.4 |
| **AV-3** | Tamaño de letra garantizado en pantalla (revisar `distanceFactor`), y arreglar la variante niño | 5.2, 5.5 |
| **AV-4** | **Sin letras**: el ícono manda, la forma dice el tono, y ella señala de verdad | §6 |

AV-1 y AV-3 son baratos. AV-2 es el que cumple "que nunca la tape". AV-4 habilita
la tercera versión.

---

## 9. La vida permanente — propuesta descrita

No implementada. Y con una advertencia honesta: **buena parte de lo que iba a
proponer ya está construido** (§A3). Lo que sigue es lo que falta.

### 9.1 Lo que ya está y hay que conservar

Períodos casi co-primos (1,5 / 2,4 / 5,6 / 6,3 / 7,9 / 9,7 / 12,7 s) · parpadeo
con duración y fase aleatorias por instancia · idle-cerebro de nueve momentos con
azar ponderado que nunca repite el gesto anterior · doble golpe de parpadeo ·
coreografía sincronizada *a propósito* dentro de cada estado conversacional.

### 9.2 Lo que falta — cuatro capas, y la clave está en la cuarta

| Capa | Qué hace | Períodos | Amplitud | ¿Sobrevive a RM? |
| --- | --- | --- | --- | --- |
| **1 · aliento** | respiración, parpadeo, temblor de antena | 1,5 · 4,9–6,6 · 2,4 s | ≤ 1 % de la altura | **Debe sobrevivir entera** |
| **2 · deriva** | mirada que se va y vuelve, flote, rubor | 7,9 · 13 · 12,7 s | 1–2,5 % | Sí, a media amplitud |
| **3 · gestos** | el idle-cerebro y los antics | 6,3 · 9,7 s + one-shots | hoy hasta **46 %** → bajar a 3–8 % | No (es lo vestibular) |
| **4 · registro** | los 10 estados | según evento | — | Sí, en versión estática |

Dos cambios concretos:

1. **Bajar la amplitud de la capa 3.** Hoy la desviación máxima medida es el
   46,3 % de su altura. Un acompañante no debería desplazarse media altura al
   lado del texto. Meta: **≤ 8 %**, verificable con el instrumento.
2. **Rescatar las capas 1 y 2 de `reduced-motion`** — §9.3.

### 9.3 Qué hacer con `prefers-reduced-motion` — el cambio importante

En vez de `animation: none !important` para todo:

- **Capa 3 apagada** (desplazamiento, rotación, escala: lo que causa malestar
  vestibular). Correcto, se mantiene.
- **Capa 1 completa**: respira y parpadea. Un párpado no es movimiento vestibular.
- **Capa 2 a media amplitud**: la mirada deriva despacio.
- El idle-cerebro (`Angelita.jsx:272`) puede seguir apagado; lo que no puede
  apagarse es el aliento.

Meta medible: **racha muerta = 0 ms también en este modo.** Hoy son 19 950 ms.

El modelo a copiar ya está en la casa: **`[data-tier='bajo']` hace exactamente
esto bien** (§4.3) — deja vivos parpadeo y aleteo, apaga el ocio. Bastaría con
que el bloque de RM se pareciera a él, quitándole además el aleteo si se
considera demasiado.

### 9.4 Por qué no se leerá como metrónomo

1. **Períodos casi co-primos** — ya está.
2. **Parpadeo aleatorizado por instancia** — ya está, y es el mejor truco del
   conjunto.
3. **Azar ponderado que excluye el gesto anterior** — ya está.
4. **Ventanas de reposo desiguales** entre gestos: es lo único que faltaría
   afinar, y solo si tras bajar la amplitud el ritmo se siente parejo.

### 9.5 Cómo se comprueba

```bash
node scripts/medir-vida-angelita.mjs --ventana 60                  # ≥30 % notorio, 0 ms muerta
node scripts/medir-vida-angelita.mjs --ventana 20 --reduced-motion # 0 ms muerta
```

Sale con código 1 si no se cumple: puede colgarse de CI. Pero **la prueba del
dibujo no es el test, es la captura**. El número dice que se mueve; solo el ojo
dice si está viva.

---

## 10. Resumen

### 10.1 Los hallazgos, por costo

| # | Hallazgo | Mirada | Grav. | Si no lee |
| --- | --- | --- | --- | --- |
| 4.2 | **Muerta 19,95 s con `prefers-reduced-motion`**: 399/399 fotogramas idénticos, 0 % de desviación | Personaje | **Alta** | **Crítica** |
| B1 | **Dibujada como *Apis mellifera*** con nombre de melipona: valores invertidos, tres barras, sin tórax | Agroecólogo | **Alta** | Alta |
| A2 | Lip-sync completo y **desconectado** en la cara 2D del agente | Personaje | **Alta** | **Crítica** |
| 5.3 | Sin cola: cada aviso pisa al anterior y **corta la voz a mitad de palabra** | Avisos | **Alta** | **Crítica** |
| A4/A5 | `AgentScreen` solo alcanza 3 de los 10 estados | Personaje | **Alta** | **Crítica** |
| 5.1 | La burbuja buena existe y está cableada en **un solo host**; 9 superficies siguen con la vieja | Avisos | **Alta** | **Crítica** |
| 6.2 | El gesto de señalar apunta a un **POI hardcodeado**, no a la pantalla | Personaje | Media | **Crítica** |
| A1 | La cara es la mitad del cuerpo: ilegible a 40 px (y desperdicia cejas y visemas) | Personaje | Media | **Alta** |
| 5.2 | La burbuja nueva no maneja bordes ni colisión; la vieja está clavada abajo | Avisos | Media | **Alta** |
| 5.4 | Ninguna burbuja tiene rabito | Avisos | Media | **Alta** |
| 5.5 | La variante **niño** tiene la letra 22 % **más chica** (comentario y código se contradicen) | Avisos | Media | **Alta** |
| A3 | Amplitud de gesto del 46 % de su altura | Personaje | Media | Media |
| B2/B3 | No afirma "sin aguijón"; alas cortas y antenas de hormiga | Agroecólogo | Baja-media | Baja |
| 5.6 | Cero tests de avisos; `recortarAviso` es trivial de probar y no lo está | Avisos | Baja-media | Baja-media |
| 4.4 | `LineBoilFilter` sin compuerta RM; `data-animo='atento'` es valor muerto | Personaje | Baja | Baja |

### 10.2 Lo que la primera pasada dijo mal

Se corrige explícitamente, porque auditar contra el árbol equivocado es
exactamente el error que esta auditoría le reprocha al código:

| Dije | Realidad en esta rama |
| --- | --- |
| "La boca es un adorno fijo, no hay cejas" | Hay 4 visemas y 4 juegos de cejas. El defecto es que **no están cableados** |
| "Un solo gesto notorio, en compás de metrónomo" | Hay idle-cerebro de 9 momentos + parpadeo aleatorizado. Queda solo la amplitud |
| "Angelita no está en `AgentScreen`" | **Sí está** (5 sitios). Lo que falta es la actuación: 3 estados de 10 |
| "`data-tier='bajo'` también la mata" | **No**: parpadeo y aleteo sobreviven. Es el gate bien hecho, y el modelo a copiar |
| "No existe el registro *tengo algo que decirle*" | Existe en el cerebro (`interrumpe`, `ESTADOS_COMPORTAMIENTO`). Falta repartirlo |

### 10.3 Lo que NO hay que tocar

Los períodos casi co-primos y el parpadeo aleatorizado · el idle-cerebro y su
azar ponderado · el estado `no-se` (honestidad dibujada) · la separación
identidad-como-datos / dibujo / cadencia · el kit de goma compartido · el gate de
`tier bajo` · la política `interrumpe` de no-molestia · `BurbujaAngelita` entera
(typewriter, tipos, íconos, `recortarAviso`, accesibilidad) · la fórmula de
duración por costo de lectura, quitándole el techo.

---

## 11. Cómo verificar cualquier afirmación

```bash
# que esta rama NO toca el personaje
git diff origin/integra/todo-3d-a-prod --stat -- src/

# las cifras de vida (normal y con movimiento reducido)
node scripts/medir-vida-angelita.mjs --ruta '#/mockups/visual-lib' --ventana 40
node scripts/medir-vida-angelita.mjs --ruta '#/mockups/visual-lib' --ventana 20 --reduced-motion

# la especie, en los datos del proyecto
grep -rn "Tetragonisca\|angustula" src/
grep -n "BANDAS" -A 6 src/visual/creatures/AbejaAngelita.jsx
grep -n "cabeza:" src/visual/creatures/abejaIdentidad.js

# el lip-sync que nadie cablea: el único acierto es el ADAPTADOR que lo
# reenvía (ChagraAgentAvatarAngelita) — ningún llamador se lo suministra
grep -rn "visema=" src/components/ | grep -v ChagraAgentAvatarAngelita   # (vacío)
grep -rn "useLipSync" src/visual/mundo3d/   # (el único sitio real)

# los 3 estados de AgentScreen
grep -n "STATE_RECORDING ? 'listening'" -B 2 -A 2 src/components/AgentScreen/AgentScreen.jsx

# la burbuja buena, cableada una sola vez
grep -rn "BurbujaAngelita" src/ | grep -v visual/agente/

# el dedazo de la variante niño
grep -n "nino" -A 4 src/visual/agente/angelitaBurbuja.css

# el POI hardcodeado del gesto de señalar
grep -n "translate(16 10.5)" -B 3 src/visual/agente/Angelita.jsx
```

Y para ver los bocetos, abra en el navegador:

```
docs/angelita/bocetos-angelita.html     ← especie y registros
docs/angelita/bocetos-avisos.html       ← anclaje del globo y versión sin letras
```
