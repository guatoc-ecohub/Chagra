/* eslint-disable chagra-i18n/no-hardcoded-spanish -- `estadoAngelita` son identificadores
   de estado canónico (ver angelitaEstados.js ESTADOS_ANGELITA), no copy de UI */
/*
 * confianzaTokens — EL LENGUAJE VISUAL DE LA CONFIANZA, como datos puros.
 *
 * Chagra prefiere decir "no sé" antes que inventar. Ese carácter ya vive en
 * tres lugares que este módulo NO reemplaza sino que vuelve UN solo idioma:
 *
 *   - el halo de Angelita (src/visual/agente/): anillo continuo / punteado /
 *     entrecortado según la certeza, y el estado 'no-se' que se dice de frente.
 *   - el sello semáforo del chat (components/AgentScreen/SemaforoConfianza.jsx
 *     + styles/sello-confianza.css): verde / ámbar / rojo por respuesta.
 *   - el panel de procedencia "cosido al cuaderno" (misma superficie).
 *
 * La gramática compartida es LA PUNTADA: una respuesta viene cosida al saber
 * que la sostiene, y el hilo cuenta la verdad sin una sola cifra:
 *
 *   alta    → costura FIRME, continua: agarrada al grafo, con fuente.
 *   media   → HILVÁN punteado: saber general, no de su finca en particular.
 *   baja    → hilo SUELTO que titila: el modelo duda, y se le nota.
 *   honesta → el hilo se REMATA en nudo limpio y una señal dice a dónde ir.
 *             La honestidad NO es un hilo roto: es un remate bien hecho.
 *             No avergüenza — es la marca de la casa.
 *
 * Y los saberes tienen ORIGEN visible: de SU finca (raíz honda), con fuente
 * (etiqueta de herbario), saber general (horizonte) o saber de la gente
 * (guarda tejida — ni verdad ni mentira: otra cosa, con su propio respeto).
 *
 * REGLA DE ORO: SOLO datos (cero react). La CADENCIA vive en confianza.css;
 * el DIBUJO en los componentes de esta carpeta. Colores: SIEMPRE de la paleta
 * madre — aquí no nace ni un hex nuevo.
 */
import { VERDES, TIERRAS, ACENTOS, NEUTROS, PALETA } from '../mundo3d/paleta/index.js';
import { INK, HUESO } from '../creatures/_faunaRubberTokens.js';

/* ── Los cuatro niveles del hilo ─────────────────────────────────────────────
   `halo` mapea al anillo de Angelita (angelitaEstados.nivelDeConfianza);
   `estadoAngelita` es el gesto que la acompaña; `semaforo` calza con el sello
   del chat (sello-confianza.css). Así las tres superficies dicen LO MISMO. */
export const NIVELES_CONFIANZA = {
  alta: {
    id: 'alta',
    puntada: 'firme',
    color: VERDES.trabajo, // el verde franco del trabajo: sembrado y verificado
    colorSuave: VERDES.brote,
    etiqueta: 'firme',
    aria: 'Respuesta firme: sale de datos verificados, con fuente',
    halo: 'alta',
    estadoAngelita: 'respondiendo',
    semaforo: 'verde',
  },
  media: {
    id: 'media',
    puntada: 'hilvan',
    color: ACENTOS.ambar, // la señal amable de la casa (nunca rojo catástrofe)
    colorSuave: ACENTOS.maizGrano,
    etiqueta: 'a medias',
    aria: 'Respuesta general: saber que sirve, pero no es de su finca en particular',
    halo: 'media',
    estadoAngelita: 'respondiendo',
    semaforo: 'ambar',
  },
  baja: {
    id: 'baja',
    puntada: 'suelta',
    color: NEUTROS.lamina, // gris CÁLIDO: la voz baja de la duda, no una alarma
    colorSuave: NEUTROS.concreto,
    etiqueta: 'en duda',
    aria: 'Respuesta en duda: el modelo no está seguro, tómela con cuidado',
    halo: 'baja',
    estadoAngelita: 'respondiendo',
    semaforo: 'ambar',
  },
  honesta: {
    id: 'honesta',
    puntada: 'remate',
    color: NEUTROS.tinta, // tinta sobre papel: lo más "cuaderno" de todos
    colorSuave: ACENTOS.ambar, // el caminito dorado que sigue después del nudo
    etiqueta: 'no sé',
    aria: 'Chagra no sabe esto, se lo dice de frente y le señala a dónde acudir',
    halo: null, // sin anillo: el gesto lo pone el estado 'no-se' de Angelita
    estadoAngelita: 'no-se',
    semaforo: 'rojo',
  },
};

export const ORDEN_NIVELES = ['alta', 'media', 'baja', 'honesta'];

/**
 * Normaliza lo que entregue el host a un nivel del hilo. Acepta:
 * número 0..1 (score), etiquetas propias ('firme', 'no sé'…), niveles del
 * halo de Angelita, niveles del semáforo ('verde'/'ambar'/'rojo') y la
 * política del sidecar ('answer'/'hedge'/'abstain').
 * @param {number|string|null|undefined} valor
 * @returns {'alta'|'media'|'baja'|'honesta'|null} null = sin marca (graceful)
 */
