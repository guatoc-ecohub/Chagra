# Brief para Fable — los 3 mundos que el operador declaró muertos

**Fecha:** 2026-07-21 · **Diagnóstico:** Opus (mirado, no contado) · **Ejecución:** Fable (ART-ONLY)
**Rama de diagnóstico:** `fable/congruencia-elenco` @ `f9488d23`

---

## 0. Léase esto primero (ahorra 20 minutos)

### 0.1 En `chagra-dev` DOS de los tres NO CARGAN — y no es culpa del arte

Al capturar `https://chagra-dev.guatoc.co/#/mockups/mundo-gallinero-3d` y `.../mundo-botica-cana-3d`
sale la pantalla de error *«Algo fallo en El gallinero con pastoreo»*. La consola dice:

```
Failed to fetch dynamically imported module: https://chagra-dev.guatoc.co/assets/MundoBoticaCana3D-D9fQB5b_.js
Failed to load module script: ... server responded with a MIME type of "text/html"
```

El `index.html` de dev apunta a chunks que ya no están en el webroot (deploy con hash viejo).
**Consecuencia para usted:** no juzgue estos mundos por `chagra-dev`, y si al terminar los mira ahí
y le sale error, **no es su cambio**. Capture contra el build local:

```
npm run build && (cd dist && python3 -m http.server 8791 --bind 127.0.0.1)
# luego http://127.0.0.1:8791/#/mockups/<ruta>
```

Solo `mundo-abejas-3d` carga hoy en dev.

### 0.2 El pecado común a los tres: **el estado del DOM no está cableado a la escena 3D**

- Gallinero: `const [paso, setPaso]` — los 4 botones cambian `paso`, y `paso` **no se le pasa a
  `<Escena>` ni a nada dentro del `<Canvas>`**. Solo cambia un párrafo de texto.
- Abejas: `const [seleccion, setSeleccion]` — las 3 tarjetas cambian su propio borde. **Nada más.**
- Botica: `etiquetas` sí llega al 3D, pero es un booleano todo-o-nada.

Por eso "no hace nada": usted toca y el mundo no responde. **Este es el arreglo de mayor
retorno de los tres mundos** y es barato: la escena ya está construida, falta que reaccione.

### 0.3 Encuadre móvil roto en los tres

El objetivo de Chagra es móvil (390×844). Las tres cámaras están posadas para 16:9 de escritorio:

| Mundo | En 390×844 se ve… |
|---|---|
| Gallinero | 30% superior de cielo crema vacío; el panel del ciclo **tapa las gallinas**; el huerto genérico se come el primer plano |
| Botica | **Dos tercios de pasto vacío.** NO se ve el trapiche, NI el buey, NI el cañal, NI la botica. Solo hornilla + gaveras en la esquina |
| Abejas | Mitad superior del canvas es degradado plano sin nada |

Verificado: en 1280×820 el contenido **sí existe** (ver capturas `-ancho-`). Es encuadre, no ausencia.
No redibuje lo que ya está: **reencuadre**.

---

## 1. `mundo-gallinero-3d` — «visualmente lindo pero no hace nada»

**Archivo:** `/home/kortux/Workspace/chagra/src/mockups/MundoGallinero3D.jsx` (290 líneas)
**Capturas:**
- `/home/kortux/Workspace/chagra/ops/capturas/mundos-muertos-2026-07-21/gallinero-movil-390.png`
- `/home/kortux/Workspace/chagra/ops/capturas/mundos-muertos-2026-07-21/gallinero-ancho-1280.png`

### Qué tiene puesto que no se mueve ni responde

1. **El tractor de gallinas nunca camina.** El mundo se titula *«El gallinero que camina»* y
   `TractorGallinas()` está clavado en `position={[-0.2, 0.25, -1.8]}` sin `useFrame` ni props.
   El título promete lo único que la escena no hace.
2. **Las 4 parcelas se ven idénticas.** `PARCELAS` solo cambia el hex del verde (`#6f963f`,
   `#8da84c`, `#a7b85e`, `#557f39`). En la captura no se distingue cuál está pastoreada, cuál
   descansando y cuál regenerada. **La lección entera del mundo es la rotación, y la rotación
   es invisible.**
3. **Las 8 gallinas viven amontonadas en un rincón.** Todas las coordenadas de `GALLINAS` caen
   entre x −5.5 y −2.9: siempre la parcela 1. Nunca pisan las otras tres. Se leen como bultos
   rojizos, no como gallinas.
