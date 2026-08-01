# `src/visual/diferencial` — plaga vs enfermedad vs deficiencia

La confusión que **más plata le cuesta al campesino**: le echa fungicida a un
pulgón, o veneno a una falta de nitrógeno. Gasta, no resuelve, y de paso mata a
los benéficos que le estaban trabajando gratis. Este módulo es el diferencial
dibujado — y, sobre todo, **la llave para distinguirlos**.

Hermana de [`src/visual/laminas`](../laminas/README.md): mismo papel crema,
misma tinta sepia, misma firma de props (`width:100%` + `className`, sin
`size`/`inline`). Vive aparte porque no es catálogo de matas: es un módulo con
una tesis, y sus piezas se comparten entre las tres láminas.

## La tesis

> **Lo que distingue no es el color: es el ORDEN del daño.**
>
> - la **deficiencia** es ORDENADA y simétrica (va parejo, sigue la nervadura);
> - la **enfermedad** tiene FORMA (halo, borde que se sigue con el dedo, anillos);
> - la **plaga** es un DESASTRE irregular (mordidas distintas, rastro, el bicho).

Y el corolario que casi ninguna cartilla se atreve a poner: **hay casos en que
no se puede saber sin ver la mata de cerca, y ahí lo correcto es pedir la foto
o ir a mirar. La duda es parte del método.**

## Láminas

| Componente | Qué enseña | Accesibilidad |
|---|---|---|
| `LaminaDiferencial` | Los tres daños **lado a lado, sobre la misma hoja**. Cada columna: la hoja, la lupa, tres pistas y **lo que NO sirve** (la plata que se pierde). | enseña (`role=img` + rótulos) |
| `LaminaLlave` | Las tres **pruebas de mano**: el doblez (simetría), el dedo (forma), la edad (nitrógeno = viejas / hierro = nuevas). | enseña |
| `LaminaDuda` | El límite honesto: nitrógeno o nematodo **no se distinguen por arriba**. La salida: sacar una matica y mirarle la raíz. | enseña |

```jsx
import { LaminaDiferencial, LaminaLlave, LaminaDuda } from '@/visual/diferencial';

<LaminaDiferencial className="max-w-lg mx-auto" />
```

Props: solo `className` (clases extra sobre el `<svg>`; se **añaden** a las
base `w-full h-auto select-none`). Ninguna lámina tiene prop de dominio: cada
una dice una cosa y la dice completa.

## Las reglas que sostienen el dibujo

**1. La hoja es LA MISMA en los tres paneles.** Se construye una sola vez en
`formasHoja.js` (tiempo de módulo: cero costo por render, cero `Math.random`,
arte byte-idéntico entre capturas). Si la hoja cambiara de panel a panel, no se
sabría si lo distinto es el daño o el dibujo. **Controlada la hoja, lo único
que varía es la marca** — y ese es el experimento entero.

**2. Cada marca está calcada de una foto real** de `public/plaga-images/`, no
inventada. Es una lámina de campo: si la mancha no se parece a la foto, falló.

| Marca | Foto | Lo que había que respetar |
|---|---|---|
| polvo de roya | `hemileia_vastatrix.jpg` | Es **grano**, no pintura naranja: cúrcuma regada. Denso al centro, deshilachado en la orilla, con esporas sueltas más allá. |
| mancha de hierro | `cercospora_coffeicola.jpg` | Halo amarillo + **borde definido** + centro ceniza. LA figura de "tiene forma". |
| anillos concéntricos | `alternaria_solani.jpg` | El tiro al blanco — y que la lesión **se frena en la vena**. |
| mordida | hojas comidas | El **filo pardo cicatrizado** y su halo. Una herida no queda cortada a tijera. |
| gusano | `spodoptera_frugiperda.jpg`, `mocis_latipes.jpg` | Bandas que siguen el cuerpo, cápsula cefálica, la "Y" invertida. **Sin cara.** |
| agallas | `meloidogyne.jpg` | El nudo **es la raíz hinchada** (la raíz pasa por dentro), no una bolita pegada. |

