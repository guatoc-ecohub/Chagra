# REPARTO DE PORTALES DEL VALLE — 6 principales vs. secundarios

> Fecha: 2026-07-16 · Solo lectura + este documento nuevo. No se tocó ninguna escena
> (el valle está en reconstrucción activa por otro frente en `integra/todo-3d-a-prod`).
> Insumos: `ops/AUDIT-3D-BIODIVERSIDAD-2026-07-16.md` (PR #2534), el manifiesto
> `src/config/rutasProdChagraApp.js`, y la composición del valle
> (`src/visual/mundo3d/direccion/composicionValle.js`, `src/mockups/valle/valleData.js`).
> Método: 6 lentes balanceadas — agroecólogo, director de cine/3D, auditor de desarrollo
> visual (costo/rendimiento), auditor PWA (carga/offline/bundle), UX (navegación clara) y
> diseño instruccional (secuencia que enseña agroecología).

## Un hallazgo antes del reparto: esto ya está EN CURSO

`integra/todo-3d-a-prod` (commit `59254fa9`, "rediseño mayor de la escena del valle — la
casa de Chagra") ya escribió, en código, exactamente los 6 portales que el operador fijó:

```js
// src/visual/mundo3d/direccion/composicionValle.js — PORTALES_VALLE
{ id: 'cultivos', nombre: 'Mis matas',     emoji: '🌱' }
{ id: 'animales',  nombre: 'Mis animales', emoji: '🐄' }
{ id: 'clima',     nombre: 'El tiempo',    emoji: '⛅' }
{ id: 'mercado',   nombre: 'Vender',       emoji: '🧺' }
{ id: 'aprender',  nombre: 'Aprender',     emoji: '📖' }
{ id: 'disenio',   nombre: 'Toda mi finca',emoji: '🌳' }
```

Y `valleData.js` ya tiene el invernadero (`tipo: 'invernadero'`, antes "semillero") y un
kiosco nuevo (`id: 'aprender'`, `tipo: 'saber'`, con `fallbackMundo` mientras el hub de
juegos le abre la puerta) — el propio ejemplo del operador ("plantas e invernadero como
micro-mundos visibles") ya tiene asiento en el mapa. Este documento **no reinventa el
reparto de los 6: lo confirma, lo completa con los ~20 mundos que el audit relevó, y
corrige un solo punto de estilo** (abajo, "El ajuste que falta").

**Dato clave para leer el reparto**: `disenio` (el landmark "el monte", `tipo: 'bosque'`,
escena `mundoData.disenio` = "diseño de la finca / bosque comestible por estratos") es el
portal que hoy carga el nombre **"Toda mi finca"**. No es un antojo: `disenio` ya enlaza a
Restauración, Asociaciones y Biodiversidad (`mundoData.js:153-155`) — es el mirador desde
donde se ve el estado vivo del monte que abraza toda la finca. El propio registro llama al
Valle "un mundo más" (`mundoData.js` clave `valle`, escena `'valle'`: *"su escena ES el
mapa entero; sus hotspots son los demás mundos"*) — el Valle ES la finca completa; el
portal "Toda mi finca" es su mirador de entrada al monte, no un mundo aparte.

## El ajuste que falta (única corrección al trabajo en curso)

`composicionValle.js` dibuja los 6 portales con el **mismo pórtico de madera** (dos pies
derechos + dintel + farolito) que — leído contra la instrucción del operador — es
precisamente el lenguaje reservado para SECUNDARIOS ("los toris de madera son para
secundarios"). Los 6 principales necesitan la promesa mayor: **ventana viva** — un
recorte real de la escena de destino (el corral con sus animales de verdad, el
invernadero con sus bandejas, el cielo del valle moviéndose) asomando en el marco, no
solo un letrero. Recomendación para quien retome el arte del valle: mantener el pórtico
de madera como firma de TODO lo navegable (afordancia, "esto se toca") pero renderizar
detrás del marco un preview en miniatura de la escena real de cada uno de los 6 — el
mismo patrón que ya resolvió `VentanaValle3D.jsx` (ventana con viewport 3D vivo, chunk
perezoso por `IntersectionObserver`, espejo SVG en tier bajo) para la puerta de la casa.
Los secundarios (torii) sí se quedan con el letrero/ícono solo — ahí el ahorro de
render importa más que la promesa.

---

## Tabla de reparto — los ~24 mundos

| Mundo | Principal / Secundario | Dentro de (si secundario) | Estilo | Por qué (lentes clave) |
|---|---|---|---|---|
| **Toda mi finca** (`disenio`, Valle) | **PRINCIPAL** | — | Ventana viva | El estado vivo real de la finca; mirador del monte que la abraza. |
| **Mis matas** (`cultivos`) | **PRINCIPAL** | — | Ventana viva | La milpa-parcela es hoy el landmark más grande del valle (escala 1.3): cara del portal. |
| **Mis animales** (`animales`) | **PRINCIPAL** | — | Ventana viva | Único mundo con "espejo del dato" real (nombre/raza/estado) ya construido — el listón. |
| **El tiempo** (`clima`) | **PRINCIPAL** | — | Ventana viva | La veleta en el filo del páramo: "desde aquí se lee el cielo, y qué conviene hacer". |
| **Vender** (`mercado`) | **PRINCIPAL** | — | Ventana viva | Salida física del cuadro (sendero `plaza`): la cosecha sale a venderse, no un menú. |
| **Aprender** (`aprender`, kiosco) | **PRINCIPAL** | — | Ventana viva | Nuevo kiosco "el tablero bajo techo de paja" — hoy `fallbackMundo`, sin mundo propio aún. |
| Agua (`MundoAgua3D`, `diorama_agua`) | Secundario | Toda mi finca | Ventana viva (a reforzar) | Infraestructura de TODA la finca (riega matas Y abreva animales), no de un solo cultivo. Hoy 0 fauna — gap del audit. |
| Suelo vivo (`MundoSueloVivo3D`, `diorama_suelo`) | Secundario | Toda mi finca | Torii | Diagnóstico transversal (eras), cutaway didáctico, bajo costo GPU apropiado. |
| Subsuelo (`MundoSubsuelo`, `subsuelo`) | Secundario | Toda mi finca | Torii | Mini-juego "despierte su suelo", colgado del landmark `micorrizas`. |
| Micorrizas (landmark `micorrizas`) | Secundario | Toda mi finca | Torii | "Toque para bajar al mundo subterráneo" — puerta física a Subsuelo, no mundo propio. |
| Bosque Vivo (`MundoEntBosque`/`EscenaBosqueVivo`, `bosque_vivo`) | Secundario | Toda mi finca | Ventana viva | El mundo mejor resuelto del repo (~193 instancias, 9+9 especies reales, Ent-queñua). Merece asomar completo, no un ícono. |
| Páramo con el Ent (`MundoParamo3D`, `diorama_paramo`) | Secundario | Toda mi finca | Ventana viva | Dato fijado del operador. Ya tiene su propio guardián — el Ent-frailejón maestro, "par del Ent-queñua del bosque" (commit `fd86d1e4`). Aparte de Bosque, ambos flagship. |
| Restauración en el tiempo (`RestauracionEnElTiempo`, `restauracion`) | Secundario | Toda mi finca | Ventana viva | Reusa el mismo taller de Bosque; es el ARCO TEMPORAL de mi propio potrero volviendo a monte — "estado vivo" en el tiempo. |
| Vitrina Maestra (`VitrinaMaestraMundos`, `vitrina_maestra`) | Secundario | Toda mi finca | Torii | Es literalmente 15 arcos-portal en miniatura — la definición misma de torii; el atlas completo de la finca. |
| Cafetal (`CafetalVivo3D`, `cafetal_vivo`) | Secundario (micro-mundo) | Mis matas | Micro-mundo | Ya cableado y denso (agronómicamente correcto: café bajo sombra). Doble acceso: hub Mis matas Y landmark directo `cafe` en el valle. |
| Cacao (`CacaoVivo3D`, `cacao_vivo`) | Secundario (micro-mundo) | Mis matas | Micro-mundo | Caulifloria bien modelada; falta fauna de piso cálido (gap DR nuevo, ver audit §5). |
| Papa (`PapaVivo3D`, `papa_vivo`) | Secundario (micro-mundo) | Mis matas | Micro-mundo | Diversidad varietal real (tubérculo tricolor); frailejón lejano anuncia el páramo con criterio. |
| Milpa (parcela `cultivos`, generic cutaway hoy) | Secundario (micro-mundo) | Mis matas | Micro-mundo | **Prioridad alta**: la milpa ES la cara del portal "Mis matas" en el valle y hoy es 1 instancia de cada planta — el gap agronómico más visible se ve primero. |
| Invernadero / Semillero (landmark `semillero`, tipo `invernadero`) | Secundario (micro-mundo) | Mis matas | Micro-mundo | Ejemplo textual del operador. "Donde nace la matica" — encaja en la secuencia instruccional antes del cultivo adulto. |
| Sanidad / Huerta (landmark `sanidad`) | Secundario (micro-mundo) | Mis matas | Micro-mundo | Salud de la mata (plagas, biopreparados, toxicología) — sigue a la siembra en la secuencia. |
| Fermentos (`MundoFermentos3D`, `diorama_fermentos`) | Secundario | Mis matas | Torii | Taller de bioinsumos (MM/bocashi/biol) que alimenta Sanidad; proceso, no ecosistema — bajo costo apropiado. |
| Polinizadores (`EscenaPolinizadores`, sin ruta hoy) | Secundario (micro-mundo) | Mis matas | Micro-mundo | **Máximo retorno del audit**: 8 especies + 7 síndromes florales YA construidos, cero costo de investigación, solo falta `path`. `ParcelaCultivos.jsx` ya asume una parcela — encaja directo aquí. |
| Gallinero (`MundoGallinero3D`, `diorama_gallinero`) | Secundario (micro-mundo) | Mis animales | Micro-mundo | Pastoreo rotacional Voisin bien resuelto; patrón reusable para Lechería. |
| Meliponario / Abejas (`MundoAbejas3D`, `diorama_abejas`) | Secundario (micro-mundo) | Mis animales | Micro-mundo | Manejo apícola gestionado (Angelita nativa + Langstroth) = ganado menor, distinto de Polinizadores silvestres. |
| Compost / biofábrica (`MundoCompost3D`, `diorama_compost`, landmark `abono`) | Secundario (micro-mundo) | Mis animales | Torii | Ya tiene sendero propio potrero→pila en el rediseño en curso ("el ciclo estiércol→abono legible"): pertenece a Mis animales, no a Mis matas. |
| Lechería (no existe) | Secundario (micro-mundo, a construir) | Mis animales | Micro-mundo | DR ya listo (`cadena-lactea-campesina-*`); patrón de Gallinero es reusable. Gap de construcción, no de investigación. |
| Piscicultura (no existe) | Secundario (micro-mundo, a construir) | Mis animales | Micro-mundo | DR ya listo (`piscicultura-acuicultura-*`); ni un placeholder hoy — el más vacío de la auditoría. |
| Sierra Nevada (`SierraMonte3D`, `sierra_global` + `SierraCorteVertical`, `sierra_corte`) | Secundario | Aprender | Ventana viva | Ya es la montaña completa orbitable por piso térmico (relieve real, tocar zona = entrar a su mundo) — es geografía de Colombia, no "mi finca": encaja como currículo de Aprender, no como parte de Toda mi finca. |
| Microfauna del suelo (`MundoMicrofauna3D`, `diorama_microfauna`) | Secundario (micro-mundo) | Aprender | Micro-mundo | Vitrina táctil explícita ("nematodo benéfico", nombres reales) — es exhibición pura, no una tarea de la finca. |
| Montaña / mapa de mundos (`MontanaMundosCampesino`, `montana_mundos`) | Secundario | Aprender | Torii | Mapa SVG de wayfinding por piso térmico, no un bioma 3D — es la tabla de contenidos de Sierra + Aprender. |
| Momento de venta (`MomentoVentaMercado3D`, `momento_venta`) | Secundario | Vender | Ventana viva | ES el contenido de Vender: la res que sale del corral y llega al puesto, coreografiado — no un ícono aparte. |
| Atmósfera / día vivo (`DemoAtmosferaViva`, `atmosfera`) | Secundario | El tiempo | Ventana viva | ES el contenido de El tiempo: ciclo diurno real, mismo motor que tiñe todo el valle. |
| Almanaque lunar (`AlmanaqueScreen`, pendiente de decisión) | Secundario | El tiempo | Torii | Complemento de calendario; bajo uso frente al clima del día. |

---

## Las decisiones grandes, con las 6 miradas

### 1. Bosque Vivo y Páramo van los dos DENTRO de "Toda mi finca", no como principales aparte
- **Agroecólogo**: el monte que abraza la finca (bosque de niebla arriba, páramo en el
  filo) es infraestructura hídrica y de biodiversidad — sostiene TODOS los cultivos, no
  compite con ellos por atención diaria.
- **Director 3D**: son, con Restauración, los tres mundos mejor resueltos del repo
  (~193 instancias en Bosque, guardián monumental en Páramo) — MERECEN ventana viva, pero
  su rol narrativo es "el fondo contemplativo" del valle (`composicionValle.js`: *"lo
  contemplativo, al fondo... se miran más de lo que se tocan"*), no una puerta de uso
  diario como Mis matas o Mis animales.
- **Auditor visual/costo**: son las escenas más caras del repo (dosel multiestrato +
  guardián monumental + ciclo de día completo); concentrarlas como secundarios evita
  que 2 de los 6 botones "de mano" carguen el peor caso de GPU en un Android barato.
- **PWA**: al vivir dentro de "Toda mi finca" (no en la barra principal), su chunk
  (`vendor-three` + geometrías) solo se pide cuando el usuario decide entrar al monte —
  no compite por el presupuesto de carga inicial de las 6 puertas.
- **UX**: mantiene "la mano" en 6 acciones fuertes sin diluir jerarquía (hallazgo 1.1
  del `AUDIT-HOME-2026-07-16.md`: 6 tarjetas de igual peso ya diluyen la mano; sumar
  Bosque/Páramo como séptima/octava puerta lo empeoraría).
- **Diseño instruccional**: enseña la secuencia correcta — primero se cuida lo que se
  siembra y se cría (matas, animales), y el monte/páramo llega como la lección de
  fondo ("por qué se cuida el páramo": *fábrica de agua*), no como la primera parada.

### 2. Sierra Nevada y Microfauna van dentro de "Aprender", no de "Toda mi finca"
- **Agroecólogo**: la Sierra Nevada es geografía DE COLOMBIA (currículo de piso
  térmico), no el terreno de la finca del usuario — mezclar los dos confundiría "mi
  finca real" con "el país que estoy aprendiendo".
- **Director 3D / diseño instruccional**: `SierraMonte3D` ya es literalmente un tour
  orbitable por piso térmico con zonas tocables — es el vehículo perfecto para la
  columna vertebral pedagógica de Chagra (piso térmico), que es justo el rol de
  Aprender. Microfauna es una vitrina táctil explícita: aprender-only por diseño.
- **UX**: separa limpiamente "lo que trabajo" (los otros 5 principales) de "lo que
  estudio" — un solo portal con identidad de aula.

### 3. Polinizadores va dentro de "Mis matas", no de "Toda mi finca" ni de "Mis animales"
- **Agroecólogo**: el servicio de polinización se mide sobre MIS cultivos (café, cacao,
  cucurbitáceas) — es directamente productivo, no ambiental-genérico.
- **Director 3D**: `ParcelaCultivos.jsx` ya existe dentro de la carpeta de
  Polinizadores — la escena ya asume una parcela de cultivo como escenario.
- **Auditor visual**: es contenido TERMINADO (8 especies + 7 síndromes, grounding
  completo) — cablearlo cuesta un `path`, no una escena nueva; el mayor ROI del audit
  cae naturalmente en el portal de más tráfico esperado (matas).
- **Diseño instruccional**: enseña la asociación correcta — no hay pupa sin flor, no
  hay flor sin polinizador — en el mismo lugar donde el usuario ya está viendo su café
  o su calabaza.

### 4. Compost/biofábrica va dentro de "Mis animales", no de "Mis matas"
- **Agroecólogo**: el ciclo real es estiércol→pila→abono; el insumo nace en el corral.
- **Director 3D**: el propio rediseño en curso ya le dio un sendero corto y dedicado
  potrero→pila ("biofábrica... el ciclo estiércol→abono legible") — la dirección de
  arte ya tomó esta decisión; este documento solo la confirma.
- **UX**: evita que el mismo contenido (compost) aparezca colgado de dos portales — una
  sola puerta de entrada, referenciada desde Suelo si hace falta (ya existe el hotspot
  cruzado `suelo→compost`).

### 5. Agua/Suelo/Subsuelo/Micorrizas van dentro de "Toda mi finca", no repartidos entre Matas/Animales
- **Agroecólogo**: el agua riega la milpa Y abreva el ganado; el suelo sostiene todo
  cultivo. Asignarlos a un solo portal fragmentaría un recurso que es, por definición,
  compartido por toda la finca.
- **Auditor PWA**: son cutaways baratos (poca geometría, sin fauna hoy) — calzan bien
  como torii de bajo costo, reservando el presupuesto de ventana-viva para Agua, que sí
  merece el salto (hoy 0 fauna es el gap más visible del audit, pero temáticamente es
  columna vertebral: "la fábrica de agua de Colombia").
- **Diseño instruccional**: enseña primero el fundamento (suelo vivo, agua) antes de
  las decisiones de manejo por cultivo/animal — coherente con cómo ya narra el propio
  `NARRACION` del valle ("de aquí sale el agua para toda la finca").

---

## Los 6 principales — cómo se ve cada uno

1. **Mis matas** (`cultivos`, `mundo_cultivos` hoy 2D — recomendado: ventana viva 3D
   equivalente a `VentanaValle3D` sobre la parcela de milpa). Se ve como la
   milpa-parcela viva del valle: maíz de tutor, fríjol trepador y calabaza rastrera
   cubriendo el suelo, "granja de Age of Empires, jamás monocultivo". Al tocar, abre el
   hub de micro-mundos: Cafetal, Cacao, Papa, Milpa, Invernadero, Sanidad, Fermentos,
   Polinizadores.

2. **Mis animales** (`animales`, mundo `recinto` ya cableado, `CorralVivo.jsx`). Se ve
   como el potrero real con cercas vivas de matarratón/nacedero/botón de oro y el hato
   con nombre propio (Petunia la cerda preñada, Lola la vaca) — "espejo del dato", no
   una fila de siluetas. Nested: Gallinero, Meliponario, Compost, y los gaps a
   construir Lechería/Piscicultura.

3. **El tiempo** (`clima`, veleta en el filo del páramo, escena `DemoAtmosferaViva`).
   Se ve como el cielo real del valle en movimiento — el mismo ciclo de día/noche y
   grades de clima que tiñen toda la escena, leído desde el punto más alto: "desde
   aquí se lee el cielo, y qué conviene hacer con la finca hoy".

4. **Vender** (`mercado`, salida física del cuadro hacia la plaza). Se ve como el
   puesto con su toldo al borde del valle y el momento coreografiado
   (`MomentoVentaMercado3D`): la res que sale del corral, baja el camino y llega al
   puesto — la cosecha saliendo, no un catálogo.

5. **Aprender** (`aprender`, kiosco nuevo "el tablero bajo techo de paja"). Se ve como
   un kiosco de patio con el tablero del saber — hoy sin mundo propio cableado
   (`fallbackMundo`); su ventana viva natural es la Sierra Nevada orbitable por piso
   térmico (`SierraMonte3D`) con la Microfauna y el mapa de Montaña como anexos, y el
   hub de juegos (`HubJuegos`, ya en `NUCLEO_APP`) como la puerta de práctica.

6. **Toda mi finca** (`disenio`, "el monte", escena `estratos`/bosque comestible por
   pisos). Se ve como la arboleda trepando al clima frío, mirador de la verticalidad
   del bosque de alimentos — y desde ahí, más arriba en el mapa, asoman Bosque Vivo (el
   Ent-queñua y el dosel biodiverso) y el Páramo (el Ent-frailejón maestro y el
   nacimiento del agua), con Restauración como el arco del tiempo y Agua/Suelo como la
   infraestructura viva que sostiene todo lo demás. Es, literalmente, el estado vivo de
   la finca completa — el mundo `valle` del propio registro dice de sí mismo: *"su
   escena ES el mapa entero; sus hotspots son los demás mundos"*.
