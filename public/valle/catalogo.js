// ── catalogo.js — LA FUENTE ÚNICA DE VERDAD DE LOS NUEVE MUNDOS ─────────────
//
// Módulo de DATOS PURO: sin three, sin DOM. Lo leen tres consumidores:
//   · `mundos.js`   → planta el mojón de cada mundo en su punto del valle
//   · `portales.js` → arma la ventana que abre el domo (el índice)
//   · `gen-marcos.mjs` (Node) → genera el MARCO de cada mundo (Ent + compAI +
//     las pantallas 2D de ESE mundo)
// Que sea uno solo es lo que impide que los tres se desincronicen — que es
// justo lo que pasó antes (la ventana del domo apuntaba a `chagra-dev` y el
// índice `/mundos/` a `/app/`, dos caminos distintos al mismo sitio).
//
// ⚠️ NINGÚN destino sale de `3d.guatoc.co`. Todo es relativo.

// ── LOS ENTS ────────────────────────────────────────────────────────────────
// Copiados literalmente de `chagra origin/dev`:
//   `src/visual/mundo3d/bosque/pisosBosqueGradiente.js` → MAPA_PISO_ENT
//   `src/visual/mundo3d/bosque/entsGradiente.geom.js`   → LECCIONES
// Los cuatro pisos están tallados desde 2026-07-22 (entró la ceiba). El propio
// módulo dice que **agregar un Ent es UNA LÍNEA DE DATOS** — verificado leyendo
// el archivo, no de oídas.
export const ENTS = {
  ceiba: {
    nombre: 'La ceiba', arbol: 'Ceiba · Ceiba pentandra',
    piso: 'Tierra caliente · 0 a 1.000 m',
    titulo: 'La ceiba se sostiene sola',
    texto: 'Usted la reconoce por las aletas del pie: son los contrafuertes, raíces tablares tan altas como usted, y son las que sostienen semejante árbol donde la raíz no puede ahondar. La copa se abre en horizontal como un parasol: por eso da sombra a media vereda.',
  },
  roble: {
    nombre: 'El roble', arbol: 'Roble andino · Quercus humboldtii',
    piso: 'Templado y frío · 750 a 3.450 m',
    titulo: 'El roble andino y sus cuatro hongos',
    texto: 'Bajo su sombra hay un trato firmado: cuatro hongos —Cantharellus, Lactarius, Cenococcum y Tomentella— le forran las raíces y le buscan agua y minerales lejos de donde el árbol alcanza; él les paga con azúcar. Los dos primeros sacan la seta al pie: cuando usted las ve, el trato está andando.',
  },
  aliso: {
    nombre: 'El aliso', arbol: 'Aliso · Alnus acuminata',
    piso: 'Frío · bosque altoandino',
    titulo: 'El aliso fabrica su propio abono',
    texto: 'El aliso no espera a que le abonen: en sus raíces la bacteria Frankia arma nódulos que toman el nitrógeno del aire y lo dejan en el suelo. Y encima lleva micorrizas de los dos tipos. Por eso levanta suelos degradados: donde usted siembra aliso, la tierra queda mejor de lo que estaba.',
  },
  quenua: {
    nombre: 'La queñua', arbol: 'Queñua o colorado · Polylepis',
    piso: 'Páramo',
    titulo: 'La queñua es una fábrica de agua',
    texto: 'Es el árbol que llega más arriba. MÍRELE LA COPA: la niebla le entra por ahí y no vuelve a salir. La copa y su musgo la peinan, el agua se junta en gotas y escurre por el tronco hasta el pie. Eso que brota a su lado es la misma agua: de ahí sale la quebrada que baja.',
  },
};

