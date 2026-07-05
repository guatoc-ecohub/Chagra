/**
 * cursoChagra.js — Estructura del CURSO auto-guiado "Aprende a usar Chagra".
 *
 * El pedido central (2026-07-04): un solo camino para que alguien SIN ayuda
 * se vuelva autónomo con Chagra. Ensambla, en una progresión con sentido
 * campesino (del primer registro a la venta):
 *   - los 4 video-manuales (HTML animado autocontenido en /manual/mv-*.html)
 *   - las 5 lecciones del mundo Aprender (suelo · asociaciones · biopreparados
 *     · MIP · fenología — src/data/agro-lecciones.json)
 *   - un "Pruébalo en tu finca" por módulo: deep-link a la FUNCIÓN real de la
 *     app (los `view` son cases reales de App.jsx).
 *
 * Los slugs de lección (`lecciones: [...]`) mapean a agro-lecciones.json y se
 * abren dentro del propio módulo del curso (LeccionView), o con "Ver la
 * lección completa" que navega a 'aprende' con { leccion: slug }.
 *
 * NADA inventado: cada afirmación de las lecciones trae su fuente (viene de
 * agro-lecciones.json). El módulo 5 usa un resumen de buenas prácticas de
 * poscosecha + el video de precios; la consulta de precio real es SIPSA/DANE.
 */

/**
 * @typedef {Object} CursoVideo
 * @property {string} src   Ruta al HTML animado (servido en /manual/…).
 * @property {string} titulo
 * @property {string} [subtitulo]
 *
 * @typedef {Object} CursoPrueba
 * @property {string} view   Case real de App.jsx (deep-link vía onNavigate).
 * @property {string} label
 * @property {string} [emoji]
 * @property {Object} [data] Payload opcional para navigate(view, data).
 *
 * @typedef {Object} CursoModulo
 * @property {string} id
 * @property {number} numero
 * @property {string} titulo
 * @property {string} lema
 * @property {string} tag
 * @property {string} emoji
 * @property {string} resumen
 * @property {string} [fuente]
 * @property {CursoVideo[]} videos
 * @property {string[]} lecciones  Slugs de agro-lecciones.json.
 * @property {CursoPrueba[]} pruebas
 */

