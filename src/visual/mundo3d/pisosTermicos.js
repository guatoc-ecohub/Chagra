/*
 * pisosTermicos — LOS PISOS TÉRMICOS de la Sierra Nevada de Santa Marta como
 * DATO puro (cero three, cero React): el gradiente altitudinal que estructura
 * TODA la navegación del mundo 3D. Del mar de Palomino (0 m) a la nieve del Pico
 * Cristóbal Colón / Simón Bolívar (5 775 m, IGAC) en ~42 km — el único macizo
 * litoral del mundo que reúne todos los pisos, continuos, desde el nivel del mar.
 *
 * Este módulo NO dibuja: expone (1) los rangos de altitud reales por piso, su
 * color térmico, su vegetación y QUÉ MUNDOS/funciones de Chagra viven en cada
 * uno; y (2) el helper `compatibilidadPiso(pisoUsuario)` que, dado el piso de la
 * tierra del usuario, marca cada piso como SUYO / colindante / otro — todos
 * EXPLORABLES. Lo consume el overlay `PisosTermicosBandas.jsx` (bandas r3f) y
 * cualquier vista que necesite el catálogo por altura.
 *
 * HONESTIDAD DE CONTEXTO (anti-fabricación): sin un piso de usuario NO se resalta
 * ninguno (estado 'neutro'); y los pisos que NO son el suyo quedan igual de
 * visibles y visitables — "existe, explórelo, no es de su piso" —, nunca ocultos
 * ni fingidos como aplicables a su predio.
 *
 * RESPETO: la Sierra es territorio sagrado y habitado. Se acredita a los cuatro
 * pueblos y a la Línea Negra (ver `ATRIBUCION_SIERRA`); aquí solo van hechos
 * geográficos y ecológicos, sin iconografía ceremonial.
 *
 * Fuentes: DR sierra-geo-render (gemini, 2026-06-19) + catálogo thermal_zones +
 * clasificación altitudinal de Caldas. Cotas de picos: IGAC.
 */

/** Cota de la cumbre de la Sierra (Pico Cristóbal Colón / Simón Bolívar), IGAC. */
export const CUMBRE_SIERRA_M = 5775;

/**
 * Hitos de referencia para anclar la silueta (los consume la montaña; este
 * módulo no los dibuja). Del mar a la cumbre.
 */
export const HITOS_SIERRA = [
  { id: 'palomino', nombre: 'Palomino', m: 0, nota: 'el mar Caribe al pie de la Sierra' },
  { id: 'simmonds', nombre: 'Pico Simmonds', m: 5560 },
  { id: 'colon', nombre: 'Pico Cristóbal Colón', m: 5775 },
  { id: 'bolivar', nombre: 'Pico Simón Bolívar', m: 5775 },
];

/**
 * Crédito del territorio. Cadena lista para mostrar junto a la montaña; la
 * decisión de uso público de identidad cultural es de producto (consulta
 * comunitaria), no de render.
 */
export const ATRIBUCION_SIERRA =
  'Territorio ancestral kogui, arhuaco (iku), wiwa y kankuamo — corazón de la Línea Negra.';

/**
 * Los pisos térmicos de la Sierra, de abajo (mar) a arriba (nieve). Cada uno:
 *   · min / max  — rango de altitud REAL en metros (DR sierra-geo-render).
 *   · color      — térmico: dorado abajo → azul-plata/blanco arriba.
 *   · vegetacion — el paisaje del piso (sin cultígenos de adorno).
 *   · mundos     — las funciones de Chagra que VIVEN por ecología en ese piso
 *                  (`view` = destino real de navegación). `transversal: true`
 *                  marca las que existen en varios pisos y solo se anclan aquí
 *                  como puerta.
 *   · cultivable — si el piso admite cultivo (páramo arriba: se cuida, no se ara).
 *
 * El orden es de menor a mayor altitud (índice = altura relativa).
 */
