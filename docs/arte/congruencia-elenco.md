# Congruencia del elenco 3D — auditoría de lenguaje visual

**Alcance:** todo el elenco vivo de Chagra en 3D — personajes rubber-hose, fauna
emblemática realista, fauna ambiental de escena, el hato del valle y la
flora-personaje (el Ent). No cubre terreno ni arquitectura salvo donde el elenco
se ancla al suelo (sombras de contacto).

**Lente:** Nintendo (BOTW/TOTK — paleta madre + ley de materiales compartida) ·
Ori (presupuesto de polígonos por categoría). Insumos: los tres DR de dirección
de arte (dirección low-poly Switch, cohesión de materiales/shaders, estética
rubber-hose 1930s).

**Veredicto en una línea:** el elenco ya es **muy coherente** — existe un sistema
madre maduro y bien documentado que la mayoría del elenco respeta. Los outliers
reales son pocos y quirúrgicos; se corrigieron dos y se dejan flagueados los de
juicio de producto.

---

## 1. La ley madre (lo que el elenco YA comparte)

El repo tiene un sistema de dirección de arte central, no un acuerdo tácito:

| Módulo | Rol |
| --- | --- |
| `visual/mundo3d/atmosferaMadre.js` | la HORA: luz dorada, cielos por familia, bloom, `mezclar()` |
| `visual/mundo3d/paleta/paletaMadre.js` | los COLORES con nombre (verdes por piso térmico, tierras, cortezas, aguas, acentos, neutros, la casa) |
| `visual/mundo3d/paleta/materialesMadre.js` | las RECETAS de material (`crearMaterialMadre` / `crearMaterialVertexColors`) tier-safe |
| `visual/mundo3d/paleta/LuzMadre.jsx` | la luz como componente para escenas standalone |
| `visual/mundo3d/paleta/GUIA.md` | el contrato de adopción (checklist del mundo nuevo) |

**Las cuatro reglas de la casa (paletaMadre.js):**

1. Los verdes andinos **no son saturados de tech** — van del oliva del cálido al
   verde-plata del páramo, siempre con tierra adentro.
2. El **único azul con permiso es el agua** (+ índigo de mortiño como acento
   textil). Cielos y sombras los pone la atmósfera.
3. **No hay gris fabril puro ni negro puro** — bajo el sol andino hasta el zinc
   se entibia; la línea oscura es `INK`/`tinta` = `#241a10` (negro cálido).
4. El **rojo** existe como cochinilla / café cereza (textil, fruto), nunca como
   rojo catástrofe de UI.

**Ley de materiales (claymation mate, DR de shaders):** mate total —
`MeshStandardMaterial` con `roughness ≥ 0.85, metalness 0` en tier alto, que
degrada solo a `MeshLambertMaterial` en gama media/baja. Excepciones tasadas y
documentadas: **agua** (el único con transparencia + brillo, `roughness 0.2`),
**lámina/zinc** (`roughness 0.5, metalness 0.25` — metal tibio y gastado) y la
**piel húmeda del anfibio** (rana arlequín, `roughness 0.25` — su firma). El
bloom es un velo (`fuerza 0.18, umbral 0.85`), solo tier alto.

---

## 2. Auditoría por eje

### 2.1 Paleta madre
**Coherente.** El elenco realista (`visual/mundo3d/fauna/pelajes.js`) **deriva
cada pelaje, pluma y piel de la paleta madre con `mezclar()`** y deja la receta
de mezcla escrita al lado (jaguar leonado = `camino + ámbar 0.55`; danta lanuda =
`cacao + tinta 0.45`; etc.). No inventa ni un hex. Los acentos que "gritan" están
tasados y justificados por biología real: el oro aposemático de la rana, el
índigo espectral del jaguar, la barba iridiscente del colibrí.

**Sin saturados tech puros en el elenco:** el barrido de `#f00/#0f0/#00f/`neón no
encontró nada (salvo la menta biopunk `#2dffc4` del oso guardián, que es su
identidad aprobada).

