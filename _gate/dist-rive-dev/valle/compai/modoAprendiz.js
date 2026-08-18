/**
 * modoAprendiz — A VECES EL compAI PREGUNTA EN VEZ DE RESPONDER (#110).
 *
 * Dimensión educativa de Chagra (la usuaria norte tiene 11 años): el
 * compañero no siempre entrega el tip servido — a veces provoca observación
 * con una pregunta abierta ("¿por qué cree que se cayó la flor?"). Enseña a
 * mirar la finca, no solo a leer respuestas.
 *
 * REGLAS DE LA CASA:
 *   - Probabilidad BAJA (ver PROBABILIDAD_PREGUNTA): la regla, no la
 *     excepción, sigue siendo el comentario normal — si preguntara siempre
 *     dejaría de ser un compañero y se volvería un examen.
 *   - Solo en CONTEXTOS APTOS: mundos donde hay algo real que observar
 *     (mis_matas con cultivos registrados, mis_animales con animales
 *     registrados) — nunca inventa una pregunta sobre una finca vacía, y
 *     nunca reemplaza un aviso urgente (eso lo decide el motor antes de
 *     llegar aquí: este módulo sólo actúa quien YA iba a husmear, nunca
 *     compite con `aviso`/`luto`/`celebra`).
 *   - Determinista dado un `rand` inyectado (testeable) — igual que
 *     `gestos.elegirSinRepetir`.
 *   - NO tiene su propio timer/cooldown: el caller (store/hook) sigue
 *     pasando por `debeHablar`/cadencia adaptativa de siempre — este módulo
 *     sólo decide QUÉ dice el compañero cuando YA le tocaba hablar, no
 *     CUÁNDO. Respeta el modulador de frecuencia del batch4 (#102/#106)
 *     porque no lo toca en absoluto.
 *
 * @module compai/nucleo/modoAprendiz
 */

/** Probabilidad de que un husmeo apto se convierta en pregunta, no en tip. */
export const PROBABILIDAD_PREGUNTA = 0.12;

/**
 * Preguntas abiertas por mundo, agrupadas por lo que hay que tener a mano
 * para que la pregunta tenga sentido (no se inventa una "flor caída" si no
 * hay ninguna mata registrada). Varias por mundo para no sonar a grabación.
 */
const PREGUNTAS_POR_MUNDO = {
  mis_matas: [
    '¿Por qué cree que se le cae una flor antes de cuajar fruto?',
    'Mire bien las hojas de abajo antes de las de arriba: ¿nota algo distinto entre ellas?',
    '¿Qué cree que necesita más esta semana: agua, sombra o abono?',
    'Si tocara la tierra junto al tallo ahora mismo, ¿la sentiría húmeda o seca?',
  ],
  mis_animales: [
    '¿Ha notado si comen distinto cuando va a llover?',
    '¿Qué le dice el comportamiento de sus animales sobre cómo están hoy?',
  ],
  bosque: [
    '¿Qué especies reconoce creciendo solas, sin que nadie las sembrara?',
    '¿Ha visto algún animal nuevo por el rastrojo últimamente?',
  ],
  paramo: [
    '¿Sabe de dónde viene el agua que le llega a su finca?',
  ],
};

/** Mundos donde el modo aprendiz puede actuar (los que tienen preguntas reales). */
const MUNDOS_APTOS = new Set(Object.keys(PREGUNTAS_POR_MUNDO));

/**
 * ¿El contexto tiene algo real que observar? Mismo criterio "no fabricar"
 * que el resto del compai: sólo pregunta sobre una finca que existe.
 * @param {string} mundo
 * @param {Object} [datosMundo]
 * @returns {boolean}
 */
function hayAlgoQueObservar(mundo, datosMundo = {}) {
  if (mundo === 'mis_matas') {
    return Array.isArray(datosMundo.cultivos) && datosMundo.cultivos.length > 0;
  }
  if (mundo === 'mis_animales') {
    const especies = Array.isArray(datosMundo.especies) && datosMundo.especies.length > 0;
    return especies || Number(datosMundo.total) > 0;
  }
  // bosque/páramo son preguntas de verdad general (no dependen del inventario
  // del usuario) — siempre aptas si el mundo mismo lo es.
  return mundo === 'bosque' || mundo === 'paramo';
}

/**
 * Decide si, para este husmeo, el compañero debe preguntar en vez de
 * comentar — y con qué pregunta. Pura: no muta nada, no dispara nada.
 *
 * @param {Object} input
 * @param {string} input.mundo — uno de MUNDOS (angelitaInteligencia).
 * @param {Object} [input.datosMundo] — mismo objeto que ya arma datosDeMundo().
 * @param {() => number} [input.rand] — fuente de azar 0..1 (inyectable → testeable).
 * @param {number} [input.probabilidad] — pisa PROBABILIDAD_PREGUNTA (tests).
 * @returns {string|null} la pregunta, o null si no toca preguntar (sigue el tip normal).
 */
export function preguntaDeAprendiz({ mundo, datosMundo = {}, rand = Math.random, probabilidad = PROBABILIDAD_PREGUNTA } = {}) {
  if (!mundo || !MUNDOS_APTOS.has(mundo)) return null;
  if (!hayAlgoQueObservar(mundo, datosMundo)) return null;
  if (rand() >= probabilidad) return null;
  const pool = PREGUNTAS_POR_MUNDO[mundo];
  const idx = Math.floor(rand() * pool.length) % pool.length;
  return pool[idx];
}

export default { preguntaDeAprendiz, PROBABILIDAD_PREGUNTA };