4. Ponedero, huevos, balde, huerto (18 arbolitos idénticos), cerca y flechas: **todo estático**.
   Lo único con `useFrame` es el cabeceo de la gallina.
5. **Las flechas del ciclo no cierran un ciclo.** `FlechasCiclo` son palitos ámbar sueltos que
   atraviesan la escena; no se lee circuito.
6. **La maqueta flota en el vacío.** Una losa marrón rectangular suspendida en crema plano. No hay
   horizonte ni continuidad con la finca — se lee como diorama de feria escolar.

### Qué contenido falta

No hay contenido: hay 4 strings de una línea. Ni una cifra, ni un tiempo, ni una consecuencia.
El mundo no dice cuántos días descansa una parcela, cuántas gallinas caben, qué comen, ni
qué pasa si usted **no** rota.

### Qué enseña hoy vs. qué debería enseñar

- **Hoy:** «rotar es bueno» (afirmado en un párrafo, no demostrado).
- **Debería:** el *porqué* — que la parcela recién pastoreada queda pelada y cargada de gallinaza,
  que necesita **días de descanso** antes de volver, y que volver antes de tiempo es sobrepastoreo:
  suelo desnudo, erosión y parásitos. Y el servicio real de la gallina detrás del ganado/huerto:
  **escarba la boñiga y rompe el ciclo de la larva** — que es exactamente el «control de plagas»
  que la bajada promete y nunca muestra.
- Insumos verificados: `Chagra-strategy/deepresearch/DR-FANOUT/porcicultura-y-avicultura-agroecologica-de-patio-en-fincas-andinas-colombianas-gemini-2026-06-19.md` (25 KB) y
  `grounding-gallinas-ponedoras-campesinas-glm-2026-06-19.md` (14 KB). **Verifique cualquier cifra
  contra ellos antes de escribirla en escena — no invente números.**

### BRIEF ART-ONLY — Gallinero

> **Nota de arte:** en `src/visual/creatures/` **NO existe una Gallina rubber-hose**. Están Colibrí,
> Mariposa, Escarabajo, Crisopa, Lombriz, Sirfido, Tucán, Guacamaya, Ardilla, Danta, Jaguar… pero
> gallina no. Las gallinas de hoy son esferas y conos procedurales — justo el patrón que el proyecto
> abandonó. **Esta es la pieza de dibujo más valiosa del brief.**

1. **Dibuje `Gallina.jsx`** en `src/visual/creatures/`, rubber-hose, mismo lenguaje que
   `AbejaAngelita.jsx` (que es el patrón de referencia). Gallina campesina criolla andina.
   Mínimo dos plumajes (clara y colorada). Expórtela en `src/visual/creatures/index.js`.
2. **Reemplace las gallinas procedurales por billboards `<Html>`** en `MundoGallinero3D.jsx`,
   con el mismo patrón que `AbejaDelEnjambre` en `MundoAbejas3D.jsx` (que ya funciona) o que
   `<Bicho>` en `MundoBoticaCana3D.jsx`.
3. **Cablee `paso` a la escena.** `<Escena tier={tier} reducedMotion={reducedMotion} paso={paso} />`.
   Con eso:
   - Las gallinas **se reparten a la parcela del paso activo** (interpolando la posición, que
     caminen, no que teletransporten).
   - El **tractor se mueve** a la parcela activa en el paso «2. Traslado». Ahí se cumple el título.
   - **Las 4 parcelas se ven distintas por estado**, no por decoración: pastoreada = pasto corto y
     tierra a la vista + motitas de gallinaza; descanso = pasto alto y parejo, más saturado;
     huerto aliado = surcos con matas. Que el operador distinga el estado **sin leer**.
   - La parcela activa se resalta (halo suave, no aro-disco-espejo: eso está vetado).
4. **Reencuadre para 390×844**: suba/aleje la cámara y baje el `target`, para que la losa entera
   entre. Mueva el panel del ciclo a la banda inferior para que deje de tapar las gallinas.
5. **Aterrice la maqueta**: horizonte/lomas de fondo con la paleta de `paletaMadre.js`, para que
   deje de flotar en crema.
6. Variedad en el huerto: hoy son 18 clones. Rompa escala y tono.

