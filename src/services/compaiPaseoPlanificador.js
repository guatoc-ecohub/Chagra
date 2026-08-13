/**
 * compaiPaseoPlanificador — EL CEREBRO DEL PASEO (#25, #31), puro y sin DOM.
 *
 * El compAI vive en su PUESTO (el FAB, esquina fija — `AgentFab.jsx`). Este
 * planificador decide, con el tiempo como único insumo, si le toca quedarse
 * quieto o salir a pasear por la pantalla a comentar lo que hay — y hasta
 * dónde: un paseo no es "todo o nada", tiene RADIO.
 *
 * PRESUPUESTO 35% (#25): del tiempo total que el compAI lleva vivo en esta
 * pantalla, a lo sumo el 35% puede ser paseo — el resto es puesto. Se mide
 * de verdad (no es un cooldown fijo): `presupuestoConsumido()` divide el
 * tiempo acumulado de paseo entre el tiempo total transcurrido. Si el
 * cociente ya llegó a 0.35, el planificador no autoriza un paseo nuevo
 * aunque haya pasado tiempo de sobra desde el último — dos paseos cortos
 * seguidos consumen presupuesto igual que uno largo.
 *
 * RADIO EN 3 ANILLOS (#31), medido en cuánto lleva el paseo ACTUAL:
 *   1. 'puesto'   — quieto en el FAB. Anillo 0, sin desplazamiento.
 *   2. 'cerca'    — funciones cercanas al puesto (paradas con `anillo:'cerca'`
 *                   en el registro). Dura hasta 60s de paseo continuo.
 *   3. 'pantalla' — recorrido más amplio (paradas con `anillo:'pantalla'` o
 *                   sin anillo declarado — default). Entre 60s y 150s.
 *   4. Pasados 150s continuos, el planificador SIEMPRE ordena 'volviendo' —
 *      el regreso no es opcional, es el techo duro del anillo 3.
 *
 * El planificador NUNCA toca DOM ni temporizadores: es una función de
 * (estado, reloj) → decisión. Quien lo cablea (`useCompaiPaseo.js`) es quien
 * decide CUÁNDO preguntar y qué hacer con la respuesta.
 *
 * @module services/compaiPaseoPlanificador
 */

/** Presupuesto de paseo como fracción del tiempo total vivido (#25). */
export const PRESUPUESTO_PASEO_FRACCION = 0.35;

/** Techo del anillo "cerca" (ms de paseo continuo) — #31. */
export const UMBRAL_ANILLO_CERCA_MS = 60_000;

/** Techo del anillo "pantalla" (ms de paseo continuo) — a partir de aquí, volver. */
export const UMBRAL_ANILLO_PANTALLA_MS = 150_000;

/** Fases posibles del planificador. */
export const FASES_PASEO = /** @type {const} */ ([
  'puesto',
  'cerca',
  'pantalla',
  'volviendo',
]);

/**
 * @typedef {Object} EstadoPaseo
 * @property {'puesto'|'cerca'|'pantalla'|'volviendo'} fase
 * @property {number} inicioSesionMs — timestamp (reloj del planificador) en
 *   que el compAI "nació" en esta pantalla — base del presupuesto.
 * @property {number} msPaseoAcumulado — suma de TODO el tiempo ya paseado en
 *   esta sesión de pantalla (paseos previos completos), sin contar el actual.
 * @property {number|null} inicioPaseoActualMs — timestamp de cuándo arrancó
 *   el paseo en curso; null si está en 'puesto'.
 */

/**
 * Estado inicial: recién llegado a la pantalla, en el puesto, presupuesto
 * intacto.
 * @param {number} ahoraMs
 * @returns {EstadoPaseo}
 */
export function estadoInicial(ahoraMs) {
  return {
    fase: 'puesto',
    inicioSesionMs: ahoraMs,
    msPaseoAcumulado: 0,
    inicioPaseoActualMs: null,
  };
}

/** Tiempo total vivido en la pantalla hasta ahora (ms). */
function tiempoTotal(estado, ahoraMs) {
  return Math.max(0, ahoraMs - estado.inicioSesionMs);
}

/** Tiempo de paseo continuo del paseo EN CURSO (0 si está en puesto). */
function msPaseoActual(estado, ahoraMs) {
  if (estado.inicioPaseoActualMs == null) return 0;
  return Math.max(0, ahoraMs - estado.inicioPaseoActualMs);
}

/**
 * Fracción del presupuesto ya consumida — cuenta paseos previos completos
 * MÁS el paseo en curso, contra el tiempo total vivido. 0 si nunca paseó,
 * puede superar 0.35 momentáneamente (el planificador no interrumpe a mitad
 * de un anillo por presupuesto — solo VETA arrancar un paseo nuevo).
 * @param {EstadoPaseo} estado
 * @param {number} ahoraMs
 * @returns {number}
 */
export function presupuestoConsumido(estado, ahoraMs) {
  const total = tiempoTotal(estado, ahoraMs);
  if (total <= 0) return 0;
  const paseado = estado.msPaseoAcumulado + msPaseoActual(estado, ahoraMs);
  return paseado / total;
}

