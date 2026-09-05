/*
 * lecturaClimaAterrizaje — qué se le dice al usuario en el aterrizaje del
 * descenso, con la gramática de DIRECCION-NUMEROS-VIVOS-CLIMA-SIERRA-20260904.
 * Dato puro (cero three, cero React, cero DOM).
 *
 * Reglas que este módulo existe para hacer cumplir:
 *
 * 1. 🔴 LA MONTAÑA NO TIENE TERMÓMETROS. Los 26 campos de `useClima3DVivo`
 *    describen UN solo punto medido: la finca. Por eso ninguno se reparte por
 *    banda; todos engordan el aterrizaje (la VENTANA), y este módulo solo elige
 *    qué se lee ahí con su palabra de ventana.
 * 2. 🔴 TINTA vs TIZA. Lo que vino de afuera (observado, pronóstico, alerta
 *    del servicio) es tinta y lleva palabra de ventana (ahora / esta noche).
 *    Lo que Chagra dedujo es tiza, una sola línea por prioridad:
 *    helada → SU cultivo → El Niño por piso → nada.
 * 3. 🔴 SIN DATO NO SE PINTA. `senal`, `tieneOpenMeteo` y `tieneEnso` existen
 *    para eso. Un hueco declarado es honesto; un relleno bonito es mentira:
 *    sin `senal` este módulo devuelve vacío, no adivina un clima.
 * 4. 🔴 EL NIÑO EN PISO FRÍO HACE MÁS HELADAS, NO MENOS. La consecuencia del
 *    ENSO se calcula por piso (`esPisoFrio`), nunca global: donde hiela, el
 *    Niño se lee como MÁS helada, jamás como «más calor».
 *
 * Las palabras de los cultivos (su ficha, sed, hongo) no se redactan acá: se
 * reciben ya calculadas por `buildClimaCultivoSuggestions` y se eligen por
 * prioridad. Este módulo no fabrica ninguna.
 */
const PISOS_FRIOS = new Set(['frio', 'paramo', 'superparamo', 'nival']);

/** ¿Este piso hiela? La helada es un fenómeno de piso frío; bajo 2 000 m no. */
export function esPisoFrio(pisoId) {
  return PISOS_FRIOS.has(String(pisoId ?? '').toLowerCase().trim());
}

