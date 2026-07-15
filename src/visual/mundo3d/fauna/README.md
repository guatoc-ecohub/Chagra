# fauna/ — los guardianes del monte

Fauna **realista** del monte andino: la que el campesino ve, o teme, o pierde.
No los 9 bichos rubber-hose — esos son otro registro y no se mezclan.

## La regla de estilo

En Chagra hay dos registros:

| Registro       | Quiénes                                       | Dónde vive        |
| -------------- | --------------------------------------------- | ----------------- |
| **rubber-hose** | los 9 bichos, Angelita — caricatura con alma  | `creatures/`      |
| **realista**    | danta, jaguar, oso, colibrí, arlequín…        | **acá**           |

Este módulo **no importa nada de `creatures/`** a propósito. Ni los tokens de
color. Mezclar los registros es exactamente lo que hay que evitar, y la forma
más fácil de que pase es compartir una constante "porque total es el mismo rojo".

## Ni Disney ni documental frío: dignidad

Estos animales están en **conflicto real** con el campesino — el oso tumba el
maizal, el puma se lleva el ternero, el tigrillo se cuela por arriba del
gallinero — y a la vez son lo que hace único al monte. Las dos cosas son ciertas
al mismo tiempo, y el módulo no resuelve la tensión hacia ningún lado:

- **No hay ternura boba.** Ningún animal tiene ojos grandes de peluche ni pide
  cariño. El jaguar no ronronea.
- **No hay villano.** Ninguno gruñe, enseña los colmillos ni acecha a la cámara.
  El jaguar impone por el **tiempo** — se detiene, mira, sigue — no por la
  amenaza.
- **No se minimiza la pérdida.** El campo `conflicto` de cada ficha dice lo que
  dice el corpus, incluida la parte donde perder un maizal *es plata real y
  esfuerzo real*.

Lo que se busca es que el campesino sienta **respeto**. Que es lo que uno siente
por algo que le puede costar caro y que igual no quiere que desaparezca.

## Tres correcciones al encargo

El encargo traía tres premisas que las fuentes no sostienen. Están corregidas en
el código, con la fuente al lado. No es puntillosidad: si la anatomía y el
comportamiento no dicen la verdad, esto es decoración.

### 1. El jaguar no se lleva el ternero — es el **puma**

El corpus de conservación (140 pares) tiene **cero menciones del jaguar**. El
conflicto del ternero está en la línea 107 y es de *Puma concolor*. El jaguar es
de tierra caliente: no es fauna de páramo.

Por eso el módulo **incluye al puma** (`FICHA_PUMA`), que es quien carga el
conflicto documentado. El jaguar se queda —el encargo lo pide como guardián, y
la escena es una galería de guardianes, no un inventario ecológico— pero su
ficha dice explícitamente que no tiene respaldo de conflicto en vez de
inventarle uno para darle dramatismo.

Bonus: el corpus (78) describe el **registro directo** del puma —"huellas en
línea casi recta… pisando con la trasera casi en el mismo punto donde pisó la
delantera"—. Es el dato de locomoción más preciso de todo el material, y está
implementado (la vía angosta de la marcha `acecho`).

### 2. El "águila real de montaña" no existe en Colombia

*Aquila chrysaetos* es paleártica. La rapaz grande del páramo colombiano, con
fuente IAvH en el grounding del proyecto, es el **águila de páramo**
*Geranoaetus melanoleucus*. Es la que está acá.

### 3. La rana: **Atelopus**, no *Phyllobates*

El repo afirmaba dos especies incompatibles a la vez: *Phyllobates terribilis*
(la "rana dorada" del Chocó, dendrobátida, tierra caliente) y *Atelopus*
(arlequín de páramo, bufónido). Familias distintas, pisos térmicos opuestos.

Se resuelve en **Atelopus**, porque es el que de verdad está en el monte andino
(IAvH lista *A. muisca* y *A. lozanoi*). Y el encargo pedía "rana dorada /
arlequines" como si fueran dos: en Atelopus son uno, porque **el arlequín real
es dorado y negro**. La contradicción se disuelve mirando el animal verdadero.

Regalo: Atelopus **camina**, no salta. En una tarea sobre locomoción, eso es un
premio.

### Y una nota sobre el colibrí

El guardián es *Oxypogon guerinii* (barbudito de páramo, endémico de Colombia):
**pardo, de pico corto y recto**, con cresta blanca y barba iridiscente. El
código viejo lo pintaba turquesa con el pico más largo que el cuerpo — ese es
*Colibri coruscans*, otra especie. La auditoría por visión sobre el material del
propio operador ya lo había marcado. Acá va el pardo.

## De dónde sale cada cosa

| Qué                              | Fuente                                              |
| -------------------------------- | --------------------------------------------------- |
| conflicto y convivencia          | `Chagra-strategy/ops/corpus-maestros/teacher-conservacion.jsonl` (140 pares) |
| franjas y elenco del páramo      | `ops/GROUNDING-PARAMO-2026-07-09.md` (IAvH)          |
| **anatomía, color, biomecánica** | **conocimiento zoológico general — marcado `[zoología]`** |

