/**
 * angelitaAvisoTipos — taxonomía de los avisos de Angelita: 8 tipos, cada uno
 * con color accesible + ícono. El COLOR NUNCA VA SOLO (WCAG 1.4.1 y guía del
 * DR de notificaciones): cada tipo lleva también un ícono/forma, para que un
 * usuario daltónico distinga una alerta de una sugerencia sin depender del
 * tinte. El texto de la burbuja queda SIEMPRE casi-blanco sobre fondo oscuro
 * (contraste > 12:1, AAA); el tipo tiñe borde, ícono y fondo profundo.
 *
 * Los acentos son claros sobre fondos casi-negros: contraste no-textual
 * > 7:1 en todos los pares (WCAG 1.4.11 pide 3:1). Los pares problemáticos
 * para daltonismo (verde sugerencia vs teal planta; dorado bienvenida vs
 * naranja atención; coral alerta vs verde) se desambiguan por ícono y, en
 * alerta, además por borde más grueso (forma, no solo color).
 *
 * Módulo de datos puro: sin React, sin red, sin estado.
 */

/** Los 8 tipos canónicos de aviso. */
export const TIPOS_AVISO = /** @type {const} */ ([
  'bienvenida',
  'informativa',
  'sugerencia',
  'atencion',
  'alerta',
  'celebracion',
  'planta',
  'nino',
]);

/**
 * Tabla tipo → apariencia. Todos los colores precalculados (cero color-mix,
 * cero dependencias de runtime CSS moderno):
 *   - acento     → ícono, borde del chip y cursor del typewriter.
 *   - borde      → borde de la burbuja (acento translúcido).
 *   - fondo      → fondo profundo de la burbuja, teñido del tipo.
 *   - fondoIcono → disco tras el ícono (acento muy translúcido).
 *   - icono      → glifo que desambigua SIN color.
 *   - etiqueta / aria → nombre humano y narración para lector de pantalla.
 */
export const AVISO_TIPOS = {
  bienvenida: {
    acento: '#FFC94D',
    borde: 'rgba(255, 201, 77, 0.5)',
    fondo: 'rgba(58, 42, 8, 0.88)',
    fondoIcono: 'rgba(255, 201, 77, 0.18)',
    icono: '🌻',
    etiqueta: 'Bienvenida',
    aria: 'Saludo de bienvenida',
  },
  informativa: {
    acento: '#7CC4FF',
    borde: 'rgba(124, 196, 255, 0.45)',
    fondo: 'rgba(10, 30, 48, 0.88)',
    fondoIcono: 'rgba(124, 196, 255, 0.16)',
    icono: '💬',
    etiqueta: 'Informativa',
    aria: 'Información de su finca',
  },
  sugerencia: {
    acento: '#8FE29B',
    borde: 'rgba(143, 226, 155, 0.45)',
    fondo: 'rgba(10, 38, 20, 0.88)',
    fondoIcono: 'rgba(143, 226, 155, 0.16)',
    icono: '💡',
    etiqueta: 'Sugerencia agroecológica',
    aria: 'Sugerencia agroecológica para su finca',
  },
  atencion: {
    acento: '#FFB35C',
    borde: 'rgba(255, 179, 92, 0.55)',
    fondo: 'rgba(56, 32, 6, 0.88)',
    fondoIcono: 'rgba(255, 179, 92, 0.18)',
    icono: '📌',
    etiqueta: 'Requiere atención',
    aria: 'Tarea que requiere su atención',
  },
  alerta: {
    acento: '#FF8A7A',
    borde: 'rgba(255, 138, 122, 0.65)',
    fondo: 'rgba(54, 14, 10, 0.9)',
    fondoIcono: 'rgba(255, 138, 122, 0.2)',
    icono: '⚠️',
    etiqueta: 'Alerta',
    aria: 'Alerta importante de su finca',
  },
  celebracion: {
    acento: '#FFA1D8',
    borde: 'rgba(255, 161, 216, 0.5)',
    fondo: 'rgba(52, 14, 38, 0.88)',
    fondoIcono: 'rgba(255, 161, 216, 0.18)',
    icono: '🎉',
    etiqueta: 'Celebración',
    aria: 'Celebración de un logro suyo',
  },
  planta: {
    acento: '#6FE3CD',
    borde: 'rgba(111, 227, 205, 0.45)',
    fondo: 'rgba(8, 40, 36, 0.88)',
    fondoIcono: 'rgba(111, 227, 205, 0.16)',
    icono: '🌿',
    etiqueta: 'Sobre una planta',
    aria: 'Comentario sobre una planta suya',
  },
  nino: {
    acento: '#CDABFF',
    borde: 'rgba(205, 171, 255, 0.5)',
    fondo: 'rgba(30, 18, 52, 0.88)',
    fondoIcono: 'rgba(205, 171, 255, 0.18)',
    icono: '⭐',
    etiqueta: 'Para niños',
    aria: 'Mensaje amable para niños',
  },
};

/** Apariencia de un tipo, con fallback seguro a informativa. */
export function aparienciaDeTipo(tipo) {
  return AVISO_TIPOS[tipo] || AVISO_TIPOS.informativa;
}

/**
 * Clasifica una decisión del motor (angelitaInteligencia.resolverComportamiento)
 * en uno de los 8 tipos de aviso. Determinista y puro.
 *
 * Mapa: celebra → celebracion · aviso alta → alerta · aviso media → atencion ·
 * aviso baja → informativa · husmea en mis_matas → planta · husmea en mundos
 * de consejo (bosque/páramo/aprender/vender/animales) → sugerencia · primer
 * mensaje de la sesión (husmeo) → bienvenida · modo niño → nino (manda sobre
 * todo lo no urgente; una alerta real sigue siendo alerta).
 *
 * @param {{ estado?: string, severidad?: ('alta'|'media'|'baja'|null) }} decision
 * @param {{ mundo?: string|null, esNino?: boolean, esBienvenida?: boolean }} [ctx]
 * @returns {string|null} tipo de TIPOS_AVISO, o null si no hay aviso (calma).
 */
export function tipoDeDecision(decision, ctx = {}) {
  if (!decision || !decision.estado || decision.estado === 'calma') return null;
  const { mundo = null, esNino = false, esBienvenida = false } = ctx;
  if (decision.estado === 'aviso') {
    if (decision.severidad === 'alta') return 'alerta';
    if (esNino) return 'nino';
    if (decision.severidad === 'media') return 'atencion';
    return 'informativa';
  }
  if (esNino) return 'nino';
  if (decision.estado === 'celebra') return 'celebracion';
  // husmea
  if (esBienvenida) return 'bienvenida';
  if (mundo === 'mis_matas') return 'planta';
  if (
    mundo === 'bosque' ||
    mundo === 'paramo' ||
    mundo === 'aprender' ||
    mundo === 'vender' ||
    mundo === 'mis_animales'
  ) {
    return 'sugerencia';
  }
  return 'informativa';
}

export default AVISO_TIPOS;
