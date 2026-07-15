# `src/visual/laminas/botanicas` — el cuaderno de campo de las 21 matas

Láminas botánicas de las matas que el campesino colombiano siembra de verdad,
en **SVG procedural puro**: cero assets, cero dependencias nuevas, cero red.
La referencia no es la ilustración de app — es la **lámina científica clásica**
(Mutis y la Expedición Botánica, Humboldt, los cuadernos de Darwin): precisión,
línea limpia, puntillismo, aparato crítico. **Si sale "cute", falló.**

Es la hermana mayor de [`../`](../README.md): allí viven las láminas dibujadas
a mano, una por una, para una pantalla concreta. Acá vive un **motor** con
datos verificados detrás, que produce las 21 desde un registro por especie.
Comparten el oficio (papel crema, tinta sepia, rsvg-safe) pero **no la firma
ni el ciclo de vida** — por eso tienen barrel separado.

## Para qué es

Para que alguien ponga **su hoja al lado de la lámina y compare**. Todo lo
demás (el hábito, el ciclo, la flor) es contexto para poder hacer eso. Por eso
la banda de señales va abajo, va grande y va última: es el uso.

## La regla de la casa

> **El dato manda sobre el dibujo.**
> Si el corpus dice "polvo naranja en el envés", la lámina dibuja ese polvo,
> **en el envés**, con ese naranja. Si el corpus no dice nada, la lámina lo
> **declara** — no rellena el hueco con adorno.
> Un cuaderno de campo que inventa es peor que no tener cuaderno: alguien va a
> tomar una decisión de plata con esto.

## Procedencia — la colección se audita en la cara

Cada lámina lleva su sello, y cada campo de cada especie lleva su `fuente`:

| Sello | Qué significa |
|---|---|
| `corpus` | Verificado en el corpus/fichas del repo. |
| `corpus+botanica` | El dato es del corpus; la morfología es botánica establecida. |
| `corpus-parcial` | Hay huecos declarados en el registro. |
| `botanica` | Botánica general, **no** documentada en el corpus. |
| `sinDato: [...]` | Lo que nadie pudo confirmar. Se declara, no se inventa. |

**El hueco más grande, declarado en el pliego**: la **caña panelera** no tiene
ficha en este repositorio (ni en `public/cycle-content/` ni en
`public/grafo-relations.json`). Su lámina no tiene banda de señales y lo dice
en la cara, con un recuadro. El vacío señalado es información: dice dónde hay
que trabajar.

Fuentes leídas: `Chagra-strategy/ops/corpus-maestros/teacher-plagas.jsonl`
(135 pares), `teacher-piso-frio.jsonl`, `teacher-piso-calido.jsonl`,
`public/grafo-relations.json` (134 especies + `_pest_synonyms`),
`public/cycle-content/*.json` (~500 fichas).

## Las 21

Ordenadas por piso térmico, que es el orden del corpus y la primera pregunta
que se hace ante una mata nueva: *"¿eso se da aquí?"*.

| Piso | Matas |
|---|---|
| **Frío** (1800-3400) | papa · papa criolla · ulluco · haba · arveja · curuba |
| **Templado** (1000-2800) | café · maíz · fríjol · arracacha · cebolla larga · tomate · tomate de árbol · uchuva · mora |
| **Cálido** (0-2000) | plátano · yuca · cacao · caña panelera · ahuyama · aguacate |

Son **21 y no 20** porque la papa criolla se ganó lámina propia: otro ciclo
(90-120 días contra 150-180), sin dormancia y menos resistente a la gota.
Meterla como "una variedad más" habría borrado justo lo que hay que saber para
sembrarla.

## Anatomía de un pliego

Proporción A (1000 × 1414, la raíz de dos del papel de verdad). Orden de
lectura pensado para cómo se para alguien frente a una mata desconocida:

| | Figura | Qué contesta |
|---|---|---|
| **Fig. 1** | La mata, a escala | ¿Qué tan grande es? ¿Cómo se para? |
| **Fig. 2** | La raíz | ¿Qué hay abajo? ¿Cómo se siembra? |
| **Fig. 3** | La hoja — **haz y envés** | Lo que se mira primero; donde vive casi toda enfermedad. |
| **Fig. 4** | La flor | Quién la visita, cuándo carga. |
| **Fig. 5** | El fruto **en corte** | Por qué el cultivo es lo que es. |
| **banda** | El ciclo | Cuánto hay que esperar (tiempos reales). |
| **banda** | Las señales | **Sana contra enferma.** El uso. |