### 2.2 Ley de materiales
**Ejemplar.** La fauna 3D procedural (`AguilaParamo`, `ColibriGuardian`,
`CuadrupedoRealista`, `RanaArlequin`, `EscenaFaunaEmblematica`) usa
**exclusivamente** `crearMaterialVertexColors` / `crearMaterialMadre`. El hato
del valle (`mockups/valle/animales.jsx`) usa `MeshLambertMaterial + vertexColors`
con AO y luz de cielo horneadas — equivalente a la receta madre en gama baja. No
hay un solo `MeshPhong`/`MeshPhysical`/`clearcoat`/`envMap` en el elenco.

### 2.3 Silueta y rubber-hose
**Coherente.** Los personajes 2D comparten la fundación transversal: `line-boil`
(contorno que vibra, años 30), `lip-sync` de 4 visemas, modo-poder, prop-por-mundo
y ropa por clima. El **sombreado suave de forma** es una convención compartida y
medible: el mismo ápice de luz `radialGradient cx≈42% cy≈30% r≈82–88%` se repite
en Dálmata, Beagle, Jaguar y los osos — eso es el look claymation del DR, no
brillo especular genérico. Dos registros deliberados y **documentados**, cada uno
consistente por dentro:

- **Rubber-hose 2D** (`creatures/_faunaRubberTokens.js`) — caricatura con alma
  (los aliados de control biológico + los personajes de la casa).
- **Fauna emblemática realista 3D** (`fauna/pelajes.js`) — el monte real,
  derivado de la paleta. `pelajes.js` documenta explícitamente que **no** mezcla
  con los tokens rubber-hose: mezclar los registros es justo lo que se evita.

### 2.4 Escala / presupuesto de polígonos
**Coherente.** Cada bicho declara su **presencia en escena** como datos en su
`*Identidad.js` (p. ej. `ABEJA_PRESENCIA`: tamaño de billboard por distancia,
altura de ronda, atenuación por altura). El presupuesto de polígonos sigue el DR
por categoría: el hato son 2 draw-calls por animal (cuerpo + cabeza pivotante); la
fauna ambiental es billboard SVG; el `q` (0..1) baja el detalle geométrico en gama
baja. La firma "fauna 3D = SVG rubber-hose como billboard, no geometría procedural
nueva" se respeta para el elenco 2D; la fauna emblemática realista es la excepción
aprobada (geometría con color por vértice horneado).

### 2.5 Anclaje al suelo (sombras de contacto)
La ley de la casa es **sombra de contacto CÁLIDA**: `ATMOSFERA.sombra = #3a2a18`
y la textura del valle es `rgba(8,6,4)` (café oscuro, no negro azul). Aquí vivía
el outlier más claro (ver §3).

---

## 3. Outliers corregidos (fixes quirúrgicos)

Cambios aditivos, mínimos, contra ley escrita. No re-autoran silueta ni identidad.

### 3.1 Sombra de contacto del cóndor — fría → cálida ✅
`CondorBillboard.jsx:433` — el blob de sombra usaba `#101613` (negro **verdoso
frío**, rgb 16,22,19), el **único blob de sombra frío de todo el 3D** (los demás
son `ATMOSFERA.sombra`/`rgba(8,6,4)`, cálidos). Corregido a `#1c140b` (warm,
misma proporción cálida del valle), preservando la densidad (`opacity 0.2`). Cero
pérdida de intención: es una sombra en el suelo. **Confianza: muy alta.**

### 3.2 Quetzal fugaz — glow verde genérico eliminado ✅
`bosque/FaunaBosque.jsx:503,512` (`QuetzalFugaz`, tier alto) — el cuerpo y la
cabeza llevaban `emissive="#073d20"` (auto-iluminación verde saturada). **Ningún
animal del elenco disciplinado se autoilumina con emissive plano**; la única
iridiscencia sancionada es la barba del colibrí, dirigida por ángulo y multiplicada
×0.5 (física de película delgada, no pintura). Se retiró el emissive de ambos
meshes. El **esmeralda difuso se conserva** (acento iridiscente legítimo, como el
oro aposemático) y el efecto "cometa" lo sostienen la MOTION fugaz + la luz dorada
de la escena, no un neón. **Confianza: alta.**

---

## 4. Outliers flagueados (juicio de producto — NO tocados)

Se dejan documentados; son decisiones del operador, no del brazo de arte.

