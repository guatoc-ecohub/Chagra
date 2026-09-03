/**
 * susurroNocturno — EL compAI DE NOCHE BAJA LA VOZ. Núcleo portable (#108).
 *
 * De noche (hora local) el compañero se pone suave: menos volumen/brillo,
 * tono tranquilo, y comenta DOS cosas reales — la fase de la luna (dato
 * astronómico) y el clima de mañana (el mismo dato que ya usa #111) — antes
 * de invitar a descansar.
 *
 * ⚠️ CANDADO CIENTÍFICO DURO (aprobado por el operador 2026-07-30, DR en
 * `Chagra-strategy/deepresearch/2026-07-30-agricultura-lunar-evidencia.md`,
 * Mayoral et al. 2020 Agronomy DOI:10.3390/agronomy10070955):
 *
 *   La SIEMBRA por fases lunares NO está validada científicamente. La
 *   evidencia experimental es escasa/mixta, los mecanismos físicos propuestos
 *   (marea sobre la savia, luz lunar) no se sostienen frente a la física y
 *   biología actuales. Del Mónaco et al. 2011 clasifica el calendario
 *   biodinámico como "sistema de creencias... de escasa validez científica".
 *
 *   Este módulo NUNCA presenta la fase lunar como consejo agronómico de
 *   Chagra. La fase en sí (astronomía real, mismo cálculo de
 *   `utils/skyEphemeris.lunarPhase`) SÍ se puede decir — es un hecho, no una
 *   recomendación. Si el mensaje toca la creencia campesina de sembrar por
 *   luna, va SOLO etiquetada como saber popular ("los mayores dicen...") +
 *   la nota honesta ("la ciencia no lo ha confirmado"), nunca como causalidad
 *   afirmada. Ver `mensajeSaberLunarCampesino` — es opt-in, no se llama desde
 *   `susurroDeNoche` por defecto.
 *
 * @module compai/nucleo/susurroNocturno
 */

/** Hora local (decimal, incluye minutos) desde la que empieza la noche. */
export const HORA_INICIO_NOCHE = 19;
/** Hora local hasta la que sigue siendo de noche (antes del amanecer andino). */
export const HORA_FIN_NOCHE = 5.75;

/**
 * ¿Es de noche, hora local? Ventana ecuatorial andina simple: el sol se
 * esconde ~18:00-18:15 y sale ~5:45-6:10 todo el año (Colombia ~4-5°N, sin
 * estaciones marcadas) — se deja un margen digital hasta las 19:00 para no
 * apagar la voz mientras aún hay luz de atardecer.
 * @param {Date} [fecha]
 * @returns {boolean}
 */
export function esDeNoche(fecha = new Date()) {
  const h = fecha.getHours() + fecha.getMinutes() / 60;
  return h >= HORA_INICIO_NOCHE || h < HORA_FIN_NOCHE;
}

/**
 * Nombra la fase lunar en lenguaje campesino corto, para hablar (no para
 * un widget). Recibe el resultado YA CALCULADO de `lunarPhase()` (el núcleo
 * no calcula astronomía — cero dependencias, ver MANIFIESTO.md) para que el
 * host (PWA o valle) le pase lo que ya tenga.
 * @param {{name?: string}|null} fase — lunarPhase() de utils/skyEphemeris.
 * @returns {string|null}
 */
function nombrarFase(fase) {
  const n = fase?.name;
  return typeof n === 'string' && n.length > 0 ? n.toLowerCase() : null;
}

/**
 * El susurro de noche: baja la voz, comenta la luna real + el clima de
 * mañana, invita a descansar. Anti-fabricación: si no hay fase ni clima,
 * dice sólo lo que tiene — nunca inventa un dato para completar la frase.
 *
 * NO habla de siembra por luna aquí (ver candado arriba). Es un dato
 * astronómico + una invitación a parar, punto.
 *
 * @param {Object} [input]
 * @param {{name?: string}|null} [input.fase] — lunarPhase() ya calculada.
 * @param {import('./climaVivo').ReaccionClima|null} [input.reaccionClima] —
 *   reaccionAlClima() ya calculada (#111); se reutiliza tal cual si hay algo
 *   urgente que decir, para no duplicar el mensaje de clima.
 * @returns {{ mensaje: string, gesto: 'susurra' }|null}
 */
export function susurroDeNoche({ fase = null, reaccionClima = null } = {}) {
  const nombreFase = nombrarFase(fase);
  const partes = [];
  if (nombreFase) partes.push(`Esta noche hay ${nombreFase}`);
  // El clima de mañana ya lo dice reaccionAlClima con su propio criterio de
  // urgencia (helada/lluvia/sequía); si hay algo real, se anexa tal cual —
  // el dato es el mismo, sólo cambia el tono de quien lo dice (de noche).
  if (reaccionClima?.mensaje) partes.push(reaccionClima.mensaje);

  if (partes.length === 0) {
    // Sin fase ni clima: igual invita a descansar, sin inventar el resto.
    return { mensaje: 'Ya está oscureciendo. Yo también bajo el ritmo — descanse, que mañana seguimos.', gesto: 'susurra' };
  }
  partes.push('Descanse tranquilo, que mañana seguimos.');
  // El último parte ya termina en '.', así que join('. ') deja el punto final;
  // colapsar cualquier '..' accidental (p.ej. "seguimos..") a uno solo.
  return { mensaje: partes.join('. ').replace(/\.\.+/g, '.'), gesto: 'susurra' };
}

/**
 * El saber campesino de sembrar por luna — SOLO si el host decide mostrarlo
 * explícitamente (nunca automático desde `susurroDeNoche`). Etiquetado como
 * creencia popular + nota honesta, nunca como causalidad. Ver candado arriba.
 * @param {{name?: string}|null} [fase]
 * @returns {string|null}
 */
export function mensajeSaberLunarCampesino(fase = null) {
  const nombreFase = nombrarFase(fase);
  if (!nombreFase) return null;
  return `Los mayores dicen que en ${nombreFase} conviene sembrar así. Es saber campesino de siempre — la ciencia todavía no lo ha confirmado, pero se sigue contando de generación en generación.`;
}

export default { esDeNoche, susurroDeNoche, mensajeSaberLunarCampesino, HORA_INICIO_NOCHE, HORA_FIN_NOCHE };
