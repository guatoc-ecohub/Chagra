# Auditoría de Angelita — el personaje-agente de Chagra

Angelita no es un adorno del valle: es **el agente**. Es la que le habla al
campesino y a una niña de once años, la que avisa, explica y acompaña. Por eso
se audita con dos varas a la vez: la del **diseño de personaje** (referente
explícito del operador: Miss Minutes, de *Loki*, Marvel Studios) y la del
**agroecólogo** (Angelita es una abeja concreta, de una especie concreta, en un
país donde esa distinción tiene consecuencias).

Todo lo que sigue está anclado a archivo y línea, o a una medición reproducible.
Lo que es opinión de diseño va marcado como tal.

---

## 0. Qué se auditó

| Pieza | Archivo |
| --- | --- |
| El dibujo | `src/visual/creatures/AbejaAngelita.jsx` |
| Su identidad como datos | `src/visual/creatures/abejaIdentidad.js` |
| El kit de rasgos de goma | `src/visual/creatures/_rubberhose.jsx` |
| La cadencia (animación) | `src/visual/creatures/creatures.css` |
| Su presencia 3D | `src/visual/mundo3d/escenas/useEntradaAbeja.jsx` |
| Su voz acompañante | `src/mockups/valle/AcompananteMundo.jsx` |

Instrumento de medida: `scripts/medir-vida-angelita.mjs` (ver §4).

---

## 1. Mirada A — el diseño de personaje (Miss Minutes)

Lo que hay que extraer de Miss Minutes no es "reloj con guantes". Es que sea
**una compañera con vida propia que no distrae**. Cuatro mecanismos la sostienen:

1. **La cara es el personaje.** Su cuerpo es una forma simple; toda la
   expresión vive en ojos y boca, enormes respecto al conjunto. Se lee a
   cualquier tamaño porque lo que carga el significado es lo más grande.
2. **Nunca se congela.** Aun "esperando" hay respiración, parpadeo irregular,
   deriva de la mirada. Nunca da la sensación de que la imagen se colgó.
3. **Los movimientos grandes son raros y motivados.** Casi todo el tiempo está
   en registro pequeño; el gesto grande aparece cuando *significa* algo.
4. **Cambia de registro visiblemente.** "Te acompaño" y "esto es importante" se
   distinguen sin una sola palabra: se acerca, se cuadra de frente, abre los
   ojos, la boca trabaja, la mano sube.

### Hallazgo A1 — la cara es demasiado chica para ser el personaje

En el viewBox `-15 -15 32 30` (`AbejaAngelita.jsx:17`):

| Rasgo | Medida | Fuente |
| --- | --- | --- |
| Tronco | `rx 8.6` → **17,2 u de ancho** | `abejaIdentidad.js:47` |
| Cabeza | `r 4.4` → **8,8 u de ancho** | `abejaIdentidad.js:49` |
| Ojo grande | `r 1.95` → **3,9 u** | `AbejaAngelita.jsx:143` |
| Pupila | `r 1.95 × 0.62` → **2,4 u** | `_rubberhose.jsx:41` |

La cabeza mide **la mitad** del tronco: el cuerpo es el protagonista y la cara
es un apéndice lateral. Es la proporción inversa a la que sostiene a Miss
Minutes.

Consecuencia medible: en una burbuja de chat a 40 px, la pupila cae a **~3 px**
y el ojo entero a ~5 px. A ese tamaño la expresión no existe — y ese es
justamente el tamaño al que un agente vive en una pantalla 2D.

### Hallazgo A2 — la boca es un adorno fijo, no un instrumento

`<Sonrisa cx={8.9} cy={1.4} w={2.8} prof={1.1} />` (`AbejaAngelita.jsx:141`) es
un arco constante: `Sonrisa` (`_rubberhose.jsx:85-92`) no recibe estado ni tiene
clase animable. Angelita **jamás cambia de boca**, ni cuando habla, ni cuando
avisa, ni cuando la finca está sedienta.

En el referente, la boca es el instrumento más ruidoso del personaje. Aquí está
mudo. No hay cejas tampoco: no existen en el kit.

### Hallazgo A3 — un solo truco, y en compás de metrónomo

El único movimiento realmente notorio del repertorio es la vuelta de campana
(`rh-antic`, `creatures.css:132-143`): `rotate(0 → 338 → 367 → 360)`, cada
**9,7 s**, *siempre igual*.

Medido (§4): la desviación máxima de la pose respecto al reposo llega al
**105,5 % de la altura del bicho** — durante el giro Angelita se sale
literalmente de su propia huella.

Dos problemas, y el segundo es el grave:

- **De diseño**: un agente que da un salto mortal cada 9,7 segundos al lado del
  texto que usted está leyendo no acompaña, **compite**. Miss Minutes hace el
  gesto grande cuando significa algo; aquí es un tic de reloj.
- **De credibilidad**: es *el mismo* gesto para siempre. La variedad es lo que
  convence de que hay alguien ahí; la repetición exacta delata el bucle.

Los períodos sí están bien pensados y hay que decirlo: 1,5 / 5,6 / 6,3 / 7,9 /
9,7 / 12,7 s son casi co-primos, y el parpadeo ya tiene doble golpe
(`creatures.css:106-110`). Esa parte de la base es buena y se conserva.

### Hallazgo A4 — no existe el registro "tengo algo que decirle"

Los ejes de estado son `data-pose`, `data-animo`, `data-mojada`, `data-sed`,
`data-comiendo` (`AbejaAngelita.jsx:164-172`). **Todos describen la finca; ninguno
describe la conversación.**

El resultado se ve en `AcompananteMundo.jsx:312-316`: aparece la burbuja con la
voz de Angelita y **la abeja no se entera**. El mensaje llega solo por texto. Un
agente cuyo cuerpo no cambia cuando habla no es un personaje: es un icono con un
`<div>` al lado.

### Hallazgo A5 — Angelita no está en la pantalla del agente

`src/components/AgentScreen/` es la pantalla donde el campesino conversa con el
agente. Contiene 14 archivos (`ChatBubble`, `ChatHistory`, `ThinkingSteps`,
`SemaforoConfianza`, `VoiceStatusStrip`…) y **cero apariciones** de Angelita:

```
$ grep -rn "Abeja\|Angelita\|angelita" src/components/AgentScreen/
$          (sin resultados)
```

Angelita vive en el valle 3D y en los mockups; en la pantalla real donde ocurre
la conversación, el agente **no tiene cuerpo**. Es el patrón de "construido pero
no cableado" en su forma más pura: el personaje está terminado y la superficie
que lo necesita no lo usa.

> Fuera del alcance de esta rama (`AgentScreen` toca sesión y datos reales), pero
> queda anotado como el hueco más caro de los seis.

---

## 2. Mirada B — el agroecólogo

### 2.1 Qué especie es, de verdad

**Verificado en el repositorio, no supuesto.** La respuesta es unánime en trece
sitios independientes del código y los datos:

> **`Tetragonisca angustula`** — meliponino nativo, **sin aguijón**. NO *Apis*.

Fuentes dentro del proyecto:

- `src/data/animal-diagnostics.json:33` → `"Tetragonisca angustula (angelita)"`,
  nota `"Melipona nativa SIN aguijon"`, fuente `FEDEABEJA, ICA`.
- `src/data/animal-diagnostics.json:82` → la guarda agronómica:
  *"Apis mellifera hace pillaje y diezma colmenas de meliponas nativas
  (angelitas). Mantener aislamiento de varios kilómetros…"*
- `src/visual/creatures/index.js:40`, `README.md:23`, `AbejasScreen.jsx:254`,
  `GuardianEspiritu.jsx:35`, `SaludFinca.jsx:105`, `userProfileService.js:838`.

Y hay **foto de referencia dentro del repo**: `public/abejas/angelita.jpg`
(Carlos Eduardo Joos, CC BY 2.0, vía Wikimedia; atribución en
`AbejasScreen.jsx:48-53`). El dibujo se auditó **contra esa foto**.

*Nota de método*: el grafo vivo (Apache AGE en `alpha`) no es alcanzable desde
este nodo (`stg`), así que la verificación se hizo contra los datos versionados
del repositorio y la foto. Las trece fuentes coinciden; no hay ambigüedad que
resolver con el grafo.

### 2.2 Hallazgo B1 — el dibujo tiene la estructura de valores INVERTIDA

Esto es lo más serio de toda la auditoría. Comparando la foto con el código:

| | La abeja real (`public/abejas/angelita.jpg`) | El dibujo actual |
| --- | --- | --- |
| Cabeza | **Oscura**, con franjas amarillo pálido junto a los ojos | **Clara** `#ffd76a` (`abejaIdentidad.js:37`) |
| Tórax | **Oscuro**, con destello amarillo en el costado | *No existe como pieza* |
| Abdomen | **Ámbar pálido y prácticamente SIN bandas** | Ámbar `#ffb54f` con **tres barras negras** (`AbejaAngelita.jsx:20-24`) |
| Patas | **Amarillo vivo**, muy visibles | Tubos de tinta con pie crema (`:118-119`) |
| Alas | **Largas**, sobrepasan la punta del abdomen | Óvalos cortos encima (`rx 6` < tronco `rx 8.6`) |
| Antenas | Cortas, **acodadas**, hacia adelante | Largas, rectas, con bombillo hacia arriba (`:148-149`) |

