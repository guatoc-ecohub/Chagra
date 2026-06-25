/**
 * mundoSubsueloEngine — lógica PURA del juego "Mundo Subsuelo".
 *
 * El juego original es un SANDBOX: el jugador toma cartas (compost, micorriza,
 * labranza…) y un medidor de "vida del suelo" (0–100) sube o baja. Funciona,
 * pero era PLANO: sin meta clara, sin reto, sin un momento de "¡lo lograste!".
 *
 * Este módulo agrega una capa de OBJETIVO sin romper el sandbox: una meta de
 * vida del suelo (suelo "vivo"), una cuenta de jugadas y la evaluación de si la
 * meta ya se alcanzó. Es todo lógica pura y testeable; la UI lo pinta. La capa
 * de reto/celebración se enciende SOLO con la flag de FEEL (gated dev-only); con
 * la flag apagada el juego se comporta EXACTO como hoy (sandbox libre).
 *
 * Español de Colombia (tú/usted), sin voseo argentino.
 *
 * @module mundoSubsueloEngine
 */

/** Vida del suelo a la que el suelo se considera "vivo" (meta del juego). */
export const META_VIDA = 75;

/** Limita un valor al rango [min, max]. */
export function clampVida(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Etapa cualitativa del suelo según su vida (mismos umbrales que la UI histórica).
 *
 * @param {number} soilLife 0–100.
 * @returns {'cansado'|'en cuidado'|'despertando'|'vivo'}
 */
export function etapaSuelo(soilLife) {
  if (soilLife >= 75) return 'vivo';
  if (soilLife >= 55) return 'despertando';
  if (soilLife >= 35) return 'en cuidado';
  return 'cansado';
}

/**
 * Evalúa el estado del juego respecto a la meta. Pura y testeable.
 *
 * @param {number} soilLife    vida actual del suelo (0–100).
 * @param {number} [jugadas=0] cuántas cartas ha jugado el jugador.
 * @returns {{
 *   vida:number, meta:number, etapa:string, alcanzada:boolean,
 *   restante:number, jugadas:number, progreso:number,
 * }}
 */
export function evaluarSubsuelo(soilLife, jugadas = 0) {
  const vida = clampVida(soilLife);
  const alcanzada = vida >= META_VIDA;
  return {
    vida,
    meta: META_VIDA,
    etapa: etapaSuelo(vida),
    alcanzada,
    restante: Math.max(0, META_VIDA - vida),
    jugadas: Math.max(0, jugadas),
    progreso: Math.round((vida / META_VIDA) * 100),
  };
}

/**
 * Mensaje de meta para la UI: dice qué falta para "suelo vivo" o lo celebra.
 * Lenguaje claro para un niño y un campesino, sin voseo.
 *
 * @param {ReturnType<typeof evaluarSubsuelo>} est  estado evaluado.
 * @returns {string}
 */
export function mensajeMeta(est) {
  if (est.alcanzada) {
    return `¡Lograste un suelo VIVO! Llegaste a ${est.vida} de vida del suelo en ${est.jugadas} ${est.jugadas === 1 ? 'jugada' : 'jugadas'}.`;
  }
  return `Meta: llega a ${est.meta} de vida del suelo (suelo vivo). Te faltan ${est.restante} puntos.`;
}