**Criterio de aceptación visual** (captura 390×844 desde el build local):
- Se ven **gallinas rubber-hose reconocibles como gallinas**, no esferas.
- **Toque «3. Descanso» y en la captura se ve cambiar la escena**: las gallinas están en otra
  parcela y las parcelas se ven distintas entre sí. Adjunte **antes/después del toque**.
- El tractor se ve en distinta posición en el paso 2 que en el paso 1.
- La maqueta ya no flota: hay fondo.
- Nada tapa a las gallinas.

---

## 2. `mundo-botica-cana-3d` — «va por buen camino, le faltan 2 o 3 pasadas»

**Archivo:** `/home/kortux/Workspace/chagra/src/mockups/MundoBoticaCana3D.jsx` (1327 líneas)
**Capturas:**
- `/home/kortux/Workspace/chagra/ops/capturas/mundos-muertos-2026-07-21/botica-cana-movil-390.png`
- `/home/kortux/Workspace/chagra/ops/capturas/mundos-muertos-2026-07-21/botica-cana-ancho-1280-etiquetas.png`

El operador tiene razón en que va por buen camino: es el más trabajado de los tres. **El buey SÍ
gira** — verificado, va dentro del grupo `vuelta` en `Trapiche` (línea 721), que rota con `useFrame`.
La hornilla titila, burbujea y humea. Eso está bien y **no hay que rehacerlo**.

### Qué tiene puesto que no se mueve ni responde

1. **El techo de paja de la enramada tapa el molino y el buey.** La cámara está alta (y=6.5)
   mirando hacia abajo, y el techo del trapiche es un plano opaco. En la captura ancha, bajo la
   enramada solo se ve una mancha oscura. **La pieza que sí está viva es la única que no se ve.**
   Ese es el «medio muerto»: hay movimiento, pero está escondido.
2. **El cañal parece un pinar.** Los tallos de `Canal` se leen como conos verde oscuro tipo abeto.
   La caña de azúcar real es alta, delgada, de entrenudos marcados, con hojas largas arqueadas y
   penacho. Es el error de fidelidad botánica más visible de la escena.
3. **Las 7 matas no se distinguen entre sí.** Sábila, ruda, caléndula, hierbabuena, limoncillo,
   ortiga y manzanilla se leen como manchitas verdes iguales. Sin la etiqueta, ninguna es
   reconocible. Y **ninguna se mueve** (ni una brisa).
4. **Las etiquetas se solapan** («Hierbabuena» / «Manzanilla» / «Limoncillo» encimadas).
5. **No hay ni una persona.** La copia dice *«el panelero que conoce el punto»* y *«saber que pasa
   de abuela a nieta»*. En escena no hay nadie: ni panelero en la paila, ni campesina en la botica.
6. **El guarapo no corre.** `CanalGuarapo` es geometría quieta; la canoa está seca. No hay cachaza
   subiendo, no hay cucharón, y la panela de las gaveras nunca cuaja.
7. **Hueco de composición** en el centro (pasto oliva vacío con una piedra sola) y **niebla muy
   fuerte** que lava el fondo hasta dejarlo lechoso.

### Qué contenido falta

Al revés que los otros dos: **aquí el contenido sobra, pero está en el lugar equivocado.**
`MATAS` (7 fichas) y `PASOS_PANELA` (5 fichas) son texto excelente y bien escrito — y viven en
listas HTML **debajo** del canvas, con emojis. El mundo 3D no los cuenta; los cuenta un folleto
pegado abajo. **La pasada que falta es mudar ese saber a la escena.**

### Qué enseña hoy vs. qué debería enseñar

- **Hoy:** 12 fichas de prosa que se leen como cartilla, más un diorama bonito y mudo.
- **Debería:** el proceso **como secuencia**, siguiéndolo. Y lo agroecológico que el texto ya
  acierta pero la escena no muestra: **el bagazo es la leña de la propia hornilla** (el circuito
  cerrado, «nada se bota»), y **la cachaza que se retira es lo que da panela clara**.
- Insumo verificado: `Chagra-strategy/deepresearch/DR-FANOUT/la-cana-de-azucar-y-el-trapiche-panelero-colombiano-como-se-ve-de-verdad-para-dibujarlo-fiel-glm-2026-06-19.md` (5.6 KB) — está para eso, para dibujarlo fiel.

### BRIEF ART-ONLY — Botica y trapiche