Esto último importa: se verificó par por par y **el corpus no trae ni una medida,
ni un tono, ni una cadencia**. Es material de conflicto, no de morfología. La
única seña morfológica de los 140 pares es la huella de tres dedos de la danta
(línea 91) — y está honrada en `pieGeo`.

Todo lo que es anatomía lleva la marca `[zoología]` en la ficha. Si mañana
aparece un DR de fauna con medidas, `faunaEmblematica.js` es el archivo que se
corrige, y nada más.

## Lo que hace que caminen de verdad

### La ley anti-patinaje

Un animal 3D se ve falso casi siempre por la misma razón: **los pies resbalan**.
Se anima el ciclo por un lado y se mueve el cuerpo por otro, no coinciden, y el
bicho patina como muñeco de feria.

La cadencia **no se elige**:

```
frecuencia = velocidad / zancada
excursión del pie = zancada · duty factor
```

Con eso, la velocidad local del pie en apoyo cancela **exacto** el avance del
cuerpo: el pie queda clavado en el suelo y el cuerpo le pasa por encima. Eso —y
no el detalle del modelo— es lo que se lee como *peso*. Está derivado paso a paso
en la cabecera de `marcha.js`.

### Lo que separa un animal de otro

El mismo componente (`CuadrupedoRealista`) es la danta, el jaguar, el puma, el
oso, el tigrillo y el borugo. No por ahorrar código: porque **los seis son el
mismo animal con parámetros distintos**, y esa es la tesis. Lo que los separa:

- **El orden de apoyo.** La danta usa paso lateral de 4 tiempos. El oso **ambla**
  — mueve las dos patas del mismo lado casi juntas — y de ahí sale el bamboleo.
  El bamboleo del oso no es un adorno de animador: es la consecuencia de su orden
  de apoyo. Cambiá cuatro números y el tapir se vuelve oso.
- **El duty factor.** Más apoyo = más pesado. El acecho felino tiene 0.78: nunca
  pierde el suelo, porque cada paso tiene que poder abortarse.
- **La postura del pie.** Plantígrado (oso: toda la planta) / digitígrado
  (felinos: en los dedos) / ungulado (danta: en la pezuña) / esparrancado (el
  anfibio: codos y rodillas para afuera).
- **Qué se estabiliza.** El ungulado cabecea al andar. El felino al acecho
  **estabiliza la cabeza** —los ojos de un depredador no pueden bailar— y lo que
  sube y baja son los omóplatos. Por eso el jaguar lee a jaguar aunque nadie sepa
  señalar por qué.
- **El ancho de la huella.** El felino pisa casi sobre la línea del medio (el
  registro directo del corpus); el oso pisa ancho; el arlequín, esparrancado.

### El detalle que casi todos los rigs se comen

En un cuadrúpedo, el **codo** de la pata delantera apunta hacia **atrás** y la
**rodilla** de la trasera apunta hacia **adelante**. No es simetría: son huesos
distintos. Acá es un signo en el polo del IK — y es la diferencia entre un
cuadrúpedo y una mesa que camina.

## Decisiones que parecen limitaciones y no lo son

- **El aleteo del colibrí no se anima.** Bate a ~28 Hz: a 60 fps es media batida
  por cuadro. Si se intenta, el muestreo devuelve un aleteo lento y falso. Pero
  el ojo tiene el mismo problema y resuelve igual — nadie vio nunca el ala de un
  colibrí, se ve un **borrón**. Se dibuja el arco que barre. Más barato **y** más
  verdadero.
- **El arlequín mide 4 cm.** A escala real, y la escena se **acerca** en vez de
  agrandarlo. Un arlequín del tamaño de un gato sería una mentira cómoda sobre lo
  que se está perdiendo — y lo que se está perdiendo es algo diminuto que cabe en
  una uña y que casi nadie vio nunca. Para verlo hay que arrodillarse: en la
  quebrada y en la escena.
- **El águila va lejos y alto.** 26 m de radio, 16 de altura. Un águila pegada a
  la cámara sería un títere; así es como se la ve de verdad. Y el alabeo sale de
  la física (`tan θ = v²/r·g`), no del ojo: si alguien cambia el radio, se
  corrige solo.

## La iridiscencia es estructura, no pintura

La gorguera del colibrí **no tiene pigmento**. Tiene bárbulas que hacen
interferencia de película delgada: el color depende del **ángulo** con que la
mirás. Por eso el mismo bicho, sin moverse ni cambiar de luz, pasa de verde a
violeta cuando girás la cabeza.

Y la física tiene dirección: a mayor ángulo, el reflejo se corre hacia el azul
(*blue-shift*). Nunca al revés. Por eso la rampa va **verde frío → azul del agua
→ índigo del mortiño** y no en cualquier orden.

Implementación: un producto punto contra la cámara y un lerp en una rampa de tres
colores. Sin shaders. `iridiscencia.js`.