function numero(value) {
  // `Number(null)` es 0, no «sin dato» (la Isla Nula del repo): una ausencia
  // jamás debe leerse como cero grados.
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** La condición del snapshot a su palabra legible (nunca el id interno). */
export const CONDICION_PALABRA = Object.freeze({
  despejado: 'cielo despejado',
  nublado: 'nublado',
  lluvia: 'lluvia',
  niebla: 'niebla de ladera',
});

export function palabraCondicion(condicion) {
  if (typeof condicion !== 'string' || condicion === '') return null;
  return CONDICION_PALABRA[condicion] ?? condicion;
}

/*
 * Familia ENSO robusta al vocabulario del sidecar. La normalización por
 * `startsWith('nino')` de `useClima3DVivo` NO reconoce el slug canónico
 * (`el_nino` → 'neutral', medido 2026-09-02). Acá se barre la fase con
 * `includes` (mismo apaño que `compai/nucleo/ensoCanal.js`) y el campo ya
 * normalizado de la dirección queda como respaldo para los fixtures.
 */
function familiaEnso(climaVivo) {
  const phase = String(climaVivo?.ensoPhase ?? '').toLowerCase();
  if (phase.includes('nino')) return 'nino';
  if (phase.includes('nina')) return 'nina';
  return String(climaVivo?.ensoFamily ?? 'neutral');
}

/**
 * La línea TINTA del ahora: condición + grado, con su palabra de ventana.
 * Sin señal no existe: `senal` es el guardián (§8: la ausencia es el «no sé»).
 *
 * @param {object} climaVivo  salida de `derivarClima3D`.
 * @returns {string|null}  «cielo despejado · 14° · ahora» o null si no hay dato.
 */
export function lineaAhora(climaVivo) {
  if (!climaVivo?.senal) return null;
  const partes = [];
  const condicion = palabraCondicion(climaVivo.condicion);
  const temp = numero(climaVivo.temp);
  if (condicion) partes.push(condicion);
  if (temp != null) partes.push(`${Math.round(temp)}°`);
  if (partes.length === 0) return null;
  return `${partes.join(' · ')} · ahora`;
}

/**
 * La mínima de esta noche, TINTA, solo donde cambia una decisión: pisos fríos
 * (la helada decide) y páramo. En el resto la cifra va al boletín.
 *
 * @param {object} climaVivo  salida de `derivarClima3D`.
 * @param {{pisoId?: string}} [opts]  opciones; `opts.pisoId` es el piso del
 *                                    aterrizaje (de `resolverAterrizaje`).
 * @returns {string|null}  «esta noche baja a 3°» o null sin dato/piso no frío.
 */
export function lineaMinimaNoche(climaVivo, { pisoId } = {}) {
  if (!climaVivo?.senal || !esPisoFrio(pisoId)) return null;
  const min = numero(climaVivo.tempMin);
  if (min == null) return null;
  return `esta noche baja a ${Math.round(min)}°`;
}

/** Alerta local del servicio climático: vino de afuera, se lee como tinta. */
export function alertasAterrizaje(climaVivo) {
  const alertas = Array.isArray(climaVivo?.alertas) ? climaVivo.alertas : [];
  return alertas
    .filter((alerta) => Boolean(alerta?.tipo || alerta?.mensaje))
    .slice(0, 2)
    .map((alerta) => ({
      tipo: alerta.tipo || 'aviso',
      mensaje: alerta.mensaje || alerta.tipo || '',
    }));
}

/** La alerta de SU cultivo (prioridad 2-3-4): solo la más severa, texto ya escrito. */
export function sugerenciaDeCultivo(sugerencias) {
  const lista = Array.isArray(sugerencias) ? sugerencias : [];
  const item = lista.find(
    (s) => s?.suggestion && (s.suggestion.severity === 'critical' || s.suggestion.severity === 'warning'),
  );
  const texto = item?.suggestion?.text;
  return typeof texto === 'string' && texto !== '' ? texto : null;
}

/**
 * La línea TIZA de la helada (prioridad 1), firmada por Chagra en la lectura.
 * Solo piso frío, y solo con señal de helada real o mínima que la delata.
 * Bajo El Niño el piso frío hiela MÁS: la consecuencia se dice por piso.
 *
 * @param {object} climaVivo  salida de `derivarClima3D`.
 * @param {{pisoId?: string}} [opts]
 * @returns {string|null}
 */
export function lineaHelada(climaVivo, { pisoId } = {}) {
  if (!climaVivo?.senal || !esPisoFrio(pisoId)) return null;
  const min = numero(climaVivo.tempMin);
  const riesgo = climaVivo.helada === true || (min != null && min <= 3);
  if (!riesgo) return null;
  const base =
    min != null
      ? `Puede helar en lo plano: esta noche baja a ${Math.round(min)}°.`
      : 'Puede helar en lo plano esta noche.';
  if (familiaEnso(climaVivo) === 'nino') {
    return `${base} El Niño en el piso frío es MÁS helada, no menos.`;
  }
  return base;
}

/**
 * El resumen completo del aterrizaje: qué tinta, qué avisos y qué tiza, en el
 * orden de la dirección. Devuelve vacío donde no hay dato; nunca inventa.
 *
 * @param {object} climaVivo  salida de `derivarClima3D`.
 * @param {object} [opts]
 * @param {string} [opts.pisoId]      piso del aterrizaje.
 * @param {Array}  [opts.sugerencias] salida de `buildClimaCultivoSuggestions`.
 * @returns {{hayDato:boolean, tinta:string[], alertas:{tipo:string,mensaje:string}[], tiza:string|null, familia:string}}
 */
export function resumenClimaAterrizaje(climaVivo, { pisoId = null, sugerencias = [] } = {}) {
  const hayDato = Boolean(climaVivo?.senal);
  const tinta = [];
  const tiza = [];
  let alertas = [];
  if (hayDato) {
    const ahora = lineaAhora(climaVivo);
    if (ahora) tinta.push(ahora);
    const helada = lineaHelada(climaVivo, { pisoId });
    if (helada) {
      /* La tiza de helada ya lleva la mínima con su ventana («esta noche baja
         a N°»): no se duplica la misma cifra en una línea de tinta aparte. */
      tiza.push(helada);
    } else {
      const noche = lineaMinimaNoche(climaVivo, { pisoId });
      if (noche) tinta.push(noche);
      const cultivo = sugerenciaDeCultivo(sugerencias);
      if (cultivo) tiza.push(cultivo);
    }
    alertas = alertasAterrizaje(climaVivo);
  }
  return {
    hayDato,
    tinta,
    alertas,
    tiza: tiza.length > 0 ? tiza.join(' ') : null,
    familia: familiaEnso(climaVivo),
  };
}