// ── EL MUNDO SE INTEGRA AL PAISAJE: `soporte` ───────────────────────────────
// Orden del operador (2026-07-26), lo más importante del encargo:
//   «Lo más importante es resolver que el mundo visualmente SE INTEGRE en el
//    valle de Guatoc, para que sea útil. — El mundo del clima, que se vea en
//    la pared de La Chorrera.»
//
// O sea: el mundo no se posa ENCIMA del terreno con un poste al lado; el
// accidente del terreno ES su soporte. `soporte:{tipo:'pared', t, dx}` cuelga
// el mundo de la cara de La Chorrera: `t` es la altura sobre la caída (0 = el
// pie, 1 = el filo del escarpe) y `dx` cuánto se aparta del hilo de agua
// (+x = la derecha del cuadro). El punto exacto lo resuelve `cliff.js`
// (`facePos`), o sea la MISMA piel que dibuja la pared: si la pared se mueve,
// el mundo se mueve con ella.
//
// ── QUÉ CABE EN ESA PARED, Y POR QUÉ (los tres que pidió revisar) ───────────
//  1. **EL TIEMPO — t 0,63, a 205 u a la derecha del hilo.** Es el ejemplo del
//     operador y es literal: la niebla del páramo SUBE por esa pared y se le
//     pega a media altura. Desde la casa, el campesino lee el tiempo de mañana
//     mirando hasta dónde llegó la niebla en la roca. El clima no está «cerca
//     de» la pared: la pared ES el instrumento.
//  2. **EL BOSQUE — se probó en la pared y VOLVIÓ a la ladera.** El argumento
//     de la sección seguía siendo bueno, pero el operador precisó el criterio:
//     «el bosque, los tres estratos PARADOS EN LA LADERA». Y tiene razón: un
//     petroglifo de tres discos es un símbolo del bosque; los árboles de tres
//     alturas plantados en la ladera SON el bosque. Cuando el mundo se puede
//     construir con sus elementos, se construye — la marca es el último
//     recurso, para lo que no se puede plantar (el clima).
//  3. **EL AGUA — cabe, y NO se movió.** Es el candidato más obvio (la caída
//     ES la pared) pero su puesto actual —fondo de cauce medido a 187 u del
//     pie— enseña algo que la pared no: que el agua que usted ve CAER es la
//     misma que corre por la quebrada. Si se sube a la pared se pierde ese
//     eslabón y se duplica lo que ya dice la cascada. Queda PROPUESTO para el
//     operador, apuntando a la pared con su flecha de piedra, no encima de ella.
//  · El PÁRAMO ya corona esa misma pared (labio del escarpe, +573 m): no se
//    toca, es el otro extremo del mismo accidente.
//
// ── RECONOCERSE DE LEJOS: `color` + `silueta` ───────────────────────────────
//   «Los mundos no se reconocen de lejos.»
// Cada mundo lleva su COLOR propio y su SILUETA propia (la forma del escudo y
// la del pie del mojón). A 1,4 km lo que llega es la mancha de color y el
// contorno — el emoji y el texto llegan después. Convención de Age of Empires:
// el icono manda, el rótulo confirma.
//
// ── LOS NUEVE ───────────────────────────────────────────────────────────────
// `x,z`    puesto MEDIDO sobre el DEM real con el mapeo al rumbo 311,91°
//          (scratchpad `i/probe-lugares.mjs`); msnm y pendiente anotados.
// `lugar`  POR QUÉ ahí. Esto es contenido: la ubicación ENSEÑA la relación.
// `url`    destino relativo. `null` = visible pero DESHABILITADO con su aviso.
// `ent`    el Ent que enseña en ese mundo, o null (anotado, no escondido).
// `dosD`   las pantallas 2D de ESE mundo — la lupa de ida y vuelta.
export const MUNDOS = [
  {
    id: 'animales', nombre: 'Los animales', emoji: '🐔',
    color: '#e0a341', silueta: 'corral',
    x: 49, z: -49,                       // 2520 msnm · pendiente 3,9°
    lugar: 'El corral, en el banco llano al costado de la casa.',
    url: null, ent: null,
    aviso: 'El mundo 3D de los animales sale con el lienzo vacío — verificado con captura hoy, no copiado de la auditoría.',
    alterna: { url: '/mundo-gallinero-3d/', texto: 'entrar al gallinero, que sí funciona' },
    dosD: [
      { t: 'El gallinero', u: '/app/#/mockups/mundo-gallinero-3d' },
      { t: 'Las abejas', u: '/?mundo=abejas' },
    ],
  },
  {
    id: 'abono', nombre: 'El abono', emoji: '🍂',
    color: '#b5713a', silueta: 'pila',
    x: 60, z: -20,                       // 2521 msnm · pendiente 15,4°
    // 55 m del corral: la distancia corta ES la lección.
    lugar: 'Pegado al corral: el estiércol de los animales alimenta la compostera.',
    url: '/abono/', ent: 'aliso',
    aviso: null,
    dosD: [
      { t: 'Las micorrizas', u: '/app/#/mockups/micorrizas-3d' },
    ],
  },
  {
    id: 'plantas', nombre: 'Las plantas', emoji: '🌱',
    color: '#7dc46a', silueta: 'bancal',
    // MOVIDO 2026-07-26 (repartir el cuadro): estaba en (−34,−62), pegado a la
    // casa y encima de animales/abono en pantalla. (−110,−100) es el banco
    // llano REAL de la ladera de abajo — 2470 msnm, pendiente 2,9°, medido —
    // así que sigue siendo «la huerta bajando de la casa» y gana aire.
    x: -110, z: -100,                    // 2470 msnm · pendiente 2,9°
    lugar: 'Los bancales de la huerta, bajando de la casa.',
    url: null, ent: 'roble',
    aviso: 'No hay un mundo de «plantas» entero: está repartido en cultivos, botica y frutales.',
    alterna: { url: '/?mundo=invernadero', texto: 'entrar al invernadero' },
    dosD: [
      { t: 'El invernadero', u: '/?mundo=invernadero' },
      { t: 'La papa viva', u: '/app/#/mockups/papa-viva-3d' },
      { t: 'La botica y la caña', u: '/app/#/mockups/mundo-botica-cana-3d' },
      { t: 'Sembrar con el compai', u: '/?mundo=siembra' },
    ],
  },
  {
    id: 'agua', nombre: 'El agua', emoji: '💧',
    color: '#4fb8e8', silueta: 'onda',
    // ── EL AGUA APUNTA A LA CHORRERA (orden del operador, 2026-07-26) ───────
    // «Hoy no apunta a ninguna parte.» Dos cosas cambiaron:
    //  1) EL PUESTO. Estaba en (58,−248), en medio del valle y a 490 u del
    //     salto. Se midió el THALWEG REAL del DEM (el x de menor cota para
    //     cada z, sonda `probe3`): el pie de La Chorrera cae en (0,−680) a
    //     2409 msnm y de ahí el cauce baja hacia +x — (20,−620) · (70,−560) ·
    //     (115,−500) · (220,−440) · (260,−380). (70,−560) es fondo de cauce
    //     medido (2392 msnm, pendiente 10,5°) y queda a 187 u del pie del
    //     salto: desde ahí el agua que cae y el agua que corre son la misma.
    //  2) LA MIRADA. `mira:'chorrera'` hace que el mojón deje de ser simétrico:
    //     lleva una FLECHA DE PIEDRA orientada al salto y un hilo de luz en el
    //     suelo hacia él (ver `mundos.js`). El eje páramo → salto → quebrada →
    //     casa queda dibujado, no sólo escrito.
    x: 70, z: -560,                      // 2392 msnm · pendiente 10,5° · fondo de cauce
    mira: 'chorrera',
    lugar: 'La quebrada, al pie de La Chorrera: esta es el agua que usted ve caer, ya corriendo.',
    // ── 🟢 EL AGUA DEJA DE ESTAR ROTA ───────────────────────────────────────
    // La ronda anterior dio el mundo del agua por muerto porque `mundo3d-agua`
    // sale con el lienzo vacío. Hoy se barrieron los 97 mockups del build y
    // apareció **`mundo-agua-3d` — «El camino del agua»**, que SÍ arranca:
    // nacimiento, quebrada, bocatoma, reservorio, riego por goteo y el ciclo
    // que se cierra. Verificado con captura propia (`g/m06-mundo-agua-3d.png`).
    // Así que el agua ya no entra con un aviso de roto: entra con su mundo.
    url: '/agua/', ent: 'quenua',
    aviso: null,
    dosD: [
      { t: 'El ciclo del agua', u: '/app/#/mockups/ciclo-agua' },
      { t: 'El nacedero del páramo', u: '/?mundo=paramo' },
      { t: 'El valle bajo la lluvia', u: '/?clima=lluvia' },
    ],
  },
  // ── BOSQUE ARCHIVADO 2026-08-12 (operador: low-poly/vacío/insípido) ──
  //    Recuperable en tag archivo/mundo-bosque-vanilla. Reactivar = restaurar este objeto.
  {
    id: 'vender', nombre: 'Vender', emoji: '🧺',
    color: '#d9534f', silueta: 'toldo',
    // MOVIDO a la SALIDA MEDIDA: (300,−380) es el punto más bajo de todo el
    // barrido aguas abajo (2318 msnm, pendiente 8,4°) — por ahí se sale el
    // agua y por ahí se sale usted. Antes estaba en (200,−380), 33 m más alto
    // y encima del agua en pantalla.
    x: 300, z: -380,                     // 2318 msnm · pendiente 8,4°
    lugar: 'Aguas abajo, por donde se sale del valle hacia el pueblo.',
    url: '/vender/', ent: null,
    aviso: null,
    dosD: [
      // 🟢 nativa: la plaza de mercado ya tiene mundo propio (mercado.js)
      { t: 'La plaza de mercado', u: '/?mundo=mercado' },
    ],
  },
  {
    id: 'tiempo', nombre: 'El tiempo', emoji: '🌦️',
    color: '#8fb9e6', silueta: 'nube',
    soporte: { tipo: 'pared', t: 0.63, dx: 205 },
    // MOVIDO al alto de verdad: (−420,−330) mide 2601 msnm con pendiente
    // 15,9° — 84 m sobre la casa y el punto más despejado del flanco. Antes
    // (−330,−250) quedaba encima del bosque en el cuadro.
    x: -420, z: -330,                    // 2601 msnm · pendiente 15,9°
    lugar: 'El alto despejado: desde aquí se lee el cielo antes que en ningún lado.',
    url: '/el-tiempo/', ent: null,
    aviso: null,
    // Reemplazan a tres entradas `sesion:true` (almanaque, calendario, año de
    // la finca) que SIN CUENTA caían en el valle viejo. Éstas se abren para
    // cualquiera y están verificadas con captura hoy.
    dosD: [
      { t: 'El cielo de hoy en la finca', u: '/?clima=sol' },
      { t: 'El valle bajo la lluvia', u: '/?clima=lluvia' },
      { t: 'El valle de noche', u: '/?hora=noche' },
    ],
  },
  {
    id: 'finca', nombre: 'Toda mi finca', emoji: '🏡',
    color: '#f0c675', silueta: 'tejado',
    // MOVIDO: (−170,40), 2524 msnm · pendiente 10,6°, el alto de atrás. Antes
    // (−120,30) se pegaba a plantas y al mural en el cuadro.
    x: -170, z: 40,                      // 2524 msnm · pendiente 10,6°
    lugar: 'El alto sobre la casa: el único puesto desde el que se ve la finca entera.',
    url: null, ent: null,
    aviso: 'No hay todavía una vista de finca completa que se abra sin sesión: el candidato (EntradaValle3D) está detrás de un flag apagado.',
    // ⛔ AQUÍ IBA `alterna: { url:'/app/#/', texto:'abrir el valle 2D de la app' }`.
    // Orden del operador (2026-07-26): «sacá el enlace que dice "la app" y
    // lleva al valle viejo». `/app/#/` es «El valle de mi finca», el valle
    // VIEJO — verificado con captura hoy (`a10-app2d.png`). Ningún botón de
    // este sitio vuelve a mandar ahí. La alterna pasa a ser una vista que SÍ
    // es de este valle nuevo.
    alterna: { url: '/mundos/', texto: 'ver el índice de los mundos de la finca' },
    dosD: [
      { t: 'La vitrina de mundos', u: '/app/#/mockups/vitrina-3d' },
      { t: 'La casa por dentro', u: '/app/#/mockups/casa-adentro' },
    ],
  },
  {
    // 🌫️ (niebla) se dibuja como un cuadro blanco en la fuente de emoji del
    // sistema y a distancia de meseta era una mancha: 🏔️ se lee a 1,8 km.
    id: 'paramo', nombre: 'El páramo', emoji: '🏔️',
    color: '#9fd8cf', silueta: 'frailejon',
    // ⚠️ MOVIDO al EJE, sobre el labio del escarpe: la instrucción del operador
    // es «el páramo ENCIMA DE LA CHORRERA» (PLAN-NOCHE-3D). Estaba en (200,
    // −1105) —la meseta, pero corrido a la derecha—; en (−40, −1160) queda
    // justo sobre la caída, que es donde la ubicación ENSEÑA la lección: el
    // agua de la quebrada nace ahí arriba y baja por el salto.
    // Medido: 3089 msnm · pendiente 4,3° (el rellano del labio, no la pared).
    x: -40, z: -1160,                    // +573 m sobre la casa
    lugar: 'Encima de La Chorrera, en el labio de la meseta: de aquí baja el agua que usted ve caer.',
    url: '/paramo/', ent: 'quenua',
    aviso: null,
    dosD: [
      { t: 'El páramo de Humboldt', u: '/?mundo=paramo' },
      { t: 'El páramo definitivo', u: '/?mundo=paramo' },
      // ⛔ SACADO (2026-07-31): «La ceiba, Ent de la tierra caliente» vivía acá
      // como sub-enlace, colgada del PÁRAMO — absurdo, la ceiba es tierra
      // caliente, no el labio del escarpe. Ahora se alcanza por su propio
      // letrero en la vista-global (`?vista=global`), piso cálido — ver
      // `MUNDOS_EXTRA` en `vista-global.js`.
    ],
  },
];