**3. Nada de geometría limpia.** En la naturaleza no hay círculos perfectos:
toda mancha sale de `blob()` (contorno lobulado, frecuencias no armónicas,
semilla fija). Un círculo naranja plano es la firma del dibujo inventado.

**4. Los rótulos sobre la hoja son punteros, no explicaciones.** Cortos. Lo
que hay que entender va en las viñetas, que sí tienen ancho: un rótulo largo se
le monta a la columna del vecino.

**5. La lupa no es un zoom.** Es la marca **redibujada** con la información que
uno gana al acercar la cara a la mata — como en cualquier lámina botánica. Y en
la columna de la enfermedad la lupa muestra **el envés**, porque ahí está la
respuesta y hay que voltear la hoja.

## Anatomía (para que no se note "inventado")

La hoja de café de `formasHoja.js` respeta lo que se ve en las fotos:
elíptico-oblonga (~2.5:1), base cuneada, punta **acuminada**, margen
**ondulado**, y sobre todo **nervadura broquidódroma**: las laterales se
arquean y **se cierran en lazo con la siguiente sin tocar el borde**. Dibujar
venas que llegan al filo es el error de calco que delata todo lo demás.

`puntoEnHoja(t, u)` posa cualquier marca en coordenadas de hoja (`t` a lo
largo, `u` a lo ancho): así cae siempre dentro y sigue la forma, sin medir a
ojo. Los huecos de mordisco van **estirados en la dirección de la vena**,
porque el bicho esquiva la nervadura dura y se come lo blandito de en medio.

## Errores ya cometidos acá (no repetirlos)

- **Huecos que parecían flores.** `blob()` con armónicos (l, l+2) y poco ruido
  da un trébol. Al subirle el ruido dio **estrellas**. Se arregló con
  frecuencias no armónicas + ruido de verdad + `alargue`/`rot` — y, sobre todo,
  entendiendo que **una hoja masticada se come por la orilla**, no a lunares.
- **El filo flotando sobre el hueco.** El filo va montado en el borde del
  mordisco, así que la mitad caía sobre el papel. Lleva `clip` (que no se salga
  de la hoja) **y** `mask` (que borre la mitad del hueco), con el grosor al
  doble para compensar.
- **Agallas lavadas.** Campanas anchas + eje de pocas muestras = raíz ondulada
  en vez de anudada. Angostas y con 70 muestras.
- **El gusano plumoso.** Setas largas → parecía espiga de trigo.

## Técnica

- SVG puro, **cero dependencias nuevas**, estáticas, sin animación, GPU-nula.
- **No importa `mundo3d/paleta`**: `paletaMadre` cuelga de `atmosferaMadre`, que
  importa `three` — meter eso en un pliego de papel arrastraría el motor 3D
  entero. Los colores viven en `paletaDano.js`, con la foto de origen anotada.
- Ids de `<defs>` con **`useId`** (saneado: `useId()` trae `:` y rompe los
  `url(#…)`), así una lámina se puede repetir en la misma página sin colisión.
- **rsvg-safe** salvo por el `<text>`: sin emoji-en-SVG, sin filtros exóticos
  (solo `feGaussianBlur`), aptas para captura del harness visual.
- Paleta de papel/tinta **fija**: es un pliego prendido a la pantalla, legible
  al sol y en los cuatro temas.

## Fuentes

Fotografías de campo de `public/plaga-images/` y el corpus de maestros de
plagas y de MIP (el diferencial completo, las grandes de Colombia y los nombres
folk desambiguados). La voz de los textos es la del corpus: *"voltee la hoja"*,
*"mire si el patrón es al azar o parejo"*, *"si me manda foto del envés le afino
el diagnóstico"*.