/** @type {CursoModulo[]} */
export const CURSO_MODULOS = [
  {
    id: 'm1',
    numero: 1,
    titulo: 'Empieza tu finca',
    lema: 'Anota lo que ya tienes sembrado — a mano o hablando.',
    tag: 'Primeros pasos',
    emoji: '🌱',
    resumen:
      'Chagra guarda tu finca en tu propio celular, sin internet y sin nube extranjera. Lo primero es contarle qué tienes: registra una siembra tocando la pantalla, o —con las manos sucias— díselo por voz y él lo anota por ti.',
    fuente: null,
    videos: [
      {
        src: '/manual/mv-siembra.html',
        titulo: 'Registrar una siembra',
        subtitulo: 'Paso a paso, tocando la pantalla',
      },
      {
        src: '/manual/mv-voz-registro.html',
        titulo: 'Agregar una mata por voz',
        subtitulo: 'Con las manos sucias, solo hablando',
      },
    ],
    lecciones: [],
    pruebas: [
      { view: 'sembrar', label: 'Registrar una siembra', emoji: '🌽' },
      { view: 'voz', label: 'Registrar por voz', emoji: '🎤' },
    ],
  },
  {
    id: 'm2',
    numero: 2,
    titulo: 'Conoce tu suelo y tus matas',
    lema: 'Lee tu tierra y sigue el calendario de cada mata.',
    tag: 'Diagnóstico',
    emoji: '🤲',
    resumen:
      'El suelo no es solo tierra: es un mundo vivo de hongos, bacterias y lombrices que trabajan para tu cultivo. Aprende a leerlo sin laboratorio (color, olor, tacto, la prueba de la mostaza) y a seguir la fenología —el calendario natural de cada cultivo— para saber cuándo abonar, podar y cosechar.',
    fuente: 'DR-SUELOS (triple-validado DeepSeek+Gemini+Meta) · Agrosavia.',
    videos: [],
    lecciones: ['suelo', 'fenologia'],
    pruebas: [
      { view: 'suelo', label: 'Cómo está mi tierra', emoji: '🤲' },
      { view: 'calendario', label: 'Calendario de finca', emoji: '🗓️' },
    ],
  },
  {
    id: 'm3',
    numero: 3,
    titulo: 'Cuida sin veneno',
    lema: 'Remedios caseros y manejo de plagas sin químicos.',
    tag: 'Manejo sano',
    emoji: '🧪',
    resumen:
      'Antes del veneno hay muchas herramientas. Los biopreparados (caldos, purines, extractos) se hacen en la finca con lo que hay. Y el Manejo Integrado de Plagas (MIP) combina prevención, monitoreo y control biológico: primero identificar, después actuar con la medida más suave que funcione.',
    fuente: 'Catálogo de biopreparados y control biológico verificado del grafo Chagra.',
    videos: [],
    lecciones: ['biopreparados', 'mip'],
    pruebas: [
      { view: 'biopreparados', label: 'Biopreparados', emoji: '🧪', data: { back: 'dashboard' } },
      { view: 'sanidad_sintoma', label: 'Mi mata está enferma', emoji: '🩺' },
    ],
  },
  {
    id: 'm4',
    numero: 4,
    titulo: 'Asocia y aprovecha',
    lema: 'Siembra en compañía: la milpa y los asocios que se ayudan.',
    tag: 'Policultivo',
    emoji: '🌽',
    resumen:
      'Ninguna mata vive sola. La milpa —maíz, fríjol y calabaza juntos— es el ejemplo clásico: el maíz da soporte, el fríjol fija nitrógeno, la calabaza tapa el suelo. Chagra te muestra qué plantas se ayudan entre sí y cuáles no se llevan.',
    fuente: null,
    videos: [
      {
        src: '/manual/mv-milpa.html',
        titulo: 'La milpa y los asocios',
        subtitulo: 'Sembrar en compañía',
      },
    ],
    lecciones: ['asociaciones'],
    pruebas: [
      { view: 'milpa', label: 'Armar una milpa', emoji: '🌽' },
      { view: 'directorio', label: 'Qué puedo sembrar', emoji: '🌱' },
    ],
  },
  {
    id: 'm5',
    numero: 5,
    titulo: 'Cosecha y vende',
    lema: 'Recoge, guarda bien y mira el precio antes de vender.',
    tag: 'Poscosecha',
    emoji: '🧺',
    resumen:
      'La plata se gana —o se pierde— después de cosechar. Recoge en el punto justo, maneja bien la poscosecha (sombra, ventilación, sin golpes) para que el producto dure, y consulta el precio de referencia (SIPSA/DANE) antes de vender para no rematar tu trabajo.',
    fuente: 'Buenas prácticas de poscosecha (SENA/Agrosavia); precios de referencia SIPSA-DANE (públicos).',
    videos: [
      {
        src: '/manual/mv-sipsa.html',
        titulo: 'Precios y mercado (SIPSA)',
        subtitulo: 'Consulta antes de vender',
      },
    ],
    lecciones: [],
    pruebas: [
      { view: 'cosechar', label: 'Registrar cosecha', emoji: '🧺' },
      { view: 'poscosecha', label: 'Despensa y poscosecha', emoji: '🫙' },
      { view: 'mercados', label: 'Ver el mercado', emoji: '🛒' },
    ],
  },
];

/** Total de módulos del curso. */
export const CURSO_TOTAL = CURSO_MODULOS.length;

/** Clave de localStorage donde se guarda el progreso (array de ids de módulo). */
export const CURSO_PROGRESO_KEY = 'chagra_curso_progreso';

/**
 * Lee el progreso guardado. Robusto: si localStorage no existe o el valor está
 * corrupto, devuelve un set vacío (nunca lanza).
 * @returns {Set<string>} ids de módulos completados.
 */
export function leerProgresoCurso() {
  try {
    const raw = globalThis.localStorage?.getItem(CURSO_PROGRESO_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * Guarda el progreso. No lanza si localStorage no está disponible.
 * @param {Set<string>|string[]} completados
 */
export function guardarProgresoCurso(completados) {
  try {
    const arr = Array.from(completados);
    globalThis.localStorage?.setItem(CURSO_PROGRESO_KEY, JSON.stringify(arr));
  } catch {
    /* offline / storage lleno / modo privado — el progreso es best-effort */
  }
}