export function nivelDelHilo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number' || (typeof valor === 'string' && valor !== '' && !Number.isNaN(Number(valor)))) {
    const n = Number(valor);
    if (Number.isNaN(n)) return null;
    if (n >= 0.75) return 'alta';
    if (n >= 0.45) return 'media';
    return 'baja';
  }
  const v = String(valor).toLowerCase().trim();
  if (v in NIVELES_CONFIANZA) return /** @type {any} */ (v);
  const ALIAS = {
    firme: 'alta', segura: 'alta', verde: 'alta', answer: 'alta',
    'a medias': 'media', parcial: 'media', ambar: 'media', 'ámbar': 'media', hedge: 'media',
    duda: 'baja', 'en duda': 'baja', dudosa: 'baja', suelta: 'baja',
    'no se': 'honesta', 'no sé': 'honesta', 'no-se': 'honesta', nose: 'honesta',
    rojo: 'honesta', abstain: 'honesta', honesto: 'honesta',
  };
  return ALIAS[v] || null;
}

/* ── Los orígenes del saber ──────────────────────────────────────────────────
   De dónde sale lo que Chagra dice — visible de un vistazo. La diferencia
   entre "de SU finca" y "saber general" es enorme y merece verse. */
export const ORIGENES_SABER = {
  finca: {
    id: 'finca',
    etiqueta: 'De su finca',
    aria: 'Esto sale de los registros de su propia finca: su altura, su cultivo, su historia',
    color: VERDES.brote,
    colorTierra: TIERRAS.siembra, // la raíz va HONDA: agarrada a su tierra
  },
  fuente: {
    id: 'fuente',
    etiqueta: 'Con fuente',
    aria: 'Esto tiene fuente citada que usted puede consultar',
    color: PALETA.madera,
    colorTierra: TIERRAS.camino,
  },
  general: {
    id: 'general',
    etiqueta: 'Saber general',
    aria: 'Esto es conocimiento general del campo, no un dato de su finca',
    color: VERDES.altoAndino, // el frío grisáceo del horizonte lejano
    colorTierra: TIERRAS.rocaSierra,
  },
  tradicion: {
    id: 'tradicion',
    etiqueta: 'Saber de la gente',
    aria: 'Esto es saber campesino: mucha gente lo usa, la ciencia aún no lo tiene bien estudiado',
    color: ACENTOS.maizTextil, // el textil: ni verde ni ámbar — otra cosa
    colorTierra: ACENTOS.indigo,
  },
};

/**
 * Normaliza el origen que entregue el host ('grafo', 'doi', 'agrosavia'…).
 * @param {string|null|undefined} valor
 * @returns {'finca'|'fuente'|'general'|'tradicion'|null}
 */
export function origenDelSaber(valor) {
  if (!valor) return null;
  const v = String(valor).toLowerCase().trim();
  if (v in ORIGENES_SABER) return /** @type {any} */ (v);
  const ALIAS = {
    grafo: 'finca', registro: 'finca', bitacora: 'finca', 'bitácora': 'finca', farm: 'finca',
    doi: 'fuente', agrosavia: 'fuente', ideam: 'fuente', ica: 'fuente',
    openalex: 'fuente', catalogo: 'fuente', 'catálogo': 'fuente', paper: 'fuente', libro: 'fuente',
    modelo: 'general', llm: 'general', generativa: 'general',
    'tradición': 'tradicion', costumbre: 'tradicion', abuela: 'tradicion', gente: 'tradicion',
  };
  return ALIAS[v] || null;
}

/* ── Tipos de fuente para la ficha de herbario (FichaFuente) ────────────────
   Cada fuente real se presenta como un espécimen etiquetado: qué es, en
   palabras llanas — sin parecer un paper. */
export const TIPOS_FUENTE = {
  doi: { etiqueta: 'Artículo científico', origen: 'fuente' },
  agrosavia: { etiqueta: 'Agrosavia', origen: 'fuente' },
  ideam: { etiqueta: 'IDEAM (clima)', origen: 'fuente' },
  ica: { etiqueta: 'ICA (sanidad)', origen: 'fuente' },
  catalogo: { etiqueta: 'Catálogo Chagra', origen: 'fuente' },
  libro: { etiqueta: 'Libro / cartilla', origen: 'fuente' },
  finca: { etiqueta: 'Registro de su finca', origen: 'finca' },
  gente: { etiqueta: 'Saber de la gente', origen: 'tradicion' },
};

/* ── La advertencia con peso ────────────────────────────────────────────────
   Cuando hay riesgo real (veneno, zoonosis, agua contaminada, botulismo),
   la señal no titila ni chilla: PESA. Piedra asentada, tinta gruesa y el
   rojo cochinilla — el único momento en que el rojo textil se pone serio. */
export const PESO_ADVERTENCIA = {
  color: ACENTOS.cochinilla,
  tinta: INK,
  papel: HUESO,
  aria: 'Advertencia seria: esto puede hacerle daño a usted o a los suyos',
};

/* Re-export de conveniencia: los componentes de esta carpeta dibujan con esto. */
export { INK, HUESO };