export const PISOS_TERMICOS = [
  {
    id: 'calido',
    nombre: 'Cálido',
    min: 0,
    max: 1000,
    color: '#cba04a',
    vegetacion: 'Bosque seco tropical y manglar; palma, banano, cacao, cítricos, mango.',
    cultivable: true,
    mundos: [
      { id: 'milpa', nombre: 'La milpa: maíz, fríjol y calabaza', view: 'milpa_cultivo' },
      { id: 'frutales', nombre: 'Frutales de tierra caliente', view: 'frutales' },
      { id: 'animales', nombre: 'El corral y sus animales', view: 'animales' },
      { id: 'mercado', nombre: 'El mercado y la despensa', view: 'mercado', transversal: true },
    ],
  },
  {
    id: 'templado',
    nombre: 'Templado',
    min: 1000,
    max: 2000,
    color: '#6f9e4a',
    vegetacion: 'Bosque húmedo tropical; café bajo sombra, frutales, caña, pastos.',
    cultivable: true,
    mundos: [
      { id: 'cafe', nombre: 'El café bajo sombra', view: 'cafe' },
      { id: 'disenio', nombre: 'El bosque de alimentos', view: 'restauracion' },
      { id: 'semillero', nombre: 'El semillero y el vivero', view: 'germinacion' },
      { id: 'frutales', nombre: 'Frutales de clima medio', view: 'frutales' },
    ],
  },
  {
    id: 'frio',
    nombre: 'Frío',
    min: 2000,
    max: 3000,
    color: '#4f8f7d',
    vegetacion: 'Bosque andino y de niebla; papa, hortalizas, mora, tomate de árbol.',
    cultivable: true,
    mundos: [
      { id: 'tuberculos', nombre: 'La papa y los tubérculos', view: 'tuberculos' },
      { id: 'hortalizas', nombre: 'La huerta de hortalizas', view: 'hortalizas' },
      { id: 'suelo', nombre: 'El suelo vivo', view: 'salud_suelo', transversal: true },
      { id: 'agua', nombre: 'La quebrada y el riego', view: 'agua' },
    ],
  },
  {
    id: 'paramo',
    nombre: 'Páramo',
    min: 3000,
    max: 4000,
    color: '#9fb6bf',
    vegetacion: 'Frailejones (Espeletia), pajonales y arbustos bajos; la fábrica de agua.',
    cultivable: false,
    mundos: [
      { id: 'agua', nombre: 'Donde nace el agua', view: 'agua' },
      { id: 'restauracion', nombre: 'El páramo se cuida', view: 'restauracion' },
      { id: 'biodiversidad', nombre: 'El frailejón y la niebla', view: 'biodiversidad' },
    ],
  },
  {
    id: 'superparamo',
    nombre: 'Superpáramo',
    min: 4000,
    max: 4800,
    color: '#b9c6cc',
    vegetacion: 'Líquenes, musgos y cojines rasantes; vida al límite del frío.',
    cultivable: false,
    mundos: [
      { id: 'conservacion', nombre: 'Vida al límite del frío', view: 'biodiversidad' },
    ],
  },
  {
    id: 'nival',
    nombre: 'Nival',
    min: 4800,
    max: CUMBRE_SIERRA_M,
    color: '#eef2f4',
    vegetacion: 'Sin vegetación: glaciar y nieve perpetua, hoy en retroceso.',
    cultivable: false,
    mundos: [
      { id: 'glaciar', nombre: 'La nieve y su retroceso', view: 'hoy_finca' },
    ],
  },
];

/** Estados de compatibilidad de un piso respecto al del usuario. */
export const ESTADO_PISO = {
  SUYO: 'suyo', // es el piso de su predio
  COLINDANTE: 'colindante', // el vecino inmediato (su tierra puede alcanzarlo)
  OTRO: 'otro', // otro piso: visible y explorable, no aplica a su predio
  NEUTRO: 'neutro', // sin piso de usuario: nada resaltado
};

/** Piso por id (o `null`). */
export function pisoPorId(id) {
  if (!id) return null;
  return PISOS_TERMICOS.find((p) => p.id === id) || null;
}

/**
 * El piso cuyo rango contiene esa altitud (metros). Por debajo de 0 → cálido;
 * por encima de la cumbre → nival. Cada rango es [min, max) salvo el último,
 * que cierra en la cumbre.
 */
export function pisoPorAltitud(metros) {
  if (typeof metros !== 'number' || Number.isNaN(metros)) return null;
  if (metros < 0) return PISOS_TERMICOS[0];
  const ultimo = PISOS_TERMICOS[PISOS_TERMICOS.length - 1];
  if (metros >= ultimo.max) return ultimo;
  return PISOS_TERMICOS.find((p) => metros >= p.min && metros < p.max) || ultimo;
}