**La escala no es opcional.** Toda mata va contra silueta humana de 1,65 m +
barra de escala. Sin eso la lámina miente por omisión: el cacao (6 m) y el
tomate de árbol (3 m) dibujados igual hacen creer que son matas parecidas.

## Lo que el motor dibuja de verdad (y no insinúa)

Esto es lo que separa la lámina científica del dibujo animado:

- **Borde aserrado** = diente **geométrico**, no una línea ondulada que lo
  sugiera. Ver `geometria/hoja.js` → `BORDES`.
- **Nervadura broquidódroma** del café = las venas **se unen en bucles** antes
  del borde. Es la firma de la Rubiaceae: por eso un cafeto se reconoce sin
  leer el rótulo.
- **Filotaxia real**: el café va **opuesto**, el aguacate **alterno**. Esa sola
  diferencia los separa a diez metros. La espiral alterna sale de 137,5°.
- **Puntillismo**, no degradés: el volumen se modela con **densidad de puntos**
  (`nucleo/trama.js`). Un degradé delata la pantalla.
- **Haz y envés no son el mismo verde.** El envés siempre más pálido y gris —
  y en la mora, **glauco**, que es lo que le da el nombre (*Rubus glaucus*).
- **Tramado (líneas) para los cortes**, puntos para los volúmenes: convención
  de lámina científica — de un vistazo se distingue lo cortado de lo entero.

### La tesis que sostiene media colección

Puestos lado a lado, dos cortes explican por qué dos matas que "dan un bulto
bajo tierra" se siembran y se manejan **al revés**:

- **Papa** — el tubérculo tiene **ojos** (yemas) y **médula estrellada**, y
  cuelga de un **estolón**: es **TALLO**. Por eso rebrota, por eso se siembra a
  pedazos y **por eso se aporca**.
- **Yuca** — la raíz tuberosa tiene **cordón fibroso** en el eje y **no tiene
  ojos**: es **RAÍZ**. Por eso **no** rebrota y se siembra **de estaca**.

El corpus dice "tubérculo" sin explicar la diferencia. Dibujarla mal induciría
al error, así que se dibuja bien y se declara como botánica general.

## Las señales — el motor de síntomas

26 señales en `geometria/sintoma.js`, cada una anclada a una descripción
**literal** del corpus. Cuatro reglas embebidas:

1. **El sitio es diagnóstico.** Roya = **envés**. Gota = empieza por **borde y
   punta**. Mancha angular = presa **entre las nervaduras**. Broca = entra por
   la **corona**. Dibujar la lesión donde no es enseña a mirar donde no es.
2. **El borde separa hongo de bacteria.** Borde definido + halo amarillo →
   hongo. Difuso y acuoso → bacteria.
3. **La progresión es el dato.** La sigatoka empieza en **rayitas** y termina
   negra; la monilia empieza **aceitosa** y termina en harina. Una lámina que
   sólo pinta el final llega tarde — que es cuando ya no sirve.
4. **Hay que poder descartar.** Mildeo velloso (vellosidad gris-morada, envés)
   vs oídio (polvo blanco seco, haz) se confunden y **se tratan distinto**: van
   los dos en la misma lámina.

Y dos trampas de nombre que la colección desactiva expresamente:

- **"Viruela"** es antracnosis en la mora, pero **ojo de gallo** en el café.
  Mismo apodo, dos enfermedades, dos manejos.
- **La negrilla/fumagina no ataca el tejido**: crece sobre la melaza de los
  chupadores. Se controla el **insecto**, no con fungicida. La lámina de la
  roña del aguacate existe justamente para enseñar a **no** fumigar.

## Mapa

```
botanicas/
├── nucleo/
│   ├── rng.js            azar DETERMINISTA (la lámina no puede hervir)
│   ├── trazo.js          curvas: Catmull-Rom → Bézier, perfiles, espejo
│   ├── trama.js          PUNTILLISMO, tramado, pelusa, borrones
│   └── paletaLamina.js   papel, tinta, lavados, síntomas ← paletaMadre
├── geometria/            devuelve DATOS (`d`s), no JSX
│   ├── hoja.js           perfiles · bordes · nervaduras · compuestas
│   ├── raiz.js           7 sistemas radicales reales
│   ├── flor.js           arquetipos por FAMILIA
│   ├── fruto.js          14 órganos y sus CORTES
│   ├── sintoma.js        26 señales, del corpus
│   └── habito.js         portes · filotaxia · escala humana
├── especies/             LA VERDAD: 21 registros + procedencia
│   ├── pisoFrio.js · pisoTemplado.js · pisoCalido.js
│   └── index.js          ESPECIES · POR_ID · POR_SINTOMA · COBERTURA
├── pintores/             de geometría a tinta (React)
│   ├── organos.jsx · PintaHabito.jsx · tipografia.jsx
├── LaminaBotanica.jsx    el pliego
└── laminasBotanicas.css  el papel como objeto en pantalla
```

