/*
 * MUNDO — el REGISTRO DATA-DRIVEN de los mundos de la finca.
 *
 * EL CORAZÓN DEL FRAMEWORK (DR §4.2, ajustado a 2D+3D de primera clase). Una
 * entrada por mundo; TODO lo específico es datos, no código:
 *
 *   MUNDO[id] = {
 *     escena,     // clave de ARQUETIPOS (3D o 2D) — o null (salta directo al 2D real)
 *     params,     // props del arquetipo (deterministas; se comparten 2D↔3D donde aplica)
 *     hotspots,   // 3-5 puntos tocables; cada `view` es una vista REAL de App.jsx
 *     entrada,    // { zoom, narra, clima… } — cómo entra la abeja / narra la voz
 *     fallback2d, // (opcional) { escena, params } del arquetipo 2D si el 3D degrada
 *     ruta2d,     // (escena:null) navegar directo a la vista 2D real
 *     valle,      // (opcional) landmark en el mapa del valle: { tipo, pos, escala }
 *     gate,       // (opcional) perfil requerido (p.ej. 'animales')
 *     ambiental,  // (opcional) el clima ya vive en el ambiente del valle
 *   }
 *
 * Sumar un mundo = UNA de estas entradas + assets de la librería (lámina/creature/
 * geometría de arquetipo ya existente). Cero código de escena nuevo.
 *
 * Título/emoji/tinte NO se duplican: se resuelven contra el manifiesto real
 * (mundosFinca.js) en `resolverTinte`/`tituloMundo` (mundo host).
 */

/*
 * EL HATO DE MUESTRA — UNA sola fuente para DOS mundos (consistencia cross-mundo,
 * audit §5a.4). El corral (`animales`) y el mercado lo leen igual: así un animal
 * VENDIDO (Camilo) queda como huella-fantasma en el corral y a la vez llega
 * caminando al mercado — el mismo dato, dos mundos. Aquí también viven los
 * MOMENTOS de muestra: una cría que `nace` y una gallina que se despide con
 * respeto (`muerte`). Interfaz lista para cablear el hato real de farmOS después
 * (misma forma; el `estado` real manda el momento).
 */
const HATO_MUESTRA = [
  { especie: 'cerdo', nombre: 'Petunia', raza: 'zungo', tamano: 'grande', estado: 'preñada' },
  { especie: 'cerdo', nombre: 'Canelo', raza: 'duroc', tamano: 'mediano', estado: 'sano' },
  { especie: 'cerdo', nombre: 'Rosita', raza: 'landrace', tamano: 'pequeño', estado: 'sano' },
  { especie: 'cerdo', nombre: 'Manchas', raza: 'sanpedreño', tamano: 'pequeño', estado: 'sano' },
  { especie: 'cerdo', nombre: 'Tocineta', raza: 'landrace', tamano: 'pequeño', estado: 'sano' },
  { especie: 'vaca', nombre: 'Lola', raza: 'normando', tamano: 'grande', estado: 'sano' },
  // Camilo: VENDIDO. En el corral queda su huella; en el mercado llega en cuerpo.
  { especie: 'vaca', nombre: 'Camilo', raza: 'cebú', tamano: 'grande', estado: 'vendido' },
  { especie: 'gallina', nombre: 'Turuleca', raza: 'campesina', tamano: 'pequeño', estado: 'sano' },
  { especie: 'gallina', nombre: 'Canela', raza: 'campesina', tamano: 'mediano', estado: 'sano' },
  { especie: 'gallina', nombre: 'Carlota', raza: 'ponedora', tamano: 'mediano', estado: 'sano' },
  { especie: 'oveja', nombre: 'Nube', raza: 'criolla', tamano: 'mediano', estado: 'sano' },
  { especie: 'oveja', nombre: 'Copito', raza: 'criolla', tamano: 'pequeño', estado: 'sano' },
  // Lucero: NACE — una cría de oveja aparece junto a Nube y Copito (crece con brillo).
  { especie: 'oveja', nombre: 'Lucero', raza: 'criolla', tamano: 'pequeño', estado: 'nace' },
  // Aurelia: se despide con respeto — queda su nombre y una flor (MUERTE, sin drama).
  { especie: 'gallina', nombre: 'Aurelia', raza: 'campesina', tamano: 'mediano', estado: 'muerte' },
];