// ── ⛔ EL MURAL «LA APP» SALIÓ ───────────────────────────────────────────────
// Aquí vivía el mojón de oro `MURAL = { nombre:'La app', url:'/app/#/' }`.
// Orden literal del operador (2026-07-26): «sacá el enlace que dice "la app" y
// lleva al valle viejo — saca esa mierda».
//
// Verificado con captura ANTES de borrarlo (`g/a10-app2d.png`): `/app/#/` abre
// «El valle de mi finca», que es el valle VIEJO de la SPA, con su propio
// minimapa, su propio compañero y su propia barra de chat — o sea, saca al
// usuario del producto nuevo y lo deja en el anterior. No es una lupa: es una
// puerta de salida.
//
// La regla que el operador recordó sigue en pie —«el valle tiene UNA sola
// puerta al 2D global; cada mundo tiene las suyas»— y por eso el valle queda
// HOY con CERO puertas al 2D global: no hay ningún destino 2D global que no
// sea el valle viejo. Las de cada mundo (las que sí corresponden) siguen
// completas en su marco. Cuando exista un 2D global que no sea el viejo, se
// vuelve a poner UN solo mojón aquí: son cuatro líneas de datos.
export const MURAL = null;

// El mundo 3D que se sirve dentro del marco de cada mundo principal.
export const ESCENA_DE = {
  abono: '/app/#/mockups/mundo-compost-3d',
  bosque: '/bosque-altoandino/',
  // 🟢 el mercado entra con mundo propio (mercado.js, `?mundo=mercado`)
  vender: '/?mundo=mercado',
  // `mundo3d-clima` es la ficha de VITRINA (titular editorial + el 3D en una
  // cajita, con la barra de chat de la app dentro): dentro del marco quedaba
  // como una página, no como un mundo. `clima-atmosfera` es la escena de
  // verdad — cielo, niebla, lluvia y los consejos del día. Verificado hoy.
  tiempo: '/app/#/mockups/clima-atmosfera',
  paramo: '/app/#/mockups/paramo-humboldt-3d',
  // 🟢 el agua entra con mundo propio (ver el bloque del agua arriba)
  agua: '/app/#/mockups/mundo-agua-3d',
};