/** ¿Queda presupuesto para ARRANCAR un paseo nuevo ahora? */
export function hayPresupuesto(estado, ahoraMs) {
  return presupuestoConsumido(estado, ahoraMs) < PRESUPUESTO_PASEO_FRACCION;
}

/**
 * LA DECISIÓN: dado el estado y la hora, ¿qué debería estar haciendo el
 * compAI? Pura — no muta `estado` (el caller decide qué hacer con esto,
 * típicamente pasarlo a `avanzar()` para obtener el próximo estado).
 *
 * @param {EstadoPaseo} estado
 * @param {number} ahoraMs
 * @param {Object} [opciones]
 * @param {boolean} [opciones.bloqueado=false] — ocupado/oculto/background:
 *   el planificador nunca autoriza un paseo nuevo, y si ya estaba paseando
 *   ordena 'volviendo' de una (regla dura #28/#34: nunca pasea si el
 *   usuario está a mitad de algo, y cero timers corriendo si no se puede ver).
 * @param {boolean} [opciones.hayParadas=true] — el registro de la pantalla
 *   tiene al menos una parada; sin paradas no hay a dónde pasear.
 * @returns {'puesto'|'cerca'|'pantalla'|'volviendo'}
 */
export function decidirFase(estado, ahoraMs, opciones = {}) {
  const { bloqueado = false, hayParadas = true } = opciones;

  if (bloqueado) {
    return estado.fase === 'puesto' ? 'puesto' : 'volviendo';
  }

  if (estado.fase === 'puesto') {
    if (!hayParadas) return 'puesto';
    return hayPresupuesto(estado, ahoraMs) ? 'cerca' : 'puesto';
  }

  // Ya está paseando (cerca/pantalla/volviendo): el reloj del paseo actual
  // manda sobre el anillo, con el techo duro de 150s.
  const transcurrido = msPaseoActual(estado, ahoraMs);
  if (transcurrido >= UMBRAL_ANILLO_PANTALLA_MS) return 'volviendo';
  if (transcurrido >= UMBRAL_ANILLO_CERCA_MS) return 'pantalla';
  // Nunca retrocede de 'pantalla' a 'cerca' aunque el reloj lo permita —
  // los anillos solo se expanden dentro de un mismo paseo.
  return estado.fase === 'pantalla' ? 'pantalla' : 'cerca';
}

/**
 * Avanza el estado a la fase indicada (típicamente la que devolvió
 * `decidirFase`), llevando la contabilidad de presupuesto.
 * @param {EstadoPaseo} estado
 * @param {'puesto'|'cerca'|'pantalla'|'volviendo'} fase
 * @param {number} ahoraMs
 * @returns {EstadoPaseo}
 */
export function avanzar(estado, fase, ahoraMs) {
  if (fase === estado.fase) return estado;

  // Saliendo del puesto: arranca el reloj del paseo actual.
  if (estado.fase === 'puesto' && fase !== 'puesto') {
    return { ...estado, fase, inicioPaseoActualMs: ahoraMs };
  }

  // Volviendo al puesto: el regreso mismo AÚN es paseo (vuelo animado, #32) —
  // el caller solo debe invocar avanzar(estado, 'puesto', t) cuando el vuelo
  // de regreso YA terminó en pantalla; aquí solo cerramos la contabilidad.
  if (fase === 'puesto') {
    const acumulado = estado.msPaseoAcumulado + msPaseoActual(estado, ahoraMs);
    return {
      ...estado,
      fase: 'puesto',
      msPaseoAcumulado: acumulado,
      inicioPaseoActualMs: null,
    };
  }

  // Transición entre anillos de paseo (cerca → pantalla, o → volviendo):
  // el reloj del paseo actual NO se reinicia — el presupuesto y los
  // umbrales de anillo cuentan el paseo completo, no cada tramo.
  return { ...estado, fase };
}

/**
 * Cierra el paseo en curso y vuelve al puesto DE UNA — usado por el abort
 * por toque (#33): cualquier toque del usuario corta el paseo entero, sin
 * pasar por 'volviendo' primero (esa fase es para el regreso ANIMADO
 * espontáneo; el abort por toque es instantáneo, la animación de vuelo la
 * decide la UI, no el planificador).
 * @param {EstadoPaseo} estado
 * @param {number} ahoraMs
 * @returns {EstadoPaseo}
 */
export function abortar(estado, ahoraMs) {
  if (estado.fase === 'puesto') return estado;
  return avanzar(estado, 'puesto', ahoraMs);
}

export default {
  estadoInicial,
  presupuestoConsumido,
  hayPresupuesto,
  decidirFase,
  avanzar,
  abortar,
  PRESUPUESTO_PASEO_FRACCION,
  UMBRAL_ANILLO_CERCA_MS,
  UMBRAL_ANILLO_PANTALLA_MS,
  FASES_PASEO,
};