1. **Deje ver el trapiche.** Techo de la enramada con opacidad/recorte cuando la cámara está
   arriba, o suba el techo y baje el ángulo. **El buey girando tiene que verse.** Es la pieza
   con más vida de los tres mundos y hoy está bajo un sombrero.
2. **Redibuje la caña** para que no sea un pinar: tallo segmentado alto y delgado, hojas largas
   arqueadas, penacho arriba. Fíese del DR de arriba.
3. **Anime al buey de verdad**: hoy es un cuerpo rígido que resbala en círculo. Cabeceo con el
   paso y balanceo del rabo — rubber-hose, no realismo.
4. **Ponga al panelero** revolviendo la paila con el mecedor, y una figura en la botica. Use el
   patrón de billboard SVG (`<Bicho>` ya está en el archivo, líneas 1045-1070).
5. **Haga correr el guarapo** por la canoa hacia la paila, y la espuma/cachaza que se retira.
6. **Convierta el toggle en recorrido.** Hoy `etiquetas` es booleano; hágalo paso 1→5: la cámara
   se acerca al paso activo y solo se resalta ese. Que se pueda *seguir* la panela.
7. **Diferencie las 7 matas** por silueta y color para que se reconozcan sin etiqueta, y déles
   brisa. Resuelva el solape de chips.
8. Baje la niebla, llene el hueco central, y **reencuadre para 390×844** (hoy en móvil el mundo
   está literalmente fuera de cuadro).

**Criterio de aceptación visual** (captura 390×844):
- **El buey y el molino se ven**, no tapados por el techo.
- La caña se lee como caña, no como pino.
- Hay al menos una persona trabajando en la escena.
- En móvil se ven **la botica y el trapiche a la vez**, sin dos tercios de pasto vacío.
- Adjunte captura del paso 2 y del paso 4 para mostrar que el recorrido cambia la vista.

---

## 3. `mundo-abejas-3d` — «se ve medianamente bien pero no hace nada»

**Archivo:** `/home/kortux/Workspace/chagra/src/mockups/MundoAbejas3D.jsx` (270 líneas)
**Captura:** `/home/kortux/Workspace/chagra/ops/capturas/mundos-muertos-2026-07-21/abejas-movil-390.png`
(este es el único que sí carga en `https://chagra-dev.guatoc.co/#/mockups/mundo-abejas-3d`)

### Qué tiene puesto que no se mueve ni responde

1. **Las abejas vuelan pero no hacen nada.** Las 9 Angelitas tienen órbitas lissajous con fases
   co-primas — está bien resuelto. Pero **orbitan anclas fijas en el aire**: ninguna se posa en una
   flor, ninguna entra ni sale de la piquera. En la captura se leen como calcomanías suspendidas.
   **El mundo se llama «Polinización que da fruto» y la polinización nunca ocurre en pantalla.**
2. **Las 12 flores están congeladas.** No se abren, no se mecen, no cambian cuando las visitan.
3. **El apicultor es un maniquí de palos**: cápsula + esfera + dos cilindros verdes. Al lado de
   las Angelitas rubber-hose se ve como de otro juego. Y está totalmente quieto.
4. **El panal flota descontextualizado**: un tablero de miel plantado en el pasto, ni dentro de
   una colmena ni sostenido por nadie.
5. **Las 3 tarjetas no tocan el 3D.** `seleccion` solo se pinta a sí misma.
6. **El disco de pasto flota** sobre un degradado plano; media pantalla superior está vacía.
7. Sin botón «Volver» (no recibe `onBack`, a diferencia del gallinero).

### Qué contenido falta

Tres párrafos genéricos que servirían para cualquier documental de abejas del mundo.
**Nada de lo específico está**: la escena dibuja una caja melipona con su piquera de tubo de
cerumen y no la explica; no aparece el nombre *Tetragonisca angustula*; no se explica por qué la
angelita **no tiene aguijón** (que es lo que la hace manejable en la casa campesina, con niños);
no se distingue que la melipona guarda la miel en **potes de cerumen**, no en panales verticales
como la Langstroth que está al lado. La escena pone las dos viviendas juntas y **no dice en qué
se diferencian** — que es justo la razón de ponerlas juntas.

### Qué enseña hoy vs. qué debería enseñar

- **Hoy:** «las abejas polinizan y hacen miel».
- **Debería:** la angelita como **abeja de la casa** — sin aguijón, se maneja sin traje, produce
  poca miel pero muy valorada, y su conservación depende de que haya flores todo el año y sitios
  de anidación. Y el contraste de arquitectura: potes de cerumen vs. panal de cera.