export const MUNDO = {
  // ── SÍ-3D: el espacio mismo enseña ───────────────────────────────────────

  // 🌱 EL SUELO VIVO — el PROTOTIPO del DR (cutaway). Reusa mundoSubsueloEngine
  //    para la densidad de vida (`params.vida` 0..1; aquí, valor de muestra).
  suelo: {
    escena: 'cutaway',
    valle: { tipo: 'era', pos: [-1.1, 0, 3.6], escala: 1 },
    params: {
      vida: 0.7,
      vidaFrom: 'mundoSubsueloEngine',
      capas: [
        { nombre: 'hojarasca', color: '#6b4a2e', alto: 0.5, bichos: ['lombriz'] },
        { nombre: 'suelo negro', color: '#3a2a1a', alto: 1.2, bichos: ['lombriz', 'raiz', 'hifa'] },
        { nombre: 'subsuelo', color: '#8a6a44', alto: 1.0, bichos: ['raiz'] },
      ],
    },
    hotspots: [
      { id: 'juego', pos: [0, 0.6, 0.6], emoji: '🪱', label: 'Despierte su suelo', view: 'subsuelo' },
      { id: 'cuaderno', pos: [1.3, 0.2, 0.4], emoji: '📓', label: 'Cuaderno del suelo', view: 'salud_suelo' },
      { id: 'crom', pos: [-1.3, 0.2, 0.4], emoji: '🎯', label: 'Cromatografía', view: 'cromatografia' },
    ],
    entrada: { zoom: 6.5, narra: 'suelo' },
  },

  // 💧 EL AGUA — el RECORRIDO completo del agua por la pendiente (flujo).
  //    El campesino ve de dónde nace, por dónde baja, dónde se toma, qué riega,
  //    dónde se cuida (ronda) y dónde toca tener cuidado de no contaminarla.
  //    Didáctico y esperanzador: cada punto es una puerta a una pantalla REAL.
  //    Todo es DATOS: la curva de la quebrada + los hitos del recorrido los
  //    leen por igual el diorama 3D (EscenaFlujo) y su gemelo 2D (FondoFlujo).
  agua: {
    escena: 'flujo',
    valle: { tipo: 'quebrada', pos: [0.6, 0, -1.4], escala: 1 },
    params: {
      // La quebrada baja del nacimiento (arriba-izquierda) al tanque (abajo).
      curva: [
        [-2.1, 2.3, 0.3], [-1.1, 1.5, 0], [-0.1, 0.8, -0.25], [0.7, 0.25, 0], [1.5, -0.15, 0.5],
      ],
      // Los hitos del recorrido, anclados a la curva por su fracción t (0..1)
      // o por posición propia. El arquetipo los dibuja; el gemelo 2D también.
      hitos: {
        ronda: { tramo: [0.02, 0.34], arboles: 5 },   // franja de monte que protege el nacimiento
        riesgo: { t: 0.46, lado: 0.8 },               // donde se cuida: ni lavar bombas ni echar sobras
        bocatoma: { t: 0.68 },                        // la cajilla que toma el agua para la casa
        cultivo: { pos: [2.3, -0.3, -0.55], surcos: 4 }, // la huerta que se riega con medida
      },
    },
    hotspots: [
      { id: 'nacimiento', pos: [-2.1, 2.95, 0.3], emoji: '💧', label: 'Donde nace el agua', view: 'agua', data: { tema: 'nacimiento' } },
      { id: 'ronda', pos: [-1.15, 2.45, -0.65], emoji: '🌳', label: 'La ronda que lo protege', view: 'restauracion' },
      { id: 'quebrada', pos: [-0.1, 1.4, -0.3], emoji: '🐟', label: 'La quebrada viva', view: 'biodiversidad' },
      { id: 'riesgo', pos: [0.3, 1.1, 0.9], emoji: '⚠️', label: 'Aquí se cuida el agua', view: 'toxicologia' },
      { id: 'bocatoma', pos: [0.75, 0.9, 0.05], emoji: '🚰', label: 'La toma y el tanque', view: 'agua', data: { tema: 'riego' } },
      { id: 'cultivo', pos: [2.3, 0.45, -0.55], emoji: '🥕', label: 'La huerta regada', view: 'hortalizas' },
    ],
    entrada: { zoom: 7, narra: 'agua' },
    // El gemelo 2D digno (flujo-2D): mismo motivo, MISMOS params e hitos.
    fallback2d: { escena: 'mirror' },
  },

  // 🐔 LOS ANIMALES — el corral y su CICLO CERRADO del abono (recinto): animal →
  //    estiércol → compost → suelo → planta → animal, un anillo virtuoso. Gated
  //    por perfil (como hoy). El corral es ESPEJO del dato (FASE 1 §5a+§5c):
  //    cada animal REAL con su nombre, raza, tamaño y estado — la especie da la
  //    silueta, el tamaño la escala, la raza el pelaje, el estado se ve (preñada
  //    con señal, vendido como huella translúcida). Y el CAMBIO de estado es un
  //    MOMENTO (audit §5a.4): la cría que `nace` crece con un brillo, el que
  //    `muere` se retira con respeto (piedrita con flor), el `vendido` deja su
  //    huella aquí y llega en cuerpo al mercado. Interfaz para cablear el hato
  //    real de farmOS aquí mismo (misma forma; `pos` es opcional — sin él, los
  //    sitios salen solos). MUESTRA compartida con el mercado (mismo dato):
  animales: {
    escena: 'recinto',
    valle: { tipo: 'corral', pos: [-4.6, 0, -1.8], escala: 1 },
    gate: 'animales',
    params: {
      animales: HATO_MUESTRA,
    },
    hotspots: [
      { id: 'todos', pos: [0, 0.5, 1.2], emoji: '🐮', label: 'Todos los animales', view: 'animales' },
      { id: 'gallinas', pos: [1.4, 0.4, 0.2], emoji: '🐔', label: 'Gallinas', view: 'animales_gallinas' },
      { id: 'abono', pos: [-1.4, 0.4, 0.2], emoji: '💩', label: 'Del corral al abono', view: 'estiercol' },
    ],
    entrada: { zoom: 7, narra: 'animales' },
  },

  // 🌳 DISEÑO DE LA FINCA — la verticalidad del bosque comestible (estratos).
  disenio: {
    escena: 'estratos',
    valle: { tipo: 'bosque', pos: [4.8, 0, -2.6], escala: 1.1 },
    params: {},
    hotspots: [
      { id: 'restaura', pos: [0, 3.4, 0.3], emoji: '🌳', label: 'Restauración y bosque de alimentos', view: 'restauracion' },
      { id: 'vecinas', pos: [1.6, 0.7, 0.4], emoji: '🌻', label: 'Buenas vecinas', view: 'asociaciones' },
      { id: 'monte', pos: [-1.6, 1.9, 0.4], emoji: '🦜', label: 'El monte de la finca', view: 'biodiversidad' },
    ],
    entrada: { zoom: 8, narra: 'disenio' },
  },

  // 🗺️ EL VALLE — el mapa navegable (valle). Es "un mundo más" del registro: su
  //    escena ES el mapa entero; sus hotspots son los demás mundos.
  valle: {
    escena: 'valle',
    params: { clima: 'soleado' },
    entrada: { narra: 'bienvenida', clima: 'soleado', alertaView: 'hoy_finca' },
  },

  // ── HÍBRIDO / SÍ-3D por reuso barato ─────────────────────────────────────

  // 🐄 ESTIÉRCOL Y COMPOST — REUSA `cutaway` para el corte de la pila (capas
  //    café/verde, calor). Prueba viva de "sumar un SÍ-3D = datos, sin código".
  abono: {
    escena: 'cutaway',
    valle: { tipo: 'huerta', pos: [1.8, 0, 4.4], escala: 0.95 },
    params: {
      vida: 0.55,
      capas: [
        { nombre: 'cobertura seca', color: '#8a6a3a', alto: 0.5, bichos: ['hifa'] },
        { nombre: 'verde fresco', color: '#5a6a2e', alto: 0.9, bichos: ['lombriz', 'hifa'] },
        { nombre: 'tierra negra', color: '#2f2418', alto: 0.9, bichos: ['lombriz', 'raiz'] },
      ],
    },
    hotspots: [
      { id: 'compost', pos: [0, 0.6, 0.6], emoji: '🍂', label: 'El compost, paso a paso', view: 'compost' },
      { id: 'estiercol', pos: [1.3, 0.2, 0.4], emoji: '🐄', label: 'Del corral al abono', view: 'estiercol' },
    ],
    entrada: { zoom: 6, narra: 'abono' },
  },

  // ── 2D de primera clase: el dato/foto ES el valor ────────────────────────

  // 🌾 CULTIVOS — arquetipo `lamina`: reusa la lámina de maíz de la librería.
  cultivos: {
    escena: 'lamina',
    valle: { tipo: 'milpa', pos: [-3.2, 0, 1.6], escala: 1.15 },
    params: { lamina: 'maiz' },
    hotspots: [
      { id: 'milpa', pos: [], emoji: '🌽', label: 'La milpa', view: 'milpa_cultivo' },
      { id: 'que', pos: [], emoji: '🌱', label: 'Qué puedo sembrar', view: 'directorio' },
      { id: 'cal', pos: [], emoji: '🗓️', label: 'Calendario de la finca', view: 'calendario_finca' },
    ],
    entrada: { narra: 'cultivos' },
  },

  // ☕ EL CAFÉ — arquetipo SÍ-3D `cafe`: el CAFETAL BAJO SOMBRA, el cultivo
  //    bandera hecho lugar. El diorama muestra lo que de verdad es una finca
  //    cafetera andina: la SOMBRA de guamo/nogal que le hace techo al cultivo
  //    (café de sombra = café con aves, no potrero de sol), los CAFETOS cargados
  //    de CEREZA roja, el GRANO en sus tres estados SIN tostar en la finca
  //    (cereza→pergamino→oro), la ROYA (Hemileia vastatrix) y la BROCA
  //    (Hypothenemus hampei) señaladas para manejarlas con criterio (no recetas
  //    de veneno), y el BENEFICIO en el rincón (despulpar, fermentar, secar).
  //    Cada punto es una puerta a una pantalla REAL. En equipo humilde cae a su
  //    ficha 2D digna (la infografía del café).
  cafe: {
    escena: 'cafe',
    valle: { tipo: 'cafetal', pos: [3.4, 0, 2.2], escala: 1 },
    params: {
      // El diorama tiene defaults propios; aquí los hacemos explícitos y
      // deterministas (mismos cafetos, sombra y estados del grano).
      cafetos: [
        { color: '#3f6f3a', pos: [-0.55, 0, 0.42], cerezas: 6 },
        { color: '#468637', pos: [0.5, 0, 0.12], cerezas: 5 },
        { color: '#3f6f3a', pos: [0.02, 0, -0.5], cerezas: 4, roya: true },
        { color: '#457d38', pos: [-0.78, 0, -0.32], cerezas: 5 },
      ],
      sombra: [
        { pos: [-1.65, 0, -0.95], color: '#4b7a3a', alto: 2.2 }, // guamo (Inga)
        { pos: [1.7, 0, -0.8], color: '#3f6b39', alto: 2.0 },    // nogal cafetero
      ],
      granos: [
        { estado: 'cereza', color: '#b8342a', pos: [-1.5, 0, 0.75] },
        { estado: 'pergamino', color: '#d4c199', pos: [-1.15, 0, 1.05] },
        { estado: 'oro', color: '#9fae5a', pos: [-0.72, 0, 1.2] },
      ],
    },
    hotspots: [
      { id: 'grano', pos: [-0.55, 0.9, 0.42], emoji: '☕', label: 'El grano, paso a paso', view: 'cafe' },
      { id: 'sombra', pos: [-1.65, 2.5, -0.95], emoji: '🌳', label: 'El café bajo sombra', view: 'biodiversidad' },
      { id: 'roya', pos: [0.02, 0.85, -0.5], emoji: '🍂', label: 'La roya y la broca', view: 'plagas' },
      { id: 'manejo', pos: [0.5, 0.82, 0.12], emoji: '🐞', label: 'Manejo sin veneno', view: 'biopreparados' },
      { id: 'beneficio', pos: [1.0, 0.7, 0.55], emoji: '💧', label: 'Despulpar, fermentar, secar', view: 'poscosecha' },
    ],
    entrada: { zoom: 7.5, narra: 'cafe' },
    // El gemelo 2D digno: la ficha del café (misma lección, en cifras y notas).
    fallback2d: {
      escena: 'infografia',
      params: {
        titulo: 'El café de la finca',
        cifras: [
          { valor: '1200–1800', unidad: 'm', label: 'la altura donde da mejor el café en la ladera andina' },
          { valor: '3', unidad: 'estados', label: 'del grano SIN tostar en la finca: cereza → pergamino → oro' },
        ],
        notas: [
          'Siémbrelo bajo sombra de guamo o nogal: cuida el suelo, guarda humedad y le vuelven las aves.',
          'Roya (el polvillo naranja) y broca (el gorgojo de la cereza) se manejan con criterio: variedad resistente, recoja bien la cereza, trampas y hongos de biocontrol — no con recetas de veneno.',
          'Beneficio: despulpe el mismo día, fermente en el tanque y seque despacio. El tueste es de otro lado, no del campo.',
        ],
      },
    },
  },

  // 🍊 FRUTALES — arquetipo SÍ-3D `frutales`: el HUERTO DE FRUTALES de clima
  //    cálido/templado hecho lugar. El diorama muestra el solar campesino de
  //    verdad: el AGUACATE mayor con su fruto verde-oscuro colgando, el MANGO de
  //    copa ancha con el fruto dorado en su pedúnculo largo, los CÍTRICOS
  //    (naranjo, limonero, mandarino) cargados de color, las EDADES (del injerto
  //    con tutor al árbol mayor: el huerto se renueva), el PLATEO al pie de cada
  //    árbol, la PODA señalada con su corte limpio y la COSECHA a mano (escalera
  //    y canastos, la fruta no se apalea). Cada punto es una puerta a una
  //    pantalla REAL. En equipo humilde cae a su ficha 2D digna (la tarjeta de
  //    frutales de siempre).
  frutales: {
    escena: 'frutales',
    params: {
      // El diorama tiene defaults propios; aquí los hacemos explícitos y
      // deterministas (mismos árboles, edades y frutos siempre). El mango lleva
      // la seña de la poda (corte limpio, sin drama).
      arboles: [
        { especie: 'aguacate', pos: [-1.35, 0, -0.75], alto: 2.15, ancho: 1.15, frutos: 5 },
        { especie: 'mango', pos: [1.4, 0, -0.8], alto: 1.7, ancho: 1.35, frutos: 6, poda: true },
        { especie: 'naranjo', pos: [0.12, 0, -0.2], alto: 1.15, ancho: 1, frutos: 8 },
        { especie: 'limonero', pos: [-1.05, 0, 0.72], alto: 0.95, ancho: 0.9, frutos: 7 },
        { especie: 'mandarino', pos: [0.95, 0, 0.6], alto: 0.85, ancho: 0.85, frutos: 9 },
      ],
    },
    hotspots: [
      { id: 'frutales', pos: [0.12, 1.95, -0.2], emoji: '🍊', label: 'Frutales de la finca', view: 'frutales' },
      { id: 'aguacate', pos: [-1.35, 3.05, -0.75], emoji: '🥑', label: 'El aguacate, a fondo', view: 'aguacate' },
      { id: 'mango', pos: [1.4, 2.65, -0.8], emoji: '🥭', label: 'El mango y su poda', view: 'mango' },
      { id: 'citricos', pos: [-1.05, 1.6, 0.72], emoji: '🍋', label: 'Los cítricos', view: 'citricos' },
      { id: 'injerto', pos: [-0.18, 1.0, 1.2], emoji: '🌱', label: 'El injerto y el vivero', view: 'germinacion' },
      { id: 'cosecha', pos: [1.15, 1.35, 0.35], emoji: '🧺', label: 'Cosecha y poscosecha', view: 'poscosecha' },
    ],
    entrada: { zoom: 7, narra: 'frutales' },
    // El gemelo 2D digno: la tarjeta de frutales de siempre (misma lección).
    fallback2d: {
      escena: 'ficha',
      params: {
        nombre: 'Frutales de la finca',
        emoji: '🍊',
        hechos: [
          { clave: 'Propagación', valor: 'injerto y semilla según especie' },
          { clave: 'Piso térmico', valor: 'de cálido (cítricos, mango) a frío (mora, tomate de árbol)' },
          { clave: 'Sin veneno', valor: 'trampas, poda sanitaria y control biológico' },
          { clave: 'Cosecha', valor: 'a mano y con escalera: la fruta golpeada se pierde' },
        ],
      },
    },
  },

  // 🧺 MERCADO Y DESPENSA — arquetipo SÍ-3D `mercado`: el MERCADO CAMPESINO, la
  //    comercialización justa hecha lugar. El diorama muestra la CADENA CORTA del
  //    campo a la mesa: la RUTA que baja de la parcela a la plaza (del productor
  //    al comprador, directo), los PUESTOS con su toldo, los CANASTOS con la
  //    cosecha de la finca (tomate, papa, maíz, café), la TARIMA de PROCEDENCIA
  //    (el terroir andino: de qué vereda y qué piso viene, el sello de origen) y
  //    la BALANZA del PRECIO JUSTO (el trato parejo, sin la tajada del
  //    intermediario). Cada punto es una puerta a una pantalla REAL. En equipo
  //    humilde cae a su ficha 2D digna (la infografía del mercado y la despensa).
  mercado: {
    escena: 'mercado',
    valle: { tipo: 'mercado', pos: [1.2, 0, 6.6], escala: 1 },
    params: {
      // Los PUESTOS son el LUGAR (infraestructura de la feria), deterministas.
      puestos: [
        { color: '#c96a2f', pos: [-0.85, 0, 0.2] },   // toldo del vecino
        { color: '#3f8f4e', pos: [0.9, 0, -0.1] },     // toldo de la huerta
      ],
      // Los CANASTOS de producto NO se fijan aquí: son ESPEJO VIVO de la cosecha
      // reciente REAL (audit §5b). EscenaMercado los deriva de
      // `estadoFinca.cosechaReciente` (useFincaViva); sin cosecha, la plaza queda
      // tranquila. Anti-fabricación: jamás surtir un producto que nadie cosechó.
      // EL MISMO HATO del corral (audit §5a.4): el mercado filtra los VENDIDOS y
      // los hace LLEGAR caminando por la ruta campo→plaza. Un dato, dos mundos.
      // Es la MUESTRA del hato (aún sin inventario real); cuando exista, el host
      // pisa este arreglo con el hato REAL (misma forma).
      animales: HATO_MUESTRA,
    },
    hotspots: [
      { id: 'vender', pos: [-0.85, 1.25, 0.2], emoji: '🤝', label: 'Vender y comprar', view: 'mercado' },
      { id: 'posc', pos: [0.9, 1.25, -0.1], emoji: '🥕', label: 'Poscosecha y despensa', view: 'poscosecha' },
      { id: 'precio', pos: [0.15, 0.85, 0.55], emoji: '⚖️', label: 'Precio de referencia', view: 'mercado', data: { tema: 'precio' } },
      { id: 'inf', pos: [-1.4, 1.1, -0.35], emoji: '🖨️', label: 'Sacar reportes', view: 'informes' },
    ],
    entrada: { zoom: 7, narra: 'mercado' },
    // El gemelo 2D digno: la ficha del mercado y la despensa (la misma copia
    // didáctica de antes, con sus MISMOS accesos como puertas).
    fallback2d: {
      escena: 'infografia',
      params: {
        titulo: 'Mercado y despensa',
        cifras: [
          { valor: 'Directo', unidad: '', label: 'venta entre fincas, sin intermediario' },
          { valor: '—', unidad: '', label: 'la despensa dura según el producto: hoja pocos días, tomate 1–2 semanas, papa y grano seco meses' },
        ],
        notas: [
          'Precios de referencia y cuentas para el banco o la cooperativa.',
          'Almacene sin micotoxinas: troja/silo, secar/salar/fermentar con seguridad.',
        ],
      },
    },
  },

  // 🐞 SANIDAD — arquetipo SÍ-3D `sanidad`: la HUERTA-CLÍNICA, el manejo de
  //    plagas SIN veneno hecho lugar. El recinto muestra lo que de verdad cuida
  //    la mata en finca andina: las TRAMPAS CROMÁTICAS (amarilla → mosca blanca/
  //    minador, azul → trips), la ESTACIÓN DE BIOCONTROL (Beauveria/Metarhizium),
  //    el BORDE push-pull de flores aromáticas y los ENEMIGOS NATURALES
  //    (mariquita, carábido). Cada punto es una puerta a una pantalla REAL. En
  //    equipo humilde cae a su ficha 2D digna (la infografía de la sanidad).
  sanidad: {
    escena: 'sanidad',
    valle: { tipo: 'huerta', pos: [3.8, 0, 4.9], escala: 0.95 },
    params: {
      // Las MATAS y su SITIO son deterministas; su ESTADO (firme/decaída) NO se
      // fija aquí: es ESPEJO VIVO de la salud real (audit §5b). EscenaSanidad lo
      // deriva de `estadoFinca.saludFinca` (useFincaViva); sin dato, todas
      // firmes. Anti-fabricación: nunca se inventa una plaga ni un bicho dañino.
      matas: [
        { color: '#4e8f3f', pos: [-0.5, 0, 0.35] },
        { color: '#57993f', pos: [0.55, 0, 0.1] },
        { color: '#468637', pos: [0.05, 0, -0.55] },
      ],
      // Las TRAMPAS (y el biocontrol, el borde push-pull y los enemigos
      // naturales) son la LECCIÓN del lugar: el manejo SIN veneno está SIEMPRE,
      // no dependen de que haya plaga (monitoreo permanente, no alarma).
      trampas: [
        { color: '#f2c531', pos: [1.35, 0, 0.35] }, // amarilla: mosca blanca / minador
        { color: '#3f77c7', pos: [-1.25, 0, -0.5] }, // azul: trips
      ],
    },
    hotspots: [
      { id: 'sintoma', pos: [0, 0.7, 0.5], emoji: '🩺', label: 'Mi mata está enferma', view: 'sanidad_sintoma' },
      { id: 'plagas', pos: [1.35, 0.92, 0.35], emoji: '🐛', label: 'Directorio de plagas', view: 'plagas', claves: ['trampa', 'trampas', 'amarilla', 'cromatica', 'mosca', 'minador'] },
      { id: 'defensores', pos: [-0.55, 0.78, 0.5], emoji: '🐞', label: 'Defensores de la finca', view: 'defensores' },
      { id: 'bio', pos: [1.05, 0.78, -0.75], emoji: '🧪', label: 'Biopreparados', view: 'biopreparados' },
      { id: 'tox', pos: [-1.25, 0.92, -0.5], emoji: '⚠️', label: 'Seguridad con insumos', view: 'toxicologia' },
    ],
    entrada: { zoom: 7, narra: 'sanidad' },
    // El gemelo 2D digno: la ficha de la sanidad (misma copia didáctica de
    // antes, con sus MISMOS hotspots como accesos).
    fallback2d: {
      escena: 'infografia',
      params: {
        titulo: 'Sanidad de la mata',
        notas: [
          'Diga qué le ve ("gota", "polvillo", "amarilla") y sepa qué es y cómo manejarla sin veneno.',
          'Reconozca el bicho por foto: a qué le pega, cómo se ve y su manejo.',
          'Cuide sus aliados: trampas de color, hongos de biocontrol y enemigos naturales como la mariquita.',
        ],
      },
    },
  },

  // ── SÍ-3D nuevo: la ÚNICA metáfora de escena nueva del batch ─────────────

  // ⛅ EL CLIMA — la BÓVEDA del cielo bajo el que vive la finca (arquetipo nuevo
  //    `boveda`, README §case-3). Verdad andina, por DATOS: la HORA del día (el
  //    sol que arquea) + la temporada BIMODAL (dos lluvias / dos secas, NO cuatro
  //    estaciones europeas) + la niebla del páramo que el frailejón vuelve agua +
  //    la montaña de pisos térmicos con su casquete de hielo y la línea ÁMBAR de
  //    hasta dónde llegaba (Colombia perdió ~90% del hielo; los nevados se apagan
  //    hacia 2040–2050). NOTA DE CONCIENCIA, esperanza no colapso: el páramo es la
  //    fábrica de agua. En equipo humilde cae al gemelo 2D (mirror → cielo).
  clima: {
    escena: 'boveda',
    valle: { tipo: 'veleta', pos: [-3.8, 0, -4.8], escala: 1 },
    ambiental: true,
    params: {
      hora: 0.62,           // media tarde andina (0 amanece · 0.5 mediodía · 1 anochece)
      temporada: 'lluvia',  // régimen BIMODAL andino: dos lluvias / dos secas
      niebla: 0.6,          // niebla del páramo: el frailejón peina el agua de la nube
      // La montaña en cuatro pisos térmicos (misma paleta del mundo #4).
      pisos: [
        { nombre: 'cálido', color: '#c7a24b', h: 0.95, r0: 2.4, r1: 1.95 },
        { nombre: 'templado', color: '#8fae55', h: 0.9, r1: 1.42 },
        { nombre: 'frío', color: '#6f9a72', h: 0.85, r1: 0.9 },
        { nombre: 'páramo', color: '#9fb6bf', h: 0.8, r1: 0.42 },
      ],
      // El hielo de hoy + la línea de hasta dónde llegaba (retroceso). Ámbar de
      // "cuídelo", jamás rojo de catástrofe.
      glaciar: { nieve: 0.32, retroceso: 0.7 },
      // La OSCILACIÓN interanual (ENSO): la rueda LENTA que manda sobre el compás
      // bimodal y que más le mueve la cosecha al andino de un año a otro. Se LEE
      // como ciclo (Niña→Neutro→Niño), no como amenaza. DIDÁCTICO: arranca en una
      // fase visible; el día que exista un `get_enso_status` real (índice ONI de
      // la región Niño 3.4) se cablea aquí la fase viva. Estados: 'nina'|'neutral'|'nino'.
      enso: { fase: 'nino' },
    },
    hotspots: [
      { id: 'hoy', pos: [2.7, 3.4, 0.6], emoji: '⛅', label: 'El tiempo hoy', view: 'hoy_finca' },
      { id: 'almanaque', pos: [0, 1.7, 1.9], emoji: '🗓️', label: 'Almanaque de la finca', view: 'almanaque' },
      { id: 'lluvia', pos: [-2.7, 3.1, 0.5], emoji: '🌧️', label: 'Cuándo llueve', view: 'calendario_finca' },
    ],
    entrada: { zoom: 7.5, narra: 'clima' },
    // Gemelo 2D digno (mirror → motivo `boveda`): mismo cielo, mismos hotspots.
    fallback2d: { escena: 'mirror' },
  },

  // 🌽 LA MILPA — las TRES HERMANAS en corte (cutaway). Sobre la superficie, la
  //    asociación viva (maíz=vara, fríjol que trepa y abona, calabaza que cubre);
  //    bajo tierra, lo invisible hecho visible: los NÓDULOS de Rhizobium en las
  //    raíces del fríjol fijando 30–60 kg N/ha (el fríjol fija menos que otras
  //    leguminosas como haba o arveja; rango realista, no optimista). Reusa el
  //    arquetipo `cutaway` (mismas capas + vida) y enciende el módulo `milpa`.
  //    Policultivo, no monocultivo: juntas rinden más y se cuidan (push-pull).
  milpa: {
    escena: 'cutaway',
    params: {
      vida: 0.5,
      capas: [
        { nombre: 'superficie viva', color: '#6b4a2e', alto: 0.4, bichos: ['raiz'] },
        { nombre: 'suelo negro', color: '#3a2a1a', alto: 1.05, bichos: ['raiz', 'hifa'] },
        { nombre: 'subsuelo', color: '#8a6a44', alto: 0.85, bichos: ['raiz'] },
      ],
      // el módulo de las tres hermanas (arriba la asociación, abajo los nódulos)
      milpa: {
        maiz: { x: -0.25, alto: 1.7 },
        frijol: { vueltas: 4 },
        calabaza: { x: 0.7 },
        nitrogeno: '30–60 kg N/ha',
      },
    },
    hotspots: [
      { id: 'milpa', pos: [-0.25, 1.9, 0.9], emoji: '🌽', label: 'La milpa paso a paso', view: 'milpa_cultivo' },
      { id: 'frijol', pos: [-0.25, 0.1, 1.0], emoji: '🫘', label: 'El fríjol que abona', view: 'asociaciones' },
      { id: 'asocio', pos: [1.4, 0.5, 0.4], emoji: '🌱', label: 'Qué asocio', view: 'directorio' },
      { id: 'cuando', pos: [-1.4, 0.5, 0.4], emoji: '🗓️', label: 'Cuándo siembro', view: 'calendario_finca' },
    ],
    entrada: { zoom: 7, narra: 'milpa' },
    // El gemelo 2D digno: el mismo corte con las tres hermanas y los nódulos.
    fallback2d: { escena: 'mirror' },
  },
  // 🌡️ PISOS TÉRMICOS / LADERA ANDINA — la altura manda (arquetipo `estratos`
  //    reparametrizado). Se sube del cálido al páramo y en cada piso crece lo
  //    suyo. Señal SUTIL de cambio climático: los pisos suben (termofilización),
  //    sin catástrofe (norte "menos colapso, finca viva"). NO duplica `disenio`
  //    (ese usa `estratos` para los 7 estratos del bosque comestible); aquí es el
  //    gradiente ALTITUDINAL, que vive en `params.pisos` (de bajo a alto) y lo
  //    leen por igual el diorama 3D y su gemelo 2D. Vitrina: #/mockups/mundo3d-bosque.
  pisos: {
    escena: 'estratos',
    params: {
      // Pisos de bajo (cálido) a alto (páramo). Verificado (catálogo thermal_zones
      // + clasificación de Caldas). Color térmico: dorado abajo → azul-frío/blanco
      // páramo arriba. El páramo se PROTEGE (frailejón, niebla que capta agua),
      // no se ara.
      pisos: [
        { id: 'calido', nombre: 'Cálido', rango: '0–1000 m', color: '#cba04a', cultivo: 'platano' },
        { id: 'templado', nombre: 'Templado', rango: '1000–2000 m', color: '#6f9e4a', cultivo: 'cafe' },
        { id: 'frio', nombre: 'Frío', rango: '2000–3000 m', color: '#4f8f7d', cultivo: 'papa' },
        { id: 'paramo', nombre: 'Páramo', rango: '3000–4200 m', color: '#aec7cf', cultivo: 'frailejon', niebla: true, protege: true },
      ],
    },
    hotspots: [
      { id: 'directorio', pos: [-1.4, 1.7, 0.7], emoji: '🌡️', label: 'Qué siembro según mi altura', view: 'directorio' },
      { id: 'cafe', pos: [1.0, 1.75, 0.15], emoji: '☕', label: 'El piso del café', view: 'cafe' },
      { id: 'papa', pos: [-1.0, 2.9, -0.35], emoji: '🥔', label: 'El piso de la papa', view: 'tuberculos' },
      { id: 'paramo', pos: [0.7, 4.0, -0.9], emoji: '🏔️', label: 'El páramo se cuida', view: 'restauracion' },
    ],
    entrada: { zoom: 8, narra: 'pisos' },
  },

  // 🌱 EL SEMILLERO / VIVERO — arquetipo SÍ-3D `semillero`: la PROPAGACIÓN hecha
  //    lugar. El diorama muestra cómo se cría la matica desde el grano hasta que
  //    aguanta el campo, con lo que de verdad se hace en finca: las BANDEJAS
  //    germinadoras con su sustrato y su humedad (la semilla que despierta), el
  //    REPIQUE de la bandeja a la BOLSA cuando la plántula tiene fuerza, la ERA de
  //    ENDURECIMIENTO al borde soleado (aclimatar antes de llevar al lote), la
  //    ESTACIÓN de SEMILLA (la propia/criolla al lado de la comprada) y el TÚNEL
  //    de media-sombra que la resguarda del frío de la madrugada y de la lluvia.
  //    Cada punto es una puerta a una pantalla REAL. En equipo humilde cae a su
  //    ficha 2D digna (la infografía del semillero).
  //    (anti-conflicto de merge: entrada de mundo nueva SIEMPRE al final.)
  semillero: {
    escena: 'semillero',
    valle: { tipo: 'semillero', pos: [-2.6, 0, 6.2], escala: 1 },
    params: {
      // El diorama tiene defaults propios; aquí los hacemos explícitos y
      // deterministas (mismas bandejas y bolsas 2D↔3D).
      bandejas: [
        { pos: [-0.35, 0, 0.35], rot: 0.1 },
        { pos: [0.32, 0, 0.3], rot: -0.08 },
      ],
      bolsas: [
        { pos: [-1.2, 0, -0.15], alto: 0.34, color: '#4e8f3f' },
        { pos: [-1.15, 0, 0.3], alto: 0.3, color: '#57993f' },
        { pos: [-0.85, 0, -0.55], alto: 0.38, color: '#468637' },
      ],
    },
    hotspots: [
      { id: 'germinar', pos: [0, 0.62, 0.35], emoji: '🫘', label: 'Semilleros: qué nace', view: 'germinacion' },
      { id: 'repique', pos: [-1.15, 0.7, -0.1], emoji: '🌱', label: 'Repicar y llevar al campo', view: 'sembrar' },
      { id: 'endurecer', pos: [0.95, 0.72, 0.95], emoji: '☀️', label: 'Endurecer la matica', view: 'ciclo' },
      { id: 'semilla', pos: [1.1, 0.72, -0.55], emoji: '🌾', label: 'Semilla propia', view: 'semilla' },
      { id: 'frio', pos: [0, 1.5, -0.7], emoji: '⛺', label: 'Cuídelo del frío', view: 'hoy_finca' },
    ],
    entrada: { zoom: 7, narra: 'semillero' },
    // El gemelo 2D digno: la ficha del semillero (misma lección, en notas).
    fallback2d: {
      escena: 'infografia',
      params: {
        titulo: 'El semillero de la finca',
        notas: [
          'Germine en bandeja con sustrato suelto y húmedo: riegue fino y seguido, sin encharcar (la semilla se ahoga en agua).',
          'Repique a bolsa o era cuando la plántula tenga hojas verdaderas y raíz firme: tómela por la hoja, nunca por el tallo.',
          'Endurézcala unos días al sol y al viento antes de llevarla al lote, o el campo la quema.',
          'Guarde su semilla criolla de las mejores matas; de híbridos comprados no guarde semilla (los hijos salen disparejos).',
          'Tape el semillero: el túnel de media-sombra corta la lluvia y guarda el calor de la helada de madrugada.',
        ],
      },
    },
  },
};

/** Ids de todos los mundos registrados. */
export const MUNDO_IDS = Object.keys(MUNDO);