/**
 * Normaliza el piso del usuario a un id de piso (o `null` si no se sabe — que es
 * la señal de "no resaltar nada"). Acepta, con tolerancia:
 *   · un id de piso            → 'calido' | 'templado' | 'frio' | 'paramo' | …
 *   · un nombre                → 'Páramo', 'frio'
 *   · una altitud en metros    → 1850  (número o string numérica)
 *   · un objeto de finca viva  → { pisoTermico | piso | zona | id }  ó
 *                                { altitud | altitudM | metros | msnm | elevacion }
 * NO inventa: si nada calza, devuelve `null`.
 */
export function normalizarPisoUsuario(pisoUsuario) {
  if (pisoUsuario == null) return null;

  if (typeof pisoUsuario === 'number') {
    return pisoPorAltitud(pisoUsuario)?.id ?? null;
  }

  if (typeof pisoUsuario === 'string') {
    const s = pisoUsuario.trim().toLowerCase();
    if (!s) return null;
    const porId = PISOS_TERMICOS.find((p) => p.id === s);
    if (porId) return porId.id;
    const porNombre = PISOS_TERMICOS.find((p) => p.nombre.toLowerCase() === s);
    if (porNombre) return porNombre.id;
    const num = Number(s);
    if (!Number.isNaN(num) && s !== '') return pisoPorAltitud(num)?.id ?? null;
    return null;
  }

  if (typeof pisoUsuario === 'object') {
    const idCampo =
      pisoUsuario.pisoTermico ?? pisoUsuario.piso ?? pisoUsuario.zona ?? pisoUsuario.id;
    if (typeof idCampo === 'string') {
      const anidado = normalizarPisoUsuario(idCampo);
      if (anidado) return anidado;
    }
    const metros =
      pisoUsuario.altitud ??
      pisoUsuario.altitudM ??
      pisoUsuario.metros ??
      pisoUsuario.msnm ??
      pisoUsuario.elevacion;
    if (typeof metros === 'number') return pisoPorAltitud(metros)?.id ?? null;
    if (typeof metros === 'string' && metros.trim() !== '') {
      const num = Number(metros);
      if (!Number.isNaN(num)) return pisoPorAltitud(num)?.id ?? null;
    }
  }

  return null;
}

/** Fracción 0..1 de una altitud respecto a la cumbre (para mapear a la ladera). */
export function altitudAFraccion(metros, cumbre = CUMBRE_SIERRA_M) {
  const c = cumbre > 0 ? cumbre : CUMBRE_SIERRA_M;
  return Math.max(0, Math.min(1, metros / c));
}

/**
 * Anota TODOS los pisos según el del usuario. Devuelve un objeto estable:
 *   { pisoUsuarioId, hayPisoUsuario, pisos: [ { ...piso, esMio, estado,
 *     compatible, colindante, explorable, distancia } ] }
 *
 * · esMio       — es el piso de su predio.
 * · compatible  — sus funciones aplican DIRECTO a su predio (solo el suyo:
 *                 honestidad estricta).
 * · colindante  — vecino inmediato (su tierra puede alcanzarlo).
 * · explorable  — SIEMPRE true: cualquier piso se puede visitar/aprender.
 * · distancia   — |índice - índice del usuario| (o null si no hay usuario).
 *
 * Sin piso de usuario válido → todo 'neutro', nada resaltado (anti-fabricación).
 */
export function compatibilidadPiso(pisoUsuario) {
  const pisoUsuarioId = normalizarPisoUsuario(pisoUsuario);
  const idxUsuario = pisoUsuarioId
    ? PISOS_TERMICOS.findIndex((p) => p.id === pisoUsuarioId)
    : -1;
  const hayPisoUsuario = idxUsuario >= 0;

  const pisos = PISOS_TERMICOS.map((piso, i) => {
    if (!hayPisoUsuario) {
      return {
        ...piso,
        esMio: false,
        estado: ESTADO_PISO.NEUTRO,
        compatible: false,
        colindante: false,
        explorable: true,
        distancia: null,
      };
    }
    const distancia = Math.abs(i - idxUsuario);
    const esMio = distancia === 0;
    const colindante = distancia === 1;
    const estado = esMio
      ? ESTADO_PISO.SUYO
      : colindante
        ? ESTADO_PISO.COLINDANTE
        : ESTADO_PISO.OTRO;
    return {
      ...piso,
      esMio,
      estado,
      compatible: esMio,
      colindante,
      explorable: true,
      distancia,
    };
  });

  return { pisoUsuarioId, hayPisoUsuario, pisos };
}