**El diagnóstico**: la masa oscura de una angelita está en la **cabeza y el
tórax**; su abdomen es pálido y liso. El dibujo hace exactamente lo contrario:
pone la cabeza clara y le cruza el abdomen con tres barras oscuras.

Tres barras oscuras sobre abdomen ámbar es **la firma gráfica de *Apis
mellifera***. Es decir: el dibujo de la abeja nativa sin aguijón está usando el
traje de la abeja europea — que es, según los propios datos del proyecto
(`animal-diagnostics.json:82`), **la especie que saquea y diezma sus colmenas**.

Un campesino con meliponario lo nota de una. Y no es un detalle cosmético: es la
distinción sobre la que se apoya media pantalla de `AbejasScreen`.

El código llama a esas barras "chumbe andino" (`AbejaAngelita.jsx:19`), y la
intención cultural es buena. El problema no es el chumbe: es que **el chumbe
elegido coincide exactamente con la marca diagnóstica de la especie
equivocada**. Se puede conservar el guiño textil sin pintar una *Apis*.

### 2.3 Hallazgo B2 — nada en el dibujo dice "sin aguijón"

El hecho agroecológico más importante de esta abeja —y la razón por la que una
niña de once años puede estar al lado de una colmena— es que **no pica**. El
dibujo no lo afirma: la punta del abdomen no está resuelta como rasgo. No hay
error, hay **oportunidad desperdiciada**: una punta roma y redonda, dibujada a
propósito, dice "mansa" antes que cualquier texto.

### 2.4 Hallazgo B3 — las alas cortas borran la silueta característica

En reposo, una melipona pliega sus alas largas y translúcidas **más allá de la
punta del abdomen**; es lo primero que se reconoce en la entrada de un nido. Las
alas actuales (`rx 6, ry 3.6` en `cy -7`) son óvalos anchos posados encima del
cuerpo: silueta de abejorro, no de angelita.

---

## 3. Legibilidad y coherencia con el elenco

- **A tamaño chico** (§A1) la cara se pierde. Es el defecto más caro porque el
  tamaño chico es el hábitat natural de un agente en 2D.
- **Contraste**: cabeza clara `#ffd76a` sobre cuerpo `#ffb54f` son dos ámbares
  vecinos; la cabeza no se separa del cuerpo salvo por el contorno. Con la
  estructura real (cabeza oscura sobre abdomen pálido) el contraste lo pone la
  anatomía, gratis.
- **Coherencia**: el kit `_rubberhose.jsx` es de la casa y lo heredan el oso y
  el colibrí. Todo lo que se corrija aquí debe entrar **como pieza del kit**, no
  como parche de la abeja. Se respetó.

---

## 4. La vida permanente — medición, no opinión

La regla del operador es: *"en las pantallas 2D tiene vida como en Loki, se
mueve al menos 30 % del tiempo, el resto se queda quieta en la posición de
agente semi-estático, nunca deja de tener vida"*.

Eso es medible. `scripts/medir-vida-angelita.mjs` abre la app en Chromium, ubica
a Angelita y muestrea la **geometría renderizada** de partes concretas del
dibujo cada 50 ms. No lee el CSS ni confía en los keyframes: mide dónde
terminan los píxeles.

- La **pose de reposo no se asume**: es la mediana de las muestras.
- **Movimiento notorio** = la pose se aparta del reposo más del 2,5 % de la
  altura del bicho. **Reposo vivo** = se aparta, pero menos. **Congelado** = dos
  fotogramas consecutivos idénticos en *todas* las sondas.
- El **aleteo se mide aparte**: es continuo (0,15 s) y si contara como gesto
  daría 100 % y el número no querría decir nada. El presupuesto 30/70 se mide
  sobre cabeza y tronco, que es lo que el ojo lee como gesto.

### 4.1 Estado normal — la base ya cumplía

```
ruta #/mockups/visual-lib · 45 s @ 50 ms (900 muestras)
movimiento notorio   35.7 %   (meta ≥ 30 %)
reposo vivo          52.2 %
pose quieta          12.1 %
fotogramas congelados   0 / 899
racha muerta más larga  0 ms
```

**Hay que decirlo con todas las letras: en condiciones normales el trabajo
previo ya cumplía la regla del 30 %.** El problema no era la cantidad de
movimiento — era *de qué* estaba hecho (§A3: un solo truco repetido) y qué
pasaba en los bordes.

### 4.2 El borde donde se cae: `prefers-reduced-motion`