## La paleta madre

Este módulo es de los primeros en adoptar `paleta/`, y la adopta entera
(GUIA.md §1-§5). Con una salida documentada:

**La paleta nació de la flora, la tierra y el agua — no tiene pelaje de oso ni
gorguera de colibrí.** Y `paleta/` es de otra rama y no se toca. Así que
`pelajes.js` no inventa **ni un hex**: **deriva** cada pelaje de sus parientes de
la paleta con `mezclar()`, y deja la receta escrita al lado.

```js
lana: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.45),   // la danta lanuda
roseta: NEUTROS.tinta,                                // el anillo
rosetaCentro: mezclar(_leonado, TIERRAS.cacao, 0.45), // y la mota de adentro
```

Que la mezcla sea trazable no es burocracia: es la razón por la que el jaguar y
la corteza del quenual pertenecen al mismo cuadro. Un pardo sacado del ojo se
despega del mundo aunque nadie sepa decir por qué.

**El único color que grita en todo el módulo** es el oro del arlequín. Y grita
porque es **aposematismo** — el animal es tóxico y lo anuncia — no porque quede
lindo. Eso es un acento de la paleta usado como manda la casa: a cucharadas, y
por una razón.

## Uso

```jsx
import { EscenaFaunaEmblematica } from '@/visual/mundo3d/fauna';

<EscenaFaunaEmblematica tier="alto" />              // la senda entera
<EscenaFaunaEmblematica tier="alto" foco="rana" />  // arrodillarse junto al arlequín
<EscenaFaunaEmblematica tier="bajo" reducedMotion /> // quietos, pero DE PIE
```

O un animal suelto, dentro de cualquier escena:

```jsx
import { CuadrupedoRealista, FAUNA_EMBLEMATICA } from '@/visual/mundo3d/fauna';

<CuadrupedoRealista
  ficha={FAUNA_EMBLEMATICA.oso}
  perfil={perfilDeTier(tier)}
  camino={miSenda}          // sin camino, camina en el sitio
/>
```

`reducedMotion` **no congela en T-pose**: el animal se queda **de pie y
respirando**, que es como está un animal quieto. Un bicho en T-pose no es una
degradación: es un error con permiso.

## Tier-safe

| Tier        | Qué pasa                                                        |
| ----------- | --------------------------------------------------------------- |
| alto        | 9 especies, pie articulado aparte, elipsoides subdivididos, rosetas con centro, sombras |
| medio/bajo  | 3 especies (danta, jaguar, oso), pie fusionado a la canilla, menos segmentos, sin águila |

**Degradar es sacar bichos, nunca sacarles la marcha.** El motor de locomoción
corre igual en gama baja: es aritmética escalar y un IK de dos huesos por pata.
Lo que se cae es el detalle, no el peso.

## Archivos

| Archivo                     | Qué es                                                 |
| --------------------------- | ------------------------------------------------------ |
| `faunaEmblematica.js`       | las fichas: anatomía real en metros, marcha, alma, conflicto |
| `pelajes.js`                | los pelajes, derivados de la paleta madre               |
| `marcha.js`                 | **el motor**: marchas, ley anti-patinaje, IK, colas, sendas |
| `anatomiaFauna.geom.js`     | los cuerpos procedurales + `ANCLA_PIE` (el contrato del pie) |
| `iridiscencia.js`           | el color que sale del ángulo                            |
| `CuadrupedoRealista.jsx`    | el que camina (6 especies, un componente)               |
| `ColibriGuardian.jsx`       | el que se sostiene en el aire                           |
| `RanaArlequin.jsx`          | la que camina y hace señas                              |
| `AguilaParamo.jsx`          | la que hace los círculos                                |
| `EscenaFaunaEmblematica.jsx`| la senda del páramo                                     |

## Pendiente

- **Sin verificación visual.** Esta rama se entregó sin build ni captura (así se
  pidió: solo arte, y los archivos son nuevos, no entran en el grafo de imports
  de nadie hasta que alguien los cablee). El rig está armado para ser correcto
  **por construcción** —los huesos se estiran solos entre articulaciones, el
  ancla del pie es un contrato único que leen el motor y la malla— pero **nadie
  lo ha mirado todavía**. Primera captura: mirar los pies. Si patinan, la
  frecuencia se está eligiendo en algún lado en vez de salir de la velocidad.
- **El registro directo** implementa la vía angosta (la parte que se ve). La
  huella-en-huella exacta depende de la relación zancada/largo del cuerpo y no
  está forzada.
- **El tigrillo trepa** (corpus:105 — "es de los que sube") y eso todavía no está
  en la escena: hoy solo camina. Es la seña de comportamiento que le falta.
- **El borugo es nocturno** y la escena es de día. Merece su hora.
- Falta el **venado** *Mazama rufina*, el **conejo** *Sylvilagus brasiliensis*, la
  **tingua bogotana** y el **perico de los frailejones** — los cuatro con respaldo
  IAvH y ninguno en el roster actual.
