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

  // 💧 EL AGUA — el camino de la gravedad (flujo).
  agua: {
    escena: 'flujo',
    valle: { tipo: 'quebrada', pos: [0.6, 0, -1.4], escala: 1 },
    params: {},
    hotspots: [
      { id: 'agua', pos: [1.5, 0.3, 0.5], emoji: '💧', label: 'El agua de mi finca', view: 'agua' },
      { id: 'hoy', pos: [-1.8, 2.5, 0.4], emoji: '🌤️', label: 'Lluvia de hoy', view: 'hoy_finca' },
    ],
    entrada: { zoom: 7, narra: 'agua' },
  },

  // 🐔 LOS ANIMALES — el ciclo cerrado (recinto). Gated por perfil (como hoy).
  animales: {
    escena: 'recinto',
    valle: { tipo: 'corral', pos: [-4.6, 0, -1.8], escala: 1 },
    gate: 'animales',
    params: {
      animales: [
        { color: '#e7d9c2', pos: [-0.7, 0, 0.4] },
        { color: '#c98a5a', pos: [0.6, 0, -0.3] },
        { color: '#d8c49a', pos: [0.1, 0, 0.7] },
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