```
ruta #/mockups/visual-lib + reducedMotion:reduce · 20 s @ 50 ms
movimiento notorio    6.8 %   ← artefacto del primer fotograma
reposo vivo           0.0 %
pose quieta          93.3 %
fotogramas congelados 398 / 399
racha muerta más larga  18 600 ms      ← DIECIOCHO SEGUNDOS MUERTA
```

**Angelita es un cadáver con movimiento reducido.** 398 de 399 fotogramas
idénticos, 18,6 segundos clavada sin que se mueva un solo píxel.

La causa es explícita en el CSS:

```css
/* creatures.css:227-230 */
@media (prefers-reduced-motion: reduce) {
  .rh-boil, .rh-blink, .rh-sway, .rh-smear,
  .rh-antic, .rh-travieso, .rh-mirada, .rh-rubor { animation: none !important; }
}
/* creatures.css:305-313 — y aquí el aleteo, la lengua y las gotas */
```

Entre los dos bloques apagan **absolutamente todo**, incluido el parpadeo y el
aleteo. El comentario de cabecera lo declara como intención: *"reduced-motion =
criatura quieta en un fotograma digno"* (`creatures.css:5`).

Esa interpretación es **más estricta de lo que pide la norma y peor de lo que
pide el encargo**. `prefers-reduced-motion` existe para evitar movimiento
vestibular —desplazamientos grandes, paralaje, giros, escalados fuertes—, no
para prohibir que un personaje parpadee. La propia guía de la WCAG sobre
animación apunta a movimiento *no esencial y de gran recorrido*; un párpado de 2
px no es eso.

Y el encargo lo dice directo: *"con movimiento reducido, la vida baja a lo
mínimo pero el personaje no queda muerto"*.

**Este es el defecto que hay que arreglar.** Lo demás son mejoras; esto es una
regresión de accesibilidad disfrazada de accesibilidad.

### 4.3 Los otros dos interruptores que la matan

Mismo patrón, menos grave, pero hay que revisarlo:

- `[data-tier='bajo']` (`creatures.css:220-225`) apaga boil, sway, antic,
  travieso, mirada y rubor. Sobreviven el parpadeo y el aleteo — **no queda
  muerta**, pero queda casi. En gama baja, que es justo el equipo del campesino.
- `[data-animo='descansa'|'sediento']` (`:180-185`) apaga antics y mirada.
  Defendible como actuación (está bajita de ánimo), pero se le va también la
  **mirada**, que es lo último que debería perder un personaje que está
  escuchándolo a usted.

---

## 5. Resumen — los seis hallazgos, por costo

| # | Hallazgo | Mirada | Gravedad |
| --- | --- | --- | --- |
| B1 | Estructura de valores invertida: dibuja una *Apis* con nombre de melipona | Agroecólogo | **Alta** — error de fidelidad que el usuario experto detecta |
| 4.2 | Muerta 18,6 s con `prefers-reduced-motion` | Personaje / accesibilidad | **Alta** — incumple el encargo y penaliza a quien pidió ayuda |
| A5 | Ausente de `AgentScreen`, la pantalla real del agente | Personaje | **Alta** — fuera de alcance de esta rama |
| A1 | La cara es la mitad del cuerpo: ilegible a tamaño de chat | Personaje | **Media** |
| A3 | Un solo gesto notorio, repetido en compás fijo y desmedido (105 % de su altura) | Personaje | **Media** |
| A4 | Sin registro "tengo algo que decirle"; la boca no es un instrumento | Personaje | **Media** |
| B2/B3 | No afirma "sin aguijón"; alas cortas borran la silueta de melipona | Agroecólogo | **Baja-media** |

Lo que **no** hay que tocar, porque está bien: los períodos casi co-primos, el
doble parpadeo, la separación identidad-como-datos / dibujo / cadencia, y que el
kit de goma sea de toda la familia y no solo de la abeja.

---

## 6. Cómo verificar cualquier afirmación de este documento

```bash
# las cifras de vida (normal y con movimiento reducido)
node scripts/medir-vida-angelita.mjs --ruta '#/mockups/angelita-viva' --ventana 60
node scripts/medir-vida-angelita.mjs --ruta '#/mockups/angelita-viva' --reduced-motion --ventana 20

# la especie, en los datos del proyecto
grep -rn "Tetragonisca\|angustula" src/ | grep -v node_modules

# la ausencia en la pantalla del agente
grep -rn "Abeja\|Angelita" src/components/AgentScreen/
```

La prueba del dibujo, en cambio, **no es un test: es la captura**. La ruta para
mirarla está en §7 del `README` de la rama y en el mockup
`#/mockups/angelita-viva`.