- Insumos verificados: `Chagra-strategy/deepresearch/DR-FANOUT/abejas-nativas-sin-aguijon-meliponicultura-en-agroecologia-colombiana-aristas-citadas-glm-2026-06-19.md` (10.7 KB) y
  `angelita-la-abeja-tetragonisca-angustula-anatomia-y-movimiento-reales-para-animarla--como-se-diseo-l-d4404bd0-glm-2026-06-19.md` (9.7 KB, anatomía y movimiento para animarla).

### BRIEF ART-ONLY — Abejas

1. **Que la polinización ocurra.** Cambie las órbitas fijas por un ciclo de forrajeo: la abeja
   **se posa en una flor**, se queda un momento, y **vuela a otra**. Que se vea el viaje flor→flor.
   Es el corazón del mundo y hoy no pasa.
2. **Que entren y salgan de la piquera** de la caja melipona (el tubo de cerumen ya está dibujado,
   líneas 104-105) y de la piquera de la Langstroth.
3. **La flor responde a la visita**: se mece al posarse, suelta un puntito de polen. Que se vea
   la consecuencia, no solo el gesto.
4. **Redibuje al apicultor** en el lenguaje rubber-hose de la casa, y anímelo (que revise un
   cuadro, que se agache a la caja). Hoy desentona con todo lo demás.
5. **Aterrice el panal**: métalo en un cuadro que el apicultor sostiene, o dentro de una colmena
   abierta. Que deje de ser un cartel clavado en el pasto.
6. **Cablee `seleccion` al 3D**: la tarjeta activa lleva la mirada a su zona — 01 al surco de
   flores, 02 al panal/Langstroth, 03 a la caja melipona. Que tocar mueva el mundo.
7. **Diferencie visualmente las dos viviendas** con un rótulo corto en escena (usted, español de
   Colombia): la Langstroth con panales de cera; la melipona con **potes de cerumen**.
8. Componga el cuadro: horizonte/lomas y algo de vegetación alta; hoy media pantalla es degradado
   vacío y el disco de pasto flota.

**Criterio de aceptación visual** (captura 390×844):
- Al menos **una abeja posada sobre una flor**, no todas flotando.
- Al menos una abeja **en la boca de la piquera**.
- El apicultor se ve del mismo mundo que las Angelitas.
- Toque la tarjeta 03 y la vista se va a la caja melipona: adjunte **antes/después**.
- El disco de pasto ya no flota.

---

## 4. Reglas que este brief NO puede violar

- **Oso café (`OsoAndino`) y borugo están archivados por feos.** No los resucite.
- **La fauna 3D usa los SVG rubber-hose de la casa como billboards**, no geometría procedural
  nueva. La única pieza nueva autorizada aquí es **dibujar la Gallina** (hoy no existe).
- **`mergeGeometries`: desindexe antes de fusionar.** Mezclar indexadas con no-indexadas devuelve
  `null` en silencio y la especie no se dibuja. Ya mordió dos veces.
- Paleta y materiales madre: `src/visual/mundo3d/paletaMadre.js` y `src/visual/mundo3d/materialesMadre.js`.
  Los tres mundos ya usan `atmosferaMadre.js` / `cielosHoraData.js` — no invente paletas.
- **Español de Colombia de usted** en todo texto en escena (toque, seleccione, mire). Sin voseo.
- Respete `reducedMotion` y `decidirTier()`: los tres ya lo hacen, no lo rompa.
- **Nada de discos-espejo, aros ni faroles** para resaltar (clutter ya identificado y vetado).
- **Gate visual:** ninguna escena se da por buena sin captura que se verifique por contenido.
  Con `chagra-dev` roto, capture contra el build local (§0.1).

## 5. Orden sugerido por retorno

1. **Cablear el estado al 3D en los tres** (§0.2) — es lo que responde literalmente a «no hace nada».
2. **Reencuadre móvil de los tres** (§0.3) — sobre todo Botica, que hoy en móvil no muestra su tema.
3. **Dibujar la Gallina rubber-hose** — la pieza de arte nueva de mayor valor.
4. **Destapar el trapiche** — hay vida ya hecha escondida bajo un techo.
5. **Posar las abejas en las flores** — el mundo cumple por fin lo que su título promete.