## Técnica

- **SVG puro, cero dependencias nuevas.** Ni una webfont: la lámina tiene que
  sobrevivir a un celular sin datos en la montaña, que es donde se usa.
- **Determinista**: el azar se siembra con el id de la especie. La papa tiene
  exactamente los mismos puntos hoy, en la captura de mañana y en `stg`. Un
  cuaderno de campo no cambia de dibujo entre dos miradas.
- **El costo, medido y sin adornos**: un pliego pesa **300–1.200 nodos DOM** y
  **41–123 KB gzip** (la papa es la más cara: hoja imparipinnada con foliolillos
  intercalados, cada uno con su puntillismo). El conteo de nodos es bajo porque
  el puntillismo sale como **un solo `<path>`** con miles de arcos en vez de
  miles de `<circle>` — un nodo contra dos mil. El peso vive en los `d` largos,
  no en el árbol. Sin animación, sin filtros por frame, sin red. Es lo que pesa
  una foto mediana, pero se imprime a cualquier tamaño y no se descarga.
- **rsvg-safe**: ids saneados (`idSvg`), sin emoji-en-SVG, sin
  `<foreignObject>`, sin filtros exóticos — apto para el harness de captura.
  El único `filter` vive en la CSS (la sombra del pliego), no en el SVG.
- **Accesible**: `role="img"` + `<title>`/`<desc>`. La `<desc>` se arma con los
  datos reales (piso, altitud, sistema radical, enfermedades), así que un
  lector de pantalla recibe la lámina, no "gráfico".
- **Imprimible**: `@media print` la saca a página completa, sin sombra ni fondo
  de app. El destino natural de una lámina es la pared del cuarto de
  herramientas.

## Uso

```jsx
import { LaminaBotanica, POR_ID, buscaEspecie } from '@/visual/laminas/botanicas';
import '@/visual/laminas/botanicas/laminasBotanicas.css';

// El pliego entero:
<LaminaBotanica especie={POR_ID.papa} numero="I" />

// Buscando como pregunta la gente (nadie dice "Cucurbita moschata"):
<LaminaBotanica especie={buscaEspecie('zapallo')} />
```

Los pintores se pueden usar sueltos, sin el pliego, para armar una vista
propia (una ficha de hoja, un corte en una tarjeta, la raíz en un modal):

```jsx
import { PintaHoja, PintaFruto, POR_ID } from '@/visual/laminas/botanicas';

const cafe = POR_ID.cafe;
<svg viewBox="-20 -60 160 120">
  {/* la roya vive en el ENVÉS: por eso se pide esa cara */}
  <PintaHoja spec={cafe.hoja} semilla="demo" piso="templado"
             cara="enves" sintoma="roya" etapa={0.7} />
</svg>
```

Y el índice inverso contesta la pregunta que de verdad se hace en campo —
*"vi polvo naranja, ¿qué más se me puede enfermar así?"*:

```jsx
import { POR_SINTOMA, COBERTURA } from '@/visual/laminas/botanicas';

POR_SINTOMA.roya          // → [{ especie: 'cafe', enfermedad: 'Roya', … }]
COBERTURA                 // → qué tan documentada está cada lámina
```

## Lo que falta (declarado, no escondido)

- **Caña panelera**: sin ficha en el repo. Sin banda de señales. Es la tarea
  más grande que deja esta colección.
- **Morfología floral y foliar**: el corpus casi no la documenta. Está marcada
  como `botanica` en cada registro — no como dato verificado.
- **Curuba y uchuva**: sus lesiones se dibujan **por analogía** declarada
  (mora/tomate de árbol y tomate, respectivamente). La ficha lo dice con un
  aviso, en el pliego, no en letra chica.
- **Ulluco y haba**: enfermedades **nombradas** en el corpus pero sin
  descripción visual. El daño se dibuja genérico y se declara como tal.
