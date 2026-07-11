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
  //    por perfil (como hoy). Animales reales de finca andina, DIFERENCIADOS por
  //    `tipo` (gallina ponedora de clima frío, vaca de cuerpo capsular, oveja de
  //    vellón): pocos y bien espaciados (más aire, no rebaño), poblado de verdad.
  animales: {
    escena: 'recinto',
    valle: { tipo: 'corral', pos: [-4.6, 0, -1.8], escala: 1 },
    gate: 'animales',
    params: {
      animales: [
        { tipo: 'vaca', color: '#c9a06a', pos: [-1.05, 0, -0.4] },
        { tipo: 'gallina', color: '#e7d9c2', pos: [1.1, 0, 0.5] },
        { tipo: 'gallina', color: '#d8b58a', pos: [0.7, 0, 1.05] },
        { tipo: 'oveja', color: '#efe7d8', pos: [-0.35, 0, 1.15] },
      ],
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

  // ☕ EL CAFÉ — arquetipo `lamina`: la lámina del cafeto.
  cafe: {
    escena: 'lamina',
    valle: { tipo: 'cafetal', pos: [3.4, 0, 2.2], escala: 1 },
    params: { lamina: 'cafeto' },
    hotspots: [
      { id: 'cafe', pos: [], emoji: '☕', label: 'El café, paso a paso', view: 'cafe' },
    ],
    entrada: { narra: 'cafe' },
  },

  // 🍊 FRUTALES — arquetipo `ficha`: tarjeta de especie foto-secuencial.
  frutales: {
    escena: 'ficha',
    params: {
      nombre: 'Frutales de la finca',
      emoji: '🍊',
      hechos: [
        { clave: 'Propagación', valor: 'injerto y semilla según especie' },
        { clave: 'Piso térmico', valor: 'de cálido (cítricos, mango) a frío (mora, tomate de árbol)' },
        { clave: 'Sin veneno', valor: 'trampas, poda sanitaria y control biológico' },
      ],
    },
    hotspots: [
      { id: 'frutales', pos: [], emoji: '🍊', label: 'Ficha de frutales', view: 'frutales' },
    ],
    entrada: {},
  },

  // 🧺 MERCADO Y DESPENSA — arquetipo `infografia`: dato/precio/reporte (NO-3D).
  mercado: {
    escena: 'infografia',
    params: {
      titulo: 'Mercado y despensa',
      cifras: [
        { valor: 'Directo', unidad: '', label: 'venta entre fincas, sin intermediario' },
        { valor: '7', unidad: 'días', label: 'guardar sin que se dañe (poscosecha)' },
      ],
      notas: [
        'Precios de referencia y cuentas para el banco o la cooperativa.',
        'Almacene sin micotoxinas: troja/silo, secar/salar/fermentar con seguridad.',
      ],
    },
    hotspots: [
      { id: 'vender', pos: [], emoji: '🤝', label: 'Vender y comprar', view: 'mercado' },
      { id: 'posc', pos: [], emoji: '🥕', label: 'Poscosecha y despensa', view: 'poscosecha' },
      { id: 'inf', pos: [], emoji: '🖨️', label: 'Sacar reportes', view: 'informes' },
    ],
    entrada: {},
  },

  // 🐞 SANIDAD — arquetipo `infografia`: diagnóstico por síntoma/foto (NO-3D).
  sanidad: {
    escena: 'infografia',
    valle: { tipo: 'huerta', pos: [1.8, 0, 4.4], escala: 0.95 },
    params: {
      titulo: 'Sanidad de la mata',
      notas: [
        'Diga qué le ve ("gota", "polvillo", "amarilla") y sepa qué es y cómo manejarla sin veneno.',
        'Reconozca el bicho por foto: a qué le pega, cómo se ve y su manejo.',
      ],
    },
    hotspots: [
      { id: 'sintoma', pos: [], emoji: '🩺', label: 'Mi mata está enferma', view: 'sanidad_sintoma' },
      { id: 'plagas', pos: [], emoji: '🐛', label: 'Directorio de plagas', view: 'plagas' },
      { id: 'bio', pos: [], emoji: '🧪', label: 'Biopreparados', view: 'biopreparados' },
    ],
    entrada: {},
  },

  // ── NULL: sin escena propia → la tarjeta navega directo al 2D real ───────

  // ⛅ EL CLIMA — YA es 3D ambiental (el cielo del valle); su diorama sería
  //    redundante (DR §3.2). escena:null → va directo al boletín 2D.
  clima: {
    escena: null,
    valle: { tipo: 'veleta', pos: [-3.8, 0, -4.8], escala: 1 },
    ambiental: true,
    ruta2d: { view: 'hoy_finca' },
    entrada: { narra: 'clima' },
  },
};

/** Ids de todos los mundos registrados. */
export const MUNDO_IDS = Object.keys(MUNDO);