- **Deriva menor de tinta fría** en fauna secundaria surfaceada vía `FaunaCalido`:
  Tucán (`Tucan.jsx` `#141118`, ojo `#0c0c12`) e Iguana (`#152210`) usan negros
  ligeramente fríos vs la ley INK cálida `#241a10`. Bajo payoff visual y
  defendible por plumaje/piel de la especie; se recomienda unificar al INK cálido
  solo si se hace un pase de fauna cálida. **Severidad: baja.**
- **Fidelidad del quetzal** (agroecólogo): el quetzal resplandeciente es de
  Centroamérica/bosque nuboso, no del páramo andino-colombiano. El color ya quedó
  disciplinado (§3.2), pero la **especie** en sí es una decisión de fidelidad del
  operador. **Severidad: baja (contenido, no arte).**
- **Brillo del metal de la lechería** (`EscenaLecheriaViva.jsx`): aluminio/zinc/
  cobre a `roughness 0.35, metalness 0.6–0.7` — más brillante que la receta madre
  `lamina` (`0.5/0.25`). Es escenario (no elenco) y el aluminio pulido de las
  cantinas legítimamente brilla más que el zinc rústico. Se deja como está.
- **Archivados — NO resucitar:** `OsoAndino` (café), `OsoAnteojos` y `Borugo`
  están fuera del registro `CREATURES` por decisión del operador (feos). Sus
  paletas quedan derivadas correctamente en `pelajes.js`, pero **no se surfacean**;
  aparecen aquí solo para "no mostrar", no para "arreglar".

---

## 5. Recomendaciones (sin código, para el próximo pase)

1. **Centralizar el INK cálido** como token único que la fauna secundaria importe,
   para cerrar la deriva de tinta fría sin tocar 40+ SVG a mano.
2. **Extender el patrón `pelajes.js`** (derivar de la paleta con `mezclar()` +
   receta al lado) a cualquier fauna de escena nueva antes de que invente su hex.
3. **Mantener la disciplina del glow:** self-illumination solo cuando hay física
   real detrás (iridiscencia por ángulo, aposematismo, candela/ventana encendida),
   nunca como atajo para "que resalte".

---

## 6. Aplicación de la ley madre a mundos rezagados (pase 2)

El censo de cielos encontró que la adopción de `CIELOS_HORA`/`mezclarCielo` ya
es casi universal; quedaban DOS rigs inventados a mano, y se convirtieron
(capturas antes/después en `capturas/congruencia-madre/`):

1. **Polinizadores** (`EscenaPolinizadores.jsx` + `polinizadoresIdentidad.js`) —
   el último mundo surfaceado con cielo propio: un celeste frío de mediodía
   (`#bfe3f2`) que se veía de otro juego, y una noche con rebote de suelo FRÍO
   (`#141a24`, contra la ley del negro cálido). Ahora: el día ES
   `CIELOS_HORA.mediodia`, la noche ES `CIELOS_HORA.noche` (luna plata de la
   casa, suelo `N.suelo` cálido), y el ojo de abeja se DERIVA del mediodía madre
   corrido al violeta-UV (física del síndrome, patrón del páramo con su bruma).
   Verdes del monte y cerca viva derivados de `VERDES`/`CORTEZAS`/`TIERRAS`.
2. **VitrinaCriaturas · escarcha** (`mockups/vitrina3d/VitrinaCriaturas.jsx`) —
   la vitrina del elenco montaba la helada con un rig genérico azul-blanco
   (cielo `#d7e6f2`, sol `#ffffff`). Ahora amanece con `<LuzMadre
   madre={CIELOS_HORA.amanecer}>`: durazno rasante, relleno lavanda y pasto
   `mezclar(VERDES.frio, NIEBLAS.paramo, 0.25)` — la tarjeta decía "amanecer
   despejado" y por fin lo es.

Deliberados que NO se tocaron: micorrizas (menta bioluminiscente = identidad
del wood-wide web), restauración (clima dual año 0/año 50 = dispositivo
narrativo, su año 50 aterriza en el Bosque Vivo), páramo mockup (frío DERIVADO
de la dorada con `mezclaHex` — el patrón correcto, se citó como referencia).

*Auditoría aditiva. El gate visual antes/después lo hace la orquestación; este
documento es el mapa, no el veredicto de píxel.*
